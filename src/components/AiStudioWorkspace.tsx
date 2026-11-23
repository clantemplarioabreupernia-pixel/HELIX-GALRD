import { buildHumanConversationReply } from '../core/helixConversationalBrain';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Download,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import {
  createHelixCoreEngine,
  EngineeringReport,
} from '../core';
import { DEFAULT_HELIX_PHYSICS_PROGRAM } from '../utils/helixVm';
import {
  LiquidBiopixelCanvas,
  LiquidMorphShape,
  MORPH_SHAPE_LABELS,
} from './LiquidBiopixelCanvas';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  shapeFormed: LiquidMorphShape;
  report?: EngineeringReport;
  answersUsed?: Record<string, string>;
  confirmed?: boolean;
  userInputsSummary?: { label: string; value: string }[];
}

interface DataInputDraft {
  altitudeKm: string;
  velocityMs: string;
  freqHz: string;
  gravityMs2: string;
  massKg: string;
}

const EMPTY_DATA_DRAFT: DataInputDraft = {
  altitudeKm: '',
  velocityMs: '',
  freqHz: '',
  gravityMs2: '',
  massKg: '',
};

const STARTER_PROMPTS = [
  'Quiero crear un videojuego espacial con naves',
  'Simula una órbita a 850 km con enlace satelital y radar Doppler',
  'Videoclip con voz reactiva y fluido luminoso',
  'Combina ondas acústicas a 528 Hz con física cuántica y óptica',
  'Esculpe montañas fractales con gravedad lunar 1.62 m/s²',
  'Calcula un balance financiero exacto de 1500 dólares',
];

function inferShapeAndAccent(
  text: string,
  report?: EngineeringReport,
  answers: Record<string, string> = {},
): { shape: LiquidMorphShape; accentHex: string } {
  const combined = `${text} ${Object.values(answers).join(' ')}`.toLowerCase();

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
    combined.includes('nasa') ||
    report?.detectedCategory === 'SIMULACION_ESPACIAL' ||
    report?.detectedCategory === 'VIDEOJUEGO'
  ) {
    return { shape: 'orbital_ship', accentHex: '#38bdf8' };
  }
  if (
    combined.includes('clip') ||
    combined.includes('música') ||
    combined.includes('musica') ||
    combined.includes('voz') ||
    combined.includes('onda') ||
    combined.includes('líquido') ||
    combined.includes('liquido') ||
    combined.includes('hz') ||
    report?.detectedCategory === 'CINEMA_VIDEOCLIP'
  ) {
    return { shape: 'cymatic_wave', accentHex: '#0ea5e9' };
  }
  return { shape: 'torus', accentHex: '#38bdf8' };
}

function downloadHtmlArtifact(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function composeConsoleReply(
  report: EngineeringReport,
  shape: LiquidMorphShape,
  confirmed: boolean,
): string {
  const shapeName = MORPH_SHAPE_LABELS[shape];
  const domainCount = report.activatedEngines.length;
  const coupledCount = report.crossBridges.length;

  if (report.detectedPersona === 'KID_CREATIVE') {
    if (!confirmed && report.clarificationNeeded) {
      return `¡Listo para jugar! Ya proyecté una forma "${shapeName}" en la pantalla líquida acoplando ${domainCount} leyes físicas internas. Elige abajo cómo quieres tu mundo para terminarlo:`;
    }
    return `¡Creación lista y en movimiento! La pantalla líquida tomó forma de "${shapeName}" combinando ${domainCount} motores de física y sonido sin que tengas que escribir nada de código.`;
  }

  if (report.detectedPersona === 'CREATOR_MEDIA') {
    if (!confirmed && report.clarificationNeeded) {
      return `He enlazado ${domainCount} motores audiovisuales y físicos hacia la figura "${shapeName}" en la pantalla líquida. Ajusta abajo tus preferencias para fijar la escena final:`;
    }
    return `Escena generada y verificada en forma de "${shapeName}" con ${coupledCount} acoplamientos internos entre audio, movimiento y materia fluida.`;
  }

  const recombClause =
    coupledCount > 0
      ? ` y acoplé automáticamente ${coupledCount} variables cruzadas entre ecuaciones`
      : '';

  if (!confirmed && report.clarificationNeeded) {
    return `Procesé tu petición sobre ${domainCount} dominios matemáticos reales${recombClause}, formando "${shapeName}" en la pantalla líquida. Confirma los parámetros abajo para cerrar la salida:`;
  }

  return `Cálculo completado e integrado automáticamente en ${domainCount} dominios${recombClause}. La pantalla líquida proyecta "${shapeName}" con coherencia física verificada.`;
}

function parseExplicitDataDraft(draft: DataInputDraft): {
  params: Record<string, number | string>;
  summary: { label: string; value: string }[];
} {
  const params: Record<string, number | string> = {};
  const summary: { label: string; value: string }[] = [];

  const alt = Number(draft.altitudeKm);
  if (draft.altitudeKm.trim() && Number.isFinite(alt) && alt > 0) {
    params.radius_km = 6371 + alt;
    summary.push({ label: 'Altitud', value: `${alt} km` });
  }

  const vel = Number(draft.velocityMs);
  if (draft.velocityMs.trim() && Number.isFinite(vel) && vel > 0) {
    params.velocity_ms = vel;
    params.target_vel_ms = vel;
    summary.push({ label: 'Velocidad', value: `${vel} m/s` });
  }

  const freq = Number(draft.freqHz);
  if (draft.freqHz.trim() && Number.isFinite(freq) && freq >= 20) {
    params.freq_hz = freq;
    summary.push({ label: 'Frecuencia', value: `${freq} Hz` });
  }

  const grav = Number(draft.gravityMs2);
  if (draft.gravityMs2.trim() && Number.isFinite(grav) && grav > 0) {
    params.gravity_ms2 = grav;
    summary.push({ label: 'Gravedad', value: `${grav} m/s²` });
  }

  const mass = Number(draft.massKg);
  if (draft.massKg.trim() && Number.isFinite(mass) && mass > 0) {
    params.mass_kg = mass;
    summary.push({ label: 'Masa', value: `${mass} kg` });
  }

  return { params, summary };
}

export function AiStudioWorkspace() {
  const [engine] = useState(() => createHelixCoreEngine());

  const [inputText, setInputText] = useState('');
  const [showDataPanel, setShowDataPanel] = useState(false);
const [rightTab, setRightTab] = useState<'liquid' | 'app'>('liquid');
const [listening, setListening] = useState(false);
  const [dataDraft, setDataDraft] = useState<DataInputDraft>(EMPTY_DATA_DRAFT);

  // Estado acoplado directamente a la Pantalla Líquida de Biopíxeles
  const [currentScript, setCurrentScript] = useState<string>(DEFAULT_HELIX_PHYSICS_PROGRAM);
  const [currentShape, setCurrentShape] = useState<LiquidMorphShape>('torus');
  const [accentHex, setAccentHex] = useState<string>('#38bdf8');
  const [pulseCounter, setPulseCounter] = useState<number>(1);
  const [screenTitle, setScreenTitle] = useState<string>('Pantalla Líquida Helix');
  const [screenSubtitle, setScreenSubtitle] = useState<string>('Lista para formar y calcular desde tu petición');

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const welcomeReport = engine.analyzeIntent(
      'Equilibrio fluido toroidal con dispersión luminosa',
      {},
      'ENGINEER_SCIENTIST',
      {},
      false,
    );
    return [
      {
        id: 'welcome-1',
        role: 'assistant',
        text: 'Hola. Soy Helix. Pídeme lo que quieras construir o simular —desde un videojuego hasta una trayectoria espacial o un cruce entre ciencias— sin escribir nada de código. Yo selecciono y combino internamente las ecuaciones necesarias, recibo tus datos de entrada, calculo las salidas verificadas y doy forma viva a tu creación en la pantalla líquida.',
        shapeFormed: 'torus',
        report: welcomeReport,
        confirmed: true,
      },
    ];
  });

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const driveLiquidScreen = (
    hlx: string,
    shape: LiquidMorphShape,
    hex: string,
    title: string,
    subtitle: string,
  ) => {
    setCurrentScript(hlx || DEFAULT_HELIX_PHYSICS_PROGRAM);
    setCurrentShape(shape);
    setAccentHex(hex);
    setScreenTitle(title);
    setScreenSubtitle(subtitle);
    setPulseCounter((c) => c + 1);
  };

  const handleSendInstruction = (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim();
    if (!text) return;
    if (!overrideText) setInputText('');

    const { params: explicitParams, summary: userInputsSummary } = parseExplicitDataDraft(dataDraft);

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      text,
      shapeFormed: currentShape,
      userInputsSummary: userInputsSummary.length > 0 ? userInputsSummary : undefined,
    };

    // Todo sucede automáticamente por petición: introspección, combinación autónoma, verificación y síntesis
    const report = engine.analyzeIntent(text, {}, 'AUTO', explicitParams, true);
    const { shape, accentHex: nextHex } = inferShapeAndAccent(text, report);
    const hlxToRun = report.recombination?.synthesizedHlx || DEFAULT_HELIX_PHYSICS_PROGRAM;

    const firstOutput = report.dataOutputs[0]
      ? `${report.dataOutputs[0].label}: ${report.dataOutputs[0].value}`
      : text.slice(0, 64);

    driveLiquidScreen(
      hlxToRun,
      shape,
      nextHex,
      MORPH_SHAPE_LABELS[shape],
      firstOutput,
    );

    const assistantMsg: ChatMessage = {
      id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'assistant',
      text: buildHumanConversationReply(text, MORPH_SHAPE_LABELS[shape], report.activatedEngines.length, /crea|simul|calcul|juego|video|monta|orbit|onda|fluid|esculp|balance|salud|mar/i.test(text)),
      shapeFormed: shape,
      report,
      answersUsed: {},
      confirmed: !report.clarificationNeeded,
    };


    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    void fetch('/api/ollama/distill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: text }) }).then((r) => r.ok ? r.json() : null).then((d) => { if (d?.ok && d?.capsule?.hlxScript) { driveLiquidScreen(String(d.capsule.hlxScript), shape, '#38bdf8', String(d.capsule.sceneTitle || 'Cápsula Destilada L2'), 'Certificado SMT · Ollama -> Mini-GPT'); } }).catch(() => {});
  };

  const handleSelectClarificationOption = (
    msgId: string,
    questionId: string,
    optionValue: string,
  ) => {
    const { params: explicitParams } = parseExplicitDataDraft(dataDraft);

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.report) return m;
        const nextAnswers = { ...(m.answersUsed ?? {}), [questionId]: optionValue };
        const updatedReport = engine.analyzeIntent(
          m.report.intent,
          nextAnswers,
          m.report.detectedPersona,
          explicitParams,
          true,
        );
        const { shape, accentHex: nextHex } = inferShapeAndAccent(
          m.report.intent,
          updatedReport,
          nextAnswers,
        );
        const hlx = updatedReport.recombination?.synthesizedHlx || DEFAULT_HELIX_PHYSICS_PROGRAM;

        driveLiquidScreen(
          hlx,
          shape,
          nextHex,
          MORPH_SHAPE_LABELS[shape],
          optionValue,
        );

        const allAnswered = !updatedReport.clarificationNeeded;
        return {
          ...m,
          answersUsed: nextAnswers,
          report: updatedReport,
          shapeFormed: shape,
          confirmed: allAnswered,
          text: composeConsoleReply(updatedReport, shape, allAnswered),
        };
      }),
    );
  };

  const handleConfirmAllDefaults = (msgId: string) => {
    const { params: explicitParams } = parseExplicitDataDraft(dataDraft);

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.report) return m;
        const filled: Record<string, string> = { ...(m.answersUsed ?? {}) };
        for (const q of m.report.questions) {
          if (!filled[q.id]) filled[q.id] = q.defaultOption;
        }
        const updatedReport = engine.analyzeIntent(
          m.report.intent,
          filled,
          m.report.detectedPersona,
          explicitParams,
          true,
        );
        const { shape, accentHex: nextHex } = inferShapeAndAccent(
          m.report.intent,
          updatedReport,
          filled,
        );
        const summaryOut = updatedReport.dataOutputs[0]
          ? `${updatedReport.dataOutputs[0].label}: ${updatedReport.dataOutputs[0].value}`
          : 'Configuración fijada';

        driveLiquidScreen(
          updatedReport.recombination?.synthesizedHlx || DEFAULT_HELIX_PHYSICS_PROGRAM,
          shape,
          nextHex,
          MORPH_SHAPE_LABELS[shape],
          summaryOut,
        );
        return {
          ...m,
          answersUsed: filled,
          report: updatedReport,
          shapeFormed: shape,
          confirmed: true,
          text: composeConsoleReply(updatedReport, shape, true),
        };
      }),
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendInstruction();
    }
  };

  const handleResetSession = () => {
    setMessages((prev) => prev.slice(0, 1));
    setDataDraft(EMPTY_DATA_DRAFT);
    driveLiquidScreen(
      DEFAULT_HELIX_PHYSICS_PROGRAM,
      'torus',
      '#38bdf8',
      'Pantalla Líquida Helix',
      'Sesión reiniciada · lista para tu petición',
    );
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
      {/* Barra superior limpia estilo AI Studio */}
      <header className="flex h-[52px] shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
            <Cpu className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="font-display text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap">
              Helix Studio
            </span>
            <span className="ml-2.5 hidden text-xs text-slate-500 sm:inline">
              Consola sin código · Entradas y Salidas en Pantalla Líquida
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetSession}
          title="Reiniciar conversación y pantalla líquida"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Nueva sesión
        </button>
      </header>

      {/* Espacio dual AI Studio: Consola Chat (Entradas/Salidas) a la izquierda · Pantalla Líquida a la derecha */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* COLUMNA IZQUIERDA: CONSOLA CHAT */}
        <section className="flex h-[52%] min-h-0 w-full flex-col border-b border-slate-200 bg-white lg:h-full lg:w-[44%] lg:border-b-0 lg:border-r">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[95%] rounded-lg px-4 py-3 text-sm ${
                      isUser
                        ? 'bg-slate-900 text-white'
                        : 'w-full border border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  >
                    <p className="leading-relaxed">{msg.text}</p>

                    {/* Entradas numéricas enviadas por el usuario */}
                    {isUser && msg.userInputsSummary && msg.userInputsSummary.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-700 pt-2 text-xs text-sky-200">
                        {msg.userInputsSummary.map((inp) => (
                          <span key={inp.label} className="font-mono">
                            {inp.label}: {inp.value}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Preguntas de entrevista adaptativa dentro de la consola */}
                    {!isUser && msg.report && msg.report.questions.length > 0 && (
                      <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                        {msg.report.questions.map((q) => {
                          const chosen = msg.answersUsed?.[q.id];
                          return (
                            <div key={q.id} className="space-y-1.5">
                              <div className="text-xs font-semibold text-slate-800">
                                {q.question}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {q.options.map((opt) => {
                                  const active = chosen === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() =>
                                        handleSelectClarificationOption(msg.id, q.id, opt)
                                      }
                                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                                        active
                                          ? 'border-blue-600 bg-blue-50 text-blue-800'
                                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
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

                        {!msg.confirmed && (
                          <button
                            type="button"
                            onClick={() => handleConfirmAllDefaults(msg.id)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Confirmar y fijar salida en pantalla
                          </button>
                        )}
                      </div>
                    )}

                    {/* Entradas procesadas y Salidas de datos limpias (cero herramientas/cero código) */}
                    {!isUser && msg.report && /crea|simul|calcul|juego|video|monta|orbit|onda|fluid|esculp|balance|salud|mar|genera|haz/i.test(msg.report.intent) && (
                      <div className="mt-3 space-y-2.5 border-t border-slate-200 pt-3">
  {rightTab === 'app' ? (
    <iframe title="App Generada" srcDoc={[...messages].reverse().find((m) => m.report?.materializedHtmlPreview)?.report?.materializedHtmlPreview || ''} className="w-full flex-1 border-0 bg-slate-950" />
  ) : (
    <div className="relative flex-1">
      <LiquidBiopixelCanvas
            hlxScript={currentScript}
            shape={currentShape}
            pulseCounter={pulseCounter}
            titleLabel={screenTitle}
            subtitleLabel={screenSubtitle}
            accentHex={accentHex} /></div>)}</div>
        </section>
      </div>
    </div>
  );
}

