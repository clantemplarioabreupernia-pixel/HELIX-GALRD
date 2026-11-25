import { useEffect, useRef } from 'react';
export type HologramShape = 'avatar' | 'torus' | 'satellite' | 'terrain' | 'crystal' | 'sphere' | 'wave';
export interface LiquidBiopixelCanvasProps { shape?: HologramShape; accentColor?: string; energy?: number; tension?: number; title?: string; subtitle?: string; }
function hexToRgbNorm(hex: string): [number, number, number] { const c = hex.replace('#', '').trim(); if (c.length !== 6) return [0.22, 0.74, 0.97]; const n = parseInt(c, 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
const VERT_SRC = `#version 300 es
in vec2 aPos; out vec2 vUv; void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;
const FRAG_SRC = `#version 300 es
precision highp float; in vec2 vUv; out vec4 fragColor;
uniform vec2 uRes; uniform float uTime; uniform int uShape; uniform vec3 uColor; uniform float uTension; uniform vec3 uPulse;
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
float sdTorus(vec3 p, vec2 t) { vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }
float sdHumanHologramHead(vec3 p, float t, float energy) {
  p.y -= sin(t * 1.4) * 0.025;
  float yaw = sin(t * 0.65) * 0.16; float cy = cos(yaw), sy = sin(yaw); p.xz = mat2(cy, -sy, sy, cy) * p.xz;
  float cranium = length((p - vec3(0.0, 0.12, 0.0)) * vec3(1.18, 0.92, 1.05)) - 0.52;
  float speak = abs(sin(t * 11.5)) * clamp(energy * 2.0 + 0.03, 0.0, 0.11);
  float jaw = length((p - vec3(0.0, -0.18 - speak * 0.5, 0.06)) * vec3(1.38, 1.05, 1.18)) - 0.36;
  float head = smin(cranium, jaw, 0.16);
  head = smin(head, sdCapsule(p, vec3(0.0, 0.12, 0.44), vec3(0.0, -0.04, 0.54), 0.048), 0.055);
  vec3 symP = vec3(abs(p.x), p.y, p.z);
  head = smin(head, length((symP - vec3(0.21, -0.02, 0.36)) * vec3(1.1, 1.3, 1.1)) - 0.14, 0.09);
  head = smin(head, sdCapsule(symP, vec3(0.06, 0.16, 0.45), vec3(0.27, 0.15, 0.38), 0.036), 0.05);
  head = max(head, -(length((symP - vec3(0.165, 0.09, 0.43)) * vec3(1.0, 1.35, 1.0)) - 0.075) * 0.75);
  head = min(head, length(symP - vec3(0.165, 0.09, 0.41)) - 0.052);
  head = smin(head, sdCapsule(symP, vec3(0.0, -0.155, 0.47), vec3(0.11, -0.165, 0.43), 0.026), 0.03);
  head = smin(head, sdCapsule(symP, vec3(0.0, -0.195 - speak, 0.46), vec3(0.095, -0.19 - speak * 0.7, 0.42), 0.025), 0.03);
  return smin(head, sdCapsule(p, vec3(0.0, -0.32, -0.06), vec3(0.0, -0.78, -0.08), 0.21), 0.14);
}
float sdScene(vec3 p) {
  float wave = sin(p.x * 2.4 + uTime * 1.4) * cos(p.z * 2.4 - uTime * 1.1) * 0.05;
  float age = uTime - uPulse.z;
  float ripple = (uPulse.z > 0.0 && age >= 0.0 && age < 6.0) ? sin(length(p.xz - uPulse.xy) * 11.0 - age * 8.0) * exp(-length(p.xz - uPulse.xy) * 0.85) * exp(-age * 0.95) * 0.16 : 0.0;
  float sheet = p.y + 0.62 - wave - ripple;
  float obj = 100.0;
  if (uShape == 0) { obj = sdHumanHologramHead(p - vec3(0.0, 0.24, 0.0), uTime, uTension); }
  else if (uShape == 1) { vec3 q = p - vec3(0.0, 0.12, 0.0); obj = smin(length(q) - 0.34, length(max(abs(q) - vec3(1.05, 0.03, 0.22), 0.0)), 0.08); }
  else if (uShape == 2) { obj = p.y - (sin(p.x * 3.0) * cos(p.z * 3.0) * 0.28 + sin(p.x * 7.0 + uTime * 0.5) * 0.08); }
  else if (uShape == 3) { vec3 q = abs(p - vec3(0.0, 0.15, 0.0)); obj = max(max(q.x + q.y + q.z - 0.78, q.x - 0.45), max(q.y - 0.45, q.z - 0.45)); }
  else if (uShape == 4) { obj = length(p - vec3(0.0, 0.15, 0.0)) - (0.48 + sin(p.x * 8.0 + uTime * 4.0) * 0.04); }
  else { vec3 q = p - vec3(0.0, 0.16, 0.0); float c = cos(uTime * 0.7), s = sin(uTime * 0.7); q.xz = mat2(c, -s, s, c) * q.xz; obj = sdTorus(q, vec2(0.48, 0.16)); }
  return smin(sheet, obj, 0.22);
}
vec3 calcNormal(vec3 p) { vec2 e = vec2(0.0015, 0.0); return normalize(vec3(sdScene(p + e.xyy) - sdScene(p - e.xyy), sdScene(p + e.yxy) - sdScene(p - e.yxy), sdScene(p + e.yyx) - sdScene(p - e.yyx))); }
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes.xy) / uRes.y; vec3 ro = vec3(0.0, 0.18, 2.35), rd = normalize(vec3(uv, -1.35));
  float t = 0.0; bool hit = false;
  for (int i = 0; i < 84; i++) { float d = sdScene(ro + rd * t); if (d < 0.0015) { hit = true; break; } if (t > 7.5) break; t += d * 0.85; }
  vec3 bg = mix(vec3(0.01, 0.025, 0.055), vec3(0.02, 0.06, 0.12), vUv.y);
  if (!hit) { fragColor = vec4(bg, 1.0); return; }
  vec3 p = ro + rd * t, n = calcNormal(p), v = -rd, l = normalize(vec3(0.6, 0.9, 1.1));
  float fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.6), diff = max(dot(n, l), 0.0), scan = 0.88 + 0.12 * sin(p.y * 95.0 - uTime * 6.0);
  vec3 col = vec3(uColor.r * (0.65 + 0.55 * diff) + fresnel * 0.75, uColor.g * (0.72 + 0.52 * diff) + fresnel * 0.90, uColor.b * (0.80 + 0.50 * diff) + fresnel * 1.10) * scan;
  col = mix(col, bg, smoothstep(3.5, 7.2, t));
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  fragColor = vec4(col, 1.0);
}`;
export function LiquidBiopixelCanvas({ shape = 'avatar', accentColor = '#38bdf8', energy = 0.35, tension = 0.35 }: LiquidBiopixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const st = useRef({ shape, accentColor, energy, tension, px: 0, pz: 0, pt: -10 });
  st.current.shape = shape; st.current.accentColor = accentColor; st.current.energy = energy; st.current.tension = tension;
  useEffect(() => {
    const c = canvasRef.current; if (!c) return; const gl = c.getContext('webgl2', { antialias: true }); if (!gl) return;
    const sh = (t: number, s: string) => { const o = gl.createShader(t)!; gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const pg = gl.createProgram()!; gl.attachShader(pg, sh(gl.VERTEX_SHADER, VERT_SRC)); gl.attachShader(pg, sh(gl.FRAGMENT_SHADER, FRAG_SRC)); gl.linkProgram(pg); gl.useProgram(pg);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pg, 'aPos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(pg, 'uRes'), uTime = gl.getUniformLocation(pg, 'uTime'), uShape = gl.getUniformLocation(pg, 'uShape'), uColor = gl.getUniformLocation(pg, 'uColor'), uTension = gl.getUniformLocation(pg, 'uTension'), uPulse = gl.getUniformLocation(pg, 'uPulse');
    let raf = 0; const t0 = performance.now();
    const loop = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.floor(c.clientWidth * dpr), h = Math.floor(c.clientHeight * dpr);
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      gl.viewport(0, 0, w, h); const s = st.current;
      const idx = s.shape === 'avatar' ? 0 : s.shape === 'satellite' ? 1 : s.shape === 'terrain' ? 2 : s.shape === 'crystal' ? 3 : s.shape === 'sphere' || s.shape === 'wave' ? 4 : 5;
      const [r, g, b] = hexToRgbNorm(s.accentColor);
      gl.uniform2f(uRes, w, h); gl.uniform1f(uTime, (performance.now() - t0) / 1000); gl.uniform1i(uShape, idx); gl.uniform3f(uColor, r, g, b); gl.uniform1f(uTension, Math.max(s.energy, s.tension)); gl.uniform3f(uPulse, s.px, s.pz, s.pt);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={canvasRef} onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); st.current.px = ((e.clientX - r.left) / r.width - 0.5) * 2.4; st.current.pz = ((e.clientY - r.top) / r.height - 0.5) * 2.4; st.current.pt = performance.now() / 1000; }} className="h-full w-full cursor-pointer" />;
}