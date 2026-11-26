import { evaluateCineAcoustoFrame, CineAcoustoFrameState } from './helixCineAcoustoOptics';
import type { ConversationalIntentKind } from './helixConversationalBrain';

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
  freqHz: number;
  durationSec: number;
  mood: 'bosque' | 'personaje' | 'tension' | 'resolucion';
  moldKind: StorySceneMoldKind;
  primaryHex: string;
  secondaryHex: string;
  mathEquation: string;
  hlxCompactCode: string;
}

const P33 = new Int32Array([
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53,
  59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137,
]);

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
    const prime = P33[hash % P33.length];
    const octaveDiv = isForest ? 32 : isTension ? 16 : 8;
    const freqHz = Number((261.6256 * (prime / octaveDiv)).toFixed(2));
    const { moldKind, primaryHex, secondaryHex, mathEquation } = inferSceneMoldAndPalette(sentence);

    const hlxCompactCode = `SCENE_${idx + 1} [p=${prime} · ${freqHz}Hz] :: MOLD(${moldKind.toUpperCase()}) COL(${primaryHex},${secondaryHex})`;

    return {
      index: idx + 1,
      text: sentence,
      prime,
      freqHz,
      durationSec: Math.min(6, Math.max(2.6, Math.ceil(sentence.split(/\s+/).length * 0.42))),
      mood,
      moldKind,
      primaryHex,
      secondaryHex,
      mathEquation,
      hlxCompactCode,
    };
  });
}

export function playStoryScoreLive(
  cues: StorySceneCue[],
  onCueChange?: (cue: StorySceneCue, cineState: CineAcoustoFrameState, fft?: Uint8Array) => void,
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
  const fftBuffer = new Uint8Array(analyser.frequencyBinCount);

  let timerId = 0;
  let rafId = 0;
  let idx = 0;
  let activeCue = cues[0];
  let cueSwitched = true;
  const startTime = ctx.currentTime;
  const totalSec = cues.reduce((a, b) => a + b.durationSec, 0);

  const cleanup = () => {
    stopped = true;
    if (timerId) window.clearTimeout(timerId);
    if (rafId) window.cancelAnimationFrame(rafId);
    if (ctx.state !== 'closed') {
      ctx.close().catch(() => {});
    }
  };

  const pumpFft = () => {
    if (stopped) return;
    analyser.getByteFrequencyData(fftBuffer);
    const elapsed = ctx.currentTime - startTime;
    const cine = evaluateCineAcoustoFrame(fftBuffer, ctx.sampleRate, elapsed, totalSec);
    if (cueSwitched) {
      cueSwitched = false;
      onCueChange?.(activeCue, cine, fftBuffer);
    }
    rafId = window.requestAnimationFrame(pumpFft);
  };

  const playNext = () => {
    if (stopped || idx >= cues.length) {
      cleanup();
      return;
    }
    activeCue = cues[idx];
    cueSwitched = true;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type =
      activeCue.mood === 'tension'
        ? 'sawtooth'
        : activeCue.mood === 'bosque'
          ? 'triangle'
          : 'sine';
    osc.frequency.setValueAtTime(activeCue.freqHz, ctx.currentTime);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + activeCue.durationSec);

    osc.connect(gain);
    gain.connect(analyser);
    osc.start();
    osc.stop(ctx.currentTime + activeCue.durationSec);

    idx += 1;
    timerId = window.setTimeout(playNext, activeCue.durationSec * 1000);
  };

  rafId = window.requestAnimationFrame(pumpFft);
  playNext();
  return cleanup;
}
