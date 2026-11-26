import { WEBER_PERCEPTUAL_K } from './NemesisGovernor';
import { computeCoupledNanotechBiopixelState } from './helixQuantumDisplayPhysics';
import { evaluateWeberFechnerFrame } from '../utils/helixPhysics';

export type BiopixelResolutionTierId = 'HD' | 'FHD' | 'QHD_2K' | 'UHD_4K';

export interface BiopixelResolutionTier {
  id: BiopixelResolutionTierId;
  label: string;
  shortLabel: string;
  width: number;
  height: number;
  biopixels: number;
  subBiopixels: number;
  strideFloats: 7;
  bytesPerBiopixel: 28;
  totalBytes: number;
  ramMiB: number;
  ramDecimalMB: number;
}

export const BIOPIXEL_TIERS: Record<BiopixelResolutionTierId, BiopixelResolutionTier> = {
  HD: makeTier('HD', 'HD 720p (921,600)', 'HD · 921K', 1280, 720),
  FHD: makeTier('FHD', 'Full HD 1080p (2,073,600)', 'FHD · 2.07M', 1920, 1080),
  QHD_2K: makeTier('QHD_2K', '2K QHD 1440p (3,686,400)', '2K · 3.69M', 2560, 1440),
  UHD_4K: makeTier('UHD_4K', '4K UHD 2160p (8,294,400)', '4K · 8.29M', 3840, 2160),
};

function makeTier(
  id: BiopixelResolutionTierId,
  label: string,
  shortLabel: string,
  width: number,
  height: number,
): BiopixelResolutionTier {
  const biopixels = width * height;
  const subBiopixels = biopixels * 3;
  const totalBytes = biopixels * 28;
  return {
    id,
    label,
    shortLabel,
    width,
    height,
    biopixels,
    subBiopixels,
    strideFloats: 7,
    bytesPerBiopixel: 28,
    totalBytes,
    ramMiB: Number((totalBytes / (1024 * 1024)).toFixed(2)),
    ramDecimalMB: Number((totalBytes / 1_000_000).toFixed(2)),
  };
}

export interface LiveDisplayTelemetry {
  tier: BiopixelResolutionTier;
  physicalCanvasWidth: number;
  physicalCanvasHeight: number;
  physicalMeasuredBiopixels: number;
  weberDecision: 'RENDER_FRAME' | 'SKIP_FRAME';
  weberDeltaRatio: number;
  renderedFrames: number;
  skippedFrames: number;
  pauliMeanTension: number;
  brusRedDiameterNm: number;
  brusGreenDiameterNm: number;
  brusBlueDiameterNm: number;
  rayleighPitchNm: number;
}

export function getInitialNanotechMetrics() {
  const r = computeCoupledNanotechBiopixelState({ lambdaNm: 630, tension: 0.35 });
  const g = computeCoupledNanotechBiopixelState({ lambdaNm: 532, tension: 0.35 });
  const b = computeCoupledNanotechBiopixelState({ lambdaNm: 460, tension: 0.35 });
  return {
    brusRedDiameterNm: r.brusCauchy.diameterNm,
    brusGreenDiameterNm: g.brusCauchy.diameterNm,
    brusBlueDiameterNm: b.brusCauchy.diameterNm,
    rayleighPitchNm: g.rayleighEuv.criticalDimensionNm,
  };
}

export function buildPauliSoASwitchSimulationReport(): string {
  const t2k = BIOPIXEL_TIERS.QHD_2K;
  const t4k = BIOPIXEL_TIERS.UHD_4K;
  const nominal36MBytes = 3_600_000 * 28;
  const nominal36MMiB = Number((nominal36MBytes / (1024 * 1024)).toFixed(2));
  const deltaFrom2kQhdMiB = Number((t4k.ramMiB - t2k.ramMiB).toFixed(2));
  const surfaceFactor = Number((t4k.biopixels / t2k.biopixels).toFixed(2));

  const restWeber = evaluateWeberFechnerFrame(0.35, 0.3502, WEBER_PERCEPTUAL_K);
  const motionWeber = evaluateWeberFechnerFrame(0.35, 0.49, WEBER_PERCEPTUAL_K);

  return [
    `Simulación en vivo de la matriz contigua Pauli-SoA (stride = 7 Float32 = 28 bytes/biopíxel, Zero-GC):`,
    `• Umbral 2K nominal (3,600,000 biopíxeles): ${nominal36MBytes.toLocaleString('es-ES')} B (~${nominal36MMiB} MiB) · ${(3_600_000 * 3).toLocaleString('es-ES')} sub-biopíxeles RGB.`,
    `• Modo 2K QHD (${t2k.width}×${t2k.height} = ${t2k.biopixels.toLocaleString('es-ES')} biopíxeles): ${t2k.totalBytes.toLocaleString('es-ES')} B (~${t2k.ramMiB} MiB / ${t2k.ramDecimalMB} MB) · ${t2k.subBiopixels.toLocaleString('es-ES')} sub-biopíxeles RGB.`,
    `• Modo 4K UHD (${t4k.width}×${t4k.height} = ${t4k.biopixels.toLocaleString('es-ES')} biopíxeles): ${t4k.totalBytes.toLocaleString('es-ES')} B (~${t4k.ramMiB} MiB / ${t4k.ramDecimalMB} MB) · ${t4k.subBiopixels.toLocaleString('es-ES')} sub-biopíxeles RGB.`,
    `• Conmutación 2K → 4K UHD: +${deltaFrom2kQhdMiB} MiB contiguos en memoria (factor exacto de superficie ${surfaceFactor}×).`,
    `• Respuesta Weber-Fechner (k=${WEBER_PERCEPTUAL_K}): en reposo ΔI/I=${restWeber.deltaRatio.toFixed(5)} → ${restWeber.decision}; en movimiento rápido ΔI/I=${motionWeber.deltaRatio.toFixed(3)} → ${motionWeber.decision} a 120 FPS.`,
  ].join('\n');
}
