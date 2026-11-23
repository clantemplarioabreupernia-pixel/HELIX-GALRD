export const PHI = 1.618033988749895;
export const FRAME_STRIDE = 12;

export interface Kinematics12Params {
  duration: number;
  fps: number;
  elasticity: number;
  anticipationRatio: number;
  anticipationAmp: number;
  exaggeration: number;
  mass: number;
  damping: number;
  stiffness: number;
  lagFrames: number;
}

export class HelixKinematics12Engine {
  public static smootherstep(u: number): number {
    const t = u < 0 ? 0 : u > 1 ? 1 : u;
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private static evalBezierQuadratic(
    u: number, p0x: number, p0y: number, p0z: number,
    pcx: number, pcy: number, pcz: number,
    p1x: number, p1y: number, p1z: number,
    out: Float32Array, offset: number
  ): void {
    const invU = 1.0 - u, w0 = invU * invU, w1 = 2.0 * invU * u, w2 = u * u;
    out[offset]     = w0 * p0x + w1 * pcx + w2 * p1x;
    out[offset + 1] = w0 * p0y + w1 * pcy + w2 * p1y;
    out[offset + 2] = w0 * p0z + w1 * pcz + w2 * p1z;
  }

  public static slerpQuat(q0: Float32Array, o0: number, q1: Float32Array, o1: number, u: number, out: Float32Array, oOut: number): void {
    let x0 = q0[o0], y0 = q0[o0 + 1], z0 = q0[o0 + 2], w0 = q0[o0 + 3];
    let x1 = q1[o1], y1 = q1[o1 + 1], z1 = q1[o1 + 2], w1 = q1[o1 + 3];
    let dot = x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1;
    if (dot < 0.0) { dot = -dot; x1 = -x1; y1 = -y1; z1 = -z1; w1 = -w1; }
    if (dot > 0.9995) {
      const rx = x0 + u * (x1 - x0), ry = y0 + u * (y1 - y0), rz = z0 + u * (z1 - z0), rw = w0 + u * (w1 - w0);
      const inv = 1.0 / (Math.hypot(rx, ry, rz, rw) || 1);
      out[oOut] = rx * inv; out[oOut + 1] = ry * inv; out[oOut + 2] = rz * inv; out[oOut + 3] = rw * inv;
      return;
    }
    const theta0 = Math.acos(dot), theta = theta0 * u, sinT = Math.sin(theta), sinT0 = Math.sin(theta0);
    const s0 = Math.cos(theta) - dot * (sinT / sinT0), s1 = sinT / sinT0;
    out[oOut] = s0 * x0 + s1 * x1; out[oOut + 1] = s0 * y0 + s1 * y1; out[oOut + 2] = s0 * z0 + s1 * z1; out[oOut + 3] = s0 * w0 + s1 * w1;
  }

  public static synthesizeTrajectory(
    pStart: Float32Array, pControl: Float32Array, pEnd: Float32Array, pNeutral: Float32Array,
    params: Kinematics12Params, outBuffer: Float32Array
  ): number {
    const totalFrames = Math.max(2, Math.floor(params.duration * params.fps));
    const dt = 1.0 / params.fps;
    const dx = pEnd[0] - pStart[0], dy = pEnd[1] - pStart[1], dz = pEnd[2] - pStart[2];
    let fx = pStart[0], fy = pStart[1], fz = pStart[2], fvx = 0, fvy = 0, fvz = 0;
    let prevPx = pStart[0], prevPy = pStart[1], prevPz = pStart[2];

    for (let n = 0; n < totalFrames; n++) {
      const offset = n * FRAME_STRIDE;
      const uGlobal = n / (totalFrames - 1);
      if (uGlobal < params.anticipationRatio) {
        const uAnt = uGlobal / params.anticipationRatio;
        const backSwing = -params.anticipationAmp * Math.sin(Math.PI * uAnt);
        outBuffer[offset] = pStart[0] + dx * backSwing;
        outBuffer[offset + 1] = pStart[1] + dy * backSwing;
        outBuffer[offset + 2] = pStart[2] + dz * backSwing;
      } else {
        const uAction = (uGlobal - params.anticipationRatio) / (1.0 - params.anticipationRatio);
        this.evalBezierQuadratic(this.smootherstep(uAction), pStart[0], pStart[1], pStart[2], pControl[0], pControl[1], pControl[2], pEnd[0], pEnd[1], pEnd[2], outBuffer, offset);
      }

      const g = params.exaggeration;
      const px = pNeutral[0] + g * (outBuffer[offset] - pNeutral[0]);
      const py = pNeutral[1] + g * (outBuffer[offset + 1] - pNeutral[1]);
      const pz = pNeutral[2] + g * (outBuffer[offset + 2] - pNeutral[2]);
      outBuffer[offset] = px; outBuffer[offset + 1] = py; outBuffer[offset + 2] = pz;

      const speed = n === 0 ? 0 : Math.hypot((px - prevPx) / dt, (py - prevPy) / dt, (pz - prevPz) / dt);
      const sy = 1.0 + params.elasticity * Math.tanh(speed * 0.15);
      const sRadial = 1.0 / Math.sqrt(sy);
      outBuffer[offset + 3] = sRadial; outBuffer[offset + 4] = sy; outBuffer[offset + 5] = sRadial;

      const tIdx = Math.max(0, n - Math.round(params.lagFrames)) * FRAME_STRIDE;
      const tx = outBuffer[tIdx], ty = outBuffer[tIdx + 1], tz = outBuffer[tIdx + 2];
      const invM = 1.0 / Math.max(0.01, params.mass), k = params.stiffness, c = params.damping, h = dt * 0.5;
      for (let s = 0; s < 2; s++) {
        const ax1 = (-k * (fx - tx) - c * fvx) * invM, ay1 = (-k * (fy - ty) - c * fvy) * invM, az1 = (-k * (fz - tz) - c * fvz) * invM;
        const ax2 = (-k * (fx + 0.5 * h * fvx - tx) - c * (fvx + 0.5 * h * ax1)) * invM;
        const ay2 = (-k * (fy + 0.5 * h * fvy - ty) - c * (fvy + 0.5 * h * ay1)) * invM;
        const az2 = (-k * (fz + 0.5 * h * fvz - tz) - c * (fvz + 0.5 * h * az1)) * invM;
        fx += h * (fvx + 0.5 * h * ax1); fy += h * (fvy + 0.5 * h * ay1); fz += h * (fvz + 0.5 * h * az1);
        fvx += h * ax2; fvy += h * ay2; fvz += h * az2;
      }
      outBuffer[offset + 6] = fx; outBuffer[offset + 7] = fy; outBuffer[offset + 8] = fz;
      const secPhase = uGlobal * Math.PI * 4.0 * PHI;
      outBuffer[offset + 9]  = px + 0.06 * Math.sin(secPhase);
      outBuffer[offset + 10] = py + 0.06 * Math.cos(secPhase);
      outBuffer[offset + 11] = pz;
      prevPx = px; prevPy = py; prevPz = pz;
    }
    return totalFrames;
  }

  public static validateInvariants(buffer: Float32Array, frames: number): { valid: boolean; maxVolumeError: number } {
    let maxErr = 0;
    for (let n = 0; n < frames; n++) {
      const o = n * FRAME_STRIDE;
      const detS = buffer[o + 3] * buffer[o + 4] * buffer[o + 5];
      const err = Math.abs(detS - 1.0);
      if (err > maxErr) maxErr = err;
    }
    return { valid: maxErr < 1e-4, maxVolumeError: maxErr };
  }
}