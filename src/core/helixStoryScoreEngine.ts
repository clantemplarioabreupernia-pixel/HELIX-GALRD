import { evaluateCineAcoustoFrame, CineAcoustoFrameState } from './helixCineAcoustoOptics';
import type { ConversationalIntentKind } from './helixConversationalBrain';

export interface StorySceneCue {
  index: number;
  text: string;
  prime: number;
  freqHz: number;
  durationSec: number;
  mood: 'bosque' | 'personaje' | 'tension' | 'resolucion';
}

const P33 = new Int32Array([2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137]);

export function parseStoryIntoMusicalScore(
  storyText: string,
  intentHint?: ConversationalIntentKind,
): StorySceneCue[] {
  const sentences = storyText
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const chunks = sentences.length > 0 ? sentences : [storyText.trim() || 'Escena inicial'];
  return chunks.map((sentence, idx) => {
    const low = sentence.toLowerCase();
    const isTension =
      intentHint === 'creation_or_simulation' ||
      /\b(lobo|peligro|oscur|miedo|corre|grit|alerta|fuego|tormenta|cuantic|orbital|colision|energia|tension)\b/.test(low);
    const isForest =
      intentHint === 'architecture_explain' ||
      intentHint === 'learning' ||
      /\b(bosque|monta[ñn]a|valle|cielo|mar|r[ií]o|noche|luna|onda|luz|fluido|optica|espacio)\b/.test(low);

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

    return {
      index: idx + 1,
      text: sentence,
      prime,
      freqHz,
      durationSec: Math.min(6, Math.max(2.0, Math.ceil(sentence.split(/\s+/).length * 0.35))),
      mood,
    };
  });
}

export function playStoryScoreLive(
  cues: StorySceneCue[],
  onCueChange?: (cue: StorySceneCue, cineState: CineAcoustoFrameState, fft?: Uint8Array) => void,
): () => void {
  let stopped = false;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    onCueChange?.(activeCue, cine, fftBuffer);
    rafId = window.requestAnimationFrame(pumpFft);
  };

  const playNext = () => {
    if (stopped || idx >= cues.length) {
      cleanup();
      return;
    }
    activeCue = cues[idx];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = activeCue.mood === 'tension' ? 'sawtooth' : activeCue.mood === 'bosque' ? 'triangle' : 'sine';
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
