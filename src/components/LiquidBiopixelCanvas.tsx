import { useEffect, useRef, useState } from 'react';

export interface LiquidBiopixelCanvasProps {
  hlxScript?: string;
  shape?: string;
  accentColor?: string;
  pulseCounter?: number;
  title?: string;
  subtitle?: string;
}

const VERT_GLSL = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG_GLSL = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uPulse;
uniform vec3 uColor;
uniform int uShape;
out vec4 fragColor;

float sdScene(vec3 p) {
  float w = sin(p.x * 3.5 + uTime * 2.4) * cos(p.z * 3.5 - uTime * 1.9) * (0.12 + uPulse * 0.25);
  if (uShape == 1) {
    // Nave / Satélite Orbital
    float body = length(p * vec3(1.0, 2.2, 1.0)) - (0.75 + w * 0.5);
    float ring = length(vec2(length(p.xz) - 1.35, p.y - w * 0.4)) - 0.08;
    return min(body, ring);
  }
  if (uShape == 2) {
    // Terreno / Montaña Fractal
    float h = sin(p.x * 2.2 + uTime * 0.5) * cos(p.z * 2.2) * 0.55 + w;
    return p.y - h + 0.45;
  }
  // Toroide Dinámico Líquido por defecto
  return length(vec2(length(p.xz) - 1.15, p.y - w)) - (0.42 + 0.06 * sin(uTime * 3.2));
}

vec3 getNormal(vec3 p) {
  vec2 e = vec2(0.002, 0.0);
  return normalize(vec3(
    sdScene(p + e.xyy) - sdScene(p - e.xyy),
    sdScene(p + e.yxy) - sdScene(p - e.yxy),
    sdScene(p + e.yyx) - sdScene(p - e.yyx)
  ));
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);
  float ang = uTime * 0.35;
  vec3 ro = vec3(sin(ang) * 3.2, 1.35, cos(ang) * 3.2);
  vec3 fwd = normalize(-ro);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  vec3 up = cross(fwd, right);
  vec3 rd = normalize(fwd * 1.5 + right * uv.x + up * uv.y);

  float t = 0.0;
  for (int i = 0; i < 72; i++) {
    float d = sdScene(ro + rd * t);
    if (d < 0.002 || t > 12.0) break;
    t += d;
  }

  vec3 col = vec3(0.02, 0.035, 0.07);
  if (t < 12.0) {
    vec3 p = ro + rd * t;
    vec3 n = getNormal(p);
    vec3 v = -rd;
    float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.5);
    // Dispersión cromática de Cauchy (700nm, 546.1nm, 435.8nm)
    vec3 cauchy = vec3(fresnel * 1.15, fresnel * 0.95, fresnel * 1.35);
    float diff = max(dot(n, normalize(vec3(0.6, 0.9, 0.5))), 0.15);
    col = uColor * diff * 0.65 + cauchy * (0.75 + uPulse * 0.8);
  }
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  fragColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(0.4545)), 1.0);
}
`;

export function LiquidBiopixelCanvas({
  shape = 'torus',
  accentColor = '#38bdf8',
  pulseCounter = 0,
  title = 'Membrana Líquida Helix',
  subtitle = 'GLSL ES 3.00 · Raymarching SDF + Cauchy',
}: LiquidBiopixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pulseRef = useRef(1.0);
  const [paused, setPaused] = useState(false);

  useEffect(() => { pulseRef.current = 1.4; }, [pulseCounter, shape]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2');
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT_GLSL));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG_GLSL));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uPulse = gl.getUniformLocation(prog, 'uPulse');
    const uColor = gl.getUniformLocation(prog, 'uColor');
    const uShape = gl.getUniformLocation(prog, 'uShape');

    let raf = 0;
    let t0 = performance.now();
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const w = canvas.clientWidth || 640;
      const h = canvas.clientHeight || 480;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      if (!paused) {
        pulseRef.current = Math.max(0.15, pulseRef.current * 0.96);
        const hex = accentColor.replace('#', '');
        const r = parseInt(hex.slice(0, 2) || '38', 16) / 255;
        const g = parseInt(hex.slice(2, 4) || 'bd', 16) / 255;
        const b = parseInt(hex.slice(4, 6) || 'f8', 16) / 255;
        const shapeId = /nave|sat|orb/i.test(shape) ? 1 : /terr|mont|fract/i.test(shape) ? 2 : 0;

        gl.uniform2f(uRes, w, h);
        gl.uniform1f(uTime, (now - t0) * 0.001);
        gl.uniform1f(uPulse, pulseRef.current);
        gl.uniform3f(uColor, r, g, b);
        gl.uniform1i(uShape, shapeId);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [accentColor, paused, shape]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      <canvas ref={canvasRef} onClick={() => { pulseRef.current = 1.6; }} className="h-full w-full block cursor-pointer" />
      <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-slate-950/75 px-3 py-1.5 text-xs text-sky-200 backdrop-blur">
        <div className="font-semibold">{title}</div>
        <div className="text-[11px] text-slate-400">{subtitle}</div>
      </div>
      <div className="absolute bottom-3 left-3 flex gap-2">
        <button type="button" onClick={() => { pulseRef.current = 1.6; }} className="rounded bg-sky-500 px-3 py-1 text-xs font-semibold text-slate-950">
          Pulso líquido
        </button>
        <button type="button" onClick={() => setPaused((p) => !p)} className="rounded bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
          {paused ? 'Reanudar' : 'Pausar'}
        </button>
      </div>
    </div>
  );
}
export default LiquidBiopixelCanvas;