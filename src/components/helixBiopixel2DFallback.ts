import type { MutableRefObject } from 'react';
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
import type { LiquidMorphShape } from './LiquidBiopixelCanvas';

export interface BiopixelStageRuntimeProps {
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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (!Number.isFinite(num)) return { r: 56, g: 189, b: 248 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function runBiopixelCanvas2DFallback(
  container: HTMLElement,
  propsRef: MutableRefObject<BiopixelStageRuntimeProps>,
  resolveMode: (shape: LiquidMorphShape, storyMold?: StorySceneMoldKind | null) => number,
): () => void {
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.innerHTML = '';
  container.appendChild(canvas);
  propsRef.current.onCanvasReady?.(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return () => {
      canvas.remove();
    };
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let canvasW = Math.max(320, container.clientWidth);
  let canvasH = Math.max(240, container.clientHeight);
  canvas.width = Math.round(canvasW * dpr);
  canvas.height = Math.round(canvasH * dpr);

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

  let zoomTarget = 1.0;
  let zoomCurrent = 1.0;
  let ptrNdcX = 0;
  let ptrNdcY = 0;
  let orbitYaw = 0;
  let orbitPitch = 0;
  let ptrDown = false;
  let ptrHover = false;

  const updatePointerFromEvent = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
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
    canvas.style.cursor = ptrDown ? 'grabbing' : 'grab';
  };
  const onPointerUp = () => {
    ptrDown = false;
    canvas.style.cursor = 'grab';
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

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });

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

  const ro = new ResizeObserver(() => {
    canvasW = Math.max(320, container.clientWidth);
    canvasH = Math.max(240, container.clientHeight);
    canvas.width = Math.round(canvasW * dpr);
    canvas.height = Math.round(canvasH * dpr);
  });
  ro.observe(container);

  const nanotechBaseline = getInitialNanotechMetrics();
  const shipOffset = { x: 0, y: 0 };
  const beaconPos = { x: 0.45, y: 0.25 };
  let shipScore = 0;
  let beaconSeed = 1;
  let lastRepairPulseSeen = propsRef.current.repairPulse;
  let repairSweep = 0;
  let prevTime = performance.now();
  let prevWeberMetric = 0.35;
  let renderedFrames = 0;
  let skippedFrames = 0;
  let lastTelemetryPush = 0;
  let raf = 0;

  const drawFrame = (
    t: number,
    modeVal: number,
    primaryHex: string,
    secondaryHex: string,
    cauchyN: number,
  ) => {
    const cur = propsRef.current;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w * 0.5 + orbitYaw * w * 0.08;
    const cy = h * 0.5 - orbitPitch * h * 0.08;
    const minDim = Math.min(w, h);
    const fovMult = 38 / THREE.MathUtils.clamp(cur.cineFovDeg ?? 38, 22, 62);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Zoom transform centered on viewport
    ctx.translate(w * 0.5, h * 0.5);
    ctx.scale(zoomCurrent * fovMult, zoomCurrent * fovMult);
    ctx.translate(-w * 0.5, -h * 0.5);

    const horizonY = h * (0.54 - orbitPitch * 0.14);

    if (modeVal < 0.5) {
      // 0: Bosque de Caperucita 3D
      const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
      sky.addColorStop(0, '#0a2832');
      sky.addColorStop(0.7, '#235647');
      sky.addColorStop(1, '#ecc36c');
      ctx.fillStyle = sky;
      ctx.fillRect(-w, -h, w * 3, h * 3);

      // Sun rays
      ctx.fillStyle = 'rgba(255,220,135,0.12)';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.65, horizonY * 0.35);
        ctx.lineTo(w * (0.15 + i * 0.19), h * 1.2);
        ctx.lineTo(w * (0.24 + i * 0.19), h * 1.2);
        ctx.closePath();
        ctx.fill();
      }

      const grass = ctx.createLinearGradient(0, horizonY, 0, h);
      grass.addColorStop(0, '#133b24');
      grass.addColorStop(1, '#081d12');
      ctx.fillStyle = grass;
      ctx.fillRect(-w, horizonY, w * 3, h);

      // Winding trail
      ctx.beginPath();
      ctx.moveTo(cx - minDim * 0.16, h);
      ctx.quadraticCurveTo(cx + Math.sin(t * 0.4) * 35, (horizonY + h) * 0.5, cx + 10, horizonY);
      ctx.lineTo(cx + 26, horizonY);
      ctx.quadraticCurveTo(cx + 55 + Math.sin(t * 0.4) * 35, (horizonY + h) * 0.5, cx + minDim * 0.22, h);
      ctx.closePath();
      ctx.fillStyle = '#6f4826';
      ctx.fill();

      // Pine silhouettes
      for (let i = -4; i <= 4; i++) {
        if (i === 0) continue;
        const px = cx + i * (minDim * 0.14) + Math.sin(i * 2.1) * 20;
        const depth = 0.62 + (Math.abs(i) % 3) * 0.18;
        const py = horizonY + depth * (h * 0.14);
        const sway = Math.sin(t * 1.5 + i) * 6;
        ctx.fillStyle = '#3b2415';
        ctx.fillRect(px - 5 * depth, py - 12 * depth, 10 * depth, 44 * depth);
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(px + sway * (k + 1) * 0.35, py - (115 - k * 24) * depth);
          ctx.lineTo(px - (44 - k * 8) * depth, py - (10 + k * 22) * depth);
          ctx.lineTo(px + (44 - k * 8) * depth, py - (10 + k * 22) * depth);
          ctx.closePath();
          ctx.fillStyle = k === 2 ? '#0e452f' : '#083222';
          ctx.fill();
        }
      }

      // Red Riding Hood animated character
      const walkX = cx + Math.sin(t * 0.9) * minDim * 0.08 + (cur.disneyArcX ?? 0) * 60;
      const walkY = horizonY + h * 0.18 - Math.abs(Math.sin(t * 3.8)) * 10 - (cur.disneyArcY ?? 0) * 40;
      const sy = Math.max(0.75, cur.disneySquashY ?? 1);
      const sx = Math.max(0.75, cur.disneyStretchXZ ?? 1);
      ctx.save();
      ctx.translate(walkX, walkY);
      ctx.scale(sx, sy);
      ctx.fillStyle = '#d11626';
      ctx.beginPath();
      ctx.moveTo(0, -56);
      ctx.lineTo(-26, 18);
      ctx.lineTo(26, 18);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -64, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2c7a5';
      ctx.beginPath();
      ctx.arc(4, -63, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (modeVal < 1.5) {
      // 1: Lobo nocturno bajo la luna
      const night = ctx.createLinearGradient(0, 0, 0, h);
      night.addColorStop(0, '#040817');
      night.addColorStop(0.6, '#0c1836');
      night.addColorStop(1, '#07101f');
      ctx.fillStyle = night;
      ctx.fillRect(-w, -h, w * 3, h * 3);

      // Moon + halo
      const mx = cx + minDim * 0.22;
      const my = h * 0.26;
      const halo = ctx.createRadialGradient(mx, my, 12, mx, my, minDim * 0.26);
      halo.addColorStop(0, 'rgba(235,244,255,0.95)');
      halo.addColorStop(0.22, 'rgba(130,175,255,0.35)');
      halo.addColorStop(1, 'rgba(12,24,54,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(mx, my, minDim * 0.26, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#091322';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, horizonY + 25);
      ctx.quadraticCurveTo(cx * 0.6, horizonY - 25, cx * 1.2, horizonY + 18);
      ctx.quadraticCurveTo(w * 0.8, horizonY - 12, w, horizonY + 24);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Wolf silhouette
      const wx = cx - minDim * 0.04;
      const wy = horizonY + 12 + Math.sin(t * 2.2) * 3;
      ctx.fillStyle = '#253147';
      ctx.beginPath();
      ctx.ellipse(wx, wy, 48, 22, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(wx + 44, wy - 28, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(wx + 50, wy - 36);
      ctx.lineTo(wx + 78, wy - 30);
      ctx.lineTo(wx + 52, wy - 20);
      ctx.closePath();
      ctx.fill();
      // Glowing eyes
      ctx.fillStyle = secondaryHex;
      ctx.beginPath();
      ctx.arc(wx + 52, wy - 31, 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (modeVal < 2.5) {
      // 2: Océano Gerstner al atardecer
      const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
      sky.addColorStop(0, '#0f3682');
      sky.addColorStop(0.58, '#4e7eb5');
      sky.addColorStop(1, '#ff9944');
      ctx.fillStyle = sky;
      ctx.fillRect(-w, -h, w * 3, horizonY + h);

      const sunGrad = ctx.createRadialGradient(cx + 45, horizonY - 20, 4, cx + 45, horizonY - 20, minDim * 0.2);
      sunGrad.addColorStop(0, '#fff7dc');
      sunGrad.addColorStop(0.3, 'rgba(255,190,105,0.65)');
      sunGrad.addColorStop(1, 'rgba(255,130,50,0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(cx + 45, horizonY - 20, minDim * 0.2, 0, Math.PI * 2);
      ctx.fill();

      const sea = ctx.createLinearGradient(0, horizonY, 0, h);
      sea.addColorStop(0, '#0b3c6e');
      sea.addColorStop(1, '#021329');
      ctx.fillStyle = sea;
      ctx.fillRect(-w, horizonY, w * 3, h);

      for (let row = 0; row < 18; row++) {
        const depth = row / 17;
        const yBase = horizonY + depth * depth * (h - horizonY + 30);
        ctx.beginPath();
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= w; x += 18) {
          const wy =
            yBase +
            Math.sin(x * 0.018 + t * 2.2 + row * 0.8) * (4 + depth * 18) +
            Math.cos(x * 0.035 - t * 2.9 + row) * (2 + depth * 7);
          ctx.lineTo(x, wy);
        }
        ctx.strokeStyle = depth > 0.55 ? 'rgba(205,240,255,0.42)' : 'rgba(255,195,120,0.3)';
        ctx.lineWidth = 1.4 + depth * 2.4;
        ctx.stroke();
      }
    } else if (modeVal < 3.5) {
      // 3: Castillo gótico con foso reflectante
      const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
      sky.addColorStop(0, '#070f21');
      sky.addColorStop(1, '#1c3152');
      ctx.fillStyle = sky;
      ctx.fillRect(-w, -h, w * 3, h * 2);

      ctx.fillStyle = '#0a1628';
      ctx.fillRect(-w, horizonY, w * 3, h);

      const castleW = minDim * 0.34;
      ctx.fillStyle = '#4c566a';
      ctx.fillRect(cx - castleW * 0.5, horizonY - castleW * 0.55, castleW, castleW * 0.55);
      ctx.fillRect(cx - castleW * 0.65, horizonY - castleW * 0.72, castleW * 0.22, castleW * 0.72);
      ctx.fillRect(cx + castleW * 0.43, horizonY - castleW * 0.72, castleW * 0.22, castleW * 0.72);
      ctx.fillRect(cx - castleW * 0.16, horizonY - castleW * 0.92, castleW * 0.32, castleW * 0.92);

      // Conical roofs
      ctx.fillStyle = primaryHex;
      const drawRoof = (rx: number, ry: number, rw: number, rh: number) => {
        ctx.beginPath();
        ctx.moveTo(rx, ry - rh);
        ctx.lineTo(rx - rw * 0.6, ry);
        ctx.lineTo(rx + rw * 0.6, ry);
        ctx.closePath();
        ctx.fill();
      };
      drawRoof(cx - castleW * 0.54, horizonY - castleW * 0.72, castleW * 0.22, castleW * 0.28);
      drawRoof(cx + castleW * 0.54, horizonY - castleW * 0.72, castleW * 0.22, castleW * 0.28);
      drawRoof(cx, horizonY - castleW * 0.92, castleW * 0.32, castleW * 0.36);

      // Torch gate glow + moat reflection
      const torch = ctx.createRadialGradient(cx, horizonY - 18, 2, cx, horizonY - 18, castleW * 0.45);
      torch.addColorStop(0, 'rgba(255,195,90,0.95)');
      torch.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = torch;
      ctx.beginPath();
      ctx.arc(cx, horizonY - 18, castleW * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (modeVal < 4.5) {
      // 4: Molécula cuántica 3D + orbitales
      const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, minDim * 0.65);
      bg.addColorStop(0, '#0d1d38');
      bg.addColorStop(1, '#040814');
      ctx.fillStyle = bg;
      ctx.fillRect(-w, -h, w * 3, h * 3);

      const rOrbit = minDim * 0.26;
      ctx.strokeStyle = rgba(primaryHex, 0.55);
      ctx.lineWidth = 3;
      for (let k = 0; k < 2; k++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * (k === 0 ? 0.5 : -0.42) + k * 0.8);
        ctx.beginPath();
        ctx.ellipse(0, 0, rOrbit, rOrbit * 0.38, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      const ox = cx;
      const oy = cy - 18 + Math.sin(t * 1.4) * 8;
      const osc = Math.sin(t * 2.8) * 14;
      const h1x = cx - minDim * 0.14 - osc;
      const h1y = cy + minDim * 0.08;
      const h2x = cx + minDim * 0.14 + osc;
      const h2y = cy + minDim * 0.08;

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(h1x, h1y);
      ctx.moveTo(ox, oy);
      ctx.lineTo(h2x, h2y);
      ctx.stroke();

      const drawAtom = (ax: number, ay: number, rad: number, col: string) => {
        const g = ctx.createRadialGradient(ax - rad * 0.3, ay - rad * 0.3, 2, ax, ay, rad);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.35, col);
        g.addColorStop(1, '#0f172a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ax, ay, rad, 0, Math.PI * 2);
        ctx.fill();
      };
      drawAtom(h1x, h1y, minDim * 0.055, primaryHex);
      drawAtom(h2x, h2y, minDim * 0.055, primaryHex);
      drawAtom(ox, oy, minDim * 0.09, '#ef4444');
    } else if (modeVal < 5.5) {
      // 5: Nave espacial jugable + Planeta + Anillos + Baliza
      const space = ctx.createRadialGradient(cx - minDim * 0.15, cy, 10, cx, cy, minDim * 0.8);
      space.addColorStop(0, '#0f1f40');
      space.addColorStop(1, '#030612');
      ctx.fillStyle = space;
      ctx.fillRect(-w, -h, w * 3, h * 3);

      // Stars
      ctx.fillStyle = 'rgba(225,240,255,0.75)';
      for (let i = 0; i < 65; i++) {
        const sx = ((i * 197.3) % 1) * w;
        const sy = ((i * 419.7) % 1) * h;
        ctx.fillRect(sx, sy, (i % 3) + 1, (i % 3) + 1);
      }

      // Planet
      const px = cx - minDim * 0.22;
      const py = cy + minDim * 0.02;
      const pr = minDim * 0.2;
      const pGrad = ctx.createRadialGradient(px - pr * 0.35, py - pr * 0.35, pr * 0.1, px, py, pr);
      if (cur.planetId === 'MARS') {
        pGrad.addColorStop(0, '#fb923c');
        pGrad.addColorStop(0.7, '#9a3412');
        pGrad.addColorStop(1, '#291008');
      } else if (cur.planetId === 'MOON') {
        pGrad.addColorStop(0, '#e2e8f0');
        pGrad.addColorStop(0.7, '#64748b');
        pGrad.addColorStop(1, '#1e293b');
      } else {
        pGrad.addColorStop(0, '#38bdf8');
        pGrad.addColorStop(0.65, '#0369a1');
        pGrad.addColorStop(1, '#082f49');
      }
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();

      // Planetary Rings
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-0.28);
      ctx.strokeStyle = rgba(primaryHex, 0.55);
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(0, 0, pr * 1.65, pr * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Target beacon ring
      const bx = cx + beaconPos.x * minDim * 0.32;
      const by = cy - beaconPos.y * minDim * 0.28;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(t * 1.4);
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, minDim * 0.055, minDim * 0.032, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Player WASD spaceship
      const sx = cx + minDim * 0.12 + shipOffset.x * minDim * 0.26;
      const sy = cy - shipOffset.y * minDim * 0.24 + Math.sin(t * 2.2) * 5;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(-shipOffset.x * 0.25);
      // Thruster plasma
      const flame = ctx.createLinearGradient(-34, 0, -10, 0);
      flame.addColorStop(0, 'rgba(56,189,248,0)');
      flame.addColorStop(0.5, '#38bdf8');
      flame.addColorStop(1, '#fbbf24');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(-14, -7);
      ctx.lineTo(-36 - Math.sin(t * 18) * 6, 0);
      ctx.lineTo(-14, 7);
      ctx.closePath();
      ctx.fill();
      // Hull & wings
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(28, 0);
      ctx.lineTo(-14, -18);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-14, 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = primaryHex;
      ctx.beginPath();
      ctx.ellipse(6, 0, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (modeVal < 6.5) {
      // 6: Cordillera alpina + aves
      const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
      sky.addColorStop(0, '#103b80');
      sky.addColorStop(1, '#f3ad68');
      ctx.fillStyle = sky;
      ctx.fillRect(-w, -h, w * 3, h * 2);

      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        const yBase = horizonY + layer * 42;
        for (let x = 0; x <= w; x += 22) {
          const ridge = Math.abs(Math.sin(x * 0.008 + layer * 1.4 + t * 0.12)) * (95 - layer * 18);
          ctx.lineTo(x, yBase - ridge);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = layer === 0 ? '#31445c' : layer === 1 ? '#1e2c40' : '#0f1c2e';
        ctx.fill();
      }

      // Birds
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) {
        const bx = ((t * 55 + i * 140) % (w + 80)) - 40;
        const by = horizonY * 0.55 + i * 18 + Math.sin(t * 4 + i) * 8;
        const flap = Math.sin(t * 8 + i * 1.5) * 7;
        ctx.beginPath();
        ctx.moveTo(bx - 12, by - flap);
        ctx.quadraticCurveTo(bx - 4, by - 4, bx, by);
        ctx.quadraticCurveTo(bx + 4, by - 4, bx + 12, by - flap);
        ctx.stroke();
      }
    } else if (modeVal < 7.5) {
      // 7: Cristal fotónico con dispersión de Cauchy
      const bg = ctx.createRadialGradient(cx, cy, 8, cx, cy, minDim * 0.6);
      bg.addColorStop(0, '#101f3d');
      bg.addColorStop(1, '#040710');
      ctx.fillStyle = bg;
      ctx.fillRect(-w, -h, w * 3, h * 3);

      const cr = minDim * 0.22;
      const shift = (cauchyN - 1.5) * 14;
      const drawOcta = (dx: number, col: string) => {
        ctx.save();
        ctx.translate(cx + dx, cy + Math.sin(t * 1.3) * 8);
        ctx.rotate(Math.sin(t * 0.45) * 0.24);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(0, -cr);
        ctx.lineTo(cr * 0.72, 0);
        ctx.lineTo(0, cr);
        ctx.lineTo(-cr * 0.72, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
      ctx.globalCompositeOperation = 'lighter';
      drawOcta(-shift, 'rgba(255,80,100,0.48)');
      drawOcta(0, rgba(primaryHex, 0.58));
      drawOcta(shift, 'rgba(90,190,255,0.52)');
      ctx.globalCompositeOperation = 'source-over';
    } else if (modeVal < 8.5) {
      // 8: Toroide P33 iridiscente
      const bg = ctx.createRadialGradient(cx, cy, 8, cx, cy, minDim * 0.65);
      bg.addColorStop(0, '#0f1d38');
      bg.addColorStop(1, '#030612');
      ctx.fillStyle = bg;
      ctx.fillRect(-w, -h, w * 3, h * 3);

      const tr = minDim * 0.2;
      ctx.save();
      ctx.translate(cx, cy + Math.sin(t * 1.4) * 9);
      ctx.rotate(t * 0.35);
      const grad = ctx.createLinearGradient(-tr, -tr, tr, tr);
      grad.addColorStop(0, primaryHex);
      grad.addColorStop(0.5, secondaryHex);
      grad.addColorStop(1, '#a78bfa');
      ctx.strokeStyle = grad;
      ctx.lineWidth = minDim * 0.085;
      ctx.beginPath();
      ctx.ellipse(0, 0, tr, tr * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const orb = ctx.createRadialGradient(cx, cy, 2, cx, cy, minDim * 0.09);
      orb.addColorStop(0, '#ffffff');
      orb.addColorStop(0.45, secondaryHex);
      orb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = orb;
      ctx.beginPath();
      ctx.arc(cx, cy, minDim * 0.09, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 9: Esfera cuántica de Bloch SU(2) + ondas Bessel J0
      const bg = ctx.createRadialGradient(cx, cy, 8, cx, cy, minDim * 0.65);
      bg.addColorStop(0, '#0d1e3b');
      bg.addColorStop(1, '#030612');
      ctx.fillStyle = bg;
      ctx.fillRect(-w, -h, w * 3, h * 3);

      for (let ring = 1; ring <= 5; ring++) {
        const rr = ring * minDim * 0.082 + ((t * 22) % (minDim * 0.082));
        ctx.strokeStyle = rgba(primaryHex, Math.max(0.05, 0.34 - ring * 0.05));
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy + minDim * 0.16, rr, rr * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      const br = minDim * 0.15;
      const sphereG = ctx.createRadialGradient(cx - br * 0.3, cy - br * 0.3, 4, cx, cy, br);
      sphereG.addColorStop(0, '#e0f2fe');
      sphereG.addColorStop(0.5, primaryHex);
      sphereG.addColorStop(1, '#082f49');
      ctx.fillStyle = sphereG;
      ctx.beginPath();
      ctx.arc(cx, cy, br, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(226,232,240,0.75)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, br * 1.45, br * 0.45, t * 0.4, 0, Math.PI * 2);
      ctx.stroke();

      // Spin vector arrow
      const vx = Math.sin(t * 0.9) * br * 1.3;
      const vy = -Math.cos(t * 0.65) * br * 1.3;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + vx, cy + vy);
      ctx.stroke();
    }

    ctx.restore();

    // Post-effects: color depth & defects & repair sweep & subpixel matrix when zoomed
    if (cur.colorDepth === 'GRAYSCALE_8BIT') {
      ctx.fillStyle = 'rgba(18,22,28,0.18)';
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    } else if (cur.colorDepth === 'MONOCHROME_1BIT') {
      ctx.fillStyle = 'rgba(12,18,24,0.35)';
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }

    if (cur.defectMode && cur.defectMode !== 'HEALTHY') {
      ctx.fillStyle =
        cur.defectMode === 'DEAD_PIXEL'
          ? '#000000'
          : cur.defectMode === 'STUCK_PIXEL'
            ? '#00ff77'
            : '#ffffff';
      for (let gx = 48; gx < w; gx += 131) {
        for (let gy = 48; gy < h; gy += 107) {
          ctx.fillRect(gx, gy, 3, 3);
        }
      }
    }

    if (repairSweep > 0.01) {
      const rx = (1 - repairSweep) * w;
      const beam = ctx.createLinearGradient(rx - 40, 0, rx + 40, 0);
      beam.addColorStop(0, 'rgba(56,189,248,0)');
      beam.addColorStop(0.5, 'rgba(34,211,238,0.55)');
      beam.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.fillStyle = beam;
      ctx.fillRect(rx - 40, 0, 80, h);
    }

    if (zoomCurrent > 1.4) {
      const pitch = Math.max(4, Math.round(zoomCurrent * 2.5));
      ctx.fillStyle = 'rgba(2,6,23,0.22)';
      for (let x = 0; x < w; x += pitch) {
        ctx.fillRect(x, 0, 1, h);
      }
    }
  };

  const animate = () => {
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

    const modeVal = resolveMode(cur.shape, cur.storyMold);
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
    } else {
      skippedFrames += 1;
    }

    drawFrame(
      t,
      modeVal,
      cur.storyPrimaryHex || cur.accentHex || '#38bdf8',
      cur.storySecondaryHex || '#f59e0b',
      coupled.brusCauchy.cauchyRefractiveIndex,
    );

    if (cur.onTelemetryUpdate && now - lastTelemetryPush > 450) {
      lastTelemetryPush = now;
      const physW = Math.round(canvasW * dpr);
      const physH = Math.round(canvasH * dpr);
      const subLayout = cur.subpixelLayout ?? 'RGB_STRIPE';
      const subMult = subLayout === 'RGBW' ? 4 : subLayout === 'PENTILE_DIAMOND' ? 2 : 3;
      cur.onTelemetryUpdate({
        tier,
        physicalCanvasWidth: physW,
        physicalCanvasHeight: physH,
        logicalCssWidth: canvasW,
        logicalCssHeight: canvasH,
        devicePixelRatio: dpr,
        physicalMeasuredBiopixels: physW * physH,
        subBiopixelTotalActive: tier.biopixels * subMult,
        subpixelLayout: subLayout,
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

    raf = requestAnimationFrame(animate);
  };

  raf = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointerleave', onPointerLeave);
    canvas.removeEventListener('wheel', onWheel);
  };
}
