import { sha256Hex } from './helixPcc';

const C_LIGHT = 299_792_458;
const BOLTZMANN = 1.380649e-23;
const T0_K = 290;

// ============================================================
// 1. ITU-R P.676-12 (Anexo 1): O2 (44 líneas) + H2O (35 líneas)
// ============================================================

export interface SatelliteParams {
  frequencyGHz: number;
  elevationDeg: number;
  surfacePressureHPa: number;
  surfaceTemperatureC: number;
  waterVaporDensityGm3: number;
  stationAltitudeKm: number;
}

export interface SatelliteAttenuationResult {
  oxygenSpecificDbPerKm: number;
  waterVaporSpecificDbPerKm: number;
  oxygenEquivalentHeightKm: number;
  waterVaporEquivalentHeightKm: number;
  zenithAttenuationDb: number;
  slantAttenuationDb: number;
}

const O2_LINES: ReadonlyArray<[number, number, number, number, number, number]> = [
  [50.474214, 0.975, 9.651, 6.69, 0.0, 2.566],
  [50.987745, 2.529, 8.653, 7.17, 0.0, 2.246],
  [51.50336, 6.193, 7.709, 7.64, 0.0, 1.947],
  [52.021429, 14.32, 6.819, 8.11, 0.0, 1.667],
  [52.542418, 31.24, 5.983, 8.58, 0.0, 1.388],
  [53.066934, 64.29, 5.201, 9.06, 0.0, 1.349],
  [53.595775, 124.6, 4.474, 9.55, 0.0, 2.227],
  [54.130025, 227.3, 3.8, 9.96, 0.0, 3.17],
  [54.67118, 389.7, 3.182, 10.37, 0.0, 3.558],
  [55.221384, 627.1, 2.618, 10.89, 0.0, 2.56],
  [55.783815, 945.3, 2.109, 11.34, 0.0, -1.172],
  [56.264774, 543.4, 0.014, 17.03, 0.0, 3.525],
  [56.363399, 1331.8, 1.654, 11.89, 0.0, -2.378],
  [56.968211, 1746.6, 1.255, 12.23, 0.0, -3.545],
  [57.612486, 2120.1, 0.91, 12.62, 0.0, -5.416],
  [58.323877, 2363.7, 0.621, 12.95, 0.0, -1.932],
  [58.446588, 1442.1, 0.083, 14.91, 0.0, 6.768],
  [59.164204, 2379.9, 0.387, 13.53, 0.0, -6.561],
  [59.590983, 2090.7, 0.207, 14.08, 0.0, 6.957],
  [60.306056, 2103.4, 0.207, 14.15, 0.0, -6.395],
  [60.434778, 2438.0, 0.386, 13.39, 0.0, 6.342],
  [61.150562, 2479.5, 0.621, 12.92, 0.0, 1.014],
  [61.800158, 2275.9, 0.91, 12.63, 0.0, 5.014],
  [62.41122, 1915.4, 1.255, 12.17, 0.0, 3.029],
  [62.486253, 1503.0, 0.083, 15.13, 0.0, -4.499],
  [62.997984, 1490.2, 1.654, 11.74, 0.0, 1.856],
  [63.568526, 1078.0, 2.108, 11.34, 0.0, 0.658],
  [64.127775, 728.7, 2.617, 10.88, 0.0, -3.036],
  [64.67891, 461.3, 3.181, 10.38, 0.0, -3.968],
  [65.224078, 274.0, 3.8, 9.96, 0.0, -3.528],
  [65.764779, 153.0, 4.473, 9.55, 0.0, -2.548],
  [66.302096, 80.4, 5.2, 9.06, 0.0, -1.66],
  [66.836834, 39.8, 5.982, 8.58, 0.0, -1.68],
  [67.369601, 18.56, 6.818, 8.11, 0.0, -1.956],
  [67.900868, 8.172, 7.708, 7.64, 0.0, -2.216],
  [68.431006, 3.397, 8.652, 7.17, 0.0, -2.492],
  [68.960312, 1.334, 9.65, 6.69, 0.0, -2.773],
  [118.750334, 940.3, 0.01, 16.64, 0.0, -0.439],
  [368.498246, 67.4, 0.048, 16.4, 0.0, 0.0],
  [424.76302, 637.7, 0.044, 16.4, 0.0, 0.0],
  [487.249273, 237.4, 0.049, 16.0, 0.0, 0.0],
  [715.392902, 98.1, 0.145, 16.0, 0.0, 0.0],
  [773.83949, 572.3, 0.141, 16.2, 0.0, 0.0],
  [834.145546, 183.1, 0.145, 14.7, 0.0, 0.0],
];

const H2O_LINES: ReadonlyArray<[number, number, number, number, number]> = [
  [22.23508, 0.1079, 2.144, 26.38, 0.76],
  [67.80396, 0.0011, 8.732, 28.58, 0.69],
  [119.99594, 0.0007, 8.353, 29.48, 0.7],
  [183.310087, 2.273, 0.668, 29.06, 0.77],
  [321.22563, 0.047, 6.179, 24.04, 0.67],
  [325.152888, 1.514, 1.541, 28.23, 0.64],
  [336.227764, 0.001, 9.825, 26.93, 0.69],
  [380.197353, 11.67, 1.048, 28.11, 0.54],
  [390.134508, 0.0045, 7.347, 21.52, 0.63],
  [437.346667, 0.0632, 5.048, 18.45, 0.6],
  [439.150807, 0.9098, 3.595, 20.07, 0.63],
  [443.018343, 0.192, 5.048, 15.55, 0.6],
  [448.001085, 10.41, 1.405, 25.64, 0.66],
  [470.888999, 0.325, 3.597, 21.34, 0.66],
  [474.689092, 1.26, 2.379, 23.2, 0.65],
  [488.490108, 0.252, 2.852, 25.86, 0.69],
  [503.568532, 0.0372, 6.731, 16.12, 0.61],
  [504.482692, 0.0124, 6.731, 16.12, 0.61],
  [547.67644, 0.978, 0.158, 26.0, 0.7],
  [552.02096, 0.184, 0.158, 26.0, 0.7],
  [556.935985, 497.0, 0.159, 30.86, 0.69],
  [620.700807, 5.015, 2.391, 24.38, 0.71],
  [645.766085, 0.0067, 8.633, 18.0, 0.6],
  [658.00528, 0.2732, 7.816, 32.1, 0.69],
  [752.033113, 243.4, 0.396, 30.86, 0.68],
  [841.051732, 0.0134, 8.177, 15.9, 0.33],
  [859.965698, 0.1325, 8.055, 30.6, 0.68],
  [899.303175, 0.0547, 7.914, 29.85, 0.68],
  [902.611085, 0.0386, 8.429, 28.65, 0.7],
  [906.205957, 0.1836, 5.11, 24.08, 0.7],
  [916.171582, 8.4, 1.441, 26.73, 0.7],
  [923.118427, 0.0869, 10.22, 29.0, 0.7],
  [970.315022, 9.009, 1.919, 25.5, 0.64],
  [987.926764, 134.6, 0.257, 29.85, 0.68],
  [1780.0, 17506.0, 0.952, 196.3, 0.69],
];

export function specificAttenuationOxygen(
  frequencyGHz: number,
  pressureHPa: number,
  temperatureC: number,
  waterVaporDensityGm3: number,
): number {
  const theta = 300 / (temperatureC + 273.15);
  const e = (waterVaporDensityGm3 * (temperatureC + 273.15)) / 216.7;
  const p = pressureHPa;

  let sum = 0;
  for (const [f0, a1, a2, a3, a4, a5] of O2_LINES) {
    const df = a3 * 1e-4 * (p * Math.pow(theta, 0.8 - a4) + 1.1 * e * theta);
    const S = a1 * 1e-7 * p * Math.pow(theta, 3) * Math.exp(a2 * (1 - theta));
    const delta = a5 * (p + e) * Math.pow(theta, 0.8) * 1e-4;
    const x = frequencyGHz - f0;
    const denom = x * x + df * df;
    sum += ((S * (df / Math.PI)) / denom) * (1 + (delta * x) / df);
  }

  const d = 5.6e-4 * (p + e) * Math.pow(theta, 0.8);
  const dryContinuum =
    frequencyGHz *
    p *
    theta *
    theta *
    (6.14e-5 / (d * (1 + (frequencyGHz / d) ** 2)) +
      (1.4e-12 * p * Math.pow(theta, 1.5)) / (1 + 1.9e-5 * Math.pow(frequencyGHz, 1.5)));

  return Math.max(0, 0.182 * frequencyGHz * (sum + dryContinuum));
}

export function specificAttenuationWaterVapor(
  frequencyGHz: number,
  pressureHPa: number,
  temperatureC: number,
  waterVaporDensityGm3: number,
): number {
  const theta = 300 / (temperatureC + 273.15);
  const e = (waterVaporDensityGm3 * (temperatureC + 273.15)) / 216.7;
  const p = pressureHPa;

  let sum = 0;
  for (const [f0, b1, b2, b3, b4] of H2O_LINES) {
    const df = b3 * 1e-4 * (p * Math.pow(theta, b4) + b2 * e * Math.pow(theta, b4));
    const S = b1 * 1e-1 * e * Math.pow(theta, 3.5) * Math.exp(b2 * (1 - theta));
    const x = frequencyGHz - f0;
    sum += (S * (df / Math.PI)) / (x * x + df * df);
  }

  const wetContinuum =
    frequencyGHz *
    frequencyGHz *
    Math.pow(theta, 3) *
    e *
    (3.57e-7 * e * Math.pow(theta, 0.2) + 1.0e-5);

  return Math.max(0, 0.182 * frequencyGHz * (sum + wetContinuum));
}

export function equivalentHeights(
  _frequencyGHz: number,
  pressureHPa: number,
  _temperatureC: number,
  _waterVaporDensityGm3: number,
): { hOxygenKm: number; hWaterVaporKm: number } {
  const rp = Math.max(0.05, pressureHPa / 1013.25);
  const hOxygenKm = 6.1 / (1 + 0.17 * Math.pow(rp, -1.1));
  const hWaterVaporKm = 1.6 / (1 + 0.1 * Math.pow(rp, -1.1));
  return { hOxygenKm, hWaterVaporKm };
}

export function calculateSatelliteAttenuation(p: SatelliteParams): SatelliteAttenuationResult {
  const gammaO = specificAttenuationOxygen(
    p.frequencyGHz,
    p.surfacePressureHPa,
    p.surfaceTemperatureC,
    p.waterVaporDensityGm3,
  );
  const gammaW = specificAttenuationWaterVapor(
    p.frequencyGHz,
    p.surfacePressureHPa,
    p.surfaceTemperatureC,
    p.waterVaporDensityGm3,
  );
  const { hOxygenKm, hWaterVaporKm } = equivalentHeights(
    p.frequencyGHz,
    p.surfacePressureHPa,
    p.surfaceTemperatureC,
    p.waterVaporDensityGm3,
  );
  const altKm = Math.max(0, p.stationAltitudeKm);
  const rO = Math.exp(-altKm / hOxygenKm);
  const rW = Math.exp(-altKm / hWaterVaporKm);
  const zenithDb = gammaO * hOxygenKm * rO + gammaW * hWaterVaporKm * rW;
  const el = Math.min(90, Math.max(5, p.elevationDeg));
  const slantDb = zenithDb / Math.sin((el * Math.PI) / 180);

  return {
    oxygenSpecificDbPerKm: gammaO,
    waterVaporSpecificDbPerKm: gammaW,
    oxygenEquivalentHeightKm: hOxygenKm,
    waterVaporEquivalentHeightKm: hWaterVaporKm,
    zenithAttenuationDb: zenithDb,
    slantAttenuationDb: slantDb,
  };
}

// ============================================================
// 2. 3GPP TR 38.901 V17.0.0 mmWave Path Loss (FR2)
// ============================================================

export type MmWaveScenario = 'UMi-LoS' | 'UMi-NLoS' | 'InH-LoS' | 'InH-NLoS' | 'RMa-LoS';

export interface MmWaveParams {
  frequencyGHz: number;
  distanceM: number;
  scenario: MmWaveScenario;
  bsHeightM: number;
  utHeightM: number;
  shadowingSigmaDb?: number;
}

export interface MmWavePathLossResult {
  fspl1mDb: number;
  pathLossDb: number;
  breakpointDistanceM: number | null;
  appliedSigmaDb: number;
}

export function fsplAt1m(frequencyGHz: number): number {
  return 32.4 + 20 * Math.log10(Math.max(0.1, frequencyGHz));
}

export function breakpointDistance(
  frequencyGHz: number,
  bsHeightM: number,
  utHeightM: number,
): number {
  const fcHz = Math.max(0.1, frequencyGHz) * 1e9;
  const hBS = Math.max(0.5, bsHeightM - 1.0);
  const hUT = Math.max(0.2, utHeightM - 1.0);
  return (4 * hBS * hUT * fcHz) / C_LIGHT;
}

export function calculateMmWavePathLoss(p: MmWaveParams): MmWavePathLossResult {
  const d = Math.max(p.distanceM, 1);
  const fc = Math.max(0.4, p.frequencyGHz);
  const fspl1m = fsplAt1m(fc);
  const log10 = Math.log10;

  let pl = 0;
  let bp: number | null = null;
  let sigma = 4.0;

  switch (p.scenario) {
    case 'UMi-LoS': {
      bp = breakpointDistance(fc, p.bsHeightM, p.utHeightM);
      if (d <= bp) {
        pl = 32.4 + 21 * log10(d) + 20 * log10(fc);
      } else {
        const dh = p.bsHeightM - p.utHeightM;
        pl = 32.4 + 40 * log10(d) + 20 * log10(fc) - 9.5 * log10(bp * bp + dh * dh);
      }
      sigma = 4.0;
      break;
    }
    case 'UMi-NLoS': {
      pl = 35.3 * log10(d) + 22.4 + 21.3 * log10(fc) - 0.3 * (p.utHeightM - 1.5);
      sigma = 7.82;
      break;
    }
    case 'InH-LoS': {
      pl = 32.4 + 17.3 * log10(d) + 20 * log10(fc);
      sigma = 3.0;
      break;
    }
    case 'InH-NLoS': {
      pl = 38.3 * log10(d) + 17.3 + 24.9 * log10(fc);
      sigma = 8.03;
      break;
    }
    case 'RMa-LoS': {
      const h = Math.max(5, p.bsHeightM);
      const hPow = Math.pow(h, 1.72);
      const fcHz = fc * 1e9;
      pl =
        20 * log10((40 * Math.PI * d * fcHz) / 3) +
        Math.min(0.03 * hPow, 10) * log10(d) -
        Math.min(0.044 * hPow, 14.77) +
        0.002 * log10(h) * d;
      sigma = 4.0;
      break;
    }
  }

  return {
    fspl1mDb: fspl1m,
    pathLossDb: pl,
    breakpointDistanceM: bp,
    appliedSigmaDb: p.shadowingSigmaDb ?? sigma,
  };
}

// ============================================================
// 3. FFT Radix-2 (Cooley-Tukey) + Radar FMCW 77 GHz + CA-CFAR
// ============================================================

export interface ComplexArray {
  re: Float64Array;
  im: Float64Array;
}

export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

export function fft(input: ComplexArray): ComplexArray {
  const n = input.re.length;
  if (!isPowerOfTwo(n)) throw new Error('FFT: tamaño debe ser potencia de 2');

  const re = new Float64Array(input.re);
  const im = new Float64Array(input.im);

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k];
        const uIm = im[i + k];
        const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + len / 2] = uRe - vRe;
        im[i + k + len / 2] = uIm - vIm;
        const tmpRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = tmpRe;
      }
    }
  }

  return { re, im };
}

export function magnitudeDb(c: ComplexArray, floor = -120): Float64Array {
  const n = c.re.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const mag = Math.hypot(c.re[i], c.im[i]);
    out[i] = Math.max(20 * Math.log10(mag + 1e-12), floor);
  }
  return out;
}

export function fftshift(arr: Float64Array): Float64Array {
  const n = arr.length;
  const half = n >> 1;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = arr[(i + half) % n];
  }
  return out;
}

export interface RadarEquationParams {
  txPowerDbm: number;
  txGainDbi: number;
  rxGainDbi: number;
  frequencyGHz: number;
  targetRcsM2: number;
  rangeM: number;
  systemLossDb: number;
  bandwidthHz: number;
  noiseFigureDb: number;
  atmosphericLossDbPerKm: number;
}

export interface RadarEquationResult {
  wavelengthM: number;
  receivedPowerDbm: number;
  noiseFloorDbm: number;
  snrDb: number;
  maxRangeM: number;
}

export function calculateRadarEquation(p: RadarEquationParams): RadarEquationResult {
  const lambda = C_LIGHT / (Math.max(1, p.frequencyGHz) * 1e9);
  const PtW = Math.pow(10, p.txPowerDbm / 10) / 1000;
  const Gt = Math.pow(10, p.txGainDbi / 10);
  const Gr = Math.pow(10, p.rxGainDbi / 10);
  const range = Math.max(0.5, p.rangeM);

  const atmDb = 2 * p.atmosphericLossDbPerKm * (range / 1000);
  const atmFactor = Math.pow(10, -atmDb / 10);
  const sysFactor = Math.pow(10, -p.systemLossDb / 10);

  const PrW =
    ((PtW * Gt * Gr * lambda * lambda * p.targetRcsM2) /
      (Math.pow(4 * Math.PI, 3) * Math.pow(range, 4))) *
    atmFactor *
    sysFactor;

  const receivedPowerDbm = 10 * Math.log10(Math.max(1e-30, PrW) * 1000);
  const kTBW = BOLTZMANN * T0_K * Math.max(1, p.bandwidthHz);
  const noiseFloorDbm = 10 * Math.log10(kTBW * 1000) + p.noiseFigureDb;
  const snrDb = receivedPowerDbm - noiseFloorDbm;

  const snrMin = 13;
  const maxRangeM = Math.pow(
    (PtW * Gt * Gr * lambda * lambda * p.targetRcsM2 * atmFactor * sysFactor) /
      ((Math.pow(4 * Math.PI, 3) * Math.pow(10, (noiseFloorDbm + snrMin) / 10)) / 1000),
    0.25,
  );

  return { wavelengthM: lambda, receivedPowerDbm, noiseFloorDbm, snrDb, maxRangeM };
}

export interface FmcwParams {
  carrierGHz: number;
  bandwidthHz: number;
  chirpTimeS: number;
  numChirps: number;
  numSamplesPerChirp: number;
  sampleRateHz: number;
}

export interface RadarTarget {
  rangeM: number;
  velocityMps: number;
  rcsM2: number;
}

export interface RangeDopplerMatrix {
  matrix: number[][];
  rangeAxisM: number[];
  velocityAxisMps: number[];
}

export interface CfarDetection {
  dopplerIdx: number;
  rangeIdx: number;
  rangeM: number;
  velocityMps: number;
  magnitudeDb: number;
}

function createMulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulateBeatSignal(
  params: FmcwParams,
  targets: RadarTarget[],
  seed = 7701,
): ComplexArray[] {
  const { numChirps, numSamplesPerChirp, chirpTimeS, bandwidthHz, sampleRateHz, carrierGHz } = params;
  const slope = bandwidthHz / chirpTimeS;
  const fc = carrierGHz * 1e9;
  const lambda = C_LIGHT / fc;
  const rand = createMulberry32(seed);

  const chirps: ComplexArray[] = [];
  for (let chirp = 0; chirp < numChirps; chirp++) {
    const re = new Float64Array(numSamplesPerChirp);
    const im = new Float64Array(numSamplesPerChirp);
    const slowTime = chirp * chirpTimeS;

    for (let n = 0; n < numSamplesPerChirp; n++) {
      const t = n / sampleRateHz;
      let sumRe = 0;
      let sumIm = 0;

      for (const tgt of targets) {
        const tau = (2 * tgt.rangeM) / C_LIGHT;
        const fBeat = slope * tau;
        const fDop = (2 * tgt.velocityMps) / lambda;
        const amp = Math.sqrt(Math.max(0.01, tgt.rcsM2)) / Math.max(tgt.rangeM * tgt.rangeM, 1);
        const phase = 2 * Math.PI * ((fBeat + fDop) * t + fDop * slowTime);
        sumRe += amp * Math.cos(phase);
        sumIm += amp * Math.sin(phase);
      }

      const u1 = Math.max(1e-12, rand());
      const u2 = rand();
      const mag = Math.sqrt(-2 * Math.log(u1));
      re[n] = sumRe + 1e-6 * mag * Math.cos(2 * Math.PI * u2);
      im[n] = sumIm + 1e-6 * mag * Math.sin(2 * Math.PI * u2);
    }
    chirps.push({ re, im });
  }
  return chirps;
}

export function computeRangeDoppler(params: FmcwParams, chirps: ComplexArray[]): RangeDopplerMatrix {
  const { numSamplesPerChirp, numChirps, chirpTimeS, bandwidthHz, carrierGHz } = params;
  const rangeFfts = chirps.map((c) => fft(c));
  const rdMatrix: number[][] = Array.from({ length: numChirps }, () =>
    new Array<number>(numSamplesPerChirp).fill(-120),
  );

  for (let r = 0; r < numSamplesPerChirp; r++) {
    const re = new Float64Array(numChirps);
    const im = new Float64Array(numChirps);
    for (let c = 0; c < numChirps; c++) {
      re[c] = rangeFfts[c].re[r];
      im[c] = rangeFfts[c].im[r];
    }
    const dopFft = fft({ re, im });
    const dopMagDb = fftshift(magnitudeDb(dopFft, -120));
    for (let d = 0; d < numChirps; d++) {
      rdMatrix[d][r] = dopMagDb[d];
    }
  }

  const rangeResolution = C_LIGHT / (2 * bandwidthHz);
  const rangeAxisM = Array.from({ length: numSamplesPerChirp }, (_, r) => r * rangeResolution);
  const lambda = C_LIGHT / (carrierGHz * 1e9);
  const dopplerRes = lambda / (2 * numChirps * chirpTimeS);
  const velocityAxisMps = Array.from({ length: numChirps }, (_, d) => (d - numChirps / 2) * dopplerRes);

  return { matrix: rdMatrix, rangeAxisM, velocityAxisMps };
}

export function cfar2d(
  rd: RangeDopplerMatrix,
  guardCells = 1,
  trainingCells = 3,
  pfa = 1e-4,
): CfarDetection[] {
  const { matrix, rangeAxisM, velocityAxisMps } = rd;
  const nD = matrix.length;
  const nR = matrix[0]?.length ?? 0;
  const detections: CfarDetection[] = [];

  const nTrain = Math.pow(2 * (guardCells + trainingCells) + 1, 2) - Math.pow(2 * guardCells + 1, 2);
  if (nTrain <= 0) return detections;
  const alpha = nTrain * (Math.pow(pfa, -1 / nTrain) - 1);

  for (let d = guardCells + trainingCells; d < nD - guardCells - trainingCells; d++) {
    for (let r = guardCells + trainingCells; r < nR - guardCells - trainingCells; r++) {
      const cut = matrix[d][r];
      let sum = 0;
      let count = 0;
      for (let dd = -trainingCells - guardCells; dd <= trainingCells + guardCells; dd++) {
        for (let rr = -trainingCells - guardCells; rr <= trainingCells + guardCells; rr++) {
          if (Math.abs(dd) <= guardCells && Math.abs(rr) <= guardCells) continue;
          sum += Math.pow(10, matrix[d + dd][r + rr] / 10);
          count++;
        }
      }
      const noise = sum / Math.max(1, count);
      const cutLin = Math.pow(10, cut / 10);
      if (cutLin > alpha * noise) {
        detections.push({
          dopplerIdx: d,
          rangeIdx: r,
          rangeM: rangeAxisM[r],
          velocityMps: velocityAxisMps[d],
          magnitudeDb: cut,
        });
      }
    }
  }
  return detections;
}

// ============================================================
// 4. Recocido Simulado Determinista sobre Rastrigin 2D
// ============================================================

export interface AnnealingReport {
  bestEnergy: number;
  finalEnergy: number;
  bestX: number;
  bestY: number;
  stepsExecuted: number;
  acceptedMoves: number;
  finalTemperature: number;
}

export function rastriginEnergy2D(x: number, y: number): number {
  const A = 10;
  return A * 2 + (x * x - A * Math.cos(2 * Math.PI * x)) + (y * y - A * Math.cos(2 * Math.PI * y));
}

export function runRastriginAnnealing(
  initialTemperature = 100,
  coolingRate = 0.995,
  iterations = 1000,
  seed = 1370,
): AnnealingReport {
  const temp0 = Math.max(0.1, Math.min(2000, initialTemperature));
  const rate = Math.max(0.5, Math.min(0.9999, coolingRate));
  const maxIter = Math.max(1, Math.min(5000, Math.floor(iterations)));
  const rand = createMulberry32(seed);

  let x = (rand() - 0.5) * 8;
  let y = (rand() - 0.5) * 8;
  let currentEnergy = rastriginEnergy2D(x, y);
  let bestEnergy = currentEnergy;
  let bestX = x;
  let bestY = y;
  let T = temp0;
  let stepsExecuted = 0;
  let acceptedMoves = 0;

  for (let i = 0; i < maxIter && T > 1e-4; i++) {
    const stepScale = Math.max(0.08, Math.min(1.5, Math.sqrt(T / temp0) * 1.2));
    const nx = Math.max(-5.12, Math.min(5.12, x + (rand() - 0.5) * stepScale));
    const ny = Math.max(-5.12, Math.min(5.12, y + (rand() - 0.5) * stepScale));
    const nE = rastriginEnergy2D(nx, ny);
    const dE = nE - currentEnergy;

    if (dE < 0 || rand() < Math.exp(-dE / T)) {
      x = nx;
      y = ny;
      currentEnergy = nE;
      acceptedMoves++;
      if (currentEnergy < bestEnergy) {
        bestEnergy = currentEnergy;
        bestX = x;
        bestY = y;
      }
    }
    T *= rate;
    stepsExecuted++;
  }

  return {
    bestEnergy,
    finalEnergy: currentEnergy,
    bestX,
    bestY,
    stepsExecuted,
    acceptedMoves,
    finalTemperature: T,
  };
}

// ============================================================
// 5. Criptografía Real: HMAC-SHA256 (RFC 2104), Merkle SHA-256 & Ed25519
// ============================================================

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function sha256BytesSync(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8;
  const paddedLen = Math.ceil((data.length + 9) / 64) * 64;
  const buf = new Uint8Array(paddedLen);
  buf.set(data);
  buf[data.length] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((val, idx) => outView.setUint32(idx * 4, val, false));
  return out;
}

export function hmacSha256HexSync(key: string, message: string): string {
  const enc = new TextEncoder();
  let keyBytes: Uint8Array = enc.encode(key);
  if (keyBytes.length > 64) {
    keyBytes = sha256BytesSync(keyBytes);
  }
  const blockKey = new Uint8Array(64);
  blockKey.set(keyBytes);

  const oKeyPad = new Uint8Array(64);
  const iKeyPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    oKeyPad[i] = blockKey[i] ^ 0x5c;
    iKeyPad[i] = blockKey[i] ^ 0x36;
  }

  const msgBytes = enc.encode(message);
  const inner = new Uint8Array(64 + msgBytes.length);
  inner.set(iKeyPad, 0);
  inner.set(msgBytes, 64);
  const innerDigest = sha256BytesSync(inner);

  const outer = new Uint8Array(64 + innerDigest.length);
  outer.set(oKeyPad, 0);
  outer.set(innerDigest, 64);
  const finalDigest = sha256BytesSync(outer);
  return Array.from(finalDigest)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export interface MerkleProofStep {
  hash: string;
  position: 'left' | 'right';
}

export interface SyncMerkleTree {
  levels: string[][];
  root: string;
  leaves: string[];
}

export function buildMerkleTreeSync(leaves: string[]): SyncMerkleTree {
  if (leaves.length === 0) {
    const empty = sha256Hex('');
    return { levels: [[empty]], root: empty, leaves: [] };
  }
  const hashedLeaves = leaves.map((l) => sha256Hex(l));
  const levels: string[][] = [hashedLeaves];
  let current = hashedLeaves;

  while (current.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = current[i + 1] ?? current[i];
      next.push(sha256Hex(left + right));
    }
    levels.push(next);
    current = next;
  }

  return { levels, root: current[0], leaves: [...leaves] };
}

export function getMerkleProofSync(tree: SyncMerkleTree, index: number): MerkleProofStep[] {
  if (index < 0 || index >= tree.levels[0].length) {
    throw new Error(`Índice Merkle ${index} fuera de rango`);
  }
  const proof: MerkleProofStep[] = [];
  let idx = index;
  for (let level = 0; level < tree.levels.length - 1; level++) {
    const nodes = tree.levels[level];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    const sibling = nodes[siblingIdx] ?? nodes[idx];
    proof.push({ hash: sibling, position: isRight ? 'left' : 'right' });
    idx = Math.floor(idx / 2);
  }
  return proof;
}

export function verifyMerkleProofSync(
  leaf: string,
  proof: MerkleProofStep[],
  root: string,
): boolean {
  let current = sha256Hex(leaf);
  for (const step of proof) {
    current =
      step.position === 'left'
        ? sha256Hex(step.hash + current)
        : sha256Hex(current + step.hash);
  }
  return constantTimeEqualHex(current, root);
}

// Web Crypto API real para Ed25519 (uso asíncrono en browser y Node >= 20)
export async function generateEd25519KeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']) as Promise<CryptoKeyPair>;
}

export async function exportPublicKeyHex(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return Array.from(new Uint8Array(raw))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function signEd25519(privateKey: CryptoKey, message: string): Promise<string> {
  const sig = await crypto.subtle.sign('Ed25519', privateKey, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyEd25519(
  publicKey: CryptoKey,
  message: string,
  signatureHex: string,
): Promise<boolean> {
  try {
    const sigBytes = hexToBytes(signatureHex);
    const sigBuffer = new Uint8Array(sigBytes).buffer;
    return await crypto.subtle.verify(
      'Ed25519',
      publicKey,
      sigBuffer,
      new TextEncoder().encode(message),
    );
  } catch {
    return false;
  }
}

export async function importPublicKeyHex(hex: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(hex);
  const keyBuffer = new Uint8Array(keyBytes).buffer;
  return crypto.subtle.importKey('raw', keyBuffer, { name: 'Ed25519' }, true, ['verify']);
}
