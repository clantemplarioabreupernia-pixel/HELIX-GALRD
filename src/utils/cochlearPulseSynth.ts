import { deriveCubeFacesForPrime, RUNES } from '../data/runes';

export interface CochlearPulseEvent {
  char: string;
  runeGlyph: string;
  prime: number;
  frequencyHz: number;
  internalAcousticFaceZ4: number;
  durationMs: number;
}

/**
 * Traduce texto o lecciones en trenes de pulsos armónicos tonotópicos (tipo Morse musical)
 * usando las frecuencias reales (Hz) y la Cara Interna B de los 33 cubos de HELIX,
 * sincronizado con voz y proyección holográfica en la Pantalla Líquida.
 */
export function speakAndPulseHologram(
  text: string,
  options: {
    speakVoice?: boolean;
    onPulse?: (ev: CochlearPulseEvent) => void;
    onComplete?: () => void;
  } = {},
): () => void {
  const clean = text.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 260);
  if (!clean) return () => {};

  let cancelled = false;

  // 1. Voz clara del Holograma HELIX en español
  if (options.speakVoice !== false && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = 'es-ES';
      utter.rate = 1.03;
      utter.pitch = 1.08;
      window.speechSynthesis.speak(utter);
    } catch {}
  }

  // 2. Tren de pulsos cocleares armónicos (Web Audio API)
  let ctx: AudioContext | null = null;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AudioCtx();
  } catch {
    ctx = null;
  }

  const chars = Array.from(clean).filter((c) => /[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]/.test(c)).slice(0, 48);
  let step = 0;

  const timer = window.setInterval(() => {
    if (cancelled || step >= chars.length) {
      window.clearInterval(timer);
      if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
      options.onComplete?.();
      return;
    }

    const ch = chars[step];
    const rune = RUNES[ch.charCodeAt(0) % RUNES.length];
    const cube = deriveCubeFacesForPrime(rune.index, rune.prime);
    // Modulación por la Cara Interna B (0..3 -> octava/intervalo armónico limpio)
    const harmonicFactor = [1.0, 1.125, 1.25, 1.5][cube.caraInternaB_semillaAcustica] ?? 1.0;
    const freq = Number((rune.frequencyHz * harmonicFactor).toFixed(2));
    const durationMs = cube.caraInternaB_semillaAcustica % 2 === 0 ? 75 : 120;

    if (ctx && ctx.state !== 'closed') {
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.055, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + durationMs / 1000 + 0.01);
      } catch {}
    }

    options.onPulse?.({
      char: ch,
      runeGlyph: rune.glyph,
      prime: rune.prime,
      frequencyHz: freq,
      internalAcousticFaceZ4: cube.caraInternaB_semillaAcustica,
      durationMs,
    });

    step++;
  }, 115);

  return () => {
    cancelled = true;
    window.clearInterval(timer);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
  };
}