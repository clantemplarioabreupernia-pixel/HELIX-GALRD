import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { PlanetaryFrameId } from '../core/helixAutodidactLoop';
import {
  BIOPIXEL_TIERS,
  BiopixelResolutionTierId,
  getInitialNanotechMetrics,
  LiveDisplayTelemetry,
} from '../core/helixPauliSoaDisplay';
import { computeCoupledNanotechBiopixelState } from '../core/helixQuantumDisplayPhysics';
import type { StorySceneMoldKind } from '../core/helixStoryScoreEngine';
import { WEBER_PERCEPTUAL_K } from '../core/NemesisGovernor';
import {
  createPauliSoAPhysicsState,
  evaluateWeberFechnerFrame,
  stepNemesisCauchy,
  stepPauliSoAPhysics,
} from '../utils/helixPhysics';
import { createSoABuffer, packToSoABuffer } from '../utils/helixSignal';
import type { LiquidMorphShape } from './LiquidBiopixelCanvas';

export interface HelixBiopixel3DStageProps {
  shape: LiquidMorphShape;
  storyMold?: StorySceneMoldKind | null;
  storyPrimaryHex?: string;
  storySecondaryHex?: string;
  resolutionTier?: BiopixelResolutionTierId;
  accentHex?: string;
  energy?: number;
  tension?: number;
  planetId?: PlanetaryFrameId;
  pulseCounter?: number;
  onShipScoreUpdate?: (score: number) => void;
  onTelemetryUpdate?: (telemetry: LiveDisplayTelemetry) => void;
}

function resolveMoldModeFloat(
  shape: LiquidMorphShape,
  storyMold?: StorySceneMoldKind | null,
): number {
  if (storyMold === 'bosque_caperucita') return 0.0;
  if (storyMold === 'lobo_noche') return 1.0;
  if (storyMold === 'olas_mar') return 2.0;
  if (storyMold === 'castillo_toroide') return 3.0;
  if (storyMold === 'molecula_quimica' || shape === 'chemistry_molecule') return 4.0;
  if (storyMold === 'nave_lunar' || shape === 'orbital_ship' || shape === 'satellite') return 5.0;
  if (storyMold === 'montana_aves' || shape === 'terrain' || shape === 'terrain_fbm') return 6.0;
  if (storyMold === 'cristal_luz' || shape === 'crystal') return 7.0;
  if (shape === 'torus') return 8.0;
  return 9.0;
}

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uMode;
  uniform float uEnergy;
  uniform float uPauliTension;
  uniform vec4 uPointer;
  uniform sampler2D uPauliTex;

  varying vec2 vUv;
  varying float vVertZ;

  void main() {
    vUv = uv;
    vec2 n = uv * 2.0 - 1.0;

    // Lectura directa del campo Pauli-SoA (28 B/celda) + ondulación viscoelástica
    vec4 soa = texture2D(uPauliTex, uv);
    float baseWave = sin(n.x * 3.2 + uTime * 1.1) * cos(n.y * 2.6 - uTime * 0.8) * 0.05;
    float dome = 0.0;

    if (uMode > 3.5 && uMode < 4.5) {
      // Molde Molecular Morse: 3 lóbulos de densidad electrónica
      float m1 = smoothstep(0.45, 0.05, length(n - vec2(-0.32, 0.02)));
      float m2 = smoothstep(0.45, 0.05, length(n - vec2(0.32, 0.02)));
      float m3 = smoothstep(0.38, 0.04, length(n - vec2(0.0, 0.34)));
      dome = max(max(m1, m2), m3) * 0.44;
    } else if (uMode > 4.5 && uMode < 5.5) {
      float planetBulge = smoothstep(0.62, 0.05, length(n + vec2(0.46, 0.04)));
      dome = planetBulge * 0.48;
    } else if (uMode > 5.5 && uMode < 6.5) {
      dome = smoothstep(0.45, -0.55, n.y) * 0.34;
    } else if (uMode > 6.5 && uMode < 8.5) {
      dome = smoothstep(0.85, 0.1, length(n)) * 0.48;
    } else {
      float r = length(n);
      dome = (cos(r * 10.0 - uTime * 3.2) * 0.5 + 0.5) * exp(-r * 1.2) * (0.3 + uEnergy * 0.25);
    }

    float ptrDist = length(n - uPointer.xy);
    float ptrPush = 0.0;
    if (ptrDist < 0.34 && uPointer.w > 0.5) {
      float k = 1.0 - ptrDist / 0.34;
      ptrPush = uPointer.z > 0.5 ? -k * 0.32 : k * 0.12 * cos(ptrDist * 18.0 - uTime * 6.0);
    }

    float dispZ = baseWave + dome + (soa.r - 0.5) * 0.16 * (0.5 + uPauliTension) + ptrPush;
    vVertZ = dispZ;

    vec3 displaced = position + vec3(0.0, 0.0, dispZ);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uMode;
  uniform float uPlanetId;
  uniform float uEnergy;
  uniform float uTension;
  uniform float uZoom;
  uniform float uCauchyRefractive;
  uniform float uWkbGain;
  uniform float uIgzoGain;
  uniform float uPauliTension;
  uniform vec2 uShipOffset;
  uniform vec2 uBeaconPos;
  uniform vec2 uBiopixelGrid;
  uniform vec2 uCanvasPx;
  uniform vec3 uPrimaryCol;
  uniform vec3 uSecondaryCol;
  uniform vec4 uPointer;
  uniform sampler2D uPauliTex;

  varying vec2 vUv;
  varying float vVertZ;

  struct MoldSample {
    float z;
    vec3 col;
  };

  mat2 rot2(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
  }

  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  float sdTorus3D(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
  }

  float sdOctahedron3D(vec3 p, float s) {
    p = abs(p);
    return (p.x + p.y + p.z - s) * 0.57735027;
  }

  // Red hexagonal Voronoi A2 (eficiencia de empaquetamiento eta = pi/(2*sqrt(3)) ~ 90.69%)
  float hexLatticeA2(vec2 p, float scale) {
    vec2 q = p * scale;
    vec2 r = vec2(1.0, 1.7320508);
    vec2 h = r * 0.5;
    vec2 a = mod(q, r) - h;
    vec2 b = mod(q - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    float hexD = max(abs(gv.x), dot(abs(gv), normalize(vec2(1.0, 1.7320508))));
    return smoothstep(0.49, 0.42, hexD);
  }

  // Aproximación polinomial estable de función de Bessel J0(x) para modos de Helmholtz
  float besselJ0(float x) {
    return cos(x - 0.785398) / sqrt(max(1.0, abs(x) * 1.570796));
  }

  MoldSample sampleMold(vec2 uv) {
    vec2 n = uv * 2.0 - 1.0;
    float nx = n.x;
    float ny = n.y;
    float t = uTime;

    float z = 0.04 + sin(nx * 2.5 + t * 0.9) * cos(ny * 2.2 - t * 0.7) * 0.025;
    vec3 col = vec3(0.024, 0.059, 0.125);

    if (uMode < 0.5) {
      // 0: bosque_caperucita
      float path = exp(-pow(nx * 2.4 - sin(ny * 3.0) * 0.35, 2.0) * 8.0) * (ny < 0.1 ? 1.0 : 0.0);
      float treeH = 0.0;
      for (int k = 0; k < 4; k++) {
        float fk = float(k);
        float txPos = k == 0 ? -0.72 : (k == 1 ? -0.36 : (k == 2 ? 0.42 : 0.76));
        float tyOff = mod(fk, 2.0) * 0.12 - 0.05;
        float tx = nx - txPos;
        float ty = ny - tyOff;
        float cone = max(0.0, 1.0 - (abs(tx) * 4.5 + max(-0.35, ty + 0.35) * 1.4));
        if (ty < 0.55 && ty > -0.45) treeH = max(treeH, cone);
      }
      float cape = smoothstep(0.28, 0.04, length(vec2((nx - 0.02) * 1.6, ny + 0.18))) * (ny < 0.08 ? 1.0 : 0.0);
      float head = smoothstep(0.11, 0.02, length(vec2(nx - 0.02, ny - 0.16)));
      float girl = max(cape * 1.35, head * 1.45);
      z += treeH * 0.95 + path * 0.18 + girl * 1.1;

      if (girl > 0.25) {
        col = head > cape ? vec3(0.992, 0.902, 0.541) : uSecondaryCol;
      } else if (treeH > 0.18) {
        col = mix(uPrimaryCol, vec3(0.024, 0.306, 0.231), 0.35);
      } else if (path > 0.2) {
        col = vec3(0.573, 0.251, 0.055);
      } else {
        col = mix(vec3(0.024, 0.102, 0.106), uPrimaryCol, max(0.0, ny + 0.4) * 0.22);
      }
    } else if (uMode < 1.5) {
      // 1: lobo_noche
      float moon = smoothstep(0.26, 0.18, length(vec2(nx - 0.48, ny - 0.46)));
      float hill = smoothstep(0.1, -0.25, ny + 0.35 - sin(nx * 2.1) * 0.12);
      float wolfBody = smoothstep(0.28, 0.06, length(vec2((nx + 0.24) * 1.1, (ny + 0.08) * 1.6)));
      float wolfHead = smoothstep(0.14, 0.03, length(vec2(nx + 0.11, ny - 0.16)));
      float wolfEye = smoothstep(0.035, 0.01, length(vec2(nx + 0.08, ny - 0.19)));
      float wolf = max(wolfBody, wolfHead);
      z += moon * 0.9 + hill * 0.45 + wolf * 1.25;

      if (wolfEye > 0.3) col = uSecondaryCol;
      else if (wolf > 0.2) col = mix(vec3(0.278, 0.333, 0.412), uPrimaryCol, 0.35);
      else if (moon > 0.2) col = mix(vec3(0.973, 0.980, 0.988), uSecondaryCol, 0.25);
      else col = mix(vec3(0.035, 0.051, 0.141), uPrimaryCol, max(0.0, 0.5 - abs(ny)) * 0.3);
    } else if (uMode < 2.5) {
      // 2: olas_mar
      float wave1 = sin(nx * 4.5 - t * 2.8 + ny * 1.2) * 0.42;
      float wave2 = cos(nx * 8.2 + t * 3.4 - ny * 2.6) * 0.22;
      float crest = max(0.0, wave1 + wave2 + 0.35) * smoothstep(0.65, -0.5, ny);
      float sun = smoothstep(0.25, 0.08, length(vec2(nx + 0.35, ny - 0.42)));
      z += crest * 1.15 + sun * 0.6;
      if (sun > 0.25) col = mix(vec3(0.984, 0.749, 0.141), uSecondaryCol, 0.3);
      else if (crest > 0.55) col = mix(uSecondaryCol, vec3(1.0), 0.45);
      else col = uPrimaryCol * (0.45 + crest * 0.75);
    } else if (uMode < 3.5) {
      // 3: castillo_toroide
      float baseWall = (nx > -0.55 && nx < 0.55 && ny > -0.55 && ny < 0.05) ? 0.75 : 0.0;
      float leftTower = (abs(nx + 0.42) < 0.13 && ny > -0.55 && ny < 0.42) ? 1.05 : 0.0;
      float rightTower = (abs(nx - 0.42) < 0.13 && ny > -0.55 && ny < 0.42) ? 1.05 : 0.0;
      float centerSpire = max(0.0, 1.0 - abs(nx) * 6.5) * ((ny > -0.55 && ny < 0.68) ? 1.3 : 0.0);
      float castle = max(max(baseWall, leftTower), max(rightTower, centerSpire));
      z += castle * 1.05;
      col = castle > 0.1 ? mix(uPrimaryCol, uSecondaryCol, castle * 0.45) : vec3(0.039, 0.071, 0.141);
    } else if (uMode < 4.5) {
      // 4: chemistry_molecule — Potencial anarmónico de Morse + Orbitales cuánticos |ψ|²
      float osc = sin(t * 2.4) * 0.045;
      vec2 a1 = vec2(-0.34 - osc, -0.04);
      vec2 a2 = vec2(0.34 + osc, -0.04);
      vec2 a3 = vec2(0.0, 0.34 + osc * 0.6);

      float d1 = length(n - a1) - 0.16;
      float d2 = length(n - a2) - 0.16;
      float d3 = length(n - a3) - 0.21;

      // Enlaces covalentes CSG smooth-union
      vec2 pa13 = n - a1;
      vec2 ba13 = a3 - a1;
      float h13 = clamp(dot(pa13, ba13) / dot(ba13, ba13), 0.0, 1.0);
      float bond13 = length(pa13 - ba13 * h13) - 0.042;

      vec2 pa23 = n - a2;
      vec2 ba23 = a3 - a2;
      float h23 = clamp(dot(pa23, ba23) / dot(ba23, ba23), 0.0, 1.0);
      float bond23 = length(pa23 - ba23 * h23) - 0.042;

      float molSdf = smin(smin(d1, d2, 0.08), smin(d3, min(bond13, bond23), 0.08), 0.08);
      float body = smoothstep(0.05, -0.14, molSdf);

      // Lóbulos de orbital electrónico |ψ_2p|²
      float rOrb = length(n - a3);
      float angOrb = atan(ny - a3.y, nx - a3.x);
      float psi2 = exp(-rOrb * 3.8) * pow(cos(angOrb * 2.0 + t * 0.7), 2.0);

      z += body * 1.15 + psi2 * 0.45;
      if (d3 < 0.02) {
        col = mix(vec3(0.96, 0.35, 0.25), vec3(1.0, 0.75, 0.45), smoothstep(0.02, -0.18, d3));
      } else if (d1 < 0.02 || d2 < 0.02) {
        col = mix(uPrimaryCol, vec3(0.95, 0.98, 1.0), 0.45);
      } else if (min(bond13, bond23) < 0.02) {
        col = mix(uSecondaryCol, uPrimaryCol, 0.5);
      } else {
        col = mix(vec3(0.02, 0.05, 0.11), uPrimaryCol, psi2 * 0.65);
      }
    } else if (uMode < 5.5) {
      // 5: orbital_ship / nave_lunar + aro baliza interactivo (Juego WASD + Órbita Kepler)
      float px = nx + 0.46;
      float py = ny + 0.04;
      float pr = length(vec2(px, py));
      float planetMask = pr < 0.48 ? sqrt(max(0.0, 0.48 * 0.48 - pr * pr)) / 0.48 : 0.0;

      float sx = nx - (0.32 + uShipOffset.x * 0.38);
      float sy = ny - (0.08 + uShipOffset.y * 0.45 + sin(t * 2.2) * 0.025);
      float hull = smoothstep(0.20, 0.03, length(vec2(sx * 0.75, sy * 2.2)));
      float wings = smoothstep(0.16, 0.03, length(vec2((sx + 0.04) * 2.4, sy * 0.8)));
      float plume = (sx < -0.13 && sx > -0.42) ? smoothstep(0.10, 0.01, abs(sy) + (-sx - 0.13) * 0.2) : 0.0;
      float ship = max(hull * 1.15, wings * 0.8);

      float ringD = abs(length(vec2(px * 0.82, py * 2.2)) - 0.64);
      float ring = smoothstep(0.035, 0.008, ringD) * ((planetMask > 0.3 && py < 0.0) ? 0.0 : 1.0);

      // Baliza orbital coleccionable (entretenimiento interactivo con WASD)
      float beaconD = abs(length(vec2(nx - uBeaconPos.x, ny - uBeaconPos.y)) - 0.095);
      float beacon = smoothstep(0.028, 0.005, beaconD);

      z += planetMask * 1.15 + ship * 1.25 + plume * 0.55 + ring * 0.45 + beacon * 0.65;
      if (plume > 0.25) {
        col = mix(vec3(0.961, 0.620, 0.043), vec3(0.996, 0.941, 0.541), plume);
      } else if (ship > 0.25) {
        col = hull > wings ? vec3(0.886, 0.910, 0.941) : uSecondaryCol;
      } else if (beacon > 0.25) {
        col = mix(vec3(0.20, 0.95, 0.68), vec3(0.98, 0.85, 0.25), 0.5 + 0.5 * sin(t * 6.0));
      } else if (planetMask > 0.05) {
        float swirl = sin((px + t * 0.14) * 7.0) * cos(py * 6.0);
        if (uPlanetId > 1.5 && uPlanetId < 2.5) {
          col = mix(vec3(0.604, 0.204, 0.071), vec3(0.984, 0.573, 0.235), (swirl + 1.0) * 0.45);
        } else if (uPlanetId > 0.5 && uPlanetId < 1.5) {
          col = mix(vec3(0.278, 0.333, 0.412), vec3(0.796, 0.835, 0.882), (swirl + 1.0) * 0.42);
        } else {
          vec3 baseEarth = swirl > 0.15 ? vec3(0.063, 0.725, 0.506) : vec3(0.008, 0.518, 0.780);
          col = mix(baseEarth, vec3(0.490, 0.827, 0.988), planetMask * 0.25);
        }
      } else if (ring > 0.2) {
        col = uPrimaryCol;
      } else {
        float starNoise = sin(nx * 73.1 + ny * 137.7) * cos(nx * 41.3 - ny * 91.9);
        col = starNoise > 0.96 ? vec3(0.729, 0.902, 0.992) : vec3(0.016, 0.039, 0.086);
      }
    } else if (uMode < 6.5) {
      // 6: montana_aves / terrain fBm
      float ridge1 = sin(nx * 3.1 + t * 0.25) * 0.22 + cos(nx * 6.5) * 0.09 - 0.22;
      float ridge2 = sin(nx * 4.4 - t * 0.35 + 1.5) * 0.18 + sin(nx * 9.2) * 0.06 - 0.02;
      float mFront = smoothstep(0.06, -0.35, ny - ridge1);
      float mBack = smoothstep(0.06, -0.35, ny - ridge2);
      float sun = smoothstep(0.22, 0.08, length(vec2(nx + 0.42, ny - 0.42)));

      float birds = 0.0;
      for (int b = 0; b < 5; b++) {
        float fb = float(b);
        float bx = mod(nx + 1.2 - t * 0.22 + fb * 0.36, 2.4) - 1.2;
        float by = ny - (0.34 + mod(fb, 3.0) * 0.12 + sin(t * 2.0 + fb) * 0.04);
        float wing = abs(by - abs(bx) * 0.45);
        if (abs(bx) < 0.08 && wing < 0.022) birds = max(birds, 1.0 - wing / 0.022);
      }

      z += mBack * 0.55 + mFront * 1.1 + sun * 0.6 + birds * 0.75;
      if (birds > 0.25) col = vec3(0.973, 0.980, 0.988);
      else if (mFront > 0.2) col = mix(uPrimaryCol, vec3(0.031, 0.184, 0.286), 1.0 - mFront * 0.6);
      else if (mBack > 0.2) col = mix(uSecondaryCol, vec3(0.059, 0.090, 0.165), 0.55);
      else if (sun > 0.2) col = vec3(0.984, 0.749, 0.141);
      else col = mix(vec3(0.027, 0.078, 0.149), uPrimaryCol, max(0.0, 0.5 - ny) * 0.25);
    } else if (uMode < 7.5) {
      // 7: crystal / cristal_luz — Raymarching 3D Octaédrico SDF + Dispersión Cauchy
      vec3 ro = vec3(0.0, 0.0, 2.3);
      vec3 rd = normalize(vec3(nx, ny, -1.6));
      float dTot = 0.0;
      float hit = 0.0;
      vec3 pHit = vec3(0.0);
      for (int i = 0; i < 20; i++) {
        vec3 p = ro + rd * dTot;
        p.xz = rot2(t * 0.55) * p.xz;
        p.xy = rot2(t * 0.32) * p.xy;
        float d = sdOctahedron3D(p, 0.85);
        if (d < 0.008) {
          hit = 1.0;
          pHit = p;
          break;
        }
        dTot += d;
        if (dTot > 4.0) break;
      }
      if (hit > 0.5) {
        float depth = clamp(1.0 - (dTot - 1.2) * 0.8, 0.2, 1.0);
        float edge = abs(sin(pHit.x * 16.0) * sin(pHit.y * 16.0));
        z += depth * 1.4;
        col = mix(uPrimaryCol, uSecondaryCol, depth * 0.65 + edge * 0.25);
      } else {
        float halo = exp(-length(n) * 2.4);
        z += halo * 0.25;
        col = mix(vec3(0.024, 0.043, 0.098), uPrimaryCol, halo * 0.35);
      }
    } else if (uMode < 8.5) {
      // 8: torus / GEOM_SEAL — Raymarching Toroide T² 3D + Red Hexagonal Voronoi A2
      vec3 ro = vec3(0.0, 0.0, 2.45);
      vec3 rd = normalize(vec3(nx, ny, -1.65));
      float dTot = 0.0;
      float hit = 0.0;
      vec3 pHit = vec3(0.0);
      for (int i = 0; i < 22; i++) {
        vec3 p = ro + rd * dTot;
        p.yz = rot2(0.75 + sin(t * 0.4) * 0.25) * p.yz;
        p.xz = rot2(t * 0.48) * p.xz;
        float d = sdTorus3D(p, vec2(0.62, 0.23));
        if (d < 0.009) {
          hit = 1.0;
          pHit = p;
          break;
        }
        dTot += d;
        if (dTot > 4.2) break;
      }
      float voronoiA2 = hexLatticeA2(n, 7.5);
      if (hit > 0.5) {
        float theta = atan(pHit.z, pHit.x);
        float twist = 0.5 + 0.5 * sin(theta * 6.0 + t * 2.2);
        z += 1.25 * (1.0 - dTot * 0.25);
        col = mix(uPrimaryCol, uSecondaryCol, twist) * (0.78 + 0.22 * voronoiA2);
      } else {
        z += (1.0 - voronoiA2) * 0.14;
        col = mix(vec3(0.020, 0.043, 0.086), uPrimaryCol * 0.35, 1.0 - voronoiA2);
      }
    } else {
      // 9: cymatic_wave / quantum_bloch — Ondas Helmholtz Bessel J_m + Esfera de Bloch SU(2)
      float r = length(n);
      float theta = atan(ny, nx);
      float k = 12.0 + uEnergy * 6.0;
      float helmholtz = (besselJ0(r * k) * 0.65 + 0.35 * cos(theta * 3.0 + t * 2.5) * exp(-r * 1.4)) * exp(-r * 0.75);
      float blochSphere = r < 0.42 ? sqrt(max(0.0, 0.42 * 0.42 - r * r)) / 0.42 : 0.0;
      float spinVec = smoothstep(0.04, 0.008, abs(ny - tan(t * 0.9) * nx * 0.5)) * step(r, 0.41);

      z += max(0.0, helmholtz + 0.35) * 0.85 + blochSphere * 0.9 + spinVec * 0.4;
      if (spinVec > 0.25) {
        col = vec3(0.99, 0.92, 0.55);
      } else if (blochSphere > 0.05) {
        col = mix(uPrimaryCol, uSecondaryCol, blochSphere * 0.6);
      } else {
        col = mix(vec3(0.024, 0.063, 0.129), uPrimaryCol, clamp(helmholtz + 0.5, 0.0, 1.0));
      }
    }

    // Presión viscoelástica directa del puntero + campo Pauli-SoA en vivo
    float dPtr = length(vec2(nx, ny) - uPointer.xy);
    if (dPtr < 0.28 && uPointer.w > 0.5) {
      float k = 1.0 - dPtr / 0.28;
      z += uPointer.z > 0.5 ? -k * 0.5 : k * 0.22 * cos(dPtr * 18.0 - t * 6.0);
    }

    vec4 soa = texture2D(uPauliTex, uv);
    z += (soa.g - 0.5) * 0.08 * (0.4 + uPauliTension);

    MoldSample res;
    res.z = z * uIgzoGain;
    res.col = col * uWkbGain;
    return res;
  }

  void main() {
    // Zoom óptico centrado para inspeccionar biopíxeles y sub-biopíxeles 4K
    vec2 zoomCenter = vec2(0.5);
    vec2 zoomedUv = (vUv - zoomCenter) / max(1.0, uZoom) + zoomCenter;
    if (zoomedUv.x < 0.0 || zoomedUv.x > 1.0 || zoomedUv.y < 0.0 || zoomedUv.y > 1.0) {
      gl_FragColor = vec4(0.016, 0.031, 0.067, 1.0);
      return;
    }

    // Cuantización exacta a la matriz de biopíxeles activa (HD 921K -> FHD 2.07M -> 2K 3.69M -> 4K 8.29M)
    vec2 gridCoord = floor(zoomedUv * uBiopixelGrid);
    vec2 cellUv = (gridCoord + 0.5) / uBiopixelGrid;

    MoldSample center = sampleMold(cellUv);

    float epsX = 1.0 / uBiopixelGrid.x;
    float epsY = 1.0 / uBiopixelGrid.y;
    float zR = sampleMold(cellUv + vec2(epsX, 0.0)).z;
    float zL = sampleMold(cellUv - vec2(epsX, 0.0)).z;
    float zU = sampleMold(cellUv + vec2(0.0, epsY)).z;
    float zD = sampleMold(cellUv - vec2(0.0, epsY)).z;

    float dzdx = (zR - zL) / (2.0 * epsX);
    float dzdy = (zU - zD) / (2.0 * epsY);
    vec3 N = normalize(vec3(-dzdx * 0.24, -dzdy * 0.24, 1.0));

    // Iluminación PBR de relieve escultórico + dispersión cromática de Cauchy n(λ)
    vec3 L1 = normalize(vec3(0.45, 0.65, 0.85));
    vec3 L2 = normalize(vec3(-0.65, -0.35, 0.55));
    vec3 V = normalize(vec3(0.0, -0.06, 1.0));
    vec3 H1 = normalize(L1 + V);

    float diff1 = max(dot(N, L1), 0.0);
    float diff2 = max(dot(N, L2), 0.0);
    float spec = pow(max(dot(N, H1), 0.0), 28.0);
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);

    vec3 cauchySheen = vec3(0.22, 0.58, 1.0) * fresnel * (0.14 * uCauchyRefractive);
    float heightAO = 0.68 + min(0.48, max(0.0, center.z) * 0.34);

    vec3 litCol = center.col * (0.42 + diff1 * 0.82 + diff2 * 0.22) * heightAO
                + vec3(0.92, 0.97, 1.0) * spec * 0.32
                + cauchySheen;

    // 3 Sub-Biopíxeles Cuánticos CdSe R/G/B dentro de cada Biopíxel + nanobrechas IGZO
    vec2 cellPerScreenPx = uBiopixelGrid / max(uCanvasPx * uZoom, vec2(1.0));
    float maxDensity = max(cellPerScreenPx.x, cellPerScreenPx.y);
    float subVisibility = smoothstep(1.35, 0.24, maxDensity);

    vec2 subFract = fract(zoomedUv * uBiopixelGrid);
    float gapX = smoothstep(0.0, 0.075, subFract.x) * (1.0 - smoothstep(0.925, 1.0, subFract.x));
    float gapY = smoothstep(0.0, 0.075, subFract.y) * (1.0 - smoothstep(0.925, 1.0, subFract.y));
    float subSep = smoothstep(0.0, 0.045, abs(subFract.x - 0.33333)) * smoothstep(0.0, 0.045, abs(subFract.x - 0.66667));

    float maskR = smoothstep(0.36, 0.29, subFract.x);
    float maskG = smoothstep(0.29, 0.36, subFract.x) * smoothstep(0.71, 0.64, subFract.x);
    float maskB = smoothstep(0.64, 0.71, subFract.x);
    vec3 subWeights = mix(vec3(0.28), vec3(1.85), vec3(maskR, maskG, maskB));

    vec3 finalCol = mix(
      litCol,
      litCol * subWeights * (0.35 + 0.65 * gapX * gapY * subSep),
      0.08 + 0.92 * subVisibility
    );

    gl_FragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
  }
`;

export function HelixBiopixel3DStage({
  shape,
  storyMold = null,
  storyPrimaryHex,
  storySecondaryHex,
  resolutionTier = 'UHD_4K',
  accentHex = '#38bdf8',
  energy = 0.48,
  tension = 0.35,
  planetId = 'EARTH',
  pulseCounter = 0,
  onShipScoreUpdate,
  onTelemetryUpdate,
}: HelixBiopixel3DStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef({
    shape,
    storyMold,
    storyPrimaryHex,
    storySecondaryHex,
    resolutionTier,
    accentHex,
    energy,
    tension,
    planetId,
    pulseCounter,
    onShipScoreUpdate,
    onTelemetryUpdate,
  });
  propsRef.current = {
    shape,
    storyMold,
    storyPrimaryHex,
    storySecondaryHex,
    resolutionTier,
    accentHex,
    energy,
    tension,
    planetId,
    pulseCounter,
    onShipScoreUpdate,
    onTelemetryUpdate,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(240, container.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const probeCanvas = document.createElement('canvas');
    const probeGl = probeCanvas.getContext('webgl2');
    const debugInfo = probeGl?.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo ? String(probeGl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? '') : '';
    const isSoftwareGl = /swiftshader|llvmpipe|software|angle.*swiftshader/i.test(rendererStr);
    probeGl?.getExtension('WEBGL_lose_context')?.loseContext();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : dpr);
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => e.preventDefault();
    renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#040812');

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, -0.25, 8.8);
    camera.lookAt(0, 0, 0);

    // Malla física continua de Pauli-SoA (32×32 nodos = 1,024 celdas × 28 B = 28,672 B Zero-GC)
    const SOA_W = 32;
    const SOA_H = 32;
    const SOA_COUNT = SOA_W * SOA_H;
    const soaBuffer = createSoABuffer(SOA_COUNT);
    const soaPhys = createPauliSoAPhysicsState(SOA_COUNT);
    for (let y = 0; y < SOA_H; y++) {
      for (let x = 0; x < SOA_W; x++) {
        const idx = y * SOA_W + x;
        packToSoABuffer(
          soaBuffer,
          idx,
          (x / (SOA_W - 1)) * 2 - 1,
          (y / (SOA_H - 1)) * 2 - 1,
          0,
          x / (SOA_W - 1),
          y / (SOA_H - 1),
          0.35,
          (idx % 4) as 0 | 1 | 2 | 3,
        );
      }
    }

    const pauliTexBytes = new Uint8Array(SOA_COUNT * 4);
    const pauliTex = new THREE.DataTexture(pauliTexBytes, SOA_W, SOA_H, THREE.RGBAFormat);
    pauliTex.magFilter = THREE.LinearFilter;
    pauliTex.minFilter = THREE.LinearFilter;
    pauliTex.needsUpdate = true;

    const aspect = width / height;
    const spanY = 6.2;
    const spanX = spanY * Math.max(1.15, aspect);

    const planeGeo = new THREE.PlaneGeometry(spanX, spanY, isSoftwareGl ? 72 : 144, isSoftwareGl ? 48 : 90);
    const initialTier = BIOPIXEL_TIERS[propsRef.current.resolutionTier] ?? BIOPIXEL_TIERS.UHD_4K;

    const uniforms = {
      uTime: { value: 0 },
      uMode: { value: 5.0 },
      uPlanetId: { value: 0.0 },
      uEnergy: { value: 0.48 },
      uTension: { value: 0.35 },
      uZoom: { value: 1.0 },
      uCauchyRefractive: { value: 1.77 },
      uWkbGain: { value: 1.0 },
      uIgzoGain: { value: 1.0 },
      uPauliTension: { value: 0.35 },
      uShipOffset: { value: new THREE.Vector2(0, 0) },
      uBeaconPos: { value: new THREE.Vector2(0.55, 0.32) },
      uBiopixelGrid: { value: new THREE.Vector2(initialTier.width, initialTier.height) },
      uCanvasPx: { value: new THREE.Vector2(width * dpr, height * dpr) },
      uPrimaryCol: { value: new THREE.Color('#38bdf8') },
      uSecondaryCol: { value: new THREE.Color('#f59e0b') },
      uPointer: { value: new THREE.Vector4(0, 0, 0, 0) },
      uPauliTex: { value: pauliTex },
    };

    const planeMat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    });
    const clayMesh = new THREE.Mesh(planeGeo, planeMat);
    scene.add(clayMesh);

    let zoomTarget = 1.0;
    let zoomCurrent = 1.0;
    let ptrNdcX = 0;
    let ptrNdcY = 0;
    let ptrDown = false;
    let ptrHover = false;

    const updatePointerFromEvent = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      ptrNdcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ptrNdcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      ptrDown = true;
      ptrHover = true;
      updatePointerFromEvent(e);
    };

    const onPointerMove = (e: PointerEvent) => {
      ptrHover = true;
      updatePointerFromEvent(e);
      renderer.domElement.style.cursor = 'crosshair';
    };

    const onPointerUp = () => {
      ptrDown = false;
    };

    const onPointerLeave = () => {
      ptrDown = false;
      ptrHover = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.18 : 0.85;
      zoomTarget = THREE.MathUtils.clamp(zoomTarget * factor, 1.0, 12.0);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      keys[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let canvasW = width;
    let canvasH = height;
    const ro = new ResizeObserver(() => {
      if (!container) return;
      canvasW = Math.max(320, container.clientWidth);
      canvasH = Math.max(240, container.clientHeight);
      camera.aspect = canvasW / canvasH;
      camera.updateProjectionMatrix();
      renderer.setSize(canvasW, canvasH);
      uniforms.uCanvasPx.value.set(canvasW * dpr, canvasH * dpr);
    });
    ro.observe(container);

    const nanotechBaseline = getInitialNanotechMetrics();
    const shipOffset = { x: 0, y: 0 };
    const beaconPos = { x: 0.55, y: 0.32 };
    let shipScore = 0;
    let beaconSeed = 1;
    let prevTime = performance.now();
    let prevWeberMetric = 0.35;
    let renderedFrames = 0;
    let skippedFrames = 0;
    let lastTelemetryPush = 0;
    let raf = 0;

    const animate = () => {
      const now = performance.now();
      const dt = Math.min(0.04, Math.max(0.001, (now - prevTime) * 0.001));
      prevTime = now;
      const t = now * 0.001;
      const cur = propsRef.current;

      const tier = BIOPIXEL_TIERS[cur.resolutionTier] ?? BIOPIXEL_TIERS.UHD_4K;
      uniforms.uBiopixelGrid.value.set(tier.width, tier.height);

      const coupled = computeCoupledNanotechBiopixelState({
        tension: cur.tension,
        primeIndex: Math.max(0, cur.pulseCounter) % 33,
      });

      const spd = 1.8 * dt;
      if (keys['w'] || keys['arrowup']) shipOffset.y += spd;
      if (keys['s'] || keys['arrowdown']) shipOffset.y -= spd;
      if (keys['a'] || keys['arrowleft']) shipOffset.x -= spd;
      if (keys['d'] || keys['arrowright']) shipOffset.x += spd;
      shipOffset.x = THREE.MathUtils.clamp(shipOffset.x, -1.2, 1.2);
      shipOffset.y = THREE.MathUtils.clamp(shipOffset.y, -1.0, 1.0);

      // Comprobar captura de baliza orbital en modo nave (juego interactivo)
      const modeVal = resolveMoldModeFloat(cur.shape, cur.storyMold);
      if (modeVal > 4.5 && modeVal < 5.5) {
        const shipWorldX = 0.32 + shipOffset.x * 0.38;
        const shipWorldY = 0.08 + shipOffset.y * 0.45;
        if (Math.hypot(shipWorldX - beaconPos.x, shipWorldY - beaconPos.y) < 0.14) {
          shipScore += 1;
          beaconSeed = (beaconSeed * 1664525 + 1013904223) >>> 0;
          beaconPos.x = 0.08 + ((beaconSeed & 0xff) / 255) * 0.7;
          beaconPos.y = -0.45 + (((beaconSeed >> 8) & 0xff) / 255) * 0.9;
          cur.onShipScoreUpdate?.(shipScore);
        }
      }

      zoomCurrent += (zoomTarget - zoomCurrent) * Math.min(1, dt * 10);

      // Sutil parallax 3D con el puntero para percibir el relieve volumétrico
      const camX = ptrHover ? ptrNdcX * 0.42 : Math.sin(t * 0.35) * 0.14;
      const camY = -0.25 + (ptrHover ? ptrNdcY * 0.28 : 0);
      camera.position.x += (camX - camera.position.x) * Math.min(1, dt * 4);
      camera.position.y += (camY - camera.position.y) * Math.min(1, dt * 4);
      camera.lookAt(0, 0, 0);

      // Paso físico Pauli-SoA (28 B/celda Zero-GC) + filtro Weber-Fechner (ΔI/I < k)
      const pauliStep = stepPauliSoAPhysics(soaBuffer, soaPhys, t, dt, {
        curlGain: ptrDown ? 0.55 : 0.18 + cur.energy * 0.25,
        elasticityE: 14.0 + coupled.brusCauchy.cauchyRefractiveIndex * 2.5,
        viscosityEta: 5.5 + cur.tension * 2.0,
        nemesisGamma: 0.08,
      });
      const nemesisDamped = stepNemesisCauchy(pauliStep.meanTension + cur.tension * 0.25, 0.08);
      const nextMetric =
        nemesisDamped +
        (ptrDown ? 0.15 : 0) +
        Math.abs(shipOffset.x) * 0.1 +
        Math.abs(zoomCurrent - zoomTarget) * 0.2;

      const weber = evaluateWeberFechnerFrame(prevWeberMetric, nextMetric, WEBER_PERCEPTUAL_K);
      if (weber.decision === 'RENDER_FRAME' || ptrHover || zoomCurrent > 1.02) {
        renderedFrames += 1;
        prevWeberMetric = nextMetric;
        for (let i = 0; i < SOA_COUNT; i++) {
          const j = i * 4;
          pauliTexBytes[j] = Math.max(0, Math.min(255, Math.round((soaBuffer.z[i] * 2.5 + 0.5) * 255)));
          pauliTexBytes[j + 1] = Math.max(0, Math.min(255, Math.round(soaBuffer.amp[i] * 255)));
          pauliTexBytes[j + 2] = Math.max(0, Math.min(255, Math.round(soaPhys.tension[i] * 255)));
          pauliTexBytes[j + 3] = 255;
        }
        pauliTex.needsUpdate = true;
      } else {
        skippedFrames += 1;
      }

      uniforms.uTime.value = t;
      uniforms.uMode.value = modeVal;
      uniforms.uPlanetId.value =
        cur.planetId === 'MOON' ? 1.0 : cur.planetId === 'MARS' ? 2.0 : cur.planetId === 'ORBIT_ZERO_G' ? 3.0 : 0.0;
      uniforms.uEnergy.value = cur.energy;
      uniforms.uTension.value = cur.tension;
      uniforms.uZoom.value = zoomCurrent;
      uniforms.uCauchyRefractive.value = coupled.brusCauchy.cauchyRefractiveIndex;
      uniforms.uWkbGain.value = coupled.wkbTunneling.quantumRegime === 'BLOCKED' ? 0.72 : 1.0;
      uniforms.uIgzoGain.value = coupled.igzo.regime === 'saturation' ? 1.06 : 0.98;
      uniforms.uPauliTension.value = nemesisDamped;
      uniforms.uShipOffset.value.set(shipOffset.x, shipOffset.y);
      uniforms.uBeaconPos.value.set(beaconPos.x, beaconPos.y);
      uniforms.uPrimaryCol.value.set(cur.storyPrimaryHex || cur.accentHex || '#38bdf8');
      uniforms.uSecondaryCol.value.set(cur.storySecondaryHex || '#f59e0b');
      uniforms.uPointer.value.set(ptrNdcX, ptrNdcY, ptrDown ? 1.0 : 0.0, ptrHover ? 1.0 : 0.0);

      renderer.render(scene, camera);
      if (isSoftwareGl) renderer.getContext().flush();

      if (cur.onTelemetryUpdate && now - lastTelemetryPush > 450) {
        lastTelemetryPush = now;
        const physW = Math.round(canvasW * dpr);
        const physH = Math.round(canvasH * dpr);
        cur.onTelemetryUpdate({
          tier,
          physicalCanvasWidth: physW,
          physicalCanvasHeight: physH,
          physicalMeasuredBiopixels: physW * physH,
          weberDecision: weber.decision,
          weberDeltaRatio: weber.deltaRatio,
          renderedFrames,
          skippedFrames,
          pauliMeanTension: pauliStep.meanTension,
          ...nanotechBaseline,
        });
      }

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      pauliTex.dispose();
      planeGeo.dispose();
      planeMat.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full select-none outline-none" />;
}
