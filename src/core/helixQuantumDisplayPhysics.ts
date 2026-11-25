/**
 * HELIX-DNA-2.0 · Núcleo Físico-Matemático del Biopíxel Nanotecnológico
 * Ecuación de Brus · Transistor IGZO · Cauchy n(λ) · CIE 1931 · Gobernador Némesis
 */

const H_PLANCK = 6.62607015e-34;      // J·s
const C_LIGHT = 299792458;            // m/s
const E_CHARGE = 1.602176634e-19;     // C
const EPS_0 = 8.8541878128e-12;       // F/m
const M_0 = 9.1093837015e-31;         // kg

export interface QuantumDotSpec {
  lambdaNm: number;
  photonEnergyEv: number;
  radiusNm: number;
  diameterNm: number;
  cauchyRefractiveIndex: number;
  antiReflectiveThicknessNm: number;
}

/**
 * 1. Resuelve la Ecuación de Brus (cuadrática en u = 1/R) para CdSe (Eg = 1.74 eV)
 * Devuelve el radio nanométrico exacto R y el índice de refracción de Cauchy n(λ).
 */
export function solveBrusAndCauchy(lambdaNm: number): QuantumDotSpec {
  const lambdaM = Math.max(400, Math.min(720, lambdaNm)) * 1e-9;
  const energyJ = (H_PLANCK * C_LIGHT) / lambdaM;
  const photonEnergyEv = energyJ / E_CHARGE;

  // Propiedades CdSe en bloque
  const egJ = 1.74 * E_CHARGE;
  const me = 0.13 * M_0;
  const mh = 0.45 * M_0;
  const epsR = 9.3;

  // Ecuación cuadrática: A·u² - B·u + C = 0, donde u = 1/R
  const A = (H_PLANCK * H_PLANCK / 8) * (1 / me + 1 / mh);
  const B = (1.8 * E_CHARGE * E_CHARGE) / (4 * Math.PI * EPS_0 * epsR);
  const C = egJ - energyJ;

  const disc = Math.max(0, B * B - 4 * A * C);
  const u = (B + Math.sqrt(disc)) / (2 * A);
  const radiusNm = u > 0 ? (1 / u) * 1e9 : 2.5;

  // Dispersión espectral de Cauchy: n(λ) = A_c + B_c / λ² (λ en micrómetros)
  const lambdaUm = lambdaNm * 1e-3;
  const cauchyRefractiveIndex = 1.72 + 0.0145 / (lambdaUm * lambdaUm);
  const antiReflectiveThicknessNm = lambdaNm / (4 * cauchyRefractiveIndex);

  return {
    lambdaNm,
    photonEnergyEv: Number(photonEnergyEv.toFixed(4)),
    radiusNm: Number(radiusNm.toFixed(3)),
    diameterNm: Number((radiusNm * 2).toFixed(3)),
    cauchyRefractiveIndex: Number(cauchyRefractiveIndex.toFixed(4)),
    antiReflectiveThicknessNm: Number(antiReflectiveThicknessNm.toFixed(2)),
  };
}

/**
 * 2. Transistor Nanométrico IGZO (Región Lineal y Saturación)
 */
export function computeIgzoDrainCurrent(
  vGs: number,
  vDs: number,
  vTh = 0.45,
  mu = 18e-4,        // Movilidad IGZO ~18 cm²/V·s
  cOx = 3.45e-3,     // Capacitancia óxido nanométrico (F/m²)
  wOverL = 4.0,
  lambdaC = 0.02
): { currentAmps: number; regime: 'cutoff' | 'linear' | 'saturation' } {
  const vOv = vGs - vTh;
  if (vOv <= 0) return { currentAmps: 0, regime: 'cutoff' };
  const k = mu * cOx * wOverL;
  if (vDs < vOv) {
    return { currentAmps: k * (vOv * vDs - 0.5 * vDs * vDs), regime: 'linear' };
  }
  return { currentAmps: 0.5 * k * vOv * vOv * (1 + lambdaC * vDs), regime: 'saturation' };
}

/**
 * 3. Eficiencia Cuántica Externa (η_EQE) y Colorimetría CIE 1931 (x, y)
 */
export function computeCie1931AndEqe(lambdaNm: number, fwhmNm = 18) {
  // Funciones de sensibilidad del observador estándar CIE 1931 (aproximación gaussiana analítica)
  const g = (x: number, mu: number, s1: number, s2: number) => {
    const t = (x - mu) / (x < mu ? s1 : s2);
    return Math.exp(-0.5 * t * t);
  };

  let X = 0, Y = 0, Z = 0;
  const sigma = fwhmNm / 2.3548;
  for (let l = 380; l <= 780; l += 5) {
    const d = (l - lambdaNm) / sigma;
    const S = Math.exp(-0.5 * d * d);
    const xBar = 1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2);
    const yBar = 0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1);
    const zBar = 1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8);
    X += S * xBar * 5;
    Y += S * yBar * 5;
    Z += S * zBar * 5;
  }

  const sum = X + Y + Z || 1;
  const eqe = 0.96 * 1.0 * 0.92 * 0.54; // γ · η_S/T · q_eff · η_out ≈ 47.7%
  return {
    cieX: Number((X / sum).toFixed(4)),
    cieY: Number((Y / sum).toFixed(4)),
    eqePercent: Number((eqe * 100).toFixed(2)),
  };
}

/**
 * 4. Gobernador Termodinámico de Némesis (Disipación hacia 0.0f)
 */
export function stepNemesisHomeostasis(currentTension: number, excitationImpulse: number, gamma = 0.085): number {
  const next = currentTension + excitationImpulse;
  const damped = next - next * gamma;
  return damped < 0.0005 ? 0.0 : Math.min(1.0, damped);
}
