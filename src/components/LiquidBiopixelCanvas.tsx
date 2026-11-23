import { useEffect, useRef, useState } from 'react';

export const MORPH_SHAPE_LABELS: Record<string, string> = {
  torus: 'Toroide Dinámico',
  satellite: 'Nave / Satélite Orbital',
  terrain: 'Terreno Fractal',
  wave: 'Membrana Acústica',
  crystal: 'Cristal Icosaédrico',
  sphere: 'Esfera Cuántica',
};

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
uniform vec2 uClickPos;
uniform float uClickTime;
uniform vec3 uColor;
uniform int uShape;
out vec4 fragColor;

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Pantalla base de viscoelasticidad (Kelvin-Voigt + ondas radiales amortiguadas)
float sdViscoelasticSheet(vec3 p) {
  float rCenter = length(p.xz);
  float baseWave = sin(p.x * 2.8 + uTime * 1.8) * cos(p.z * 2.8 - uTime * 1.5) * 0.045;
  // Onda viscoelástica por pulso o clic con disipación de Cauchy
  float dt = max(0.0, uTime - uClickTime);
  float dClick = length(p.xz - uClickPos);
  float impactWave = sin(dClick * 7.5 - dt * 9.0) * exp(-dClick * 0.85 - dt * 1.6) * 0.22 * uPulse;
  float ambientRipple = sin(rCenter * 4.5 - uTime * 2.6) * exp(-rCenter * 0.45) * 0.06 * uPulse;
  return p.y + 0.62 - (baseWave + impactWave + ambientRipple);
}

float sdCoreObject(vec3 p) {
  float w = sin(p.x * 3.5 + uTime * 2.4) * cos(p.z * 3.5 - uTime * 1.9) * (0.11 + uPulse * 0.18);
  if (uShape == 1) {
    float body = length(p * vec3(1.0, 2.2, 1.0)) - (0.72 + w * 0.45);
    float ring = length(vec2(length(p.xz) - 1.32, p.y - w * 0.4)) - 0.075;
    return min(body, ring);
  }
  if (uShape == 2) {
    float h = sin(p.x * 2.4 + uTime * 0.6) * cos(p.z * 2.4) * 0.52 + w;
    return p.y - h + 0.18;
  }
  if (uShape == 3) {
    vec3 q = abs(p);
    return max(max(q.x * 0.85 + q.y * 0.52, q.y * 0.85 + q.z * 0.52), q.z * 0.85 + q.x * 0.52) - (0.78 + w * 0.4);
  }
  if (uShape == 4) {
    return length(p) - (0.82 + w * 0.65);
  }
  return length(vec2(length(p.xz) - 1.12, p.y - w)) - (0.38 + 0.05 * sin(uTime * 3.2));
}

vec2 mapScene(vec3 p) {
  float dSheet = sdViscoelasticSheet(p);
  float dCore = sdCoreObject(p);
  // Acoplamiento viscoelástico continuo entre la membrana y el núcleo
  float dTotal = smin(dSheet, dCore, 0.32);
  float matId = dCore < dSheet ? 1.0 : 0.0;
  return vec2(dTotal, matId);
}

vec3 getNormal(vec3 p) {
  vec2 e = vec2(0.002, 0.0);
  return normalize(vec3(
    mapScene(p + e.xyy).x - mapScene(p - e.xyy).x,
    mapScene(p + e.yxy).x - mapScene(p - e.yxy).x,
    mapScene(p + e.yyx).x - mapScene(p - e.yyx).x
  ));
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);
  float ang = uTime * 0.25;
  vec3 ro = vec3(sin(ang) * 3.6, 1.65, cos(ang) * 3.6);
  vec3 fwd = normalize(vec3(0.0, -0.25, 0.0) - ro);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  vec3 up = cross(fwd, right);
  vec3 rd = normalize(fwd * 1.45 + right * uv.x + up * uv.y);

  float t = 0.0;
  float mat = 0.0;
  for (int i = 0; i < 84; i++) {
    vec2 res = mapScene(ro + rd * t);
    if (res.x < 0.002 || t > 16.0) {
      mat = res.y;
      break;
    }
    t += res.x;
  }

  vec3 bg = vec3(0.018, 0.03, 0.065);
  vec3 col = bg;
  if (t < 16.0) {
    vec3 p = ro + rd * t;
    vec3 n = getNormal(p);
    vec3 v = -rd;
    float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.2);
    float diff = max(dot(n, normalize(vec3(0.5, 0.9, 0.4))), 0.12);
    vec3 cauchy = vec3(fresnel * 1.15, fresnel * 0.95, fresnel * 1.4);

    if (mat < 0.5) {
      // Pantalla de viscoelasticidad: malla energética + tensión fluida luminosa
      vec2 grid = abs(fract(p.xz * 1.6 - 0.5) - 0.5) / fwidth(p.xz * 1.6);
      float line = 1.0 - min(min(grid.x, grid.y), 1.0);
      float strainGlow = clamp(abs(p.y + 0.62) * 5.5, 0.0, 1.0);
      vec3 membraneBase = mix(vec3(0.03, 0.07, 0.14), uColor * 0.85, strainGlow + line * 0.28);
      col = membraneBase * (0.45 + diff * 0.65) + cauchy * 0.55;
    } else {
      // Núcleo 3D acoplado
      col = uColor * diff * 0.7 + cauchy * (0.8 + uPulse * 0.7);
    }
    // Niebla atmosférica suave hacia el horizonte
    col = mix(col, bg, 1.0 - exp(-0.018 * t * t));
  }

  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  fragColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(0.4545)), 1.0);
}
`;

export function LiquidBiopixelCanvas({
  shape = 'torus',
  accentColor = '#38bdf8',
  pulseCounter = 0,
  title = 'Membrana Viscoelástica Helix',
  subtitle = 'Kelvin-Voigt · Raymarching SDF + Cauchy',
}: LiquidBiopixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pulseRef = useRef(1.1);
  const clickPosRef = useRef<[number, number]>([0, 0]);
  const clickTimeRef = useRef(0);
  const timeRef = useRef(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    pulseRef.current = 1.45;
    clickPosRef.current = [0, 0];
    clickTimeRef.current = timeRef.current;
  }, [pulseCounter, shape]);

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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uPulse = gl.getUniformLocation(prog, 'uPulse');
    const uClickPos = gl.getUniformLocation(prog, 'uClickPos');
    const uClickTime = gl.getUniformLocation(prog, 'uClickTime');
    const uColor = gl.getUniformLocation(prog, 'uColor');
    const uShape = gl.getUniformLocation(prog, 'uShape');

    let raf = 0;
    const t0 = performance.now();
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
        const elapsed = (now - t0) * 0.001;
        timeRef.current = elapsed;
        pulseRef.current = Math.max(0.25, pulseRef.current * 0.985);
        const hex = accentColor.replace('#', '');
        const r = parseInt(hex.slice(0, 2) || '38', 16) / 255;
        const g = parseInt(hex.slice(2, 4) || 'bd', 16) / 255;
        const b = parseInt(hex.slice(4, 6) || 'f8', 16) / 255;
        const shapeId = /nave|sat|orb/i.test(shape) ? 1 : /terr|mont|fract/i.test(shape) ? 2 : /crist|cryst|ico/i.test(shape) ? 3 : /esf|spher|cuant|wave/i.test(shape) ? 4 : 0;

        gl.uniform2f(uRes, w, h);
        gl.uniform1f(uTime, elapsed);
        gl.uniform1f(uPulse, pulseRef.current);
        gl.uniform2f(uClickPos, clickPosRef.current[0], clickPosRef.current[1]);
        gl.uniform1f(uClickTime, clickTimeRef.current);
        gl.uniform3f(uColor, r, g, b);
        gl.uniform1i(uShape, shapeId);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [accentColor, paused, shape]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    clickPosRef.current = [nx * 2.2, ny * 2.2];
    clickTimeRef.current = timeRef.current;
    pulseRef.current = 1.65;
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      <canvas ref={canvasRef} onPointerDown={handlePointerDown} className="block h-full w-full cursor-pointer" />
      <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-slate-950/75 px-3 py-1.5 text-xs text-sky-200 backdrop-blur">
        <div className="font-semibold">{title}</div>
        <div className="text-[11px] text-slate-400">{subtitle}</div>
      </div>
      <div className="absolute bottom-3 left-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            clickPosRef.current = [0, 0];
            clickTimeRef.current = timeRef.current;
            pulseRef.current = 1.65;
          }}
          className="rounded bg-sky-500 px-3 py-1 text-xs font-semibold text-slate-950"
        >
          Pulso viscoelástico
        </button>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="rounded bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200"
        >
          {paused ? 'Reanudar' : 'Pausar'}
        </button>
      </div>
    </div>
  );
}
export default LiquidBiopixelCanvas;