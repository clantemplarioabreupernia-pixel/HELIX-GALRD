import type { PauliSoAPhysicsState } from '../utils/helixPhysics';
import type { SoAHolographicBuffer } from '../utils/helixSignal';

export const NEMESIS_THERMAL_CUTOFF = 0.001;
export const WEBER_PERCEPTUAL_K = 0.001;

export const NEMESIS_GAMMA_PRESETS = {
  STANDARD: 0.02,
  LONG_MEMORY: 0.005,
  FAST_RESTORE: 0.055,
} as const;

export type NemesisRelaxationMode = keyof typeof NEMESIS_GAMMA_PRESETS | 'CUSTOM';

export interface NemesisGovernorConfig {
  mode?: NemesisRelaxationMode;
  gamma?: number;
  cutoffThreshold?: number;
  weberK?: number;
}

export interface NemesisScalarStepResult {
  tension: number;
  rotX: number;
  rotY: number;
  settledToZero: boolean;
  underflowPrevented: boolean;
}

export interface NemesisRelaxationReport {
  mode: NemesisRelaxationMode;
  gamma: number;
  cutoffThreshold: number;
  weberK: number;
  totalCells: number;
  activeCells: number;
  settledToZeroCells: number;
  underflowPreventedCount: number;
  maxTension: number;
  meanTension: number;
  maxPhaseAngle: number;
  weberDecision: 'RENDER_FRAME' | 'SKIP_FRAME';
  weberDeltaRatio: number;
  estimatedFramesToRest: number;
  thermalFloorReached: boolean;
  provedBounded: true;
}

/**
 * Controlador de Relajación Viscoelástica — Ley Némesis de Cauchy.
 *
 * Aplica disipación exponencial T_{t+1} = T_t - (T_t * γ) sobre celdas Biopíxel
 * Pauli-SoA (28 B/celda Zero-GC) e impone un umbral de corte estricto
 * T_cut = 0.001f para limpiar simétricamente tensión, velocidad y rotación hacia
 * el cero absoluto térmico (0.0f), evitando subflujo flotante (underflow) en VRAM.
 */
export class NemesisGovernor {
  public readonly mode: NemesisRelaxationMode;
  public readonly gamma: number;
  public readonly cutoffThreshold: number;
  public readonly weberK: number;

  private lastMeanTension = -1;

  constructor(config: NemesisGovernorConfig = {}) {
    const requestedMode = config.mode ?? (config.gamma !== undefined ? 'CUSTOM' : 'STANDARD');
    const rawGamma =
      config.gamma !== undefined
        ? config.gamma
        : requestedMode !== 'CUSTOM'
          ? NEMESIS_GAMMA_PRESETS[requestedMode]
          : NEMESIS_GAMMA_PRESETS.STANDARD;

    this.mode = requestedMode;
    this.gamma = Math.min(0.9999, Math.max(1e-5, Number.isFinite(rawGamma) ? rawGamma : NEMESIS_GAMMA_PRESETS.STANDARD));
    const rawCutoff = config.cutoffThreshold ?? NEMESIS_THERMAL_CUTOFF;
    this.cutoffThreshold = Math.min(0.25, Math.max(1e-6, Number.isFinite(rawCutoff) ? rawCutoff : NEMESIS_THERMAL_CUTOFF));
    const rawK = config.weberK ?? WEBER_PERCEPTUAL_K;
    this.weberK = Math.min(0.5, Math.max(1e-6, Number.isFinite(rawK) ? rawK : WEBER_PERCEPTUAL_K));
  }

  /**
   * Predice el número de fotogramas hasta alcanzar el suelo térmico T < T_cut.
   */
  public predictFramesToRest(initialTension = 1.0): number {
    if (!Number.isFinite(initialTension) || initialTension < this.cutoffThreshold) {
      return 0;
    }
    const ratio = this.cutoffThreshold / initialTension;
    const denom = Math.log(1 - this.gamma);
    if (denom >= 0) return 0;
    return Math.max(1, Math.ceil(Math.log(ratio) / denom));
  }

  /**
   * Paso escalar de la Ley Némesis de Cauchy con limpieza simétrica RotX/RotY
   * cuando T_{t+1} < T_cut (0.001f).
   */
  public stepScalar(
    tension: number,
    rotX = 0,
    rotY = 0,
  ): NemesisScalarStepResult {
    if (!Number.isFinite(tension) || tension <= 0) {
      return {
        tension: 0,
        rotX: 0,
        rotY: 0,
        settledToZero: true,
        underflowPrevented: tension !== 0 || rotX !== 0 || rotY !== 0,
      };
    }

    const attenuated = tension - tension * this.gamma;
    if (!Number.isFinite(attenuated) || attenuated < this.cutoffThreshold) {
      // Retorno estricto al suelo físico térmico 0.0f y limpieza angular simétrica
      return {
        tension: 0,
        rotX: 0,
        rotY: 0,
        settledToZero: true,
        underflowPrevented: true,
      };
    }

    const angularDecay = 1 - this.gamma;
    return {
      tension: attenuated,
      rotX: Math.abs(rotX * angularDecay) < this.cutoffThreshold ? 0 : rotX * angularDecay,
      rotY: Math.abs(rotY * angularDecay) < this.cutoffThreshold ? 0 : rotY * angularDecay,
      settledToZero: false,
      underflowPrevented: false,
    };
  }

  /**
   * Ejecución Zero-GC directamente sobre el búfer contiguo Pauli-SoA (28 B/celda)
   * y los arreglos tipados de velocidad/tensión, con compuerta perceptual Weber-Fechner.
   */
  public stepSoABuffer(
    soa: SoAHolographicBuffer,
    phys: PauliSoAPhysicsState,
    prevMetricOverride?: number,
  ): NemesisRelaxationReport {
    const n = soa.capacity;
    const gamma = this.gamma;
    const cutoff = this.cutoffThreshold;
    const oneMinusGamma = 1 - gamma;

    let activeCells = 0;
    let settledToZeroCells = 0;
    let underflowPreventedCount = 0;
    let maxTension = 0;
    let sumTension = 0;
    let maxPhaseAngle = 0;

    for (let i = 0; i < n; i++) {
      const tCur = phys.tension[i];
      if (!Number.isFinite(tCur) || tCur <= 0) {
        if (tCur !== 0 || phys.vx[i] !== 0 || phys.vy[i] !== 0 || phys.vz[i] !== 0 || soa.phaseQuad[i] !== 0 || soa.amp[i] !== 0) {
          phys.tension[i] = 0;
          phys.vx[i] = 0;
          phys.vy[i] = 0;
          phys.vz[i] = 0;
          soa.amp[i] = 0;
          soa.phaseQuad[i] = 0;
          underflowPreventedCount++;
        }
        settledToZeroCells++;
        continue;
      }

      const tNext = tCur - tCur * gamma;
      if (!Number.isFinite(tNext) || tNext < cutoff) {
        // Corte térmico estricto: cero absoluto en tensión, velocidad y fase angular
        phys.tension[i] = 0;
        phys.vx[i] = 0;
        phys.vy[i] = 0;
        phys.vz[i] = 0;
        soa.amp[i] = 0;
        soa.phaseQuad[i] = 0;
        settledToZeroCells++;
        underflowPreventedCount++;
        continue;
      }

      phys.tension[i] = tNext;
      phys.vx[i] *= oneMinusGamma;
      phys.vy[i] *= oneMinusGamma;
      phys.vz[i] *= oneMinusGamma;
      soa.amp[i] = Math.max(0, soa.amp[i] * oneMinusGamma);

      const p = soa.phaseQuad[i];
      if (Math.abs(p) > maxPhaseAngle) maxPhaseAngle = Math.abs(p);

      activeCells++;
      sumTension += tNext;
      if (tNext > maxTension) maxTension = tNext;
    }

    const meanTension = n > 0 ? sumTension / n : 0;
    const prevMetric = prevMetricOverride !== undefined ? prevMetricOverride : this.lastMeanTension;

    let weberDecision: 'RENDER_FRAME' | 'SKIP_FRAME' = 'RENDER_FRAME';
    let weberDeltaRatio = 1;

    if (prevMetric >= 0) {
      const denom = Math.max(1e-4, Math.abs(prevMetric));
      weberDeltaRatio = Math.abs(meanTension - prevMetric) / denom;
      weberDecision = weberDeltaRatio < this.weberK ? 'SKIP_FRAME' : 'RENDER_FRAME';
    }

    if (weberDecision === 'RENDER_FRAME') {
      this.lastMeanTension = meanTension;
    }

    return {
      mode: this.mode,
      gamma,
      cutoffThreshold: cutoff,
      weberK: this.weberK,
      totalCells: n,
      activeCells,
      settledToZeroCells,
      underflowPreventedCount,
      maxTension,
      meanTension,
      maxPhaseAngle,
      weberDecision,
      weberDeltaRatio,
      estimatedFramesToRest: this.predictFramesToRest(maxTension),
      thermalFloorReached: activeCells === 0 && maxTension === 0,
      provedBounded: true,
    };
  }

  public resetWeberBaseline(): void {
    this.lastMeanTension = -1;
  }
}

export function createNemesisGovernor(config: NemesisGovernorConfig = {}): NemesisGovernor {
  return new NemesisGovernor(config);
}

/**
 * Helper puro para aplicar disipación Némesis de Cauchy con umbral de corte estricto 0.001f.
 */
export function applyNemesisCauchyCutoff(
  tension: number,
  gamma = NEMESIS_GAMMA_PRESETS.STANDARD,
  cutoff = NEMESIS_THERMAL_CUTOFF,
): number {
  const safeGamma = Math.min(0.9999, Math.max(1e-5, gamma));
  const safeCutoff = Math.min(0.25, Math.max(1e-6, cutoff));
  if (!Number.isFinite(tension) || tension <= 0) return 0;
  const next = tension - tension * safeGamma;
  return !Number.isFinite(next) || next < safeCutoff ? 0 : next;
}
