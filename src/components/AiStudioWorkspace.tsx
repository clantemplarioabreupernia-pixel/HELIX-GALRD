import { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Atom,
  Check,
  Cpu,
  Dna,
  Download,
  Eye,
  EyeOff,
  FlaskConical,
  GitMerge,
  Layers,
  Music,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Scissors,
  Search,
  Square,
  Video,
} from 'lucide-react';
import {
  CombinatorialBatchReport,
  createHelixCoreEngine,
  DecompositionResult,
  DOMAIN_ENGINE_METADATA,
  EngineeringReport,
  HelixRegisteredTool,
  HelixToolDomain,
  RecombinationResult,
} from '../core';
import { applyLineaRectaFilter, PLANETARY_FRAMES, PlanetaryFrameId } from '../core/helixAutodidactLoop';
import {
  evolveCompanionWithTurn,
  getInitialCompanionGreeting,
  loadCompanionBond,
  updateGuardianName,
} from '../core/helixCompanionBond';
import {
  buildHumanCineReply,
  classifyConversationIntent,
  isActionOrCreationIntent,
  toSpokenSummary,
} from '../core/helixConversationalBrain';
import {
  BIOPIXEL_TIERS,
  BiopixelColorDepth,
  BiopixelDefectMode,
  BiopixelResolutionTierId,
  BiopixelSubpixelLayout,
  buildPauliSoASwitchSimulationReport,
  COLOR_DEPTH_LABELS,
  computeP33DisplayMetrics,
  convertHexToAdditiveAndCmyk,
  DEFECT_MODE_LABELS,
  LiveDisplayTelemetry,
  SUBPIXEL_LAYOUT_LABELS,
} from '../core/helixPauliSoaDisplay';
import {
  buildProceduralCineAudioPlan,
  CineAudioLiveFrame,
  playProceduralGaldrCinema,
  ProceduralCineAudioPlan,
} from '../core/helixProceduralCineAudio';
import {
  computeCoupledNanotechBiopixelState,
  evaluateUnifiedBiopixelEquation,
} from '../core/helixQuantumDisplayPhysics';
import {
  parseStoryIntoMusicalScore,
  playStoryScoreLive,
  StoryLiveMotionFrame,
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
import { CartridgeLabHub } from './CartridgeLabHub';
import { CoreEngineStudioView } from './CoreEngineStudioView';
import { DockChatMessage, EngineeringRightDock, RightDockTab } from './EngineeringRightDock';
import { HelixBiopixel3DStage } from './HelixBiopixel3DStage';
import type { LiquidMorphShape } from './LiquidBiopixelCanvas';

type ChatMessage = DockChatMessage;

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

interface GeminiCompanionPayload {
  reply?: string;
  mood?: string;
  sceneAction?: 'none' | 'morph' | 'story_cinema' | 'game_mode' | 'omega_fusion' | 'galdr_music';
  shape?: LiquidMorphShape;
  storyMold?: StorySceneMoldKind | 'none';
  storyText?: string;
  gameGenre?: string;
  accentHex?: string;
  planetId?: 'NONE' | PlanetaryFrameId;
  detectedGuardianName?: string;
}

type WorkspaceStageMode = 'biopixel' | 'cartridges' | 'optics' | 'dna';

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
    combined.includes('combate') ||
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
  if (combined.includes('toroide') || combined.includes('anillo') || combined.includes('voronoi') || combined.includes('geometr') || combined.includes('castillo')) {
    return { shape: 'torus', accentHex: '#22d3ee' };
  }
  if (
    combined.includes('música') ||
    combined.includes('musica') ||
    combined.includes('onda') ||
    combined.includes('sonido') ||
    combined.includes('cuento') ||
    combined.includes('bessel') ||
    combined.includes('océano') ||
    combined.includes('oceano') ||
    combined.includes('mar') ||
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
  const stopGaldrRef = useRef<(() => void) | null>(null);
  const msgSeqRef = useRef<number>(1);

  const [stageMode, setStageMode] = useState<WorkspaceStageMode>('biopixel');
  const [rightDockOpen, setRightDockOpen] = useState<boolean>(true);
  const [rightDockTab, setRightDockTab] = useState<RightDockTab>('chat');
  const [showFullCoreStudio, setShowFullCoreStudio] = useState<boolean>(false);
  const [zenMode, setZenMode] = useState<boolean>(false);

  const [geminiConfigured, setGeminiConfigured] = useState<boolean>(false);
  const [aiErrorNotice, setAiErrorNotice] = useState<string | null>(null);

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
  const [subpixelLayout, setSubpixelLayout] = useState<BiopixelSubpixelLayout>('RGB_STRIPE');
  const [colorDepth, setColorDepth] = useState<BiopixelColorDepth>('TRUE_COLOR_24BIT');
  const [defectMode, setDefectMode] = useState<BiopixelDefectMode>('HEALTHY');
  const [repairPulse, setRepairPulse] = useState<number>(0);
  const [displayTelemetry, setDisplayTelemetry] = useState<LiveDisplayTelemetry | null>(null);
  const [shipScore, setShipScore] = useState<number>(0);
  const [cFrontPerturb, setCFrontPerturb] = useState<number>(0.42);
  const [activeCinePlan, setActiveCinePlan] = useState<ProceduralCineAudioPlan | null>(null);
  const [activeCineFrame, setActiveCineFrame] = useState<CineAudioLiveFrame | null>(null);
  const [isCinePlaying, setIsCinePlaying] = useState<boolean>(false);
  const [storyMotion, setStoryMotion] = useState<StoryLiveMotionFrame | null>(null);

  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveAudioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const [isRecordingVideo, setIsRecordingVideo] = useState<boolean>(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [videoStatusNotice, setVideoStatusNotice] = useState<string | null>(null);

  // Estado del Explorador de Herramientas, Recombinador ADN A×B y Descomponedor
  const [catalogVersion, setCatalogVersion] = useState<number>(0);
  const [toolSearch, setToolSearch] = useState<string>('');
  const [domainFilter, setDomainFilter] = useState<HelixToolDomain | 'TODOS'>('TODOS');
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([
    '201_chemistry_nernst_gibbs',
    '200_nanotech_biopixel_z4',
  ]);
  const [recombResult, setRecombResult] = useState<RecombinationResult | null>(null);
  const [batchReport, setBatchReport] = useState<CombinatorialBatchReport | null>(null);
  const [showAllTools, setShowAllTools] = useState<boolean>(false);
  const [decomposeInput, setDecomposeInput] = useState<string>(DEFAULT_DECOMPOSE_SAMPLE);
  const [decomposeResult, setDecomposeResult] = useState<DecompositionResult | null>(null);

  const [bondSnapshot, setBondSnapshot] = useState(() => loadCompanionBond());
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
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
    void fetch('/api/companion/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { geminiConfigured?: boolean } | null) => {
        if (payload && typeof payload.geminiConfigured === 'boolean') {
          setGeminiConfigured(payload.geminiConfigured);
        }
      })
      .catch(() => {
        setGeminiConfigured(false);
      });
  }, []);

  useEffect(() => {
    const onGlobalKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      if (e.key.toLowerCase() === 'h') {
        setZenMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, []);

  useEffect(() => {
    if (dnaLabTrigger > 0) {
      setStageMode('dna');
      setZenMode(false);
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

  const colorReadout = useMemo(() => convertHexToAdditiveAndCmyk(accentHex), [accentHex]);
  const activeP33Metrics = useMemo(
    () =>
      displayTelemetry?.p33Metrics ??
      computeP33DisplayMetrics(
        BIOPIXEL_TIERS[resolutionTier].width,
        BIOPIXEL_TIERS[resolutionTier].height,
        pulseCounter,
      ),
    [displayTelemetry, resolutionTier, pulseCounter],
  );

  const unifiedEq = useMemo(
    () =>
      evaluateUnifiedBiopixelEquation({
        cFront: cFrontPerturb,
        tension: micActive ? 0.72 : 0.35,
        primeIndex: pulseCounter % 33,
      }),
    [cFrontPerturb, micActive, pulseCounter],
  );

  const stopAllPlayback = () => {
    stopCineScoreRef.current?.();
    stopCineScoreRef.current = null;
    stopGaldrRef.current?.();
    stopGaldrRef.current = null;
    setIsCinePlaying(false);
    setActiveCineFrame(null);
    setStoryMotion(null);
  };

  const launchStorySequence = (narrativeText: string) => {
    const cues = parseStoryIntoMusicalScore(narrativeText);
    if (cues.length === 0) return cues;
    stopAllPlayback();
    const first = cues[0];
    setActiveStoryMold({
      moldKind: first.moldKind,
      primaryHex: first.primaryHex,
      secondaryHex: first.secondaryHex,
      caption: first.hlxCompactCode,
    });
    setAccentHex(first.primaryHex);
    stopCineScoreRef.current = playStoryScoreLive(
      cues,
      (cue) => {
        setActiveStoryMold({
          moldKind: cue.moldKind,
          primaryHex: cue.primaryHex,
          secondaryHex: cue.secondaryHex,
          caption: cue.hlxCompactCode,
        });
        setAccentHex(cue.primaryHex);
        setPulseCounter((n) => n + 1);
      },
      {
        onFrameUpdate: (frame) => setStoryMotion(frame),
        onAudioStreamReady: (stream) => {
          liveAudioStreamRef.current = stream;
        },
        onComplete: () => setStoryMotion(null),
      },
    );
    return cues;
  };

  const handleToggleVideoRecord = () => {
    setVideoStatusNotice(null);
    if (isRecordingVideo && mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {
        setIsRecordingVideo(false);
      }
      return;
    }

    const canvas = stageCanvasRef.current;
    if (!canvas || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      setVideoStatusNotice('Tu navegador no soporta captura WebGL2 directa a .webm.');
      return;
    }

    try {
      const videoStream = canvas.captureStream(60);
      const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
      const audioStream = liveAudioStreamRef.current;
      if (audioStream) {
        for (const audioTrack of audioStream.getAudioTracks()) {
          if (audioTrack.readyState === 'live') {
            tracks.push(audioTrack);
          }
        }
      }
      const combinedStream = new MediaStream(tracks);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : '';
      const recorder = mimeType
        ? new MediaRecorder(combinedStream, { mimeType })
        : new MediaRecorder(combinedStream);

      recordedChunksRef.current = [];
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
        setRecordedVideoUrl(null);
      }

      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType || 'video/webm' });
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
        }
        setIsRecordingVideo(false);
      };
      recorder.onerror = () => {
        setIsRecordingVideo(false);
        setVideoStatusNotice('Error al codificar el flujo .webm.');
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecordingVideo(true);
    } catch {
      setIsRecordingVideo(false);
      setVideoStatusNotice('No se pudo iniciar la grabación de video.');
    }
  };

  const handlePlayGaldrCinema = (planOverride?: ProceduralCineAudioPlan) => {
    if (isCinePlaying && !planOverride) {
      stopAllPlayback();
      return;
    }
    const baseTools = registeredTools.filter((t) => selectedToolIds.includes(t.id));
    const plan =
      planOverride ??
      activeCinePlan ??
      buildProceduralCineAudioPlan(
        baseTools.length >= 2 ? baseTools : registeredTools.slice(0, 3),
      );
    stopAllPlayback();
    setActiveCinePlan(plan);
    setActiveStoryMold(null);
    setCurrentShape(plan.shape);
    setDecomposeInput(plan.masterHlxScript);
    setIsCinePlaying(true);
    stopGaldrRef.current = playProceduralGaldrCinema(
      plan,
      (frame) => {
        setActiveCineFrame(frame);
        setAccentHex(frame.primaryHex);
        setCFrontPerturb(frame.cFront);
        setPulseCounter((c) => c + 1);
      },
      () => {
        setIsCinePlaying(false);
        setActiveCineFrame(null);
      },
      (stream) => {
        liveAudioStreamRef.current = stream;
      },
    );
  };

  const handleRepairBiopixels = () => {
    setDefectMode('HEALTHY');
    setRepairPulse((p) => p + 1);
    setPulseCounter((c) => c + 1);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isThinking, rightDockTab]);

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
      stopAllPlayback();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore recorder cleanup errors
        }
      }
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
        ? `Hola, ahora conversamos con la voz ${chosen.name}.`
        : nextGender === 'female'
          ? 'Voz femenina activa.'
          : 'Voz masculina activa.';
      triggerVoiceReply(sampleText, nextGender, nextURI || null);
    }
  };

  useEffect(() => {
    if (!externalProjection || !externalProjection.hlxScript.trim()) return;
    stopAllPlayback();
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
            setStageMode('dna');
            return;
          }
          const cleanStory = reader.result.trim().slice(0, 1400);
          if (cleanStory) {
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
    const cinePlan = buildProceduralCineAudioPlan(result);
    setActiveCinePlan(cinePlan);
    const nextScript = cinePlan.masterHlxScript || result.synthesizedHlx;
    if (nextScript) {
      setDecomposeInput(nextScript);
    }
    setCatalogVersion((v) => v + 1);

    if (result.success && result.pccVerified && nextScript) {
      const recombPrompt = `Recombinación ${result.parentTools.map((t) => t.title).join(' × ')}`;
      const domainLabel = result.disciplines33[0]?.name ?? 'RECOMBINACION_AB';
      void fetch('/api/recombine/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: recombPrompt,
          summary: result.engineeringSummary,
          hlxScript: nextScript,
          domain: domainLabel,
          qpsk17Sha256: result.holographicCard?.frame.frameSha256 ?? '',
          disciplineMaskBits33: result.disciplineMaskBits33,
        }),
      }).catch(() => {
        // Mantiene ejecución local determinista si no hay servidor
      });
    }

    stopAllPlayback();
    setActiveStoryMold(null);
    const summaryText = result.parentTools.map((t) => `${t.title} ${t.domain}`).join(' ');
    const inferred = inferShapeAndAccent(summaryText);
    setCurrentShape(result.success ? cinePlan.shape : inferred.shape);
    setAccentHex(cinePlan.steps[0]?.primaryHex ?? inferred.accentHex);
    setPulseCounter((c) => c + 1);
  };

  const handleRunCombinatorialBatch = (openDnaDrawer = false): CombinatorialBatchReport => {
    const batch = engine.runCombinatorialBatch(12, 6, true);
    setBatchReport(batch);
    const latest = batch.results[batch.results.length - 1] ?? null;
    if (latest) {
      setRecombResult(latest);
      const cinePlan = buildProceduralCineAudioPlan(latest);
      setActiveCinePlan(cinePlan);
      if (latest.synthesizedHlx) {
        setDecomposeInput(latest.synthesizedHlx);
      }
      stopAllPlayback();
      setActiveStoryMold(null);
      setCurrentShape(cinePlan.shape);
      setAccentHex(cinePlan.steps[0]?.primaryHex ?? '#38bdf8');
      setPulseCounter((c) => c + 1);
    }
    setCatalogVersion((v) => v + 1);
    if (openDnaDrawer) {
      setStageMode('dna');
    }
    return batch;
  };

  const handleRunOmegaRecombination = (openDnaDrawer = false): RecombinationResult => {
    const res = engine.runOmegaRecombination({}, true);
    setRecombResult(res);
    const cinePlan = buildProceduralCineAudioPlan(res);
    setActiveCinePlan(cinePlan);
    const nextScript = cinePlan.masterHlxScript || res.synthesizedHlx;
    if (nextScript) {
      setDecomposeInput(nextScript);
    }
    stopAllPlayback();
    setActiveStoryMold(null);
    setCurrentShape(res.success ? cinePlan.shape : 'quantum_bloch');
    setAccentHex(cinePlan.steps[0]?.primaryHex ?? '#38bdf8');
    setPulseCounter((c) => c + 1);
    setCatalogVersion((v) => v + 1);
    if (openDnaDrawer) {
      setStageMode('dna');
    }
    return res;
  };

  const handleRunDecompose = (registerAtoms = false) => {
    const res = engine.decomposeProgram(decomposeInput, 'laboratorio_usuario.hlx', registerAtoms);
    setDecomposeResult(res);
    if (registerAtoms) {
      setCatalogVersion((v) => v + 1);
    }
    stopAllPlayback();
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
    setAiErrorNotice(null);

    const turnStartMs = performance.now();
    const userSeq = msgSeqRef.current++;
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}_${userSeq}`,
      role: 'user',
      text: currentImageName ? `${text} [${currentImageName}]` : text,
    };
    setMessages((prev) => [...prev, userMsg]);
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
    const autodidactOut = engine.runAutodidactSynthesis(text, report.recombination);
    if (report.recombination?.success) {
      setCatalogVersion((v) => v + 1);
    }

    const { shape: inferredShape, accentHex: nextHex } = actionIntent
      ? inferShapeAndAccent(text, report)
      : { shape: currentShape, accentHex };

    const recomb = report.recombination;
    if (!autodidactOut.newlyLearnedCard && recomb?.success && recomb.pccVerified && recomb.synthesizedHlx) {
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
    setBondSnapshot(bondStep.state);

    const isGrandOmegaQuery =
      /\b(recombin(a|ar|e).*todo|toda(s)?\s+(las\s+|sus\s+)?herramientas|todas?\s+con\s+todas?|gran\s+recombinaci[oó]n|omega|23\s*x\s*33|33\s+disciplinas.*combin)\b/i.test(
        text,
      );

    const isBatchCombinatorialQuery =
      !isGrandOmegaQuery &&
      /\b(comprueb|genera|crea|haz|prueba|demuestra).*\b(muchas\s+combinaciones|combinaciones|recombinaciones|matriz\s+combinatoria|segundo\s+orden|2\.?[oº]\s+orden)\b/i.test(
        text,
      );

    const isGaldrUnifiedQuery =
      !isGrandOmegaQuery &&
      !isBatchCombinatorialQuery &&
      /\b(ecuaci[oó]n\s*unificada|s_biopixel|galdr|cine.*procedural|fonema|runas.*nota|delta\s*z|tanh)\b/i.test(
        text,
      );

    const isStoryRequest =
      /\b(escanea.*cuento|escanear.*cuento|hab[ií]a una vez|cuento|relato|historia|partitura|caperucita|campaña|aventura)\b/i.test(
        text,
      ) || /\b(m[uú]sica|onda|calma|relajar)\b/i.test(text);

    const isPauliWeberQuery =
      !isStoryRequest &&
      /\b(pauli|soa|weber|fechner|2k|4k|uhd|qhd|biop[ií]xel|sub-?biop[ií]xel|consumo de memoria|3[.,]6|8[.,]29|921|2073|8294|pit[aá]goras|33\s*primos|p33|pentile|rgbw|stripe|monocrom[aá]tic|grises|1\s*bit|8\s*bits?|24\s*bits?|p[ií]xel\s*(muerto|atascado|caliente|f[ií]sico|l[oó]gico)|reparar.*p[ií]xel|cmyk|ppi)\b/i.test(
        text,
      );

    const isTechnicalInventoryQuery =
      chatKind === 'tools_inventory' ||
      chatKind === 'disciplines_inventory' ||
      chatKind === 'engines_inventory' ||
      chatKind === 'architecture_explain';

    // Intentar conversación humana genuina vía servidor Gemini si hay clave configurada y no es consulta local determinista pura
    let geminiPayload: GeminiCompanionPayload | null = null;
    if (
      geminiConfigured &&
      !isGrandOmegaQuery &&
      !isBatchCombinatorialQuery &&
      !isGaldrUnifiedQuery &&
      !isPauliWeberQuery &&
      !isTechnicalInventoryQuery
    ) {
      try {
        const res = await fetch('/api/companion/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
            companionName: bondStep.state.name,
            guardianName: bondStep.state.guardianName,
            planetId: nextPlanet,
            activeScene: activeStoryMold?.moldKind ?? MORPH_SHAPE_LABELS[currentShape] ?? currentShape,
            engineCount,
            toolCount: registeredTools.length,
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as { ok?: boolean; data?: GeminiCompanionPayload };
          if (json?.ok && json.data?.reply) {
            geminiPayload = json.data;
          }
        } else if (res.status === 503) {
          setGeminiConfigured(false);
        } else {
          setAiErrorNotice('El servicio externo respondió con error; continuamos con la voz local de Helix.');
        }
      } catch {
        setAiErrorNotice('Sin conexión temporal con Gemini; continuamos con conversación local de Helix.');
      }
    }

    if (geminiPayload?.detectedGuardianName) {
      const updated = updateGuardianName(geminiPayload.detectedGuardianName);
      setBondSnapshot(updated);
    }

    // Aplicar transformaciones visuales solicitadas por Gemini o por el analizador local
    let finalReply = '';
    if (geminiPayload?.reply) {
      finalReply = geminiPayload.reply;
      if (geminiPayload.planetId && geminiPayload.planetId !== 'NONE') {
        onChangePlanet(geminiPayload.planetId);
      }
      if (geminiPayload.accentHex && /^#[0-9a-f]{6}$/i.test(geminiPayload.accentHex)) {
        setAccentHex(geminiPayload.accentHex);
      }
      if (geminiPayload.sceneAction === 'story_cinema') {
        const storyScript = geminiPayload.storyText?.trim() || text;
        launchStorySequence(storyScript);
      } else if (geminiPayload.sceneAction === 'galdr_music') {
        const selectedToolsForPlan = registeredTools.filter((t) => selectedToolIds.includes(t.id));
        handlePlayGaldrCinema(
          buildProceduralCineAudioPlan(
            selectedToolsForPlan.length >= 2 ? selectedToolsForPlan : registeredTools.slice(0, 3),
          ),
        );
      } else if (geminiPayload.sceneAction === 'omega_fusion') {
        handleRunOmegaRecombination(false);
      } else if (geminiPayload.sceneAction === 'morph' || geminiPayload.sceneAction === 'game_mode') {
        stopAllPlayback();
        if (geminiPayload.storyMold && geminiPayload.storyMold !== 'none') {
          setActiveStoryMold({
            moldKind: geminiPayload.storyMold,
            primaryHex: geminiPayload.accentHex || nextHex,
            secondaryHex: '#f59e0b',
          });
        } else {
          setActiveStoryMold(null);
        }
        if (geminiPayload.shape) {
          setCurrentShape(geminiPayload.shape);
        } else if (actionIntent) {
          setCurrentShape(inferredShape);
        }
        setPulseCounter((c) => c + 1);
      }
    } else {
      // Flujo local humanizado + determinista
      if (actionIntent) {
        setCurrentShape(inferredShape);
        setAccentHex(nextHex);
      }
      setPulseCounter((c) => c + 1);

      const { replyText } = buildHumanCineReply(
        text,
        MORPH_SHAPE_LABELS[inferredShape] ?? 'Biopíxeles 3D',
        report.activatedEngines.length,
        actionIntent,
        {
          engine,
          report,
          userName: bondStep.state.guardianName || undefined,
          history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        },
      );

      const activeCues =
        isStoryRequest && !isGrandOmegaQuery && !isGaldrUnifiedQuery && !isBatchCombinatorialQuery
          ? parseStoryIntoMusicalScore(text)
          : [];
      stopAllPlayback();
      let activeGaldrPlan: ProceduralCineAudioPlan | null = null;
      let liveBatchFromChat: CombinatorialBatchReport | null = null;
      let liveOmegaFromChat: RecombinationResult | null = null;

      if (isGrandOmegaQuery) {
        liveOmegaFromChat = handleRunOmegaRecombination(false);
      } else if (isBatchCombinatorialQuery) {
        liveBatchFromChat = handleRunCombinatorialBatch(false);
      } else if (isGaldrUnifiedQuery) {
        const selectedToolsForPlan =
          report.recombination?.parentTools && report.recombination.parentTools.length >= 2
            ? report.recombination.parentTools
            : registeredTools.filter((t) => selectedToolIds.includes(t.id));
        activeGaldrPlan = buildProceduralCineAudioPlan(
          selectedToolsForPlan.length >= 2 ? selectedToolsForPlan : registeredTools.slice(0, 3),
        );
        handlePlayGaldrCinema(activeGaldrPlan);
      } else if (isStoryRequest && activeCues.length > 0) {
        launchStorySequence(text);
      } else if (actionIntent) {
        setActiveStoryMold(null);
      }

      let builtReply = replyText;
      if (isPauliWeberQuery) {
        const activeTierSpec = BIOPIXEL_TIERS[resolutionTier];
        const liveColor = convertHexToAdditiveAndCmyk(actionIntent ? nextHex : accentHex);
        const p33Now =
          displayTelemetry?.p33Metrics ??
          computeP33DisplayMetrics(activeTierSpec.width, activeTierSpec.height, pulseCounter);

        const hwLine = displayTelemetry
          ? `Hardware vs Software: ${displayTelemetry.physicalCanvasWidth}×${displayTelemetry.physicalCanvasHeight} px físicos vs ${displayTelemetry.logicalCssWidth}×${displayTelemetry.logicalCssHeight} CSS (DPR ${displayTelemetry.devicePixelRatio.toFixed(2)}×) · ${displayTelemetry.subBiopixelTotalActive.toLocaleString('es-ES')} sub-biopíxeles activos.`
          : `Modo seleccionado: ${activeTierSpec.label} (${activeTierSpec.ramMiB} MiB contiguos Pauli-SoA).`;

        const commercialLines = [
          hwLine,
          `Estructura comercial adaptada: ${SUBPIXEL_LAYOUT_LABELS[subpixelLayout]} · Profundidad: ${COLOR_DEPTH_LABELS[colorDepth]} · Estado: ${DEFECT_MODE_LABELS[defectMode]}.`,
          `Métrica P₃₃ (Cero Pitágoras): par primo (${p33Now.primePair[0]}, ${p33Now.primePair[1]}), densidad modular ${p33Now.p33ModularDensity}, producto Gödel ${p33Now.p33GodelProduct}, anti-muaré ${p33Now.antiMoireScorePct}%.`,
          `Síntesis de Color: Aditivo RGB(${liveColor.r}, ${liveColor.g}, ${liveColor.b}) + Blanco W=${liveColor.wBoost} · Sustractivo CMYK(${liveColor.cPct}%, ${liveColor.mPct}%, ${liveColor.yPct}%, ${liveColor.kPct}%).`,
        ].join('\n');

        builtReply = `${buildPauliSoASwitchSimulationReport()}\n\n${commercialLines}`;
      } else if (liveOmegaFromChat) {
        const uniqueEngines = new Set(liveOmegaFromChat.parentTools.map((t) => t.engineId)).size;
        builtReply = [
          `¡Listo! Fusioné todos los motores (${uniqueEngines}/23) con las ${liveOmegaFromChat.disciplines33.length} disciplinas P₃₃ y ${liveOmegaFromChat.bridges.length} puentes tipados verificados.`,
          `La nueva herramienta hija «${liveOmegaFromChat.childTool?.title ?? 'Síntesis Omega'}» quedó guardada en el catálogo y ya la estás viendo en pantalla.`,
        ].join(' ');
      } else if (liveBatchFromChat) {
        builtReply = `${liveBatchFromChat.summary} Ya puedes abrir ADN / Lab para explorar y volver a recombinar cada nueva herramienta generada.`;
      } else if (activeGaldrPlan) {
        builtReply = `Activé la secuencia musical Galdr y la cámara procedural sobre la escena en vivo (${activeGaldrPlan.steps.length} movimientos armónicos sincronizados con tus biopíxeles).`;
      } else if (isStoryRequest && activeCues.length > 0) {
        builtReply = `¡Qué buena historia! Acabo de convertirla en ${activeCues.length} escenas animadas en 3D con música Galdr sobre toda la pantalla. Siéntate a verla o dime qué detalle quieres cambiar.`;
      }

      finalReply =
        bondStep.bondReplyOverride ??
        (bondStep.distilledPrompt
          ? `${builtReply}${imageNote}\n\n${bondStep.distilledPrompt}`
          : `${builtReply}${imageNote}`);
    }

    // Ajustes ópticos rápidos solicitados por texto
    if (/\b(4k|uhd|8\.29|8294400)\b/i.test(text)) setResolutionTier('UHD_4K');
    else if (/\b(2k|qhd|3\.6|3686400|3600000)\b/i.test(text)) setResolutionTier('QHD_2K');
    else if (/\b(full\s*hd|fhd|1080p|2073600)\b/i.test(text)) setResolutionTier('FHD');
    else if (/\b(720p|921600|\bhd\b)\b/i.test(text)) setResolutionTier('HD');

    if (/\b(pentile|diamante|oled)\b/i.test(text)) setSubpixelLayout('PENTILE_DIAMOND');
    else if (/\b(rgbw|subp[ií]xel blanco|cuarto subp[ií]xel)\b/i.test(text)) setSubpixelLayout('RGBW');
    else if (/\b(rgb\s*stripe|franjas\s*rgb|est[aá]ndar\s*rgb)\b/i.test(text)) setSubpixelLayout('RGB_STRIPE');

    if (/\b(1\s*bit|monocrom[aá]tic[oa]?)\b/i.test(text)) setColorDepth('MONOCHROME_1BIT');
    else if (/\b(8\s*bits?|escala de grises|grises|256 tonos)\b/i.test(text)) setColorDepth('GRAYSCALE_8BIT');
    else if (/\b(24\s*bits?|true\s*color|16\.7\s*m)\b/i.test(text)) setColorDepth('TRUE_COLOR_24BIT');

    if (/\b(reparar.*p[ií]xel|pulso\s*p33|sanar\s*panel|panel\s*sano)\b/i.test(text)) {
      setDefectMode('HEALTHY');
      setRepairPulse((p) => p + 1);
    } else if (/\b(p[ií]xel\s*muerto|subp[ií]xeles apagados)\b/i.test(text)) {
      setDefectMode('DEAD_PIXEL');
    } else if (/\b(p[ií]xel\s*atascado|stuck)\b/i.test(text)) {
      setDefectMode('STUCK_PIXEL');
    } else if (/\b(p[ií]xel\s*caliente|hot\s*pixel)\b/i.test(text)) {
      setDefectMode('HOT_PIXEL');
    }

    if (!actionIntent && chatKind === 'greeting') {
      setPulseCounter((c) => c + 1);
    }

    setIsThinking(false);
    const assistantSeq = msgSeqRef.current++;
    const turnLatencyMs = Number((performance.now() - turnStartMs).toFixed(1));
    setMessages((prev) => [
      ...prev,
      {
        id: `a_${Date.now()}_${assistantSeq}`,
        role: 'assistant',
        text: finalReply,
        latencyMs: turnLatencyMs,
      },
    ]);

    if (voiceEnabled) {
      triggerVoiceReply(toSpokenSummary(finalReply), voiceGender);
    }

    void fetch('/api/ollama/distill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text }),
    }).catch(() => {
      // Mantiene ejecución local determinista
    });
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

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendInstruction();
    }
  };

  const activeSceneLabel = activeStoryMold
    ? activeStoryMold.moldKind.replace(/_/g, ' ')
    : (MORPH_SHAPE_LABELS[currentShape] ?? currentShape);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#040812] text-slate-100">
      {/* MODO PANTALLA PURA (H) */}
      {zenMode && (
        <div className="pointer-events-auto fixed right-4 top-4 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZenMode(false)}
            className="inline-flex items-center gap-1.5 border border-slate-700 bg-[#060a14]/92 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-sky-500/50"
          >
            <Eye className="h-3.5 w-3.5 text-sky-300" />
            <span>Mostrar Consola (H)</span>
          </button>
        </div>
      )}

      {/* BARRA SUPERIOR CONTRATO DE 3 ZONAS */}
      {!zenMode && (
        <header className="flex shrink-0 items-center justify-between gap-6 border-b border-slate-800 bg-[#060a14] px-4 py-2.5">
          {/* Zona 1: Wordmark */}
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 whitespace-nowrap font-display text-base font-bold tracking-wider text-white">
              HELIX
            </span>
            <span className="hidden truncate text-xs text-slate-400 md:inline">
              {activeSceneLabel} · {planetSpec.label} · {BIOPIXEL_TIERS[resolutionTier].shortLabel}
            </span>
          </div>

          {/* Zona 2: Navegación principal */}
          <nav className="flex items-center gap-1 overflow-x-auto">
            {(
              [
                { id: 'biopixel', label: 'Biopíxeles 3D', icon: Layers },
                { id: 'cartridges', label: 'Cartuchos Lab', icon: FlaskConical },
                { id: 'optics', label: 'Óptica & P₃₃', icon: Cpu },
                { id: 'dna', label: 'ADN / Motores', icon: Dna },
              ] as const
            ).map((navItem) => {
              const Icon = navItem.icon;
              const active = stageMode === navItem.id;
              return (
                <button
                  key={navItem.id}
                  type="button"
                  onClick={() => setStageMode(navItem.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'border border-sky-500/50 bg-sky-500/15 text-sky-200'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{navItem.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zona 3: Acciones principales */}
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePlayGaldrCinema()}
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border px-2.5 py-1.5 text-xs font-medium ${
                isCinePlaying
                  ? 'border-rose-500/60 bg-rose-500/20 text-rose-200'
                  : 'border-slate-700 bg-[#0b111e] text-slate-200 hover:border-sky-500/50'
              }`}
            >
              {isCinePlaying ? <Square className="h-3.5 w-3.5" /> : <Music className="h-3.5 w-3.5 text-sky-300" />}
              <span className="hidden xl:inline">{isCinePlaying ? 'Detener' : 'Cine-Audio'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleVideoRecord}
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border px-2.5 py-1.5 text-xs font-medium ${
                isRecordingVideo
                  ? 'border-rose-500/60 bg-rose-500/20 text-rose-200'
                  : 'border-slate-700 bg-[#0b111e] text-slate-200 hover:border-sky-500/50'
              }`}
            >
              {isRecordingVideo ? <Square className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5 text-emerald-300" />}
              <span className="hidden xl:inline">{isRecordingVideo ? 'Detener' : 'Grabar .webm'}</span>
            </button>

            {recordedVideoUrl && (
              <a
                href={recordedVideoUrl}
                download={`helix_biopixel_${Date.now()}.webm`}
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap border border-emerald-500/50 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-medium text-emerald-200"
              >
                <Download className="h-3.5 w-3.5" />
                <span>.webm</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setRightDockOpen((v) => !v)}
              title="Mostrar u ocultar Chat, PowerShell CLI y Colab"
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border border-slate-700 bg-[#0b111e] px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-sky-500/50"
            >
              {rightDockOpen ? (
                <PanelRightClose className="h-3.5 w-3.5 text-sky-300" />
              ) : (
                <PanelRightOpen className="h-3.5 w-3.5 text-sky-300" />
              )}
              <span className="hidden sm:inline">{rightDockOpen ? 'Ocultar Dock' : 'Abrir Dock'}</span>
            </button>

            <button
              type="button"
              onClick={() => setZenMode(true)}
              title="Pantalla Pura (H)"
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-400"
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Pantalla Pura</span>
            </button>
          </div>
        </header>
      )}

      {videoStatusNotice && !zenMode && (
        <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-200">
          {videoStatusNotice}
        </div>
      )}

      {/* CUERPO PRINCIPAL SPLIT-SCREEN: VIEWPORT DESPEJADO + DOCK DERECHO */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ESCENARIO CENTRAL / IZQUIERDO */}
        <section className="relative min-w-0 flex-1 overflow-hidden bg-[#040812]">
          {/* CAPA BIOPIXEL 3D (SIEMPRE VIVA CUANDO ESTÁ EN MODO BIOPIXEL O PANTALLA PURA) */}
          <div
            className={
              zenMode || stageMode === 'biopixel'
                ? 'absolute inset-0 z-0'
                : 'pointer-events-none absolute inset-0 -z-10 opacity-0'
            }
          >
            <HelixBiopixel3DStage
              shape={currentShape}
              storyMold={activeStoryMold?.moldKind ?? null}
              storyPrevMold={storyMotion?.prevMoldKind ?? null}
              storyMorphMix={storyMotion?.morphMix ?? 1.0}
              storyPrimaryHex={activeStoryMold?.primaryHex}
              storySecondaryHex={activeStoryMold?.secondaryHex}
              disneySquashY={storyMotion?.squashY ?? 1.0}
              disneyStretchXZ={storyMotion?.stretchXZ ?? 1.0}
              disneyArcX={storyMotion?.arcOffsetX ?? 0.0}
              disneyArcY={storyMotion?.arcOffsetY ?? 0.0}
              resolutionTier={resolutionTier}
              subpixelLayout={subpixelLayout}
              colorDepth={colorDepth}
              defectMode={defectMode}
              repairPulse={repairPulse}
              accentHex={accentHex}
              energy={isSpeaking || isCinePlaying || Boolean(storyMotion) ? 0.88 : 0.48}
              tension={micActive ? 0.72 : 0.35}
              planetId={planetId}
              pulseCounter={pulseCounter}
              cineFovDeg={
                activeCineFrame?.fovDeg ??
                (storyMotion ? (storyMotion.cineState.fovRad * 180) / Math.PI : undefined)
              }
              c6DeltaZ={activeCineFrame ? activeCineFrame.unified.deltaZ : unifiedEq.deltaZ}
              onShipScoreUpdate={setShipScore}
              onTelemetryUpdate={setDisplayTelemetry}
              onCanvasReady={(canvas) => {
                stageCanvasRef.current = canvas;
              }}
            />
          </div>

          {/* HUD DISCRETO SOBRE EL VISOR 3D (SIN TAPAR LA ESCENA) */}
          {!zenMode && stageMode === 'biopixel' && (
            <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'EARTH', label: 'Tierra · 1g' },
                  { id: 'MOON', label: 'Luna · 0.165g' },
                  { id: 'MARS', label: 'Marte · 0.379g' },
                  { id: 'ORBIT_ZERO_G', label: 'Órbita · 0g' },
                ] as const
              ).map((env) => (
                <button
                  key={env.id}
                  type="button"
                  onClick={() => onChangePlanet(env.id)}
                  className={`pointer-events-auto shrink-0 whitespace-nowrap border px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm transition-colors ${
                    planetId === env.id
                      ? 'border-sky-500/60 bg-sky-500/20 text-sky-100'
                      : 'border-slate-800/90 bg-[#060a14]/80 text-slate-300 hover:text-white'
                  }`}
                >
                  {env.label}
                </button>
              ))}
              {currentShape === 'orbital_ship' && !activeStoryMold && (
                <span className="border border-amber-500/35 bg-[#060a14]/80 px-2.5 py-1 font-mono text-[11px] tabular-nums text-amber-200">
                  WASD · {shipScore} balizas
                </span>
              )}
            </div>
          )}

          {/* MODO CARTUCHOS LAB */}
          {!zenMode && stageMode === 'cartridges' && (
            <div className="relative z-10 h-full overflow-hidden">
              <CartridgeLabHub
                onProjectToBiopixel={(shape, hex) => {
                  stopAllPlayback();
                  setActiveStoryMold(null);
                  setCurrentShape(shape);
                  if (hex) setAccentHex(hex);
                  setPulseCounter((c) => c + 1);
                  setStageMode('biopixel');
                }}
              />
            </div>
          )}

          {/* MODO ÓPTICA & P33 */}
          {!zenMode && stageMode === 'optics' && (
            <div className="relative z-10 h-full overflow-y-auto bg-[#05080f] p-4 lg:p-6">
              <div className="mx-auto max-w-4xl space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-xl font-bold text-white">Matriz Pauli-SoA · Óptica P₃₃ y Ecuación S_BioPixel</h2>
                    <p className="mt-1 text-slate-400">
                      Calibración física de sub-biopíxeles, profundidad cromática, reparación y perturbación Z4.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStageMode('biopixel')}
                    className="bg-sky-500 px-3 py-1.5 font-semibold text-slate-950 hover:bg-sky-400"
                  >
                    Ver en Visor 3D
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3 border border-slate-800 bg-[#0b111e] p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Resolución y Sub-Biopíxeles</span>
                      <span className="font-mono text-sky-300 tabular-nums">
                        {BIOPIXEL_TIERS[resolutionTier].biopixels.toLocaleString('es-ES')} px
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums">
                      <div className="border border-slate-800 bg-[#05080f] p-2">
                        Físicos: {displayTelemetry?.physicalCanvasWidth ?? BIOPIXEL_TIERS[resolutionTier].width}×
                        {displayTelemetry?.physicalCanvasHeight ?? BIOPIXEL_TIERS[resolutionTier].height}
                      </div>
                      <div className="border border-slate-800 bg-[#05080f] p-2">
                        CSS: {displayTelemetry?.logicalCssWidth ?? 0}×{displayTelemetry?.logicalCssHeight ?? 0}
                      </div>
                      <div className="border border-slate-800 bg-[#05080f] p-2 text-emerald-300">
                        P₃₃: ({activeP33Metrics.primePair[0]}, {activeP33Metrics.primePair[1]})
                      </div>
                      <div className="border border-slate-800 bg-[#05080f] p-2 text-sky-300">
                        Anti-muaré: {activeP33Metrics.antiMoireScorePct}%
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {(['HD', 'FHD', 'QHD_2K', 'UHD_4K'] as BiopixelResolutionTierId[]).map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setResolutionTier(id)}
                          className={`border py-1.5 font-mono text-[11px] ${
                            resolutionTier === id
                              ? 'border-sky-500/60 bg-sky-500/20 text-sky-200'
                              : 'border-slate-800 bg-[#05080f] text-slate-400 hover:text-white'
                          }`}
                        >
                          {BIOPIXEL_TIERS[id].shortLabel}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          ['RGB_STRIPE', 'RGB Stripe'],
                          ['PENTILE_DIAMOND', 'PenTile'],
                          ['RGBW', 'RGBW'],
                        ] as [BiopixelSubpixelLayout, string][]
                      ).map(([id, short]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSubpixelLayout(id)}
                          className={`border py-1.5 text-[11px] font-medium ${
                            subpixelLayout === id
                              ? 'border-sky-500/60 bg-sky-500/20 text-sky-200'
                              : 'border-slate-800 bg-[#05080f] text-slate-400 hover:text-white'
                          }`}
                        >
                          {short}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          ['TRUE_COLOR_24BIT', '24-bit'],
                          ['GRAYSCALE_8BIT', '8-bit Gris'],
                          ['MONOCHROME_1BIT', '1-bit'],
                        ] as [BiopixelColorDepth, string][]
                      ).map(([id, short]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setColorDepth(id)}
                          className={`border py-1.5 text-[11px] font-medium ${
                            colorDepth === id
                              ? 'border-sky-500/60 bg-sky-500/20 text-sky-200'
                              : 'border-slate-800 bg-[#05080f] text-slate-400 hover:text-white'
                          }`}
                        >
                          {short}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 border border-slate-800 bg-[#0b111e] p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Salud de Panel & Ecuación Unificada</span>
                      <button
                        type="button"
                        onClick={handleRepairBiopixels}
                        className="border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-200"
                      >
                        Reparar Píxel
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {(
                        [
                          ['HEALTHY', 'Sano'],
                          ['DEAD_PIXEL', 'Muerto'],
                          ['STUCK_PIXEL', 'Atascado'],
                          ['HOT_PIXEL', 'Caliente'],
                        ] as [BiopixelDefectMode, string][]
                      ).map(([id, short]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setDefectMode(id)}
                          className={`border py-1.5 text-[11px] font-medium ${
                            defectMode === id
                              ? 'border-amber-500/60 bg-amber-500/20 text-amber-200'
                              : 'border-slate-800 bg-[#05080f] text-slate-400 hover:text-white'
                          }`}
                        >
                          {short}
                        </button>
                      ))}
                    </div>

                    <div className="border border-slate-800 bg-[#05080f] p-3 space-y-2">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="text-slate-300">Perturbación Z4 C_Frente={cFrontPerturb}</span>
                        <span className="text-emerald-300">
                          {unifiedEq.guardStatus} · ΔZ={unifiedEq.deltaZ}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.02}
                        value={cFrontPerturb}
                        onChange={(e) => setCFrontPerturb(Number(e.target.value))}
                        className="h-1.5 w-full cursor-pointer accent-sky-400"
                      />
                      <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-slate-300 tabular-nums">
                        <div>Brus: {unifiedEq.brusRadiusModulatedNm} nm</div>
                        <div>Cauchy n: {unifiedEq.cauchySpectral.nGreen}</div>
                        <div>||ψ||²: {unifiedEq.blochNormSq}</div>
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 tabular-nums">
                        RGB({colorReadout.r}, {colorReadout.g}, {colorReadout.b}) · CMYK(
                        {colorReadout.cPct}%, {colorReadout.mPct}%, {colorReadout.yPct}%, {colorReadout.kPct}%)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODO ADN / MOTORES 23×33 */}
          {!zenMode && stageMode === 'dna' && (
            <div className="relative z-10 h-full overflow-y-auto bg-[#05080f] p-4 lg:p-6">
              {showFullCoreStudio ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-sm font-semibold text-white">Arquitecto Completo & Fábrica Multi-Target</span>
                    <button
                      type="button"
                      onClick={() => setShowFullCoreStudio(false)}
                      className="border border-slate-700 bg-[#0b111e] px-3 py-1.5 text-xs text-slate-200 hover:border-sky-500/50"
                    >
                      Volver al Recombinador Rápido
                    </button>
                  </div>
                  <CoreEngineStudioView
                    onOpenInVm={() => setRightDockTab('cli')}
                    onOpenIn3DStudio={() => setStageMode('biopixel')}
                    onProjectToHologram={(payload) => {
                      stopAllPlayback();
                      setActiveStoryMold(null);
                      setCurrentShape(payload.shape ?? 'quantum_bloch');
                      setAccentHex(payload.accentHex ?? '#38bdf8');
                      setPulseCounter((c) => c + 1);
                      setStageMode('biopixel');
                    }}
                  />
                </div>
              ) : (
                <div className="mx-auto max-w-5xl space-y-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h2 className="text-xl font-bold text-white">Recombinador ADN (23 Motores × 33 Disciplinas)</h2>
                      <p className="mt-1 text-slate-400">
                        Fusiona herramientas verificadas, desarma scripts .hlx o abre el arquitecto multi-target.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowFullCoreStudio(true)}
                        className="border border-slate-700 bg-[#0b111e] px-3 py-1.5 font-medium text-slate-200 hover:border-sky-500/50"
                      >
                        Abrir Arquitecto Multi-Target
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRunOmegaRecombination(false)}
                        className="inline-flex items-center gap-1 border border-sky-400/60 bg-sky-500/20 px-3 py-1.5 font-semibold text-sky-200"
                      >
                        <Atom className="h-3.5 w-3.5" />
                        <span>Fusión Omega</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRunCombinatorialBatch(false)}
                        className="inline-flex items-center gap-1 bg-emerald-500 px-3 py-1.5 font-semibold text-slate-950"
                      >
                        <GitMerge className="h-3.5 w-3.5" />
                        <span>Lote 2º/3º Orden</span>
                      </button>
                    </div>
                  </div>

                  {batchReport && (
                    <div className="border border-emerald-500/35 bg-[#0b111e] p-3 font-mono text-[11px] text-emerald-300">
                      {batchReport.summary}
                    </div>
                  )}

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3 border border-slate-800 bg-[#0b111e] p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">Recetas Cruzadas ({crossExperiments.length})</span>
                        <span className="font-mono text-[10px] text-slate-400">{registeredTools.length} células</span>
                      </div>
                      <div className="max-h-52 space-y-1.5 overflow-y-auto">
                        {crossExperiments.map((exp) => (
                          <button
                            key={exp.id}
                            type="button"
                            onClick={() => {
                              handleRunRecombination([...exp.toolIds]);
                              setStageMode('biopixel');
                            }}
                            className="flex w-full items-center justify-between gap-2 border border-slate-800 bg-[#05080f] px-2.5 py-2 text-left hover:border-sky-500/50"
                          >
                            <span className="truncate text-slate-200">{exp.title}</span>
                            <Play className="h-3.5 w-3.5 shrink-0 text-sky-300" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 border border-slate-800 bg-[#0b111e] p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white">Catálogo ({filteredTools.length})</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setShowAllTools((v) => !v)}
                            className="border border-slate-700 bg-[#05080f] px-2 py-1 text-[10px] text-slate-300"
                          >
                            {showAllTools ? 'Top 50' : 'Todas'}
                          </button>
                          <button
                            type="button"
                            disabled={selectedToolIds.length < 2}
                            onClick={() => {
                              handleRunRecombination();
                              setStageMode('biopixel');
                            }}
                            className="bg-sky-500 px-2.5 py-1 text-[11px] font-semibold text-slate-950 disabled:opacity-40"
                          >
                            Recombinar ({selectedToolIds.length})
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-1.5 border border-slate-700 bg-[#05080f] px-2">
                          <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <input
                            type="text"
                            value={toolSearch}
                            onChange={(e) => setToolSearch(e.target.value)}
                            placeholder="Buscar herramienta o ley…"
                            className="h-7 w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
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

                      <div className="max-h-44 space-y-1 overflow-y-auto">
                        {(showAllTools ? filteredTools : filteredTools.slice(0, 50)).map((tool: HelixRegisteredTool) => {
                          const selected = selectedToolIds.includes(tool.id);
                          return (
                            <button
                              key={tool.id}
                              type="button"
                              onClick={() => toggleSelectTool(tool.id)}
                              className={`flex w-full items-center justify-between gap-2 border px-2.5 py-1.5 text-left ${
                                selected
                                  ? 'border-sky-500/60 bg-sky-500/15 text-white'
                                  : 'border-slate-800 bg-[#05080f] text-slate-300'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="truncate text-[11px]">{tool.title}</div>
                                <div className="truncate text-[10px] text-slate-400">{tool.domain}</div>
                              </div>
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
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
                  </div>

                  {recombResult && (
                    <div className="border border-sky-500/35 bg-[#0b111e] p-3">
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span>{recombResult.success ? 'Última Síntesis Verificada' : 'Rechazada'}</span>
                        <span className="font-mono text-emerald-300">{recombResult.bridges.length} puentes</span>
                      </div>
                      <p className="mt-1 text-slate-300">{recombResult.engineeringSummary}</p>
                    </div>
                  )}

                  <div className="border border-slate-800 bg-[#0b111e] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold text-white">
                        <Scissors className="h-3.5 w-3.5 text-amber-300" />
                        <span>Desarmador Atómico (.hlx → células verificadas)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRunDecompose(true)}
                        className="bg-amber-500/20 px-2.5 py-1 font-medium text-amber-200 hover:bg-amber-500/30"
                      >
                        Desarmar + Registrar
                      </button>
                    </div>
                    <textarea
                      value={decomposeInput}
                      onChange={(e) => setDecomposeInput(e.target.value)}
                      rows={4}
                      className="w-full border border-slate-700 bg-[#05080f] p-2 font-mono text-[11px] text-sky-100 focus:outline-none"
                    />
                    {decomposeResult && (
                      <div className="mt-1.5 font-mono text-[11px] text-slate-400">
                        Átomos extraídos: {decomposeResult.atoms.length} ·{' '}
                        {decomposeResult.verifiedSource ? 'VERIFICADO' : 'REVISAR'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* DOCK DERECHO COLAPSABLE: CHAT TÉCNICO + POWERSHELL CLI + NOTEBOOK COLAB */}
        {!zenMode && rightDockOpen && (
          <div className="h-full w-full shrink-0 md:w-[400px] xl:w-[450px]">
            <EngineeringRightDock
              activeTab={rightDockTab}
              onChangeTab={setRightDockTab}
              onCloseDock={() => setRightDockOpen(false)}
              engine={engine}
              companionName={bondSnapshot.name}
              guardianName={bondSnapshot.guardianName}
              geminiConfigured={geminiConfigured}
              aiErrorNotice={aiErrorNotice}
              messages={messages}
              isThinking={isThinking}
              inputText={inputText}
              onInputTextChange={setInputText}
              onSendInstruction={handleSendInstruction}
              voiceEnabled={voiceEnabled}
              onToggleVoiceOutput={handleToggleVoiceOutput}
              voiceGender={voiceGender}
              onSelectVoiceGender={handleSelectVoiceGender}
              availableVoices={availableVoices}
              selectedVoiceURI={selectedVoiceURI}
              onSelectVoiceURI={handleSelectVoiceURI}
              micActive={micActive}
              micNotice={micNotice}
              onToggleMic={handleToggleMic}
              attachedImageName={attachedImageName}
              onClearAttachedImage={() => {
                setAttachedImageDataUrl(null);
                setAttachedImageName(null);
              }}
              onAttachFileChange={handleAttachImage}
              fileInputRef={fileInputRef}
              cameraInputRef={cameraInputRef}
              chatEndRef={chatEndRef}
              onProjectShape={(shape, hex) => {
                stopAllPlayback();
                setActiveStoryMold(null);
                setCurrentShape(shape);
                if (hex) setAccentHex(hex);
                setPulseCounter((c) => c + 1);
                setStageMode('biopixel');
              }}
              onTriggerOmega={() => {
                handleRunOmegaRecombination(false);
                setStageMode('biopixel');
              }}
              onTriggerRecombine={(ids) => {
                handleRunRecombination(ids);
                setStageMode('biopixel');
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
