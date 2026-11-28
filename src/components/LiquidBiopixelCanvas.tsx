import { useEffect, useRef } from 'react';
import {
  computeCoupledNanotechBiopixelState,
  computeIgzoDrainCurrent,
  stepNemesisHomeostasis,
} from '../core/helixQuantumDisplayPhysics';

export type HologramShape = 'avatar' | 'torus' | 'satellite' | 'terrain' | 'crystal' | 'sphere' | 'wave' | 'chemistry_molecule';
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
uniform float u_t, u_p33, u_en, u_ten, u_spk, u_morph, u_igzo, u_wsActive;
uniform int u_env;
uniform vec3 u_col;
uniform sampler2D u_wsTex;
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

float fbmRidge(float x) {
  return sin(x * 1.6) * 0.16 + sin(x * 3.7 + 1.2) * 0.08 + cos(x * 7.3 - 0.5) * 0.035 + abs(sin(x * 2.3)) * 0.09;
}

float drawFlock(vec2 uv, float t, float cauchyWave) {
  float flock = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float speed = 0.22 + mod(fi * 0.05, 0.14);
    float bx = mod(uv.x + 1.1 - t * speed + fi * 0.34, 2.2) - 1.1;
    float baseY = 0.14 + mod(fi * 0.065, 0.22) + sin(t * 1.3 + fi * 1.9) * 0.035 + cauchyWave * 0.08;
    float by = uv.y - baseY;
    float scale = 1.0 + mod(fi, 3.0) * 0.25;
    vec2 p = vec2(bx, by) * scale;
    float wingSpan = 0.055;
    float flap = sin(t * (7.0 + fi * 1.1) + fi) * 0.022;
    float wingCurve = abs(p.x) * (0.45 + flap * 12.0) - (p.x * p.x) * 4.5;
    float distWing = abs(p.y - wingCurve);
    float maskSpan = smoothstep(wingSpan, wingSpan * 0.35, abs(p.x));
    float bird = smoothstep(0.0065, 0.0015, distWing) * maskSpan;
    flock = max(flock, bird);
  }
  return flock;
}

float sceneField(vec2 r0, float phi_p, float wsHeight) {
  float k = 3.2 + mod(u_p33, 11.0) * 0.35;
  float viscous = sin(r0.x * k + u_t * 1.5 + phi_p) * cos(r0.y * k - u_t * 1.2 - phi_p) + 0.5 * cos(length(r0) * (4.0 + u_en * 3.0) - u_t * 2.2);
  viscous += wsHeight * 0.65;
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
  } else if (u_env == 2) {
    float d = length(r0);
    target = sin(d * (10.0 + mod(u_p33, 13.0)) - u_t * 4.2 + phi_p) * cos(atan(r0.y, r0.x) * (3.0 + mod(u_p33, 5.0))) + wsHeight * 0.8;
  } else if (u_env == 4) {
    float atom1 = smoothstep(0.32, 0.06, length(r0 - vec2(-0.34, 0.0)));
    float atom2 = smoothstep(0.32, 0.06, length(r0 - vec2(0.34, 0.0)));
    float atomTop = smoothstep(0.24, 0.05, length(r0 - vec2(0.0, 0.38)));
    float bond = smoothstep(0.11, 0.01, abs(r0.y)) * step(abs(r0.x), 0.36);
    target = max(max(atom1, atom2), max(atomTop, bond * 0.8));
  } else {
    target = cos(r0.x * 6.0 + phi_p) * cos(r0.y * 6.0 - phi_p) + smoothstep(0.55, 0.1, abs(r0.x) + abs(r0.y)) + wsHeight * 0.7;
  }
  return mix(viscous * 0.55, target, u_morph);
}
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  vec2 texUv = clamp(gl_FragCoord.xy / u_res, 0.0, 1.0);
  vec4 wsSample = texture(u_wsTex, texUv);
  float wsHeight = (wsSample.a - 0.5) * 2.0 * u_wsActive;

  float phi_p = 6.2831853 * u_p33 / 137.0;
  vec2 dPtr = uv - u_ptr.xy;
  float distPtr = length(dPtr);
  float touchField = exp(-distPtr * distPtr * 9.5) * u_ptr.w;
  float cauchyRipple = sin(uv.x * 9.0 - u_t * 3.2) * cos(uv.y * 7.0 + u_t * 2.4) * (0.018 + u_en * 0.035 + touchField * 0.06) + wsHeight * 0.05;

  vec4 hex = hexLatticeA2(uv + vec2(cauchyRipple * 0.35, -cauchyRipple * 0.35), mix(64.0, 88.0, u_ten));
  vec2 local = hex.xy;
  float hexDist = max(abs(local.x), dot(abs(local), normalize(vec2(1.0, 1.7320508))));
  float biopixelCell = 0.88 + 0.12 * smoothstep(0.49, 0.30, hexDist);

  if (u_env == 1) {
    vec2 p = uv + vec2(0.0, cauchyRipple * 0.45);
    float skyGrad = clamp(p.y + 0.45, 0.0, 1.0);
    vec3 skyTop = mix(vec3(0.03, 0.07, 0.18), cie1931PhotonToRgb(465.0), 0.35);
    vec3 skyHorizon = mix(vec3(0.08, 0.24, 0.42), u_col, 0.48);
    vec3 col = mix(skyHorizon, skyTop, pow(max(skyGrad, 0.0001), 0.75));

    float sunDist = length(p - vec2(-0.32, 0.16));
    col += mix(vec3(0.95, 0.65, 0.25), u_col, 0.4) * exp(-sunDist * sunDist * 14.0) * (0.55 + u_en * 0.35);

    float hFar = fbmRidge(p.x * 1.1 + u_t * 0.04) + 0.04 + cauchyRipple * 0.6;
    col = mix(col, mix(skyHorizon, vec3(0.07, 0.16, 0.30), 0.68), smoothstep(0.008, -0.008, p.y - hFar));

    float hMid = fbmRidge(p.x * 1.65 - u_t * 0.07 + 2.4) - 0.09 + cauchyRipple * 1.1;
    float rimMid = smoothstep(0.016, 0.0, abs(p.y - hMid));
    vec3 colMid = mix(vec3(0.04, 0.10, 0.20), u_col * 0.45, 0.42 + 0.25 * sin(p.x * 4.0 + u_t));
    col = mix(col, colMid, smoothstep(0.007, -0.007, p.y - hMid));
    col += mix(cie1931PhotonToRgb(532.0), u_col, 0.5) * rimMid * (0.45 + u_en * 0.4);

    float hFront = fbmRidge(p.x * 2.3 + u_t * 0.11 + 5.1) - 0.24 + cauchyRipple * 1.5;
    float rimFront = smoothstep(0.014, 0.0, abs(p.y - hFront));
    vec3 colFront = vec3(0.02, 0.05, 0.11) + u_col * 0.12 * clamp(0.5 + cauchyRipple * 8.0, 0.0, 1.0);
    col = mix(col, colFront, smoothstep(0.006, -0.006, p.y - hFront));
    col += vec3(0.45, 0.85, 1.0) * rimFront * 0.38;

    float aves = drawFlock(uv, u_t, cauchyRipple);
    vec3 colorAves = mix(vec3(0.95, 0.98, 1.0), cie1931PhotonToRgb(480.0), 0.35);
    col = mix(col, colorAves, aves * 0.95) + u_col * aves * 0.35;

    col = mix(col, col * biopixelCell + wsSample.rgb * 0.18 * u_wsActive, 0.85);
    col += u_col * touchField * 0.35 * cos(distPtr * 26.0 - u_t * 8.0);
    O = vec4(pow(max(col, vec3(0.0001)), vec3(0.92)), 1.0);
    return;
  }

  vec2 r0 = hex.zw;
  float hVal = sceneField(r0, phi_p, wsHeight) + touchField * 0.85 * cos(distPtr * 24.0 - u_t * 8.0);
  float facet = smoothstep(0.50, 0.34, hexDist);
  float rim = smoothstep(0.49, 0.44, hexDist) - smoothstep(0.44, 0.38, hexDist);
  float R_norm = clamp(0.50 - hVal * 0.34 + 0.14 * cos(2.399963 * u_p33 + length(r0) * 2.0), 0.05, 0.98);
  float E_brus = 1.74 + 1.12 / (0.36 + R_norm * R_norm * 1.45) - 0.14 / (0.45 + R_norm);
  float lambdaNm = clamp(1239.84 / E_brus + 22.0 * (hexDist - 0.25), 435.0, 670.0);

  vec3 quantumColor = mix(cie1931PhotonToRgb(lambdaNm), wsSample.rgb, u_wsActive * 0.58);
  vec3 matColor = mix(quantumColor, u_col, 0.38);
  float spec = pow(clamp(0.5 + hVal * 0.55 + touchField * 0.4, 0.0001, 1.0), 3.0);
  vec3 col = matColor * (0.28 + max(0.0, hVal) * 0.95 + u_igzo * 0.25) * (0.85 + 0.15 * facet) + vec3(1.0, 0.97, 0.92) * spec * 0.45 + matColor * rim * 0.22;
  O = vec4(pow(max(col, vec3(0.0001)), vec3(0.88)), 1.0);
}`;
export function LiquidBiopixelCanvas({ shape = 'terrain', accentColor, accentHex, energy = 0.45, tension = 0.3, title, titleLabel, subtitle, subtitleLabel, pulseCounter = 0, hideOverlay = false, isSpeaking = false }: LiquidBiopixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const morphRef = useRef(0.0);
  const ptrRef = useRef({ x: 0, y: 0, down: 0, tension: 0 });
  const prevEnergyRef = useRef(-1.0);
  const stRef = useRef({ shape, hex: accentHex || accentColor || '#38bdf8', energy, tension, pulseCounter, isSpeaking });
  stRef.current = { shape, hex: accentHex || accentColor || '#38bdf8', energy, tension, pulseCounter, isSpeaking };

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

    const wsTexData = new Uint8Array(64 * 40 * 4);
    const wsTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, wsTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 64, 40, 0, gl.RGBA, gl.UNSIGNED_BYTE, wsTexData);

    let wsActive = 0.0;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('ws://localhost:8090/ws');
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => { wsActive = 1.0; };
      ws.onclose = () => { wsActive = 0.0; };
      ws.onerror = () => { wsActive = 0.0; };
      ws.onmessage = (evt) => {
        const raw = new Uint8Array(evt.data);
        if (raw.length < 64 * 40 * 6) return;
        for (let i = 0; i < 64 * 40; i++) {
          const src = i * 6, dst = i * 4;
          wsTexData[dst + 0] = raw[src + 0];
          wsTexData[dst + 1] = raw[src + 1];
          wsTexData[dst + 2] = raw[src + 2];
          wsTexData[dst + 3] = raw[src + 4];
        }
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, wsTex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 64, 40, gl.RGBA, gl.UNSIGNED_BYTE, wsTexData);
      };
    } catch { wsActive = 0.0; }

    const onMove = (e: PointerEvent) => {
      const rect = c.getBoundingClientRect();
      ptrRef.current.x = ((e.clientX - rect.left) - 0.5 * rect.width) / rect.height;
      ptrRef.current.y = -((e.clientY - rect.top) - 0.5 * rect.height) / rect.height;
      ptrRef.current.tension = stepNemesisHomeostasis(ptrRef.current.tension, 0.28, 0.04);
    };
    const onDown = (e: PointerEvent) => {
      ptrRef.current.down = 1; onMove(e); ptrRef.current.tension = 1.0;
      if (ws && ws.readyState === WebSocket.OPEN) ws.send('P:1400');
    };
    const onUp = () => { ptrRef.current.down = 0; };
    c.addEventListener('pointermove', onMove); c.addEventListener('pointerdown', onDown); window.addEventListener('pointerup', onUp);

    let raf = 0; const t0 = performance.now(); let lastSync = 0;
    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(c.clientWidth * dpr), h = Math.floor(c.clientHeight * dpr);
      const resized = c.width !== w || c.height !== h;
      if (resized) { c.width = w; c.height = h; }
      ptrRef.current.tension = stepNemesisHomeostasis(ptrRef.current.tension, ptrRef.current.down ? 0.05 : 0.0, 0.075);
      const s = stRef.current;

      const coupled = computeCoupledNanotechBiopixelState({
        tension: Math.min(1, s.tension + ptrRef.current.tension * 0.5),
        primeIndex: Math.max(0, s.pulseCounter) % 33,
      });

      const now = performance.now();
      if (ws && ws.readyState === WebSocket.OPEN && now - lastSync > 100) {
        lastSync = now;
        const freq = Math.round(70 + s.energy * 340);
        const amp = Math.round(150 + (s.isSpeaking ? 950 : s.energy * 750));
        ws.send(`F:${freq}|A:${amp}|E:${coupled.cauchyElasticityGo}|V:${coupled.nemesisViscosityGo}`);
      }

      const target = s.isSpeaking || s.energy > 0.55 || s.tension > 0.45 ? 1.0 : 0.0;
      morphRef.current += (target - morphRef.current) * (target > morphRef.current ? 0.06 : 0.025);
      const env =
        s.shape === 'chemistry_molecule'
          ? 4
          : s.shape === 'terrain' || s.shape === 'terrain_fbm'
            ? 1
            : s.shape === 'cymatic_wave' || s.shape === 'wave' || s.shape === 'sphere' || s.shape === 'quantum_bloch'
              ? 2
              : s.shape === 'crystal' || s.shape === 'torus' || s.shape === 'satellite' || s.shape === 'orbital_ship'
                ? 3
                : 0;

      const delta = Math.abs(s.energy - prevEnergyRef.current) + ptrRef.current.tension + wsActive;
      if (!resized && env !== 1 && delta < 0.0005 && !s.isSpeaking && morphRef.current < 0.01) {
        raf = requestAnimationFrame(render); return;
      }
      prevEnergyRef.current = s.energy;
      const igzo = computeIgzoDrainCurrent(0.65 + s.energy * 1.45 + ptrRef.current.tension * 0.6, 2.5);
      gl.viewport(0, 0, w, h);
      const hex = parseInt(s.hex.replace('#', ''), 16) || 0x38bdf8;
      gl.uniform2f(u('u_res'), w, h); gl.uniform4f(u('u_ptr'), ptrRef.current.x, ptrRef.current.y, ptrRef.current.down, ptrRef.current.tension);
      gl.uniform1f(u('u_t'), (now - t0) * 0.001); gl.uniform1f(u('u_p33'), Math.max(2, s.pulseCounter));
      gl.uniform1f(u('u_en'), s.energy); gl.uniform1f(u('u_ten'), s.tension); gl.uniform1f(u('u_spk'), s.isSpeaking ? 1.0 : 0.0);
      gl.uniform1f(u('u_morph'), morphRef.current); gl.uniform1f(u('u_igzo'), Math.min(1.5, igzo.currentAmps * 45000));
      gl.uniform1f(u('u_wsActive'), wsActive); gl.uniform1i(u('u_wsTex'), 0);
      gl.uniform1i(u('u_env'), env); gl.uniform3f(u('u_col'), ((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      if (ws) ws.close();
      c.removeEventListener('pointermove', onMove); c.removeEventListener('pointerdown', onDown); window.removeEventListener('pointerup', onUp);
    };
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
