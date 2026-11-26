import { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  Box,
  Check,
  CheckCircle2,
  Copy,
  Layers,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Undo2,
  Volume2,
} from 'lucide-react';
import {
  CubeFacesZ4,
  GrammaticalRole,
  HELIX_OPERATORS,
  OsSubsystem,
  PrimitiveToken,
  PRIMITIVE_TOKENS,
  RUNES_WITH_CUBE_FACES,
} from '../data/runes';
import { CompoundWord } from '../data/vocabulary';
import { playFrequencySequence, playTone } from '../utils/audio';
import { computePrimeProductForTokens, validateHelixProgram33Tokens } from '../utils/godel';
import { HelixCell } from '../utils/helixCells';
import { formatBigIntGrouped, parseHelixPhrase } from '../utils/helixEngine';
import { PrimeColorSwatch } from './PrimeColorSwatch';

interface LabStartGuideViewProps {
  vocabulary: CompoundWord[];
  cells: HelixCell[];
  onOpenInVm: (script: string) => void;
  onOpenIn3DStudio?: (script: string) => void;
}

type GuideStage = 'tokens' | 'composer';

interface StarterSequencePreset {
  id: string;
  label: string;
  summary: string;
  script: string;
}

const STARTER_PRESETS: StarterSequencePreset[] = [
  {
    id: 'boot-minimal',
    label: '1 · Arranque mínimo',
    summary: 'Dos tokens base: jerarquía raíz (41) + inicialización (3) = 123.',
    script: 'ᛇᚢ',
  },
  {
    id: 'secure-cycle',
    label: '2 · Secuencia de núcleo segura',
    summary: 'Programa .hlx completo de 3 líneas: arranque, guarda de identidad y salida nominal.',
    script: 'ᛇᚢ\nᛗᚦ cell_verify\nᚳᛏ',
  },
  {
    id: 'operator-composition',
    label: '3 · Composición con operador',
    summary: 'El operador ⊕ multiplexa recurso y asignación manteniendo pureza en primos base.',
    script: 'ᚠ⊕ᚷ\nᚱᚳ\nᚳᛏ',
  },
  {
    id: 'foreign-rejection',
    label: '4 · Prueba de rechazo (token ajeno)',
    summary: 'Demuestra cómo el Teorema Fundamental de la Aritmética bloquea símbolos fuera de los 33 primos.',
    script: 'ᛇᚢ\nTOKEN_AJENO\nᚳᛏ',
  },
];

const ROLES: ('Todos' | GrammaticalRole)[] = [
  'Todos',
  'Entidad',
  'Operación',
  'Modificador',
];

const SUBSYSTEMS: ('Todos' | OsSubsystem)[] = [
  'Todos',
  'Kernel',
  'Memoria',
  'Procesos',
  'Seguridad',
  'Entrada/Salida',
  'Planificador',
];

const CUBE_FACE_LABELS: { key: keyof CubeFacesZ4; label: string; desc: string }[] = [
  { key: 'cara0_accion', label: 'Cara 0 · Acción', desc: 'Hebra física p mod 4' },
  { key: 'cara1_espalda', label: 'Cara 1 · Dual', desc: 'Inverso modular (4 − c₀) mod 4' },
  { key: 'cara2_disciplina', label: 'Cara 2 · P33', desc: 'Proyección índice mod 4' },
  { key: 'cara3_faseZ4', label: 'Cara 3 · Fase Z₄', desc: 'Paridad XOR (p ⊕ idx) & 3' },
  { key: 'caraInternaA_invariante', label: 'Interna A · Homeostasis', desc: 'Invariante (c₀ + c₁ + c₂) mod 4' },
  { key: 'caraInternaB_semillaAcustica', label: 'Interna B · Coclear', desc: 'Semilla armónica (3p + idx) & 3' },
];

export function LabStartGuideView({
  vocabulary,
  cells,
  onOpenInVm,
  onOpenIn3DStudio,
}: LabStartGuideViewProps) {
  const [stage, setStage] = useState<GuideStage>('tokens');
  const [roleFilter, setRoleFilter] = useState<'Todos' | GrammaticalRole>('Todos');
  const [subsystemFilter, setSubsystemFilter] = useState<'Todos' | OsSubsystem>('Todos');
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number>(1);
  const [sequenceText, setSequenceText] = useState<string>(STARTER_PRESETS[1].script);
  const [copiedScript, setCopiedScript] = useState(false);

  const enrichedTokens = useMemo(() => RUNES_WITH_CUBE_FACES(), []);

  const filteredTokens = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedTokens.filter((tok) => {
      if (roleFilter !== 'Todos' && tok.role !== roleFilter) return false;
      if (subsystemFilter !== 'Todos' && tok.subsystem !== subsystemFilter) return false;
      if (!q) return true;
      return (
        tok.glyph.includes(q) ||
        tok.name.toLowerCase().includes(q) ||
        tok.osTag.toLowerCase().includes(q) ||
        tok.meaning.toLowerCase().includes(q) ||
        String(tok.prime) === q
      );
    });
  }, [enrichedTokens, roleFilter, subsystemFilter, search]);

  const activeToken = useMemo(
    () => enrichedTokens.find((t) => t.index === selectedIndex) ?? enrichedTokens[0],
    [enrichedTokens, selectedIndex],
  );

  const sequenceComputation = useMemo(
    () =>
      computePrimeProductForTokens(sequenceText, {
        vocabulary,
        cells,
      }),
    [sequenceText, vocabulary, cells],
  );

  const programValidation = useMemo(
    () =>
      validateHelixProgram33Tokens(sequenceText, {
        vocabulary,
        cells,
      }),
    [sequenceText, vocabulary, cells],
  );

  const resolvedTokenList = useMemo(() => {
    const parsed = parseHelixPhrase(sequenceComputation.resolvedGlyphs, vocabulary);
    return parsed.runes;
  }, [sequenceComputation.resolvedGlyphs, vocabulary]);

  const invertedOrderComparison = useMemo(() => {
    if (resolvedTokenList.length < 2) return null;
    const reversedGlyphs = [...resolvedTokenList]
      .reverse()
      .map((r) => r.glyph)
      .join('');
    const revResult = computePrimeProductForTokens(reversedGlyphs, { vocabulary, cells });
    return {
      reversedGlyphs,
      sameProduct: revResult.product === sequenceComputation.product,
      reversedSignature: revResult.positionalSignature,
      differsInOrder: revResult.positionalSignature !== sequenceComputation.positionalSignature,
    };
  }, [resolvedTokenList, sequenceComputation, vocabulary, cells]);

  const appendTokenToSequence = (token: PrimitiveToken, switchToComposer = false) => {
    setSequenceText((prev) => {
      const trimmed = prev.trimEnd();
      if (!trimmed) return token.glyph;
      const lines = trimmed.split(/\r?\n/);
      const lastLine = lines[lines.length - 1];
      if (!lastLine.trim() || lastLine.trim().startsWith('#')) {
        return `${trimmed}\n${token.glyph}`;
      }
      if (lastLine.includes(' ')) {
        return `${trimmed}\n${token.glyph}`;
      }
      lines[lines.length - 1] = `${lastLine}${token.glyph}`;
      return lines.join('\n');
    });
    if (switchToComposer) {
      setStage('composer');
    }
  };

  const appendOperatorToSequence = (symbol: string) => {
    setSequenceText((prev) => {
      const trimmed = prev.trimEnd();
      if (!trimmed) return symbol;
      const lines = trimmed.split(/\r?\n/);
      const lastLine = lines[lines.length - 1];
      if (lastLine.includes(' ')) {
        return `${trimmed}${symbol}`;
      }
      lines[lines.length - 1] = `${lastLine}${symbol}`;
      return lines.join('\n');
    });
  };

  const appendCompoundWordToSequence = (word: CompoundWord) => {
    setSequenceText((prev) => {
      const trimmed = prev.trimEnd();
      const line = `${word.glyphs} ${word.opcode.toLowerCase()}`;
      return trimmed ? `${trimmed}\n${line}` : line;
    });
  };

  const undoLastCharacter = () => {
    setSequenceText((prev) => {
      const chars = Array.from(prev);
      if (chars.length === 0) return '';
      chars.pop();
      return chars.join('').replace(/\n+$/, '');
    });
  };

  const removeResolvedRuneAt = (targetIndex: number) => {
    const kept = resolvedTokenList
      .filter((_, idx) => idx !== targetIndex)
      .map((r) => r.glyph)
      .join('');
    setSequenceText(kept);
  };

  const handlePlaySequenceAudio = () => {
    if (resolvedTokenList.length === 0) return;
    playFrequencySequence(
      resolvedTokenList.slice(0, 16).map((t) => t.frequencyHz),
      0.19,
    );
  };

  const handleCopySequence = async () => {
    try {
      await navigator.clipboard.writeText(sequenceText);
      setCopiedScript(true);
      window.setTimeout(() => setCopiedScript(false), 1600);
    } catch {
      // Ignore clipboard failures in restricted frames
    }
  };

  const quickCompoundWords = useMemo(() => vocabulary.slice(0, 6), [vocabulary]);

  return (
    <div className="space-y-8">
      {/* Encabezado pedagógico y navegación de etapas */}
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-sky-700">
            Guía de Inicio · Alfabeto Cerrado P33 y Aritmética de Gödel
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl text-balance">
            Los 33 tokens base y tu primera secuencia de Gödel
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            Explora cómo cada símbolo primitivo representa un número primo único (2 a 137), un
            tono armónico y un cubo Z₄ de 6 caras, y aprende a multiplicarlos en secuencias
            verificables antes de ejecutarlas en la VM determinista.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setStage('tokens')}
            className={`inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              stage === 'tokens'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>1. Explorador de 33 Tokens</span>
          </button>
          <button
            type="button"
            onClick={() => setStage('composer')}
            className={`inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              stage === 'composer'
                ? 'border-sky-700 bg-sky-700 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>2. Compositor de Gödel</span>
          </button>
        </div>
      </div>

      {/* ETAPA 1: EXPLORADOR INTERACTIVO DE LOS 33 TOKENS BASE */}
      {stage === 'tokens' && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Zona Izquierda (65%): Filtros y Matriz Interactiva de 33 Tokens */}
          <div className="space-y-4 lg:col-span-7">
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Matriz interactiva de tokens base ({filteredTokens.length} / 33)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Haz clic en un token para inspeccionar su primo, frecuencia y caras Z₄.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Glifo, nombre o primo (ej. 41)..."
                    className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Filtros por Rol Gramatical y Subsistema */}
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[11px] font-medium text-slate-500">Rol:</span>
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRoleFilter(r)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        roleFilter === r
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[11px] font-medium text-slate-500">Subsistema:</span>
                  {SUBSYSTEMS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSubsystemFilter(s)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        subsystemFilter === s
                          ? 'bg-sky-700 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rejilla de tokens */}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                {filteredTokens.map((tok) => {
                  const isSelected = tok.index === activeToken.index;
                  return (
                    <button
                      key={tok.index}
                      type="button"
                      onClick={() => setSelectedIndex(tok.index)}
                      className={`group flex flex-col justify-between rounded-md border p-2.5 text-left transition-all ${
                        isSelected
                          ? 'border-sky-600 bg-sky-50 ring-1 ring-sky-600'
                          : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                          #{tok.index}
                        </span>
                        <PrimeColorSwatch hex={tok.colorHex} size={11} />
                      </div>
                      <div className="my-1.5 flex items-baseline justify-between gap-1">
                        <span className="text-xl font-semibold text-slate-900">{tok.glyph}</span>
                        <span className="font-mono text-[11px] font-semibold text-slate-700">
                          {tok.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 tabular-nums">
                        <span>p={tok.prime}</span>
                        <span>{Math.round(tok.frequencyHz)}Hz</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredTokens.length === 0 && (
                <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
                  Ningún token coincide con los filtros actuales.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setRoleFilter('Todos');
                      setSubsystemFilter('Todos');
                      setSearch('');
                    }}
                    className="font-medium text-sky-700 underline"
                  >
                    Restablecer filtros
                  </button>
                </div>
              )}
            </div>

            {/* Bloque conciso sobre los 4 Operadores de Composición */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  4 Operadores de enlace sintáctico
                </h3>
                <span className="text-xs text-slate-500">
                  Conectan tokens sin consumir primos
                </span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {HELIX_OPERATORS.map((op) => (
                  <div
                    key={op.symbol}
                    className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white font-mono text-base font-bold text-slate-900">
                      {op.symbol}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900">
                        {op.name} · {op.osMeaning}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
                        {op.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Zona Derecha (35%): Inspector del Token Seleccionado + Cubo Z4 */}
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-5">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-3xl font-semibold text-slate-900">
                    {activeToken.glyph}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">
                        {activeToken.name}
                      </h2>
                      <span className="font-mono text-xs text-slate-500 tabular-nums">
                        #{activeToken.index} · {activeToken.phoneme}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-sky-700">
                      {activeToken.role} · {activeToken.subsystem} · {activeToken.osTag}
                    </p>
                  </div>
                </div>
                <PrimeColorSwatch hex={activeToken.colorHex} size={22} />
              </div>

              <p className="text-sm leading-relaxed text-slate-700">{activeToken.meaning}</p>

              {/* Métricas físicas y matemáticas exactas */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                  <p className="text-[11px] text-slate-500">Primo de Gödel</p>
                  <p className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
                    {activeToken.prime}
                  </p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                  <p className="text-[11px] text-slate-500">Frecuencia</p>
                  <p className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
                    {activeToken.frequencyHz.toFixed(2)} Hz
                  </p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                  <p className="text-[11px] text-slate-500">Ángulo H(p)</p>
                  <p className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
                    {activeToken.hueDeg.toFixed(1)}°
                  </p>
                </div>
              </div>

              {/* Cubo Z4 de 6 caras */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-900">
                    Geometría interna: Cubo Z₄ de 6 caras
                  </h3>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                    estado ∈ {'{0,1,2,3}'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CUBE_FACE_LABELS.map((face) => {
                    const val = activeToken.cubeFaces[face.key];
                    return (
                      <div
                        key={face.key}
                        className="rounded-md border border-slate-200 bg-slate-50 p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-slate-800">
                            {face.label}
                          </span>
                          <span className="font-mono text-xs font-bold text-sky-700 tabular-nums">
                            {val}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-500">{face.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Acciones directas */}
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => playTone(activeToken.frequencyHz, 0.35)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  <Volume2 className="h-3.5 w-3.5 text-sky-700" />
                  <span>Escuchar {activeToken.frequencyHz.toFixed(1)} Hz</span>
                </button>
                <button
                  type="button"
                  onClick={() => appendTokenToSequence(activeToken, true)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Añadir {activeToken.glyph} al Compositor</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ETAPA 2: COMPOSITOR INTERACTIVO DE LA PRIMERA SECUENCIA DE GÖDEL */}
      {stage === 'composer' && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Zona Izquierda (60%): Constructor visual + Editor .hlx */}
          <div className="space-y-4 lg:col-span-7">
            {/* Presets guiados paso a paso */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Lecciones guiadas de composición
                  </h2>
                  <p className="text-xs text-slate-500">
                    Carga una plantilla progresiva o arma tu propia cadena multiplicativa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStage('tokens')}
                  className="text-xs font-medium text-sky-700 hover:underline whitespace-nowrap shrink-0"
                >
                  Ver tabla completa de 33 tokens
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {STARTER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSequenceText(preset.script)}
                    className={`rounded-md border p-3 text-left transition-colors ${
                      sequenceText.trim() === preset.script.trim()
                        ? 'border-sky-600 bg-sky-50'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-900">{preset.label}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
                      {preset.summary}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Paleta rápida de 33 tokens + operadores + palabras compuestas */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900">
                  Paleta rápida: haz clic para concatenar tokens a tu secuencia
                </h3>
                <span className="font-mono text-[11px] text-slate-500">
                  33 primos + 4 operadores
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PRIMITIVE_TOKENS.map((tok) => (
                  <button
                    key={tok.index}
                    type="button"
                    title={`${tok.name} (p=${tok.prime}) · ${tok.meaning}`}
                    onClick={() => appendTokenToSequence(tok, false)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs hover:border-sky-500 hover:bg-sky-50 transition-colors shrink-0"
                  >
                    <span className="font-semibold text-slate-900">{tok.glyph}</span>
                    <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                      {tok.prime}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
                <span className="text-[11px] font-medium text-slate-500">Operadores:</span>
                {HELIX_OPERATORS.map((op) => (
                  <button
                    key={op.symbol}
                    type="button"
                    onClick={() => appendOperatorToSequence(op.symbol)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0"
                  >
                    <span>{op.symbol}</span>
                    <span className="font-sans text-[11px] font-normal text-slate-600">
                      {op.name}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
                <span className="text-[11px] font-medium text-slate-500">
                  Instrucciones compuestas (.hlx):
                </span>
                {quickCompoundWords.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => appendCompoundWordToSequence(w)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 hover:border-slate-300 hover:bg-white whitespace-nowrap shrink-0"
                  >
                    <span className="font-semibold text-slate-900">{w.glyphs}</span>
                    <span className="font-mono text-[10px] text-slate-500">{w.opcode}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Editor directo y tira visual de factores */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="godel-sequence-editor"
                  className="text-xs font-semibold text-slate-900"
                >
                  Programa / Secuencia editable (.hlx)
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={undoLastCharacter}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    <span>Deshacer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSequenceText('')}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Limpiar</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopySequence}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    {copiedScript ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedScript ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <textarea
                id="godel-sequence-editor"
                value={sequenceText}
                onChange={(e) => setSequenceText(e.target.value)}
                rows={4}
                spellCheck={false}
                placeholder="Escribe o pulsa tokens arriba, por ejemplo: ᛇᚢ"
                className="w-full rounded-md border border-slate-300 bg-slate-950 p-3 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
              />

              {/* Cadena visual de tokens resueltos con botón para quitar */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-slate-500">
                  Descomposición factorial en cadena (haz clic en un chip para quitarlo):
                </p>
                {resolvedTokenList.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {resolvedTokenList.map((r, idx) => (
                      <div key={`${r.index}-${idx}`} className="inline-flex items-center gap-1.5">
                        {idx > 0 && (
                          <span className="font-mono text-xs font-semibold text-slate-400">×</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeResolvedRuneAt(idx)}
                          title={`Quitar ${r.glyph} (${r.name}, primo ${r.prime})`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs hover:border-red-300 hover:bg-red-50 transition-colors"
                        >
                          <PrimeColorSwatch hex={r.colorHex} size={10} />
                          <span className="font-semibold text-slate-900">{r.glyph}</span>
                          <span className="font-mono text-[11px] text-slate-600 tabular-nums">
                            {r.prime}
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Añade al menos un token base para ver su multiplicación prima.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Zona Derecha (40%): Cálculo de Gödel en tiempo real y ejecución */}
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-5">
              {/* Veredicto formal explícito */}
              <div
                className={`flex items-start justify-between gap-3 rounded-md border p-3.5 ${
                  programValidation.valid
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                    : 'border-red-200 bg-red-50 text-red-950'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {programValidation.valid ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  ) : (
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                  )}
                  <div>
                    <p className="text-xs font-semibold">
                      {programValidation.valid
                        ? '● VÁLIDO · RESIDUO DE FACTORIZACIÓN = 1'
                        : sequenceText.trim().length === 0
                          ? '▲ VACÍO · SIN TOKENS'
                          : '▲ RECHAZADO · TOKEN FUERA DE LOS 33 PRIMOS'}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug opacity-90">
                      {programValidation.valid
                        ? `${programValidation.totalBasisTokens} tokens resueltos en ${programValidation.validLinesCount} línea(s) dentro del alfabeto cerrado.`
                        : programValidation.foreignTokens.length > 0
                          ? `Tokens ajenos detectados: ${programValidation.foreignTokens.join(', ')}.`
                          : 'Introduce tokens válidos del vocabulario P33 para certificar la secuencia.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ecuación paso a paso */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-900">
                  Producto de Gödel en tiempo real
                </p>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
                  <div className="text-[11px] text-slate-500">
                    G = ∏ pᵢ ={' '}
                    {sequenceComputation.primes.length > 0
                      ? sequenceComputation.primes.join(' × ')
                      : '1'}
                  </div>
                  <div className="mt-1.5 break-all text-base font-bold text-slate-900 tabular-nums">
                    = {formatBigIntGrouped(sequenceComputation.product)}
                  </div>
                </div>
              </div>

              {/* Firma posicional (Por qué importa el orden) */}
              <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    Firma posicional FNV-1a (anti-conmutatividad)
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-sky-700 tabular-nums">
                    {sequenceComputation.positionalSignature}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Como a × b = b × a, la aritmética sola no distingue el orden. Helix sella cada
                  secuencia con su huella posicional para que <span className="font-mono">ᛇᚢ</span> y{' '}
                  <span className="font-mono">ᚢᛇ</span> tengan identidades distintas.
                </p>
                {invertedOrderComparison && (
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-200 pt-2 text-[11px]">
                    <span className="text-slate-600">
                      Si inviertes a <span className="font-mono font-semibold">{invertedOrderComparison.reversedGlyphs}</span>:
                      mismo G ({invertedOrderComparison.sameProduct ? 'sí' : 'no'}), firma{' '}
                      <span className="font-mono font-semibold text-slate-900">
                        {invertedOrderComparison.reversedSignature}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSequenceText(invertedOrderComparison.reversedGlyphs)}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
                    >
                      <ArrowLeftRight className="h-3 w-3" />
                      <span>Invertir</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Desglose por línea */}
              {programValidation.report.lines.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-900">
                    Verificación por línea ({programValidation.report.lines.length})
                  </p>
                  <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                    {programValidation.report.lines.map((line) => (
                      <div
                        key={line.lineNumber}
                        className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono font-medium text-slate-900">
                            L{line.lineNumber}: {line.raw}
                          </p>
                          <p className="font-mono text-[10px] text-slate-500 tabular-nums">
                            {line.primes.length > 0
                              ? `[${line.primes.join(' × ')}] = ${line.lineGodelProduct}`
                              : 'Sin primos válidos'}
                          </p>
                        </div>
                        <span
                          className={`font-mono text-[10px] font-semibold whitespace-nowrap shrink-0 ${
                            line.status === 'VALIDO' ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {line.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acciones finales: escuchar y enviar a la VM o Estudio 3D */}
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={resolvedTokenList.length === 0}
                    onClick={handlePlaySequenceAudio}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap shrink-0"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-sky-700" />
                    <span>Escuchar secuencia</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSequenceText(STARTER_PRESETS[1].script)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Restaurar ejemplo</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!programValidation.valid}
                  onClick={() => onOpenInVm(sequenceText)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Probar esta secuencia en VM &amp; Ensamblador</span>
                </button>

                {onOpenIn3DStudio && (
                  <button
                    type="button"
                    disabled={!programValidation.valid}
                    onClick={() => onOpenIn3DStudio(sequenceText)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
                  >
                    <Box className="h-3.5 w-3.5 text-sky-700" />
                    <span>Proyectar en Estudio 3D</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
