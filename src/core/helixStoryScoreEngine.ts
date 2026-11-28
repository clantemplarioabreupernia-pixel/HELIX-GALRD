import { deriveCubeFacesForPrime, RUNES } from '../data/runes';
import { CineAcoustoFrameState, evaluateCineAcoustoFrame } from './helixCineAcoustoOptics';
import type { ConversationalIntentKind } from './helixConversationalBrain';
import { FRAME_STRIDE, HelixKinematics12Engine, Kinematics12Params } from './helixKinematics12';
import {
  freqToMusicalNoteLabel,
  GaldrPhonemeFormant,
  resolveGaldrFormant,
} from './helixProceduralCineAudio';

export type StorySceneMoldKind =
  | 'bosque_caperucita'
  | 'lobo_noche'
  | 'nave_lunar'
  | 'montana_aves'
  | 'olas_mar'
  | 'cristal_luz'
  | 'castillo_toroide'
  | 'molecula_quimica';

export interface StorySceneCue {
  index: number;
  text: string;
  prime: number;
  runeGlyph: string;
  runeName: string;
  phoneme: string;
  musicalNoteLabel: string;
  freqHz: number;
  formant: GaldrPhonemeFormant;
  durationSec: number;
  mood: 'bosque' | 'personaje' | 'tension' | 'resolucion';
  moldKind: StorySceneMoldKind;
  primaryHex: string;
  secondaryHex: string;
  mathEquation: string;
  hlxCompactCode: string;
  kinematicsBuffer: Float32Array;
  kinematicsFrames: number;
}

export interface StoryLiveMotionFrame {
  cue: StorySceneCue;
  prevMoldKind: StorySceneMoldKind | null;
  morphMix: number;
  sceneProgress: number;
  squashY: number;
  stretchXZ: number;
  arcOffsetX: number;
  arcOffsetY: number;
  followLagZ: number;
  cineState: CineAcoustoFrameState;
}

function inferSceneMoldAndPalette(sentence: string): {
  moldKind: StorySceneMoldKind;
  primaryHex: string;
  secondaryHex: string;
  mathEquation: string;
} {
  const low = sentence
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (/\b(lobo|fiera|sombra|oscur|peligro|noche|miedo|grit)\b/.test(low)) {
    return {
      moldKind: 'lobo_noche',
      primaryHex: '#6366f1',
      secondaryHex: '#f59e0b',
      mathEquation: 'z(x,y) = 0.72·exp(-r²_luna/0.14) + 0.58·max(silueta_lobo(x,y), 0)',
    };
  }
  if (/\b(caperucita|capa roja|nina|bosque|arbol|arboles|selva|camino|abuel)\b/.test(low)) {
    return {
      moldKind: 'bosque_caperucita',
      primaryHex: '#10b981',
      secondaryHex: '#ef4444',
      mathEquation: 'z(x,y) = 0.68·capa_roja(x,y) + Σ_k 0.45·conos_pino(x_k, y_k)',
    };
  }
  if (/\b(nave|cohete|luna|marte|espacio|astronauta|planeta|estrella|orbita)\b/.test(low)) {
    return {
      moldKind: 'nave_lunar',
      primaryHex: '#38bdf8',
      secondaryHex: '#f59e0b',
      mathEquation: 'z(x,y) = √max(0, R² - r²_planeta) + SDF_nave(x,y,t)',
    };
  }
  if (/\b(mar|oceano|ola|olas|agua|rio|barco|pez|peces)\b/.test(low)) {
    return {
      moldKind: 'olas_mar',
      primaryHex: '#0284c7',
      secondaryHex: '#67e8f9',
      mathEquation: 'z(x,y,t) = 0.48·sin(3.4x - 2.6t)·cos(1.8y) + 0.22·sin(7x + 4t)',
    };
  }
  if (/\b(cristal|diamante|luz|estrella|magia|oro|brill)\b/.test(low)) {
    return {
      moldKind: 'cristal_luz',
      primaryHex: '#a78bfa',
      secondaryHex: '#38bdf8',
      mathEquation: 'z(x,y) = max(0, 1.0 - (|x| + |y|)/0.75)',
    };
  }
  if (/\b(castillo|ciudad|torre|puente|casa|palacio|toroide)\b/.test(low)) {
    return {
      moldKind: 'castillo_toroide',
      primaryHex: '#f59e0b',
      secondaryHex: '#38bdf8',
      mathEquation: 'z(x,y) = 0.65·rect_torres(x,y) + 0.42·cos(4·atan2(y,x))',
    };
  }
  if (/\b(molecula|quimica|atomo|enlace|reaccion|orbital|electron|morse|nernst)\b/.test(low)) {
    return {
      moldKind: 'molecula_quimica',
      primaryHex: '#22d3ee',
      secondaryHex: '#f59e0b',
      mathEquation: 'V(r) = D_e·(1 - exp(-a(r-r_e)))² + |ψ_orbital(x,y)|²',
    };
  }
  return {
    moldKind: 'montana_aves',
    primaryHex: '#0ea5e9',
    secondaryHex: '#34d399',
    mathEquation: 'z(x,y) = 0.55·sin(2.8x)·cos(2.4y) + 0.25·sin(6x + t)',
  };
}

function synthesizeCueDisneyTrajectory(
  durationSec: number,
  mood: StorySceneCue['mood'],
  moldKind: StorySceneMoldKind,
  cueIdx: number,
): { buffer: Float32Array; frames: number } {
  const fps = 30;
  const params: Kinematics12Params = {
    duration: durationSec,
    fps,
    elasticity: mood === 'tension' ? 0.34 : moldKind === 'olas_mar' ? 0.28 : 0.2,
    anticipationRatio: mood === 'tension' ? 0.18 : 0.12,
    anticipationAmp: mood === 'tension' ? 0.24 : 0.14,
    exaggeration: mood === 'tension' ? 1.24 : 1.08,
    mass: 1.0,
    damping: mood === 'bosque' ? 4.2 : 5.2,
    stiffness: mood === 'tension' ? 42 : 30,
    lagFrames: mood === 'bosque' ? 3 : 2,
  };
  const totalFrames = Math.max(2, Math.floor(params.duration * params.fps));
  const outBuffer = new Float32Array(totalFrames * FRAME_STRIDE);

  const dir = cueIdx % 2 === 0 ? 1 : -1;
  const pStart = new Float32Array([-0.14 * dir, -0.04, 0.0]);
  const pControl = new Float32Array([0.0, mood === 'tension' ? 0.16 : 0.1, 0.08]);
  const pEnd = new Float32Array([0.14 * dir, 0.03, 0.0]);
  const pNeutral = new Float32Array([0.0, 0.0, 0.0]);

  const written = HelixKinematics12Engine.synthesizeTrajectory(
    pStart,
    pControl,
    pEnd,
    pNeutral,
    params,
    outBuffer,
  );
  return { buffer: outBuffer, frames: written };
}

export function parseStoryIntoMusicalScore(
  storyText: string,
  intentHint?: ConversationalIntentKind,
): StorySceneCue[] {
  const sentences = storyText
    .split(/[.!?\n;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const chunks = sentences.length > 0 ? sentences : [storyText.trim() || 'Escena inicial'];
  return chunks.map((sentence, idx) => {
    const low = sentence.toLowerCase();
    const isTension =
      intentHint === 'creation_or_simulation' ||
      /\b(lobo|peligro|oscur|miedo|corre|grit|alerta|fuego|tormenta|cuantic|orbital|colision|energia|tension)\b/.test(
        low,
      );
    const isForest =
      intentHint === 'architecture_explain' ||
      intentHint === 'learning' ||
      /\b(bosque|monta[ñn]a|valle|cielo|mar|r[ií]o|noche|luna|onda|luz|fluido|optica|espacio)\b/.test(
        low,
      );

    const mood: StorySceneCue['mood'] = isTension
      ? 'tension'
      : isForest
        ? 'bosque'
        : idx === chunks.length - 1
          ? 'resolucion'
          : 'personaje';

    const hash = Array.from(sentence).reduce((acc, ch) => acc + ch.charCodeAt(0), idx * 17);
    const rune = RUNES[hash % RUNES.length];
    const cube = deriveCubeFacesForPrime(rune.index, rune.prime);
    const harmonicFactor = [1, 1.125, 1.25, 1.5][cube.caraInternaB_semillaAcustica] ?? 1;
    const baseScale = isForest ? 0.75 : isTension ? 1.125 : 1.0;
    const freqHz = Number((rune.frequencyHz * harmonicFactor * baseScale).toFixed(2));
    const musicalNoteLabel = freqToMusicalNoteLabel(freqHz);
    const formant = resolveGaldrFormant(rune.phoneme);
    const { moldKind, primaryHex, secondaryHex, mathEquation } = inferSceneMoldAndPalette(sentence);
    const durationSec = Math.min(6, Math.max(2.6, Math.ceil(sentence.split(/\s+/).length * 0.42)));
    const traj = synthesizeCueDisneyTrajectory(durationSec, mood, moldKind, idx);

    const hlxCompactCode = `SCENE_${idx + 1} [${rune.glyph} p=${rune.prime} · ${musicalNoteLabel} ${freqHz}Hz /${rune.phoneme}/] :: MOLD(${moldKind.toUpperCase()}) DISNEY_12(detS=1)`;

    return {
      index: idx + 1,
      text: sentence,
      prime: rune.prime,
      runeGlyph: rune.glyph,
      runeName: rune.name,
      phoneme: rune.phoneme,
      musicalNoteLabel,
      freqHz,
      formant,
      durationSec,
      mood,
      moldKind,
      primaryHex,
      secondaryHex,
      mathEquation,
      hlxCompactCode,
      kinematicsBuffer: traj.buffer,
      kinematicsFrames: traj.frames,
    };
  });
}

export function sampleCueDisneyMotion(
  cue: StorySceneCue,
  sceneProgress: number,
): {
  squashY: number;
  stretchXZ: number;
  arcOffsetX: number;
  arcOffsetY: number;
  followLagZ: number;
} {
  const clampP = Math.min(1, Math.max(0, sceneProgress));
  const fIdx = Math.min(
    Math.max(0, cue.kinematicsFrames - 1),
    Math.floor(clampP * Math.max(1, cue.kinematicsFrames - 1)),
  );
  const off = fIdx * FRAME_STRIDE;
  return {
    arcOffsetX: cue.kinematicsBuffer[off] ?? 0,
    arcOffsetY: cue.kinematicsBuffer[off + 1] ?? 0,
    stretchXZ: cue.kinematicsBuffer[off + 3] ?? 1,
    squashY: cue.kinematicsBuffer[off + 4] ?? 1,
    followLagZ: (cue.kinematicsBuffer[off + 8] ?? 0) - (cue.kinematicsBuffer[off + 2] ?? 0),
  };
}

export function playStoryScoreLive(
  cues: StorySceneCue[],
  onCueChange?: (cue: StorySceneCue, cineState: CineAcoustoFrameState, fft?: Uint8Array) => void,
  options?: {
    onFrameUpdate?: (frame: StoryLiveMotionFrame) => void;
    onAudioStreamReady?: (stream: MediaStream) => void;
    onComplete?: () => void;
  },
): () => void {
  let stopped = false;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx || cues.length === 0) return () => {};

  const ctx = new AudioCtx();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.connect(ctx.destination);
  let mediaDest: MediaStreamAudioDestinationNode | null = null;
  if (typeof ctx.createMediaStreamDestination === 'function') {
    mediaDest = ctx.createMediaStreamDestination();
    analyser.connect(mediaDest);
    options?.onAudioStreamReady?.(mediaDest.stream);
  }
  const fftBuffer = new Uint8Array(analyser.frequencyBinCount);

  let timerId = 0;
  let rafId = 0;
  let idx = 0;
  let activeCue = cues[0];
  let prevMoldKind: StorySceneMoldKind | null = null;
  let cueStartAudioSec = ctx.currentTime;
  let cueSwitched = true;
  const startTime = ctx.currentTime;
  const totalSec = cues.reduce((a, b) => a + b.durationSec, 0);

  const cleanup = (completedNaturally = false) => {
    stopped = true;
    if (timerId) window.clearTimeout(timerId);
    if (rafId) window.cancelAnimationFrame(rafId);
    if (ctx.state !== 'closed') {
      ctx.close().catch(() => {});
    }
    if (completedNaturally) {
      options?.onComplete?.();
    }
  };

  const pumpFft = () => {
    if (stopped) return;
    analyser.getByteFrequencyData(fftBuffer);
    const now = ctx.currentTime;
    const elapsed = now - startTime;
    const cine = evaluateCineAcoustoFrame(fftBuffer, ctx.sampleRate, elapsed, totalSec);

    if (cueSwitched) {
      cueSwitched = false;
      onCueChange?.(activeCue, cine, fftBuffer);
    }

    if (options?.onFrameUpdate) {
      const cueElapsed = Math.max(0, now - cueStartAudioSec);
      const sceneProgress = Math.min(1, cueElapsed / Math.max(0.4, activeCue.durationSec));
      const morphWindow = Math.min(0.95, activeCue.durationSec * 0.35);
      const morphMix = prevMoldKind
        ? HelixKinematics12Engine.smootherstep(Math.min(1, cueElapsed / Math.max(0.25, morphWindow)))
        : 1.0;
      const motion = sampleCueDisneyMotion(activeCue, sceneProgress);
      options.onFrameUpdate({
        cue: activeCue,
        prevMoldKind,
        morphMix,
        sceneProgress,
        ...motion,
        cineState: cine,
      });
    }

    rafId = window.requestAnimationFrame(pumpFft);
  };

  const playNext = () => {
    if (stopped || idx >= cues.length) {
      cleanup(idx >= cues.length);
      return;
    }
    prevMoldKind = idx === 0 ? null : activeCue.moldKind;
    activeCue = cues[idx];
    cueStartAudioSec = ctx.currentTime;
    cueSwitched = true;

    const now = ctx.currentTime;
    const dur = activeCue.durationSec;

    // 3 voces rúnicas P33: fundamental + quinta armónica cristalina + sub-bajo modal con formantes Galdr (F1, F2)
    const oscMain = ctx.createOscillator();
    const oscHarm = ctx.createOscillator();
    const oscSub = ctx.createOscillator();
    oscMain.type =
      activeCue.mood === 'tension'
        ? 'sawtooth'
        : activeCue.mood === 'bosque'
          ? 'triangle'
          : 'sine';
    oscHarm.type = 'triangle';
    oscSub.type = 'sine';

    oscMain.frequency.setValueAtTime(activeCue.freqHz, now);
    oscHarm.frequency.setValueAtTime(activeCue.freqHz * 1.5, now);
    oscSub.frequency.setValueAtTime(activeCue.freqHz * 0.5, now);

    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(activeCue.formant.f1Hz, now);
    f1.Q.setValueAtTime(activeCue.formant.q, now);

    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(activeCue.formant.f2Hz, now);
    f2.Q.setValueAtTime(activeCue.formant.q, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0005, now);
    gain.gain.exponentialRampToValueAtTime(0.068, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.042, now + dur * 0.65);
    gain.gain.exponentialRampToValueAtTime(0.0004, now + dur);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.0005, now);
    subGain.gain.exponentialRampToValueAtTime(0.035, now + 0.16);
    subGain.gain.exponentialRampToValueAtTime(0.0004, now + dur);

    oscMain.connect(f1);
    oscMain.connect(f2);
    oscHarm.connect(f2);
    f1.connect(gain);
    f2.connect(gain);
    oscSub.connect(subGain);
    gain.connect(analyser);
    subGain.connect(analyser);

    oscMain.start(now);
    oscHarm.start(now);
    oscSub.start(now);
    oscMain.stop(now + dur + 0.04);
    oscHarm.stop(now + dur + 0.04);
    oscSub.stop(now + dur + 0.04);

    if (activeCue.formant.hasFricativeNoise) {
      const bufLen = Math.max(1, Math.floor(ctx.sampleRate * 0.1));
      const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let k = 0; k < bufLen; k++) {
        data[k] = (Math.random() * 2 - 1) * Math.exp(-k / (bufLen * 0.35));
      }
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(2200, now);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.02, now);
      nGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.1);
      src.connect(hp);
      hp.connect(nGain);
      nGain.connect(analyser);
      src.start(now);
    }

    idx += 1;
    timerId = window.setTimeout(playNext, dur * 1000);
  };

  rafId = window.requestAnimationFrame(pumpFft);
  playNext();
  return () => cleanup(false);
}
