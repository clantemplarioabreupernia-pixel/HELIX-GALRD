import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Circle, Download, Play, Square } from 'lucide-react';
import { LiquidBiopixelCanvas } from './LiquidBiopixelCanvas';
import {
  DEFAULT_HELIX_PRODUCTION,
  HelixCineProductionScript,
  resolveBeatMetadata,
} from '../core/helixProductionScript';
import { speakAndPulseHologram } from '../utils/cochlearPulseSynth';

interface HelixCinemaRecorderViewProps {
  script: HelixCineProductionScript;
  onBackToComposer: () => void;
}

export function HelixCinemaRecorderView({
  script = DEFAULT_HELIX_PRODUCTION,
  onBackToComposer,
}: HelixCinemaRecorderViewProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [beatIdx, setBeatIdx] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  const currentBeat = script.beats[beatIdx] ?? script.beats[0];
  const { actor, rune, freqHz, shape } = resolveBeatMetadata(currentBeat);

  const stopProduction = () => {
    setIsPlaying(false);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const runProduction = (withRecording: boolean) => {
    setRecordedUrl(null);
    setBeatIdx(0);
    setIsPlaying(true);

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = AudioCtx ? new AudioCtx() : null;
    const dest = ctx ? ctx.createMediaStreamDestination() : null;

    if (withRecording && stageRef.current) {
      const canvas = stageRef.current.querySelector('canvas');
      if (canvas) {
        const videoStream = canvas.captureStream(60);
        const tracks = [...videoStream.getVideoTracks(), ...(dest ? dest.stream.getAudioTracks() : [])];
        const combined = new MediaStream(tracks);
        const rec = new MediaRecorder(combined, { mimeType: 'video/webm' });
        chunksRef.current = [];
        rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        rec.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          setRecordedUrl(URL.createObjectURL(blob));
        };
        rec.start();
        recorderRef.current = rec;
        setIsRecording(true);
      }
    }

    let idx = 0;
    const step = () => {
      if (idx >= script.beats.length) {
        if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
        stopProduction();
        return;
      }
      setBeatIdx(idx);
      const b = script.beats[idx];
      const meta = resolveBeatMetadata(b);

      if (ctx) {
        const now = ctx.currentTime;
        [73.42, meta.freqHz, meta.freqHz * 1.498].forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = i === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(0.04, now + 0.2);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + b.durationSec);
          osc.connect(gain);
          gain.connect(ctx.destination);
          if (dest) gain.connect(dest);
          osc.start(now);
          osc.stop(now + b.durationSec);
        });
      }

      speakAndPulseHologram(`${b.oldEnglishLine}. ${b.modernEnglishLine}`, meta.actor.voiceGender);
      idx += 1;
      window.setTimeout(step, b.durationSec * 1000);
    };
    step();
  };

  useEffect(() => () => stopProduction(), []);

  return (
    <div className="relative flex h-full w-full flex-col bg-[#05080f] text-white">
      {/* Barra superior mínima de rodaje */}
      <div className="z-20 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#05080f]/90 px-4 py-2.5 backdrop-blur-md">
        <button
          type="button"
          onClick={onBackToComposer}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Volver a Estudio Musical</span>
        </button>

        <span className="font-nordic text-xs font-bold tracking-wider text-amber-400">{script.title}</span>

        <div className="flex items-center gap-2">
          {!isPlaying ? (
            <>
              <button
                type="button"
                onClick={() => runProduction(false)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Ensayar Escena</span>
              </button>
              <button
                type="button"
                onClick={() => runProduction(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-500"
              >
                <Circle className="h-3 w-3 fill-current" />
                <span>Producir y Grabar Toma</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={stopProduction}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>{isRecording ? 'Detener Grabación' : 'Detener'}</span>
            </button>
          )}

          {recordedUrl && (
            <a
              href={recordedUrl}
              download={`${script.title.replace(/\s+/g, '_').toLowerCase()}.webm`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Descargar Video</span>
            </a>
          )}
        </div>
      </div>

      {/* Escenario Biopíxel Viscoso a Pantalla Completa */}
      <div ref={stageRef} className="relative min-h-0 flex-1">
        <LiquidBiopixelCanvas
          shape={shape}
          accentHex={actor.accentHex}
          energy={isPlaying ? currentBeat.energy : 0.25}
          tension={isPlaying ? currentBeat.tension : 0.15}
          pulseCounter={rune.primeP33}
          isSpeaking={isPlaying}
          hideOverlay
        />

        {/* Subtítulos Duales Cinematográficos (Ænglisc + Modern English) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center px-6 text-center">
          <div className="max-w-3xl rounded-2xl border border-amber-500/25 bg-[#05080f]/80 px-6 py-4 shadow-2xl backdrop-blur-md">
            <div className="mb-1 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-widest text-amber-400">
              <span>{rune.glyph} {rune.name} · {freqHz}Hz</span>
              <span>•</span>
              <span>{actor.name}</span>
            </div>
            <p className="font-nordic text-base font-bold text-amber-200 md:text-lg">
              “{currentBeat.oldEnglishLine}”
            </p>
            <p className="mt-1 text-sm text-slate-100 md:text-base">
              {currentBeat.modernEnglishLine}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}



