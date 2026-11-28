import { ChangeEvent, KeyboardEvent, RefObject, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Copy,
  ImagePlus,
  MessageSquare,
  Mic,
  MicOff,
  Play,
  Send,
  SlidersHorizontal,
  Terminal,
  Volume2,
  VolumeX,
  X,
  BookOpenCheck,
} from 'lucide-react';
import {
  analyzeCollatzBigInt,
  auditBirkhoffVonNeumannVsTotalOrder,
  computeCoupledNanotechBiopixelState,
  computeFresnelReflectance,
  computeGaldrOctaveFrequency,
  CrystalVault64B,
  evaluateUnifiedBiopixelEquation,
  HelixCoreEngine,
  runZeroGOrbitComparison,
  simulateKuramotoPhaseCore,
  verifyTerrainParametersFormal,
} from '../core';
import { VoiceGender } from '../utils/cochlearPulseSynth';
import { runHelixTestSuite } from '../utils/helixTests';
import type { LiquidMorphShape } from './LiquidBiopixelCanvas';

export interface DockChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  latencyMs?: number;
}

export type RightDockTab = 'chat' | 'cli' | 'colab';

interface CliEntry {
  id: string;
  cmd: string;
  output: string;
  durationMs: number;
  status: 'ok' | 'err' | 'info';
}

interface ColabCellSpec {
  id: string;
  title: string;
  domain: string;
  shapeHint: LiquidMorphShape;
  defaultParams: Record<string, string>;
  description: string;
}

const COLAB_CELLS: ColabCellSpec[] = [
  {
    id: 'brus_cauchy',
    title: '01. Confinamiento Cuántico de Brus (CdSe) + Cauchy n(λ)',
    domain: 'Estado Sólido · Óptica',
    shapeHint: 'crystal',
    defaultParams: { lambdaNm: '532', stress: '0.35' },
    description: 'Resuelve el radio R del punto cuántico CdSe y la dispersión de Cauchy n(λ) + CIE 1931.',
  },
  {
    id: 'fresnel',
    title: '02. Reflectancia Óptica de Fresnel R(θ) y Ángulo de Brewster',
    domain: 'Óptica Electromagnética',
    shapeHint: 'crystal',
    defaultParams: { thetaDeg: '56.6', n1: '1.0', n2: '1.52' },
    description: 'Calcula Rs, Rp, R_avg, transmitancia y ángulo de Brewster en la interfaz óptica.',
  },
  {
    id: 'igzo_wkb',
    title: '03. Transistor IGZO + Tunelamiento WKB + Mott-Gurney SCLC',
    domain: 'Nanotecnología · Semiconductores',
    shapeHint: 'quantum_bloch',
    defaultParams: { vGs: '2.4', vDs: '3.2', thicknessNm: '42' },
    description: 'Acopla corriente de drenaje IGZO, corriente Fowler-Nordheim WKB y límite de carga espacial.',
  },
  {
    id: 'galdr_weber',
    title: '04. Armonía Rúnica Galdr + Ecuación Unificada S_BioPixel',
    domain: 'Acústica P₃₃ · Psicofísica',
    shapeHint: 'cymatic_wave',
    defaultParams: { prime: '137', cFront: '0.55' },
    description: 'Evalúa f_r(p) = 261.6256·p / 2^⌊log2 p⌋ y el operador ΔZ = tanh(C_f - C_b).',
  },
  {
    id: 'collatz_entropy',
    title: '05. Órbita Collatz BigInt + Entropía Binaria de Shannon',
    domain: 'Teoría de Números · Q-Omega',
    shapeHint: 'torus',
    defaultParams: { seed: '9780657630' },
    description: 'Calcula tiempo de parada exacto en BigInt, pico máximo y entropía par/impar.',
  },
  {
    id: 'zero_g',
    title: '06. Astrodinámica Zero-G · Verlet Simpléctico vs Euler',
    domain: 'Mecánica Orbital',
    shapeHint: 'orbital_ship',
    defaultParams: { radiusKm: '6771', eccentricity: '0.28', steps: '220' },
    description: 'Compara deriva de energía ΔE/E₀ entre integrador simpléctico Verlet y Euler explícito.',
  },
  {
    id: 'bvn_qomega',
    title: '07. Retículo Cuántico Birkhoff-von Neumann vs Orden Clásico',
    domain: 'Lógica Cuántica · Q-Omega',
    shapeHint: 'quantum_bloch',
    defaultParams: { couplingK: '2.4', oscillators: '24' },
    description: 'Verifica la no-distributividad en C² junto al parámetro de sincronización de fase Kuramoto R.',
  },
];

interface EngineeringRightDockProps {
  activeTab: RightDockTab;
  onChangeTab: (tab: RightDockTab) => void;
  onCloseDock: () => void;
  engine: HelixCoreEngine;
  // Chat props
  companionName: string;
  guardianName: string;
  geminiConfigured: boolean;
  aiErrorNotice: string | null;
  messages: DockChatMessage[];
  isThinking: boolean;
  inputText: string;
  onInputTextChange: (value: string) => void;
  onSendInstruction: (overrideText?: string) => Promise<void>;
  voiceEnabled: boolean;
  onToggleVoiceOutput: () => void;
  voiceGender: VoiceGender;
  onSelectVoiceGender: (gender: VoiceGender) => void;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  onSelectVoiceURI: (uri: string) => void;
  micActive: boolean;
  micNotice: string | null;
  onToggleMic: () => void;
  attachedImageName: string | null;
  onClearAttachedImage: () => void;
  onAttachFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  cameraInputRef: RefObject<HTMLInputElement | null>;
  chatEndRef: RefObject<HTMLDivElement | null>;
  onProjectShape: (shape: LiquidMorphShape, accentHex?: string) => void;
  onTriggerOmega: () => void;
  onTriggerRecombine: (ids: string[]) => void;
}

export function EngineeringRightDock({
  activeTab,
  onChangeTab,
  onCloseDock,
  engine,
  companionName,
  guardianName,
  geminiConfigured,
  aiErrorNotice,
  messages,
  isThinking,
  inputText,
  onInputTextChange,
  onSendInstruction,
  voiceEnabled,
  onToggleVoiceOutput,
  voiceGender,
  onSelectVoiceGender,
  availableVoices,
  selectedVoiceURI,
  onSelectVoiceURI,
  micActive,
  micNotice,
  onToggleMic,
  attachedImageName,
  onClearAttachedImage,
  onAttachFileChange,
  fileInputRef,
  cameraInputRef,
  chatEndRef,
  onProjectShape,
  onTriggerOmega,
  onTriggerRecombine,
}: EngineeringRightDockProps) {
  const [showMediaPanel, setShowMediaPanel] = useState(false);

  // CLI / PowerShell state
  const vaultRef = useRef<CrystalVault64B | null>(null);
  const [cliInput, setCliInput] = useState('');
  const [cliHistory, setCliHistory] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState<number>(-1);
  const [copiedPs, setCopiedPs] = useState(false);
  const [cliLogs, setCliLogs] = useState<CliEntry[]>([
    {
      id: 'boot-cli',
      cmd: 'help',
      output: [
        'HELIX-CLI v2.0 + Puente PowerShell listos.',
        'Comandos: status | physics brus <nm> | fresnel <deg> <n2> | galdr <p> | collatz <n>',
        '          phase <N> <K> | vault init|write <amt> <cta>|audit|purge | omega | test | ps-script',
      ].join('\n'),
      durationMs: 0.1,
      status: 'info',
    },
  ]);

  // Colab Notebook state
  const [cellParams, setCellParams] = useState<Record<string, Record<string, string>>>(() => {
    const init: Record<string, Record<string, string>> = {};
    for (const c of COLAB_CELLS) {
      init[c.id] = { ...c.defaultParams };
    }
    return init;
  });
  const [cellOutputs, setCellOutputs] = useState<
    Record<string, { text: string; durationMs: number; status: 'ok' | 'err' }>
  >({});

  const windowsPowerShellSnippet = useMemo(
    () =>
      [
        '# Sonda local Windows PowerShell para HELIX Workstation',
        'Get-PSDrive C | Select-Object Name, @{N="FreeGB";E={[math]::Round($_.Free/1GB,2)}}',
        'Get-Process ollama,node,go -ErrorAction SilentlyContinue | Select-Object Name,Id,CPU',
        'Invoke-RestMethod -Uri "http://localhost:3000/api/companion/status" | ConvertTo-Json',
      ].join('\n'),
    [],
  );

  const appendCli = (cmd: string, output: string, durationMs: number, status: CliEntry['status'] = 'ok') => {
    setCliLogs((prev) => [
      ...prev.slice(-40),
      { id: `${Date.now()}_${prev.length}`, cmd, output, durationMs, status },
    ]);
  };

  const executeCliCommand = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setCliHistory((prev) => [trimmed, ...prev.slice(0, 29)]);
    setHistoryCursor(-1);
    setCliInput('');

    const parts = trimmed.split(/\s+/);
    const head = parts[0].toLowerCase();
    const t0 = performance.now();

    if (head === 'clear' || head === 'cls') {
      setCliLogs([]);
      return;
    }

    if (head === 'help') {
      appendCli(
        trimmed,
        [
          'Comandos locales deterministas:',
          '  physics brus <lambda_nm>     -> Ecuación de Brus CdSe + Cauchy + IGZO + CIE 1931',
          '  fresnel <theta_deg> [n2]     -> Reflectancia Fresnel Rs/Rp/Brewster',
          '  galdr <primo>                -> Frecuencia Galdr 261.6256*p/2^floor(log2 p)',
          '  collatz <entero>             -> Órbita BigInt 3n+1 + Entropía Shannon',
          '  phase [N] [K]                -> Sincronización Kuramoto (Order Parameter R)',
          '  vault init|write|audit|purge -> Bóveda binaria 64B cache-aligned + FNV-1a',
          '  recombine <idA> <idB>        -> Recombinar dos herramientas del catálogo HELIX',
          '  omega                        -> Gran recombinación 23 motores × 33 disciplinas',
          '  test                         -> Ejecutar suite completa de verificación HELIX',
          '  status | probe-win32         -> Consultar telemetría real del servidor Express',
          '  ps-script                    -> Generar script PowerShell para host Windows local',
        ].join('\n'),
        Number((performance.now() - t0).toFixed(3)),
        'info',
      );
      return;
    }

    if (head === 'ps-script') {
      appendCli(trimmed, windowsPowerShellSnippet, Number((performance.now() - t0).toFixed(3)), 'info');
      return;
    }

    if (head === 'physics' && parts[1]?.toLowerCase() === 'brus') {
      const lam = Number(parts[2] ?? '532');
      const res = computeCoupledNanotechBiopixelState({ lambdaNm: Number.isFinite(lam) ? lam : 532 });
      onProjectShape('crystal', '#22d3ee');
      appendCli(
        trimmed,
        `CdSe Brus (λ=${res.brusCauchy.lambdaNm} nm): R=${res.brusCauchy.radiusNm} nm · E=${res.brusCauchy.photonEnergyEv} eV · n(λ)=${res.brusCauchy.cauchyRefractiveIndex} · CIE(${res.cieEqe.cieX}, ${res.cieEqe.cieY}) · EQE=${res.cieEqe.eqePercent}%`,
        Number((performance.now() - t0).toFixed(3)),
      );
      return;
    }

    if (head === 'fresnel') {
      const deg = Number(parts[1] ?? '45');
      const n2 = Number(parts[2] ?? '1.52');
      const res = computeFresnelReflectance(Number.isFinite(deg) ? deg : 45, 1.0, Number.isFinite(n2) ? n2 : 1.52);
      appendCli(
        trimmed,
        `Fresnel θ=${res.thetaDeg}° (n1=${res.n1} -> n2=${res.n2}): Rs=${res.rs} · Rp=${res.rp} · R_avg=${res.rAvg} · T=${res.transmittanceAvg} · Brewster=${res.brewsterAngleDeg}°`,
        Number((performance.now() - t0).toFixed(3)),
      );
      return;
    }

    if (head === 'galdr') {
      const p = Number(parts[1] ?? '137');
      const res = computeGaldrOctaveFrequency(Number.isFinite(p) ? p : 137);
      onProjectShape('cymatic_wave', '#38bdf8');
      appendCli(
        trimmed,
        `Galdr p=${res.prime}: f=${res.frequencyHz} Hz (2^k=${res.octaveDivisor}) · MIDI≈${res.nearestMidi} (${res.centsOffset >= 0 ? '+' : ''}${res.centsOffset} cents)`,
        Number((performance.now() - t0).toFixed(3)),
      );
      return;
    }

    if (head === 'collatz') {
      const res = analyzeCollatzBigInt(parts[1] ?? '27');
      appendCli(
        trimmed,
        `Collatz(n=${res.seedStr}): pasos=${res.stoppingTime} · pico=${res.peakStr} · impar=${res.oddSteps} / par=${res.evenSteps} · H=${res.shannonBitEntropy} bits`,
        Number((performance.now() - t0).toFixed(3)),
      );
      return;
    }

    if (head === 'phase') {
      const n = Number(parts[1] ?? '24');
      const k = Number(parts[2] ?? '2.4');
      const res = simulateKuramotoPhaseCore(Number.isFinite(n) ? n : 24, Number.isFinite(k) ? k : 2.4);
      appendCli(
        trimmed,
        `Kuramoto PhaseCore (N=${res.oscillators}, K=${res.couplingK}): R0=${res.initialOrderParameter} -> Rf=${res.finalOrderParameter} · sincronizado=${res.synchronized}`,
        Number((performance.now() - t0).toFixed(3)),
      );
      return;
    }

    if (head === 'vault') {
      const sub = (parts[1] ?? 'audit').toLowerCase();
      if (sub === 'init' || !vaultRef.current) {
        vaultRef.current = new CrystalVault64B(32);
        const gen = vaultRef.current.appendRecord('GENESIS', 1000, 'helix_root', 0x0137);
        appendCli(
          trimmed,
          gen.ok
            ? `Bóveda CrystalVault64B inicializada (2048 B). Slot 0 GENESIS balance=${gen.record.balanceUnits} · FNV1a=${gen.record.storedChecksumHex}`
            : gen.error,
          Number((performance.now() - t0).toFixed(3)),
          gen.ok ? 'ok' : 'err',
        );
        if (sub === 'init') return;
      }
      const v = vaultRef.current!;
      if (sub === 'write') {
        const amt = Number(parts[2] ?? '250');
        const acct = parts[3] ?? 'lab_cuenta';
        const res = v.appendRecord('TRANSFER', Number.isFinite(amt) ? amt : 250, acct);
        appendCli(
          trimmed,
          res.ok
            ? `Slot ${res.record.slot} TRANSFER (${res.record.amountUnits}) -> balance=${res.record.balanceUnits} · FNV1a=${res.record.storedChecksumHex}`
            : res.error,
          Number((performance.now() - t0).toFixed(3)),
          res.ok ? 'ok' : 'err',
        );
        return;
      }
      if (sub === 'purge') {
        const p = v.securePurge();
        appendCli(
          trimmed,
          `Quantum Vanish completado: ${p.bytesZeroed} bytes en cero (${p.postPurgeNonZeroBytes} bytes residuales).`,
          Number((performance.now() - t0).toFixed(3)),
        );
        return;
      }
      const rep = v.verifyFiveInvariants();
      appendCli(
        trimmed,
        `CrystalVault audit (${rep.recordCount}/${rep.capacitySlots} slots · R8UI ${rep.r8uiDimensions.width}x${rep.r8uiDimensions.height}): ${rep.valid ? '5/5 INVARIANTES OK' : 'FALLO'}\n` +
          rep.invariants.map((i) => `  [${i.passed ? 'OK' : 'FAIL'}] ${i.name}: ${i.detail}`).join('\n'),
        Number((performance.now() - t0).toFixed(3)),
        rep.valid ? 'ok' : 'err',
      );
      return;
    }

    if (head === 'recombine') {
      const idA = parts[1] ?? '201_chemistry_nernst_gibbs';
      const idB = parts[2] ?? '200_nanotech_biopixel_z4';
      onTriggerRecombine([idA, idB]);
      appendCli(
        trimmed,
        `Recombinación enviada al núcleo (${idA} × ${idB}) y proyectada al visor.`,
        Number((performance.now() - t0).toFixed(3)),
      );
      return;
    }

    if (head === 'omega') {
      onTriggerOmega();
      appendCli(
        trimmed,
        'Gran recombinación Omega (23 motores × 33 disciplinas) ejecutada y proyectada al visor.',
        Number((performance.now() - t0).toFixed(3)),
      );
      return;
    }

    if (head === 'test') {
      const suite = runHelixTestSuite();
      const passed = suite.filter((t) => t.passed).length;
      const failed = suite.filter((t) => !t.passed);
      appendCli(
        trimmed,
        `Suite HELIX: ${passed}/${suite.length} pruebas aprobadas` +
          (failed.length ? `\nFallos: ${failed.map((f) => f.id).join(', ')}` : ' · Cero regresiones.'),
        Number((performance.now() - t0).toFixed(3)),
        failed.length === 0 ? 'ok' : 'err',
      );
      return;
    }

    if (head === 'status' || head === 'probe-win32') {
      try {
        const res = await fetch('/api/cli/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: head }),
        });
        const data = await res.json();
        appendCli(
          trimmed,
          JSON.stringify(data, null, 2),
          Number((performance.now() - t0).toFixed(3)),
          res.ok ? 'ok' : 'err',
        );
      } catch {
        appendCli(
          trimmed,
          `Modo offline local: ${engine.getRegisteredTools().length} herramientas activas en memoria.`,
          Number((performance.now() - t0).toFixed(3)),
          'info',
        );
      }
      return;
    }

    appendCli(
      trimmed,
      `Comando no reconocido: "${head}". Escribe "help" para ver la lista completa.`,
      Number((performance.now() - t0).toFixed(3)),
      'err',
    );
  };

  const handleCliKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void executeCliCommand(cliInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cliHistory.length > 0) {
        const nextIdx = Math.min(cliHistory.length - 1, historyCursor + 1);
        setHistoryCursor(nextIdx);
        setCliInput(cliHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyCursor <= 0) {
        setHistoryCursor(-1);
        setCliInput('');
      } else {
        const nextIdx = historyCursor - 1;
        setHistoryCursor(nextIdx);
        setCliInput(cliHistory[nextIdx]);
      }
    }
  };

  const runColabCell = (cell: ColabCellSpec) => {
    const params = cellParams[cell.id] ?? cell.defaultParams;
    const t0 = performance.now();
    try {
      let text = '';
      if (cell.id === 'brus_cauchy') {
        const lam = Number(params.lambdaNm) || 532;
        const stress = Number(params.stress) || 0.35;
        const st = computeCoupledNanotechBiopixelState({ lambdaNm: lam, tension: stress });
        text = [
          `E_fotón = ${st.brusCauchy.photonEnergyEv} eV · Radio Brus CdSe R = ${st.brusCauchy.radiusNm} nm`,
          `Cauchy n(${st.brusCauchy.lambdaNm}nm) = ${st.brusCauchy.cauchyRefractiveIndex} · Capa AR = ${st.brusCauchy.antiReflectiveThicknessNm} nm`,
          `CIE 1931 (x=${st.cieEqe.cieX}, y=${st.cieEqe.cieY}) · η_EQE = ${st.cieEqe.eqePercent}%`,
          `Cristal Z4 ω_eigen = ${st.photonicCrystal.eigenFrequencyThz} THz · EUV pitch = ${st.rayleighEuv.latticePitchPmBigInt} pm`,
        ].join('\n');
      } else if (cell.id === 'fresnel') {
        const r = computeFresnelReflectance(
          Number(params.thetaDeg) || 56.6,
          Number(params.n1) || 1.0,
          Number(params.n2) || 1.52,
        );
        text = [
          `θ_incidencia = ${r.thetaDeg}° · Ángulo de Brewster = ${r.brewsterAngleDeg}°`,
          `Reflectancia Rs = ${r.rs} · Rp = ${r.rp} · R_avg = ${r.rAvg}`,
          `Transmitancia T_avg = ${r.transmittanceAvg} · TIR = ${r.totalInternalReflection ? 'SÍ' : 'NO'}`,
        ].join('\n');
      } else if (cell.id === 'igzo_wkb') {
        const vGs = Number(params.vGs) || 2.4;
        const vDs = Number(params.vDs) || 3.2;
        const st = computeCoupledNanotechBiopixelState({ vGs, vDs, tension: 0.45 });
        text = [
          `IGZO régimen = ${st.igzo.regime} · I_ds = ${st.igzo.currentAmps.toExponential(3)} A`,
          `WKB T(E) = ${st.wkbTunneling.transmissionProb} · J_FN = ${st.wkbTunneling.fowlerNordheimCurrentAcm2} A/cm²`,
          `Mott-Gurney SCLC J = ${st.mottGurney.currentDensityAcm2} A/cm² · C_esp = ${st.mottGurney.spaceChargeCapacitanceFm2} F/m²`,
        ].join('\n');
      } else if (cell.id === 'galdr_weber') {
        const g = computeGaldrOctaveFrequency(Number(params.prime) || 137);
        const u = evaluateUnifiedBiopixelEquation({ cFront: Number(params.cFront) || 0.55 });
        text = [
          `Galdr(p=${g.prime}) = ${g.frequencyHz} Hz · MIDI ${g.nearestMidi} (desvío ${g.centsOffset} cents)`,
          `Dual Z4: C_f=${u.cFront}, C_b=${u.cBack} -> ΔZ = ${u.deltaZ}`,
          `Kelvin-Voigt = ${u.kelvinVoigtStress} · Curl ∇·v = ${u.curlDivergence} · S_BioPixel = ${u.sBiopixelMagnitude}`,
          `Decisión Weber (k=0.045): ${u.weberDecision} (ΔI/I=${u.weberDeltaRatio}) · ${u.guardStatus}`,
        ].join('\n');
      } else if (cell.id === 'collatz_entropy') {
        const c = analyzeCollatzBigInt(params.seed || '9780657630');
        text = [
          `Semilla BigInt = ${c.seedStr}`,
          `Tiempo de parada = ${c.stoppingTime} pasos (${c.oddSteps} impares, ${c.evenSteps} pares)`,
          `Valor pico = ${c.peakStr}`,
          `Entropía binaria de trayectoria H = ${c.shannonBitEntropy} bits`,
        ].join('\n');
      } else if (cell.id === 'zero_g') {
        const z = runZeroGOrbitComparison(
          Number(params.radiusKm) || 6771,
          Number(params.eccentricity) || 0.28,
          Number(params.steps) || 220,
        );
        text = [
          `Órbita r₀=${z.initialRadiusKm} km · e=${z.eccentricity} · r_Schwarzschild=${z.schwarzschildMeters} m`,
          `Deriva energética Verlet = ${z.verletEnergyDriftRatio} vs Euler = ${z.eulerEnergyDriftRatio}`,
          `Momento angular L = ${z.angularMomentumVerlet} km²/s · Invariantes: ${z.invariantsOk ? 'OK' : 'DESVÍO'}`,
        ].join('\n');
      } else if (cell.id === 'bvn_qomega') {
        const audit = auditBirkhoffVonNeumannVsTotalOrder();
        const phase = simulateKuramotoPhaseCore(
          Number(params.oscillators) || 24,
          Number(params.couplingK) || 2.4,
        );
        const terrainCheck = verifyTerrainParametersFormal({
          amplitude: 14,
          octaves: 5,
          persistence: 0.52,
          frequency: 0.14,
          seed: 137,
        });
        text = [
          `Birkhoff-von Neumann distributivo = ${audit.quantumLatticeDistributive} (||Δ||=${audit.frobeniusWitnessDiff})`,
          `Índice clásico glifos distributivo = ${audit.classicalGlyphIndexDistributive}`,
          `Kuramoto (N=${phase.oscillators}, K=${phase.couplingK}): R₀=${phase.initialOrderParameter} -> Rf=${phase.finalOrderParameter}`,
          `Invariante terreno fBm: ${terrainCheck.status} · ULP(0.1+0.2, 0.3)=${terrainCheck.ulpEpsilonCheck}`,
        ].join('\n');
      }

      setCellOutputs((prev) => ({
        ...prev,
        [cell.id]: {
          text,
          durationMs: Number((performance.now() - t0).toFixed(3)),
          status: 'ok',
        },
      }));
    } catch (err) {
      setCellOutputs((prev) => ({
        ...prev,
        [cell.id]: {
          text: err instanceof Error ? err.message : String(err),
          durationMs: Number((performance.now() - t0).toFixed(3)),
          status: 'err',
        },
      }));
    }
  };

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-800 bg-[#070b14] text-slate-100">
      {/* Cabecera del Dock Derecho */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'chat', label: 'Chat Técnico', icon: MessageSquare },
              { id: 'cli', label: 'PowerShell CLI', icon: Terminal },
              { id: 'colab', label: 'Notebook Colab', icon: BookOpenCheck },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChangeTab(t.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border border-sky-500/50 bg-sky-500/15 text-sky-200'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onCloseDock}
          aria-label="Ocultar panel derecho"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* TAB 1: CHAT SIMBIÓTICO Y TÉCNICO */}
      {activeTab === 'chat' && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-slate-800/80 px-3.5 py-2 text-xs text-slate-400">
            <span className="truncate font-medium text-slate-200">
              {companionName}
              {guardianName ? ` · con ${guardianName}` : ''}
            </span>
            <span className="shrink-0 font-mono text-[11px] tabular-nums">
              {geminiConfigured ? 'Gemini + Núcleo HELIX' : 'Núcleo Local HELIX'}
            </span>
          </div>

          {aiErrorNotice && (
            <div className="border-b border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs text-amber-200">
              {aiErrorNotice}
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[94%] whitespace-pre-line border px-3 py-2 text-xs leading-relaxed ${
                      isUser
                        ? 'border-sky-500/40 bg-sky-500/15 text-sky-50'
                        : 'border-slate-800 bg-[#0b111e] text-slate-100'
                    }`}
                  >
                    {msg.text}
                    {typeof msg.latencyMs === 'number' && !isUser && (
                      <div className="mt-1.5 font-mono text-[10px] tabular-nums text-slate-500">
                        {msg.latencyMs.toFixed(1)} ms
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isThinking && (
              <div className="text-xs text-sky-300">Procesando diálogo y moldeando el visor…</div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Atajos creativos rápidos */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-slate-800/80 px-3 py-2">
            {[
              { label: 'Océano 3D', prompt: 'Crea un océano hiperrealista con olas al atardecer' },
              { label: 'Juego Aventura', prompt: 'Crea un juego de aventura en un bosque luminoso con música' },
              {
                label: 'Cuento en Vivo',
                prompt:
                  'Escanea este cuento: Caperucita caminaba por el bosque verde con su capa roja. De pronto apareció el lobo bajo la luna en la noche. Al final llegó a salvo al castillo.',
              },
              { label: 'Nave Orbital', prompt: 'Lleva la nave espacial alrededor del planeta con anillos' },
              { label: 'Molécula Morse', prompt: 'Simula una molécula química en 3D con enlace Morse' },
            ].map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => void onSendInstruction(q.prompt)}
                className="shrink-0 whitespace-nowrap border border-slate-800 bg-[#0b111e] px-2.5 py-1 text-[11px] text-slate-300 hover:border-sky-500/50 hover:text-white"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Controles de entrada */}
          <div className="border-t border-slate-800 p-2.5">
            {attachedImageName && (
              <div className="mb-2 flex items-center justify-between border border-sky-500/30 bg-[#0b111e] px-2.5 py-1 text-xs text-sky-200">
                <span className="truncate">Muestra: {attachedImageName}</span>
                <button
                  type="button"
                  onClick={onClearAttachedImage}
                  aria-label="Quitar muestra"
                  className="ml-2 text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {micNotice && <p className="mb-1.5 text-[11px] text-amber-300">{micNotice}</p>}

            {showMediaPanel && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5 border border-slate-800 bg-[#0b111e] p-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.txt,.md,.hlx"
                  onChange={onAttachFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-7 items-center gap-1 whitespace-nowrap border border-slate-700 bg-[#05080f] px-2 text-[11px] text-slate-200 hover:border-slate-500"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  <span>Foto / .hlx</span>
                </button>
                <button
                  type="button"
                  onClick={onToggleVoiceOutput}
                  className={`inline-flex h-7 items-center gap-1 whitespace-nowrap border px-2 text-[11px] ${
                    voiceEnabled
                      ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                      : 'border-slate-700 bg-[#05080f] text-slate-400'
                  }`}
                >
                  {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  <span>{voiceEnabled ? 'Voz activa' : 'Voz apagada'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectVoiceGender('female')}
                  className={`h-7 px-2 text-[11px] ${
                    voiceGender === 'female' ? 'bg-slate-700 text-white' : 'text-slate-400'
                  }`}
                >
                  Fem
                </button>
                <button
                  type="button"
                  onClick={() => onSelectVoiceGender('male')}
                  className={`h-7 px-2 text-[11px] ${
                    voiceGender === 'male' ? 'bg-slate-700 text-white' : 'text-slate-400'
                  }`}
                >
                  Masc
                </button>
                <select
                  aria-label="Selector de Voz"
                  value={selectedVoiceURI}
                  onChange={(e) => onSelectVoiceURI(e.target.value)}
                  className="h-7 max-w-[140px] truncate border border-slate-700 bg-[#05080f] px-1.5 text-[11px] text-slate-200"
                >
                  <option value="">Auto ({voiceGender === 'female' ? 'Fem' : 'Masc'})</option>
                  {availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowMediaPanel((v) => !v)}
                aria-label="Imagen y voz"
                title="Imagen, .hlx y voz"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-slate-800 bg-[#0b111e] text-slate-300 hover:border-sky-500/40 hover:text-white"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onToggleMic}
                aria-label={micActive ? 'Detener micrófono' : 'Hablar'}
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center border ${
                  micActive
                    ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                    : 'border-slate-800 bg-[#0b111e] text-slate-300 hover:border-sky-500/40 hover:text-white'
                }`}
              >
                {micActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onAttachFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                aria-label="Cámara óptica"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-slate-800 bg-[#0b111e] text-slate-300 hover:border-sky-500/40 hover:text-white"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                type="text"
                value={inputText}
                onChange={(e) => onInputTextChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void onSendInstruction();
                  }
                }}
                placeholder="Conversa con Helix o describe una escena…"
                className="h-9 min-w-0 flex-1 border border-slate-800 bg-[#0b111e] px-2.5 text-xs text-white placeholder:text-slate-500 focus:border-sky-500/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void onSendInstruction()}
                disabled={!inputText.trim() && !attachedImageName}
                aria-label="Enviar"
                className="inline-flex h-9 shrink-0 items-center justify-center bg-sky-500 px-3 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: POWERSHELL + HELIX CLI */}
      {activeTab === 'cli' && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3 py-2 text-[11px]">
            <div className="flex flex-wrap gap-1">
              {[
                { label: 'status', cmd: 'status' },
                { label: 'brus 532', cmd: 'physics brus 532' },
                { label: 'galdr 137', cmd: 'galdr 137' },
                { label: 'vault audit', cmd: 'vault audit' },
                { label: 'test', cmd: 'test' },
              ].map((preset) => (
                <button
                  key={preset.cmd}
                  type="button"
                  onClick={() => void executeCliCommand(preset.cmd)}
                  className="border border-slate-800 bg-[#0b111e] px-2 py-1 font-mono text-[10px] text-slate-300 hover:border-sky-500/50 hover:text-white"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(windowsPowerShellSnippet).catch(() => {});
                setCopiedPs(true);
                setTimeout(() => setCopiedPs(false), 1600);
              }}
              className="inline-flex items-center gap-1 border border-slate-700 bg-[#0b111e] px-2 py-1 text-[10px] text-sky-300 hover:border-sky-500/50"
            >
              {copiedPs ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span>{copiedPs ? 'Copiado PS1' : 'Copiar .ps1'}</span>
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-[#04070e] p-3 font-mono text-[11px]">
            {cliLogs.map((entry) => (
              <div key={entry.id} className="border-b border-slate-800/70 pb-2">
                <div className="flex items-center justify-between text-sky-300">
                  <span>PS HELIX&gt; {entry.cmd}</span>
                  <span className="text-[10px] tabular-nums text-slate-500">{entry.durationMs} ms</span>
                </div>
                <pre
                  className={`mt-1 whitespace-pre-wrap break-words leading-relaxed ${
                    entry.status === 'err'
                      ? 'text-rose-300'
                      : entry.status === 'info'
                        ? 'text-slate-300'
                        : 'text-emerald-300'
                  }`}
                >
                  {entry.output}
                </pre>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-slate-800 bg-[#070b14] p-2.5 font-mono text-xs">
            <span className="shrink-0 text-sky-400">PS&gt;</span>
            <input
              type="text"
              value={cliInput}
              onChange={(e) => setCliInput(e.target.value)}
              onKeyDown={handleCliKeyDown}
              placeholder="Escribe comando (ej: physics brus 480, collatz 27, test)…"
              className="h-8 min-w-0 flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void executeCliCommand(cliInput)}
              className="bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-400"
            >
              Ejecutar
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: NOTEBOOK COLAB EJECUTABLE */}
      {activeTab === 'colab' && (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-xs">
          <div className="flex items-center justify-between border border-slate-800 bg-[#0b111e] px-3 py-2">
            <div>
              <div className="font-semibold text-white">Cuaderno Compendio HELIX</div>
              <div className="text-[11px] text-slate-400">
                Celdas deterministas ejecutables en vivo sin MockData.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                for (const c of COLAB_CELLS) runColabCell(c);
              }}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap bg-sky-500 px-2.5 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-sky-400"
            >
              <Play className="h-3 w-3" />
              <span>Ejecutar Todo</span>
            </button>
          </div>

          {COLAB_CELLS.map((cell) => {
            const params = cellParams[cell.id] ?? cell.defaultParams;
            const out = cellOutputs[cell.id];
            return (
              <div key={cell.id} className="border border-slate-800 bg-[#0b111e] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] text-slate-400">{cell.domain}</div>
                    <div className="mt-0.5 font-semibold text-white">{cell.title}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onProjectShape(cell.shapeHint, '#38bdf8')}
                      className="border border-slate-700 bg-[#05080f] px-2 py-1 text-[10px] text-slate-200 hover:border-sky-500/50"
                    >
                      Proyectar 3D
                    </button>
                    <button
                      type="button"
                      onClick={() => runColabCell(cell)}
                      className="inline-flex items-center gap-1 bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-slate-950 hover:bg-emerald-400"
                    >
                      <Play className="h-3 w-3" />
                      <span>Ejecutar</span>
                    </button>
                  </div>
                </div>

                <p className="mt-1 text-[11px] text-slate-400">{cell.description}</p>

                <div className="mt-2.5 flex flex-wrap gap-2">
                  {Object.entries(params).map(([key, val]) => (
                    <label key={key} className="flex items-center gap-1.5 border border-slate-800 bg-[#05080f] px-2 py-1">
                      <span className="font-mono text-[10px] text-slate-400">{key}=</span>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) =>
                          setCellParams((prev) => ({
                            ...prev,
                            [cell.id]: { ...(prev[cell.id] ?? {}), [key]: e.target.value },
                          }))
                        }
                        className="w-20 bg-transparent font-mono text-[11px] tabular-nums text-sky-200 focus:outline-none"
                      />
                    </label>
                  ))}
                </div>

                {out && (
                  <div className="mt-2.5 border border-slate-800 bg-[#04070e] p-2.5 font-mono text-[11px]">
                    <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{out.status === 'ok' ? 'Salida verificada' : 'Error de celda'}</span>
                      <span className="tabular-nums">{out.durationMs} ms</span>
                    </div>
                    <pre className={`whitespace-pre-wrap leading-relaxed ${out.status === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {out.text}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
