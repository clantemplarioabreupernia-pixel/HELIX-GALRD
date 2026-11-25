import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  Code2,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  FlaskConical,
  GitMerge,
  Layers,
  Play,
  RefreshCw,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  createHelixCoreEngine,
  decodeAcademicCard17B,
  DecompositionResult,
  DISCIPLINES_33,
  DOMAIN_ENGINE_METADATA,
  EngineExecutionOutput,
  EngineeringReport,
  HelixRegisteredTool,
  HelixToolDomain,
  HolographicAcademicCard,
  MultiTargetAssemblyBundle,
  PersonaMode,
  RecombinationResult,
  ToolOrigin,
} from '../core';
import { CellTarget } from '../utils/helixCells';
import {
  DEFAULT_HELIX_3D_PROGRAM,
  DEFAULT_HELIX_CONTRACT_PROGRAM,
  DEFAULT_HELIX_PHYSICS_PROGRAM,
} from '../utils/helixVm';
import { LiquidMorphShape } from './LiquidBiopixelCanvas';

interface CoreEngineStudioViewProps {
  onOpenInVm: (script: string) => void;
  onOpenIn3DStudio: (script: string) => void;
  onProjectToHologram?: (payload: {
    hlxScript: string;
    title: string;
    subtitle?: string;
    shape?: LiquidMorphShape;
    accentHex?: string;
  }) => void;
}

type StudioTab = 'architect' | 'recombine' | 'decompose' | 'catalog' | 'library17b';

const INTENT_PRESETS: { label: string; persona: PersonaMode; intent: string }[] = [
  {
    label: 'Niño · Videojuego espacial',
    persona: 'KID_CREATIVE',
    intent: 'Quiero crear un videojuego espacial con naves que rebotan entre asteroides y música reactiva',
  },
  {
    label: 'NASA · Órbita + Enlace RF',
    persona: 'ENGINEER_SCIENTIST',
    intent: 'Simulación orbital satelital Kepler + Verlet con cálculo de atenuación atmosférica ITU-R y radar Doppler',
  },
  {
    label: 'Videoclip · LipSync + Fluidos',
    persona: 'CREATOR_MEDIA',
    intent: 'Videoclip procedural con avatar sincronizado por voz LipSync 3 bandas, fluido viscoelástico Cauchy y cámara spline',
  },
  {
    label: 'Cuántica · Circuito GHZ + Bloch',
    persona: 'ENGINEER_SCIENTIST',
    intent: 'Simulador cuántico multi-qubit en statevector OpenQASM acoplado a rotaciones unitarias en la esfera de Bloch',
  },
  {
    label: 'Finanzas · Libro Merkle P33',
    persona: 'ENGINEER_SCIENTIST',
    intent: 'Libro mayor contable de partida doble exacto en aritmética racional P33 sellado con árbol Merkle SHA-256',
  },
];

function downloadFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function originLabel(origin: ToolOrigin): string {
  if (origin === 'canonical_opcode') return 'Canónica';
  if (origin === 'recovered_159') return 'Recuperada .hlx';
  return 'Hija autopoiética';
}

export function CoreEngineStudioView({
  onOpenInVm,
  onOpenIn3DStudio,
  onProjectToHologram,
}: CoreEngineStudioViewProps) {
  const [engine] = useState(() => createHelixCoreEngine());
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [activeTab, setActiveTab] = useState<StudioTab>('architect');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Estado Tab 1: Arquitecto y Entrevista
  const [intentText, setIntentText] = useState<string>(INTENT_PRESETS[0].intent);
  const [personaMode, setPersonaMode] = useState<PersonaMode>('AUTO');
  const [interviewAnswers, setInterviewAnswers] = useState<Record<string, string>>({});
  const [showMaterializedPreview, setShowMaterializedPreview] = useState<boolean>(false);

  // Estado Tab 2: Recombinación A × B + 33 Disciplinas + Multi-Target + Mini-GPT N2
  const [toolAId, setToolAId] = useState<string>('123_orbital_mechanics_kepler');
  const [toolBId, setToolBId] = useState<string>('23_satellite_itup676');
  const [toolCId, setToolCId] = useState<string>('21_radar_fmcw_77ghz');
  const [selectedDiscBit, setSelectedDiscBit] = useState<number | null>(null);
  const [exportTarget, setExportTarget] = useState<CellTarget>('go');
  const [recombRadiusKm, setRecombRadiusKm] = useState<string>('6771');
  const [recombBandMid, setRecombBandMid] = useState<string>('0.65');
  const [miniGptTrainMsg, setMiniGptTrainMsg] = useState<string | null>(null);
  const [miniGptTraining, setMiniGptTraining] = useState<boolean>(false);
  const [recombResult, setRecombResult] = useState<RecombinationResult | null>(() =>
    engine.recombineTools(
      ['123_orbital_mechanics_kepler', '23_satellite_itup676', '21_radar_fmcw_77ghz'],
      { radius_km: 6771 },
      false,
    ),
  );

  // Estado Tab 3: Desarmador
  const [decompSource, setDecompSource] = useState<string>(DEFAULT_HELIX_CONTRACT_PROGRAM);
  const [decompLabel, setDecompLabel] = useState<string>('contrato_cuotas.hlx');
  const [registerExtractedAtoms, setRegisterExtractedAtoms] = useState<boolean>(false);
  const [decompResult, setDecompResult] = useState<DecompositionResult>(() =>
    engine.decomposeProgram(DEFAULT_HELIX_CONTRACT_PROGRAM, 'contrato_cuotas.hlx', false),
  );

  // Estado Tab 4: Catálogo Vivo
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [domainFilter, setDomainFilter] = useState<string>('ALL');
  const [originFilter, setOriginFilter] = useState<string>('ALL');
  const [selectedToolId, setSelectedToolId] = useState<string>('123_orbital_mechanics_kepler');
  const [toolParamInputs, setToolParamInputs] = useState<Record<string, string>>({});
  const [toolExecResult, setToolExecResult] = useState<EngineExecutionOutput | null>(() =>
    engine.invokeTool('123_orbital_mechanics_kepler'),
  );

  // Estado Tab 5: 33 Disciplinas & Biblioteca Holográfica 17B
  const [libraryQuery, setLibraryQuery] = useState<string>('');
  const [libraryDiscFilter, setLibraryDiscFilter] = useState<number | 'ALL'>('ALL');

  const tools = useMemo(() => {
    void catalogVersion;
    return engine.getRegisteredTools();
  }, [engine, catalogVersion]);

  const holographicCards: HolographicAcademicCard[] = useMemo(() => {
    void catalogVersion;
    return engine.getHolographicCards();
  }, [engine, catalogVersion]);

  const filteredHolographicCards = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase();
    return holographicCards.filter((card) => {
      if (libraryDiscFilter !== 'ALL' && !card.activeBitIndices.includes(libraryDiscFilter)) {
        return false;
      }
      if (!q) return true;
      return (
        card.title.toLowerCase().includes(q) ||
        card.summary.toLowerCase().includes(q) ||
        card.frame.frameSha256.toLowerCase().includes(q) ||
        card.disciplines.some((d) => d.name.toLowerCase().includes(q) || d.faculty.toLowerCase().includes(q))
      );
    });
  }, [holographicCards, libraryQuery, libraryDiscFilter]);

  const recombMultiTarget: MultiTargetAssemblyBundle | null = useMemo(() => {
    if (!recombResult?.synthesizedHlx) return null;
    return engine.exportRecombinationMultiTarget(recombResult, ['go', 'glsl', 'js', 'html']);
  }, [engine, recombResult]);

  const decodedRecombCard = useMemo(() => {
    if (!recombResult?.holographicCard) return null;
    return decodeAcademicCard17B(recombResult.holographicCard);
  }, [recombResult]);

  const curatedExperiments = useMemo(() => engine.discoverCrossDomainExperiments(), [engine]);

  const engineeringReport: EngineeringReport = useMemo(() => {
    void catalogVersion;
    return engine.analyzeIntent(intentText, interviewAnswers, personaMode);
  }, [engine, intentText, interviewAnswers, personaMode, catalogVersion]);

  const domainsList = useMemo(() => {
    const set = new Set<HelixToolDomain>();
    for (const t of tools) set.add(t.domain);
    return Array.from(set);
  }, [tools]);

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tools.filter((t) => {
      if (domainFilter !== 'ALL' && t.domain !== domainFilter) return false;
      if (originFilter !== 'ALL' && t.origin !== originFilter) return false;
      if (!q) return true;
      return (
        t.id.toLowerCase().includes(q) ||
        t.fileName.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.domain.toLowerCase().includes(q) ||
        t.engineId.toLowerCase().includes(q) ||
        t.keywords.some((kw) => kw.includes(q))
      );
    });
  }, [tools, searchQuery, domainFilter, originFilter]);

  const selectedTool: HelixRegisteredTool = useMemo(() => {
    return tools.find((t) => t.id === selectedToolId) ?? tools[0];
  }, [tools, selectedToolId]);

  const canonicalCount = useMemo(
    () => tools.filter((t) => t.origin === 'canonical_opcode').length,
    [tools],
  );
  const recoveredCount = useMemo(
    () => tools.filter((t) => t.origin === 'recovered_159').length,
    [tools],
  );
  const childCount = useMemo(
    () => tools.filter((t) => t.origin === 'autopoietic_child').length,
    [tools],
  );

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      // Ignore clipboard permission denials
    }
  };

  const handleSelectToolInCatalog = (tool: HelixRegisteredTool) => {
    setSelectedToolId(tool.id);
    const defaults: Record<string, string> = {};
    for (const inp of tool.inputs) {
      if (inp.defaultValue !== undefined) defaults[inp.name] = String(inp.defaultValue);
    }
    setToolParamInputs(defaults);
    setToolExecResult(engine.invokeTool(tool.id));
  };

  const handleRunSelectedTool = () => {
    const parsed: Record<string, number | string> = {};
    for (const inp of selectedTool.inputs) {
      const raw = toolParamInputs[inp.name];
      if (raw !== undefined && raw !== '') {
        const n = Number(raw);
        parsed[inp.name] = Number.isFinite(n) && raw.trim() !== '' ? n : raw;
      }
    }
    setToolExecResult(engine.invokeTool(selectedTool.id, parsed));
  };

  const handleRunRecombination = (ids?: string[], customParams?: Record<string, number | string>) => {
    const chosen = ids ?? [toolAId, toolBId, ...(toolCId && toolCId !== 'NONE' ? [toolCId] : [])];
    const params: Record<string, number | string> = customParams ?? {
      radius_km: Number(recombRadiusKm) || 6771,
      band_mid: Number(recombBandMid) || 0.65,
    };
    const res = engine.recombineTools(chosen, params, true);
    setRecombResult(res);
    setMiniGptTrainMsg(null);
    setCatalogVersion((v) => v + 1);
  };

  const handleTrainMiniGptFromRecombination = async (res: RecombinationResult | null) => {
    if (!res?.synthesizedHlx || !res.success) return;
    setMiniGptTraining(true);
    setMiniGptTrainMsg(null);
    const promptLabel = `Recombinar ${res.parentTools.map((t) => t.title).join(' × ')}`;
    engine.recordCertifiedCapsule(
      {
        prompt: promptLabel,
        reply: res.engineeringSummary,
        hlxScript: res.synthesizedHlx,
        shape: 'avatar',
        domain: res.childTool?.domain ?? 'RECOMBINACION_AB',
      },
      4,
    );
    try {
      const r = await fetch('/api/recombine/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptLabel,
          summary: res.engineeringSummary,
          hlxScript: res.synthesizedHlx,
          domain: res.childTool?.domain ?? 'RECOMBINACION_AB',
          qpsk17Sha256: res.holographicCard?.frame.frameSha256 ?? '',
          disciplineMaskBits33: res.disciplineMaskBits33,
          steps: 4,
        }),
      });
      const d = await r.json();
      if (r.ok && d?.ok) {
        setMiniGptTrainMsg(
          `Mini-GPT entrenado (${d.status?.acceptedCapsulesCount ?? '?'} cápsulas · ${d.status?.stepsTrained ?? '?'} pasos · loss=${Number(d.status?.finalLoss ?? 0).toFixed(4)})`,
        );
      } else {
        setMiniGptTrainMsg(d?.error || 'Rechazado por aduana N2.');
      }
    } catch {
      const localSt = engine.getCapsulePredictorStatus();
      setMiniGptTrainMsg(
        `Entrenado en memoria local (${localSt.acceptedCapsules} cápsulas · ${localSt.stepsTrained} pasos)`,
      );
    } finally {
      setMiniGptTraining(false);
    }
  };

  const handleProjectSynthesisToHologram = (
    hlxScript: string,
    title: string,
    pccSha?: string,
    frameSha?: string,
  ) => {
    const badge = [
      pccSha ? `PCC ${pccSha.slice(0, 8)}` : null,
      frameSha ? `17B ${frameSha.slice(0, 8)}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    if (onProjectToHologram) {
      onProjectToHologram({
        hlxScript,
        title,
        subtitle: badge || 'Proyección Holográfica HELIX',
        shape: 'avatar',
        accentHex: '#38bdf8',
      });
    } else {
      onOpenIn3DStudio(hlxScript);
    }
  };

  const handleRunDecomposition = () => {
    const res = engine.decomposeProgram(decompSource, decompLabel, registerExtractedAtoms);
    setDecompResult(res);
    if (registerExtractedAtoms) {
      setCatalogVersion((v) => v + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y KPI Strip */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">
                Motor Central Unificado · @helix/core-engine
              </h1>
              <p className="max-w-3xl text-sm text-slate-600">
                Núcleo determinista desacoplado con introspección sobre {tools.length} células .hlx, 19 motores
                matemáticos reales, desarmador atómico y recombinación autopoiética verificada por SMT, GEOM_SEAL y PCC.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenInVm(engineeringReport.recombination?.synthesizedHlx ?? DEFAULT_HELIX_PHYSICS_PROGRAM)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Probar en VM
              </button>
              <button
                type="button"
                onClick={() => onOpenIn3DStudio(engineeringReport.recombination?.synthesizedHlx ?? DEFAULT_HELIX_3D_PROGRAM)}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Abrir en Estudio 3D
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-y divide-slate-200 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="px-6 py-3.5">
            <div className="text-xs font-medium text-slate-500">Herramientas ADN vivas</div>
            <div className="mt-1 font-mono text-lg font-semibold text-slate-900 tabular-nums">
              {tools.length}
            </div>
            <div className="text-xs text-slate-500">
              {canonicalCount} canónicas · {recoveredCount} .hlx · {childCount} hijas
            </div>
          </div>

          <div className="px-6 py-3.5">
            <div className="text-xs font-medium text-slate-500">Motores matemáticos</div>
            <div className="mt-1 font-mono text-lg font-semibold text-slate-900 tabular-nums">
              {Object.keys(DOMAIN_ENGINE_METADATA).length}
            </div>
            <div className="text-xs text-slate-500">Ecuaciones ejecutables por puerto</div>
          </div>

          <div className="px-6 py-3.5">
            <div className="text-xs font-medium text-slate-500">Puertas del kernel</div>
            <div className="mt-1 font-mono text-lg font-semibold text-slate-900 tabular-nums">
              5
            </div>
            <div className="text-xs text-slate-500">SMT · VM · Pauli-SoA · IA · Puro</div>
          </div>

          <div className="px-6 py-3.5">
            <div className="text-xs font-medium text-slate-500">Verificación formal</div>
            <div className="mt-1 font-mono text-lg font-semibold text-emerald-700 tabular-nums">
              {engineeringReport.smtStatus}
            </div>
            <div className="font-mono text-xs text-slate-500 truncate">
              PCC {engineeringReport.pccSha256.slice(0, 12)}
            </div>
          </div>
        </div>
      </section>

      {/* Navegación por Sub-vistas del Motor Único */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
        {(
          [
            { id: 'architect', label: 'Arquitecto y Entrevista', icon: Cpu },
            { id: 'recombine', label: 'Recombinación A × B', icon: GitMerge },
            { id: 'decompose', label: 'Desarmador atómico', icon: Scissors },
            { id: 'catalog', label: `Catálogo vivo (${tools.length})`, icon: Layers },
            {
              id: 'library17b',
              label: `33 Disciplinas & Biblioteca 17B (${holographicCards.length})`,
              icon: BookOpen,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ARQUITECTO Y ENTREVISTA ADAPTATIVA */}
      {activeTab === 'architect' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-3.5">
                <h2 className="font-display text-sm font-semibold text-slate-900">
                  1. Intención y Perfil del Usuario
                </h2>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Ejemplos rápidos por dominio
                  </label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {INTENT_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setIntentText(preset.intent);
                          setPersonaMode(preset.persona);
                          setInterviewAnswers({});
                        }}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="helix-intent-input" className="block text-xs font-medium text-slate-700">
                    Describe qué quieres diseñar (sin código)
                  </label>
                  <textarea
                    id="helix-intent-input"
                    rows={3}
                    value={intentText}
                    onChange={(e) => setIntentText(e.target.value)}
                    placeholder="Ejemplo: Quiero un videojuego de dinosaurios con gravedad lunar y música..."
                    className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="persona-select" className="block text-xs font-medium text-slate-700">
                    Modo adaptativo de diálogo
                  </label>
                  <select
                    id="persona-select"
                    value={personaMode}
                    onChange={(e) => setPersonaMode(e.target.value as PersonaMode)}
                    className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="AUTO">Automático ({engineeringReport.detectedPersona})</option>
                    <option value="KID_CREATIVE">Niño / Explorador creativo</option>
                    <option value="CREATOR_MEDIA">Creador audiovisual y narrativa</option>
                    <option value="ENGINEER_SCIENTIST">Ingeniero / Científico formal</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Preguntas de Entrevista Adaptativa */}
            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                <h2 className="font-display text-sm font-semibold text-slate-900">
                  2. Entrevista Adaptativa ({engineeringReport.detectedCategory})
                </h2>
                <span className="font-mono text-xs text-slate-500">
                  {engineeringReport.clarificationNeeded ? 'Requiere confirmación' : 'Especificación cerrada'}
                </span>
              </div>
              <div className="divide-y divide-slate-200">
                {engineeringReport.questions.map((q) => {
                  const chosen = interviewAnswers[q.id];
                  return (
                    <div key={q.id} className="space-y-2.5 px-5 py-4">
                      <p className="text-sm font-medium text-slate-900">{q.question}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {q.options.map((opt) => {
                          const active = (chosen ?? q.defaultOption) === opt;
                          const isConfirmed = chosen === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                setInterviewAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: opt,
                                }))
                              }
                              className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                                isConfirmed
                                  ? 'border-blue-600 bg-blue-50 text-blue-800'
                                  : active
                                    ? 'border-slate-300 bg-slate-100 text-slate-800'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {engineeringReport.clarificationNeeded && (
                  <div className="flex items-center justify-between bg-slate-50 px-5 py-3">
                    <span className="text-xs text-slate-600">
                      Usa las opciones guía o personaliza tus respuestas arriba.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const filled: Record<string, string> = { ...interviewAnswers };
                        for (const q of engineeringReport.questions) {
                          if (!filled[q.id]) filled[q.id] = q.defaultOption;
                        }
                        setInterviewAnswers(filled);
                      }}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                    >
                      Confirmar respuestas guía
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Informe Técnico de Ingeniería y Materialización */}
          <div className="space-y-6 lg:col-span-7">
            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
                <div>
                  <h2 className="font-display text-sm font-semibold text-slate-900">
                    3. Informe Técnico de Ingeniería (Auto-Introspección ADN)
                  </h2>
                  <p className="font-mono text-xs text-slate-500 tabular-nums">
                    Perfil {engineeringReport.detectedPersona} · {engineeringReport.selectedTools.length} células de {tools.length} · Gödel {engineeringReport.recombination?.godelBigInt ?? '1'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadFile(
                        'informe-ingenieria-helix.md',
                        engineeringReport.reportMarkdown,
                        'text/markdown;charset=utf-8',
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Informe .md
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadFile(
                        'artefacto-helix-verificado.html',
                        engineeringReport.materializedHtmlPreview,
                        'text/html;charset=utf-8',
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    HTML Materializado
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMaterializedPreview((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {showMaterializedPreview ? 'Ocultar vista viva' : 'Materializar vista'}
                  </button>
                </div>
              </div>

              {showMaterializedPreview && (
                <div className="border-b border-slate-200 bg-slate-950 p-3">
                  <iframe
                    title="Vista previa materializada Helix"
                    sandbox="allow-scripts"
                    srcDoc={engineeringReport.materializedHtmlPreview}
                    className="h-80 w-full rounded border border-slate-800 bg-slate-950"
                  />
                </div>
              )}

              {/* Herramientas Seleccionadas y Resultados Reales */}
              <div className="divide-y divide-slate-200">
                {engineeringReport.selectedTools.map((tool, idx) => {
                  const eng = engineeringReport.activatedEngines[idx];
                  return (
                    <div key={tool.id} className="px-5 py-4 space-y-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-mono text-xs font-semibold text-blue-700">
                            {tool.fileName}
                          </span>
                          <span className="text-xs text-slate-500">
                            Primo {tool.prime} · {tool.domain} · {eng?.label}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-medium text-emerald-700">
                          {eng?.result.valid ? 'INVARIANTE OK' : 'REVISAR'}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-600">{eng?.formulaSummary}</p>
                      <p className="text-xs text-slate-800">{eng?.result.invariantSummary}</p>
                    </div>
                  );
                })}
              </div>

              {/* Puentes Cruzados */}
              <div className="border-t border-slate-200 px-5 py-4 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Puentes interdisciplinarios acoplados ({engineeringReport.crossBridges.length})
                </h3>
                {engineeringReport.crossBridges.length === 0 ? (
                  <p className="text-xs text-slate-600">
                    Ejecución paralela verificada bajo sello geométrico GEOM_SEAL.
                  </p>
                ) : (
                  <div className="space-y-1.5 font-mono text-xs text-slate-700">
                    {engineeringReport.crossBridges.map((b, i) => (
                      <div key={`${b.fromToolId}-${b.toPort}-${i}`} className="flex flex-wrap items-center gap-1.5">
                        <span className="text-slate-900">{b.fromToolId}.{b.fromPort}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <span className="text-blue-700">{b.toToolId}.{b.toPort}</span>
                        <span className="text-slate-500">[{b.transformRule}]</span>
                        <span className="font-semibold text-slate-900">= {String(b.transferredValue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Código .hlx Sintetizado */}
              {engineeringReport.recombination && (
                <div className="border-t border-slate-200 px-5 py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Programa .hlx unificado · Sello SMT {engineeringReport.smtStatus}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy('arch-hlx', engineeringReport.recombination?.synthesizedHlx ?? '')
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      {copiedKey === 'arch-hlx' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedKey === 'arch-hlx' ? 'Copiado' : 'Copiar .hlx'}
                    </button>
                  </div>
                  <pre className="max-h-56 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
                    {engineeringReport.recombination.synthesizedHlx}
                  </pre>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: LABORATORIO DE RECOMBINACIÓN A × B (AUTOPOIESIS) */}
      {activeTab === 'recombine' && (
        <div className="space-y-6">
          {/* Experimentos Curados */}
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3.5">
              <h2 className="font-display text-sm font-semibold text-slate-900">
                Experimentos Cruzados Listos (Combinar dominios que nunca se habían conectado)
              </h2>
            </div>
            <div className="grid divide-y divide-slate-200 md:grid-cols-2 md:divide-x md:divide-y-0">
              {curatedExperiments.map((exp) => (
                <div key={exp.id} className="flex flex-col justify-between gap-3 p-5 border-b border-slate-200">
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-blue-700">
                      {exp.disciplines.join(' × ')}
                    </div>
                    <h3 className="font-display text-sm font-semibold text-slate-900">
                      {exp.title}
                    </h3>
                    <p className="text-xs text-slate-600">{exp.question}</p>
                    <p className="text-xs text-slate-500">{exp.expectedInsight}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-xs text-slate-500">
                      {exp.toolIds.join(' → ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setToolAId(exp.toolIds[0]);
                        setToolBId(exp.toolIds[1]);
                        setToolCId(exp.toolIds[2] ?? 'NONE');
                        handleRunRecombination(exp.toolIds);
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                    >
                      <FlaskConical className="h-3.5 w-3.5" />
                      Ejecutar cruce
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Constructor Libre de Recombinación */}
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3.5">
              <h2 className="font-display text-sm font-semibold text-slate-900">
                Laboratorio Libre: Recombinar cualquier A × B (× C) del Catálogo Vivo
              </h2>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Célula A (origen)</label>
                  <select
                    value={toolAId}
                    onChange={(e) => setToolAId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    {tools.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fileName} · {t.domain}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">Célula B (acoplada)</label>
                  <select
                    value={toolBId}
                    onChange={(e) => setToolBId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    {tools.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fileName} · {t.domain}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">Célula C (opcional)</label>
                  <select
                    value={toolCId}
                    onChange={(e) => setToolCId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    <option value="NONE">— Ninguna (solo A × B) —</option>
                    {tools.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fileName} · {t.domain}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Parámetro radius_km (si orbital)</label>
                  <input
                    type="number"
                    value={recombRadiusKm}
                    onChange={(e) => setRecombRadiusKm(e.target.value)}
                    className="mt-1 w-40 rounded-md border border-slate-200 px-3 py-1.5 font-mono text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Parámetro band_mid (si audio)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={recombBandMid}
                    onChange={(e) => setRecombBandMid(e.target.value)}
                    className="mt-1 w-40 rounded-md border border-slate-200 px-3 py-1.5 font-mono text-xs text-slate-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRunRecombination()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
                >
                  <GitMerge className="h-3.5 w-3.5" />
                  Combinar y Sellar Herramienta Hija
                </button>
              </div>
              {/* Selector rápido de las 33 Disciplinas P33 (Canal 0) */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    Mapeo directo con las 33 Disciplinas P33 (clic para asignar Célula A/B)
                  </span>
                  {selectedDiscBit !== null && (
                    <button
                      type="button"
                      onClick={() => setSelectedDiscBit(null)}
                      className="text-xs font-medium text-blue-700 hover:underline"
                    >
                      Limpiar selección de disciplina
                    </button>
                  )}
                </div>
                <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                  {DISCIPLINES_33.map((disc) => {
                    const active = selectedDiscBit === disc.bitIndex;
                    return (
                      <button
                        key={disc.id}
                        type="button"
                        onClick={() => {
                          setSelectedDiscBit(disc.bitIndex);
                          const matching = tools.filter(
                            (t) =>
                              t.engineId === disc.primaryEngineId ||
                              t.domain === disc.domainMatch,
                          );
                          if (matching.length > 0) {
                            if (matching[0].id !== toolAId) {
                              setToolBId(matching[0].id);
                            } else if (matching[1]) {
                              setToolBId(matching[1].id);
                            }
                          }
                        }}
                        className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium transition-colors ${
                          active
                            ? 'border-blue-600 bg-blue-50 text-blue-800'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="font-mono text-sky-700">{disc.glyph}</span>
                        <span>
                          {disc.index}. {disc.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {recombResult && (
              <div className="border-t border-slate-200 divide-y divide-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-5 py-3">
                  <div className="text-xs font-medium text-slate-800">
                    {recombResult.engineeringSummary}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {recombResult.childTool && (
                      <button
                        type="button"
                        onClick={() => setToolAId(recombResult.childTool!.id)}
                        className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
                      >
                        Usar hija ({recombResult.childTool.fileName}) como Célula A
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={miniGptTraining || !recombResult.success}
                      onClick={() => handleTrainMiniGptFromRecombination(recombResult)}
                      className="inline-flex items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <Brain className="h-3.5 w-3.5" />
                      {miniGptTraining ? 'Entrenando...' : 'Entrenar Mini-GPT (N2)'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleProjectSynthesisToHologram(
                          recombResult.synthesizedHlx,
                          recombResult.childTool?.title ?? 'Recombinación A × B',
                          recombResult.pcc?.certificateSha256,
                          recombResult.holographicCard?.frame.frameSha256,
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-700 whitespace-nowrap shrink-0"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Proyectar en Rostro Holográfico
                    </button>
                  </div>
                </div>

                {miniGptTrainMsg && (
                  <div className="bg-violet-50 px-5 py-2 font-mono text-xs text-violet-800">
                    {miniGptTrainMsg}
                  </div>
                )}

                {/* Certificación PCC + Ficha Holográfica 17B + Disciplinas Canal 0 */}
                <div className="grid gap-4 p-5 lg:grid-cols-2">
                  <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                        <ShieldCheck className="h-4 w-4" />
                        ProofCarryingCertificate (helixPcc.ts)
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-700">
                        {recombResult.pcc?.status ?? 'MISSING'} ·{' '}
                        {recombResult.pccVerified ? 'VERIFICADO' : 'NO VÁLIDO'}
                      </span>
                    </div>
                    {recombResult.pcc && (
                      <div className="space-y-0.5 font-mono text-[11px] text-slate-700">
                        <div className="truncate">
                          Cert SHA-256: {recombResult.pcc.certificateSha256}
                        </div>
                        <div className="truncate">
                          Program SHA-256: {recombResult.pcc.programSha256}
                        </div>
                        <div>
                          Heap máx: {recombResult.pcc.provedSummary.maxHeapBytes}/
                          {recombResult.pcc.provedSummary.heapCapacityBytes} B · Checks descargados:{' '}
                          {recombResult.pcc.provedSummary.dischargedRuntimeChecks}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border border-sky-200 bg-sky-50/50 p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-900">
                        <BookOpen className="h-4 w-4" />
                        Ficha Biblioteca Holográfica (17 Bytes · QPSK-132)
                      </span>
                      <span className="font-mono text-xs font-bold text-sky-800">
                        {recombResult.holographicCard
                          ? `${recombResult.holographicCard.byteLength} B · ${recombResult.holographicCard.z4SymbolCount} Z4`
                          : 'Sin destilación'}
                      </span>
                    </div>
                    {recombResult.holographicCard && (
                      <div className="space-y-1 font-mono text-[11px] text-slate-700">
                        <div className="truncate">
                          Frame SHA-256: {recombResult.holographicCard.frame.frameSha256}
                        </div>
                        <div className="truncate">
                          Máscara 33b (Canal 0): {recombResult.disciplineMaskBits33}
                        </div>
                        <div className="text-slate-800">
                          Disciplinas ({recombResult.disciplines33.length}):{' '}
                          {recombResult.disciplines33
                            .map((d) => `${d.glyph} ${d.name}`)
                            .join(' | ')}
                        </div>
                        {decodedRecombCard && (
                          <div className="text-emerald-700">
                            Decodificación inversa 17B:{' '}
                            {decodedRecombCard.validIntegrity ? 'ÍNTEGRA' : 'ALTERADA'} (
                            {decodedRecombCard.recoveredDisciplines.length} disciplinas recuperadas)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-6 p-5 lg:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Puentes Tipados ({recombResult.bridges.length}) y Métricas por Paso
                    </h3>
                    <div className="space-y-2">
                      {recombResult.bridges.map((b, idx) => (
                        <div
                          key={`${b.fromPort}-${b.toPort}-${idx}`}
                          className="rounded border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800"
                        >
                          {b.fromToolId}.{b.fromPort} → {b.toToolId}.{b.toPort} [{b.transformRule}] ={' '}
                          <span className="font-semibold text-blue-700">
                            {String(b.transferredValue)}
                          </span>
                        </div>
                      ))}
                      {recombResult.stepOutputs.map((out, idx) => (
                        <div
                          key={`${out.engineId}-${idx}`}
                          className="rounded border border-slate-200 px-3 py-2.5 text-xs"
                        >
                          <div className="font-semibold text-slate-900">
                            Paso {idx + 1} · {recombResult.parentTools[idx]?.fileName} [{out.engineId}]
                          </div>
                          <div className="mt-1 text-slate-600">{out.invariantSummary}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Célula Hija Generada · SMT {recombResult.smtReport.status}
                      </h3>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onOpenInVm(recombResult.synthesizedHlx)}
                          className="text-xs font-medium text-blue-700 hover:underline"
                        >
                          Ejecutar en VM
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenIn3DStudio(recombResult.synthesizedHlx)}
                          className="text-xs font-medium text-slate-700 hover:underline"
                        >
                          Estudio 3D
                        </button>
                      </div>
                    </div>
                    <pre className="max-h-72 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
                      {recombResult.synthesizedHlx}
                    </pre>
                  </div>
                </div>

                {/* Exportación Multi-Target Go / GLSL ES 3.00 / JS / HTML5 */}
                {recombMultiTarget && (
                  <div className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Exportación Multi-Target Certificada (Go / GLSL / JS / HTML5)
                        </h3>
                        <p className="font-mono text-[11px] text-slate-500">
                          Manifest SHA-256: {recombMultiTarget.manifestSha256} ·{' '}
                          {recombMultiTarget.totalCellsUsed} células .hlx enlazadas
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(['go', 'glsl', 'js', 'html'] as const).map((tgt) => (
                          <button
                            key={tgt}
                            type="button"
                            onClick={() => setExportTarget(tgt)}
                            className={`rounded border px-2.5 py-1 font-mono text-xs font-medium ${
                              exportTarget === tgt
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {tgt === 'glsl' ? 'GLSL ES 3.00' : tgt.toUpperCase()}
                          </button>
                        ))}
                        {recombMultiTarget.artifacts[exportTarget] && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  `recomb-${exportTarget}`,
                                  recombMultiTarget.artifacts[exportTarget]!.code,
                                )
                              }
                              className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {copiedKey === `recomb-${exportTarget}` ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                              Copiar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const ext =
                                  exportTarget === 'go'
                                    ? 'go'
                                    : exportTarget === 'glsl'
                                      ? 'frag'
                                      : exportTarget === 'js'
                                        ? 'mjs'
                                        : 'html';
                                const baseName = recombResult.childTool?.id ?? 'helix_recomb';
                                downloadFile(
                                  `${baseName}.${ext}`,
                                  recombMultiTarget.artifacts[exportTarget]!.code,
                                );
                              }}
                              className="inline-flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Descargar .{exportTarget}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {recombMultiTarget.artifacts[exportTarget] && (
                      <pre className="max-h-64 overflow-auto rounded-md border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-100">
                        {recombMultiTarget.artifacts[exportTarget]!.code}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 3: DESARMADOR ATÓMICO DE PROGRAMAS */}
      {activeTab === 'decompose' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="rounded-lg border border-slate-200 bg-white lg:col-span-5">
            <div className="border-b border-slate-200 px-5 py-3.5">
              <h2 className="font-display text-sm font-semibold text-slate-900">
                Programa Helix de Entrada (a Desarmar)
              </h2>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDecompSource(DEFAULT_HELIX_CONTRACT_PROGRAM);
                    setDecompLabel('contrato_cuotas.hlx');
                  }}
                  className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Contrato FN/ARRAY
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDecompSource(DEFAULT_HELIX_PHYSICS_PROGRAM);
                    setDecompLabel('fisica_cuantica.hlx');
                  }}
                  className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Física + Bloch
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDecompSource(DEFAULT_HELIX_3D_PROGRAM);
                    setDecompLabel('escena_3d_orm.hlx');
                  }}
                  className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Escena 3D ORM
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Etiqueta del módulo</label>
                <input
                  type="text"
                  value={decompLabel}
                  onChange={(e) => setDecompLabel(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5 font-mono text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Código Helix (.hlx)</label>
                <textarea
                  rows={12}
                  value={decompSource}
                  onChange={(e) => setDecompSource(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={registerExtractedAtoms}
                  onChange={(e) => setRegisterExtractedAtoms(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Registrar automáticamente las células extraídas en el catálogo ADN ({tools.length})
              </label>

              <button
                type="button"
                onClick={handleRunDecomposition}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                <Scissors className="h-3.5 w-3.5" />
                Desarmar en Células Atómicas Reutilizables
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-900">
                  Células Atómicas Extraídas ({decompResult.atoms.length})
                </h2>
                <p className="font-mono text-xs text-slate-500">
                  {decompResult.instructionCount} instrucciones · Variables: {decompResult.extractedVariables.join(', ') || 'ninguna'}
                </p>
              </div>
              <span className="font-mono text-xs font-medium text-emerald-700">
                {decompResult.verifiedSource ? 'ORIGEN VERIFICADO' : 'CON OBSERVACIONES'}
              </span>
            </div>

            <div className="border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-xs text-slate-600">
              {decompResult.diagnostics.join(' · ')}
            </div>

            <div className="divide-y divide-slate-200">
              {decompResult.atoms.map((atom) => (
                <div key={atom.atomId} className="space-y-2 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {atom.atomId}.hlx
                      </span>
                      <span className="font-mono text-xs text-blue-700">
                        {atom.opcode} ({atom.glyphs})
                      </span>
                      <span className="text-xs text-slate-500">
                        Líneas {atom.lineRange[0]}–{atom.lineRange[1]} · Motor {atom.suggestedEngineId}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenInVm(atom.hlxCellScript)}
                      className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
                    >
                      Probar átomo en VM
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-600">
                    In: [{atom.inputs.join(', ') || '∅'}] · Out: [{atom.outputs.join(', ') || '∅'}] · SHA256: {atom.sha256.slice(0, 12)}…
                  </div>
                  <pre className="overflow-x-auto rounded border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs text-slate-800">
                    {atom.hlxCellScript}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: CATÁLOGO VIVO ADN (197+ HERRAMIENTAS) */}
      {activeTab === 'catalog' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="rounded-lg border border-slate-200 bg-white lg:col-span-5">
            <div className="space-y-3 border-b border-slate-200 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Buscar entre las ${tools.length} herramientas .hlx...`}
                  className="w-full rounded-md border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                >
                  <option value="ALL">Todos los dominios ({tools.length})</option>
                  {domainsList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                >
                  <option value="ALL">Todo origen</option>
                  <option value="canonical_opcode">Canónicas ({canonicalCount})</option>
                  <option value="recovered_159">Recuperadas .hlx ({recoveredCount})</option>
                  <option value="autopoietic_child">Hijas / Átomos ({childCount})</option>
                </select>
              </div>
              <div className="font-mono text-xs text-slate-500">
                Mostrando {filteredTools.length} de {tools.length} células registradas
              </div>
            </div>

            <div className="max-h-[600px] divide-y divide-slate-200 overflow-y-auto">
              {filteredTools.map((tool) => {
                const active = selectedTool.id === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleSelectToolInCatalog(tool)}
                    className={`flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors ${
                      active ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-900 truncate">
                        {tool.fileName}
                      </span>
                      <span className="font-mono text-xs text-slate-500 shrink-0">
                        p={tool.prime}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-700 line-clamp-1">
                      {tool.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      {tool.domain} · {originLabel(tool.origin)} · {tool.engineId}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Inspector y Ejecutor del Tool Seleccionado */}
          <section className="rounded-lg border border-slate-200 bg-white lg:col-span-7">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-blue-700">
                    {selectedTool.fileName} · Primo {selectedTool.prime} · {originLabel(selectedTool.origin)}
                  </div>
                  <h2 className="mt-0.5 font-display text-base font-bold text-slate-900">
                    {selectedTool.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">{selectedTool.formulaSummary}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setToolAId(selectedTool.id);
                      setActiveTab('recombine');
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <GitMerge className="h-3.5 w-3.5" />
                    Recombinar
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenInVm(selectedTool.hlxSource)}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    Abrir en VM
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {/* Contrato SMT y SHA-256 */}
              <div className="space-y-1.5 px-5 py-4 font-mono text-xs">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>SHA-256: {selectedTool.sha256}</span>
                </div>
                <div className="text-slate-600">PRE: {selectedTool.smtContract.pre}</div>
                <div className="text-slate-600">POST: {selectedTool.smtContract.post}</div>
              </div>

              {/* Puertos Tipados y Prueba en Vivo */}
              <div className="space-y-4 px-5 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Ejecutor Directo del Motor ({selectedTool.engineId})
                  </h3>
                  <button
                    type="button"
                    onClick={handleRunSelectedTool}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Calcular ecuaciones
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedTool.inputs.map((inp) => (
                    <div key={inp.name}>
                      <label className="block text-xs font-medium text-slate-700">
                        {inp.name} ({inp.type} · {inp.unit})
                      </label>
                      <input
                        type="text"
                        value={
                          toolParamInputs[inp.name] ??
                          (inp.defaultValue !== undefined ? String(inp.defaultValue) : '')
                        }
                        onChange={(e) =>
                          setToolParamInputs((prev) => ({
                            ...prev,
                            [inp.name]: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 font-mono text-xs text-slate-900"
                      />
                    </div>
                  ))}
                </div>

                {toolExecResult && (
                  <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3.5">
                    <div className="text-xs font-semibold text-slate-900">
                      {toolExecResult.invariantSummary}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs sm:grid-cols-3">
                      {Object.entries(toolExecResult.metrics).map(([k, v]) => (
                        <div key={k} className="truncate">
                          <span className="text-slate-500">{k}: </span>
                          <span className="font-semibold text-slate-900">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                    {toolExecResult.artifactSnippet && (
                      <pre className="mt-2 max-h-36 overflow-auto rounded border border-slate-200 bg-white p-2 font-mono text-xs text-slate-800">
                        {toolExecResult.artifactSnippet}
                      </pre>
                    )}
                  </div>
                )}
              </div>

              {/* Código .hlx Verbatim */}
              <div className="space-y-2 px-5 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Código Fuente Celular (.hlx)
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleCopy('cat-hlx', selectedTool.hlxSource)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    {copiedKey === 'cat-hlx' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedKey === 'cat-hlx' ? 'Copiado' : 'Copiar fuente'}
                  </button>
                </div>
                <pre className="max-h-56 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
                  {selectedTool.hlxSource}
                </pre>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 5: 33 DISCIPLINAS P33 Y BIBLIOTECA CIENTÍFICA HOLOGRÁFICA DE 17 BYTES */}
      {activeTab === 'library17b' && (
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-900">
                  Las 33 Disciplinas Académicas P33 (Canal 0 · Primos 2..137 · Cubo Z4)
                </h2>
                <p className="text-xs text-slate-600">
                  Biyección exacta entre cada runa/primo y su disciplina académica para destilar fichas QPSK-132 de 17 bytes.
                </p>
              </div>
              {libraryDiscFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setLibraryDiscFilter('ALL')}
                  className="rounded border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Mostrar todas las disciplinas
                </button>
              )}
            </div>
            <div className="grid gap-2.5 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {DISCIPLINES_33.map((disc) => {
                const selected = libraryDiscFilter === disc.bitIndex;
                return (
                  <button
                    key={disc.id}
                    type="button"
                    onClick={() =>
                      setLibraryDiscFilter(selected ? 'ALL' : disc.bitIndex)
                    }
                    className={`rounded-md border p-3 text-left transition-colors ${
                      selected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-mono text-xs">
                      <span className="font-bold text-sky-700">
                        {disc.glyph} · Bit {disc.bitIndex} · p={disc.prime}
                      </span>
                      <span className="text-slate-500">{disc.frequencyHz.toFixed(1)} Hz</span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-900">
                      {disc.name}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {disc.faculty} · Motor: {disc.primaryEngineId}
                    </div>
                    <div className="mt-1 truncate font-mono text-[11px] text-slate-500">
                      {disc.canonicalEquation}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-900">
                  Biblioteca Científica Holográfica de 17 Bytes ({filteredHolographicCards.length} fichas ·{' '}
                  {filteredHolographicCards.length * 17} Bytes totales)
                </h2>
                <p className="text-xs text-slate-600">
                  Cada ficha comprime 4 canales × 33 bits (66 símbolos Z4 = 17 B) con proyección Pauli-SoA 28 B/celda y firma PCC.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={libraryQuery}
                  onChange={(e) => setLibraryQuery(e.target.value)}
                  placeholder="Filtrar fichas 17B..."
                  className="w-full rounded-md border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {filteredHolographicCards.map((card) => {
                const decoded = decodeAcademicCard17B(card);
                return (
                  <div key={card.id} className="space-y-2 px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                          <span className="font-bold text-slate-900">
                            {card.byteLength} B / {card.z4SymbolCount} Z4
                          </span>
                          <span className="text-sky-700">
                            SHA: {card.frame.frameSha256.slice(0, 14)}…
                          </span>
                          <span className="text-emerald-700">
                            {decoded.validIntegrity ? 'ROUND-TRIP OK' : 'ERROR'}
                          </span>
                          <span className="text-slate-500">
                            {card.sourceKind === 'autopoietic_recombination'
                              ? 'Síntesis A × B'
                              : 'Canónica P33'}
                          </span>
                        </div>
                        <h3 className="mt-1 text-sm font-semibold text-slate-900">
                          {card.title}
                        </h3>
                        <p className="text-xs text-slate-600">{card.summary}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleProjectSynthesisToHologram(
                              card.hlxScript,
                              card.title,
                              card.pccCertificateSha256,
                              card.frame.frameSha256,
                            )
                          }
                          className="inline-flex items-center gap-1 rounded bg-sky-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-700 whitespace-nowrap"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Proyectar
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenInVm(card.hlxScript)}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                        >
                          <Code2 className="h-3.5 w-3.5" />
                          VM
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-1 font-mono text-[11px] text-slate-600 sm:grid-cols-2">
                      <div className="truncate">Canal 0 (33b): {card.primeMaskBits33}</div>
                      <div className="truncate">
                        PCC: {card.pccCertificateSha256.slice(0, 20)}… · SoA 28B:{' '}
                        {card.soaDigestSha256.slice(0, 12)}…
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
