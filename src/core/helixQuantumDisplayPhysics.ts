/**
 * HELIX-DNA-2.0 · Núcleo Físico-Matemático y Nanotecnológico del Biopíxel
 * Brus · Cauchy n(λ) · IGZO · CIE 1931 · Némesis · WKB (Fowler-Nordheim) ·
 * Mott-Gurney SCLC · Cristal Fotónico de Maxwell Z4 · Litografía Rayleigh EUV (BigInt P33)
 */
import { CubeFacesZ4, deriveCubeFacesForPrime, PRIMITIVE_TOKENS } from '../data/runes';
import { NEMESIS_THERMAL_CUTOFF } from './NemesisGovernor';

const H_PLANCK = 6.62607015e-34;      // J·s
const H_BAR = H_PLANCK / (2 * Math.PI);
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

export interface WkbTunnelingResult {
  electricFieldVPerM: number;
  barrierHeightEv: number;
  transmissionProb: number;
  fowlerNordheimCurrentAcm2: number;
  quantumRegime: 'BLOCKED' | 'RESONANT_TUNNEL' | 'AVALANCHE_CLAMPED';
}

export interface MottGurneySclcResult {
  voltageV: number;
  thicknessNm: number;
  currentDensityAcm2: number;
  spaceChargeCapacitanceFm2: number;
}

export interface PhotonicCrystalZ4Result {
  latticePitchNm: number;
  effectiveIndex: number;
  eigenFrequencyThz: number;
  photonicBandgapEv: number;
  z4PolarityIndex: number;
  cubeFaces: CubeFacesZ4;
}

export interface RayleighEuvLatticeResult {
  wavelengthNm: number;
  numericalAperture: number;
  k1Factor: number;
  criticalDimensionNm: number;
  latticePitchPmBigInt: string;
  alignedPixelsPerMm2: number;
}

export interface CoupledNanotechBiopixelState {
  lambdaNm: number;
  tensionNormalized: number;
  brusCauchy: QuantumDotSpec;
  igzo: { currentAmps: number; regime: 'cutoff' | 'linear' | 'saturation' };
  cieEqe: { cieX: number; cieY: number; eqePercent: number };
  wkbTunneling: WkbTunnelingResult;
  mottGurney: MottGurneySclcResult;
  photonicCrystal: PhotonicCrystalZ4Result;
  rayleighEuv: RayleighEuvLatticeResult;
  nemesisTensionAfterDecay: number;
  cauchyElasticityGo: number;
  nemesisViscosityGo: number;
}

/**
 * 1. Resuelve la Ecuación de Brus (cuadrática en u = 1/R) para CdSe (Eg = 1.74 eV)
 * Devuelve el radio nanométrico exacto R y el índice de refracción de Cauchy n(λ).
 */
export function solveBrusAndCauchy(lambdaNm: number, stressFactor = 0): QuantumDotSpec {
  const lambdaM = Math.max(400, Math.min(720, lambdaNm)) * 1e-9;
  const energyJ = (H_PLANCK * C_LIGHT) / lambdaM;
  const photonEnergyEv = energyJ / E_CHARGE;

  // Propiedades CdSe en bloque (moduladas levemente por esfuerzo piezo-óptico)
  const egJ = (1.74 + Math.max(-0.08, Math.min(0.08, stressFactor * 0.05))) * E_CHARGE;
  const me = 0.13 * M_0;
  const mh = 0.45 * M_0;
  const epsR = 9.3;

  const A = ((H_PLANCK * H_PLANCK) / 8) * (1 / me + 1 / mh);
  const B = (1.8 * E_CHARGE * E_CHARGE) / (4 * Math.PI * EPS_0 * epsR);
  const C = egJ - energyJ;

  const disc = Math.max(0, B * B - 4 * A * C);
  const u = (B + Math.sqrt(disc)) / (2 * A);
  const radiusNm = u > 0 ? (1 / u) * 1e9 : 2.5;

  // Dispersión espectral de Cauchy: n(λ) = A_c + B_c(σ) / λ² (λ en micrómetros)
  const lambdaUm = (lambdaM * 1e6);
  const cauchyB = 0.0145 + Math.max(0, stressFactor) * 0.008;
  const cauchyRefractiveIndex = 1.72 + cauchyB / (lambdaUm * lambdaUm);
  const antiReflectiveThicknessNm = (lambdaM * 1e9) / (4 * cauchyRefractiveIndex);

  return {
    lambdaNm: Number((lambdaM * 1e9).toFixed(2)),
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
  lambdaC = 0.02,
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
export function computeCie1931AndEqe(lambdaNm: number, fwhmNm = 18, injectionEfficiency = 0.96) {
  const g = (x: number, mu: number, s1: number, s2: number) => {
    const t = (x - mu) / (x < mu ? s1 : s2);
    return Math.exp(-0.5 * t * t);
  };

  let X = 0;
  let Y = 0;
  let Z = 0;
  const sigma = fwhmNm / 2.3548;
  for (let l = 380; l <= 780; l += 5) {
    const d = (l - lambdaNm) / sigma;
    const S = Math.exp(-0.5 * d * d);
    const xBar =
      1.056 * g(l, 599.8, 37.9, 31.0) +
      0.362 * g(l, 442.0, 16.0, 26.7) -
      0.065 * g(l, 501.1, 20.4, 26.2);
    const yBar = 0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1);
    const zBar = 1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8);
    X += S * xBar * 5;
    Y += S * yBar * 5;
    Z += S * zBar * 5;
  }

  const sum = X + Y + Z || 1;
  const clampedGamma = Math.min(1, Math.max(0.1, injectionEfficiency));
  const eqe = clampedGamma * 1.0 * 0.92 * 0.54;
  return {
    cieX: Number((X / sum).toFixed(4)),
    cieY: Number((Y / sum).toFixed(4)),
    eqePercent: Number((eqe * 100).toFixed(2)),
  };
}

/**
 * 4. Gobernador Termodinámico de Némesis (umbral canónico NEMESIS_THERMAL_CUTOFF = 0.001)
 */
export function stepNemesisHomeostasis(
  currentTension: number,
  excitationImpulse: number,
  gamma = 0.085,
): number {
  const next = currentTension + excitationImpulse;
  const damped = next - next * gamma;
  return damped < NEMESIS_THERMAL_CUTOFF ? 0.0 : Math.min(1.0, damped);
}

/**
 * 5. Tunelamiento Cuántico WKB / Fowler-Nordheim en barrera óxido-semiconductor
 */
export function computeWkbTunnelingCurrent(
  voltageV = 3.2,
  barrierThicknessNm = 3.5,
  barrierHeightEv = 2.6,
  effectiveMassRatio = 0.22,
): WkbTunnelingResult {
  const safeV = Math.max(0.05, Math.min(20, voltageV));
  const dMeters = Math.max(1.0, barrierThicknessNm) * 1e-9;
  const field = safeV / dMeters; // V/m
  const mStar = Math.max(0.05, effectiveMassRatio) * M_0;
  const phiJ = Math.max(0.2, barrierHeightEv) * E_CHARGE;

  // Exponente WKB triangular: B_fn = 4 * sqrt(2 * m* * phi^3) / (3 * hbar * q * F)
  const exponent = (4 * Math.sqrt(2 * mStar * Math.pow(phiJ, 3))) / (3 * H_BAR * E_CHARGE * field);
  const clampedExp = Math.min(80, Math.max(0.05, exponent));
  const transmissionProb = Math.exp(-clampedExp);

  // Constantes de Fowler-Nordheim (J en A/cm²)
  const aFn = (E_CHARGE * E_CHARGE * E_CHARGE) / (8 * Math.PI * H_PLANCK * phiJ);
  const jAm2 = aFn * field * field * transmissionProb;
  const jAcm2 = jAm2 * 1e-4;

  const quantumRegime: WkbTunnelingResult['quantumRegime'] =
    transmissionProb < 1e-6
      ? 'BLOCKED'
      : transmissionProb > 0.25
        ? 'AVALANCHE_CLAMPED'
        : 'RESONANT_TUNNEL';

  return {
    electricFieldVPerM: Number(field.toExponential(3)),
    barrierHeightEv: Number(barrierHeightEv.toFixed(3)),
    transmissionProb: Number(transmissionProb.toExponential(4)),
    fowlerNordheimCurrentAcm2: Number(jAcm2.toExponential(4)),
    quantumRegime,
  };
}

/**
 * 6. Transporte de Carga Limitado por Carga Espacial (Ley de Mott-Gurney SCLC)
 */
export function computeMottGurneySclc(
  voltageV = 3.2,
  thicknessNm = 45,
  epsR = 9.3,
  mobilityCm2Vs = 18.0,
): MottGurneySclcResult {
  const v = Math.max(0.01, voltageV);
  const lMeters = Math.max(5, thicknessNm) * 1e-9;
  const muM2Vs = Math.max(1e-4, mobilityCm2Vs * 1e-4);
  const jAm2 = (9 / 8) * EPS_0 * epsR * muM2Vs * ((v * v) / Math.pow(lMeters, 3));
  const cap = (EPS_0 * epsR) / lMeters;

  return {
    voltageV: Number(v.toFixed(3)),
    thicknessNm: Number(thicknessNm.toFixed(2)),
    currentDensityAcm2: Number((jAm2 * 1e-4).toFixed(4)),
    spaceChargeCapacitanceFm2: Number(cap.toExponential(3)),
  };
}

/**
 * 7. Dispersión Eigen-Modal de Cristal Fotónico de Maxwell acoplada al Cubo Z4 de 6 Caras
 */
export function solvePhotonicCrystalZ4(
  lambdaNm: number,
  refractiveIndex: number,
  primeIndex = 16,
  latticePitchNm = 260,
): PhotonicCrystalZ4Result {
  const token = PRIMITIVE_TOKENS[Math.max(0, Math.min(32, Math.floor(primeIndex))) % PRIMITIVE_TOKENS.length];
  const cubeFaces = deriveCubeFacesForPrime(token.index, token.prime);
  const aMeters = Math.max(80, latticePitchNm) * 1e-9;
  const k = (2 * Math.PI) / (Math.max(380, lambdaNm) * 1e-9);
  const z4Mod = 1 + (cubeFaces.cara3_faseZ4 - 1.5) * 0.04;
  const nEff = Math.max(1.1, refractiveIndex * z4Mod);

  const omegaRad = (C_LIGHT / nEff) * Math.sqrt(k * k + Math.pow(Math.PI / aMeters, 2));
  const eigenFrequencyThz = omegaRad / (2 * Math.PI * 1e12);
  const contrast = Math.max(0.05, (nEff - 1.0) / (nEff + 1.0));
  const photonicBandgapEv = ((H_PLANCK * omegaRad) / (2 * Math.PI * E_CHARGE)) * contrast;

  return {
    latticePitchNm: Number(latticePitchNm.toFixed(2)),
    effectiveIndex: Number(nEff.toFixed(4)),
    eigenFrequencyThz: Number(eigenFrequencyThz.toFixed(2)),
    photonicBandgapEv: Number(photonicBandgapEv.toFixed(4)),
    z4PolarityIndex: cubeFaces.cara3_faseZ4,
    cubeFaces,
  };
}

/**
 * 8. Límite de Litografía EUV de Rayleigh (CD = k1 * λ / NA) + Retícula BigInt en picómetros (P33)
 */
export function computeRayleighEuvLattice(
  euvWavelengthNm = 13.5,
  numericalAperture = 0.55,
  k1Factor = 0.28,
): RayleighEuvLatticeResult {
  const safeNa = Math.min(0.95, Math.max(0.15, numericalAperture));
  const cdNm = (k1Factor * euvWavelengthNm) / safeNa;
  // Escala determinista entera en picómetros cuantizada al módulo primo P33 (137)
  const rawPm = BigInt(Math.max(100, Math.round(cdNm * 1000)));
  const latticePitchPmBig = ((rawPm + 136n) / 137n) * 137n;
  const pitchUm = Number(latticePitchPmBig) / 1e6;
  const pixelsPerMm2 = Math.floor(1e6 / Math.max(1e-4, pitchUm * pitchUm));

  return {
    wavelengthNm: Number(euvWavelengthNm.toFixed(2)),
    numericalAperture: Number(safeNa.toFixed(3)),
    k1Factor: Number(k1Factor.toFixed(3)),
    criticalDimensionNm: Number(cdNm.toFixed(3)),
    latticePitchPmBigInt: latticePitchPmBig.toString(),
    alignedPixelsPerMm2: pixelsPerMm2,
  };
}

/**
 * Síntesis Acoplada Completa: conecta tensión mecánica de Cauchy, transistor IGZO,
 * tunelamiento WKB, transporte Mott-Gurney, confinamiento de Brus, Maxwell Z4 y EUV.
 */
export function computeCoupledNanotechBiopixelState(params: {
  lambdaNm?: number;
  tension?: number;
  vGs?: number;
  vDs?: number;
  primeIndex?: number;
  gamma?: number;
} = {}): CoupledNanotechBiopixelState {
  const tensionNormalized = Math.min(1, Math.max(0, params.tension ?? 0.35));
  const lambdaNm = Math.max(410, Math.min(680, params.lambdaNm ?? 546.1 - tensionNormalized * 85));
  const vGs = params.vGs ?? 1.2 + tensionNormalized * 1.6;
  const vDs = params.vDs ?? 2.8 + tensionNormalized * 1.2;
  const primeIndex = params.primeIndex ?? Math.floor(tensionNormalized * 32);

  const brusCauchy = solveBrusAndCauchy(lambdaNm, tensionNormalized);
  const igzo = computeIgzoDrainCurrent(vGs, vDs);
  const wkbTunneling = computeWkbTunnelingCurrent(vDs, 3.2 - tensionNormalized * 0.6, 2.55);
  const mottGurney = computeMottGurneySclc(vDs, 42 - tensionNormalized * 8);
  const cieEqe = computeCie1931AndEqe(lambdaNm, 18, igzo.regime === 'cutoff' ? 0.3 : 0.96);
  const photonicCrystal = solvePhotonicCrystalZ4(lambdaNm, brusCauchy.cauchyRefractiveIndex, primeIndex);
  const rayleighEuv = computeRayleighEuvLattice(13.5, 0.55, 0.28);
  const nemesisTensionAfterDecay = stepNemesisHomeostasis(tensionNormalized, 0.04, params.gamma ?? 0.08);

  // Acople directo con parámetros del servidor físico en Go (`main.go` -> `nanopixel/helix_core.go`)
  const cauchyElasticityGo = Number((120 + brusCauchy.cauchyRefractiveIndex * 42 + tensionNormalized * 95).toFixed(2));
  const nemesisViscosityGo = Number((3.2 + (1 - nemesisTensionAfterDecay) * 4.8).toFixed(3));

  return {
    lambdaNm: brusCauchy.lambdaNm,
    tensionNormalized,
    brusCauchy,
    igzo,
    cieEqe,
    wkbTunneling,
    mottGurney,
    photonicCrystal,
    rayleighEuv,
    nemesisTensionAfterDecay,
    cauchyElasticityGo,
    nemesisViscosityGo,
  };
}
