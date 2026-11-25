import { evaluateCineAcoustoFrame } from './helixCineAcoustoOptics';

export interface StorySceneCue {
  index: number;
  text: string;
  prime: number;
  freqHz: number;
  durationSec: number;
  mood: 'bosque' | 'personaje' | 'tension' | 'resolucion';
}

const P33 = new Int32Array([2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137]);

export function parseStoryIntoMusicalScore(storyText: string): StorySceneCue[] {
  const sentences = storyText
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const chunks = sentences.length > 0 ? sentences : [storyText.trim() || 'Escena inicial'];
  return chunks.map((sentence, idx) => {
    const low = sentence.toLowerCase();
    const isTension = /\b(lobo|peligro|oscur|miedo|corre|grit|alerta|fuego|tormenta)\b/.test(low);
    const isForest = /\b(bosque|monta[ñn]a|valle|cielo|mar|r[ií]o|noche|luna)\b/.test(low);
    const mood: StorySceneCue['mood'] = isTension ? 'tension' : isForest ? 'bosque' : idx === chunks.length - 1 ? 'resolucion' : 'personaje';

    const hash = Array.from(sentence).reduce((acc, ch) => acc + ch.charCodeAt(0), idx * 17);
    const prime = P33[hash % P33.length];
    const octaveDiv = isForest ? 32 : isTension ? 16 : 8;
    const freqHz = Number((261.6256 * (prime / octaveDiv)).toFixed(2));

    return {
      index: idx + 1,
      text: sentence,
      prime,
      freqHz,
      durationSec: Math.min(8, Math.max(3, Math.ceil(sentence.split(/\s+/).length * 0.45))),
      mood,
    };
  });
}

export function playStoryScoreLive(
  cues: StorySceneCue[],
  onCueChange?: (cue: StorySceneCue, cineState: ReturnType<typeof evaluateCineAcoustoFrame>) => void,
): () => void {
  let stopped = false;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx || cues.length === 0) return () => {};

  const ctx = new AudioCtx();
  let timerId = 0;
  let idx = 0;

  const playNext = () => {
    if (stopped || idx >= cues.length) {
      void ctx.close().catch(() => {});
      return;
    }
    const cue = cues[idx];
    const now = ctx.currentTime;

    // Nota melodica P33 + tono pedal grave para sostener el paisaje
    const oscLead = ctx.createOscillator();
    const oscDrone = ctx.createOscillator();
    const gain = ctx.createGain();

    oscLead.type = cue.mood === 'tension' ? 'sawtooth' : 'triangle';
    oscLead.frequency.setValueAtTime(cue.freqHz, now);

    oscDrone.type = 'sine';
    oscDrone.frequency.setValueAtTime(cue.freqHz * 0.5, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + cue.durationSec);

    oscLead.connect(gain);
    oscDrone.connect(gain);
    gain.connect(ctx.destination);

    oscLead.start(now);
    oscDrone.start(now);
    oscLead.stop(now + cue.durationSec);
    oscDrone.stop(now + cue.durationSec);

    const cine = evaluateCineAcoustoFrame(null, ctx.sampleRate, idx * 4, cues.length * 4);
    onCueChange?.(cue, cine);

    idx += 1;
    timerId = window.setTimeout(playNext, cue.durationSec * 1000);
  };

  playNext();
  return () => {
    stopped = true;
    window.clearTimeout(timerId);
    void ctx.close().catch(() => {});
  };
}


