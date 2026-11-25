import { deriveCubeFacesForPrime, RUNES } from '../data/runes';

export type VoiceGender = 'female' | 'male';

export interface PersistedVoicePrefs {
  enabled: boolean;
  gender: VoiceGender;
  voiceURI: string;
  voiceName: string;
}

export const VOICE_PREFS_STORAGE_KEY = 'helix_voice_prefs';
const LEGACY_GENDER_KEY = 'helix_voice_gender';
const LEGACY_URI_KEY = 'helix_voice_uri';
const LEGACY_ENABLED_KEY = 'helix_voice_enabled';

export function loadPersistedVoicePrefs(storage?: Storage | null): PersistedVoicePrefs {
  const defaults: PersistedVoicePrefs = {
    enabled: true,
    gender: 'female',
    voiceURI: '',
    voiceName: '',
  };
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (!store) return defaults;

    const rawJson = store.getItem(VOICE_PREFS_STORAGE_KEY);
    if (rawJson) {
      const parsed = JSON.parse(rawJson) as Partial<PersistedVoicePrefs>;
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
        gender: parsed.gender === 'male' ? 'male' : 'female',
        voiceURI: typeof parsed.voiceURI === 'string' ? parsed.voiceURI : '',
        voiceName: typeof parsed.voiceName === 'string' ? parsed.voiceName : '',
      };
    }

    const legacyGender = store.getItem(LEGACY_GENDER_KEY);
    const legacyUri = store.getItem(LEGACY_URI_KEY);
    const legacyEnabled = store.getItem(LEGACY_ENABLED_KEY);
    return {
      enabled: legacyEnabled === 'false' ? false : true,
      gender: legacyGender === 'male' ? 'male' : 'female',
      voiceURI: legacyUri || '',
      voiceName: '',
    };
  } catch {
    return defaults;
  }
}

export function savePersistedVoicePrefs(
  prefs: PersistedVoicePrefs,
  storage?: Storage | null,
): void {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    if (!store) return;

    store.setItem(VOICE_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    store.setItem(LEGACY_GENDER_KEY, prefs.gender);
    store.setItem(LEGACY_ENABLED_KEY, String(prefs.enabled));
    if (prefs.voiceURI) {
      store.setItem(LEGACY_URI_KEY, prefs.voiceURI);
    } else {
      store.removeItem(LEGACY_URI_KEY);
    }
  } catch {
    // Ignore storage quota or privacy-mode errors
  }
}

export interface HologramSpeechCallbacks {
  voiceURI?: string | null;
  onStart?: () => void;
  onEnd?: () => void;
  onBoundary?: () => void;
}

const FEMALE_VOICE_RE =
  /\b(female|femenin[ao]|woman|helena|laura|monica|m[oó]nica|paulina|sabina|elvira|lucia|luc[ií]a|sofia|sof[ií]a|carmen|conchita|paloma|elena|dalia|maria|mar[ií]a|valeria|camila|salome|salom[eé]|angelica|ang[eé]lica|samantha|victoria|zira|natural)\b/i;

const MALE_VOICE_RE =
  /\b(male|masculin[ao]|man|jorge|pablo|diego|alvaro|[aá]lvaro|raul|ra[uú]l|carlos|enrique|mateo|tomas|tom[aá]s|alonso|juan|antonio|miguel|gerardo|rodrigo|emilio|david|mark|daniel|alex|george)\b/i;

export function inferVoiceGenderFromVoice(voice: SpeechSynthesisVoice): VoiceGender | null {
  const sig = `${voice.name || ''} ${voice.voiceURI || ''}`;
  if (FEMALE_VOICE_RE.test(sig) && !MALE_VOICE_RE.test(sig)) return 'female';
  if (MALE_VOICE_RE.test(sig) && !FEMALE_VOICE_RE.test(sig)) return 'male';
  return null;
}

export function getSortedWebSpeechVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => {
    const aEs = (a.lang || '').toLowerCase().startsWith('es') ? 0 : 1;
    const bEs = (b.lang || '').toLowerCase().startsWith('es') ? 0 : 1;
    if (aEs !== bEs) return aEs - bEs;
    return (a.name || '').localeCompare(b.name || '');
  });
}

export function selectWebSpeechVoice(
  voices: SpeechSynthesisVoice[],
  gender: VoiceGender,
  langPrefix = 'es',
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const targetMatch = gender === 'female' ? FEMALE_VOICE_RE : MALE_VOICE_RE;
  const oppositeMatch = gender === 'female' ? MALE_VOICE_RE : FEMALE_VOICE_RE;

  let bestVoice: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;

  for (const voice of voices) {
    const lang = (voice.lang || '').toLowerCase();
    const name = `${voice.name || ''} ${voice.voiceURI || ''}`.toLowerCase();

    let score = 0;
    if (lang === 'es-es' || lang === 'es-mx' || lang === 'es-419') score += 40;
    else if (lang.startsWith(langPrefix.toLowerCase())) score += 30;
    else if (lang.startsWith('en')) score += 5;

    if (targetMatch.test(name)) score += 50;
    if (oppositeMatch.test(name)) score -= 45;
    if (/google|microsoft|natural|neural|online/i.test(name)) score += 8;
    if (voice.localService) score += 2;

    if (score > bestScore) {
      bestScore = score;
      bestVoice = voice;
    }
  }

  return bestVoice;
}

export function resolveUtteranceVoice(
  voices: SpeechSynthesisVoice[],
  gender: VoiceGender,
  explicitVoiceURI?: string | null,
): SpeechSynthesisVoice | null {
  if (explicitVoiceURI && voices.length > 0) {
    const exact = voices.find(
      (v) => v.voiceURI === explicitVoiceURI || v.name === explicitVoiceURI,
    );
    if (exact) return exact;
  }
  return selectWebSpeechVoice(voices, gender, 'es');
}

export function speakAndPulseHologram(
  text: string,
  gender: VoiceGender = 'female',
  callbacks?: HologramSpeechCallbacks,
): void {
  const clean = text.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 320);
  if (!clean || typeof window === 'undefined') {
    callbacks?.onEnd?.();
    return;
  }

  let finished = false;
  let pulseInterval: number | null = null;
  let audioCtx: AudioContext | null = null;

  const finish = () => {
    if (finished) return;
    finished = true;
    if (pulseInterval !== null) {
      window.clearInterval(pulseInterval);
      pulseInterval = null;
    }
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
    callbacks?.onEnd?.();
  };

  let speechStarted = false;
  if ('speechSynthesis' in window) {
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(clean);
      const voices = synth.getVoices();
      const matchedVoice = resolveUtteranceVoice(voices, gender, callbacks?.voiceURI);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
        utterance.lang = matchedVoice.lang || 'es-ES';
      } else {
        utterance.lang = 'es-ES';
      }
      utterance.rate = 1.0;
      utterance.pitch = gender === 'female' ? 1.14 : 0.84;

      utterance.onstart = () => {
        callbacks?.onStart?.();
      };
      utterance.onboundary = () => {
        callbacks?.onBoundary?.();
      };
      utterance.onend = finish;
      utterance.onerror = finish;

      callbacks?.onStart?.();
      synth.speak(utterance);
      speechStarted = true;
    } catch {
      speechStarted = false;
    }
  }

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioCtx();
  } catch {
    audioCtx = null;
  }

  const chars = Array.from(clean)
    .filter((c) => /[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]/.test(c))
    .slice(0, 36);
  let idx = 0;

  pulseInterval = window.setInterval(() => {
    if (idx >= chars.length) {
      if (pulseInterval !== null) {
        window.clearInterval(pulseInterval);
        pulseInterval = null;
      }
      if (!speechStarted) {
        finish();
      }
      return;
    }

    const r = RUNES[chars[idx].charCodeAt(0) % RUNES.length];
    const cube = deriveCubeFacesForPrime(r.index, r.prime);
    const freqScale = gender === 'female' ? 1.0 : 0.78;
    const freq =
      r.frequencyHz *
      ([1, 1.125, 1.25, 1.5][cube.caraInternaB_semillaAcustica] ?? 1) *
      freqScale;

    if (audioCtx && audioCtx.state !== 'closed') {
      try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.035, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.095);
      } catch {
        // Ignore audio scheduling errors
      }
    }
    if (idx % 4 === 0) {
      callbacks?.onBoundary?.();
    }
    idx++;
  }, 115);

  if (speechStarted) {
    window.setTimeout(finish, Math.min(14000, Math.max(2400, clean.length * 90)));
  }
}
