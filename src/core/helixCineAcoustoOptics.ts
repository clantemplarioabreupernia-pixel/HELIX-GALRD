import { HelixKinematics12Engine } from './helixKinematics12';

export type CameraShotCode = 0x01 | 0x02 | 0x03; // 0x01: Plano General, 0x02: Travelling, 0x03: Primer Plano

export interface CineAcoustoFrameState {
  shotCode: CameraShotCode;
  focalLengthMm: number;
  fovRad: number;
  bandLowEnergy: number;
  bandMidEnergy: number;
  bandHighEnergy: number;
  detectedSymbolPrime: number;
  dramaticTension: number;
}

const P33 = new Int32Array([2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137]);

/**
 * 1. Extraccion Espectral (RMS por banda + Demodulacion FSK sobre P33)
 * 2. Optica de Camara Cinematografica (FOV = 2 * atan(h / 2f) + Smoothstep)
 */
export function evaluateCineAcoustoFrame(
  fftMagnitudes: Float32Array | Uint8Array | null,
  sampleRate: number,
  elapsedSec: number,
  totalDurationSec = 60,
): CineAcoustoFrameState {
  const nBins = fftMagnitudes ? fftMagnitudes.length : 0;
  let low = 0, mid = 0, high = 0, peakVal = 0, peakBin = 0;

  if (fftMagnitudes && nBins > 0) {
    const isByte = fftMagnitudes instanceof Uint8Array;
    const norm = isByte ? 255 : 1;
    const b1 = Math.max(1, Math.floor(nBins * 0.12));
    const b2 = Math.max(b1 + 1, Math.floor(nBins * 0.45));

    for (let k = 1; k < nBins; k++) {
      const mag = fftMagnitudes[k] / norm;
      const sq = mag * mag;
      if (k < b1) low += sq;
      else if (k < b2) mid += sq;
      else high += sq;
      if (mag > peakVal) { peakVal = mag; peakBin = k; }
    }
    low = Math.sqrt(low / b1);
    mid = Math.sqrt(mid / (b2 - b1));
    high = Math.sqrt(high / Math.max(1, nBins - b2));
  }

  // Curva dramatica de 3 Actos (25% Planteamiento, 50% Confrontacion, 25% Resolucion)
  const tau = Math.min(1, Math.max(0, elapsedSec / Math.max(1, totalDurationSec)));
  const actCurve = tau < 0.25
    ? HelixKinematics12Engine.smootherstep(tau / 0.25) * 0.45
    : tau < 0.75
      ? 0.45 + Math.sin(((tau - 0.25) / 0.5) * Math.PI) * 0.55
      : (1 - HelixKinematics12Engine.smootherstep((tau - 0.75) / 0.25)) * 0.45;

  // Gramatica de camara segun energia y simbolo FSK
  const shotCode: CameraShotCode = peakVal > 0.65 || actCurve > 0.75 ? 0x03 : mid > 0.25 ? 0x02 : 0x01;
  const focalLengthMm = shotCode === 0x03 ? 85 : shotCode === 0x02 ? 50 : 24;
  const sensorHeightMm = 24; // Full Frame 35mm virtual
  const fovRad = 2 * Math.atan(sensorHeightMm / (2 * focalLengthMm));

  const freqHz = nBins > 0 ? (peakBin * (sampleRate * 0.5)) / nBins : 432;
  const primeIdx = Math.abs(Math.round(freqHz)) % P33.length;

  return {
    shotCode,
    focalLengthMm,
    fovRad,
    bandLowEnergy: low,
    bandMidEnergy: mid,
    bandHighEnergy: high,
    detectedSymbolPrime: P33[primeIdx],
    dramaticTension: Math.min(1, actCurve * 0.7 + low * 0.5),
  };
}


