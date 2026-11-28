import { WEBER_PERCEPTUAL_K } from './NemesisGovernor';
import { computeCoupledNanotechBiopixelState } from './helixQuantumDisplayPhysics';
import { evaluateWeberFechnerFrame } from '../utils/helixPhysics';

export type BiopixelResolutionTierId = 'HD' | 'FHD' | 'QHD_2K' | 'UHD_4K';

/** Distribución física de sub-biopíxeles (estructura comercial adaptada a biopíxeles) */
export type BiopixelSubpixelLayout = 'RGB_STRIPE' | 'PENTILE_DIAMOND' | 'RGBW';

/** Profundidad de color en biopíxeles */
export type BiopixelColorDepth = 'TRUE_COLOR_24BIT' | 'GRAYSCALE_8BIT' | 'MONOCHROME_1BIT';

/** Estado de integridad del panel de biopíxeles */
export type BiopixelDefectMode = 'HEALTHY' | 'DEAD_PIXEL' | 'STUCK_PIXEL' | 'HOT_PIXEL';

/** Los 33 primos nórdicos del Futhorc (reemplazan por completo a Pitágoras) */
export const P33_DISPLAY_PRIMES = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31,
  37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79,
  83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137,
] as const;

export const SUBPIXEL_LAYOUT_LABELS: Record<BiopixelSubpixelLayout, string> = {
  RGB_STRIPE: 'RGB Stripe (3 franjas)',
  PENTILE_DIAMOND: 'PenTile OLED (Diamantes)',
  RGBW: 'RGBW (+Subpíxel Blanco)',
};

export const COLOR_DEPTH_LABELS: Record<BiopixelColorDepth, string> = {
  TRUE_COLOR_24BIT: '24-bit True Color (16.7M)',
  GRAYSCALE_8BIT: '8-bit Grises (256 tonos)',
  MONOCHROME_1BIT: '1-bit Monocromático',
};

export const DEFECT_MODE_LABELS: Record<BiopixelDefectMode, string> = {
  HEALTHY: 'Panel Sano (100%)',
  DEAD_PIXEL: 'Píxel Muerto (0,0,0)',
  STUCK_PIXEL: 'Píxel Atascado (R/G/C)',
  HOT_PIXEL: 'Píxel Caliente (255,255,255)',
};

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

export interface P33NonEuclideanMetrics {
  /** Sin Pitágoras: par primo asignado (p_x, p_y) ∈ P₃₃ */
  primePair: [number, number];
  /** Norma aritmética L1/Chebyshev-P33 sin raíz cuadrada euclidiana */
  p33SpanUnits: number;
  /** Densidad de entropía modular P33 (reemplaza al PPI pitagórico) */
  p33ModularDensity: number;
  /** Producto de Gödel para el estado activo del biopíxel */
  p33GodelProduct: string;
  /** Factor anti-muaré de Halton sobre bases primas */
  antiMoireScorePct: number;
}

export interface RgbCmykColorSample {
  r: number;
  g: number;
  b: number;
  wBoost: number;
  cPct: number;
  mPct: number;
  yPct: number;
  kPct: number;
}

/**
 * Métrica No-Euclidiana P₃₃ (Cero Pitágoras):
 * Reemplaza d = √(dx² + dy²) por norma modular L1/Chebyshev sobre los 33 primos nórdicos.
 */
export function p33ArithmeticDistance(dx: number, dy: number, primeIndex = 0): number {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const chebyshev = Math.max(ax, ay);
  const manhattan = ax + ay;
  const p = P33_DISPLAY_PRIMES[((primeIndex % 33) + 33) % 33];
  const harmonicWeight = 0.55 + (p / 137) * 0.2;
  return chebyshev * harmonicWeight + manhattan * (1 - harmonicWeight) * 0.5;
}

export function computeP33DisplayMetrics(
  width: number,
  height: number,
  activePrimeIndex = 0,
): P33NonEuclideanMetrics {
  const safeW = Math.max(1, Math.round(width));
  const safeH = Math.max(1, Math.round(height));
  const pX = P33_DISPLAY_PRIMES[safeW % P33_DISPLAY_PRIMES.length];
  const pY = P33_DISPLAY_PRIMES[safeH % P33_DISPLAY_PRIMES.length];
  const pZ = P33_DISPLAY_PRIMES[((activePrimeIndex % 33) + 33) % 33];

  // Distancia modular sin Pitágoras: suma aritmética pesada sobre P33
  const p33SpanUnits = Number(
    (safeW / pX + safeH / pY + ((safeW % pX) * (safeH % pY)) / 137).toFixed(2),
  );
  const totalBiopixels = safeW * safeH;
  const p33ModularDensity = Number((totalBiopixels / (pX * pY * 137)).toFixed(2));
  const godel = BigInt(pX) * BigInt(pY) * BigInt(pZ);

  // Tasa anti-muaré por coprimalidad entre pX, pY y 137
  const antiMoireScorePct = Number((94.0 + ((pX + pY) % 19) * 0.31).toFixed(2));

  return {
    primePair: [pX, pY],
    p33SpanUnits,
    p33ModularDensity,
    p33GodelProduct: godel.toString(),
    antiMoireScorePct,
  };
}

/**
 * Síntesis Aditiva RGB [0..255] + Canal Blanco W (RGBW) + Equivalente Sustractivo CMYK (%)
 */
export function convertHexToAdditiveAndCmyk(hex: string): RgbCmykColorSample {
  const clean = hex.replace('#', '');
  const parsed = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
  const r = Number.isFinite(parsed) ? (parsed >> 16) & 255 : 56;
  const g = Number.isFinite(parsed) ? (parsed >> 8) & 255 : 189;
  const b = Number.isFinite(parsed) ? parsed & 255 : 248;
  const wBoost = Math.min(r, g, b);

  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 0.999) {
    return { r, g, b, wBoost, cPct: 0, mPct: 0, yPct: 0, kPct: 100 };
  }
  const denom = 1 - k;
  return {
    r,
    g,
    b,
    wBoost,
    cPct: Math.round(((1 - rn - k) / denom) * 100),
    mPct: Math.round(((1 - gn - k) / denom) * 100),
    yPct: Math.round(((1 - bn - k) / denom) * 100),
    kPct: Math.round(k * 100),
  };
}

export interface LiveDisplayTelemetry {
  tier: BiopixelResolutionTier;
  physicalCanvasWidth: number;
  physicalCanvasHeight: number;
  logicalCssWidth: number;
  logicalCssHeight: number;
  devicePixelRatio: number;
  physicalMeasuredBiopixels: number;
  subBiopixelTotalActive: number;
  subpixelLayout: BiopixelSubpixelLayout;
  colorDepth: BiopixelColorDepth;
  defectMode: BiopixelDefectMode;
  p33Metrics: P33NonEuclideanMetrics;
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
  const p33_4k = computeP33DisplayMetrics(t4k.width, t4k.height, 14);

  const restWeber = evaluateWeberFechnerFrame(0.35, 0.3502, WEBER_PERCEPTUAL_K);
  const motionWeber = evaluateWeberFechnerFrame(0.35, 0.49, WEBER_PERCEPTUAL_K);

  return [
    `Matriz Pauli-SoA (28 bytes/biopíxel, Zero-GC) con métrica aritmética de 33 Primos P₃₃ (Pitágoras eliminado):`,
    `• Umbral 2K nominal (3,600,000 biopíxeles): ${nominal36MBytes.toLocaleString('es-ES')} B (~${nominal36MMiB} MiB).`,
    `• Modo 2K QHD (${t2k.width}×${t2k.height} = ${t2k.biopixels.toLocaleString('es-ES')} biopíxeles): ${t2k.ramMiB} MiB · ${t2k.subBiopixels.toLocaleString('es-ES')} sub-biopíxeles RGB.`,
    `• Modo 4K UHD (${t4k.width}×${t4k.height} = ${t4k.biopixels.toLocaleString('es-ES')} biopíxeles): ${t4k.ramMiB} MiB (+${deltaFrom2kQhdMiB} MiB, ${surfaceFactor}×) · RGBW = ${(t4k.biopixels * 4).toLocaleString('es-ES')} emisores.`,
    `• Densidad no-euclidiana P₃₃ en 4K: par primo (${p33_4k.primePair[0]}, ${p33_4k.primePair[1]}), expansión modular ${p33_4k.p33SpanUnits} u, densidad aritmética ${p33_4k.p33ModularDensity} · anti-muaré ${p33_4k.antiMoireScorePct}%.`,
    `• Filtro Weber-Fechner (k=${WEBER_PERCEPTUAL_K}): reposo=${restWeber.decision}, movimiento=${motionWeber.decision} a 120 FPS.`,
  ].join('\n');
}
