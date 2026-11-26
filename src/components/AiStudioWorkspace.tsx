import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Atom,
  Camera,
  Check,
  Compass,
  Dna,
  Gamepad2,
  GitMerge,
  ImagePlus,
  Layers,
  MessageSquare,
  Mic,
  MicOff,
  Play,
  Scissors,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  createHelixCoreEngine,
  DecompositionResult,
  DOMAIN_ENGINE_METADATA,
  EngineeringReport,
  HelixRegisteredTool,
  HelixToolDomain,
  RecombinationResult,
} from '../core';
import { applyLineaRectaFilter, PLANETARY_FRAMES, PlanetaryFrameId } from '../core/helixAutodidactLoop';
import { evolveCompanionWithTurn, getInitialCompanionGreeting, loadCompanionBond } from '../core/helixCompanionBond';
import {
  buildHumanCineReply,
  classifyConversationIntent,
  isActionOrCreationIntent,
  toSpokenSummary,
} from '../core/helixConversationalBrain';
import {
  BIOPIXEL_TIERS,
  BiopixelResolutionTierId,
  buildPauliSoASwitchSimulationReport,
  LiveDisplayTelemetry,
} from '../core/helixPauliSoaDisplay';
import { computeCoupledNanotechBiopixelState } from '../core/helixQuantumDisplayPhysics';
import {
  parseStoryIntoMusicalScore,
  playStoryScoreLive,
  StorySceneMoldKind,
} from '../core/helixStoryScoreEngine';
import { MORPH_SHAPE_LABELS } from '../data/morphShapeLabels';
import {
  getSortedWebSpeechVoices,
  inferVoiceGenderFromVoice,
  loadPersistedVoicePrefs,
  savePersistedVoicePrefs,
  speakAndPulseHologram,
  VoiceGender,
} from '../utils/cochlearPulseSynth';
import { HelixBiopixel3DStage } from './HelixBiopixel3DStage';
import type { LiquidMorphShape } from './LiquidBiopixelCanvas';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
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
  planetId: PlanetaryFrameId;
  onChangePlanet: (planet: PlanetaryFrameId) => void;
  dnaLabTrigger?: number;
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

const DEFAULT_DECOMPOSE_SAMPLE = `# CELULA MULTIDOMINIO HELIX (Pauli-SoA + Bloch + Geometria A2)
ᛇᚢ
ᛗᚦ sys_admin
SOA_INIT 32
CURL_STEP 0.38 0.016
BLOCH_ROT 0 1 0 1.05 1
NEMESIS_DECAY 0.08
GEOM_SEAL ICOSAHEDRON PHI_FIBONACCI 457.84
WEBER_GUARD 0.015 1.0 1.05 wf_render
ᚳᛏ`;

function inferShapeAndAccent(
  text: string,
  report?: EngineeringReport,
): { shape: LiquidMorphShape; accentHex: string } {
  const combined = text.toLowerCase();
  if (
    /\b(qu[ií]mic|mol[eé]cul|[aá]tomo|enlace|reacci[oó]n|gibbs|nernst|morse|arrhenius|termodin[aá]mic|ph)\b/.test(
      combined,
    )
  ) {
    return { shape: 'chemistry_molecule', accentHex: '#22d3ee' };
  }
  if (
    combined.includes('nave') ||
    combined.includes('cohete') ||
    combined.includes('rover') ||
    combined.includes('satel') ||
    combined.includes('orbit') ||
    combined.includes('órbita') ||
    combined.includes('planeta') ||
    combined.includes('luna') ||
    combined.includes('marte') ||
    combined.includes('juego') ||
    report?.detectedCategory === 'SIMULACION_ESPACIAL'
  ) {
    return { shape: 'orbital_ship', accentHex: '#38bdf8' };
  }
  if (
    combined.includes('montañ') ||
    combined.includes('montana') ||
    combined.includes('ave') ||
    combined.includes('pájar') ||
    combined.includes('pajar') ||
    combined.includes('paisaje') ||
    combined.includes('terreno') ||
    combined.includes('naturaleza')
  ) {
    return { shape: 'terrain', accentHex: '#38bdf8' };
  }
  if (combined.includes('cristal') || combined.includes('diamante') || combined.includes('óptic') || combined.includes('octaedr')) {
    return { shape: 'crystal', accentHex: '#a78bfa' };
  }
  if (combined.includes('toroide') || combined.includes('anillo') || combined.includes('voronoi') || combined.includes('geometr') || combined.includes('euler')) {
    return { shape: 'torus', accentHex: '#22d3ee' };
  }
  if (
    combined.includes('música') ||
    combined.includes('musica') ||
    combined.includes('onda') ||
    combined.includes('sonido') ||
    combined.includes('cuento') ||
    combined.includes('bessel') ||
    combined.includes('hz')
  ) {
    return { shape: 'cymatic_wave', accentHex: '#0ea5e9' };
  }
  if (
    combined.includes('cuántic') ||
    combined.includes('cuantic') ||
    combined.includes('bloch') ||
    combined.includes('biopixel') ||
    report?.detectedCategory === 'CUANTICA'
  ) {
    return { shape: 'quantum_bloch', accentHex: '#818cf8' };
  }
  return { shape: 'orbital_ship', accentHex: '#38bdf8' };
}

async function analyzeOpticalSampleImage(
  dataUrl: string,
  fileName: string,
): Promise<{ lambdaNm: number; cauchyN: number; brusRadiusNm: number; summary: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 24;
      c.height = 24;
      const ctx = c.getContext('2d');
      if (!ctx) {
        const coupled = computeCoupledNanotechBiopixelState({ lambdaNm: 520, tension: 0.4 });
        resolve({
          lambdaNm: 520,
          cauchyN: coupled.brusCauchy.cauchyRefractiveIndex,
          brusRadiusNm: coupled.brusCauchy.radiusNm,
          summary: `Muestra óptica ${fileName}: λ≈520 nm · n(λ)=${coupled.brusCauchy.cauchyRefractiveIndex}.`,
        });
        return;
      }
      ctx.drawImage(img, 0, 0, 24, 24);
      const px = ctx.getImageData(0, 0, 24, 24).data;
      let r = 0;
      let g = 0;
      let b = 0;
      const n = px.length / 4;
      for (let i = 0; i < px.length; i += 4) {
        r += px[i];
        g += px[i + 1];
        b += px[i + 2];
      }
      const mr = r / n;
      const mg = g / n;
      const mb = b / n;
      const total = Math.max(1, mr + mg + mb);
      const lambdaNm = Math.round((mr * 645 + mg * 532 + mb * 455) / total);
      const tension = Math.min(1, Math.max(0.15, Math.abs(mr - mb) / 255 + 0.2));
      const coupled = computeCoupledNanotechBiopixelState({ lambdaNm, tension });
      resolve({
        lambdaNm,
        cauchyN: coupled.brusCauchy.cauchyRefractiveIndex,
        brusRadiusNm: coupled.brusCauchy.radiusNm,
        summary: `Espectro óptico de ${fileName}: λ_dom=${lambdaNm} nm · R_Brus=${coupled.brusCauchy.radiusNm} nm · n(λ)=${coupled.brusCauchy.cauchyRefractiveIndex} · EQE=${coupled.cieEqe.eqePercent}%.`,
      });
    };
    img.onerror = () => {
      const coupled = computeCoupledNanotechBiopixelState({ lambdaNm: 510, tension: 0.35 });
      resolve({
        lambdaNm: 510,
        cauchyN: coupled.brusCauchy.cauchyRefractiveIndex,
        brusRadiusNm: coupled.brusCauchy.radiusNm,
        summary: `Muestra óptica ${fileName}: λ≈510 nm · n(λ)=${coupled.brusCauchy.cauchyRefractiveIndex}.`,
      });
    };
    img.src = dataUrl;
  });
}

export function AiStudioWorkspace({
  planetId,
  onChangePlanet,
  dnaLabTrigger = 0,
  externalProjection,
}: AiStudioWorkspaceProps) {
  const stopCineScoreRef = useRef<(() => void) | null>(null);
  const [sideTab, setSideTab] = useState<'chat' | 'explore' | 'dna'>('chat');
  const [showMediaPanel, setShowMediaPanel] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  const [currentShape, setCurrentShape] = useState<LiquidMorphShape>(
    externalProjection?.shape ?? 'orbital_ship',
  );
  const [activeStoryMold, setActiveStoryMold] = useState<{
    moldKind: StorySceneMoldKind;
    primaryHex: string;
    secondaryHex: string;
    caption?: string;
  } | null>(null);
  const [accentHex, setAccentHex] = useState<string>('#38bdf8');
  const [pulseCounter, setPulseCounter] = useState<number>(1);
  const [resolutionTier, setResolutionTier] = useState<BiopixelResolutionTierId>('UHD_4K');
  const [displayTelemetry, setDisplayTelemetry] = useState<LiveDisplayTelemetry | null>(null);
  const [shipScore, setShipScore] = useState<number>(0);

  // Estado del Explorador de Herramientas, Recombinador ADN A×B y Descomponedor
  const [catalogVersion, setCatalogVersion] = useState<number>(0);
  const [toolSearch, setToolSearch] = useState<string>('');
  const [domainFilter, setDomainFilter] = useState<HelixToolDomain | 'TODOS'>('TODOS');
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([
    '201_chemistry_nernst_gibbs',
    '200_nanotech_biopixel_z4',
  ]);
  const [recombResult, setRecombResult] = useState<RecombinationResult | null>(null);
  const [decomposeInput, setDecomposeInput] = useState<string>(DEFAULT_DECOMPOSE_SAMPLE);
  const [decomposeResult, setDecomposeResult] = useState<DecompositionResult | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: getInitialCompanionGreeting(loadCompanionBond()),
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const speakTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (dnaLabTrigger > 0) {
      setSideTab('dna');
    }
  }, [dnaLabTrigger]);

  const planetSpec = PLANETARY_FRAMES[planetId];
  const engineCount = useMemo(() => Object.keys(DOMAIN_ENGINE_METADATA).length, []);
  const registeredTools = useMemo(() => {
    void catalogVersion;
    return engine.getRegisteredTools();
  }, [engine, catalogVersion]);

  const domainOptions = useMemo(() => {
    const unique = Array.from(new Set(registeredTools.map((t) => t.domain)));
    return ['TODOS', ...unique] as const;
  }, [registeredTools]);

  const filteredTools = useMemo(() => {
    const q = toolSearch.trim().toLowerCase();
    return registeredTools.filter((t) => {
      if (domainFilter !== 'TODOS' && t.domain !== domainFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.formulaSummary.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.includes(q))
      );
    });
  }, [registeredTools, domainFilter, toolSearch]);

  const crossExperiments = useMemo(() => engine.discoverCrossDomainExperiments(), [engine]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isThinking, sideTab]);

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
      stopCineScoreRef.current?.();
      if (speakTimerRef.current !== null) window.clearTimeout(speakTimerRef.current);
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
    if (speakTimerRef.current !== null) window.clearTimeout(speakTimerRef.current);
    const activeURI = overrideVoiceURI !== undefined ? overrideVoiceURI : selectedVoiceURI || null;
    setIsSpeaking(true);
    speakAndPulseHologram(text, gender, {
      voiceURI: activeURI,
      onStart: () => setIsSpeaking(true),
      onBoundary: () => setPulseCounter((c) => c + 1),
      onEnd: () => setIsSpeaking(false),
    });
    const fallbackMs = Math.min(12000, Math.max(2200, text.length * 75));
    speakTimerRef.current = window.setTimeout(() => setIsSpeaking(false), fallbackMs);
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
    if (inferred) setVoiceGender(inferred);
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
    stopCineScoreRef.current?.();
    setActiveStoryMold(null);
    setCurrentShape(externalProjection.shape ?? 'orbital_ship');
    setAccentHex(externalProjection.accentHex ?? '#38bdf8');
    setPulseCounter((c) => c + 1);
  }, [externalProjection]);

  const handleAttachImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isTextStory =
      file.type.startsWith('text/') || /\.(txt|md|hlx)$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (isTextStory) {
          if (/\.hlx$/i.test(file.name)) {
            setDecomposeInput(reader.result);
            setDecomposeResult(engine.decomposeProgram(reader.result, file.name, false));
            setSideTab('dna');
            setShowMediaPanel(false);
            return;
          }
          const cleanStory = reader.result.trim().slice(0, 1400);
          if (cleanStory) {
            setShowMediaPanel(false);
            void handleSendInstruction(`Escanea este cuento (${file.name}): ${cleanStory}`);
          }
        } else {
          setAttachedImageDataUrl(reader.result);
          setAttachedImageName(file.name);
        }
      }
    };
    if (isTextStory) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleRunRecombination = (idsOverride?: string[]) => {
    const ids = idsOverride ?? selectedToolIds;
    if (ids.length < 2) return;
    if (idsOverride) setSelectedToolIds(idsOverride);
    const result = engine.recombineTools(ids, {}, true);
    setRecombResult(result);
    if (result.synthesizedHlx) {
      setDecomposeInput(result.synthesizedHlx);
    }
    setCatalogVersion((v) => v + 1);

    // Proyectar el resultado recombinado directo en los biopíxeles 4K
    stopCineScoreRef.current?.();
    setActiveStoryMold(null);
    const summaryText = result.parentTools.map((t) => `${t.title} ${t.domain}`).join(' ');
    const inferred = inferShapeAndAccent(summaryText);
    setCurrentShape(inferred.shape);
    setAccentHex(inferred.accentHex);
    setPulseCounter((c) => c + 1);
  };

  const handleRunDecompose = (registerAtoms = false) => {
    const res = engine.decomposeProgram(decomposeInput, 'laboratorio_usuario.hlx', registerAtoms);
    setDecomposeResult(res);
    if (registerAtoms) {
      setCatalogVersion((v) => v + 1);
    }
    stopCineScoreRef.current?.();
    setActiveStoryMold(null);
    setCurrentShape('torus');
    setAccentHex('#38bdf8');
    setPulseCounter((c) => c + 1);
  };

  const toggleSelectTool = (toolId: string) => {
    setSelectedToolIds((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId],
    );
  };

  const handleSendInstruction = async (overrideText?: string) => {
    const rawTyped = (overrideText ?? inputText).trim();
    const text =
      rawTyped ||
      (attachedImageName ? `Analiza ópticamente esta muestra (${attachedImageName}) en la pantalla` : '');
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
    setSideTab('chat');
    setIsThinking(true);

    const lr = applyLineaRectaFilter(text);
    const explicitPlanetHint = /\b(luna|lunar|marte|martes|orbita|órbita|tierra)\b/i.test(text);
    const nextPlanet = explicitPlanetHint ? lr.planetaryFrame.id : planetId;
    if (explicitPlanetHint && nextPlanet !== planetId) {
      onChangePlanet(nextPlanet);
    }

    let imageNote = '';
    if (currentImageDataUrl && currentImageName) {
      const optical = await analyzeOpticalSampleImage(currentImageDataUrl, currentImageName);
      imageNote = `\n\n${optical.summary}`;
    }

    const actionIntent = isActionOrCreationIntent(text) || Boolean(currentImageDataUrl);
    const chatKind = classifyConversationIntent(text);
    const report = engine.analyzeIntent(text, {}, 'AUTO', {}, true);
    engine.runAutodidactSynthesis(text, report.recombination);
    if (report.recombination?.success) {
      setCatalogVersion((v) => v + 1);
    }

    const { shape: inferredShape, accentHex: nextHex } = actionIntent
      ? inferShapeAndAccent(text, report)
      : { shape: currentShape, accentHex };

    if (actionIntent) {
      setCurrentShape(inferredShape);
      setAccentHex(nextHex);
    }
    setPulseCounter((c) => c + 1);

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
    }

    const bondStep = evolveCompanionWithTurn(text, MORPH_SHAPE_LABELS[inferredShape] ?? 'General');
    const isStoryRequest =
      /\b(escanea.*cuento|escanear.*cuento|hab[ií]a una vez|cuento|relato|historia|partitura|caperucita)\b/i.test(
        text,
      ) || /\b(m[uú]sica|onda|calma|relajar)\b/i.test(text);

    const { replyText } = buildHumanCineReply(
      text,
      MORPH_SHAPE_LABELS[inferredShape] ?? 'Biopíxeles 3D',
      report.activatedEngines.length,
      actionIntent,
      {
        engine,
        report,
        history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
      },
    );

    const activeCues = isStoryRequest ? parseStoryIntoMusicalScore(text) : [];
    stopCineScoreRef.current?.();
    if (isStoryRequest && activeCues.length > 0) {
      const first = activeCues[0];
      setActiveStoryMold({
        moldKind: first.moldKind,
        primaryHex: first.primaryHex,
        secondaryHex: first.secondaryHex,
        caption: first.hlxCompactCode,
      });
      setAccentHex(first.primaryHex);
      stopCineScoreRef.current = playStoryScoreLive(activeCues, (cue) => {
        setActiveStoryMold({
          moldKind: cue.moldKind,
          primaryHex: cue.primaryHex,
          secondaryHex: cue.secondaryHex,
          caption: cue.hlxCompactCode,
        });
        setAccentHex(cue.primaryHex);
        setPulseCounter((n) => n + 1);
      });
    } else if (actionIntent) {
      setActiveStoryMold(null);
    }

    let nextTier: BiopixelResolutionTierId | null = null;
    if (/\b(4k|uhd|8\.29|8294400)\b/i.test(text)) nextTier = 'UHD_4K';
    else if (/\b(2k|qhd|3\.6|3686400|3600000)\b/i.test(text)) nextTier = 'QHD_2K';
    else if (/\b(full\s*hd|fhd|1080p|2073600)\b/i.test(text)) nextTier = 'FHD';
    else if (/\b(720p|921600|\bhd\b)\b/i.test(text)) nextTier = 'HD';
    if (nextTier) {
      setResolutionTier(nextTier);
    }

    const isPauliWeberQuery =
      !isStoryRequest &&
      /\b(pauli|soa|weber|fechner|2k|4k|uhd|qhd|biop[ií]xel|sub-?biop[ií]xel|consumo de memoria|3[.,]6|8[.,]29|921|2073|8294)\b/i.test(
        text,
      );

    let builtReply = replyText;
    if (isPauliWeberQuery) {
      const activeTierSpec = BIOPIXEL_TIERS[nextTier ?? resolutionTier];
      const liveCanvasLine = displayTelemetry
        ? `\n\nEstado activo en tu GPU: modo ${activeTierSpec.label} (${activeTierSpec.subBiopixels.toLocaleString('es-ES')} sub-biopíxeles RGB) sobre lienzo físico medido de ${displayTelemetry.physicalCanvasWidth}×${displayTelemetry.physicalCanvasHeight} px · Filtro Weber-Fechner actual: ${displayTelemetry.weberDecision} (renderizados ${displayTelemetry.renderedFrames} · omitidos en reposo ${displayTelemetry.skippedFrames}).`
        : `\n\nModo activo en pantalla: ${activeTierSpec.label} (${activeTierSpec.ramMiB} MiB contiguos en Pauli-SoA · ${activeTierSpec.subBiopixels.toLocaleString('es-ES')} sub-biopíxeles RGB).`;
      builtReply = `${buildPauliSoASwitchSimulationReport()}${liveCanvasLine}`;
    } else if (isStoryRequest && activeCues.length > 0) {
      const sceneLines = activeCues
        .map(
          (c) =>
            `Escena ${c.index}: ${c.hlxCompactCode}\n   Molde matemático: ${c.mathEquation}`,
        )
        .join('\n');
      builtReply = `Escaneé la historia y la transcribí en ${activeCues.length} molde${activeCues.length === 1 ? '' : 's'} matemáticos que empujan los biopíxeles 3D escena por escena:\n\n${sceneLines}`;
    }

    const finalReply =
      bondStep.bondReplyOverride ??
      (bondStep.distilledPrompt
        ? `${builtReply}${imageNote}\n\n${bondStep.distilledPrompt}`
        : `${builtReply}${imageNote}`);

    try {
      await fetch('/api/ollama/distill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });
      if (!actionIntent && chatKind === 'greeting') {
        setPulseCounter((c) => c + 1);
      }
    } catch {
      // Mantiene ejecución local determinista
    }

    setIsThinking(false);
    setMessages((prev) => [
      ...prev,
      {
        id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        role: 'assistant',
        text: finalReply,
      },
    ]);

    if (voiceEnabled) {
      triggerVoiceReply(toSpokenSummary(finalReply), voiceGender);
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
        if (transcript) void handleSendInstruction(transcript);
      };
      recognition.onerror = () => setMicActive(false);
      recognition.onend = () => setMicActive(false);

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
        // Ignore cancel errors
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

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#05080f] text-slate-100 lg:flex-row">
      {/* ÚNICA PANTALLA LÍQUIDA DE BIOPIXELES 4K UHD: cero menús encima */}
      <section className="min-h-[320px] flex-1 overflow-hidden bg-[#040812]">
        <HelixBiopixel3DStage
          shape={currentShape}
          storyMold={activeStoryMold?.moldKind ?? null}
          storyPrimaryHex={activeStoryMold?.primaryHex}
          storySecondaryHex={activeStoryMold?.secondaryHex}
          resolutionTier={resolutionTier}
          accentHex={accentHex}
          energy={isSpeaking ? 0.88 : 0.48}
          tension={micActive ? 0.72 : 0.35}
          planetId={planetId}
          pulseCounter={pulseCounter}
          onShipScoreUpdate={setShipScore}
          onTelemetryUpdate={setDisplayTelemetry}
        />
      </section>

      {/* PANEL LATERAL ÚNICO: Asistente + Explorar (Educación/Investigación/Entretenimiento) + ADN/Lab */}
      <aside className="flex h-[48vh] w-full shrink-0 flex-col border-t border-slate-800 bg-[#080d18] lg:h-full lg:w-[430px] lg:border-l lg:border-t-0">
        {/* Cabecera del panel lateral */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3.5 py-2.5">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-white">
              Biopíxeles ·{' '}
              {activeStoryMold
                ? `Molde: ${activeStoryMold.moldKind.replace('_', ' ')}`
                : (MORPH_SHAPE_LABELS[currentShape] ?? currentShape)}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[11px] tabular-nums text-slate-400">
              <span>{planetSpec.label}</span>
              <span aria-hidden="true">·</span>
              <span className="text-sky-300">{BIOPIXEL_TIERS[resolutionTier].shortLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-300">{engineCount} motores</span>
              {currentShape === 'orbital_ship' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-300">Balizas: {shipScore}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center border border-slate-800 bg-[#05080f] p-0.5">
            <button
              type="button"
              onClick={() => setSideTab('chat')}
              className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium ${
                sideTab === 'chat' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="h-3 w-3" />
              <span>Asistente</span>
            </button>
            <button
              type="button"
              onClick={() => setSideTab('explore')}
              className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium ${
                sideTab === 'explore' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="h-3 w-3" />
              <span>Explorar</span>
            </button>
            <button
              type="button"
              onClick={() => setSideTab('dna')}
              className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium ${
                sideTab === 'dna' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Dna className="h-3 w-3" />
              <span>ADN / Lab</span>
            </button>
          </div>
        </div>

        {sideTab === 'chat' && (
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <p
                    className={`max-w-[94%] whitespace-pre-line border px-3 py-2 text-xs leading-relaxed ${
                      isUser
                        ? 'border-sky-500/40 bg-sky-500/15 text-sky-50'
                        : 'border-slate-800 bg-[#0b111e] text-slate-200'
                    }`}
                  >
                    {msg.text}
                  </p>
                </div>
              );
            })}
            {isThinking && (
              <div className="px-1 text-xs text-slate-400">Transformando biopíxeles 4K…</div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {sideTab === 'explore' && (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-3 text-xs">
            {/* Telemetría Pauli-SoA 4K en vivo */}
            <div className="border border-slate-800 bg-[#0b111e] p-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Matriz Pauli-SoA (28 B/biopíxel)</span>
                <span className="font-mono text-[11px] tabular-nums text-sky-300">
                  {BIOPIXEL_TIERS[resolutionTier].biopixels.toLocaleString('es-ES')} px
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between font-mono text-[11px] tabular-nums text-slate-400">
                <span>RAM Zero-GC: {BIOPIXEL_TIERS[resolutionTier].ramMiB} MiB</span>
                <span>
                  Weber: {displayTelemetry?.weberDecision ?? 'RENDER_FRAME'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Usa la rueda del ratón sobre la pantalla para hacer zoom óptico 1×..12× sobre los 3 sub-biopíxeles cuánticos R/G/B.
              </p>
            </div>

            {/* 1. EDUCACIÓN */}
            <div className="border border-slate-800 bg-[#0b111e] p-2.5">
              <div className="mb-2 flex items-center gap-1.5 font-semibold text-sky-300">
                <Atom className="h-3.5 w-3.5" />
                <span>Educación Interactiva (Tierra · Luna · Marte)</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  {
                    title: 'Química: Enlace Morse y Potencial Nernst',
                    desc: 'V(r)=D_e(1-e^(-aΔr))², Gibbs ΔG y orbitales |ψ|² en 3D.',
                    prompt: 'Simula una molécula química con enlace Morse, energía de Gibbs y Nernst',
                  },
                  {
                    title: 'Topología: Toroide T² + Voronoi Hexagonal A₂',
                    desc: 'Raymarching SDF 3D + red hexagonal η≈90.69% + Euler χ.',
                    prompt: 'Muestra el toroide topológico 3D con teselación hexagonal Voronoi A2',
                  },
                  {
                    title: 'Física Ondulatoria: Bessel J₀ + Esfera de Bloch',
                    desc: 'Ondas cimáticas de Helmholtz y estado cuántico SU(2).',
                    prompt: 'Proyecta ondas de Bessel con esfera cuántica de Bloch SU(2)',
                  },
                ].map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => void handleSendInstruction(item.prompt)}
                    className="border border-slate-800 bg-[#05080f] p-2 text-left hover:border-sky-500/40"
                  >
                    <div className="font-medium text-white">{item.title}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. INVESTIGACIÓN */}
            <div className="border border-slate-800 bg-[#0b111e] p-2.5">
              <div className="mb-2 flex items-center gap-1.5 font-semibold text-emerald-300">
                <Layers className="h-3.5 w-3.5" />
                <span>Investigación ({engineCount} Motores + {registeredTools.length} Herramientas)</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  {
                    title: 'Óptica Cauchy + Octaedro Raymarched 3D',
                    desc: 'Refracción espectral n(λ) y confinamiento cuántico Brus CdSe.',
                    prompt: 'Simula un cristal cuántico octaédrico con óptica de Cauchy',
                  },
                  {
                    title: 'Órbita Kepler / Verlet + Telecom 5G / Radar FMCW',
                    desc: 'Velocidad orbital, atenuación ITU-R P.676 y desplazamiento Doppler.',
                    prompt: 'Simula una órbita espacial a 420 km con enlace satelital y radar Doppler',
                  },
                ].map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => void handleSendInstruction(item.prompt)}
                    className="border border-slate-800 bg-[#05080f] p-2 text-left hover:border-emerald-500/40"
                  >
                    <div className="font-medium text-white">{item.title}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{item.desc}</div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSideTab('dna')}
                  className="border border-sky-500/30 bg-sky-500/10 p-2 text-left hover:bg-sky-500/20"
                >
                  <div className="font-medium text-sky-200">Abrir Recombinador ADN y Catálogo Completo</div>
                  <div className="mt-0.5 text-[11px] text-slate-300">
                    Descompón código .hlx en átomos y combina herramientas entre disciplinas.
                  </div>
                </button>
              </div>
            </div>

            {/* 3. ENTRETENIMIENTO */}
            <div className="border border-slate-800 bg-[#0b111e] p-2.5">
              <div className="mb-2 flex items-center gap-1.5 font-semibold text-amber-300">
                <Gamepad2 className="h-3.5 w-3.5" />
                <span>Entretenimiento Vivo en Biopíxeles</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    stopCineScoreRef.current?.();
                    setActiveStoryMold(null);
                    setCurrentShape('orbital_ship');
                    setAccentHex('#38bdf8');
                    setPulseCounter((c) => c + 1);
                  }}
                  className="border border-slate-800 bg-[#05080f] p-2 text-left hover:border-amber-500/40"
                >
                  <div className="flex items-center justify-between font-medium text-white">
                    <span>Juego Orbital WASD · Captura de Balizas</span>
                    <span className="font-mono text-[11px] tabular-nums text-amber-300">
                      {shipScore} pts
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    Pilota la nave con W, A, S, D o flechas para atravesar los aros luminosos.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void handleSendInstruction(
                      'Escanea este cuento: Caperucita caminaba por el bosque verde con su capa roja. De pronto apareció el lobo bajo la luna en la noche. Al final llegó a salvo al castillo.',
                    )
                  }
                  className="border border-slate-800 bg-[#05080f] p-2 text-left hover:border-amber-500/40"
                >
                  <div className="font-medium text-white">Cine-Partitura: Escáner de Cuentos 3D</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    Transcribe relatos en moldes matemáticos 3D con síntesis acústica WebAudio.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => void handleSendInstruction('Crea montañas en la Tierra con aves volando')}
                  className="border border-slate-800 bg-[#05080f] p-2 text-left hover:border-amber-500/40"
                >
                  <div className="font-medium text-white">Paisaje Fractal fBm + Parvadas</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    Relieve procedural multi-octava moldeable directamente con el cursor.
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {sideTab === 'dna' && (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-3 text-xs">
            {/* Experimentos curados de recombinación A x B */}
            <div className="border border-slate-800 bg-[#0b111e] p-2.5">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <Sparkles className="h-3.5 w-3.5 text-sky-300" />
                  <span>Recetas Cruzadas (A × B)</span>
                </span>
                <span className="font-mono text-[10px] tabular-nums text-slate-400">
                  {registeredTools.length} células vivas
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {crossExperiments.map((exp) => (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => handleRunRecombination([...exp.toolIds])}
                    className="flex items-center justify-between gap-2 border border-slate-800 bg-[#05080f] px-2 py-1.5 text-left hover:border-sky-500/40"
                  >
                    <span className="truncate text-[11px] font-medium text-slate-200">{exp.title}</span>
                    <Play className="h-3 w-3 shrink-0 text-sky-300" />
                  </button>
                ))}
              </div>
            </div>

            {/* Selector libre de herramientas del catálogo completo */}
            <div className="border border-slate-800 bg-[#0b111e] p-2.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-semibold text-white">
                  Catálogo de Herramientas ({filteredTools.length})
                </span>
                <button
                  type="button"
                  disabled={selectedToolIds.length < 2}
                  onClick={() => handleRunRecombination()}
                  className="inline-flex items-center gap-1 bg-sky-500 px-2.5 py-1 text-[11px] font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <GitMerge className="h-3 w-3" />
                  <span>Recombinar ({selectedToolIds.length})</span>
                </button>
              </div>

              <div className="mb-2 flex gap-1.5">
                <div className="flex min-w-0 flex-1 items-center gap-1 border border-slate-700 bg-[#05080f] px-2">
                  <Search className="h-3 w-3 shrink-0 text-slate-400" />
                  <input
                    type="text"
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    placeholder="Buscar ecuación o herramienta..."
                    className="h-7 w-full bg-transparent text-[11px] text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
                <select
                  aria-label="Filtrar dominio"
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value as HelixToolDomain | 'TODOS')}
                  className="h-7 max-w-[140px] border border-slate-700 bg-[#05080f] px-1.5 text-[11px] text-slate-200"
                >
                  {domainOptions.map((dom) => (
                    <option key={dom} value={dom}>
                      {dom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="max-h-40 space-y-1 overflow-y-auto pr-0.5">
                {filteredTools.slice(0, 60).map((tool: HelixRegisteredTool) => {
                  const selected = selectedToolIds.includes(tool.id);
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => toggleSelectTool(tool.id)}
                      className={`flex w-full items-start justify-between gap-2 border px-2 py-1.5 text-left ${
                        selected
                          ? 'border-sky-500/60 bg-sky-500/15 text-white'
                          : 'border-slate-800 bg-[#05080f] text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[11px] font-medium">
                          {tool.origin === 'autopoietic_child' ? '[ADN Hijo] ' : ''}
                          {tool.title}
                        </div>
                        <div className="truncate text-[10px] text-slate-400">
                          {tool.domain} · p={tool.prime}
                        </div>
                      </div>
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${
                          selected ? 'border-sky-400 bg-sky-500 text-slate-950' : 'border-slate-700'
                        }`}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resultado de recombinación A x B + Puentes + PCC + 17B */}
            {recombResult && (
              <div className="border border-sky-500/30 bg-[#0b111e] p-2.5 text-[11px]">
                <div className="flex items-center justify-between font-semibold text-white">
                  <span>{recombResult.success ? 'Síntesis Verificada' : 'Recombinación Rechazada'}</span>
                  <span className="font-mono text-emerald-300">
                    {recombResult.bridges.length} puentes · SMT {recombResult.smtReport.status}
                  </span>
                </div>
                <p className="mt-1 text-slate-300">{recombResult.engineeringSummary}</p>
                {recombResult.bridges.length > 0 && (
                  <div className="mt-1.5 space-y-0.5 border-t border-slate-800 pt-1.5 font-mono text-[10px] text-sky-200">
                    {recombResult.bridges.map((b, i) => (
                      <div key={`${b.fromPort}_${b.toPort}_${i}`} className="truncate">
                        {b.fromPort} → {b.toPort} ({b.transformRule}: {String(b.transferredValue)})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Descomponedor de ADN .hlx -> Células atómicas */}
            <div className="border border-slate-800 bg-[#0b111e] p-2.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <Scissors className="h-3.5 w-3.5 text-amber-300" />
                  <span>Descomponer Código HELIX (.hlx)</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleRunDecompose(false)}
                    className="border border-slate-700 bg-[#05080f] px-2 py-0.5 text-[10px] text-slate-200 hover:border-sky-500/40"
                  >
                    Descomponer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunDecompose(true)}
                    className="bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-200 hover:bg-amber-500/30"
                  >
                    + Registrar Átomos
                  </button>
                </div>
              </div>
              <textarea
                value={decomposeInput}
                onChange={(e) => setDecomposeInput(e.target.value)}
                rows={4}
                className="w-full border border-slate-700 bg-[#05080f] p-2 font-mono text-[10px] text-sky-100 focus:border-sky-500/50 focus:outline-none"
              />
              {decomposeResult && (
                <div className="mt-2 space-y-1 text-[10px]">
                  <div className="font-mono text-slate-400">
                    Instrucciones: {decomposeResult.instructionCount} · Átomos: {decomposeResult.atoms.length} ·{' '}
                    {decomposeResult.verifiedSource ? 'VERIFICADO' : 'REVISAR'}
                  </div>
                  {decomposeResult.atoms.map((atom) => (
                    <div
                      key={atom.atomId}
                      className="flex items-center justify-between gap-2 border border-slate-800 bg-[#05080f] px-2 py-1"
                    >
                      <span className="truncate font-mono text-slate-200">
                        {atom.opcode} [{atom.suggestedEngineId}]
                      </span>
                      <span className="shrink-0 font-mono text-sky-300">
                        L{atom.lineRange[0]}..{atom.lineRange[1]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sugerencias directas */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-slate-800/80 px-3 py-1.5">
          {[
            { label: 'Molécula Morse', prompt: 'Simula una molécula química con enlace Morse y potencial de Nernst' },
            {
              label: 'Escanear cuento',
              prompt:
                'Escanea este cuento: Caperucita caminaba por el bosque verde con su capa roja. De pronto apareció el lobo bajo la luna en la noche. Al final llegó a salvo al castillo.',
            },
            { label: 'Nave Orbital', prompt: 'Crea una nave viajando a la Luna' },
            { label: 'Toroide A₂', prompt: 'Muestra el toroide topológico 3D con red hexagonal Voronoi A2' },
            { label: 'Cristal SDF', prompt: 'Transforma los biopíxeles en un cristal cuántico octaédrico' },
          ].map((quick) => (
            <button
              key={quick.label}
              type="button"
              onClick={() => void handleSendInstruction(quick.prompt)}
              className="shrink-0 whitespace-nowrap border border-slate-800 bg-[#0b111e] px-2.5 py-1 text-[11px] text-slate-300 hover:border-sky-500/40 hover:text-white"
            >
              {quick.label}
            </button>
          ))}
        </div>

        {/* Barra de diálogo, micrófono y cámara */}
        <div className="border-t border-slate-800 bg-[#070b15] p-3">
          {attachedImageName && (
            <div className="mb-2 flex items-center justify-between border border-sky-500/30 bg-[#0b111e] px-2.5 py-1 text-xs text-sky-200">
              <span className="truncate">Muestra lista: {attachedImageName}</span>
              <button
                type="button"
                onClick={() => {
                  setAttachedImageDataUrl(null);
                  setAttachedImageName(null);
                }}
                className="ml-2 text-slate-400 hover:text-white"
                aria-label="Quitar muestra"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {micNotice && <p className="mb-1.5 text-[11px] text-amber-300">{micNotice}</p>}

          {showMediaPanel && (
            <div className="mb-2 space-y-2 border border-slate-800 bg-[#0b111e] p-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.txt,.md,.hlx"
                  onChange={handleAttachImage}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-7 items-center gap-1 border border-slate-700 bg-[#05080f] px-2 text-[11px] text-slate-200 hover:border-slate-500"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  <span>Foto / Cuento / .hlx</span>
                </button>
                <button
                  type="button"
                  onClick={handleToggleVoiceOutput}
                  className={`inline-flex h-7 items-center gap-1 border px-2 text-[11px] ${
                    voiceEnabled
                      ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                      : 'border-slate-700 bg-[#05080f] text-slate-400'
                  }`}
                >
                  {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  <span>{voiceEnabled ? 'Voz ON' : 'Voz OFF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectVoiceGender('female')}
                  className={`h-7 px-2 text-[11px] ${
                    voiceGender === 'female' ? 'bg-slate-700 text-white' : 'text-slate-400'
                  }`}
                >
                  Fem
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectVoiceGender('male')}
                  className={`h-7 px-2 text-[11px] ${
                    voiceGender === 'male' ? 'bg-slate-700 text-white' : 'text-slate-400'
                  }`}
                >
                  Masc
                </button>
                <select
                  aria-label="Selector de Voz"
                  value={selectedVoiceURI}
                  onChange={(e) => handleSelectVoiceURI(e.target.value)}
                  className="h-7 max-w-[140px] truncate border border-slate-700 bg-[#05080f] px-1.5 text-[11px] text-slate-200"
                >
                  <option value="">Auto ({voiceGender === 'female' ? 'Fem' : 'Masc'})</option>
                  {availableVoices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="border-t border-slate-800/80 pt-1.5">
                <div className="mb-1 flex items-center justify-between font-mono text-[10px] tabular-nums text-slate-400">
                  <span>Densidad Pauli-SoA (28 B/biopíxel)</span>
                  <span className="text-sky-300">
                    {BIOPIXEL_TIERS[resolutionTier].ramMiB} MiB ·{' '}
                    {displayTelemetry ? displayTelemetry.weberDecision : 'RENDER_FRAME'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(['HD', 'FHD', 'QHD_2K', 'UHD_4K'] as BiopixelResolutionTierId[]).map((id) => {
                    const spec = BIOPIXEL_TIERS[id];
                    const active = resolutionTier === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setResolutionTier(id)}
                        className={`border px-1.5 py-1 font-mono text-[10px] tabular-nums ${
                          active
                            ? 'border-sky-500/60 bg-sky-500/20 text-sky-200'
                            : 'border-slate-700 bg-[#05080f] text-slate-400 hover:text-white'
                        }`}
                      >
                        {spec.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 border border-slate-700 bg-[#0b111e] p-1.5">
            <button
              type="button"
              onClick={() => setShowMediaPanel((v) => !v)}
              title="Imagen, .hlx, voz y resolución 4K"
              aria-label="Imagen y voz"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleToggleMic}
              title={micActive ? 'Detener micrófono' : 'Hablar'}
              aria-label={micActive ? 'Detener micrófono' : 'Hablar'}
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center ${
                micActive ? 'bg-rose-500/20 text-rose-300' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {micActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleAttachImage} className="hidden" />
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              title="Cámara óptica de laboratorio"
              aria-label="Cámara"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pídele algo a Helix..."
              className="h-8 min-w-0 flex-1 bg-transparent px-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleSendInstruction()}
              disabled={!inputText.trim() && !attachedImageDataUrl}
              aria-label="Enviar"
              className="inline-flex h-8 shrink-0 items-center gap-1 bg-sky-500 px-3 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
