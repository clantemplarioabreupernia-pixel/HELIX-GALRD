import { useEffect, useRef, useState } from 'react';
import { NemesisGovernor } from '../core/NemesisGovernor';

export type HologramShape = 'avatar' | 'torus' | 'satellite' | 'terrain' | 'crystal' | 'sphere' | 'wave';
export type LiquidMorphShape = HologramShape | 'orbital_ship' | 'terrain_fbm' | 'cymatic_wave' | 'quantum_bloch';

export interface LiquidBiopixelCanvasProps {
  shape?: LiquidMorphShape;
  accentColor?: string;
  accentHex?: string;
  energy?: number;
  tension?: number;
  title?: string;
  titleLabel?: string;
  subtitle?: string;
  subtitleLabel?: string;
  pulseCounter?: number;
  hlxScript?: string;
  hideOverlay?: boolean;
  isSpeaking?: boolean;
}

const VERT_SRC = `#version 300 es
in vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG_SRC = `#version 300 es
precision highp float;
uniform vec2 u_res; uniform float u_t, u_p33, u_mo, u_en, u_spk; uniform vec3 u_col; uniform int u_oc;
out vec4 O;

float h12(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float ns(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h12(i), h12(i + vec2(1.0, 0.0)), u.x), mix(h12(i + vec2(0.0, 1.0)), h12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float ter(vec2 xz, float a) {
  float h = 0.0, am = 2.15, fr = 0.16; mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 10; i++) {
    if (i >= u_oc) break;
    float n = 1.0 - abs(ns(xz * fr) * 2.0 - 1.0);
    h += n * n * am; xz = r * xz; fr *= 2.04; am *= 0.48;
  }
  return h * a - 1.35;
}
float cap(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)) - r;
}
vec3 map(vec3 p) {
  float a = smoothstep(0.0, 2.0, u_t);
  float kv = sin(p.z * 0.55 - u_t * 2.2) * (u_p33 / 5200.0) * u_en;
  float dt = p.y - ter(p.xz, a) + kv;
  vec3 q = p - vec3(sin(u_t * 0.25) * 1.4, 1.85 + sin(u_t * 2.0) * 0.14, u_t * 3.1 + 7.5);
  float sq = 1.0 + sin(u_t * 4.0) * 0.12; q.y *= sq; q.xz /= sqrt(sq);
    vec3 hq = p - vec3(0.0, 1.85, u_t * 3.1 + 6.4);
  float head = length(hq * vec3(1.2, 0.92, 1.05)) - 0.85;
  float eyeL = length(hq - vec3(-0.28, 0.15, -0.74)) - 0.11;
  float eyeR = length(hq - vec3( 0.28, 0.15, -0.74)) - 0.11;
  float mouth = length((hq - vec3(0.0, -0.32, -0.76)) * vec3(1.8, 1.0 / (0.04 + u_spk * 0.14), 2.0)) - 0.22;
  head = max(max(head, -eyeL), -max(eyeR, mouth));
  float dw = mix(dt, min(dt, head), clamp(u_mo + 0.65, 0.0, 1.0));
  float dObj = 100.0, id = 1.0, sub = 0.0;

  for (int i = 0; i < 7; i++) {
    float f = float(i);
    vec3 bp = vec3(sin(u_t * 0.65 + f * 1.5) * 3.3 + (f - 3.0) * 0.85, 2.05 + cos(u_t * 0.85 + f) * 0.5 + mod(f, 3.0) * 0.22, u_t * 3.1 + 6.8 + f * 1.35);
    vec3 bq = p - bp; float w = abs(bq.x);
    bq.y -= sin(u_t * 11.0 + f * 2.1) * 0.28 * smoothstep(0.04, 0.42, w);
    float body = length(bq * vec3(2.8, 3.2, 1.1)) - 0.13;
    float wing = length(max(abs(bq - vec3(0.0, 0.0, -0.03)) - vec3(0.44, 0.012, max(0.14 - w * 0.26, 0.004)), 0.0));
    float db = min(body, wing);
    if (db < dObj) { dObj = db; id = 2.0; sub = f; }
  }
  for (int j = 0; j < 4; j++) {
    float fj = float(j), gz = floor((u_t * 3.1 + 6.0) / 8.0) * 8.0 + fj * 5.5 + 4.0, gx = sin(fj * 2.3 + gz * 0.2) * 2.5;
    float gy = ter(vec2(gx, gz), a);
    if (gy > -0.7 && gy < 0.65) {
      vec3 gq = p - vec3(gx, gy + 0.16, gz);
      float dg = min(min(cap(gq, vec3(0.0, 0.0, -0.14), vec3(0.0, 0.0, 0.14), 0.09), cap(gq, vec3(0.0, 0.04, 0.14), vec3(0.0, 0.14, 0.24), 0.055)),
                 min(cap(gq, vec3(0.0, 0.16, 0.20), vec3(0.0, 0.26, 0.12), 0.015), min(cap(gq, vec3(-0.05, 0.0, -0.1), vec3(-0.05, -0.16, -0.1), 0.022), cap(gq, vec3(0.05, 0.0, 0.1), vec3(0.05, -0.16, 0.1), 0.022))));
      if (dg < dObj) { dObj = dg; id = 3.0; sub = fj; }
    }
  }
  return (dObj < dw) ? vec3(dObj, id, sub) : vec3(dw, 1.0, 0.0);
}
vec3 nrm(vec3 p) { vec2 e = vec2(0.012, 0.0); return normalize(vec3(map(p + e.xyy).x - map(p - e.xyy).x, map(p + e.yxy).x - map(p - e.yxy).x, map(p + e.yyx).x - map(p - e.yyx).x)); }
vec3 birdPal(float f) {
  int k = int(mod(f, 6.0));
  if (k == 0) return vec3(0.96, 0.18, 0.12); if (k == 1) return vec3(0.12, 0.56, 0.98); if (k == 2) return vec3(0.98, 0.78, 0.10);
  if (k == 3) return vec3(0.15, 0.86, 0.42); if (k == 4) return vec3(0.96, 0.42, 0.08); return vec3(0.78, 0.28, 0.96);
}
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float cz = u_t * 3.1, cx = sin(u_t * 0.25) * 2.0;
  vec3 ro = vec3(cx, 2.45, cz), ta = vec3(sin(u_t * 0.25 + 0.5) * 1.4, 1.15, cz + 6.5);
  vec3 fw = normalize(ta - ro), ri = normalize(cross(vec3(0.0, 1.0, 0.0), fw)), up = cross(fw, ri), rd = normalize(fw + uv.x * ri + uv.y * up);
  float t = 0.0, id = 0.0, sub = 0.0;
  for (int i = 0; i < 84; i++) { vec3 r = map(ro + rd * t); if (r.x < 0.006 * t || t > 58.0) { id = r.y; sub = r.z; break; } t += r.x * 0.72; }
  vec3 sd = normalize(vec3(0.55, 0.42, 0.72)); float sa = max(dot(rd, sd), 0.0);
  vec3 sky = mix(vec3(0.52, 0.74, 0.96), vec3(0.12, 0.26, 0.52), clamp(rd.y * 1.4, 0.0, 1.0)) + vec3(1.0, 0.82, 0.55) * pow(sa, 14.0) * 0.55, col = sky;
  if (t < 58.0) {
    vec3 p = ro + rd * t, n = nrm(p); float df = max(dot(n, sd), 0.0), am = 0.32 + 0.28 * n.y;
    if (id == 1.0) {
      float det = ns(p.xz * 18.0) * 0.5 + ns(p.xz * 42.0) * 0.25;
      vec3 grass = mix(vec3(0.08, 0.38, 0.12), vec3(0.24, 0.58, 0.16), det);
      vec3 rock = mix(vec3(0.25, 0.22, 0.19), vec3(0.46, 0.41, 0.36), det);
      float slope = smoothstep(0.48, 0.84, n.y);
      vec3 base = mix(rock, grass, smoothstep(0.22, -0.55, p.y) * slope);
      float snowM = smoothstep(0.28, 0.85, p.y + n.y * 0.38 + det * 0.15);
      base = mix(base, vec3(0.95, 0.98, 1.0), snowM);
      float ph = fract(p.y * 0.5 + u_p33 / 853.0);
      base += vec3(0.5 + 0.5 * cos(6.28 * ph), 0.5 + 0.5 * cos(6.28 * (ph + 0.33)), 0.5 + 0.5 * cos(6.28 * (ph + 0.67))) * snowM * 0.24;
      col = base * (df * vec3(1.0, 0.95, 0.86) + am * vec3(0.48, 0.66, 0.92));
    } else if (id == 2.0) {
      col = birdPal(sub) * (df * 1.25 + am * 0.65) + vec3(1.0) * pow(max(dot(reflect(rd, n), sd), 0.0), 10.0) * 0.35;
    } else {
      col = mix(vec3(0.88, 0.84, 0.76), vec3(0.38, 0.30, 0.24), ns(p.xz * 25.0)) * (df * 1.1 + am * 0.6);
    }
    col = mix(col, sky, 1.0 - exp(-t * 0.028));
  }
  O = vec4(pow(col, vec3(0.4545)), 1.0);
}`;

const P33 = new Int32Array([2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137]);
export function LiquidBiopixelCanvas({
  shape = 'terrain_fbm',
  energy = 0.5,
  hideOverlay = false,
}: LiquidBiopixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [octaves, setOctaves] = useState<number>(5);
  const [resScale, setResScale] = useState<number>(0.7);
  const [primeIdx, setPrimeIdx] = useState<number>(12);
  const [timeDir, setTimeDir] = useState<number>(1);
  const [simSeconds, setSimSeconds] = useState<number>(0);
  const [fps, setFps] = useState<number>(60);
  const [recording, setRecording] = useState<boolean>(false);

  const nemesisRef = useRef<NemesisGovernor>(new NemesisGovernor({ mode: 'STANDARD' }));
  const simTimeRef = useRef<number>(0);
  const dirRef = useRef<number>(1);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  dirRef.current = timeDir;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT_SRC));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uT = gl.getUniformLocation(prog, 'u_t');
    const uP33 = gl.getUniformLocation(prog, 'u_p33');
    const uMo = gl.getUniformLocation(prog, 'u_mo');
    const uEn = gl.getUniformLocation(prog, 'u_en');
    const uOc = gl.getUniformLocation(prog, 'u_oc');

    const resize = () => {
      canvas.width = Math.floor(canvas.clientWidth * resScale);
      canvas.height = Math.floor(canvas.clientHeight * resScale);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0, last = performance.now(), frames = 0, fpsMark = last;
    const isMorph = shape === 'sphere' || shape === 'quantum_bloch' || shape === 'crystal';

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      simTimeRef.current = Math.max(0, simTimeRef.current + dt * dirRef.current);
      const t = simTimeRef.current;
      const prime = P33[primeIdx % P33.length];
      const freqHz = 261.6256 * (prime / 16) * (1 - nemesisRef.current.gamma * 0.1);

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uT, t);
      gl.uniform1f(uP33, freqHz);
      gl.uniform1f(uMo, isMorph ? 1.0 : 0.0);
      gl.uniform1f(uEn, energy);
      gl.uniform1i(uOc, octaves);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      frames++;
      if (now - fpsMark >= 500) {
        setFps(Math.round((frames * 1000) / (now - fpsMark)));
        setSimSeconds(Number(t.toFixed(1)));
        frames = 0; fpsMark = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [shape, energy, octaves, resScale, primeIdx]);

  const toggleRecord = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (recRef.current && recRef.current.state === 'recording') {
      recRef.current.stop();
      setRecording(false);
      return;
    }
    chunksRef.current = [];
    const rec = new MediaRecorder(canvas.captureStream(30), { mimeType: 'video/webm' });
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(chunksRef.current, { type: 'video/webm' }));
      a.download = 'capitulo_helix.webm';
      a.click();
    };
    rec.start();
    recRef.current = rec;
    setRecording(true);
  };

  const btnCls = (active: boolean) => 'px-1.5 py-0.5 rounded border ' + (active ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'border-slate-700');

  return (
    <div className="relative w-full h-full bg-[#04060b] overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full block" />
      {!hideOverlay && (
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 rounded-lg px-3 py-1.5 text-[11px] font-mono text-cyan-200 shadow-lg">
          <span className="text-cyan-400 font-bold">HELIX Q-OMEGA</span>
          <span>| P33: p={P33[primeIdx % P33.length]} | {fps} FPS</span>
          <div className="flex items-center gap-1 ml-1">
            <button onClick={() => setTimeDir(-1)} className={btnCls(timeDir === -1)}>◀</button>
            <button onClick={() => setTimeDir(0)} className={btnCls(timeDir === 0)}>❚❚</button>
            <button onClick={() => setTimeDir(1)} className={btnCls(timeDir === 1)}>▶</button>
            <span className="ml-1 text-cyan-300">{simSeconds}s</span>
          </div>
          <select value={octaves} onChange={(e) => setOctaves(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-cyan-200">
            <option value={4}>4 Octavas (HP i5 Ligero)</option>
            <option value={5}>5 Octavas (HP i5 Óptimo)</option>
            <option value={8}>8 Octavas (Hiperrealismo)</option>
          </select>
          <select value={resScale} onChange={(e) => setResScale(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-cyan-200">
            <option value={0.55}>GPU 0.55x</option>
            <option value={0.70}>GPU 0.70x</option>
            <option value={1.00}>GPU 1.00x</option>
          </select>
          <button onClick={() => setPrimeIdx((p) => (p + 1) % P33.length)} className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 hover:bg-cyan-500 hover:text-slate-950">λ Cauchy</button>
          <button onClick={toggleRecord} className={'px-2 py-0.5 rounded border ' + (recording ? 'bg-rose-600 text-white border-rose-400' : 'border-rose-500/50 text-rose-300')}>
            {recording ? '■ Detener' : '● Grabar'}
          </button>
        </div>
      )}
    </div>
  );
}

export default LiquidBiopixelCanvas;




