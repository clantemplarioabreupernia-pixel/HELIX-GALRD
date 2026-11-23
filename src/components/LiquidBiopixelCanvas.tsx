import { HelixKinematics12Engine, FRAME_STRIDE } from '../core/helixKinematics12';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Pause, Play, Sparkles, Waves } from 'lucide-react';
import { INITIAL_COMPOUND_VOCABULARY } from '../data/vocabulary';
import { compileHelixScript } from '../utils/helixVm';
import {
  BiopixelSurfaceMetrics,
  BiopixelSurfaceState,
  createBiopixelSurfaceState,
  stepBiopixelSurfacePhysics,
  syncBiopixelSurfaceToOpcodes,
  triggerBiopixelOpcodePulse,
} from '../utils/helixBiopixelSurface';

export type LiquidMorphShape =
  | 'torus'
  | 'crystal'
  | 'orbital_ship'
  | 'quantum_bloch'
  | 'terrain_fbm'
  | 'cymatic_wave';

export const MORPH_SHAPE_LABELS: Record<LiquidMorphShape, string> = {
  torus: 'Toroide Dinámico',
  crystal: 'Cristal Facetado',
  orbital_ship: 'Nave / Satélite Orbital',
  quantum_bloch: 'Esfera Cuántica',
  terrain_fbm: 'Relieve Fractal',
  cymatic_wave: 'Cúpula Cimática',
};

interface LiquidBiopixelCanvasProps {
  hlxScript: string;
  shape: LiquidMorphShape;
  pulseCounter: number;
  titleLabel: string;
  subtitleLabel: string;
  accentHex?: string;
}

const COLS = 32;
const ROWS = 15;
const CELL_COUNT = COLS * ROWS;

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _expandColor = new THREE.Color(0x38bdf8);
const _contractColor = new THREE.Color(0xf59e0b);
const _normal = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

function computeShapePoint(
  shape: LiquidMorphShape,
  u: number,
  v: number,
  outPos: [number, number, number],
  outNorm: [number, number, number],
): void {
  const phi = u * Math.PI * 2; const tv = v * Math.PI * 2; const th = (0.12 + v * 0.76) * Math.PI; const PHI = 1.61803398875;
  const tx = (1.24 + 0.42 * Math.cos(tv)) * Math.cos(phi), ty = 0.42 * Math.sin(tv) * 0.92 + 1.12, tz = (1.24 + 0.42 * Math.cos(tv)) * Math.sin(phi);
  const facet = 1.0 + 0.14 * Math.abs(Math.cos(phi * PHI * 1.5)) * Math.sin(th * 3.0);
  const lobe = 0.85 + 0.42 * Math.pow(Math.cos(th), 2) + 0.14 * Math.cos(3 * phi) * Math.sin(th);
  const qRad = shape === 'crystal' ? 1.18 * facet : lobe;
  const qx = Math.sin(th) * Math.cos(phi) * qRad, qy = Math.cos(th) * qRad + 1.22, qz = Math.sin(th) * Math.sin(phi) * qRad;
  const wingEnv = Math.max(0.18, 1.0 - Math.abs(v - 0.35) * 0.95);
  const wing = v < 0.58 ? Math.pow(Math.abs(Math.sin(phi)), 0.7) * 1.15 * wingEnv : 0;
  const sx = Math.cos(phi) * (0.42 * Math.sin(Math.max(0.1, v) * Math.PI) + wing), sy = 1.15 + Math.sin(phi) * 0.24 * Math.sin(Math.max(0.1, v) * Math.PI), sz = (v - 0.5) * 2.5;
  const gx = (u - 0.5) * 2.9, gz = (v - 0.5) * 2.7;
  const fbm = 0.36 * Math.sin(gx * 1.9 + 0.4) * Math.cos(gz * 1.7 - 0.3) + 0.18 * Math.sin(gx * 3.7 - gz * 2.9);
  const wT = shape === 'torus' ? 0.68 : 0.10, wQ = (shape === 'quantum_bloch' || shape === 'crystal') ? 0.68 : 0.10, wS = shape === 'orbital_ship' ? 0.68 : 0.08, wF = shape === 'terrain_fbm' ? 0.68 : 0.04;
  if (shape === 'cymatic_wave') { outPos[0] = gx * 0.68 + tx * 0.32; outPos[1] = (0.95 + fbm) * 0.68 + ty * 0.32; outPos[2] = gz * 0.68 + tz * 0.32; }
  else { outPos[0] = tx * wT + qx * wQ + sx * wS + gx * wF; outPos[1] = ty * wT + qy * wQ + sy * wS + (0.92 + fbm) * wF + fbm * 0.16; outPos[2] = tz * wT + qz * wQ + sz * wS + gz * wF; }
  const normMag = Math.hypot(outPos[0], outPos[1] - 1.1, outPos[2]) || 1;
  outNorm[0] = outPos[0] / normMag; outNorm[1] = (outPos[1] - 1.1) / normMag; outNorm[2] = outPos[2] / normMag;
  return;
  // cymatic_wave (cúpula de ondas estacionarias Helmholtz)
  const rRing = 0.35 + v * 1.42;
  const waveY =
    0.92 +
    0.38 * Math.cos(rRing * 3.2) +
    0.16 * Math.sin(phi * 4.0) * Math.sin(v * Math.PI);
  const cx = rRing * Math.cos(phi);
  const cz = rRing * Math.sin(phi);
  outPos[0] = cx;
  outPos[1] = waveY;
  outPos[2] = cz;
  outNorm[0] = Math.cos(phi) * 0.28;
  outNorm[1] = 0.94;
  outNorm[2] = Math.sin(phi) * 0.28;
  const nLen = Math.hypot(outNorm[0], outNorm[1], outNorm[2]) || 1;
  outNorm[0] /= nLen;
  outNorm[1] /= nLen;
  outNorm[2] /= nLen;
}

function buildTargetBuffers(shape: LiquidMorphShape): {
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  nx: Float32Array;
  ny: Float32Array;
  nz: Float32Array;
} {
  const x = new Float32Array(CELL_COUNT);
  const y = new Float32Array(CELL_COUNT);
  const z = new Float32Array(CELL_COUNT);
  const nx = new Float32Array(CELL_COUNT);
  const ny = new Float32Array(CELL_COUNT);
  const nz = new Float32Array(CELL_COUNT);

  const p: [number, number, number] = [0, 0, 0];
  const n: [number, number, number] = [0, 1, 0];

  for (let row = 0; row < ROWS; row++) {
    const vNorm = ROWS > 1 ? row / (ROWS - 1) : 0.5;
    for (let col = 0; col < COLS; col++) {
      const i = row * COLS + col;
      const uNorm = col / COLS;
      computeShapePoint(shape, uNorm, vNorm, p, n);
      x[i] = p[0];
      y[i] = p[1];
      z[i] = p[2];
      nx[i] = n[0];
      ny[i] = n[1];
      nz[i] = n[2];
    }
  }
  return { x, y, z, nx, ny, nz };
}

function syncMeshFromSurface(
  mesh: THREE.InstancedMesh,
  state: BiopixelSurfaceState,
  accentColor: THREE.Color,
): void {
  const n = state.count;
  for (let i = 0; i < n; i++) {
    _dummy.position.set(state.posX[i], state.posY[i], state.posZ[i]);
    _normal
      .set(
        state.normX[i] + state.velX[i] * 0.28,
        state.normY[i] + state.velY[i] * 0.28,
        state.normZ[i] + state.velZ[i] * 0.28,
      )
      .normalize();
    _dummy.quaternion.setFromUnitVectors(_up, _normal);

    const s = state.strain[i];
    const radialScale = THREE.MathUtils.clamp(1.0 + Math.abs(s) * 0.55, 0.7, 1.75);
    const thicknessScale = THREE.MathUtils.clamp(1.0 + s * 0.95, 0.55, 2.0);
    _dummy.scale.set(radialScale, thicknessScale, radialScale);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);

    _color.setRGB(state.baseR[i], state.baseG[i], state.baseB[i]);
    _color.lerp(accentColor, 0.35);
    const blendAlpha = THREE.MathUtils.clamp(
      Math.abs(s) * 1.15 + state.vorticity[i] * 0.38,
      0,
      0.88,
    );
    _color.lerp(s >= 0 ? _expandColor : _contractColor, blendAlpha);
    mesh.setColorAt(i, _color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

export function LiquidBiopixelCanvas({
  hlxScript,
  shape,
  pulseCounter,
  titleLabel,
  subtitleLabel,
  accentHex = '#38bdf8',
}: LiquidBiopixelCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [paused, setPaused] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [metrics, setMetrics] = useState<BiopixelSurfaceMetrics | null>(null);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const wireframeRef = useRef(wireframe);
  wireframeRef.current = wireframe;

  const accentColorRef = useRef(new THREE.Color(accentHex));
  accentColorRef.current.set(accentHex);

  const surfaceRef = useRef<BiopixelSurfaceState | null>(null);
  if (!surfaceRef.current) {
    const initialInst = compileHelixScript(hlxScript, INITIAL_COMPOUND_VOCABULARY);
    surfaceRef.current = createBiopixelSurfaceState(initialInst, COLS, ROWS);
  }

  const targetShapeRef = useRef(buildTargetBuffers(shape));
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const matRef = useRef<THREE.MeshPhysicalMaterial | null>(null);

  // Sincronizar instrucciones .hlx + morfología destino + pulso cada vez que el chat produce un cambio
  useEffect(() => {
    const state = surfaceRef.current;
    if (!state) return;
    const compiled = compileHelixScript(hlxScript, INITIAL_COMPOUND_VOCABULARY);
    syncBiopixelSurfaceToOpcodes(state, compiled);
    targetShapeRef.current = buildTargetBuffers(shape);
    triggerBiopixelOpcodePulse(state, 1.35);
  }, [hlxScript, shape, pulseCounter]);

  useEffect(() => {
    if (matRef.current) {
      matRef.current.wireframe = wireframe;
    }
  }, [wireframe]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });

    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    const isSoftwareGl = /SwiftShader|llvmpipe|Software|Microsoft Basic Render/i.test(rendererStr);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    scene.fog = new THREE.FogExp2(0x070b14, 0.042);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const initW = Math.max(320, container.clientWidth || 640);
    const initH = Math.max(320, container.clientHeight || 480);
    renderer.setSize(initW, initH, false);

    const camera = new THREE.PerspectiveCamera(44, initW / initH, 0.1, 80);
    camera.position.set(3.2, 2.55, 3.85);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 1.12, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.065;
    controls.minDistance = 1.6;
    controls.maxDistance = 12;
    controls.update();

    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 1.15);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.5);
    keyLight.position.set(4.5, 6.8, 4.2);
    keyLight.castShadow = !isSoftwareGl;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.35);
    rimLight.position.set(-4.2, 3.0, -3.6);
    scene.add(rimLight);

    const floorGeo = new THREE.CircleGeometry(8.5, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0b1222,
      roughness: 0.9,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(10, 20, 0x1e293b, 0x0f172a);
    grid.position.y = 0.002;
    scene.add(grid);

    const bpGeo = new THREE.CylinderGeometry(0.052, 0.056, 0.036, 6);
    const bpMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.16,
      metalness: 0.12,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08,
      wireframe: wireframeRef.current,
    });
    matRef.current = bpMat;

    const stateInit = surfaceRef.current!;
    const bpMesh = new THREE.InstancedMesh(bpGeo, bpMat, stateInit.count);
    bpMesh.castShadow = !isSoftwareGl;
    bpMesh.receiveShadow = true;
    bpMesh.frustumCulled = false;
    bpMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(stateInit.count * 3),
      3,
    );
    meshRef.current = bpMesh;
    syncMeshFromSurface(bpMesh, stateInit, accentColorRef.current);
    scene.add(bpMesh);

    const ringGeo = new THREE.TorusGeometry(1.78, 0.018, 12, 72);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.85,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.025;
    scene.add(ring);

    // Raycaster para deformar la pantalla líquida directamente al hacer clic sobre ella
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const hitPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.1);
    const hitPoint = new THREE.Vector3();

    const handlePointerDown = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const st = surfaceRef.current;
      if (!st) return;

      const hits = raycaster.intersectObject(bpMesh, false);
      let impact: THREE.Vector3 | null = null;
      if (hits.length > 0) {
        impact = hits[0].point;
      } else if (raycaster.ray.intersectPlane(hitPlane, hitPoint)) {
        impact = hitPoint;
      }

      if (impact) {
        const localImpact = bpMesh.worldToLocal(impact.clone());
        st.excitationEnvelope = Math.max(st.excitationEnvelope, 1.45);
        for (let i = 0; i < st.count; i++) {
          const dx = st.posX[i] - localImpact.x;
          const dy = st.posY[i] - localImpact.y;
          const dz = st.posZ[i] - localImpact.z;
          const dSq = dx * dx + dy * dy + dz * dz;
          const falloff = Math.exp(-dSq * 1.9);
          if (falloff > 0.02) {
            st.strainVel[i] += falloff * 2.8;
            st.velX[i] += st.normX[i] * falloff * 0.75;
            st.velY[i] += st.normY[i] * falloff * 0.95;
            st.velZ[i] += st.normZ[i] * falloff * 0.75;
          }
        }
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);

    const resizeObserver = new ResizeObserver(() => {
      const w = Math.max(320, container.clientWidth);
      const h = Math.max(320, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    resizeObserver.observe(container);

    let rafId = 0;
    let lastTime = performance.now();
    let hudTick = 0;

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.032, Math.max(0.004, (now - lastTime) / 1000));
      lastTime = now;

      const st = surfaceRef.current;
      const target = targetShapeRef.current;
      if (st && !pausedRef.current) {
        // Interpolación fluida líquida hacia la morfología destino
        const morphAlpha = Math.min(1, dt * 4.2);
        for (let i = 0; i < st.count; i++) {
          st.restX[i] += (target.x[i] - st.restX[i]) * morphAlpha;
          st.restY[i] += (target.y[i] - st.restY[i]) * morphAlpha;
          st.restZ[i] += (target.z[i] - st.restZ[i]) * morphAlpha;
          st.normX[i] += (target.nx[i] - st.normX[i]) * morphAlpha;
          st.normY[i] += (target.ny[i] - st.normY[i]) * morphAlpha;
          st.normZ[i] += (target.nz[i] - st.normZ[i]) * morphAlpha;
        }
        const m = stepBiopixelSurfacePhysics(st, dt);
        syncMeshFromSurface(bpMesh, st, accentColorRef.current);
        bpMesh.rotation.y += dt * 0.14;
        hudTick += 1;
        if (hudTick % 8 === 0) {
          setMetrics(m);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      controls.dispose();
      bpGeo.dispose();
      bpMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, []);

  const handleManualPulse = () => {
    if (surfaceRef.current) {
      triggerBiopixelOpcodePulse(surfaceRef.current, 1.55);
    }
  };

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#070b14]">
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-grab active:cursor-grabbing"
      />

      {/* Overlay HUD superior izquierdo */}
      <div className="pointer-events-none absolute left-4 top-4 right-4 flex flex-wrap items-start justify-between gap-3">
        <div className="pointer-events-auto rounded-lg border border-slate-800/90 bg-slate-950/80 px-3.5 py-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
            <Waves className="h-3.5 w-3.5" />
            <span>{titleLabel}</span>
          </div>
          <div className="mt-0.5 text-xs text-slate-300">{subtitleLabel}</div>
          <div className="mt-1.5 font-mono text-[11px] text-slate-400 tabular-nums">
            {MORPH_SHAPE_LABELS[shape]} · {CELL_COUNT} biopíxeles · Re {metrics?.reynoldsNumber ?? '—'} · ∇·v{' '}
            {metrics ? metrics.maxCurlDivergence.toExponential(1) : '0.0e+0'}
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-slate-800/90 bg-slate-950/80 p-1.5 backdrop-blur-md">
          <button
            type="button"
            onClick={handleManualPulse}
            className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-sky-300 hover:bg-slate-800/80 whitespace-nowrap shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Pulso líquido
          </button>
          <button
            type="button"
            onClick={() => setWireframe((w) => !w)}
            className={`rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
              wireframe ? 'bg-sky-500/20 text-sky-300' : 'text-slate-300 hover:bg-slate-800/80'
            }`}
          >
            Malla
          </button>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800/80 whitespace-nowrap shrink-0"
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {paused ? 'Reanudar' : 'Pausar'}
          </button>
        </div>
      </div>

      {/* Pie informativo discreto de interacción física */}
      <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span className="rounded bg-slate-950/75 px-2.5 py-1 backdrop-blur-sm">
          Haz clic sobre la membrana líquida para deformarla · Arrastra para rotar 6-DoF
        </span>
        <span className="rounded bg-slate-950/75 px-2.5 py-1 font-mono tabular-nums backdrop-blur-sm">
          Tensión max {metrics ? metrics.maxStress.toFixed(2) : '0.00'} Pa · E=
          {metrics?.elasticityE ?? '18.0'} · η={metrics?.dampingEta ?? '5.4'}
        </span>
      </div>
    </div>
  );
}
