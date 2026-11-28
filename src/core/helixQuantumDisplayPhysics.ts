/**
 * HELIX-DNA-2.0 · Núcleo Físico-Matemático y Nanotecnológico del Biopíxel
 * Brus · Cauchy n(λ) · IGZO · CIE 1931 · Némesis · WKB (Fowler-Nordheim) ·
 * Mott-Gurney SCLC · Cristal Fotónico de Maxwell Z4 · Litografía Rayleigh EUV (BigInt P33)
 */
import { CubeFacesZ4, deriveCubeFacesForPrime, PRIMITIVE_TOKENS } from '../data/runes';
import {
  computeCauchySpectralTriple,
  computeCurlNoise3D,
  createBlochState,
  evaluateWeberFechnerFrame,
  evolveSchrodingerPauli,
  projectorFromBlochAngle,
  verifyBirkhoffVonNeumannNonDistributivity,
} from '../utils/helixPhysics';
import { formatRationalP33, makeRationalP33 } from '../utils/rationalP33';
import { NEMESIS_THERMAL_CUTOFF, WEBER_PERCEPTUAL_K } from './NemesisGovernor';

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

export interface UnifiedBiopixelEquationInput {
  cFront?: number;
  cBack?: number;
  tension?: number;
  timeSec?: number;
  primeIndex?: number;
  prevIntensity?: number;
  nextIntensity?: number;
  weberK?: number;
  blochAxis?: [number, number, number];
  blochOmega?: number;
}

export interface UnifiedBiopixelEquationResult {
  cFront: number;
  cBack: number;
  cOppositeCheck: number;
  deltaZ: number;
  brusRadiusModulatedNm: number;
  brusEnergyEv: number;
  cauchySpectral: { nRed: number; nGreen: number; nBlue: number; abbeEstimate: number };
  blochNormSq: number;
  blochVector: [number, number, number];
  bvnNonDistributive: boolean;
  kelvinVoigtStress: number;
  curlDivergence: number;
  nemesisDissipated: number;
  weberDecision: 'RENDER_FRAME' | 'SKIP_FRAME';
  weberDeltaRatio: number;
  guardStatus: 'PROVEN_SAT' | 'CLAMPED';
  p33ExactRatio: string;
  sBiopixelMagnitude: number;
  coupledState: CoupledNanotechBiopixelState;
}

/**
 * Ecuación Unificada de Materia Informática:
 * S_BioPixel(r, t) = Guard_Z3^P33 [ ∫_ΩA2 Φ_Cuántica(R(ΔZ), H) · N_Óptica(λ) · T_Mecánica(ε, v) · I_Weber d³r ]
 */
export function evaluateUnifiedBiopixelEquation(
  input: UnifiedBiopixelEquationInput = {},
): UnifiedBiopixelEquationResult {
  const cFront = Math.max(-2, Math.min(2, input.cFront ?? 0.42));
  // Sincronización dual negativa de 6 caras: C_opuesta = -C_directa cuando no se perturba independientemente
  const cBack = Math.max(-2, Math.min(2, input.cBack ?? -cFront));
  const cOppositeCheck = Number((-cFront).toFixed(4));
  const deltaZ = Math.tanh(cFront - cBack);

  const tension = Math.min(1, Math.max(0, input.tension ?? Math.abs(deltaZ) * 0.65));
  const timeSec = input.timeSec ?? 0;
  const primeIndex = Math.max(0, Math.min(32, Math.floor(input.primeIndex ?? 0)));

  // 1. Confinamiento cuántico de Brus R(ΔZ) y óptica acoplada
  const lambdaNm = Math.max(435.8, Math.min(700.0, 546.1 - deltaZ * 88));
  const coupledState = computeCoupledNanotechBiopixelState({
    lambdaNm,
    tension,
    primeIndex,
  });
  const brusRadiusModulatedNm = Number(
    (coupledState.brusCauchy.radiusNm * (1 + 0.14 * deltaZ)).toFixed(3),
  );
  const brusEnergyEv = coupledState.brusCauchy.photonEnergyEv;

  // 2. Dispersión espectral de Cauchy en las líneas de Fraunhofer
  const cauchySpectral = computeCauchySpectralTriple(
    1.458 + Math.abs(deltaZ) * 0.04,
    0.00354 + tension * 0.0025,
    0.00012,
  );

  // 3. Esfera de Bloch SU(2) + Retículo ortomodular de Birkhoff-von Neumann
  const blochAxis = input.blochAxis ?? [0.25, 1.0, 0.15];
  const blochOmega = input.blochOmega ?? 1.5708;
  const bloch = evolveSchrodingerPauli(
    createBlochState(Math.abs(deltaZ) * 1.2, timeSec * 0.35),
    blochAxis,
    blochOmega,
    0.5,
  );
  const bvn = verifyBirkhoffVonNeumannNonDistributivity(
    projectorFromBlochAngle(1.5708, 0),
    projectorFromBlochAngle(0, 0),
    projectorFromBlochAngle(3.1416, 0),
  );

  // 4. Mecánica continua: Kelvin-Voigt + Curl Noise 3D (∇·v ≈ 0) + Némesis
  const curl = computeCurlNoise3D(cFront * 0.6, cBack * 0.6, deltaZ, timeSec);
  const elasticityE = 355 / 113; // π aproximado racional en P33
  const viscosityEta = 11 / 137;
  const epsilon = Math.abs(deltaZ) * 0.35;
  const dEpsilonDt = Math.hypot(curl.vx, curl.vy, curl.vz) * 0.25;
  const rawKvStress = elasticityE * epsilon + viscosityEta * dEpsilonDt;
  const nemesisDissipated = stepNemesisHomeostasis(rawKvStress, tension * 0.05, 0.08);

  // 5. Gating perceptual de Weber-Fechner
  const prevI = input.prevIntensity ?? 1.0;
  const nextI = input.nextIntensity ?? 1.0 + Math.abs(deltaZ) * 0.08;
  const weberK = input.weberK ?? WEBER_PERCEPTUAL_K;
  const weber = evaluateWeberFechnerFrame(prevI, nextI, weberK);

  // 6. Guardián Z3^P33: verifica unitariedad ||ψ||² ≈ 1, P33 racional exacto y estabilidad
  const p33Num = BigInt(Math.max(1, Math.round(Math.abs(nemesisDissipated) * 1000)));
  const p33Rat = makeRationalP33(p33Num, 1000n);
  const unitarityOk = Math.abs(bloch.normSq - 1) < 1e-6;
  const guardStatus: 'PROVEN_SAT' | 'CLAMPED' =
    unitarityOk && p33Rat.inSubringP33 && Number.isFinite(rawKvStress) ? 'PROVEN_SAT' : 'CLAMPED';

  const indicatorWeber = weber.decision === 'RENDER_FRAME' ? 1 : 0.25;
  const sBiopixelMagnitude = Number(
    (
      brusEnergyEv *
      cauchySpectral.nGreen *
      bloch.normSq *
      Math.max(0.05, rawKvStress) *
      indicatorWeber
    ).toFixed(4),
  );

  return {
    cFront: Number(cFront.toFixed(3)),
    cBack: Number(cBack.toFixed(3)),
    cOppositeCheck,
    deltaZ: Number(deltaZ.toFixed(4)),
    brusRadiusModulatedNm,
    brusEnergyEv,
    cauchySpectral,
    blochNormSq: Number(bloch.normSq.toFixed(9)),
    blochVector: bloch.blochVector,
    bvnNonDistributive: !bvn.distributiveHolds,
    kelvinVoigtStress: Number(rawKvStress.toFixed(4)),
    curlDivergence: Number(curl.divergence.toExponential(2)),
    nemesisDissipated: Number(nemesisDissipated.toFixed(4)),
    weberDecision: weber.decision,
    weberDeltaRatio: Number(weber.deltaRatio.toFixed(4)),
    guardStatus,
    p33ExactRatio: formatRationalP33(p33Rat),
    sBiopixelMagnitude,
    coupledState,
  };
}

export interface FresnelReflectanceResult {
  thetaDeg: number;
  n1: number;
  n2: number;
  rs: number;
  rp: number;
  rAvg: number;
  transmittanceAvg: number;
  brewsterAngleDeg: number;
  criticalAngleDeg: number | null;
  totalInternalReflection: boolean;
}

/**
 * Ecuación óptica de Fresnel R(θ) para polarización s, p y promedio no polarizado,
 * incluyendo ángulo de Brewster y ángulo crítico de reflexión interna total.
 */
export function computeFresnelReflectance(
  thetaDeg: number,
  n1 = 1.0,
  n2 = 1.52,
): FresnelReflectanceResult {
  const safeN1 = Math.max(1.0, n1);
  const safeN2 = Math.max(1.0, n2);
  const clampedTheta = Math.max(0, Math.min(89.99, thetaDeg));
  const thetaI = (clampedTheta * Math.PI) / 180;
  const sinT = (safeN1 / safeN2) * Math.sin(thetaI);
  const brewsterAngleDeg = Number(((Math.atan(safeN2 / safeN1) * 180) / Math.PI).toFixed(3));
  const criticalAngleDeg =
    safeN1 > safeN2 ? Number(((Math.asin(safeN2 / safeN1) * 180) / Math.PI).toFixed(3)) : null;

  if (sinT >= 1.0) {
    return {
      thetaDeg: Number(clampedTheta.toFixed(3)),
      n1: Number(safeN1.toFixed(4)),
      n2: Number(safeN2.toFixed(4)),
      rs: 1,
      rp: 1,
      rAvg: 1,
      transmittanceAvg: 0,
      brewsterAngleDeg,
      criticalAngleDeg,
      totalInternalReflection: true,
    };
  }

  const cosI = Math.cos(thetaI);
  const cosT = Math.sqrt(Math.max(0, 1 - sinT * sinT));
  const rsDen = safeN1 * cosI + safeN2 * cosT;
  const rpDen = safeN1 * cosT + safeN2 * cosI;
  const rsSqrt = rsDen > 0 ? (safeN1 * cosI - safeN2 * cosT) / rsDen : 1;
  const rpSqrt = rpDen > 0 ? (safeN1 * cosT - safeN2 * cosI) / rpDen : 1;
  const rs = rsSqrt * rsSqrt;
  const rp = rpSqrt * rpSqrt;
  const rAvg = 0.5 * (rs + rp);

  return {
    thetaDeg: Number(clampedTheta.toFixed(3)),
    n1: Number(safeN1.toFixed(4)),
    n2: Number(safeN2.toFixed(4)),
    rs: Number(rs.toFixed(6)),
    rp: Number(rp.toFixed(6)),
    rAvg: Number(rAvg.toFixed(6)),
    transmittanceAvg: Number((1 - rAvg).toFixed(6)),
    brewsterAngleDeg,
    criticalAngleDeg,
    totalInternalReflection: false,
  };
}

export interface GaldrOctaveResult {
  prime: number;
  baseC4Hz: number;
  octaveDivisor: number;
  frequencyHz: number;
  midiFloat: number;
  nearestMidi: number;
  centsOffset: number;
}

/**
 * Fórmula Armónica Rúnica Galdr:
 * f_r(p) = 261.6256 * p / 2^⌊log2(p)⌋
 */
export function computeGaldrOctaveFrequency(prime: number): GaldrOctaveResult {
  const baseC4Hz = 261.6256;
  const safePrime = Math.max(2, Math.floor(prime));
  const exp = Math.floor(Math.log2(safePrime));
  const octaveDivisor = Math.pow(2, exp);
  const frequencyHz = baseC4Hz * (safePrime / octaveDivisor);
  const midiFloat = 69 + 12 * Math.log2(frequencyHz / 440);
  const nearestMidi = Math.round(midiFloat);
  const centsOffset = (midiFloat - nearestMidi) * 100;

  return {
    prime: safePrime,
    baseC4Hz,
    octaveDivisor,
    frequencyHz: Number(frequencyHz.toFixed(4)),
    midiFloat: Number(midiFloat.toFixed(3)),
    nearestMidi,
    centsOffset: Number(centsOffset.toFixed(2)),
  };
}

export interface QOmegaLatticeAuditResult {
  quantumLatticeDistributive: boolean;
  classicalGlyphIndexDistributive: boolean;
  frobeniusWitnessDiff: number;
  architecturalResolution: string;
}

/**
 * Auditoría Q-Omega: demuestra explícitamente que el reticulado cuántico de
 * Birkhoff-von Neumann en C² es NO distributivo (frobeniusWitnessDiff > 0),
 * mientras que el índice tabular de glifos en Go/memoria usa orden total distributivo clásico.
 */
export function auditBirkhoffVonNeumannVsTotalOrder(): QOmegaLatticeAuditResult {
  const bvn = verifyBirkhoffVonNeumannNonDistributivity(
    projectorFromBlochAngle(1.5708, 0),
    projectorFromBlochAngle(0, 0),
    projectorFromBlochAngle(3.1416, 0),
  );
  return {
    quantumLatticeDistributive: bvn.distributiveHolds,
    classicalGlyphIndexDistributive: true,
    frobeniusWitnessDiff: Number(bvn.frobeniusDiff.toFixed(6)),
    architecturalResolution:
      'Separación formal Q-Omega: proyecciones SU(2) operan en retículo ortomodular no distributivo; tablas de despacho/glifos operan en orden total clásico.',
  };
}

