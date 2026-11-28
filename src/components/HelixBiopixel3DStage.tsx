import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { PlanetaryFrameId } from '../core/helixAutodidactLoop';
import {
  BIOPIXEL_TIERS,
  BiopixelColorDepth,
  BiopixelDefectMode,
  BiopixelResolutionTierId,
  BiopixelSubpixelLayout,
  computeP33DisplayMetrics,
  getInitialNanotechMetrics,
  LiveDisplayTelemetry,
  P33_DISPLAY_PRIMES,
  p33ArithmeticDistance,
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
import {
  BiopixelStageRuntimeProps,
  runBiopixelCanvas2DFallback,
} from './helixBiopixel2DFallback';
import type { LiquidMorphShape } from './LiquidBiopixelCanvas';

export interface HelixBiopixel3DStageProps {
  shape: LiquidMorphShape;
  storyMold?: StorySceneMoldKind | null;
  storyPrevMold?: StorySceneMoldKind | null;
  storyMorphMix?: number;
  storyPrimaryHex?: string;
  storySecondaryHex?: string;
  disneySquashY?: number;
  disneyStretchXZ?: number;
  disneyArcX?: number;
  disneyArcY?: number;
  resolutionTier?: BiopixelResolutionTierId;
  subpixelLayout?: BiopixelSubpixelLayout;
  colorDepth?: BiopixelColorDepth;
  defectMode?: BiopixelDefectMode;
  repairPulse?: number;
  accentHex?: string;
  energy?: number;
  tension?: number;
  planetId?: PlanetaryFrameId;
  pulseCounter?: number;
  cineFovDeg?: number;
  c6DeltaZ?: number;
  onShipScoreUpdate?: (score: number) => void;
  onTelemetryUpdate?: (telemetry: LiveDisplayTelemetry) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
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

function subpixelLayoutCode(layout: BiopixelSubpixelLayout): number {
  if (layout === 'PENTILE_DIAMOND') return 1.0;
  if (layout === 'RGBW') return 2.0;
  return 0.0;
}

function colorDepthCode(depth: BiopixelColorDepth): number {
  if (depth === 'GRAYSCALE_8BIT') return 1.0;
  if (depth === 'MONOCHROME_1BIT') return 2.0;
  return 0.0;
}

function defectModeCode(mode: BiopixelDefectMode): number {
  if (mode === 'DEAD_PIXEL') return 1.0;
  if (mode === 'STUCK_PIXEL') return 2.0;
  if (mode === 'HOT_PIXEL') return 3.0;
  return 0.0;
}

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uMode;
  uniform float uPrevMode;
  uniform float uMorphMix;
  uniform float uPlanetId;
  uniform float uEnergy;
  uniform float uTension;
  uniform float uZoom;
  uniform float uAspect;
  uniform float uFovScale;
  uniform float uMaxSteps;
  uniform float uShadowSteps;
  uniform float uCauchyRefractive;
  uniform float uWkbGain;
  uniform float uIgzoGain;
  uniform float uPauliTension;
  uniform float uPrimeNorm;
  uniform float uSubpixelMode;
  uniform float uColorDepth;
  uniform float uDefectMode;
  uniform float uRepairSweep;
  uniform vec4 uDisneyMotion;
  uniform vec2 uShipOffset;
  uniform vec2 uBeaconPos;
  uniform vec2 uBiopixelGrid;
  uniform vec2 uCanvasPx;
  uniform vec2 uCamOrbit;
  uniform vec3 uPrimaryCol;
  uniform vec3 uSecondaryCol;
  uniform vec4 uPointer;
  uniform sampler2D uPauliTex;

  varying vec2 vUv;

  // Métrica aritmética P33 (Chebyshev + Manhattan modulada por primos)
  float p33Norm(vec2 v) {
    vec2 av = abs(v);
    float cheb = max(av.x, av.y);
    float manh = av.x + av.y;
    float w = 0.55 + uPrimeNorm * 0.20;
    return cheb * w + manh * (1.0 - w) * 0.5;
  }

  float p33HaltonAntiMoire(vec2 cell) {
    float h = fract(sin(cell.x * 13.0 + cell.y * 37.0) * 137.0);
    return (h - 0.5) * 0.008;
  }

  mat2 rot2(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c);
  }

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash12(i + vec2(0.0, 0.0)), hash12(i + vec2(1.0, 0.0)), u.x),
      mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n00 = mix(hash13(i + vec3(0.0,0.0,0.0)), hash13(i + vec3(1.0,0.0,0.0)), f.x);
    float n10 = mix(hash13(i + vec3(0.0,1.0,0.0)), hash13(i + vec3(1.0,1.0,0.0)), f.x);
    float n01 = mix(hash13(i + vec3(0.0,0.0,1.0)), hash13(i + vec3(1.0,0.0,1.0)), f.x);
    float n11 = mix(hash13(i + vec3(0.0,1.0,1.0)), hash13(i + vec3(1.0,1.0,1.0)), f.x);
    return mix(mix(n00, n10, f.y), mix(n01, n11, f.y), f.z);
  }

  float fbm2(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += a * noise2(p);
      p = m * p * 2.03;
      a *= 0.5;
    }
    return v;
  }

  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
  }

  float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 pa = p - a;
    vec3 ba = b - a;
    float h = clamp(dot(pa, ba) / max(0.0001, dot(ba, ba)), 0.0, 1.0);
    return length(pa - ba * h) - r;
  }

  float sdCylinder(vec3 p, float h, float r) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
  }

  float sdCone(vec3 p, vec2 c, float h) {
    vec2 q = h * vec2(c.x / c.y, -1.0);
    vec2 w = vec2(length(p.xz), p.y);
    vec2 a = w - q * clamp(dot(w, q) / dot(q, q), 0.0, 1.0);
    vec2 b = w - q * vec2(clamp(w.x / q.x, 0.0, 1.0), 1.0);
    float k = sign(q.y);
    float d = min(dot(a, a), dot(b, b));
    float s = max(k * (w.x * q.y - w.y * q.x), k * (w.y - q.y));
    return sqrt(d) * sign(s);
  }

  float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
  }

  float sdTorusP33(vec3 p, vec2 t) {
    float ring = p33Norm(p.xz) - t.x;
    return p33Norm(vec2(ring, p.y)) - t.y;
  }

  float sdOctahedron(vec3 p, float s) {
    p = abs(p);
    return (p.x + p.y + p.z - s) * 0.57735027;
  }

  float hexLatticeA2(vec2 p, float scale) {
    vec2 q = p * scale;
    vec2 r = vec2(1.0, 1.7320508);
    vec2 h = r * 0.5;
    vec2 a = mod(q, r) - h;
    vec2 b = mod(q - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    float hexD = max(abs(gv.x), dot(abs(gv), normalize(vec2(1.0, 1.7320508))));
    return smoothstep(0.49, 0.41, hexD);
  }

  float besselJ0(float x) {
    return cos(x - 0.785398) / sqrt(max(1.0, abs(x) * 1.570796));
  }

  // Resultado SDF: x = distancia, y = materialId, z = dato auxiliar (espuma, aura, factor blend)
  vec3 opU(vec3 a, vec3 b) {
    return a.x < b.x ? a : b;
  }

  // Olas Gerstner procedurales 3D
  float oceanHeight(vec2 p, float t) {
    float h = 0.0;
    h += sin(p.x * 0.85 + p.y * 0.35 - t * 1.9) * 0.24;
    h += sin(p.x * -1.45 + p.y * 1.10 - t * 2.5) * 0.13;
    h += cos(p.x * 2.75 + p.y * 2.15 + t * 3.1) * 0.065;
    h += (noise2(p * 1.8 + vec2(t * 0.7, -t * 0.5)) - 0.5) * 0.09;
    return h;
  }

  // Terreno alpino fBm 3D
  float alpineHeight(vec2 p) {
    float ridge = 1.0 - abs(noise2(p * 0.38) * 2.0 - 1.0);
    float ridge2 = 1.0 - abs(noise2(p * 0.85 + 3.1) * 2.0 - 1.0);
    float h = ridge * ridge * 2.1 + ridge2 * 0.75 + fbm2(p * 1.4) * 0.35;
    float valley = smoothstep(0.4, 2.2, abs(p.x));
    return h * (0.35 + 0.65 * valley) - 1.15;
  }

  // Evaluador maestro de escena 3D según modeId
  vec3 mapSingleMode(vec3 p, float modeId) {
    float t = uTime;
    vec3 res = vec3(100.0, 0.0, 0.0);

    if (modeId < 0.5) {
      // 0: BOSQUE DE CAPERUCITA 3D — Suelo con sendero, pinos volumétricos y caminante animada
      float pathCurve = sin(p.z * 0.42) * 0.65;
      float pathDist = abs(p.x - pathCurve);
      float gH = -0.95 + fbm2(p.xz * 0.45) * 0.28 - exp(-pathDist * pathDist * 2.6) * 0.08;
      float dGround = (p.y - gH) * 0.72;
      float isPath = exp(-pathDist * pathDist * 2.2);
      res = vec3(dGround, isPath > 0.38 ? 2.0 : 1.0, isPath);

      // Pinos 3D en cuadrícula orgánica (evitando el sendero)
      vec2 treeCell = floor((p.xz + vec2(1.5, 0.0)) / vec2(2.6, 2.4));
      vec2 localXZ = mod(p.xz + vec2(1.5, 0.0), vec2(2.6, 2.4)) - vec2(1.3, 1.2);
      float jitter = hash12(treeCell);
      vec2 treeOff = vec2((jitter - 0.5) * 0.7, (fract(jitter * 7.3) - 0.5) * 0.6);
      float centerPathClear = abs((treeCell.x * 2.6 - 1.5 + treeOff.x + 1.3) - sin((treeCell.y * 2.4 + treeOff.y) * 0.42) * 0.65);

      if (centerPathClear > 1.05 && abs(treeCell.x) <= 2.0 && p.z < 2.5 && p.z > -12.0) {
        vec3 tp = vec3(localXZ.x - treeOff.x, p.y + 0.92, localXZ.y - treeOff.y);
        float sway = sin(t * 1.5 + jitter * 6.28) * 0.05 * max(0.0, tp.y);
        tp.x -= sway;
        float trunk = sdCylinder(tp - vec3(0.0, 0.45, 0.0), 0.55, 0.11);
        float c1 = sdCone(tp - vec3(0.0, 1.55, 0.0), vec2(0.55, 0.85), 1.05);
        float c2 = sdCone(tp - vec3(0.0, 2.15, 0.0), vec2(0.45, 0.88), 0.92);
        float c3 = sdCone(tp - vec3(0.0, 2.68, 0.0), vec2(0.36, 0.92), 0.72);
        float foliage = min(c1, min(c2, c3));
        res = opU(res, vec3(trunk, 3.0, 0.0));
        res = opU(res, vec3(foliage, 4.0, jitter));
      }

      // Personaje animado (Caperucita con capa roja Disney-12)
      float walkZ = -1.2 + sin(t * 0.55) * 0.8 + uDisneyMotion.z * 0.6;
      float walkX = sin(walkZ * 0.42) * 0.65;
      float bounceY = abs(sin(t * 3.8)) * 0.055 + uDisneyMotion.w * 0.15;
      float sy = max(0.72, uDisneyMotion.x);
      float sxz = max(0.72, uDisneyMotion.y);
      vec3 cp = vec3((p.x - walkX) / sxz, (p.y + 0.82 - bounceY) / sy, (p.z - walkZ) / sxz);
      float cloak = sdCone(cp - vec3(0.0, 0.66, 0.0), vec2(0.42, 0.91), 0.68);
      float hood = length(cp - vec3(0.0, 0.78, 0.0)) - 0.17;
      float face = length(cp - vec3(0.0, 0.77, 0.09)) - 0.12;
      float girlD = smin(cloak, hood, 0.05) * min(sy, sxz);
      res = opU(res, vec3(girlD, 5.0, 0.0));
      res = opU(res, vec3(face * min(sy, sxz), 6.0, 0.0));
      return res;
    }

    if (modeId < 1.5) {
      // 1: LOBO NOCTURNO BAJO LA LUNA 3D
      float terrainY = -0.92 + fbm2(p.xz * 0.6) * 0.24 - 0.12 * smoothstep(2.0, 8.0, -p.z);
      res = vec3((p.y - terrainY) * 0.75, 10.0, 0.0);

      // Lobo 3D escultórico con respiración/acecho
      float sy = max(0.75, uDisneyMotion.x);
      float sxz = max(0.75, uDisneyMotion.y);
      vec3 wp = p - vec3(-0.15 + uDisneyMotion.z * 0.5, -0.52 + uDisneyMotion.w * 0.2, -0.4);
      wp.xz = rot2(-0.35 + sin(t * 0.6) * 0.1) * wp.xz;
      wp.y /= sy;
      wp.xz /= sxz;

      float torso = sdCapsule(wp, vec3(-0.42, 0.18, 0.0), vec3(0.28, 0.28, 0.0), 0.21);
      float neck = sdCapsule(wp, vec3(0.22, 0.26, 0.0), vec3(0.45, 0.50, 0.0), 0.15);
      float head = length(wp - vec3(0.48, 0.54, 0.0)) - 0.16;
      float snout = sdCapsule(wp, vec3(0.52, 0.50, 0.0), vec3(0.74, 0.45, 0.0), 0.075);
      float earL = sdCone(wp - vec3(0.45, 0.78, 0.08), vec2(0.32, 0.94), 0.16);
      float earR = sdCone(wp - vec3(0.45, 0.78, -0.08), vec2(0.32, 0.94), 0.16);
      float leg1 = sdCapsule(wp, vec3(0.20, 0.16, 0.11), vec3(0.24, -0.34, 0.11), 0.06);
      float leg2 = sdCapsule(wp, vec3(0.20, 0.16, -0.11), vec3(0.24, -0.34, -0.11), 0.06);
      float leg3 = sdCapsule(wp, vec3(-0.36, 0.14, 0.11), vec3(-0.44, -0.34, 0.11), 0.065);
      float leg4 = sdCapsule(wp, vec3(-0.36, 0.14, -0.11), vec3(-0.44, -0.34, -0.11), 0.065);
      float tail = sdCapsule(wp, vec3(-0.42, 0.20, 0.0), vec3(-0.78, 0.05 + sin(t * 2.4) * 0.06, 0.0), 0.065);

      float wolf = smin(torso, neck, 0.08);
      wolf = smin(wolf, head, 0.06);
      wolf = smin(wolf, snout, 0.05);
      wolf = min(wolf, min(earL, earR));
      wolf = smin(wolf, min(min(leg1, leg2), min(leg3, leg4)), 0.04);
      wolf = smin(wolf, tail, 0.05);

      float eyeL = length(wp - vec3(0.58, 0.57, 0.085)) - 0.028;
      float eyeR = length(wp - vec3(0.58, 0.57, -0.085)) - 0.028;

      res = opU(res, vec3(wolf * 0.85, 11.0, 0.0));
      res = opU(res, vec3(min(eyeL, eyeR), 12.0, 1.0));
      return res;
    }

    if (modeId < 2.5) {
      // 2: OCÉANO GERSTNER 3D HIPERREALISTA
      float wh = oceanHeight(p.xz, t) - 0.45;
      float crestFoam = smoothstep(0.16, 0.34, wh + 0.45);
      res = vec3((p.y - wh) * 0.58, 20.0, crestFoam);
      return res;
    }

    if (modeId < 3.5) {
      // 3: CASTILLO GÓTICO 3D SOBRE FOSO REFLECTANTE
      float waterY = -0.88 + sin(p.x * 5.0 + t * 2.2) * cos(p.z * 5.0 - t * 1.8) * 0.008;
      res = vec3(p.y - waterY, 30.0, 0.0);

      vec3 cp = p - vec3(0.0, -0.88, -1.8);
      float island = sdCylinder(cp - vec3(0.0, 0.08, 0.0), 0.14, 1.85);
      float keep = sdBox(cp - vec3(0.0, 0.72, 0.0), vec3(0.68, 0.65, 0.56));
      float spire = sdCylinder(cp - vec3(0.0, 1.55, 0.0), 0.45, 0.24);
      float spireRoof = sdCone(cp - vec3(0.0, 2.48, 0.0), vec2(0.44, 0.90), 0.55);

      float tL = sdCylinder(cp - vec3(-0.88, 0.88, 0.22), 0.80, 0.24);
      float tR = sdCylinder(cp - vec3(0.88, 0.88, 0.22), 0.80, 0.24);
      float rL = sdCone(cp - vec3(-0.88, 2.15, 0.22), vec2(0.45, 0.89), 0.54);
      float rR = sdCone(cp - vec3(0.88, 2.15, 0.22), vec2(0.45, 0.89), 0.54);
      float wall = sdBox(cp - vec3(0.0, 0.45, 0.36), vec3(0.92, 0.36, 0.12));
      float bridge = sdBox(cp - vec3(0.0, 0.14, 1.35), vec3(0.28, 0.08, 1.05));

      float stone = min(min(island, keep), min(min(spire, min(tL, tR)), min(wall, bridge)));
      float roofs = min(spireRoof, min(rL, rR));
      float gateGlow = sdBox(cp - vec3(0.0, 0.35, 0.49), vec3(0.16, 0.24, 0.06));

      res = opU(res, vec3(stone, 31.0, 0.0));
      res = opU(res, vec3(roofs, 32.0, 0.0));
      res = opU(res, vec3(gateGlow, 33.0, 1.0));
      return res;
    }

    if (modeId < 4.5) {
      // 4: MOLÉCULA CUÁNTICA 3D + ENLACE MORSE + ORBITALES
      float floorD = p.y + 1.25;
      res = vec3(floorD, 43.0, hexLatticeA2(p.xz, 1.6));

      vec3 mp = p - vec3(0.0, 0.15 + sin(t * 1.4) * 0.06, 0.0);
      mp.xz = rot2(t * 0.42) * mp.xz;
      mp.xy = rot2(sin(t * 0.6) * 0.18) * mp.xy;

      float osc = sin(t * 2.8) * 0.09;
      vec3 oPos = vec3(0.0, 0.22, 0.0);
      vec3 h1Pos = vec3(-0.78 - osc, -0.28, 0.22);
      vec3 h2Pos = vec3(0.78 + osc, -0.28, -0.22);

      float dO = length(mp - oPos) - 0.42;
      float dH1 = length(mp - h1Pos) - 0.26;
      float dH2 = length(mp - h2Pos) - 0.26;
      float b1 = sdCapsule(mp, oPos, h1Pos, 0.105);
      float b2 = sdCapsule(mp, oPos, h2Pos, 0.105);

      float bonds = min(b1, b2);
      float molO = smin(dO, bonds, 0.09);
      float hydro = smin(dH1, dH2, 0.04);

      res = opU(res, vec3(molO, 40.0, 0.0));
      res = opU(res, vec3(hydro, 41.0, 0.0));

      float orbRing = sdTorus(mp.xzy, vec2(1.08, 0.022));
      float orbRing2 = sdTorus(vec3(mp.x, mp.y * 0.8 + mp.z * 0.6, mp.z * 0.8 - mp.y * 0.6), vec2(1.14, 0.018));
      res = opU(res, vec3(min(orbRing, orbRing2), 42.0, 1.0));
      return res;
    }

    if (modeId < 5.5) {
      // 5: NAVE ESPACIAL JUGABLE + PLANETA 3D + ANILLOS + BALIZA
      vec3 planetC = vec3(-1.35, -0.05, -2.6);
      float planetR = 1.28;
      float dPlanet = length(p - planetC) - planetR;
      res = vec3(dPlanet, 50.0, 0.0);

      // Anillos planetarios inclinados
      vec3 rp = p - planetC;
      rp.yz = rot2(0.45) * rp.yz;
      rp.xy = rot2(-0.22) * rp.xy;
      float ringBand = abs(length(rp.xz) - 1.88) - 0.32;
      float dRing = max(ringBand, abs(rp.y) - 0.018);
      res = opU(res, vec3(dRing, 51.0, length(rp.xz)));

      // Caza espacial multiparte controlado por WASD
      vec3 shipC = vec3(0.55 + uShipOffset.x * 1.15, -0.05 + uShipOffset.y * 0.92 + sin(t * 2.1) * 0.05, 0.35);
      vec3 sp = p - shipC;
      sp.yz = rot2(uShipOffset.y * 0.25) * sp.yz;
      sp.xy = rot2(-uShipOffset.x * 0.28) * sp.xy;
      sp.xz = rot2(-0.55) * sp.xz;

      float fuse = sdCapsule(sp, vec3(-0.42, 0.0, 0.0), vec3(0.48, 0.0, 0.0), 0.095);
      float nose = sdCone(vec3(sp.y, -sp.x + 0.56, sp.z), vec2(0.30, 0.95), 0.36);
      float wingL = sdBox(sp - vec3(-0.08, 0.0, 0.28), vec3(0.18, 0.018, 0.26));
      float wingR = sdBox(sp - vec3(-0.08, 0.0, -0.28), vec3(0.18, 0.018, 0.26));
      float hull = smin(min(fuse, nose), min(wingL, wingR), 0.04);
      float canopy = length((sp - vec3(0.12, 0.09, 0.0)) * vec3(0.65, 1.3, 1.1)) - 0.085;
      float thruster = length((sp - vec3(-0.52, 0.0, 0.0)) * vec3(0.45, 1.5, 1.5)) - 0.095;

      res = opU(res, vec3(hull, 52.0, 0.0));
      res = opU(res, vec3(canopy, 53.0, 0.0));
      res = opU(res, vec3(thruster, 54.0, 1.0));

      // Aro baliza orbital para atravesar
      vec3 bp = p - vec3(uBeaconPos.x * 1.5, uBeaconPos.y * 1.2, 0.35);
      bp.xz = rot2(t * 1.8) * bp.xz;
      bp.yz = rot2(1.1) * bp.yz;
      float dBeacon = sdTorus(bp, vec2(0.24, 0.032));
      res = opU(res, vec3(dBeacon, 55.0, 1.0));
      return res;
    }

    if (modeId < 6.5) {
      // 6: CORDILLERA ALPINA fBm 3D + AVES VOLANDO
      vec3 mp = p + vec3(0.0, 0.0, -t * 0.45);
      float h = alpineHeight(mp.xz);
      res = vec3((p.y - h) * 0.48, 60.0, h);

      // Parvada de 4 aves 3D planeando
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        vec3 birdC = vec3(
          mod(t * 0.75 + fi * 1.35, 5.2) - 2.6,
          0.65 + sin(t * 1.8 + fi) * 0.16 + mod(fi, 2.0) * 0.24,
          -1.8 - fi * 0.65
        );
        vec3 bp = p - birdC;
        float flap = sin(t * 8.5 + fi * 1.7) * 0.12;
        float wing = sdBox(vec3(bp.x, bp.y - abs(bp.z) * (0.25 + flap), bp.z), vec3(0.035, 0.012, 0.18));
        res = opU(res, vec3(wing, 61.0, 0.0));
      }
      return res;
    }

    if (modeId < 7.5) {
      // 7: CRISTAL FOTÓNICO 3D CON DISPERSIÓN DE CAUCHY
      float ped = max(p.y + 1.05, sdCylinder(p - vec3(0.0, -1.25, 0.0), 0.25, 2.6));
      res = vec3(p.y + 1.05, 71.0, 0.0);

      vec3 kp = p - vec3(0.0, 0.18 + sin(t * 1.3) * 0.07, 0.0);
      kp.xz = rot2(t * 0.48) * kp.xz;
      kp.xy = rot2(0.28 + sin(t * 0.35) * 0.12) * kp.xy;

      float mainCrys = sdOctahedron(kp * vec3(1.15, 0.82, 1.15), 0.92) - 0.02;
      float shard1 = sdOctahedron((kp - vec3(0.75, -0.35, 0.32)) * vec3(1.5, 0.9, 1.5), 0.45);
      float shard2 = sdOctahedron((kp - vec3(-0.72, -0.38, -0.25)) * vec3(1.5, 0.9, 1.5), 0.40);
      float dCrys = min(mainCrys, min(shard1, shard2));
      res = opU(res, vec3(dCrys, 70.0, 0.0));
      return res;
    }

    if (modeId < 8.5) {
      // 8: TOROIDE P33 IRIDISCENTE SOBRE MONOLITO HEXAGONAL VORONOI A2
      float hexFloor = hexLatticeA2(p.xz, 1.9);
      res = vec3(p.y + 1.05 - (1.0 - hexFloor) * 0.03, 81.0, hexFloor);

      vec3 tp = p - vec3(0.0, 0.16 + sin(t * 1.4) * 0.08, 0.0);
      tp.yz = rot2(0.72 + sin(t * 0.5) * 0.22) * tp.yz;
      tp.xz = rot2(t * 0.55) * tp.xz;
      float tor = sdTorusP33(tp, vec2(0.84, 0.26));
      float innerOrb = length(tp) - 0.26;
      res = opU(res, vec3(tor, 80.0, atan(tp.z, tp.x)));
      res = opU(res, vec3(innerOrb, 82.0, 0.0));
      return res;
    }

    // 9: ESFERA CUÁNTICA DE BLOCH SU(2) + ONDAS CIMÁTICAS BESSEL J0
    float rPool = length(p.xz);
    float cym = besselJ0(rPool * (4.2 + uEnergy * 2.4) - t * 2.2) * 0.08 * exp(-rPool * 0.22);
    res = vec3((p.y + 1.02 - cym) * 0.72, 90.0, cym);

    vec3 qp = p - vec3(0.0, 0.16 + sin(t * 1.3) * 0.06, 0.0);
    float sphereD = length(qp) - 0.58;
    vec3 r1 = qp;
    r1.xz = rot2(t * 0.65) * r1.xz;
    r1.yz = rot2(0.55) * r1.yz;
    float ring1 = sdTorus(r1, vec2(0.84, 0.025));
    vec3 r2 = qp;
    r2.xy = rot2(-t * 0.52) * r2.xy;
    r2.yz = rot2(1.18) * r2.yz;
    float ring2 = sdTorus(r2, vec2(0.96, 0.020));

    // Vector de espín cuántico rotando
    vec3 spinDir = normalize(vec3(sin(t * 0.9), cos(t * 0.65), sin(t * 0.45) * 0.7));
    float spinVec = sdCapsule(qp, vec3(0.0), spinDir * 0.88, 0.028);

    res = opU(res, vec3(sphereD, 91.0, 0.0));
    res = opU(res, vec3(min(ring1, ring2), 92.0, 0.0));
    res = opU(res, vec3(spinVec, 93.0, 1.0));
    return res;
  }

  // Campo unificado con transición fluida Curl-Noise entre escenas
  vec3 mapWorld(vec3 p) {
    // Perturbación táctil directa con el puntero / SoA Pauli
    if (uPointer.w > 0.5) {
      float pd = length(p.xy - uPointer.xy * vec2(uAspect * 1.4, 1.4));
      if (pd < 0.75) {
        float push = (1.0 - pd / 0.75);
        p.z += (uPointer.z > 0.5 ? -0.18 : 0.06 * cos(pd * 12.0 - uTime * 5.0)) * push;
      }
    }

    if (uMorphMix >= 0.992 || abs(uMode - uPrevMode) < 0.25) {
      return mapSingleMode(p, uMode);
    }

    float smoothM = uMorphMix * uMorphMix * (3.0 - 2.0 * uMorphMix);
    float swirl = sin(uMorphMix * 3.14159265) * 0.35;
    vec3 curlP = p + vec3(
      sin(p.y * 3.5 + uTime * 3.2),
      cos(p.z * 3.5 - uTime * 2.8),
      sin(p.x * 3.5 + uTime * 2.4)
    ) * swirl * 0.28;

    vec3 a = mapSingleMode(curlP, uPrevMode);
    vec3 b = mapSingleMode(curlP, uMode);
    float dBlend = mix(a.x, b.x, smoothM) - swirl * 0.04;
    float matPick = smoothM < 0.5 ? a.y : b.y;
    float auxPick = mix(a.z, b.z, smoothM);
    return vec3(dBlend, matPick, auxPick);
  }

  vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.0022, -0.0022);
    return normalize(
      e.xyy * mapWorld(p + e.xyy).x +
      e.yyx * mapWorld(p + e.yyx).x +
      e.yxy * mapWorld(p + e.yxy).x +
      e.xxx * mapWorld(p + e.xxx).x
    );
  }

  float calcSoftShadow(vec3 ro, vec3 rd, float mint, float maxt) {
    if (uShadowSteps < 0.5) return 1.0;
    float res = 1.0;
    float t = mint;
    for (int i = 0; i < 12; i++) {
      if (float(i) >= uShadowSteps) break;
      float h = mapWorld(ro + rd * t).x;
      res = min(res, 10.0 * max(0.0, h) / t);
      t += clamp(h, 0.04, 0.32);
      if (res < 0.02 || t > maxt) break;
    }
    return clamp(res, 0.12, 1.0);
  }

  float calcAO(vec3 pos, vec3 nor) {
    float occ = 0.0;
    float sca = 1.0;
    for (int i = 0; i < 4; i++) {
      float h = 0.03 + 0.11 * float(i);
      float d = mapWorld(pos + h * nor).x;
      occ += (h - d) * sca;
      sca *= 0.72;
    }
    return clamp(1.0 - 2.2 * occ, 0.22, 1.0);
  }

  // Cielo atmosférico Rayleigh + Mie + estrellas según escena
  vec3 renderSky(vec3 rd, vec3 sunDir, float modeId) {
    float sunDot = max(dot(rd, sunDir), 0.0);
    float up = clamp(rd.y, -0.2, 1.0);

    if (modeId < 0.5) {
      // Bosque esmeralda con niebla dorada
      vec3 zenith = vec3(0.04, 0.16, 0.20);
      vec3 horizon = mix(vec3(0.14, 0.34, 0.28), vec3(0.95, 0.76, 0.42), pow(sunDot, 4.0) * 0.65);
      vec3 sky = mix(horizon, zenith, pow(max(up, 0.0), 0.65));
      sky += vec3(1.0, 0.85, 0.52) * pow(sunDot, 22.0) * 0.9;
      return sky;
    }
    if (modeId < 1.5) {
      // Noche de luna llena con nubes suaves
      vec3 sky = mix(vec3(0.04, 0.07, 0.18), vec3(0.01, 0.02, 0.06), pow(max(up, 0.0), 0.55));
      float clouds = fbm2(rd.xz / max(0.22, abs(rd.y) + 0.18) * 1.4 + uTime * 0.02);
      sky += vec3(0.08, 0.12, 0.24) * smoothstep(0.42, 0.82, clouds) * max(0.0, rd.y);
      float moonD = length(rd - normalize(vec3(0.42, 0.38, -0.82)));
      float moonDisc = smoothstep(0.115, 0.105, moonD);
      float moonGlow = exp(-moonD * 7.5);
      float crater = fbm2(rd.xy * 26.0);
      sky += vec3(0.32, 0.46, 0.78) * moonGlow * 0.75;
      sky = mix(sky, vec3(0.94, 0.96, 1.0) * (0.82 + 0.18 * crater), moonDisc);
      return sky;
    }
    if (modeId < 2.5 || (modeId > 5.5 && modeId < 6.5)) {
      // Cielo atardecer / alpino hiperrealista con dispersión Mie
      vec3 zenith = vec3(0.06, 0.22, 0.52);
      vec3 horizon = mix(vec3(0.55, 0.72, 0.88), vec3(1.0, 0.58, 0.24), pow(sunDot, 2.2));
      vec3 sky = mix(horizon, zenith, pow(max(up, 0.0), 0.55));
      float clouds = fbm2(rd.xz / max(0.18, abs(rd.y) + 0.15) * 1.6 + uTime * 0.018);
      vec3 cloudCol = mix(vec3(0.88, 0.90, 0.96), vec3(1.0, 0.72, 0.45), pow(sunDot, 3.0));
      sky = mix(sky, cloudCol, smoothstep(0.48, 0.85, clouds) * smoothstep(0.02, 0.35, up) * 0.62);
      sky += vec3(1.0, 0.82, 0.48) * pow(sunDot, 36.0) * 1.4;
      sky += vec3(1.0, 0.95, 0.82) * smoothstep(0.996, 0.9992, sunDot) * 3.0;
      return sky;
    }
    if (modeId > 4.5 && modeId < 5.5) {
      // Espacio profundo con nebulosa y estrellas
      vec3 starGrid = floor(rd * 190.0);
      float starRand = hash13(starGrid);
      float star = starRand > 0.992 ? pow((starRand - 0.992) / 0.008, 2.0) * 2.2 : 0.0;
      float neb = fbm2(rd.xy * 2.8 + rd.z * 1.4);
      vec3 nebCol = mix(vec3(0.02, 0.05, 0.14), uPrimaryCol * 0.28, smoothstep(0.35, 0.85, neb));
      return nebCol + vec3(0.82, 0.92, 1.0) * star;
    }

    // Estudio / laboratorio oscuro reflectante con luz cenital suave
    vec3 studio = mix(vec3(0.02, 0.04, 0.09), vec3(0.07, 0.14, 0.24), pow(max(up + 0.2, 0.0), 1.4));
    studio += uPrimaryCol * pow(sunDot, 8.0) * 0.25;
    return studio;
  }

  vec3 acesFilm(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  vec3 shadeHit(vec3 p, vec3 N, vec3 V, vec3 rd, float matId, float aux, vec3 sunDir, float modeId) {
    vec3 albedo = uPrimaryCol;
    float roughness = 0.35;
    float metallic = 0.05;
    vec3 emissive = vec3(0.0);

    // Materiales PBR físicamente diferenciados por ID
    if (matId < 1.5) { // Pasto bosque
      float tex = fbm2(p.xz * 4.5);
      albedo = mix(vec3(0.03, 0.18, 0.10), vec3(0.10, 0.36, 0.18), tex);
      roughness = 0.85;
    } else if (matId < 2.5) { // Sendero tierra/piedra
      float gr = noise2(p.xz * 12.0);
      albedo = mix(vec3(0.32, 0.18, 0.09), vec3(0.48, 0.30, 0.16), gr);
      roughness = 0.82;
    } else if (matId < 3.5) { // Tronco
      albedo = vec3(0.22, 0.13, 0.07);
      roughness = 0.90;
    } else if (matId < 4.5) { // Pino
      albedo = mix(vec3(0.03, 0.24, 0.16), uPrimaryCol * 0.45, 0.3 + 0.3 * aux);
      roughness = 0.72;
    } else if (matId < 5.5) { // Capa roja Caperucita
      albedo = mix(vec3(0.82, 0.08, 0.14), uSecondaryCol, 0.25);
      roughness = 0.48;
    } else if (matId < 6.5) { // Rostro cálido
      albedo = vec3(0.95, 0.78, 0.65);
      roughness = 0.55;
    } else if (matId < 10.5) { // Suelo nocturno
      albedo = mix(vec3(0.04, 0.07, 0.12), vec3(0.08, 0.14, 0.20), fbm2(p.xz * 3.0));
      roughness = 0.85;
    } else if (matId < 11.5) { // Pelaje lobo 3D
      float fur = noise3(p * 18.0);
      albedo = mix(vec3(0.18, 0.22, 0.29), vec3(0.48, 0.54, 0.64), fur * 0.65);
      roughness = 0.65;
    } else if (matId < 12.5) { // Ojos lobo
      albedo = uSecondaryCol;
      emissive = uSecondaryCol * 2.4;
    } else if (matId < 20.5) { // Océano 3D con dispersión subsuperficial y espuma
      vec3 deep = vec3(0.01, 0.11, 0.24);
      vec3 sss = vec3(0.04, 0.52, 0.58) * pow(max(0.0, dot(V, -sunDir) * 0.5 + 0.5), 2.5) * 0.65;
      albedo = mix(deep, vec3(0.86, 0.95, 1.0), smoothstep(0.35, 0.92, aux));
      emissive = sss * (1.0 - aux * 0.6);
      roughness = mix(0.04, 0.45, aux);
      metallic = 0.08;
    } else if (matId < 30.5) { // Foso reflectante
      albedo = vec3(0.03, 0.08, 0.16);
      roughness = 0.05;
      metallic = 0.15;
    } else if (matId < 31.5) { // Piedra castillo
      float brk = noise2(p.xy * 8.0 + p.z * 5.0);
      albedo = mix(vec3(0.24, 0.28, 0.36), vec3(0.42, 0.46, 0.54), brk);
      roughness = 0.80;
    } else if (matId < 32.5) { // Tejados cónicos
      albedo = mix(uPrimaryCol * 0.55, vec3(0.12, 0.24, 0.48), 0.5);
      roughness = 0.42;
    } else if (matId < 33.5) { // Antorcha / Puerta castillo
      albedo = vec3(1.0, 0.62, 0.18);
      emissive = vec3(1.8, 0.85, 0.24) * (0.85 + 0.15 * sin(uTime * 11.0));
    } else if (matId < 40.5) { // Átomo central oxígeno / núcleo
      albedo = mix(vec3(0.92, 0.22, 0.26), uSecondaryCol, 0.25);
      roughness = 0.12;
      metallic = 0.35;
    } else if (matId < 41.5) { // Hidrógenos / enlaces
      albedo = mix(uPrimaryCol, vec3(0.92, 0.96, 1.0), 0.65);
      roughness = 0.16;
      metallic = 0.25;
    } else if (matId < 42.5) { // Orbital |ψ|² luminoso
      albedo = uPrimaryCol;
      emissive = mix(uPrimaryCol, uSecondaryCol, 0.5 + 0.5 * sin(uTime * 2.5)) * 1.45;
    } else if (matId < 43.5) { // Suelo laboratorio A2
      albedo = mix(vec3(0.02, 0.04, 0.08), uPrimaryCol * 0.22, 1.0 - aux);
      roughness = 0.22;
      metallic = 0.35;
    } else if (matId < 50.5) { // Planeta 3D (Tierra / Luna / Marte)
      vec3 sp = normalize(p - vec3(-1.35, -0.05, -2.6));
      float cont = fbm2(vec2(atan(sp.z, sp.x) * 2.4 + uTime * 0.05, sp.y * 3.8));
      if (uPlanetId > 1.5 && uPlanetId < 2.5) { // Marte
        albedo = mix(vec3(0.45, 0.14, 0.06), vec3(0.88, 0.42, 0.18), cont);
        roughness = 0.85;
      } else if (uPlanetId > 0.5 && uPlanetId < 1.5) { // Luna
        float crat = noise2(vec2(atan(sp.z, sp.x) * 8.0, sp.y * 9.0));
        albedo = mix(vec3(0.28, 0.31, 0.36), vec3(0.76, 0.79, 0.84), crat);
        roughness = 0.92;
      } else { // Tierra con nubes
        float clouds = fbm2(vec2(atan(sp.z, sp.x) * 3.2 - uTime * 0.08, sp.y * 4.5));
        vec3 land = mix(vec3(0.04, 0.34, 0.18), vec3(0.55, 0.46, 0.28), smoothstep(0.55, 0.82, cont));
        vec3 ocean = vec3(0.01, 0.24, 0.56);
        albedo = mix(ocean, land, smoothstep(0.48, 0.56, cont));
        albedo = mix(albedo, vec3(0.95, 0.98, 1.0), smoothstep(0.58, 0.80, clouds) * 0.72);
        roughness = cont > 0.5 ? 0.75 : 0.22;
      }
      // Dispersión Rayleigh en borde atmosférico del planeta
      float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
      vec3 atmo = uPlanetId > 1.5 && uPlanetId < 2.5 ? vec3(0.95, 0.48, 0.24) : vec3(0.26, 0.68, 1.0);
      emissive = atmo * rim * (uPlanetId > 0.5 && uPlanetId < 1.5 ? 0.18 : 0.85);
    } else if (matId < 51.5) { // Anillos planetarios
      float bands = 0.55 + 0.45 * sin(aux * 28.0);
      albedo = mix(uPrimaryCol * 0.65, vec3(0.86, 0.82, 0.74), bands);
      roughness = 0.55;
    } else if (matId < 52.5) { // Casco nave espacial
      albedo = mix(vec3(0.78, 0.84, 0.92), uPrimaryCol, 0.18);
      roughness = 0.20;
      metallic = 0.75;
    } else if (matId < 53.5) { // Cabina cristal nave
      albedo = vec3(0.08, 0.32, 0.55);
      roughness = 0.05;
      metallic = 0.90;
      emissive = uPrimaryCol * 0.35;
    } else if (matId < 54.5) { // Propulsor plasma
      albedo = vec3(1.0, 0.75, 0.25);
      emissive = mix(vec3(0.25, 0.85, 1.0), vec3(1.0, 0.62, 0.15), 0.5 + 0.5 * sin(uTime * 18.0)) * 2.6;
    } else if (matId < 55.5) { // Baliza orbital
      albedo = vec3(0.25, 1.0, 0.72);
      emissive = mix(vec3(0.15, 0.95, 0.65), uSecondaryCol, 0.5 + 0.5 * sin(uTime * 6.0)) * 2.0;
    } else if (matId < 60.5) { // Montañas alpinas con nieve en alturas y pendientes suaves
      float snow = smoothstep(0.25, 0.75, aux) * smoothstep(0.55, 0.85, N.y);
      vec3 rock = mix(vec3(0.14, 0.18, 0.24), vec3(0.32, 0.30, 0.28), fbm2(p.xz * 2.8));
      vec3 grass = vec3(0.06, 0.22, 0.14);
      vec3 terrainBase = mix(grass, rock, smoothstep(-0.75, -0.1, aux));
      albedo = mix(terrainBase, vec3(0.94, 0.97, 1.0), snow);
      roughness = mix(0.84, 0.35, snow);
    } else if (matId < 61.5) { // Aves
      albedo = vec3(0.96, 0.98, 1.0);
      roughness = 0.4;
    } else if (matId < 70.5) { // Cristal fotónico refractivo con dispersión Cauchy
      vec3 refrR = renderSky(refract(rd, N, 1.0 / max(1.1, uCauchyRefractive - 0.045)), sunDir, modeId);
      vec3 refrG = renderSky(refract(rd, N, 1.0 / max(1.1, uCauchyRefractive)), sunDir, modeId);
      vec3 refrB = renderSky(refract(rd, N, 1.0 / max(1.1, uCauchyRefractive + 0.065)), sunDir, modeId);
      vec3 dispCol = vec3(refrR.r, refrG.g, refrB.b) * 1.45;
      float facet = pow(max(0.0, 1.0 - abs(dot(N, V))), 2.2);
      albedo = mix(uPrimaryCol, uSecondaryCol, facet);
      emissive = dispCol * 0.85 + mix(uPrimaryCol, uSecondaryCol, 0.5) * facet * 0.75;
      roughness = 0.04;
      metallic = 0.15;
    } else if (matId < 71.5) { // Pedestal obsidiana con cáusticas
      float caust = pow(max(0.0, sin(length(p.xz) * 8.0 - uTime * 2.5) * 0.5 + 0.5), 4.0) * exp(-length(p.xz) * 0.65);
      albedo = vec3(0.03, 0.05, 0.09);
      emissive = mix(uPrimaryCol, uSecondaryCol, 0.4) * caust * 1.1;
      roughness = 0.12;
      metallic = 0.55;
    } else if (matId < 80.5) { // Toroide iridiscente P33
      vec3 irid = 0.5 + 0.5 * cos(6.28318 * (aux * 0.16 + vec3(0.0, 0.33, 0.67)) + uTime * 0.6);
      albedo = mix(uPrimaryCol, irid, 0.55);
      roughness = 0.12;
      metallic = 0.88;
    } else if (matId < 81.5) { // Monolito hexagonal Voronoi A2
      albedo = mix(vec3(0.02, 0.04, 0.09), uPrimaryCol * 0.35, 1.0 - aux);
      emissive = uPrimaryCol * (1.0 - aux) * 0.28;
      roughness = 0.16;
      metallic = 0.45;
    } else if (matId < 82.5) { // Núcleo interno toroide
      albedo = uSecondaryCol;
      emissive = uSecondaryCol * 1.65;
    } else if (matId < 90.5) { // Agua cimática Bessel
      albedo = mix(vec3(0.02, 0.08, 0.18), uPrimaryCol * 0.45, smoothstep(-0.02, 0.06, aux));
      roughness = 0.06;
      metallic = 0.32;
    } else if (matId < 91.5) { // Esfera de Bloch SU(2)
      float lat = abs(sin(p.y * 12.0 - uTime * 1.5));
      albedo = mix(uPrimaryCol, uSecondaryCol, 0.35);
      emissive = mix(uPrimaryCol, uSecondaryCol, lat * 0.4) * 0.55;
      roughness = 0.08;
      metallic = 0.45;
    } else if (matId < 92.5) { // Anillos geodésicos
      albedo = vec3(0.85, 0.92, 1.0);
      roughness = 0.14;
      metallic = 0.92;
    } else { // Vector de espín cuántico
      albedo = vec3(1.0, 0.90, 0.42);
      emissive = vec3(1.4, 1.05, 0.32);
    }

    // Iluminación PBR directa + sombras suaves + AO + Fresnel
    float sh = calcSoftShadow(p + N * 0.015, sunDir, 0.04, 8.0);
    float ao = calcAO(p, N);
    float ndl = max(dot(N, sunDir), 0.0);
    vec3 H = normalize(sunDir + V);
    float ndh = max(dot(N, H), 0.0001);
    float ndv = max(dot(N, V), 0.0001);

    float specPow = mix(160.0, 8.0, roughness);
    float specNorm = (specPow + 8.0) / 25.1327;
    float spec = pow(ndh, specPow) * specNorm * mix(0.06, 0.85, 1.0 - roughness);
    float fresnel = pow(1.0 - ndv, 4.0);

    vec3 sunCol = modeId > 0.5 && modeId < 1.5
      ? vec3(0.65, 0.78, 1.0)
      : vec3(1.0, 0.94, 0.84);
    vec3 skyFill = renderSky(reflect(-V, N), sunDir, modeId);

    vec3 diffCol = albedo * (1.0 - metallic * 0.65);
    vec3 specCol = mix(vec3(0.95), albedo, metallic);

    vec3 ambient = diffCol * mix(vec3(0.08, 0.12, 0.22), skyFill, 0.35) * ao * 0.55;
    vec3 direct = (diffCol * ndl + specCol * spec * ndl) * sunCol * sh * 1.45;
    vec3 envReflect = skyFill * specCol * fresnel * mix(0.85, 0.08, roughness);

    // Luz cálida adicional de antorcha en el castillo
    if (modeId > 2.5 && modeId < 3.5) {
      vec3 torchPos = vec3(0.0, -0.50, -1.25);
      vec3 tl = torchPos - p;
      float td = length(tl);
      float att = 1.0 / (1.0 + td * td * 0.9);
      direct += diffCol * max(0.0, dot(N, tl / max(0.001, td))) * vec3(1.6, 0.78, 0.24) * att;
    }

    return ambient + direct + envReflect + emissive;
  }

  void main() {
    vec2 zoomCenter = vec2(0.5);
    vec2 zoomedUv = (vUv - zoomCenter) / max(1.0, uZoom) + zoomCenter;
    if (zoomedUv.x < 0.0 || zoomedUv.x > 1.0 || zoomedUv.y < 0.0 || zoomedUv.y > 1.0) {
      gl_FragColor = vec4(0.012, 0.024, 0.055, 1.0);
      return;
    }

    // Coordenada física cuantizada a cuadrícula Biopixel + dithering P33 anti-muaré
    vec2 gridCoord = floor(zoomedUv * uBiopixelGrid);
    float antiMoire = p33HaltonAntiMoire(gridCoord);
    vec2 cellUv = (gridCoord + 0.5 + antiMoire) / uBiopixelGrid;

    // Acoplamiento físico Pauli-SoA en tiempo real
    vec4 soa = texture2D(uPauliTex, cellUv);
    vec2 pScreen = (cellUv * 2.0 - 1.0) * vec2(uAspect, 1.0);
    pScreen += (soa.rg - 0.5) * 0.008 * uPauliTension;

    // Cámara 3D interactiva por órbita suave
    float yaw = uCamOrbit.x + sin(uTime * 0.22) * 0.08;
    float pitch = clamp(0.22 + uCamOrbit.y, -0.25, 0.75);
    vec3 target = vec3(0.0, -0.15, -0.4);
    if (uMode > 4.5 && uMode < 5.5) target = vec3(-0.15, 0.0, -0.6);
    float camDist = uMode > 1.5 && uMode < 2.5 ? 3.2 : 3.7;
    vec3 ro = target + vec3(
      sin(yaw) * cos(pitch) * camDist,
      sin(pitch) * camDist + 0.38,
      cos(yaw) * cos(pitch) * camDist
    );

    vec3 fwd = normalize(target - ro);
    vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, fwd);
    vec3 rd = normalize(fwd * uFovScale + right * pScreen.x + up * pScreen.y);

    vec3 sunDir = normalize(vec3(0.55, 0.48, -0.68));
    if (uMode > 1.5 && uMode < 2.5) sunDir = normalize(vec3(0.18, 0.16, -0.96)); // Puesta de sol océano

    // Raymarching 3D volumétrico
    float tDist = 0.05;
    vec3 hitInfo = vec3(100.0, 0.0, 0.0);
    bool hit = false;
    float maxDist = 22.0;

    for (int i = 0; i < 64; i++) {
      if (float(i) >= uMaxSteps) break;
      vec3 pos = ro + rd * tDist;
      vec3 d = mapWorld(pos);
      if (d.x < 0.0035 * (1.0 + tDist * 0.25)) {
        hitInfo = d;
        hit = true;
        break;
      }
      tDist += d.x;
      if (tDist > maxDist) break;
    }

    vec3 skyCol = renderSky(rd, sunDir, uMode);
    vec3 col = skyCol;

    if (hit) {
      vec3 pHit = ro + rd * tDist;
      vec3 N = calcNormal(pHit);
      vec3 V = -rd;
      col = shadeHit(pHit, N, V, rd, hitInfo.y, hitInfo.z, sunDir, uMode);

      // Niebla atmosférica y scattering volumétrico dependiente de distancia
      float fogDensity = (uMode < 0.5 || (uMode > 5.5 && uMode < 6.5)) ? 0.052 : 0.028;
      if (uMode > 4.5 && uMode < 5.5) fogDensity = 0.008;
      float fogAmt = 1.0 - exp(-tDist * tDist * fogDensity * 0.25);
      col = mix(col, skyCol, clamp(fogAmt, 0.0, 0.92));
    }

    // Haces volumétricos suaves hacia el sol en bosque / montaña / océano
    if (uMode < 2.5 || (uMode > 5.5 && uMode < 6.5)) {
      float sunAlign = pow(max(dot(rd, sunDir), 0.0), 8.0);
      col += vec3(1.0, 0.80, 0.45) * sunAlign * (hit ? 0.08 : 0.18);
    }

    // Ganancia física WKB + IGZO y tono fílmico ACES
    col *= uWkbGain * uIgzoGain;
    vec3 litCol = acesFilm(col * 1.12);
    litCol = pow(litCol, vec3(1.0 / 1.12));

    // 1. Profundidad de Color Comercial (24-bit True Color / 8-bit Grises / 1-bit Monocromático)
    litCol = clamp(litCol, 0.0, 1.0);
    if (uColorDepth > 1.5) {
      float lum = dot(litCol, vec3(0.2126, 0.7152, 0.0722));
      litCol = vec3(lum > 0.28 ? 1.0 : 0.04);
    } else if (uColorDepth > 0.5) {
      float lum = dot(litCol, vec3(0.2126, 0.7152, 0.0722));
      float q8 = floor(lum * 255.0 + 0.5) / 255.0;
      litCol = vec3(q8);
    } else {
      litCol = floor(litCol * 255.0 + 0.5) / 255.0;
    }

    // 2. Estado de Salud del Biopíxel (Muerto / Atascado / Caliente)
    if (uDefectMode > 0.5) {
      bool hit1 = mod(gridCoord.x, 131.0) < 2.0 && mod(gridCoord.y, 107.0) < 2.0;
      bool hit2 = mod(gridCoord.x + 41.0, 97.0) < 2.0 && mod(gridCoord.y + 23.0, 89.0) < 2.0;
      if (hit1 || hit2) {
        if (uDefectMode < 1.5) litCol = vec3(0.0);
        else if (uDefectMode < 2.5) litCol = hit1 ? vec3(0.0, 1.0, 0.45) : vec3(1.0, 0.08, 0.15);
        else litCol = vec3(1.0);
      }
    }

    // Pulso armónico de reparación
    if (uRepairSweep > 0.01) {
      float repairDx = (vUv.x - (1.0 - uRepairSweep)) * 12.0;
      float wave = exp(-(repairDx * repairDx));
      litCol += vec3(0.15, 0.85, 0.95) * wave * 0.45;
    }

    // 3. Rejilla física Sub-Biopixel visible al hacer zoom
    vec2 cellPerScreenPx = uBiopixelGrid / max(uCanvasPx * uZoom, vec2(1.0));
    float maxDensity = max(cellPerScreenPx.x, cellPerScreenPx.y);
    float subVisibility = smoothstep(1.45, 0.22, maxDensity);

    vec2 subFract = fract(zoomedUv * uBiopixelGrid);
    float gapX = smoothstep(0.0, 0.075, subFract.x) * (1.0 - smoothstep(0.925, 1.0, subFract.x));
    float gapY = smoothstep(0.0, 0.075, subFract.y) * (1.0 - smoothstep(0.925, 1.0, subFract.y));
    vec3 subEmit = litCol;

    if (uSubpixelMode > 1.5) {
      float subSep = smoothstep(0.0, 0.035, abs(subFract.x - 0.25))
                   * smoothstep(0.0, 0.035, abs(subFract.x - 0.50))
                   * smoothstep(0.0, 0.035, abs(subFract.x - 0.75));
      float wChan = min(litCol.r, min(litCol.g, litCol.b));
      float mR = smoothstep(0.27, 0.22, subFract.x);
      float mG = smoothstep(0.22, 0.27, subFract.x) * smoothstep(0.52, 0.47, subFract.x);
      float mB = smoothstep(0.47, 0.52, subFract.x) * smoothstep(0.77, 0.72, subFract.x);
      float mW = smoothstep(0.72, 0.77, subFract.x);
      vec3 rgbwCol = litCol * vec3(mR, mG, mB) * 1.95 + vec3(wChan * mW * 1.65);
      subEmit = rgbwCol * (0.35 + 0.65 * gapX * gapY * subSep);
    } else if (uSubpixelMode > 0.5) {
      float parity = mod(gridCoord.x + gridCoord.y, 2.0);
      vec2 dLeft = subFract - vec2(0.28, 0.5);
      vec2 dRight = subFract - vec2(0.72, 0.5);
      float diamL = smoothstep(0.32, 0.14, abs(dLeft.x) + abs(dLeft.y));
      float diamR = smoothstep(0.32, 0.14, abs(dRight.x) + abs(dRight.y));
      vec3 pentileMask = parity < 0.5
        ? vec3(diamL * 2.0, diamR * 1.65, 0.12)
        : vec3(0.12, diamR * 1.65, diamL * 2.0);
      subEmit = litCol * pentileMask * (0.4 + 0.6 * gapY);
    } else {
      float subSep = smoothstep(0.0, 0.045, abs(subFract.x - 0.33333))
                   * smoothstep(0.0, 0.045, abs(subFract.x - 0.66667));
      float maskR = smoothstep(0.36, 0.29, subFract.x);
      float maskG = smoothstep(0.29, 0.36, subFract.x) * smoothstep(0.71, 0.64, subFract.x);
      float maskB = smoothstep(0.64, 0.71, subFract.x);
      vec3 subWeights = mix(vec3(0.28), vec3(1.85), vec3(maskR, maskG, maskB));
      subEmit = litCol * subWeights * (0.35 + 0.65 * gapX * gapY * subSep);
    }

    vec3 finalCol = mix(litCol, subEmit, 0.06 + 0.94 * subVisibility);
    gl_FragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
  }
`;

export function HelixBiopixel3DStage({
  shape,
  storyMold = null,
  storyPrevMold = null,
  storyMorphMix = 1.0,
  storyPrimaryHex,
  storySecondaryHex,
  disneySquashY = 1.0,
  disneyStretchXZ = 1.0,
  disneyArcX = 0.0,
  disneyArcY = 0.0,
  resolutionTier = 'UHD_4K',
  subpixelLayout = 'RGB_STRIPE',
  colorDepth = 'TRUE_COLOR_24BIT',
  defectMode = 'HEALTHY',
  repairPulse = 0,
  accentHex = '#38bdf8',
  energy = 0.48,
  tension = 0.35,
  planetId = 'EARTH',
  pulseCounter = 0,
  cineFovDeg,
  c6DeltaZ = 0,
  onShipScoreUpdate,
  onTelemetryUpdate,
  onCanvasReady,
}: HelixBiopixel3DStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef<BiopixelStageRuntimeProps>({
    shape,
    storyMold,
    storyPrevMold,
    storyMorphMix,
    storyPrimaryHex,
    storySecondaryHex,
    disneySquashY,
    disneyStretchXZ,
    disneyArcX,
    disneyArcY,
    resolutionTier,
    subpixelLayout,
    colorDepth,
    defectMode,
    repairPulse,
    accentHex,
    energy,
    tension,
    planetId,
    pulseCounter,
    cineFovDeg,
    c6DeltaZ,
    onShipScoreUpdate,
    onTelemetryUpdate,
    onCanvasReady,
  });
  propsRef.current = {
    shape,
    storyMold,
    storyPrevMold,
    storyMorphMix,
    storyPrimaryHex,
    storySecondaryHex,
    disneySquashY,
    disneyStretchXZ,
    disneyArcX,
    disneyArcY,
    resolutionTier,
    subpixelLayout,
    colorDepth,
    defectMode,
    repairPulse,
    accentHex,
    energy,
    tension,
    planetId,
    pulseCounter,
    cineFovDeg,
    c6DeltaZ,
    onShipScoreUpdate,
    onTelemetryUpdate,
    onCanvasReady,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(240, container.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const glCanvas = document.createElement('canvas');
    let gl2: WebGL2RenderingContext | null = null;
    try {
      gl2 = glCanvas.getContext('webgl2', {
        antialias: false,
        alpha: false,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false,
      }) as WebGL2RenderingContext | null;
    } catch {
      gl2 = null;
    }

    if (!gl2 || gl2.isContextLost()) {
      return runBiopixelCanvas2DFallback(container, propsRef, resolveMoldModeFloat);
    }

    const debugInfo = gl2.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo
      ? String(gl2.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? '')
      : String(gl2.getParameter(gl2.RENDERER) ?? '');
    const isSoftwareGl = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(rendererStr);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: glCanvas,
        context: gl2,
        antialias: false,
        powerPreference: 'default',
        alpha: false,
      });
    } catch {
      return runBiopixelCanvas2DFallback(container, propsRef, resolveMoldModeFloat);
    }

    renderer.setPixelRatio(isSoftwareGl ? 1 : dpr);
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    propsRef.current.onCanvasReady?.(renderer.domElement);

    const onContextLost = (e: Event) => e.preventDefault();
    renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

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

    const planeGeo = new THREE.PlaneGeometry(2, 2);
    const initialTier = BIOPIXEL_TIERS[propsRef.current.resolutionTier ?? 'UHD_4K'] ?? BIOPIXEL_TIERS.UHD_4K;

    const uniforms = {
      uTime: { value: 0 },
      uMode: { value: 5.0 },
      uPrevMode: { value: 5.0 },
      uMorphMix: { value: 1.0 },
      uPlanetId: { value: 0.0 },
      uEnergy: { value: 0.48 },
      uTension: { value: 0.35 },
      uZoom: { value: 1.0 },
      uAspect: { value: width / height },
      uFovScale: { value: 1.45 },
      uMaxSteps: { value: isSoftwareGl ? 32.0 : 56.0 },
      uShadowSteps: { value: isSoftwareGl ? 0.0 : 8.0 },
      uCauchyRefractive: { value: 1.77 },
      uWkbGain: { value: 1.0 },
      uIgzoGain: { value: 1.0 },
      uPauliTension: { value: 0.35 },
      uPrimeNorm: { value: 47 / 137 },
      uSubpixelMode: { value: 0.0 },
      uColorDepth: { value: 0.0 },
      uDefectMode: { value: 0.0 },
      uRepairSweep: { value: 0.0 },
      uDisneyMotion: { value: new THREE.Vector4(1.0, 1.0, 0.0, 0.0) },
      uShipOffset: { value: new THREE.Vector2(0, 0) },
      uBeaconPos: { value: new THREE.Vector2(0.55, 0.32) },
      uBiopixelGrid: { value: new THREE.Vector2(initialTier.width, initialTier.height) },
      uCanvasPx: { value: new THREE.Vector2(width * dpr, height * dpr) },
      uCamOrbit: { value: new THREE.Vector2(0, 0) },
      uPrimaryCol: { value: new THREE.Color('#38bdf8') },
      uSecondaryCol: { value: new THREE.Color('#f59e0b') },
      uPointer: { value: new THREE.Vector4(0, 0, 0, 0) },
      uPauliTex: { value: pauliTex },
    };

    const planeMat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      depthWrite: false,
      depthTest: false,
    });
    const fullScreenQuad = new THREE.Mesh(planeGeo, planeMat);
    scene.add(fullScreenQuad);

    let zoomTarget = 1.0;
    let zoomCurrent = 1.0;
    let ptrNdcX = 0;
    let ptrNdcY = 0;
    let orbitYaw = 0;
    let orbitPitch = 0;
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
      renderer.domElement.style.cursor = ptrDown ? 'grabbing' : 'grab';
    };

    const onPointerUp = () => {
      ptrDown = false;
      renderer.domElement.style.cursor = 'grab';
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
      renderer.setSize(canvasW, canvasH);
      uniforms.uAspect.value = canvasW / canvasH;
      uniforms.uCanvasPx.value.set(canvasW * dpr, canvasH * dpr);
    });
    ro.observe(container);

    const nanotechBaseline = getInitialNanotechMetrics();
    const shipOffset = { x: 0, y: 0 };
    const beaconPos = { x: 0.45, y: 0.25 };
    let shipScore = 0;
    let beaconSeed = 1;
    let lastRepairPulseSeen = propsRef.current.repairPulse;
    let repairSweep = 0;
    let activeModeTracked = resolveMoldModeFloat(propsRef.current.shape, propsRef.current.storyMold);
    let prevModeTracked = activeModeTracked;
    let autoMorphProgress = 1.0;
    let prevTime = performance.now();
    let prevWeberMetric = 0.35;
    let renderedFrames = 0;
    let skippedFrames = 0;
    let lastTelemetryPush = 0;
    let raf = 0;
    let softwareTimerId = 0;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      if (disposed) return;
      if (typeof gl2.fenceSync === 'function') {
        const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl2.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl2.deleteSync(sync);
            return;
          }
          const state = sync ? gl2.getSyncParameter(sync, gl2.SYNC_STATUS) : gl2.SIGNALED;
          if (state === gl2.UNSIGNALED) {
            softwareTimerId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl2.deleteSync(sync);
            softwareTimerId = window.setTimeout(cb, 80);
          }
        };
        softwareTimerId = window.setTimeout(poll, 5);
      } else {
        softwareTimerId = window.setTimeout(cb, 80);
      }
    };

    const animate = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.04, Math.max(0.001, (now - prevTime) * 0.001));
      prevTime = now;
      const t = now * 0.001;
      const cur = propsRef.current;

      if (cur.repairPulse !== lastRepairPulseSeen) {
        lastRepairPulseSeen = cur.repairPulse;
        repairSweep = 1.0;
      } else if (repairSweep > 0) {
        repairSweep = Math.max(0, repairSweep - dt * 0.85);
      }

      const tier = BIOPIXEL_TIERS[cur.resolutionTier ?? 'UHD_4K'] ?? BIOPIXEL_TIERS.UHD_4K;
      uniforms.uBiopixelGrid.value.set(tier.width, tier.height);

      const primeIdx = Math.max(0, cur.pulseCounter ?? 0) % 33;
      const effectiveTension = Math.min(1, Math.max(0, (cur.tension ?? 0.35) + Math.abs(cur.c6DeltaZ ?? 0) * 0.28));
      const coupled = computeCoupledNanotechBiopixelState({
        tension: effectiveTension,
        primeIndex: primeIdx,
      });

      const spd = 1.7 * dt;
      if (keys['w'] || keys['arrowup']) shipOffset.y += spd;
      if (keys['s'] || keys['arrowdown']) shipOffset.y -= spd;
      if (keys['a'] || keys['arrowleft']) shipOffset.x -= spd;
      if (keys['d'] || keys['arrowright']) shipOffset.x += spd;
      shipOffset.x = THREE.MathUtils.clamp(shipOffset.x, -1.25, 1.25);
      shipOffset.y = THREE.MathUtils.clamp(shipOffset.y, -0.95, 0.95);

      const modeVal = resolveMoldModeFloat(cur.shape, cur.storyMold);
      if (modeVal > 4.5 && modeVal < 5.5) {
        const shipWorldX = 0.55 + shipOffset.x * 1.15;
        const shipWorldY = -0.05 + shipOffset.y * 0.92;
        if (p33ArithmeticDistance(shipWorldX - beaconPos.x * 1.5, shipWorldY - beaconPos.y * 1.2, primeIdx) < 0.34) {
          shipScore += 1;
          beaconSeed = (beaconSeed * 1664525 + 1013904223) >>> 0;
          beaconPos.x = -0.15 + ((beaconSeed & 0xff) / 255) * 0.95;
          beaconPos.y = -0.55 + (((beaconSeed >> 8) & 0xff) / 255) * 1.1;
          cur.onShipScoreUpdate?.(shipScore);
        }
      }

      zoomCurrent += (zoomTarget - zoomCurrent) * Math.min(1, dt * 10);

      const targetYaw = ptrHover ? ptrNdcX * 0.65 : 0.0;
      const targetPitch = ptrHover ? ptrNdcY * 0.32 : 0.0;
      orbitYaw += (targetYaw - orbitYaw) * Math.min(1, dt * 4.5);
      orbitPitch += (targetPitch - orbitPitch) * Math.min(1, dt * 4.5);
      uniforms.uCamOrbit.value.set(orbitYaw, orbitPitch);

      const targetFovDeg = THREE.MathUtils.clamp(cur.cineFovDeg ?? 38, 22, 62);
      const targetFovScale = 1.0 / Math.tan(THREE.MathUtils.degToRad(targetFovDeg * 0.5));
      uniforms.uFovScale.value += (targetFovScale - uniforms.uFovScale.value) * Math.min(1, dt * 4.5);

      const pauliStep = stepPauliSoAPhysics(soaBuffer, soaPhys, t, dt, {
        curlGain: ptrDown ? 0.55 : 0.18 + (cur.energy ?? 0.48) * 0.25,
        elasticityE: 14.0 + coupled.brusCauchy.cauchyRefractiveIndex * 2.5,
        viscosityEta: 5.5 + effectiveTension * 2.0,
        nemesisGamma: 0.08,
      });
      const nemesisDamped = stepNemesisCauchy(pauliStep.meanTension + effectiveTension * 0.25, 0.08);
      const nextMetric =
        nemesisDamped +
        (ptrDown ? 0.15 : 0) +
        Math.abs(shipOffset.x) * 0.1 +
        Math.abs(zoomCurrent - zoomTarget) * 0.2;

      const weber = evaluateWeberFechnerFrame(prevWeberMetric, nextMetric, WEBER_PERCEPTUAL_K);
      if (weber.decision === 'RENDER_FRAME' || ptrHover || zoomCurrent > 1.02 || repairSweep > 0) {
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

      if (Math.abs(modeVal - activeModeTracked) > 0.25) {
        prevModeTracked = activeModeTracked;
        activeModeTracked = modeVal;
        autoMorphProgress = 0.0;
      } else if (autoMorphProgress < 1.0) {
        autoMorphProgress = Math.min(1.0, autoMorphProgress + dt * 1.25);
      }

      const explicitPrevMode = cur.storyPrevMold ? resolveMoldModeFloat(cur.shape, cur.storyPrevMold) : prevModeTracked;
      const effectiveMorph = cur.storyPrevMold ? Math.min(1.0, Math.max(0.0, cur.storyMorphMix ?? 1.0)) : autoMorphProgress;

      uniforms.uTime.value = t;
      uniforms.uMode.value = modeVal;
      uniforms.uPrevMode.value = explicitPrevMode;
      uniforms.uMorphMix.value = effectiveMorph;
      uniforms.uPlanetId.value =
        cur.planetId === 'MOON' ? 1.0 : cur.planetId === 'MARS' ? 2.0 : cur.planetId === 'ORBIT_ZERO_G' ? 3.0 : 0.0;
      uniforms.uEnergy.value = cur.energy ?? 0.48;
      uniforms.uTension.value = cur.tension ?? 0.35;
      uniforms.uZoom.value = zoomCurrent;
      uniforms.uCauchyRefractive.value = coupled.brusCauchy.cauchyRefractiveIndex;
      uniforms.uWkbGain.value = coupled.wkbTunneling.quantumRegime === 'BLOCKED' ? 0.78 : 1.0;
      uniforms.uIgzoGain.value = coupled.igzo.regime === 'saturation' ? 1.05 : 0.99;
      uniforms.uPauliTension.value = nemesisDamped;
      uniforms.uPrimeNorm.value = P33_DISPLAY_PRIMES[primeIdx] / 137;
      uniforms.uSubpixelMode.value = subpixelLayoutCode(cur.subpixelLayout ?? 'RGB_STRIPE');
      uniforms.uColorDepth.value = colorDepthCode(cur.colorDepth ?? 'TRUE_COLOR_24BIT');
      uniforms.uDefectMode.value = defectModeCode(cur.defectMode ?? 'HEALTHY');
      uniforms.uRepairSweep.value = repairSweep;
      uniforms.uDisneyMotion.value.set(
        cur.disneySquashY ?? 1.0,
        cur.disneyStretchXZ ?? 1.0,
        cur.disneyArcX ?? 0.0,
        cur.disneyArcY ?? 0.0,
      );
      uniforms.uShipOffset.value.set(shipOffset.x, shipOffset.y);
      uniforms.uBeaconPos.value.set(beaconPos.x, beaconPos.y);
      uniforms.uPrimaryCol.value.set(cur.storyPrimaryHex || cur.accentHex || '#38bdf8');
      uniforms.uSecondaryCol.value.set(cur.storySecondaryHex || '#f59e0b');
      uniforms.uPointer.value.set(ptrNdcX, ptrNdcY, ptrDown ? 1.0 : 0.0, ptrHover ? 1.0 : 0.0);

      renderer.render(scene, camera);

      if (cur.onTelemetryUpdate && now - lastTelemetryPush > 450) {
        lastTelemetryPush = now;
        const activeDpr = isSoftwareGl ? 1 : dpr;
        const physW = Math.round(canvasW * activeDpr);
        const physH = Math.round(canvasH * activeDpr);
        const subMult = (cur.subpixelLayout ?? 'RGB_STRIPE') === 'RGBW' ? 4 : (cur.subpixelLayout ?? 'RGB_STRIPE') === 'PENTILE_DIAMOND' ? 2 : 3;
        cur.onTelemetryUpdate({
          tier,
          physicalCanvasWidth: physW,
          physicalCanvasHeight: physH,
          logicalCssWidth: canvasW,
          logicalCssHeight: canvasH,
          devicePixelRatio: activeDpr,
          physicalMeasuredBiopixels: physW * physH,
          subBiopixelTotalActive: tier.biopixels * subMult,
          subpixelLayout: cur.subpixelLayout ?? 'RGB_STRIPE',
          colorDepth: cur.colorDepth ?? 'TRUE_COLOR_24BIT',
          defectMode: cur.defectMode ?? 'HEALTHY',
          p33Metrics: computeP33DisplayMetrics(tier.width, tier.height, primeIdx),
          weberDecision: weber.decision,
          weberDeltaRatio: weber.deltaRatio,
          renderedFrames,
          skippedFrames,
          pauliMeanTension: nemesisDamped,
          brusRedDiameterNm: nanotechBaseline.brusRedDiameterNm,
          brusGreenDiameterNm: nanotechBaseline.brusGreenDiameterNm,
          brusBlueDiameterNm: nanotechBaseline.brusBlueDiameterNm,
          rayleighPitchNm: nanotechBaseline.rayleighPitchNm,
        });
      }

      if (isSoftwareGl) {
        afterDraw(animate);
      } else {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(softwareTimerId);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost, false);
      planeGeo.dispose();
      planeMat.dispose();
      pauliTex.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full select-none" />;
}
