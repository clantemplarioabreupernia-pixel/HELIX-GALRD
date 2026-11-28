import { useMemo, useRef, useState } from 'react';
import {
  Activity,
  Check,
  Copy,
  Cpu,
  Download,
  FileCode2,
  Gamepad2,
  HardDrive,
  Lock,
  Music,
  Newspaper,
  Orbit,
  Play,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  analyzeCollatzBigInt,
  auditBirkhoffVonNeumannVsTotalOrder,
  AuraSecurityRingBuffer,
  buildMelodyBandPlan,
  CollatzAnalysisResult,
  createLedgerEntry,
  CrystalVault64B,
  generateDeterministicTerrainGrid,
  generateNativeKitSource,
  LedgerEntry,
  NativeKitId,
  noteToFrequency,
  PhaseCoreReport,
  runZeroGOrbitComparison,
  simulateKuramotoPhaseCore,
  summarizeLedger,
  ulpDistanceFloat64,
  verifyTerrainParametersFormal,
  ZeroGComparisonReport,
} from '../core';
import type { LiquidMorphShape } from './LiquidBiopixelCanvas';

export type CartridgeId =
  | 'zero_g'
  | 'crystal_vault_64b'
  | 'omega_verify'
  | 'collatz_phase'
  | 'games_terrain'
  | 'music_synth'
  | 'news_studio'
  | 'vault_ledger'
  | 'aura_siem'
  | 'native_kits';

interface CartridgeMeta {
  id: CartridgeId;
  title: string;
  layer: 'Física & Verificación' | 'Memoria & Seguridad' | 'Audio & Media' | 'Datos & Kits Nativos';
  scope: string;
  whatItIsNot: string;
  icon: typeof Orbit;
}

const CARTRIDGES: CartridgeMeta[] = [
  {
    id: 'zero_g',
    title: 'Omega Zero-G · Orbital',
    layer: 'Física & Verificación',
    scope: 'Corre en vivo en navegador: integrador Verlet vs Euler + TrailBuffer circular + asistente /api/assistant/orbital.',
    whatItIsNot: 'No invoca Z3; aplica chequeos algebraicos directos de conservación de energía y momento angular.',
    icon: Orbit,
  },
  {
    id: 'crystal_vault_64b',
    title: 'Crystal Vault 64B · R8UI',
    layer: 'Memoria & Seguridad',
    scope: 'Corre en vivo: ArrayBuffer cache-aligned de 64B, bit-fields uint16, FNV-1a, matriz R8UI 64×N y Quantum Vanish.',
    whatItIsNot: 'No persiste en hardware TPM físico; opera sobre memoria lineal aislada en sesión del navegador.',
    icon: Lock,
  },
  {
    id: 'omega_verify',
    title: 'Omega Verify & Q-Omega',
    layer: 'Física & Verificación',
    scope: 'Corre en vivo: analizador de brecha ULP IEEE-754, cotas fBm y auditoría Birkhoff-von Neumann vs orden clásico.',
    whatItIsNot: 'El demostrador Z3 completo L0–L8 requiere Python z3-solver local (incluido como kit descargable).',
    icon: ShieldCheck,
  },
  {
    id: 'collatz_phase',
    title: 'Collatz BigInt & Phase Core',
    layer: 'Física & Verificación',
    scope: 'Corre en vivo: trayectorias exactas BigInt, entropía de Shannon y sincronización Kuramoto (Parámetro R).',
    whatItIsNot: 'Para barridos masivos uint64 multi-hilo se exporta el kernel nativo en Go.',
    icon: Activity,
  },
  {
    id: 'games_terrain',
    title: 'Plataforma Juegos & Terreno',
    layer: 'Audio & Media',
    scope: 'Corre en vivo: ValueNoise2D determinista (Mulberry32) con validación formal y proyección al visor 3D.',
    whatItIsNot: 'No conecta con tiendas externas; genera mundos jugables locales en los biopíxeles.',
    icon: Gamepad2,
  },
  {
    id: 'music_synth',
    title: 'Omega Music & Virtual Synth',
    layer: 'Audio & Media',
    scope: 'Corre en vivo: síntesis Web Audio (renderMelody), espectro bass/mid/treble y previsualización MultiPass.',
    whatItIsNot: 'El renderizado por lotes externo ComfyUI + ffmpeg requiere tus servicios locales instalados.',
    icon: Music,
  },
  {
    id: 'news_studio',
    title: 'Omega News Studio',
    layer: 'Audio & Media',
    scope: 'Corre en vivo vía servidor Express + Gemini ResponseSchema: 1 cable -> 7 piezas editoriales.',
    whatItIsNot: 'Requiere GEMINI_API_KEY activa en el servidor; propaga error explícito si falta clave o cuota.',
    icon: Newspaper,
  },
  {
    id: 'vault_ledger',
    title: 'Crystal Vault Ledger P₃₃',
    layer: 'Datos & Kits Nativos',
    scope: 'Corre en vivo: contabilidad local Result<T,E>, suma exacta racional P33, gráfico Recharts y resumen Gemini.',
    whatItIsNot: 'No está conectado a cuentas bancarias reales ni procesadores de pago.',
    icon: Wallet,
  },
  {
    id: 'aura_siem',
    title: 'AURA-7 & L2-Security SIEM',
    layer: 'Memoria & Seguridad',
    scope: 'Corre en vivo: ring buffer determinista de 128 slots con cadena FNV-1a y latencia real performance.now().',
    whatItIsNot: 'No reemplaza sensores de kernel Linux (eBPF/auditd); audita eventos internos de la consola.',
    icon: Cpu,
  },
  {
    id: 'native_kits',
    title: 'Kits Nativos & Archivo Fundacional',
    layer: 'Datos & Kits Nativos',
    scope: 'Exporta código fuente completo en Go, Python Z3, TypeScript y Solidity + mapa de investigación hardware.',
    whatItIsNot: 'Separa con transparencia lo ejecutable en PC/ESP32 de la visión de hardware a futuro.',
    icon: FileCode2,
  },
];

interface CartridgeLabHubProps {
  onProjectToBiopixel: (shape: LiquidMorphShape, accentHex?: string, promptNote?: string) => void;
}

export function CartridgeLabHub({ onProjectToBiopixel }: CartridgeLabHubProps) {
  const [activeId, setActiveId] = useState<CartridgeId>('zero_g');

  // 1. Zero-G State
  const [zgRadius, setZgRadius] = useState(6771);
  const [zgEcc, setZgEcc] = useState(0.28);
  const [zgReport, setZgReport] = useState<ZeroGComparisonReport>(() =>
    runZeroGOrbitComparison(6771, 0.28, 220, 35),
  );
  const [zgQuestion, setZgQuestion] = useState('¿Por qué Verlet conserva la energía mejor que Euler en órbitas elípticas?');
  const [zgAiAnswer, setZgAiAnswer] = useState<string | null>(null);
  const [zgAiLoading, setZgAiLoading] = useState(false);

  // 2. Crystal Vault 64B State
  const [vaultInstance] = useState(() => {
    const v = new CrystalVault64B(16);
    v.appendRecord('GENESIS', 2500, 'helix_tesoreria', 0x0137);
    v.appendRecord('TRANSFER', 450, 'modulo_cauchy', 0x0201);
    return v;
  });
  const [vaultTick, setVaultTick] = useState(0);
  const [vaultAmount, setVaultAmount] = useState('320');
  const [vaultAccount, setVaultAccount] = useState('nodo_optico');
  const [vaultMsg, setVaultMsg] = useState<string | null>(null);

  // 3. Omega Verify State
  const [ulpA, setUlpA] = useState('0.3');
  const [ulpB, setUlpB] = useState(String(0.1 + 0.2));
  const [verifyAmp, setVerifyAmp] = useState('14');
  const [verifyOct, setVerifyOct] = useState('5');
  const [verifyPers, setVerifyPers] = useState('0.52');
  const [verifyFreq, setVerifyFreq] = useState('0.14');

  // 4. Collatz & Phase Core State
  const [collatzSeed, setCollatzSeed] = useState('9780657630');
  const [collatzRes, setCollatzRes] = useState<CollatzAnalysisResult>(() => analyzeCollatzBigInt('9780657630'));
  const [phaseK, setPhaseK] = useState(2.4);
  const [phaseReport, setPhaseReport] = useState<PhaseCoreReport>(() => simulateKuramotoPhaseCore(24, 2.4, 80, 137));

  // 5. Games & Terrain State
  const [terrainSeed, setTerrainSeed] = useState(137);
  const [terrainAmp, setTerrainAmp] = useState(12);
  const [terrainOct, setTerrainOct] = useState(4);

  // 6. Music & Synth State
  const [melodyCsv, setMelodyCsv] = useState('C4 E4 G4 B4 A4 F4 D4 C4');
  const [passView, setPassView] = useState<'rgb' | 'depth' | 'normals'>('rgb');
  const [activeNoteIdx, setActiveNoteIdx] = useState<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // 7. News Studio State
  const [newsCable, setNewsCable] = useState(
    'El consorcio científico completó hoy las pruebas de dispersión óptica con puntos cuánticos CdSe y validación matemática por intervalos, logrando estabilidad térmica sin deriva en simulaciones de laboratorio.',
  );
  const [newsTone, setNewsTone] = useState('Científico y claro');
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsPackage, setNewsPackage] = useState<Record<string, string> | null>(null);

  // 8. Ledger State
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(() => {
    const r1 = createLedgerEntry({ date: '2026-11-28', concept: 'Licencia Motor P33', category: 'Ingresos', type: 'income', amountCents: 185000 }, 1);
    const r2 = createLedgerEntry({ date: '2026-11-28', concept: 'Nodos Cómputo Local', category: 'Infraestructura', type: 'expense', amountCents: 42000 }, 2);
    const r3 = createLedgerEntry({ date: '2026-11-28', concept: 'Banco Óptico CdSe', category: 'Investigación', type: 'expense', amountCents: 31500 }, 3);
    return [r1, r2, r3].filter((r): r is { ok: true; value: LedgerEntry } => r.ok).map((r) => r.value);
  });
  const [txConcept, setTxConcept] = useState('');
  const [txUsd, setTxUsd] = useState('');
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txCategory, setTxCategory] = useState<LedgerEntry['category']>('Operación');
  const [ledgerAiReply, setLedgerAiReply] = useState<string | null>(null);
  const [ledgerAiLoading, setLedgerAiLoading] = useState(false);

  // 9. AURA-7 SIEM State
  const [siemRing] = useState(() => {
    const rb = new AuraSecurityRingBuffer();
    rb.push('SYNAPSE-1', 'Inicialización de canal seguro', 'NOMINAL');
    rb.push('L2-SEC', 'Validación FNV-1a bloque inicial', 'GUARD');
    rb.push('AURA-7', 'Política anti-429 armada', 'NOMINAL');
    return rb;
  });
  const [siemTick, setSiemTick] = useState(0);

  // 10. Native Kits State
  const [selectedKit, setSelectedKit] = useState<NativeKitId>('go-thermal');
  const [copiedKit, setCopiedKit] = useState(false);

  const activeMeta = CARTRIDGES.find((c) => c.id === activeId) ?? CARTRIDGES[0];

  const vaultRecords = useMemo(() => {
    void vaultTick;
    return vaultInstance.listRecords();
  }, [vaultInstance, vaultTick]);

  const vaultAudit = useMemo(() => {
    void vaultTick;
    return vaultInstance.verifyFiveInvariants();
  }, [vaultInstance, vaultTick]);

  const r8uiMatrix = useMemo(() => {
    void vaultTick;
    return vaultInstance.exportR8UIMatrix();
  }, [vaultInstance, vaultTick]);

  const bvnAudit = useMemo(() => auditBirkhoffVonNeumannVsTotalOrder(), []);

  const terrainCheck = useMemo(
    () =>
      verifyTerrainParametersFormal({
        amplitude: Number(verifyAmp) || 0,
        octaves: Number(verifyOct) || 0,
        persistence: Number(verifyPers) || 0,
        frequency: Number(verifyFreq) || 0,
        seed: terrainSeed,
      }),
    [verifyAmp, verifyOct, verifyPers, verifyFreq, terrainSeed],
  );

  const terrainGrid = useMemo(
    () =>
      generateDeterministicTerrainGrid(
        {
          amplitude: terrainAmp,
          octaves: terrainOct,
          persistence: 0.52,
          frequency: 0.14,
          seed: terrainSeed,
        },
        20,
      ),
    [terrainAmp, terrainOct, terrainSeed],
  );

  const melodySteps = useMemo(() => buildMelodyBandPlan(melodyCsv), [melodyCsv]);
  const ledgerSummary = useMemo(() => summarizeLedger(ledgerEntries), [ledgerEntries]);
  const nativeKit = useMemo(() => generateNativeKitSource(selectedKit), [selectedKit]);
  const siemEvents = useMemo(() => {
    void siemTick;
    return siemRing.list().slice().reverse();
  }, [siemRing, siemTick]);

  const playMelodyLive = async () => {
    if (typeof window === 'undefined') return;
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    if (!audioCtxRef.current) audioCtxRef.current = new AudioCtor();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    melodySteps.forEach((step, idx) => {
      const start = ctx.currentTime + idx * 0.24;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(noteToFrequency(step.note), start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.23);
      window.setTimeout(() => setActiveNoteIdx(idx), idx * 240);
    });
    window.setTimeout(() => setActiveNoteIdx(null), melodySteps.length * 240 + 60);
  };

  const renderZeroGSvg = (report: ZeroGComparisonReport) => {
    const allPts = [...report.verletPoints, ...report.eulerPoints];
    let maxCoord = 1000;
    for (const p of allPts) {
      maxCoord = Math.max(maxCoord, Math.abs(p.x), Math.abs(p.y));
    }
    const scale = 110 / maxCoord;
    const toPath = (pts: { x: number; y: number }[]) =>
      pts
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(140 + p.x * scale).toFixed(1)} ${(130 - p.y * scale).toFixed(1)}`)
        .join(' ');
    return (
      <svg viewBox="0 0 280 260" className="h-60 w-full border border-slate-800 bg-[#04070e]">
        <circle cx="140" cy="130" r="10" fill="#0ea5e9" opacity="0.85" />
        <path d={toPath(report.eulerPoints)} fill="none" stroke="#f59e0b" strokeWidth="1.4" strokeDasharray="3 3" />
        <path d={toPath(report.verletPoints)} fill="none" stroke="#10b981" strokeWidth="2" />
      </svg>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#05080f] text-slate-100 lg:flex-row">
      {/* Navegación lateral de Cartuchos */}
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-800 bg-[#070b14] p-2.5 lg:w-64 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="hidden px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:block">
          Cartuchos del Laboratorio
        </div>
        {CARTRIDGES.map((cart) => {
          const Icon = cart.icon;
          const active = activeId === cart.id;
          return (
            <button
              key={cart.id}
              type="button"
              onClick={() => setActiveId(cart.id)}
              className={`flex shrink-0 items-center gap-2.5 px-2.5 py-2 text-left text-xs transition-colors lg:w-full ${
                active
                  ? 'border border-sky-500/50 bg-sky-500/15 text-white'
                  : 'border border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-sky-300' : 'text-slate-500'}`} />
              <div className="min-w-0">
                <div className="truncate font-medium">{cart.title}</div>
                <div className="hidden truncate text-[10px] text-slate-500 lg:block">{cart.layer}</div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Área activa del Cartucho */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto max-w-5xl space-y-5">
          {/* Cabecera honesta del Cartucho */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="max-w-2xl">
              <div className="text-xs text-slate-400">{activeMeta.layer}</div>
              <h2 className="mt-0.5 text-xl font-bold text-white">{activeMeta.title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{activeMeta.scope}</p>
              <p className="mt-1 text-[11px] text-slate-400">Límite honesto: {activeMeta.whatItIsNot}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                onProjectToBiopixel(
                  activeId === 'zero_g'
                    ? 'orbital_ship'
                    : activeId === 'games_terrain'
                      ? 'terrain'
                      : activeId === 'music_synth'
                        ? 'cymatic_wave'
                        : 'quantum_bloch',
                  '#38bdf8',
                )
              }
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Proyectar en Biopíxeles 3D</span>
            </button>
          </div>

          {/* 1. OMEGA ZERO-G */}
          {activeId === 'zero_g' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 border border-slate-800 bg-[#0b111e] p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Trayectoria Verlet (Verde) vs Euler (Ámbar)</span>
                  <span className="font-mono text-[11px] text-slate-400">TrailBuffer Circular</span>
                </div>
                {renderZeroGSvg(zgReport)}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="border border-slate-800 bg-[#05080f] p-2">
                    <span className="block text-[10px] text-slate-400">Radio inicial (km)</span>
                    <input
                      type="number"
                      value={zgRadius}
                      onChange={(e) => setZgRadius(Number(e.target.value) || 6771)}
                      className="mt-1 w-full bg-transparent font-mono text-white focus:outline-none"
                    />
                  </label>
                  <label className="border border-slate-800 bg-[#05080f] p-2">
                    <span className="block text-[10px] text-slate-400">Excentricidad (0–0.75)</span>
                    <input
                      type="number"
                      step="0.05"
                      value={zgEcc}
                      onChange={(e) => setZgEcc(Number(e.target.value) || 0)}
                      className="mt-1 w-full bg-transparent font-mono text-white focus:outline-none"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setZgReport(runZeroGOrbitComparison(zgRadius, zgEcc, 220, 35))}
                  className="w-full bg-emerald-500 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Recalcular Integradores
                </button>
              </div>

              <div className="space-y-3 border border-slate-800 bg-[#0b111e] p-4 text-xs">
                <div className="font-semibold text-white">Telemetría e Invariantes Orbitales</div>
                <div className="grid grid-cols-2 gap-2 font-mono tabular-nums">
                  <div className="border border-slate-800 bg-[#05080f] p-2.5">
                    <div className="text-[10px] text-slate-400">Deriva ΔE/E₀ Verlet</div>
                    <div className="mt-0.5 text-sm font-semibold text-emerald-300">{zgReport.verletEnergyDriftRatio}</div>
                  </div>
                  <div className="border border-slate-800 bg-[#05080f] p-2.5">
                    <div className="text-[10px] text-slate-400">Deriva ΔE/E₀ Euler</div>
                    <div className="mt-0.5 text-sm font-semibold text-amber-300">{zgReport.eulerEnergyDriftRatio}</div>
                  </div>
                  <div className="border border-slate-800 bg-[#05080f] p-2.5">
                    <div className="text-[10px] text-slate-400">Momento Angular L</div>
                    <div className="mt-0.5 text-sm text-white">{zgReport.angularMomentumVerlet}</div>
                  </div>
                  <div className="border border-slate-800 bg-[#05080f] p-2.5">
                    <div className="text-[10px] text-slate-400">Radio Schwarzschild</div>
                    <div className="mt-0.5 text-sm text-sky-300">{zgReport.schwarzschildMeters} m</div>
                  </div>
                </div>
                <ul className="space-y-1 text-[11px] text-slate-300">
                  {zgReport.invariantNotes.map((n) => (
                    <li key={n}>· {n}</li>
                  ))}
                </ul>
                <div className="border-t border-slate-800 pt-3">
                  <div className="mb-1.5 font-semibold text-white">Asistente Astrodinámico (Servidor Gemini)</div>
                  <textarea
                    rows={2}
                    value={zgQuestion}
                    onChange={(e) => setZgQuestion(e.target.value)}
                    className="w-full border border-slate-800 bg-[#05080f] p-2 text-xs text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={zgAiLoading}
                    onClick={async () => {
                      setZgAiLoading(true);
                      setZgAiAnswer(null);
                      try {
                        const res = await fetch('/api/assistant/orbital', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            question: zgQuestion,
                            telemetry: `r0=${zgReport.initialRadiusKm}km, e=${zgReport.eccentricity}, driftVerlet=${zgReport.verletEnergyDriftRatio}, driftEuler=${zgReport.eulerEnergyDriftRatio}`,
                          }),
                        });
                        const data = await res.json();
                        setZgAiAnswer(data.ok ? data.reply : data.error || 'Error del servidor');
                      } catch {
                        setZgAiAnswer('No fue posible contactar con /api/assistant/orbital.');
                      } finally {
                        setZgAiLoading(false);
                      }
                    }}
                    className="mt-2 border border-sky-500/50 bg-sky-500/15 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/25"
                  >
                    {zgAiLoading ? 'Consultando…' : 'Consultar Asistente'}
                  </button>
                  {zgAiAnswer && (
                    <p className="mt-2 whitespace-pre-line border border-slate-800 bg-[#05080f] p-2.5 text-[11px] leading-relaxed text-slate-200">
                      {zgAiAnswer}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. CRYSTAL VAULT 64B */}
          {activeId === 'crystal_vault_64b' && (
            <div className="space-y-4 text-xs">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 border border-slate-800 bg-[#0b111e] p-4">
                  <div className="font-semibold text-white">Escribir Bloque Cache-Aligned de 64 Bytes</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={vaultAmount}
                      onChange={(e) => setVaultAmount(e.target.value)}
                      placeholder="Unidades"
                      className="border border-slate-800 bg-[#05080f] px-2.5 py-2 font-mono text-white focus:outline-none"
                    />
                    <input
                      type="text"
                      value={vaultAccount}
                      onChange={(e) => setVaultAccount(e.target.value)}
                      placeholder="Cuenta / Etiqueta"
                      className="border border-slate-800 bg-[#05080f] px-2.5 py-2 text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const res = vaultInstance.appendRecord('TRANSFER', Number(vaultAmount) || 100, vaultAccount);
                        setVaultMsg(res.ok ? `Slot ${res.record.slot} sellado (${res.record.storedChecksumHex}).` : res.error);
                        setVaultTick((t) => t + 1);
                      }}
                      className="bg-sky-500 px-3 py-1.5 font-semibold text-slate-950 hover:bg-sky-400"
                    >
                      Anexar Bloque 64B
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (vaultRecords.length > 0) {
                          vaultInstance.corruptByteForTest(vaultRecords.length - 1, 18);
                          setVaultMsg('Byte alterado manualmente para probar detección FNV-1a.');
                          setVaultTick((t) => t + 1);
                        }
                      }}
                      className="border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 text-amber-200 hover:bg-amber-500/25"
                    >
                      Simular Corrupción
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const p = vaultInstance.securePurge();
                        setVaultMsg(`Quantum Vanish: ${p.bytesZeroed} B puestos a cero.`);
                        setVaultTick((t) => t + 1);
                      }}
                      className="inline-flex items-center gap-1 border border-rose-500/50 bg-rose-500/15 px-3 py-1.5 text-rose-200 hover:bg-rose-500/25"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Purgar RAM</span>
                    </button>
                  </div>
                  {vaultMsg && <div className="font-mono text-[11px] text-sky-300">{vaultMsg}</div>}
                </div>

                <div className="space-y-2 border border-slate-800 bg-[#0b111e] p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">5 Invariantes Formales</span>
                    <span className={`font-mono text-[11px] ${vaultAudit.valid ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {vaultAudit.valid ? 'VERIFICADO' : 'ALERTA'}
                    </span>
                  </div>
                  {vaultAudit.invariants.map((inv) => (
                    <div key={inv.name} className="flex items-center justify-between border-b border-slate-800/70 py-1 font-mono text-[11px]">
                      <span className="text-slate-300">{inv.name}</span>
                      <span className={inv.passed ? 'text-emerald-400' : 'text-rose-400'}>
                        {inv.passed ? 'OK' : 'FAIL'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inspector R8UI 64 bytes por fila */}
              <div className="border border-slate-800 bg-[#0b111e] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-white">
                    Inspector de Memoria R8UI ({r8uiMatrix.width} × {r8uiMatrix.height} bytes)
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{vaultAudit.byteLength} B asignados</span>
                </div>
                <div className="space-y-1.5 font-mono text-[10px]">
                  {vaultRecords.map((rec) => (
                    <div key={rec.slot} className="border border-slate-800 bg-[#05080f] p-2">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-slate-300">
                        <span>
                          #{rec.slot} · {rec.kind} · Monto={rec.amountUnits} · Balance={rec.balanceUnits}
                        </span>
                        <span className={rec.checksumValid ? 'text-emerald-300' : 'text-rose-400'}>
                          FNV1a={rec.storedChecksumHex} ({rec.checksumValid ? 'Íntegro' : 'Corrupto'})
                        </span>
                      </div>
                      <div className="grid grid-cols-16 gap-0.5 text-[9px] text-slate-400">
                        {rec.rawBytesHex.slice(0, 32).map((hx, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-900 px-1 py-0.5 text-center"
                            style={{ opacity: 0.45 + (parseInt(hx, 16) / 255) * 0.55 }}
                          >
                            {hx}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {vaultRecords.length === 0 && (
                    <div className="text-slate-400">Bóveda vacía o purgada con Quantum Vanish.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. OMEGA VERIFY & Q-OMEGA */}
          {activeId === 'omega_verify' && (
            <div className="grid gap-4 lg:grid-cols-2 text-xs">
              <div className="space-y-3 border border-slate-800 bg-[#0b111e] p-4">
                <div className="font-semibold text-white">Validador de Cotas Formales (Terreno fBm)</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Amplitud [0.2–40]', val: verifyAmp, set: setVerifyAmp },
                    { label: 'Octavas [1–8]', val: verifyOct, set: setVerifyOct },
                    { label: 'Persistencia (0–0.85)', val: verifyPers, set: setVerifyPers },
                    { label: 'Frecuencia (0.005–2.5]', val: verifyFreq, set: setVerifyFreq },
                  ].map((f) => (
                    <label key={f.label} className="border border-slate-800 bg-[#05080f] p-2">
                      <span className="block text-[10px] text-slate-400">{f.label}</span>
                      <input
                        type="text"
                        value={f.val}
                        onChange={(e) => f.set(e.target.value)}
                        className="mt-1 w-full bg-transparent font-mono text-white focus:outline-none"
                      />
                    </label>
                  ))}
                </div>
                <div className="border border-slate-800 bg-[#05080f] p-3 font-mono text-[11px]">
                  <div className={terrainCheck.status === 'SAT_VALID' ? 'text-emerald-300' : 'text-rose-300'}>
                    Estado: {terrainCheck.status}
                  </div>
                  {(terrainCheck.violations.length > 0 ? terrainCheck.violations : terrainCheck.guarantees).map((line) => (
                    <div key={line} className="mt-1 text-slate-300">
                      · {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 border border-slate-800 bg-[#0b111e] p-4">
                <div className="font-semibold text-white">Analizador ULP IEEE-754 + Auditoría Q-Omega</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={ulpA}
                    onChange={(e) => setUlpA(e.target.value)}
                    className="border border-slate-800 bg-[#05080f] p-2 font-mono text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    value={ulpB}
                    onChange={(e) => setUlpB(e.target.value)}
                    className="border border-slate-800 bg-[#05080f] p-2 font-mono text-white focus:outline-none"
                  />
                </div>
                <div className="border border-slate-800 bg-[#05080f] p-2.5 font-mono text-emerald-300 tabular-nums">
                  Distancia ULP(float64) = {ulpDistanceFloat64(Number(ulpA), Number(ulpB))} ULPs
                </div>
                <div className="border border-slate-800 bg-[#05080f] p-3 space-y-1">
                  <div className="font-semibold text-white">Coherencia Birkhoff-von Neumann</div>
                  <div className="font-mono text-[11px] text-sky-300">
                    Retículo C² distributivo: {String(bvnAudit.quantumLatticeDistributive)} · Testigo Frobenius:{' '}
                    {bvnAudit.frobeniusWitnessDiff}
                  </div>
                  <p className="text-[11px] text-slate-300">{bvnAudit.architecturalResolution}</p>
                </div>
              </div>
            </div>
          )}

          {/* 4. COLLATZ & PHASE CORE */}
          {activeId === 'collatz_phase' && (
            <div className="grid gap-4 lg:grid-cols-2 text-xs">
              <div className="space-y-3 border border-slate-800 bg-[#0b111e] p-4">
                <div className="font-semibold text-white">Órbita Collatz (BigInt Exacto + Entropía Shannon)</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={collatzSeed}
                    onChange={(e) => setCollatzSeed(e.target.value)}
                    className="min-w-0 flex-1 border border-slate-800 bg-[#05080f] px-2.5 py-2 font-mono text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setCollatzRes(analyzeCollatzBigInt(collatzSeed))}
                    className="bg-sky-500 px-3 py-2 font-semibold text-slate-950 hover:bg-sky-400"
                  >
                    Calcular
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums">
                  <div className="border border-slate-800 bg-[#05080f] p-2">
                    Pasos: <span className="text-sky-300">{collatzRes.stoppingTime}</span>
                  </div>
                  <div className="border border-slate-800 bg-[#05080f] p-2">
                    Entropía H: <span className="text-emerald-300">{collatzRes.shannonBitEntropy} bits</span>
                  </div>
                  <div className="col-span-2 truncate border border-slate-800 bg-[#05080f] p-2">
                    Pico: <span className="text-amber-300">{collatzRes.peakStr}</span>
                  </div>
                </div>
                <div className="flex h-24 items-end gap-0.5 border border-slate-800 bg-[#04070e] p-2">
                  {collatzRes.sampleTrajectory.slice(0, 60).map((val, idx) => {
                    const maxV = Math.max(...collatzRes.sampleTrajectory.slice(0, 60), 1);
                    const pct = Math.max(4, Math.round((Math.log10(val + 1) / Math.log10(maxV + 1)) * 100));
                    return <div key={idx} className="flex-1 bg-sky-500/80" style={{ height: `${pct}%` }} />;
                  })}
                </div>
              </div>

              <div className="space-y-3 border border-slate-800 bg-[#0b111e] p-4">
                <div className="font-semibold text-white">Omega Phase Core · Sincronización Kuramoto R</div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-slate-400">Acoplamiento K={phaseK}</span>
                  <input
                    type="range"
                    min={0.2}
                    max={5}
                    step={0.2}
                    value={phaseK}
                    onChange={(e) => {
                      const k = Number(e.target.value);
                      setPhaseK(k);
                      setPhaseReport(simulateKuramotoPhaseCore(24, k, 80, 137));
                    }}
                    className="flex-1 accent-emerald-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums">
                  <div className="border border-slate-800 bg-[#05080f] p-2">
                    R inicial: {phaseReport.initialOrderParameter}
                  </div>
                  <div className="border border-slate-800 bg-[#05080f] p-2 text-emerald-300">
                    R final: {phaseReport.finalOrderParameter}
                  </div>
                </div>
                <div className="flex h-24 items-end gap-0.5 border border-slate-800 bg-[#04070e] p-2">
                  {phaseReport.historyOrder.map((r, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-emerald-400/85"
                      style={{ height: `${Math.max(4, Math.round(r * 100))}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. PLATAFORMA DE JUEGOS & TERRENO */}
          {activeId === 'games_terrain' && (
            <div className="grid gap-4 lg:grid-cols-2 text-xs">
              <div className="space-y-3 border border-slate-800 bg-[#0b111e] p-4">
                <div className="font-semibold text-white">Mapa de Altura ValueNoise (Mulberry32)</div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="border border-slate-800 bg-[#05080f] p-2">
                    <span className="text-[10px] text-slate-400">Seed</span>
                    <input
                      type="number"
                      value={terrainSeed}
                      onChange={(e) => setTerrainSeed(Number(e.target.value) || 1)}
                      className="mt-0.5 w-full bg-transparent font-mono text-white focus:outline-none"
                    />
                  </label>
                  <label className="border border-slate-800 bg-[#05080f] p-2">
                    <span className="text-[10px] text-slate-400">Amplitud</span>
                    <input
                      type="number"
                      value={terrainAmp}
                      onChange={(e) => setTerrainAmp(Math.max(1, Number(e.target.value) || 10))}
                      className="mt-0.5 w-full bg-transparent font-mono text-white focus:outline-none"
                    />
                  </label>
                  <label className="border border-slate-800 bg-[#05080f] p-2">
                    <span className="text-[10px] text-slate-400">Octavas</span>
                    <input
                      type="number"
                      value={terrainOct}
                      onChange={(e) => setTerrainOct(Math.max(1, Math.min(7, Number(e.target.value) || 4)))}
                      className="mt-0.5 w-full bg-transparent font-mono text-white focus:outline-none"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-20 gap-px border border-slate-800 bg-[#04070e] p-1">
                  {terrainGrid.grid.flat().map((h, i) => {
                    const norm = Math.max(0, Math.min(1, (h - terrainGrid.minH) / Math.max(0.1, terrainGrid.maxH - terrainGrid.minH)));
                    const bg =
                      norm < 0.35
                        ? `rgba(14, 165, 233, ${0.35 + norm})`
                        : norm < 0.72
                          ? `rgba(16, 185, 129, ${0.3 + norm * 0.6})`
                          : `rgba(226, 232, 240, ${0.5 + norm * 0.5})`;
                    return <div key={i} className="aspect-square w-full" style={{ backgroundColor: bg }} />;
                  })}
                </div>
              </div>

              <div className="space-y-2.5 border border-slate-800 bg-[#0b111e] p-4">
                <div className="font-semibold text-white">Lanzador de Géneros en Biopíxeles 3D</div>
                {(
                  [
                    { title: 'Aventura · Bosque Luminoso', shape: 'terrain' as LiquidMorphShape, hex: '#10b981' },
                    { title: 'Combate · Nave Orbital WASD', shape: 'orbital_ship' as LiquidMorphShape, hex: '#f59e0b' },
                    { title: 'Estrategia · Ciudadela Toroidal', shape: 'torus' as LiquidMorphShape, hex: '#38bdf8' },
                    { title: 'Campaña · Cristal Fotónico', shape: 'crystal' as LiquidMorphShape, hex: '#a78bfa' },
                  ] as const
                ).map((g) => (
                  <button
                    key={g.title}
                    type="button"
                    onClick={() => onProjectToBiopixel(g.shape, g.hex)}
                    className="flex w-full items-center justify-between border border-slate-800 bg-[#05080f] px-3 py-2.5 text-left hover:border-sky-500/50"
                  >
                    <span className="font-medium text-white">{g.title}</span>
                    <Play className="h-3.5 w-3.5 text-sky-300" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 6. OMEGA MUSIC & SYNTH */}
          {activeId === 'music_synth' && (
            <div className="grid gap-4 lg:grid-cols-2 text-xs">
              <div className="space-y-3 border border-slate-800 bg-[#0b111e] p-4">
                <div className="font-semibold text-white">Sintetizador Web Audio (renderMelody)</div>
                <input
                  type="text"
                  value={melodyCsv}
                  onChange={(e) => setMelodyCsv(e.target.value)}
                  className="w-full border border-slate-800 bg-[#05080f] px-2.5 py-2 font-mono text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void playMelodyLive()}
                  className="inline-flex items-center gap-1.5 bg-sky-500 px-3 py-2 font-semibold text-slate-950 hover:bg-sky-400"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Reproducir Secuencia Web Audio</span>
                </button>
                <div className="grid grid-cols-4 gap-1.5 font-mono text-[11px] tabular-nums">
                  {melodySteps.map((st, idx) => (
                    <div
                      key={`${st.note}_${idx}`}
                      className={`border p-2 ${
                        activeNoteIdx === idx
                          ? 'border-sky-400 bg-sky-500/20 text-white'
                          : 'border-slate-800 bg-[#05080f] text-slate-300'
                      }`}
                    >
                      <div className="font-semibold">{st.note}</div>
                      <div className="text-[10px] text-slate-400">{st.freqHz} Hz</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 border border-slate-800 bg-[#0b111e] p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">MultiPassRenderer (ControlNet / ComfyUI)</span>
                  <div className="flex gap-1">
                    {(['rgb', 'depth', 'normals'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPassView(p)}
                        className={`px-2 py-1 text-[10px] uppercase ${
                          passView === p ? 'bg-sky-500 text-slate-950 font-semibold' : 'border border-slate-800 text-slate-400'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  className="flex h-40 items-center justify-center border border-slate-800 font-mono text-xs"
                  style={{
                    background:
                      passView === 'rgb'
                        ? 'radial-gradient(circle at 50% 45%, #0284c7, #05080f 75%)'
                        : passView === 'depth'
                          ? 'radial-gradient(circle at 50% 45%, #f8fafc, #0f172a 75%)'
                          : 'linear-gradient(135deg, #6366f1 0%, #22d3ee 50%, #ec4899 100%)',
                  }}
                >
                  <span className="border border-slate-900/60 bg-black/60 px-3 py-1 text-white">
                    Buffer {passView.toUpperCase()} activo · 3 bandas sincronizadas
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 7. OMEGA NEWS STUDIO */}
          {activeId === 'news_studio' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-3 border border-slate-800 bg-[#0b111e] p-4">
                <div className="font-semibold text-white">Cable Informativo → 7 Piezas Estructuradas</div>
                <textarea
                  rows={4}
                  value={newsCable}
                  onChange={(e) => setNewsCable(e.target.value)}
                  className="w-full border border-slate-800 bg-[#05080f] p-2.5 text-white focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newsTone}
                    onChange={(e) => setNewsTone(e.target.value)}
                    className="border border-slate-800 bg-[#05080f] px-2.5 py-1.5 text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={newsLoading}
                    onClick={async () => {
                      setNewsLoading(true);
                      setNewsError(null);
                      try {
                        const res = await fetch('/api/news/process', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ cable: newsCable, tone: newsTone }),
                        });
                        const json = await res.json();
                        if (res.ok && json.ok) setNewsPackage(json.data);
                        else setNewsError(json.error || 'Error procesando cable.');
                      } catch {
                        setNewsError('No se pudo conectar con /api/news/process.');
                      } finally {
                        setNewsLoading(false);
                      }
                    }}
                    className="bg-sky-500 px-3 py-1.5 font-semibold text-slate-950 hover:bg-sky-400"
                  >
                    {newsLoading ? 'Generando 7 formatos…' : 'Generar Paquete Editorial'}
                  </button>
                </div>
                {newsError && <div className="text-rose-300">{newsError}</div>}
              </div>

              {newsPackage && (
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(newsPackage).map(([k, v]) => (
                    <div key={k} className="border border-slate-800 bg-[#0b111e] p-3">
                      <div className="font-semibold capitalize text-sky-300">{k}</div>
                      <p className="mt-1 whitespace-pre-line text-slate-200">{v}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 8. CRYSTAL VAULT LEDGER P33 */}
          {activeId === 'vault_ledger' && (
            <div className="space-y-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-3 font-mono tabular-nums">
                <div className="border border-slate-800 bg-[#0b111e] p-3">
                  <div className="text-[10px] text-slate-400">Ingresos</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-300">${ledgerSummary.incomeUsd}</div>
                </div>
                <div className="border border-slate-800 bg-[#0b111e] p-3">
                  <div className="text-[10px] text-slate-400">Egresos</div>
                  <div className="mt-1 text-lg font-semibold text-amber-300">${ledgerSummary.expenseUsd}</div>
                </div>
                <div className="border border-slate-800 bg-[#0b111e] p-3">
                  <div className="text-[10px] text-slate-400">Balance Neto · P₃₃</div>
                  <div className="mt-1 text-lg font-semibold text-sky-300">${ledgerSummary.netUsd}</div>
                  <div className="text-[10px] text-slate-400">{ledgerSummary.p33NetRational}</div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2.5 border border-slate-800 bg-[#0b111e] p-4">
                  <div className="font-semibold text-white">Registrar Movimiento</div>
                  <input
                    type="text"
                    value={txConcept}
                    onChange={(e) => setTxConcept(e.target.value)}
                    placeholder="Concepto"
                    className="w-full border border-slate-800 bg-[#05080f] px-2.5 py-1.5 text-white focus:outline-none"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={txUsd}
                      onChange={(e) => setTxUsd(e.target.value)}
                      placeholder="USD"
                      className="border border-slate-800 bg-[#05080f] px-2.5 py-1.5 font-mono text-white focus:outline-none"
                    />
                    <select
                      value={txType}
                      onChange={(e) => setTxType(e.target.value as 'income' | 'expense')}
                      className="border border-slate-800 bg-[#05080f] px-2 py-1.5 text-white"
                    >
                      <option value="income">Ingreso</option>
                      <option value="expense">Gasto</option>
                    </select>
                    <select
                      value={txCategory}
                      onChange={(e) => setTxCategory(e.target.value as LedgerEntry['category'])}
                      className="border border-slate-800 bg-[#05080f] px-2 py-1.5 text-white"
                    >
                      <option value="Operación">Operación</option>
                      <option value="Ingresos">Ingresos</option>
                      <option value="Infraestructura">Infraestructura</option>
                      <option value="Investigación">Investigación</option>
                      <option value="Reserva">Reserva</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const res = createLedgerEntry(
                          {
                            date: new Date().toISOString().slice(0, 10),
                            concept: txConcept,
                            category: txCategory,
                            type: txType,
                            amountCents: Math.round(Number(txUsd) * 100),
                          },
                          ledgerEntries.length + 1,
                        );
                        if (res.ok) {
                          setLedgerEntries((prev) => [res.value, ...prev]);
                          setTxConcept('');
                          setTxUsd('');
                        }
                      }}
                      className="bg-sky-500 px-3 py-1.5 font-semibold text-slate-950 hover:bg-sky-400"
                    >
                      Registrar
                    </button>
                    <button
                      type="button"
                      disabled={ledgerAiLoading}
                      onClick={async () => {
                        setLedgerAiLoading(true);
                        setLedgerAiReply(null);
                        try {
                          const res = await fetch('/api/vault/analyze', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ summary: JSON.stringify(ledgerSummary) }),
                          });
                          const data = await res.json();
                          setLedgerAiReply(data.ok ? data.reply : data.error);
                        } catch {
                          setLedgerAiReply('Error consultando /api/vault/analyze.');
                        } finally {
                          setLedgerAiLoading(false);
                        }
                      }}
                      className="border border-slate-700 bg-[#05080f] px-3 py-1.5 text-slate-200 hover:border-sky-500/50"
                    >
                      {ledgerAiLoading ? 'Analizando…' : 'Auditoría IA'}
                    </button>
                  </div>
                  {ledgerAiReply && (
                    <p className="whitespace-pre-line border border-slate-800 bg-[#05080f] p-2.5 text-[11px] text-slate-200">
                      {ledgerAiReply}
                    </p>
                  )}
                </div>

                <div className="h-60 border border-slate-800 bg-[#0b111e] p-4">
                  <div className="mb-2 font-semibold text-white">Balance por Categoría (USD)</div>
                  <ResponsiveContainer width="100%" height="88%">
                    <BarChart data={ledgerSummary.categoryBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#05080f', borderColor: '#1e293b', fontSize: 11 }} />
                      <Bar dataKey="amountUsd" fill="#38bdf8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* 9. AURA-7 & SIEM RING BUFFER */}
          {activeId === 'aura_siem' && (
            <div className="space-y-3 border border-slate-800 bg-[#0b111e] p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-white">Ring Buffer L2-Security (128 slots · Cadena FNV-1a)</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      siemRing.push('L2-SEC', 'Chequeo de integridad de memoria', 'GUARD');
                      setSiemTick((t) => t + 1);
                    }}
                    className="bg-sky-500 px-2.5 py-1 font-semibold text-slate-950"
                  >
                    Inyectar Evento
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      siemRing.push('AURA-7', 'Simulación de respaldo local ante cuota 429', 'WARN');
                      setSiemTick((t) => t + 1);
                    }}
                    className="border border-amber-500/50 bg-amber-500/15 px-2.5 py-1 text-amber-200"
                  >
                    Probar Failsafe 429
                  </button>
                </div>
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                {siemEvents.map((ev) => (
                  <div key={ev.seq} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/70 py-1.5">
                    <span className="text-slate-200">
                      #{ev.seq} [{ev.module}] {ev.action}
                    </span>
                    <span className="text-slate-400 tabular-nums">
                      FNV1a={ev.fnvHash} · {ev.durationMs} ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10. KITS NATIVOS & ARCHIVO FUNDACIONAL */}
          {activeId === 'native_kits' && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'go-thermal', label: 'Go · Aether Thermal' },
                    { id: 'go-collatz-26', label: 'Go · Collatz 26 Glifos' },
                    { id: 'python-omega-verify', label: 'Python · Omega Verify Z3' },
                    { id: 'ts-crystal-vault', label: 'TS · Crystal Vault 64B' },
                    { id: 'solidity-merit', label: 'Solidity · MeritoOmega' },
                  ] as { id: NativeKitId; label: string }[]
                ).map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setSelectedKit(k.id)}
                    className={`border px-2.5 py-1.5 font-medium ${
                      selectedKit === k.id
                        ? 'border-sky-500/50 bg-sky-500/15 text-sky-200'
                        : 'border-slate-800 bg-[#0b111e] text-slate-400 hover:text-white'
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>

              <div className="border border-slate-800 bg-[#0b111e] p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white">{nativeKit.title}</div>
                    <div className="text-[11px] text-slate-400">
                      Runtime requerido: {nativeKit.requiresLocalRuntime}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(nativeKit.code).catch(() => {});
                        setCopiedKit(true);
                        setTimeout(() => setCopiedKit(false), 1600);
                      }}
                      className="inline-flex items-center gap-1 border border-slate-700 bg-[#05080f] px-2.5 py-1.5 text-[11px] text-slate-200"
                    >
                      {copiedKit ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedKit ? 'Copiado' : 'Copiar'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([nativeKit.code], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = nativeKit.filename;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="inline-flex items-center gap-1 bg-sky-500 px-2.5 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-sky-400"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Descargar {nativeKit.filename}</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-amber-200">{nativeKit.honestScope}</p>
                <pre className="max-h-72 overflow-auto border border-slate-800 bg-[#04070e] p-3 font-mono text-[11px] leading-relaxed text-emerald-300">
                  {nativeKit.code}
                </pre>
              </div>

              {/* Archivo Fundacional / Visión Hardware */}
              <div className="border border-slate-800 bg-[#0b111e] p-4 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <HardDrive className="h-4 w-4 text-slate-400" />
                  <span>Archivo Fundacional · Separación Software Actual vs Visión Hardware</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Lo que corre hoy en PC/Navegador/Node: VM HELIX de 33 primos, Física Brus/Cauchy/IGZO/Pauli-SoA,
                  Crystal Vault 64B, Zero-G, Collatz, Web Audio, Gemini API y los Kits descargables en Go/Python/Solidity.
                </p>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Visión hardware a futuro (investigación conceptual, no medida por el navegador): auriculares de
                  conducción ósea con grafeno CVD y prototipos físicos dedicados mientras este entorno sirve como su
                  consola de software y simulación previa.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
