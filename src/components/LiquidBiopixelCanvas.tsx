import { useEffect, useRef } from 'react';
import { computeIgzoDrainCurrent, stepNemesisHomeostasis } from '../core/helixQuantumDisplayPhysics';

export type HologramShape = 'avatar' | 'torus' | 'satellite' | 'terrain' | 'crystal' | 'sphere' | 'wave';
export type LiquidMorphShape = HologramShape | 'orbital_ship' | 'terrain_fbm' | 'cymatic_wave' | 'quantum_bloch';

export interface LiquidBiopixelCanvasProps {
  shape?: LiquidMorphShape; accentColor?: string; accentHex?: string; energy?: number; tension?: number;
  title?: string; titleLabel?: string; subtitle?: string; subtitleLabel?: string;
  pulseCounter?: number; hlxScript?: string; hideOverlay?: boolean; isSpeaking?: boolean;
}

const VERT_SRC = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG_SRC = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform vec4 u_ptr;
uniform float u_t, u_p33, u_en, u_ten, u_spk, u_morph, u_igzo;
uniform int u_env;
uniform vec3 u_col;
out vec4 O;

vec4 hexLatticeA2(vec2 uv, float scale) {
  vec2 p = uv * scale;
  vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r * 0.5;
  vec2 a = mod(p, r) - h;
  vec2 b = mod(p - h, r) - h;
  vec2 gv = dot(a, a) < dot(b, b) ? a : b;
  return vec4(gv, (p - gv) / scale);
}

vec3 cie1931PhotonToRgb(float lambdaNm) {
  float t1 = (lambdaNm - 599.8) / (lambdaNm < 599.8 ? 37.9 : 31.0);
  float t2 = (lambdaNm - 442.0) / (lambdaNm < 442.0 ? 16.0 : 26.7);
  float t3 = (lambdaNm - 501.1) / (lambdaNm < 501.1 ? 20.4 : 26.2);
  float X = 1.056 * exp(-0.5 * t1 * t1) + 0.362 * exp(-0.5 * t2 * t2) - 0.065 * exp(-0.5 * t3 * t3);
  float u1 = (lambdaNm - 568.8) / (lambdaNm < 568.8 ? 46.9 : 40.5);
  float u2 = (lambdaNm - 530.9) / (lambdaNm < 530.9 ? 16.3 : 31.1);
  float Y = 0.821 * exp(-0.5 * u1 * u1) + 0.286 * exp(-0.5 * u2 * u2);
  float v1 = (lambdaNm - 437.0) / (lambdaNm < 437.0 ? 11.8 : 36.0);
  float v2 = (lambdaNm - 459.0) / (lambdaNm < 459.0 ? 26.0 : 13.8);
  float Z = 1.217 * exp(-0.5 * v1 * v1) + 0.681 * exp(-0.5 * v2 * v2);
  vec3 rgb = vec3(3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.2040 * Y + 1.0570 * Z);
  return clamp(rgb, 0.02, 1.0);
}
float sceneField(vec2 r0, float phi_p) {
  float k = 3.2 + mod(u_p33, 11.0) * 0.35;
  float viscous = sin(r0.x * k + u_t * 1.5 + phi_p) * cos(r0.y * k - u_t * 1.2 - phi_p) + 0.5 * cos(length(r0) * (4.0 + u_en * 3.0) - u_t * 2.2);
  float target = viscous;
  if (u_env == 0) {
    vec2 q = r0 * vec2(1.15, 0.92);
    float head = smoothstep(0.62, 0.15, length(q - vec2(0.0, 0.06)));
    float shoulders = smoothstep(0.75, 0.25, length((r0 - vec2(0.0, -0.68)) * vec2(0.55, 1.4)));
    vec2 sym = vec2(abs(r0.x), r0.y);
    float eyes = smoothstep(0.11, 0.03, length(sym - vec2(0.18, 0.14)));
    float mouthOpen = 0.02 + u_spk * (0.06 + 0.04 * abs(sin(u_t * 15.0 + u_p33 * 0.1)));
    float mouth = smoothstep(0.14, 0.03, length((r0 - vec2(0.0, -0.18)) * vec2(1.2, 0.05 / mouthOpen)));
    target = max(head, shoulders * 0.75) - eyes * 0.65 - mouth * 0.7 + eyes * 1.25;
  } else if (u_env == 1) {
    target = sin(r0.x * 2.8 + u_t * 0.8 + phi_p) * 0.6 + cos(r0.y * 4.5 - u_t * 1.6) * 0.45 - r0.y * 0.6;
  } else if (u_env == 2) {
    float d = length(r0);
    target = sin(d * (10.0 + mod(u_p33, 13.0)) - u_t * 4.2 + phi_p) * cos(atan(r0.y, r0.x) * (3.0 + mod(u_p33, 5.0)));
  } else {
    target = cos(r0.x * 6.0 + phi_p) * cos(r0.y * 6.0 - phi_p) + smoothstep(0.55, 0.1, abs(r0.x) + abs(r0.y));
  }
  return mix(viscous * 0.55, target, u_morph);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float phi_p = 6.2831853 * u_p33 / 137.0;
  vec2 dPtr = uv - u_ptr.xy;
  float distPtr = length(dPtr);
  float touchField = exp(-distPtr * distPtr * 9.5) * u_ptr.w;
  vec2 curlOffset = vec2(-dPtr.y, dPtr.x) * touchField * 0.22;
  vec4 hex = hexLatticeA2(uv + curlOffset, mix(56.0, 74.0, u_ten));
  vec2 r0 = hex.zw;
  float hVal = sceneField(r0, phi_p) + touchField * 0.85 * cos(distPtr * 24.0 - u_t * 8.0);
  vec2 deltaR = vec2(sin(u_t * 2.1 + r0.y * 5.0 + phi_p), cos(u_t * 1.8 + r0.x * 5.0 - phi_p)) * 0.07 * u_igzo;
  vec2 local = hex.xy + deltaR;
  float hexDist = max(abs(local.x), dot(abs(local), normalize(vec2(1.0, 1.7320508))));
  float facet = smoothstep(0.50, 0.34, hexDist);
  float rim = smoothstep(0.49, 0.44, hexDist) - smoothstep(0.44, 0.38, hexDist);
  float R_norm = clamp(0.50 - hVal * 0.34 + 0.14 * cos(2.399963 * u_p33 + length(r0) * 2.0), 0.05, 0.98);
  float E_brus = 1.74 + 1.12 / (0.36 + R_norm * R_norm * 1.45) - 0.14 / (0.45 + R_norm);
  float lambdaNm = clamp(1239.84 / E_brus + 22.0 * (hexDist - 0.25), 435.0, 670.0);
  vec3 matColor = mix(cie1931PhotonToRgb(lambdaNm), u_col, 0.44);
  float spec = pow(clamp(0.5 + hVal * 0.55 + touchField * 0.4, 0.0, 1.0), 3.0);
  vec3 col = matColor * (0.28 + max(0.0, hVal) * 0.95 + u_igzo * 0.25) * (0.85 + 0.15 * facet) + vec3(1.0, 0.97, 0.92) * spec * 0.45 + matColor * rim * 0.22;
  O = vec4(pow(max(col, 0.0), vec3(0.88)), 1.0);
}`;

export function LiquidBiopixelCanvas({ shape = 'avatar', accentColor, accentHex, energy = 0.45, tension = 0.3, title, titleLabel, subtitle, subtitleLabel, pulseCounter = 0, hideOverlay = false, isSpeaking = false }: LiquidBiopixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const morphRef = useRef(0.0);
  const ptrRef = useRef({ x: 0, y: 0, down: 0, tension: 0 });
  const prevEnergyRef = useRef(-1.0);
  const stRef = useRef({ shape, hex: accentHex || accentColor || '#f59e0b', energy, tension, pulseCounter, isSpeaking });
  stRef.current = { shape, hex: accentHex || accentColor || '#f59e0b', energy, tension, pulseCounter, isSpeaking };

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const gl = c.getContext('webgl2'); if (!gl) return;
    const sh = (t: number, s: string) => { const o = gl.createShader(t)!; gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT_SRC)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(p); gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(p, n);
    const onMove = (e: PointerEvent) => {
      const rect = c.getBoundingClientRect();
      ptrRef.current.x = ((e.clientX - rect.left) - 0.5 * rect.width) / rect.height;
      ptrRef.current.y = -((e.clientY - rect.top) - 0.5 * rect.height) / rect.height;
      ptrRef.current.tension = stepNemesisHomeostasis(ptrRef.current.tension, 0.28, 0.04);
    };
    const onDown = (e: PointerEvent) => { ptrRef.current.down = 1; onMove(e); ptrRef.current.tension = 1.0; };
    const onUp = () => { ptrRef.current.down = 0; };
    c.addEventListener('pointermove', onMove); c.addEventListener('pointerdown', onDown); window.addEventListener('pointerup', onUp);
    let raf = 0; const t0 = performance.now();
    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(c.clientWidth * dpr), h = Math.floor(c.clientHeight * dpr);
      const resized = c.width !== w || c.height !== h;
      if (resized) { c.width = w; c.height = h; }
      ptrRef.current.tension = stepNemesisHomeostasis(ptrRef.current.tension, ptrRef.current.down ? 0.05 : 0.0, 0.075);
      const s = stRef.current;
      const target = s.isSpeaking || s.energy > 0.55 || s.tension > 0.45 ? 1.0 : 0.0;
      morphRef.current += (target - morphRef.current) * (target > morphRef.current ? 0.06 : 0.025);
      const delta = Math.abs(s.energy - prevEnergyRef.current) + ptrRef.current.tension;
      if (!resized && delta < 0.0005 && !s.isSpeaking && morphRef.current < 0.01) { raf = requestAnimationFrame(render); return; }
      prevEnergyRef.current = s.energy;
      const igzo = computeIgzoDrainCurrent(0.65 + s.energy * 1.45 + ptrRef.current.tension * 0.6, 2.5);
      gl.viewport(0, 0, w, h);
      const env = s.shape === 'terrain' || s.shape === 'terrain_fbm' ? 1 : s.shape === 'cymatic_wave' || s.shape === 'wave' || s.shape === 'sphere' || s.shape === 'quantum_bloch' ? 2 : s.shape === 'crystal' || s.shape === 'torus' || s.shape === 'satellite' || s.shape === 'orbital_ship' ? 3 : 0;
      const hex = parseInt(s.hex.replace('#', ''), 16) || 0xf59e0b;
      gl.uniform2f(u('u_res'), w, h); gl.uniform4f(u('u_ptr'), ptrRef.current.x, ptrRef.current.y, ptrRef.current.down, ptrRef.current.tension);
      gl.uniform1f(u('u_t'), (performance.now() - t0) * 0.001); gl.uniform1f(u('u_p33'), Math.max(2, s.pulseCounter));
      gl.uniform1f(u('u_en'), s.energy); gl.uniform1f(u('u_ten'), s.tension); gl.uniform1f(u('u_spk'), s.isSpeaking ? 1.0 : 0.0);
      gl.uniform1f(u('u_morph'), morphRef.current); gl.uniform1f(u('u_igzo'), Math.min(1.5, igzo.currentAmps * 45000));
      gl.uniform1i(u('u_env'), env); gl.uniform3f(u('u_col'), ((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(raf); c.removeEventListener('pointermove', onMove); c.removeEventListener('pointerdown', onDown); window.removeEventListener('pointerup', onUp); };
  }, []);

  const dTitle = title ?? titleLabel, dSub = subtitle ?? subtitleLabel;
  return (
    <div className="relative w-full h-full overflow-hidden bg-[#05080f]">
      <canvas ref={canvasRef} className="block w-full h-full touch-none cursor-crosshair" />
      {!hideOverlay && (dTitle || dSub) && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-col gap-0.5 rounded-xl bg-[#05080f]/75 px-3.5 py-2 backdrop-blur-md border border-amber-500/20">
          {dTitle && <span className="font-nordic text-xs font-bold tracking-wider uppercase text-amber-400">{dTitle}</span>}
          {dSub && <span className="text-xs text-slate-200 line-clamp-2">{dSub}</span>}
        </div>
      )}
    </div>
  );
}
