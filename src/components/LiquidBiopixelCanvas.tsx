import { useEffect, useRef } from 'react';

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
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG_SRC = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_t, u_p33, u_en, u_ten, u_spk, u_morph;
uniform int u_env;
uniform vec3 u_col;
out vec4 O;

// Retícula hexagonal A2 (distorsión de celda hexagonal racional)
float hexGridA2(vec2 p) {
  vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r * 0.5;
  vec2 a = mod(p, r) - h;
  vec2 b = mod(p - h, r) - h;
  vec2 gv = dot(a, a) < dot(b, b) ? a : b;
  float d = max(abs(gv.x), dot(abs(gv), normalize(r)));
  return smoothstep(0.42, 0.49, d);
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float cap(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)) - r;
}

// Estado base viscoso con fase rúnica phi_p = 2*pi*p / 137
float sdViscousA2(vec3 p) {
  float phi_p = 6.2831853 * u_p33 / 137.0;
  float k = 2.4 + mod(u_p33, 11.0) * 0.28;
  float wave = sin(p.x * k + u_t * 1.6 + phi_p) * cos(p.y * k - u_t * 1.3 - phi_p) * sin(p.z * k + u_t * 1.4);
  float b1 = length(p - vec3(sin(u_t * 0.7) * 0.35, cos(u_t * 0.5) * 0.25, 0.0)) - 1.15;
  float b2 = length(p + vec3(cos(u_t * 0.6) * 0.4, sin(u_t * 0.8) * 0.3, 0.1)) - 0.95;
  return smin(b1, b2, 0.65) + wave * (0.12 + u_en * 0.22);
}

float sdActorSculpt(vec3 p) {
  float yaw = sin(u_t * 0.5) * 0.16;
  p.xz = mat2(cos(yaw), -sin(yaw), sin(yaw), cos(yaw)) * p.xz;
  float head = smin(length((p - vec3(0.0, 0.18, 0.0)) * vec3(1.18, 0.92, 1.02)) - 0.86, length((p - vec3(0.0, -0.34, 0.12)) * vec3(1.42, 1.05, 1.18)) - 0.62, 0.28);
  head = smin(head, smin(cap(p, vec3(0.0, -0.62, -0.05), vec3(0.0, -1.45, -0.10), 0.33), length((p - vec3(0.0, -1.65, -0.10)) * vec3(0.46, 1.35, 1.25)) - 0.78, 0.25), 0.22);
  vec3 symP = vec3(abs(p.x), p.y, p.z);
  head = smin(smin(head, cap(p, vec3(0.0, 0.14, 0.75), vec3(0.0, -0.10, 0.93), 0.072), 0.11), length(symP - vec3(0.35, -0.04, 0.65)) - 0.21, 0.18);
  head = max(head, -(length((symP - vec3(0.30, 0.16, 0.71)) * vec3(0.85, 1.25, 1.0)) - 0.15) * 0.75);
  float mOpen = 0.015 + u_spk * (0.07 + 0.05 * abs(sin(u_t * 14.0 + u_p33 * 0.1)));
  return max(head, -(length((p - vec3(0.0, -0.36, 0.76)) * vec3(1.9, 1.0 / mOpen, 2.2)) - 0.23) * 0.65);
}

float sdFjordEnv(vec3 p) {
  float phi_p = 6.2831853 * u_p33 / 137.0;
  float ridge = sin(p.x * 1.6 + u_t * 0.4 + phi_p) * cos(p.z * 1.4 - u_t * 0.8) * 0.65 + sin(p.x * 3.8 - p.z * 2.9) * 0.22;
  return smin(p.y + 0.65 - ridge, length(max(abs(p - vec3(0.0, 0.15, -0.5)) - vec3(0.38, 1.15, 0.16), 0.0)) - 0.08, 0.35);
}

float sdStageCymatic(vec3 p) {
  float phi_p = 6.2831853 * u_p33 / 137.0;
  float k = 4.0 + mod(u_p33, 9.0);
  float orb = length(p) - (0.95 + sin(p.x * k + u_t * 3.0 + phi_p) * sin(p.y * k - u_t * 2.5) * cos(p.z * k) * (0.16 + u_en * 0.25));
  return smin(orb, min(length(vec2(length(p.xz) - 1.55, p.y)) - 0.05, length(vec2(length(p.xy) - 1.55, p.z)) - 0.05), 0.22);
}

float sdMeadHallEnv(vec3 p) {
  vec3 q = vec3(abs(p.x), p.y, p.z);
  float arch = min(cap(q, vec3(1.15, -1.5, -0.4), vec3(1.15, 1.6, -0.4), 0.18), length(vec2(length(p.xy - vec2(0.0, 0.35)) - 1.22, p.z + 0.4)) - 0.14);
  return smin(arch, dot(abs(p), normalize(vec3(1.0, 1.3, 1.0))) - 0.72, 0.28);
}

vec2 map(vec3 p) {
  float dV = sdViscousA2(p);
  float dT = u_env == 0 ? sdActorSculpt(p) : u_env == 1 ? sdFjordEnv(p) : u_env == 2 ? sdStageCymatic(p) : sdMeadHallEnv(p);
  float dF = smin(mix(dV, dT, u_morph), length(p - vec3(sin(u_t * 1.9) * 1.45, cos(u_t * 1.5) * 0.95, sin(u_t * 1.2) * 0.5)) - (0.14 + u_en * 0.08), 0.38);
  if (u_env == 0 && u_morph > 0.55) {
    float dE = length(vec3(abs(p.x), p.y, p.z) - vec3(0.30, 0.16, 0.75)) - 0.065;
    if (dE < dF) return vec2(dE, 2.0);
  }
  return vec2(dF, 1.0);
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.004, 0.0);
  return normalize(vec3(map(p + e.xyy).x - map(p - e.xyy).x, map(p + e.yxy).x - map(p - e.yxy).x, map(p + e.yyx).x - map(p - e.yyx).x));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  vec3 ro = vec3(0.0, 0.05, mix(3.45, 2.65, u_ten * u_morph)), rd = normalize(vec3(uv, -1.45));
  float t = 0.0, id = -1.0;
  for (int i = 0; i < 84; i++) {
    vec2 h = map(ro + rd * t);
    if (h.x < 0.003) { id = h.y; break; }
    t += h.x * 0.85;
    if (t > 24.0) break;
  }

  // Cromatismo acusto-óptico modulado por Ángulo Áureo (theta_g = 2.399963 rad)
  float goldenMod = 1.0 + 0.22 * cos(2.399963 * u_p33);
  vec3 runeTint = clamp(u_col * goldenMod, 0.05, 1.0);
  vec3 col = mix(vec3(0.015, 0.025, 0.055), runeTint * 0.14, 0.45 - uv.y * 0.4);

  if (id >= 0.0) {
    vec3 pos = ro + rd * t, n = calcNormal(pos), l1 = normalize(vec3(0.65, 0.85, 0.75));
    float diff = max(dot(n, l1), 0.0), fres = pow(1.0 - max(dot(n, -rd), 0.0), 2.8);
    // Retícula hexagonal A2 de biopíxeles sobre la superficie
    float a2Cell = 1.0 - 0.16 * hexGridA2(pos.xy * 26.0);
    col = id == 2.0 ? mix(vec3(1.0, 0.96, 0.88), runeTint, 0.35) * (1.6 + u_en)
      : mix(vec3(0.08, 0.16, 0.28), runeTint, 0.62) * (0.22 + diff * 0.85) * a2Cell + runeTint * fres * (1.35 + (1.0 - u_morph) * 0.45);
  }
  O = vec4(pow(max(col * (1.0 - 0.30 * dot(uv, uv)), 0.0), vec3(0.86)), 1.0);
}`;

export function LiquidBiopixelCanvas({ shape = 'avatar', accentColor, accentHex, energy = 0.45, tension = 0.3, title, titleLabel, subtitle, subtitleLabel, pulseCounter = 0, hideOverlay = false, isSpeaking = false }: LiquidBiopixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const morphRef = useRef(0.0);
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
    let raf = 0; const t0 = performance.now();
    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(c.clientWidth * dpr), h = Math.floor(c.clientHeight * dpr);
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      gl.viewport(0, 0, w, h);
      const s = stRef.current;
      const target = s.isSpeaking || s.energy > 0.55 || s.tension > 0.45 ? 1.0 : 0.0;
      morphRef.current += (target - morphRef.current) * (target > morphRef.current ? 0.055 : 0.022);
      const env = s.shape === 'terrain' || s.shape === 'terrain_fbm' ? 1 : s.shape === 'cymatic_wave' || s.shape === 'wave' || s.shape === 'sphere' || s.shape === 'quantum_bloch' ? 2 : s.shape === 'crystal' || s.shape === 'torus' || s.shape === 'satellite' || s.shape === 'orbital_ship' ? 3 : 0;
      const hex = parseInt(s.hex.replace('#', ''), 16) || 0xf59e0b;
      gl.uniform2f(u('u_res'), w, h); gl.uniform1f(u('u_t'), (performance.now() - t0) * 0.001);
      gl.uniform1f(u('u_p33'), Math.max(2, s.pulseCounter)); gl.uniform1f(u('u_en'), s.energy);
      gl.uniform1f(u('u_ten'), s.tension); gl.uniform1f(u('u_spk'), s.isSpeaking ? 1.0 : 0.0);
      gl.uniform1f(u('u_morph'), morphRef.current); gl.uniform1i(u('u_env'), env);
      gl.uniform3f(u('u_col'), ((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  const dTitle = title ?? titleLabel, dSub = subtitle ?? subtitleLabel;
  return (
    <div className="relative w-full h-full overflow-hidden bg-[#05080f]">
      <canvas ref={canvasRef} className="block w-full h-full" />
      {!hideOverlay && (dTitle || dSub) && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-col gap-0.5 rounded-xl bg-[#05080f]/75 px-3.5 py-2 backdrop-blur-md border border-amber-500/20">
          {dTitle && <span className="font-nordic text-xs font-bold tracking-wider uppercase text-amber-400">{dTitle}</span>}
          {dSub && <span className="text-xs text-slate-200 line-clamp-2">{dSub}</span>}
        </div>
      )}
    </div>
  );
}
