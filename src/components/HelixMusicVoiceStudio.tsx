import { useState } from 'react';
import { Film, Music, Play, Plus, Trash2, Volume2 } from 'lucide-react';
import { GALDR_CAST_20 } from '../data/galdrCast20';
import { FUTHORC_33 } from '../data/futhorc33';
import {
  DEFAULT_HELIX_PRODUCTION,
  HelixCineProductionScript,
  ProductionSceneBeat,
  resolveBeatMetadata,
} from '../core/helixProductionScript';
import { speakAndPulseHologram } from '../utils/cochlearPulseSynth';

interface HelixMusicVoiceStudioProps {
  script: HelixCineProductionScript;
  onChangeScript: (next: HelixCineProductionScript) => void;
  onSendToCinema: (script: HelixCineProductionScript) => void;
}

export function HelixMusicVoiceStudio({
  script = DEFAULT_HELIX_PRODUCTION,
  onChangeScript,
  onSendToCinema,
}: HelixMusicVoiceStudioProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);

  const playRunicChordPreview = (beat: ProductionSceneBeat) => {
    const { actor, freqHz } = resolveBeatMetadata(beat);
    setPreviewId(beat.id);
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [73.42, freqHz, freqHz * 1.498].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.035, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 2.2);
      });
      window.setTimeout(() => { ctx.close().catch(() => {}); setPreviewId(null); }, 2300);
    }
    speakAndPulseHologram(`${beat.oldEnglishLine}. ${beat.modernEnglishLine}`, actor.voiceGender);
  };

  const updateBeat = (id: string, patch: Partial<ProductionSceneBeat>) => {
    onChangeScript({
      ...script,
      beats: script.beats.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  };

  const addBeat = () => {
    const nextIdx = script.beats.length + 1;
    const actor = GALDR_CAST_20[nextIdx % GALDR_CAST_20.length];
    onChangeScript({
      ...script,
      beats: [
        ...script.beats,
        {
          id: `beat-${Date.now()}`,
          castId: actor.id,
          runeIndex: ((nextIdx * 3) % 33) + 1,
          oldEnglishLine: actor.catchphraseOldEnglish,
          modernEnglishLine: actor.catchphraseModernEnglish,
          durationSec: 4,
          energy: 0.7,
          tension: 0.5,
        },
      ],
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-[#05080f] p-4 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-slate-900/75 p-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400">RAMA 1 · COMPOSICIÓN & CODIFICACIÓN P₃₃</span>
          <input
            type="text"
            value={script.title}
            onChange={(e) => onChangeScript({ ...script, title: e.target.value })}
            className="mt-1 block w-full bg-transparent font-nordic text-lg font-bold text-white focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addBeat}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium hover:bg-white/10"
          >
            <Plus className="h-4 w-4 text-amber-400" />
            <span>Añadir Escena</span>
          </button>
          <button
            type="button"
            onClick={() => onSendToCinema(script)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
          >
            <Film className="h-4 w-4" />
            <span>Pasar Script a Estudio Cinematográfico</span>
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {script.beats.map((beat, idx) => {
          const { actor, rune, freqHz } = resolveBeatMetadata(beat);
          return (
            <div key={beat.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 font-mono text-xs font-bold text-amber-300">
                    #{idx + 1} · {rune.glyph} {rune.name} (p={rune.primeP33} · {freqHz}Hz)
                  </span>
                  <select
                    value={beat.castId}
                    onChange={(e) => updateBeat(beat.id, { castId: e.target.value })}
                    className="rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  >
                    {GALDR_CAST_20.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.runeGlyph} {m.name} — {m.title} ({m.voiceGender === 'female' ? 'F' : 'M'})
                      </option>
                    ))}
                  </select>
                  <select
                    value={beat.runeIndex}
                    onChange={(e) => updateBeat(beat.id, { runeIndex: Number(e.target.value) })}
                    className="rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-amber-200"
                  >
                    {FUTHORC_33.map((r) => (
                      <option key={r.index} value={r.index}>
                        {r.glyph} {r.name} ({r.ipa}) — {r.meaning}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => playRunicChordPreview(beat)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium ${
                      previewId === beat.id ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {previewId === beat.id ? <Volume2 className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    <span>Probar Armonía y Voz</span>
                  </button>
                  {script.beats.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onChangeScript({ ...script, beats: script.beats.filter((b) => b.id !== beat.id) })}
                      className="rounded-xl bg-white/5 p-1.5 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <label className="text-[11px] font-mono uppercase text-amber-400/90">Guion Inglés Antiguo (Ænglisc)</label>
                  <input
                    type="text"
                    value={beat.oldEnglishLine}
                    onChange={(e) => updateBeat(beat.id, { oldEnglishLine: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 text-sm text-amber-100 focus:border-amber-400/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase text-sky-400/90">Subtítulo Inglés Moderno</label>
                  <input
                    type="text"
                    value={beat.modernEnglishLine}
                    onChange={(e) => updateBeat(beat.id, { modernEnglishLine: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 text-sm text-white focus:border-sky-400/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1"><Music className="h-3.5 w-3.5 text-amber-400" /> {actor.talentSummary}</span>
                <label className="ml-auto flex items-center gap-2">
                  <span>Duración (s):</span>
                  <input
                    type="number"
                    min={2}
                    max={15}
                    value={beat.durationSec}
                    onChange={(e) => updateBeat(beat.id, { durationSec: Math.max(2, Number(e.target.value)) })}
                    className="w-14 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-center text-white"
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



