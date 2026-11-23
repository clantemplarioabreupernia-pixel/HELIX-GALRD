export interface Vec3 { x: number; y: number; z: number; }
export const PHI_GOLDEN = 1.618033988749895;

// 1. Squash & Stretch: Conservacion de volumen det(F) = lx * ly * lz = 1
export function computeCauchyGreenStretch(lz: number): { lx: number; ly: number; lz: number; detF: number } {
  const safeLz = Math.max(0.25, Math.min(4.0, lz));
  const radial = 1 / Math.sqrt(safeLz);
  return { lx: radial, ly: radial, lz: safeLz, detF: radial * radial * safeLz };
}

// 2. Anticipacion: Vector de fuerza inversa de pre-carga (-alpha * grad(V))
export function computeAnticipationImpulse(gradV: Vec3, alpha = 0.15): Vec3 {
  return { x: -alpha * gradV.x, y: -alpha * gradV.y, z: -alpha * gradV.z };
}

// 4. Pose a Pose: Slerp en SE(3) + Integracion RK4
export function slerpQuat(q1: [number, number, number, number], q2: [number, number, number, number], t: number): [number, number, number, number] {
  let dot = q1[0]*q2[0] + q1[1]*q2[1] + q1[2]*q2[2] + q1[3]*q2[3];
  const q2b: [number, number, number, number] = dot < 0 ? [-q2[0], -q2[1], -q2[2], -q2[3]] : [...q2];
  dot = Math.min(1, Math.abs(dot));
  const theta = Math.acos(dot);
  if (theta < 1e-4) return q1;
  const s = Math.sin(theta), w1 = Math.sin((1 - t) * theta) / s, w2 = Math.sin(t * theta) / s;
  return [w1*q1[0] + w2*q2b[0], w1*q1[1] + w2*q2b[1], w1*q1[2] + w2*q2b[2], w1*q1[3] + w2*q2b[3]];
}

// 5. Overlapping & Follow Through: Oscilador acoplado m*x'' + c*x' + k*(x - x_parent) = 0
export function stepCoupledOscillator(x: Vec3, v: Vec3, parent: Vec3, m: number, c: number, k: number, dt: number): { x: Vec3; v: Vec3 } {
  const invM = 1 / Math.max(0.01, m);
  const ax = (-c * v.x - k * (x.x - parent.x)) * invM;
  const ay = (-c * v.y - k * (x.y - parent.y)) * invM;
  const az = (-c * v.z - k * (x.z - parent.z)) * invM;
  const nv = { x: v.x + ax * dt, y: v.y + ay * dt, z: v.z + az * dt };
  return { v: nv, x: { x: x.x + nv.x * dt, y: x.y + nv.y * dt, z: x.z + nv.z * dt } };
}

// 6. Slow In & Slow Out: Hermite Smoothstep f(t) = 3t^2 - 2t^3
export function hermiteSmoothstep(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return 3 * u * u - 2 * u * u * u;
}

// 10 & 12. Exageracion no lineal T*(1 + lambda*||gradT||^2) y Refraccion de Cauchy n(lambda)
export function computeExaggeratedStress(T: number, gradTNorm: number, lambda = 0.4): number {
  return T * (1 + lambda * gradTNorm * gradTNorm);
}

export function computeCauchyRefraction(wavelengthNm: number, A = 1.5046, B = 14720): number {
  return A + B / (wavelengthNm * wavelengthNm);
}