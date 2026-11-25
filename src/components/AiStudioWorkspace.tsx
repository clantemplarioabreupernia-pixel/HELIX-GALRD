import { evaluateAstronautMissionHealth } from '../core/helixAstronautHealth';
import { parseStoryIntoMusicalScore, playStoryScoreLive } from '../core/helixStoryScoreEngine';
import { evolveCompanionWithTurn, getInitialCompanionGreeting, loadCompanionBond } from '../core/helixCompanionBond';
import { MORPH_SHAPE_LABELS } from '../data/morphShapeLabels';
import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, ImagePlus, Mic, MicOff, Send, Volume2, VolumeX, X } from 'lucide-react';
import { createHelixCoreEngine, EngineeringReport } from '../core';
import {
  buildHumanConversationReply,
  buildHumanCineReply,
  classifyConversationIntent,
  isActionOrCreationIntent,
  toSpokenSummary,
} from '../core/helixConversationalBrain';
import {
  getSortedWebSpeechVoices,
  inferVoiceGenderFromVoice,
  loadPersistedVoicePrefs,
  savePersistedVoicePrefs,
  speakAndPulseHologram,
  VoiceGender,
} from '../utils/cochlearPulseSynth';
import { DEFAULT_HELIX_PHYSICS_PROGRAM } from '../utils/helixVm';
import {
  LiquidBiopixelCanvas,
  LiquidMorphShape,
  } from './LiquidBiopixelCanvas';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  artifactHtml?: string;
  artifactTitle?: string;
}

export interface HologramProjectionPayload {
  id: number;
  hlxScript: string;
  title: string;
  subtitle?: string;
  shape?: LiquidMorphShape;
  accentHex?: string;
}

interface AiStudioWorkspaceProps {
  externalProjection?: HologramProjectionPayload | null;
}

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function inferShapeAndAccent(
  text: string,
  report?: EngineeringReport,
): { shape: LiquidMorphShape; accentHex: string } {
  const combined = text.toLowerCase();

  if (
    combined.includes('rostro') ||
    combined.includes('cara') ||
    combined.includes('avatar') ||
    combined.includes('humano') ||
    combined.includes('vuelve contigo')
  ) {
    return { shape: 'avatar', accentHex: '#38bdf8' };
  }
  if (combined.includes('cristal') || combined.includes('icosa') || combined.includes('óptic') || combined.includes('optica')) {
    return { shape: 'crystal', accentHex: '#a78bfa' };
  }
  if (combined.includes('toroide') || combined.includes('torus') || combined.includes('anillo') || combined.includes('portal')) {
    return { shape: 'torus', accentHex: '#22d3ee' };
  }
  if (
    combined.includes('montaña') ||
    combined.includes('montana') ||
    combined.includes('terreno') ||
    combined.includes('paisaje') ||
    combined.includes('bioma')
  ) {
    return { shape: 'terrain_fbm', accentHex: '#34d399' };
  }
  if (
    combined.includes('cuántic') ||
    combined.includes('cuantic') ||
    combined.includes('bloch') ||
    combined.includes('qubit') ||
    report?.detectedCategory === 'CUANTICA'
  ) {
    return { shape: 'quantum_bloch', accentHex: '#818cf8' };
  }
  if (
    combined.includes('nave') ||
    combined.includes('cohete') ||
    combined.includes('satel') ||
    combined.includes('orbit') ||
    combined.includes('órbita') ||
    report?.detectedCategory === 'SIMULACION_ESPACIAL' ||
    report?.detectedCategory === 'VIDEOJUEGO'
  ) {
    return { shape: 'orbital_ship', accentHex: '#38bdf8' };
  }
  if (
    combined.includes('música') ||
    combined.includes('musica') ||
    combined.includes('onda') ||
    combined.includes('fluido') ||
    combined.includes('hz')
  ) {
    return { shape: 'cymatic_wave', accentHex: '#0ea5e9' };
  }
  return { shape: 'avatar', accentHex: '#38bdf8' };
}

export function AiStudioWorkspace({ externalProjection }: AiStudioWorkspaceProps = {}) {
  const stopCineScoreRef = useRef<(() => void) | null>(null);
  const [engine] = useState(() => createHelixCoreEngine());

  const [inputText, setInputText] = useState('');
  const [initialVoicePrefs] = useState(() => loadPersistedVoicePrefs());
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(initialVoicePrefs.enabled);
  const [voiceGender, setVoiceGender] = useState<VoiceGender>(initialVoicePrefs.gender);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(initialVoicePrefs.voiceURI);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(initialVoicePrefs.voiceName);
  const [micActive, setMicActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [attachedImageDataUrl, setAttachedImageDataUrl] = useState<string | null>(null);
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);
  const [activeArtifact, setActiveArtifact] = useState<{ html: string; title: string } | null>(null);

  const [currentScript, setCurrentScript] = useState<string>(DEFAULT_HELIX_PHYSICS_PROGRAM);
  const [currentShape, setCurrentShape] = useState<LiquidMorphShape>('avatar');
  const [accentHex, setAccentHex] = useState<string>('#38bdf8');
  const [pulseCounter, setPulseCounter] = useState<number>(1);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: getInitialCompanionGreeting(loadCompanionBond()),
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const speakTimerRef = useRef<number | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isThinking]);

  useEffect(() => {
    savePersistedVoicePrefs({
      enabled: voiceEnabled,
      gender: voiceGender,
      voiceURI: selectedVoiceURI,
      voiceName: selectedVoiceName,
    });
  }, [voiceEnabled, voiceGender, selectedVoiceURI, selectedVoiceName]);

  useEffect(() => {
    return () => {
      if (speakTimerRef.current !== null) {
        window.clearTimeout(speakTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore stop errors on unmount
        }
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const syncVoices = () => {
      try {
        const list = getSortedWebSpeechVoices(window.speechSynthesis.getVoices());
        setAvailableVoices(list);
        if (list.length > 0 && (selectedVoiceURI || selectedVoiceName)) {
          const matched =
            list.find((v) => v.voiceURI === selectedVoiceURI) ||
            list.find((v) => v.name === selectedVoiceName);
          if (matched && matched.voiceURI !== selectedVoiceURI) {
            setSelectedVoiceURI(matched.voiceURI);
          }
        }
      } catch {
        // Ignore browser voice enumeration errors
      }
    };
    syncVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', syncVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', syncVoices);
    };
  }, [selectedVoiceURI, selectedVoiceName]);

  const triggerVoiceReply = (
    text: string,
    gender: VoiceGender = voiceGender,
    overrideVoiceURI?: string | null,
  ) => {
    if (!voiceEnabled || !text.trim()) return;
    if (speakTimerRef.current !== null) {
      window.clearTimeout(speakTimerRef.current);
    }
    const activeURI =
      overrideVoiceURI !== undefined ? overrideVoiceURI : selectedVoiceURI || null;
    setIsSpeaking(true);
    speakAndPulseHologram(text, gender, {
      voiceURI: activeURI,
      onStart: () => setIsSpeaking(true),
      onBoundary: () => setPulseCounter((c) => c + 1),
      onEnd: () => setIsSpeaking(false),
    });
    const fallbackMs = Math.min(12000, Math.max(2200, text.length * 75));
    speakTimerRef.current = window.setTimeout(() => {
      setIsSpeaking(false);
    }, fallbackMs);
  };

  const handleSelectVoiceGender = (nextGender: VoiceGender) => {
    setVoiceGender(nextGender);
    setSelectedVoiceURI('');
    setSelectedVoiceName('');
    if (voiceEnabled) {
      triggerVoiceReply(
        nextGender === 'female' ? 'Voz femenina activa.' : 'Voz masculina activa.',
        nextGender,
        null,
      );
    }
  };

  const handleSelectVoiceURI = (nextURI: string) => {
    const chosen = availableVoices.find((v) => v.voiceURI === nextURI);
    setSelectedVoiceURI(nextURI);
    setSelectedVoiceName(chosen?.name ?? '');

    const inferred = chosen ? inferVoiceGenderFromVoice(chosen) : null;
    const nextGender = inferred ?? voiceGender;
    if (inferred) {
      setVoiceGender(inferred);
    }

    if (voiceEnabled) {
      const sampleText = chosen
        ? `Hola, ahora te hablo con la voz ${chosen.name}.`
        : nextGender === 'female'
          ? 'Voz femenina activa.'
          : 'Voz masculina activa.';
      triggerVoiceReply(sampleText, nextGender, nextURI || null);
    }
  };

  useEffect(() => {
    if (!externalProjection || !externalProjection.hlxScript.trim()) return;
    setCurrentScript(externalProjection.hlxScript);
    setCurrentShape(externalProjection.shape ?? 'avatar');
    setAccentHex(externalProjection.accentHex ?? '#38bdf8');
    setPulseCounter((c) => c + 1);
    const note = `He proyectado «${externalProjection.title}» en la pantalla holográfica.`;
    setMessages((prev) => [
      ...prev,
      {
        id: `proj_${externalProjection.id}`,
        role: 'assistant',
        text: note,
      },
    ]);
    if (voiceEnabled) {
      triggerVoiceReply(note, voiceGender);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalProjection]);

  const handleAttachImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAttachedImageDataUrl(reader.result);
        setAttachedImageName(file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDownloadArtifact = (html: string, title: string) => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 32) || 'helix_creacion'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendInstruction = async (overrideText?: string) => {
    const rawTyped = (overrideText ?? inputText).trim();
    const text = rawTyped || (attachedImageName ? `Mezclar imagen real (${attachedImageName}) con simulación procedural` : '');
    if (!text) return;
    if (!overrideText) setInputText('');
    const currentImageDataUrl = attachedImageDataUrl;
    const currentImageName = attachedImageName;
    setAttachedImageDataUrl(null);
    setAttachedImageName(null);
    setMicNotice(null);

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      text: currentImageName ? `${text} [${currentImageName}]` : text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    // 1. Toda la arquitectura interna (Línea Recta, Doble Hélice, 17B QPSK-132, Biblioteca Autodidacta, Recombinador A×B y PCC) opera en silencio en segundo plano
    const actionIntent = isActionOrCreationIntent(text) || Boolean(currentImageDataUrl);
    const chatKind = classifyConversationIntent(text);
    const report = engine.analyzeIntent(text, {}, 'AUTO', {}, true);
    engine.runAutodidactSynthesis(text, report.recombination);

    const { shape: inferredShape, accentHex: nextHex } = actionIntent
      ? inferShapeAndAccent(text, report)
      : { shape: 'avatar' as LiquidMorphShape, accentHex: '#38bdf8' };

    const nextScript =
      report.recombination?.synthesizedHlx || DEFAULT_HELIX_PHYSICS_PROGRAM;

    setCurrentScript(nextScript);
    setCurrentShape(inferredShape);
    setAccentHex(nextHex);
    setPulseCounter((c) => c + 1);

    // Entrenamiento silencioso local + N2 si hubo recombinación certificada PCC
    const recomb = report.recombination;
    if (recomb?.success && recomb.pccVerified && recomb.synthesizedHlx) {
      engine.recordCertifiedCapsule(
        {
          prompt: text,
          reply: recomb.engineeringSummary,
          hlxScript: recomb.synthesizedHlx,
          shape: inferredShape,
          domain: recomb.disciplines33[0]?.name ?? 'RECOMBINACION_AB',
        },
        2,
      );

      fetch('/api/recombine/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          summary: recomb.engineeringSummary,
          hlxScript: recomb.synthesizedHlx,
          domain: recomb.disciplines33[0]?.name ?? 'RECOMBINACION_AB',
          qpsk17Sha256: recomb.holographicCard?.frame.frameSha256 ?? '',
          disciplineMaskBits33: recomb.disciplineMaskBits33,
          steps: 2,
        }),
      }).catch(() => {});
    }

    const bondStep = evolveCompanionWithTurn(text, MORPH_SHAPE_LABELS[inferredShape] ?? 'General');
        const isStoryRequest = /\b(cuento|historia|escanea|caperucita|pel[ií]cula|partitura|musicaliza)\b/i.test(text);
    let storyAddendum = '';
    const healthEval = evaluateAstronautMissionHealth(text);
    if (healthEval.detected) {
      storyAddendum += '\n\n' + healthEval.summary + '\n' + healthEval.guidance;
      setAccentHex(healthEval.accentHex);
      setCurrentShape('quantum_bloch');
    }

    const { replyText, cues } = buildHumanCineReply(
      text,
      MORPH_SHAPE_LABELS[inferredShape] ?? 'Rostro Holográfico Humano',
      report.activatedEngines.length,
      actionIntent,
      {
        engine,
        report,
        history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
      },
    );

    const activeCues = isStoryRequest ? parseStoryIntoMusicalScore(text) : cues;
    if (isStoryRequest) {
      storyAddendum += '\n\nPartitura Rúnica P33 (' + activeCues.length + ' escenas): ' + activeCues.map(c => '[E' + c.index + ': p=' + c.prime + ' · ' + c.freqHz + 'Hz]').join(' → ');
    }

    stopCineScoreRef.current?.();
    stopCineScoreRef.current = playStoryScoreLive(activeCues, (cue, cine) => {
      setPulseCounter((n) => n + 1);
      if (isStoryRequest || cine.shotCode === 0x03) {
        setCurrentShape(cue.mood === 'bosque' ? 'terrain_fbm' : cue.mood === 'tension' ? 'cymatic_wave' : 'avatar');
      }
      setAccentHex(cine.shotCode === 0x03 ? '#f43f5e' : cue.mood === 'bosque' ? '#22c55e' : '#38bdf8');
    });

    const enrichedReply = replyText + storyAddendum; const finalReply = bondStep.bondReplyOverride ?? (bondStep.distilledPrompt ? enrichedReply + "\n\n" + bondStep.distilledPrompt : enrichedReply);

    // 2. Destilación N2 + Aduana PCC en servidor en segundo plano
    try {
      const r = await fetch('/api/ollama/distill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });
      const d = r.ok ? await r.json() : null;
      if (d?.ok && d?.capsule) {
        if (d.capsule.hlxScript) {
          setCurrentScript(String(d.capsule.hlxScript));
        }
        if (actionIntent && d.capsule.shape) {
          setCurrentShape(d.capsule.shape as LiquidMorphShape);
        } else if (
          chatKind === 'greeting' ||
          chatKind === 'identity' ||
          chatKind === 'capabilities' ||
          chatKind === 'gratitude'
        ) {
          setCurrentShape('avatar');
        }
        if (d.capsule.accentColor) {
          setAccentHex(String(d.capsule.accentColor));
        }
        setPulseCounter((c) => c + 1);
      }
    } catch {
      // Mantiene respuesta conversacional determinista local si el servidor no responde
    }

    // Si el usuario adjuntó una imagen real, inyectarla limpiamente en la escena HTML5 autogenerada
    let finalArtifactHtml = actionIntent ? report.materializedHtmlPreview : undefined;
    if (finalArtifactHtml && currentImageDataUrl) {
      const safeJsonUrl = JSON.stringify(currentImageDataUrl);
      finalArtifactHtml = finalArtifactHtml.replace(
        '</body>',
        `<script>(function(){try{var img=new Image();img.onload=function(){if(typeof loadedImg!=="undefined")loadedImg=img;if(typeof bgImg!=="undefined")bgImg=img;if(typeof bg!=="undefined")bg=img;};img.src=${safeJsonUrl};}catch(e){}})();</script></body>`,
      );
    }

    setIsThinking(false);
    setMessages((prev) => [
      ...prev,
      {
        id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        role: 'assistant',
        text: finalReply,
        artifactHtml: finalArtifactHtml,
        artifactTitle: actionIntent ? text.slice(0, 48) : undefined,
      },
    ]);

    if (voiceEnabled) {
      triggerVoiceReply(toSpokenSummary(replyText), voiceGender);
    }
  };

  const handleToggleMic = () => {
    setMicNotice(null);
    if (micActive && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      setMicActive(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
    const SpeechRecCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecCtor) {
      setMicNotice('Tu navegador no permite dictado por micrófono; puedes escribir aquí.');
      return;
    }

    try {
      const recognition = new SpeechRecCtor();
      recognition.lang = 'es-ES';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? '';
        setMicActive(false);
        if (transcript) {
          void handleSendInstruction(transcript);
        }
      };
      recognition.onerror = () => {
        setMicActive(false);
      };
      recognition.onend = () => {
        setMicActive(false);
      };

      recognitionRef.current = recognition;
      setMicActive(true);
      recognition.start();
    } catch {
      setMicActive(false);
      setMicNotice('No fue posible iniciar el micrófono.');
    }
  };

  const handleToggleVoiceOutput = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    if (!next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore synthesis cancel errors
      }
      setIsSpeaking(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendInstruction();
    }
  };

  const visibleMessages = messages.slice(-4);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Presencia central viva a pantalla completa: Rostro Holográfico Humano */}
      <div className="absolute inset-0">
        <LiquidBiopixelCanvas
          hlxScript={currentScript}
          shape={currentShape}
          pulseCounter={pulseCounter}
          accentHex={accentHex}
          energy={isSpeaking ? 0.92 : 0.35}
          tension={micActive ? 0.72 : 0.35}
          isSpeaking={isSpeaking}
          hideOverlay
        />
      </div>

      {/* Degradado inferior para legibilidad natural del diálogo sin encerrar el rostro */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-transparent" />

      {/* Zona inferior minimalista: diálogo humano limpio + barra única */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-4 pb-5 sm:px-6 sm:pb-7">
        <div className="pointer-events-auto flex w-full max-w-2xl flex-col gap-3">
          {/* Mensajes limpios de conversación natural */}
          <div className="flex max-h-[42vh] flex-col gap-2 overflow-y-auto px-1">
            {visibleMessages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1.5`}
                >
                  <p
                    className={`max-w-[92%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed backdrop-blur-md ${
                      isUser
                        ? 'border border-sky-400/20 bg-sky-500/15 text-sky-50'
                        : 'border border-white/10 bg-slate-950/75 text-slate-100'
                    }`}
                  >
                    {msg.text}
                  </p>
                  {!isUser && msg.artifactHtml && (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveArtifact({
                          html: msg.artifactHtml!,
                          title: msg.artifactTitle || 'Creación Interactiva',
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-200 backdrop-blur-md transition-colors hover:bg-sky-500/25 hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Abrir creación interactiva</span>
                    </button>
                  )}
                </div>
              );
            })}
            {isThinking && (
              <div className="flex justify-start">
                <span className="px-2 text-xs text-slate-400">Escuchando y procesando…</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {attachedImageName && (
            <div className="flex items-center justify-between rounded-xl border border-sky-400/25 bg-slate-900/80 px-3 py-1.5 text-xs text-sky-200 backdrop-blur-md">
              <span className="truncate">Imagen adjunta para mezcla/análisis: {attachedImageName}</span>
              <button
                type="button"
                onClick={() => {
                  setAttachedImageDataUrl(null);
                  setAttachedImageName(null);
                }}
                className="ml-2 text-slate-400 hover:text-white"
                aria-label="Quitar imagen adjunta"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {micNotice && (
            <p className="px-2 text-center text-xs text-slate-400">{micNotice}</p>
          )}

          {/* Cuadro de diálogo minimalista: texto + imagen opcional + micrófono + voz + selector Femenina/Masculina */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-slate-900/80 p-2 backdrop-blur-md sm:flex-nowrap">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAttachImage}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar imagen real o captura para mezclar o analizar"
              aria-label="Adjuntar imagen real"
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                attachedImageName
                  ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/50'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ImagePlus className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleToggleMic}
              title={micActive ? 'Detener micrófono' : 'Hablar por micrófono'}
              aria-label={micActive ? 'Detener micrófono' : 'Hablar por micrófono'}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                micActive
                  ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/50'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {micActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={handleToggleVoiceOutput}
              title={voiceEnabled ? 'Silenciar voz de Helix' : 'Activar voz de Helix'}
              aria-label={voiceEnabled ? 'Silenciar voz de Helix' : 'Activar voz de Helix'}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                voiceEnabled
                  ? 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Selector discreto Femenina / Masculina + Desplegable minimalista de voces Web Speech API */}
            <div
              role="group"
              aria-label="Selector de voz"
              className="inline-flex h-10 shrink-0 items-center rounded-xl bg-white/5 p-1 text-xs"
            >
              <button
                type="button"
                aria-pressed={!selectedVoiceURI && voiceGender === 'female'}
                onClick={() => handleSelectVoiceGender('female')}
                className={`h-8 rounded-lg px-2.5 font-medium transition-colors whitespace-nowrap shrink-0 ${
                  voiceGender === 'female'
                    ? 'bg-white/15 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Femenina
              </button>
              <button
                type="button"
                aria-pressed={!selectedVoiceURI && voiceGender === 'male'}
                onClick={() => handleSelectVoiceGender('male')}
                className={`h-8 rounded-lg px-2.5 font-medium transition-colors whitespace-nowrap shrink-0 ${
                  voiceGender === 'male'
                    ? 'bg-white/15 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Masculina
              </button>
            </div>

            <select
              aria-label="Selector de Voz Web Speech"
              title="Elegir voz del motor Web Speech API"
              value={selectedVoiceURI}
              onChange={(e) => handleSelectVoiceURI(e.target.value)}
              className="h-10 max-w-[156px] shrink-0 truncate rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 focus:border-sky-400/50 focus:outline-none"
            >
              <option value="" className="bg-slate-900 text-slate-100">
                Voz: {voiceGender === 'female' ? 'Auto Femenina' : 'Auto Masculina'}
              </option>
              {availableVoices.map((voice) => (
                <option
                  key={voice.voiceURI}
                  value={voice.voiceURI}
                  className="bg-slate-900 text-slate-100"
                >
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Conversa con Helix, aprende o pide una simulación..."
              className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm text-white placeholder:text-slate-400 focus:outline-none"
            />

            <button
              type="button"
              onClick={() => void handleSendInstruction()}
              disabled={!inputText.trim() && !attachedImageDataUrl}
              aria-label="Enviar mensaje"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-sky-500 px-4 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Enviar</span>
            </button>
          </div>
        </div>
      </div>

      {activeArtifact && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
          <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <span className="truncate text-sm font-semibold text-white">
                {activeArtifact.title}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadArtifact(activeArtifact.html, activeArtifact.title)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Descargar HTML5</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveArtifact(null)}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Cerrar</span>
                </button>
              </div>
            </div>
            <iframe
              title={activeArtifact.title}
              srcDoc={activeArtifact.html}
              sandbox="allow-scripts"
              className="min-h-0 w-full flex-1 border-0 bg-slate-950"
            />
          </div>
        </div>
      )}
    </div>
  );
}










