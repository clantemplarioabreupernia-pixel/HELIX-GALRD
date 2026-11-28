import { deriveCubeFacesForPrime, PrimitiveToken, RUNES } from '../data/runes';
import type { LiquidMorphShape } from '../components/LiquidBiopixelCanvas';
import { CameraShotCode, evaluateCineAcoustoFrame } from './helixCineAcoustoOptics';
import {
  evaluateUnifiedBiopixelEquation,
  UnifiedBiopixelEquationResult,
} from './helixQuantumDisplayPhysics';
import type { RecombinationResult } from './helixRecombinator';
import type { HelixRegisteredTool } from './helixToolCatalog159';

export interface GaldrPhonemeFormant {
  phoneme: string;
  f1Hz: number;
  f2Hz: number;
  q: number;
  hasFricativeNoise: boolean;
}

export interface ProceduralCineStep {
  stepIndex: number;
  rune: PrimitiveToken;
  musicalNoteLabel: string;
  freqHz: number;
  formant: GaldrPhonemeFormant;
  shotCode: CameraShotCode;
  shotLabel: string;
  focalLengthMm: number;
  fovDeg: number;
  cFront: number;
  cBack: number;
  durationSec: number;
  primaryHex: string;
  secondaryHex: string;
  sourceToolTitle: string;
}

export interface ProceduralCineAudioPlan {
  title: string;
  godelProduct: string;
  shape: LiquidMorphShape;
  steps: ProceduralCineStep[];
  unifiedEquation: UnifiedBiopixelEquationResult;
  masterHlxScript: string;
}

export interface CineAudioLiveFrame {
  stepIndex: number;
  totalSteps: number;
  runeGlyph: string;
  runeName: string;
  prime: number;
  phoneme: string;
  musicalNoteLabel: string;
  freqHz: number;
  shotLabel: string;
  focalLengthMm: number;
  fovDeg: number;
  cFront: number;
  cBack: number;
  primaryHex: string;
  secondaryHex: string;
  unified: UnifiedBiopixelEquationResult;
}

const NOTE_NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'] as const;

export function freqToMusicalNoteLabel(freqHz: number): string {
  const midi = Math.round(69 + 12 * Math.log2(Math.max(20, freqHz) / 440));
  const note = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

export function resolveGaldrFormant(phoneme: string): GaldrPhonemeFormant {
  const p = phoneme.toLowerCase();
  if (p.includes('u')) return { phoneme, f1Hz: 320, f2Hz: 820, q: 4.2, hasFricativeNoise: false };
  if (p.includes('o') || p.includes('ø')) return { phoneme, f1Hz: 480, f2Hz: 940, q: 4.5, hasFricativeNoise: false };
  if (p.includes('i') || p.includes('y')) return { phoneme, f1Hz: 290, f2Hz: 2150, q: 5.0, hasFricativeNoise: false };
  if (p.includes('e') || p.includes('æ')) return { phoneme, f1Hz: 530, f2Hz: 1840, q: 4.4, hasFricativeNoise: false };
  if (p.includes('a') || p.includes('ɑ')) return { phoneme, f1Hz: 730, f2Hz: 1180, q: 4.0, hasFricativeNoise: false };
  if (p.includes('f') || p.includes('θ') || p.includes('s') || p.includes('st') || p.includes('h')) {
    return { phoneme, f1Hz: 620, f2Hz: 1950, q: 3.4, hasFricativeNoise: true };
  }
  return { phoneme, f1Hz: 560, f2Hz: 1450, q: 3.8, hasFricativeNoise: p.includes('k') || p.includes('r') };
}

function inferShapeFromDomains(tools: HelixRegisteredTool[]): LiquidMorphShape {
  const joined = tools.map((t) => `${t.domain} ${t.engineId} ${t.title}`).join(' ').toLowerCase();
  if (/quim|chem|nernst|morse|gibbs/.test(joined)) return 'chemistry_molecule';
  if (/espaci|orbit|kepler|radar|telecom|satel/.test(joined)) return 'orbital_ship';
  if (/cuantic|bloch|qasm|statevector/.test(joined)) return 'quantum_bloch';
  if (/cristal|opt|cauchy|pbr/.test(joined)) return 'crystal';
  if (/terreno|fbm|rigido/.test(joined)) return 'terrain';
  if (/topologia|toroide|geom/.test(joined)) return 'torus';
  return 'cymatic_wave';
}

function shotLabelForCode(code: CameraShotCode): string {
  if (code === 0x03) return 'Primer Plano (85mm)';
  if (code === 0x02) return 'Travelling (50mm)';
  return 'Plano General (24mm)';
}

/**
 * Construye el programa maestro unificado .hlx en subanillo racional exacto P33
 * combinando Pauli-SoA, Kelvin-Voigt/Némesis, Bloch/BvN, Cauchy, Galdr y Weber-Fechner.
 */
export function buildUnifiedMasterHlxFromRecombination(
  tools: HelixRegisteredTool[],
  primaryRuneIdx: number,
  secondaryRuneIdx: number,
): string {
  const titleLine = tools.map((t) => t.title.split(' ')[0]).join(' x ') || 'HELIX_UNIFICADO';
  return [
    `# PROGRAMA MAESTRO UNIFICADO HELIX (.hlx) — ${titleLine}`,
    'ᛇᚢ',
    'ᛗᚦ root_architect',
    'SET frame_capacity 32',
    'SOA_INIT frame_capacity',
    'SET viscosity_eta 11/137000',
    'SET elasticity_G 355/113',
    'SET nemesis_gamma 55/1000',
    'LOOP 3',
    '  CURL_STEP 45/100 16/1000',
    '  NEMESIS_DECAY nemesis_gamma',
    'END',
    'SET theta_bloch 15708/10000',
    'SET omega_spin 1/1',
    'BLOCH_ROT 0 1 0 theta_bloch omega_spin',
    'BVN_LATTICE theta_bloch 0 31416/10000 q_nondist',
    'CAUCHY_OPTIC 1458/1000 354/100000 12/100000',
    `GALDR_SYNTH ${primaryRuneIdx} ACTO_PLANTEAMIENTO`,
    `GALDR_SYNTH ${secondaryRuneIdx} ACTO_CLIMAX`,
    'MESH_NODE core_crystal lathe 780 118/100',
    'MAT_ORM core_crystal 94/100 18/100 28/100',
    'MESH_NODE cymatic_halo torus 1024 96/100',
    'MAT_ORM cymatic_halo 96/100 12/100 88/100',
    'CAM_6DOF 32/10 21/10 35/10 38 22 44',
    'SET weber_k 45/1000',
    'WEBER_GUARD weber_k 1/1 1004/1000 wf_render',
    'GEOM_SEAL TORUS_T2 PHI_FIBONACCI 29EDO',
    'WS_EMIT bio_optic cauchy_sss_ready',
    'FILE_WRITE cosmos_unificado.hlx q_nondist',
    'ᛣᚪ',
    'ᚳᛏ',
  ].join('\n');
}

/**
 * Convierte una recombinación de herramientas en una pieza de Cinematografía y Audio Procedural
 * usando las 33 Runas (primos, frecuencias exactas Hz, fonemas Galdr, caras Z4) + Ecuación Unificada.
 */
export function buildProceduralCineAudioPlan(
  recombOrTools: RecombinationResult | HelixRegisteredTool[],
): ProceduralCineAudioPlan {
  const tools = Array.isArray(recombOrTools) ? recombOrTools : recombOrTools.parentTools;
  const safeTools = tools.length > 0 ? tools : [];
  const totalSteps = Math.max(4, Math.min(6, safeTools.length * 2 || 4));
  const totalDurationSec = totalSteps * 2.4;

  let godelBig = 1n;
  for (const t of safeTools) {
    godelBig *= BigInt(Math.max(2, t.prime));
  }

  const steps: ProceduralCineStep[] = [];
  for (let i = 0; i < totalSteps; i++) {
    const tool = safeTools[i % Math.max(1, safeTools.length)];
    const primeSeed = tool ? tool.prime + i * 7 : RUNES[(i * 5) % RUNES.length].prime;
    const rune = RUNES.find((r) => r.prime === tool?.prime) ?? RUNES[Math.abs(primeSeed) % RUNES.length];
    const nextRune = RUNES[(rune.index + i * 3) % RUNES.length];
    const activeRune = i % 2 === 0 ? rune : nextRune;
    const cube = deriveCubeFacesForPrime(activeRune.index, activeRune.prime);

    // Simular espectro acústico sintético para evaluar la curva dramática de 3 actos
    const synthBins = new Uint8Array(32);
    const tau = (i + 0.5) / totalSteps;
    const actBoost = tau > 0.25 && tau < 0.78 ? 210 : 120;
    for (let k = 1; k < synthBins.length; k++) {
      synthBins[k] = Math.max(
        10,
        Math.min(255, Math.round(actBoost * Math.exp(-Math.abs(k - ((activeRune.prime % 16) + 2)) * 0.28))),
      );
    }
    const cineFrame = evaluateCineAcoustoFrame(synthBins, 48000, i * 2.4 + 1.0, totalDurationSec);
    const fovDeg = Number(((cineFrame.fovRad * 180) / Math.PI).toFixed(1));
    const harmonicFactor = [1, 1.125, 1.25, 1.5][cube.caraInternaB_semillaAcustica] ?? 1;
    const freqHz = Number((activeRune.frequencyHz * harmonicFactor).toFixed(2));
    const cFront = Number((((cube.cara0_accion - 1.5) / 1.5) * 0.85).toFixed(3));
    const cBack = Number((-cFront).toFixed(3));

    steps.push({
      stepIndex: i + 1,
      rune: activeRune,
      musicalNoteLabel: freqToMusicalNoteLabel(freqHz),
      freqHz,
      formant: resolveGaldrFormant(activeRune.phoneme),
      shotCode: cineFrame.shotCode,
      shotLabel: shotLabelForCode(cineFrame.shotCode),
      focalLengthMm: cineFrame.focalLengthMm,
      fovDeg,
      cFront,
      cBack,
      durationSec: 2.3,
      primaryHex: activeRune.colorHex,
      secondaryHex: RUNES[(activeRune.index + 11) % RUNES.length].colorHex,
      sourceToolTitle: tool?.title ?? `${activeRune.name} (${activeRune.osTag})`,
    });
  }

  const first = steps[0];
  const unifiedEquation = evaluateUnifiedBiopixelEquation({
    cFront: first?.cFront ?? 0.42,
    cBack: first?.cBack ?? -0.42,
    primeIndex: (first?.rune.index ?? 1) - 1,
    timeSec: 0.5,
  });

  const masterHlxScript = buildUnifiedMasterHlxFromRecombination(
    safeTools,
    (steps[0]?.rune.index ?? 1) - 1,
    (steps[Math.min(1, steps.length - 1)]?.rune.index ?? 2) - 1,
  );

  return {
    title:
      safeTools.length > 0
        ? `Cine-Audio Galdr: ${safeTools.map((t) => t.title.split(' ')[0]).join(' × ')}`
        : 'Cine-Audio Galdr Unificado P₃₃',
    godelProduct: godelBig.toString(),
    shape: inferShapeFromDomains(safeTools),
    steps,
    unifiedEquation,
    masterHlxScript,
  };
}

/**
 * Reproduce en vivo la partitura cinematográfica procedural Galdr (formantes vocales + armónicos P33)
 * y emite cada fotograma de cámara (24/50/85mm), caras C6 y Ecuación Unificada a la pantalla 3D.
 */
export function playProceduralGaldrCinema(
  plan: ProceduralCineAudioPlan,
  onFrame: (frame: CineAudioLiveFrame) => void,
  onComplete?: () => void,
  onAudioStreamReady?: (stream: MediaStream) => void,
): () => void {
  let stopped = false;
  let stepIdx = 0;
  let timer: number | null = null;
  let audioCtx: AudioContext | null = null;
  let mediaDest: MediaStreamAudioDestinationNode | null = null;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioCtx();
    if (typeof audioCtx.createMediaStreamDestination === 'function') {
      mediaDest = audioCtx.createMediaStreamDestination();
      onAudioStreamReady?.(mediaDest.stream);
    }
  } catch {
    audioCtx = null;
    mediaDest = null;
  }

  const playStepAudio = (step: ProceduralCineStep) => {
    if (!audioCtx || audioCtx.state === 'closed') return;
    try {
      const now = audioCtx.currentTime;
      const dur = Math.max(0.8, step.durationSec - 0.15);

      // Oscilador fundamental de runa + 5ta armónica cristalina filtrada por formantes Galdr (F1, F2)
      const oscMain = audioCtx.createOscillator();
      const oscHarm = audioCtx.createOscillator();
      oscMain.type = 'sawtooth';
      oscHarm.type = 'triangle';
      oscMain.frequency.setValueAtTime(step.freqHz, now);
      oscHarm.frequency.setValueAtTime(step.freqHz * 1.5, now);

      const f1 = audioCtx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(step.formant.f1Hz, now);
      f1.Q.setValueAtTime(step.formant.q, now);

      const f2 = audioCtx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.setValueAtTime(step.formant.f2Hz, now);
      f2.Q.setValueAtTime(step.formant.q, now);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.085, now + 0.14);
      gain.gain.exponentialRampToValueAtTime(0.045, now + dur * 0.65);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + dur);

      oscMain.connect(f1);
      oscMain.connect(f2);
      oscHarm.connect(f2);
      f1.connect(gain);
      f2.connect(gain);
      gain.connect(audioCtx.destination);
      if (mediaDest) gain.connect(mediaDest);

      oscMain.start(now);
      oscHarm.start(now);
      oscMain.stop(now + dur + 0.05);
      oscHarm.stop(now + dur + 0.05);

      // Consonante fricativa Galdr (/f/, /θ/, /s/, /st/) en el ataque si aplica
      if (step.formant.hasFricativeNoise) {
        const bufLen = Math.floor(audioCtx.sampleRate * 0.12);
        const noiseBuf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let k = 0; k < bufLen; k++) {
          data[k] = (Math.random() * 2 - 1) * Math.exp(-k / (bufLen * 0.35));
        }
        const src = audioCtx.createBufferSource();
        src.buffer = noiseBuf;
        const hp = audioCtx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(2400, now);
        const nGain = audioCtx.createGain();
        nGain.gain.setValueAtTime(0.028, now);
        nGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.12);
        src.connect(hp);
        hp.connect(nGain);
        nGain.connect(audioCtx.destination);
        if (mediaDest) nGain.connect(mediaDest);
        src.start(now);
      }
    } catch {
      // Ignore WebAudio scheduling errors if suspended
    }
  };

  const advance = () => {
    if (stopped) return;
    if (stepIdx >= plan.steps.length) {
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
      onComplete?.();
      return;
    }

    const step = plan.steps[stepIdx];
    const unified = evaluateUnifiedBiopixelEquation({
      cFront: step.cFront,
      cBack: step.cBack,
      primeIndex: step.rune.index - 1,
      timeSec: stepIdx * 1.1,
    });

    playStepAudio(step);
    onFrame({
      stepIndex: step.stepIndex,
      totalSteps: plan.steps.length,
      runeGlyph: step.rune.glyph,
      runeName: step.rune.name,
      prime: step.rune.prime,
      phoneme: step.rune.phoneme,
      musicalNoteLabel: step.musicalNoteLabel,
      freqHz: step.freqHz,
      shotLabel: step.shotLabel,
      focalLengthMm: step.focalLengthMm,
      fovDeg: step.fovDeg,
      cFront: step.cFront,
      cBack: step.cBack,
      primaryHex: step.primaryHex,
      secondaryHex: step.secondaryHex,
      unified,
    });

    stepIdx += 1;
    timer = window.setTimeout(advance, step.durationSec * 1000);
  };

  advance();

  return () => {
    stopped = true;
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
  };
}
