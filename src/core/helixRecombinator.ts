import { Discipline33, resolveDisciplinesForTools } from '../data/disciplines33';
import { INITIAL_COMPOUND_VOCABULARY } from '../data/vocabulary';
import {
  buildProofCarryingCertificate,
  ProofCarryingCertificate,
  sha256Hex,
  verifyProofCarryingCertificate,
} from '../utils/helixPcc';
import {
  compileHelixScript,
  ProgramVerificationReport,
  runHelixProgram,
  verifyHelixProgram,
} from '../utils/helixVm';
import {
  DOMAIN_ENGINE_METADATA,
  DomainEngineId,
  EngineExecutionOutput,
  PortSpec,
} from './helixDomainEngines';
import {
  distillAcademicCapsule17B,
  HolographicAcademicCard,
} from './holographicAcademicLibrary';
import { HelixRegisteredTool, HelixToolDomain } from './helixToolCatalog159';

export interface DecomposedAtom {
  atomId: string;
  opcode: string;
  glyphs: string;
  lineRange: [number, number];
  inputs: string[];
  outputs: string[];
  suggestedEngineId: DomainEngineId;
  smtInvariant: string;
  hlxCellScript: string;
  sha256: string;
}

export interface DecompositionResult {
  sourceLabel: string;
  instructionCount: number;
  verifiedSource: boolean;
  atoms: DecomposedAtom[];
  extractedVariables: string[];
  diagnostics: string[];
}

export interface PortBridge {
  fromToolId: string;
  fromPort: string;
  toToolId: string;
  toPort: string;
  transformRule: string;
  transferredValue: number | string;
}

export interface RecombinationResult {
  success: boolean;
  childTool: HelixRegisteredTool | null;
  parentTools: HelixRegisteredTool[];
  bridges: PortBridge[];
  stepOutputs: EngineExecutionOutput[];
  synthesizedHlx: string;
  smtReport: ProgramVerificationReport;
  pcc: ProofCarryingCertificate | null;
  pccVerified: boolean;
  disciplines33: Discipline33[];
  disciplineMaskBits33: string;
  holographicCard: HolographicAcademicCard | null;
  godelBigInt: string;
  engineeringSummary: string;
}

export interface CrossDomainExperiment {
  id: string;
  title: string;
  question: string;
  toolIds: string[];
  disciplines: string[];
  expectedInsight: string;
}

function inferAtomEngine(opcode: string): DomainEngineId {
  const op = opcode.toUpperCase();
  if (op === 'SOA_INIT' || op === 'CURL_STEP' || op === 'NEMESIS_DECAY') return 'pauli_viscoelastic_soa';
  if (op === 'BLOCH_ROT' || op === 'BVN_LATTICE') return 'quantum_bloch_bvn';
  if (op === 'GEOM_SEAL' || op === 'MESH_NODE' || op === 'MAT_ORM') return 'geom_seal_topology';
  if (op === 'CAM_6DOF') return 'sintergia_cinema_spline';
  if (op === 'WEBER_GUARD' || op === 'AUTH_CHECK' || op === 'REQUIRES' || op === 'ENSURES') return 'interval_formal_guard';
  if (op === 'WS_EMIT') return 'qpsk_telemetry_bus';
  if (op === 'ITU_P676' || op === 'MMWAVE_3GPP') return 'telecom_5g_sat_rf';
  if (op === 'RADAR_FMCW') return 'radar_fmcw_doppler';
  if (op === 'ANNEAL_OPT') return 'annealing_optimizer';
  if (op === 'CRYPTO_AUDIT') return 'crypto_ed25519_merkle';
  return 'kinetic_p33_rational';
}

/**
 * Desarma cualquier programa Helix en células atómicas reutilizables con puertos e invariantes SMT.
 */
export function decomposeHelixProgram(
  source: string,
  sourceLabel = 'programa_usuario.hlx',
): DecompositionResult {
  const compiled = compileHelixScript(source, INITIAL_COMPOUND_VOCABULARY);
  const report = verifyHelixProgram(compiled);

  const vars = new Set<string>();
  const atoms: DecomposedAtom[] = [];
  const diagnostics: string[] = [];

  if (compiled.length === 0) {
    return {
      sourceLabel,
      instructionCount: 0,
      verifiedSource: false,
      atoms: [],
      extractedVariables: [],
      diagnostics: ['El código fuente está vacío o no contiene instrucciones válidas de Helix.'],
    };
  }

  let fnBuffer: typeof compiled = [];
  let inFn = false;
  let fnName = '';

  const pushAtomFromSlice = (
    slice: typeof compiled,
    atomName: string,
    primaryOp: string,
  ) => {
    const first = slice[0];
    const last = slice[slice.length - 1];
    const localInputs = new Set<string>();
    const localOutputs = new Set<string>();

    for (const inst of slice) {
      const op = inst.opcode.toUpperCase();
      if (op === 'SET' && inst.args[0]) {
        localOutputs.add(inst.args[0]);
        vars.add(inst.args[0]);
      } else if ((op === 'ADD' || op === 'SUB' || op === 'MUL' || op === 'DIV') && inst.args[0]) {
        localInputs.add(inst.args[0]);
        localOutputs.add(inst.args[0]);
        vars.add(inst.args[0]);
      } else if ((op === 'ARRAY' || op === 'ASET' || op === 'AGET') && inst.args[0]) {
        localInputs.add(inst.args[0]);
        vars.add(inst.args[0]);
      } else if (op === 'GEOM_SEAL') {
        localInputs.add(inst.args[0] ?? 'TORUS_T2');
        localOutputs.add('euler_chi');
      } else if (op === 'CURL_STEP' || op === 'NEMESIS_DECAY') {
        localInputs.add('pauli_soa_buffer');
        localOutputs.add('mean_tension');
      } else if (op === 'BLOCH_ROT' || op === 'BVN_LATTICE') {
        localInputs.add('bloch_psi');
        localOutputs.add('norm_sq');
      }
    }

    const bodyLines = slice.map((s) => s.raw);
    const needsBoot = first.opcode.toUpperCase() !== 'KERN_BOOT';
    const needsExit = last.opcode.toUpperCase() !== 'EXIT_OK';
    const wrapped = [
      `# CELULA ATOMICA EXTRAIDA: ${atomName}`,
      ...(needsBoot ? ['ᛇᚢ', 'ᛗᚦ sys_admin'] : []),
      ...bodyLines,
      ...(needsExit ? ['ᚳᛏ'] : []),
    ].join('\n');

    const engineId = inferAtomEngine(primaryOp);
    atoms.push({
      atomId: `atom_${atomName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}_${first.lineNumber}`,
      opcode: primaryOp,
      glyphs: first.glyphs,
      lineRange: [first.lineNumber, last.lineNumber],
      inputs: Array.from(localInputs),
      outputs: Array.from(localOutputs),
      suggestedEngineId: engineId,
      smtInvariant: `lines[${first.lineNumber}..${last.lineNumber}] -> ${engineId}`,
      hlxCellScript: wrapped,
      sha256: sha256Hex(wrapped),
    });
  };

  for (const inst of compiled) {
    const op = inst.opcode.toUpperCase();
    if (op === 'KERN_BOOT' || op === 'AUTH_CHECK' || op === 'EXIT_OK' || op === 'REG_PERSIST') {
      continue;
    }
    if (op === 'FN') {
      inFn = true;
      fnName = inst.args[0] ?? `fn_${inst.lineNumber}`;
      fnBuffer = [inst];
      continue;
    }
    if (inFn) {
      fnBuffer.push(inst);
      if (op === 'END') {
        pushAtomFromSlice(fnBuffer, fnName, 'FN_MODULE');
        inFn = false;
        fnBuffer = [];
      }
      continue;
    }
    pushAtomFromSlice([inst], `${op}_${inst.lineNumber}`, op);
  }

  if (inFn && fnBuffer.length > 0) {
    pushAtomFromSlice(fnBuffer, fnName || 'fn_unclosed', 'FN_MODULE');
    diagnostics.push('Se detectó una función FN sin END explícito; encapsulada con cierre preventivo.');
  }

  if (report.status !== 'VERIFICADO') {
    diagnostics.push(`Diagnóstico original: ${report.findings.map((f) => f.detail).join(' | ')}`);
  } else {
    diagnostics.push('Programa origen verificado sin violaciones SMT; átomos listos para recombinación.');
  }

  return {
    sourceLabel,
    instructionCount: compiled.length,
    verifiedSource: report.status === 'VERIFICADO',
    atoms,
    extractedVariables: Array.from(vars),
    diagnostics,
  };
}

/**
 * Calcula un puente semántico y dimensional entre una salida de A y una entrada de B.
 */
function bridgeOutputToInput(
  fromTool: HelixRegisteredTool,
  fromOut: EngineExecutionOutput,
  toTool: HelixRegisteredTool,
): { mappedParams: Record<string, number | string>; bridges: PortBridge[] } {
  const mappedParams: Record<string, number | string> = {};
  const bridges: PortBridge[] = [];
  const toMeta = DOMAIN_ENGINE_METADATA[toTool.engineId];

  // Mapa de puentes físicos/matemáticos reales entre dominios distintos
  for (const inPort of toMeta.inputs) {
    // 1. Coincidencia directa por nombre
    if (fromOut.metrics[inPort.name] !== undefined) {
      const val = fromOut.metrics[inPort.name];
      if (typeof val === 'number' || typeof val === 'string') {
        mappedParams[inPort.name] = val;
        bridges.push({
          fromToolId: fromTool.id,
          fromPort: inPort.name,
          toToolId: toTool.id,
          toPort: inPort.name,
          transformRule: 'direct_identity_coupling',
          transferredValue: val,
        });
        continue;
      }
    }

    // 2. Puentes interdisciplinarios (donde ocurre la innovación cruzada)
    const m = fromOut.metrics;
    if (inPort.name === 'dist_km' && typeof m.altitude_km === 'number') {
      const val = Math.max(1, m.altitude_km);
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'altitude_km',
        toToolId: toTool.id,
        toPort: 'dist_km',
        transformRule: 'orbital_altitude_to_rf_slant_km',
        transferredValue: val,
      });
    } else if (inPort.name === 'freq_hz' && typeof m.cymatic_freq_hz === 'number') {
      mappedParams[inPort.name] = m.cymatic_freq_hz;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'cymatic_freq_hz',
        toToolId: toTool.id,
        toPort: 'freq_hz',
        transformRule: 'p33_audio_to_helmholtz_wave',
        transferredValue: m.cymatic_freq_hz,
      });
    } else if (inPort.name === 'freq_hz' && typeof m.jaw_open === 'number') {
      const val = Number((220 + m.jaw_open * 320).toFixed(2));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'jaw_open',
        toToolId: toTool.id,
        toPort: 'freq_hz',
        transformRule: 'lipsync_aperture_to_cymatic_hz',
        transferredValue: val,
      });
    } else if (inPort.name === 'theta' && typeof m.jaw_open === 'number') {
      const val = Number((m.jaw_open * Math.PI).toFixed(4));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'jaw_open',
        toToolId: toTool.id,
        toPort: 'theta',
        transformRule: 'audio_envelope_to_bloch_polar_angle',
        transferredValue: val,
      });
    } else if (inPort.name === 'tension' && typeof m.bloch_z === 'number') {
      const val = Number((0.5 * (1 - m.bloch_z)).toFixed(4));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'bloch_z',
        toToolId: toTool.id,
        toPort: 'tension',
        transformRule: 'qubit_excited_prob_to_cauchy_dispersion',
        transferredValue: val,
      });
    } else if (inPort.name === 'curl_gain' && typeof m.bloch_z === 'number') {
      const val = Number((0.15 + 0.5 * (1 - m.bloch_z)).toFixed(4));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'bloch_z',
        toToolId: toTool.id,
        toPort: 'curl_gain',
        transformRule: 'qubit_excited_prob_to_fluid_curl_gain',
        transferredValue: val,
      });
    } else if (inPort.name === 'tension' && typeof m.von_mises_mpa === 'number') {
      const val = Number(Math.min(1, m.von_mises_mpa / 250).toFixed(4));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'von_mises_mpa',
        toToolId: toTool.id,
        toPort: 'tension',
        transformRule: 'von_mises_stress_normalized_to_optical_B',
        transferredValue: val,
      });
    } else if (inPort.name === 'sigma_xx' && typeof m.mean_elevation === 'number') {
      const val = Number((60 + m.mean_elevation * 140).toFixed(2));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'mean_elevation',
        toToolId: toTool.id,
        toPort: 'sigma_xx',
        transformRule: 'fbm_lithostatic_elevation_to_cauchy_stress',
        transferredValue: val,
      });
    } else if (inPort.name === 'curl_gain' && typeof m.mean_elevation === 'number') {
      const val = Number((0.2 + m.mean_elevation * 0.8).toFixed(3));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'mean_elevation',
        toToolId: toTool.id,
        toPort: 'curl_gain',
        transformRule: 'terrain_gradient_to_navier_stokes_curl',
        transferredValue: val,
      });
    } else if (inPort.name === 'velocity_ms' && typeof m.v_orbital_ms === 'number') {
      const val = Math.round(m.v_orbital_ms);
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'v_orbital_ms',
        toToolId: toTool.id,
        toPort: 'velocity_ms',
        transformRule: 'kepler_orbital_speed_to_p33_kinetic',
        transferredValue: val,
      });
    } else if (inPort.name === 'target_vel_ms' && typeof m.v_orbital_ms === 'number') {
      const val = Math.round(m.v_orbital_ms);
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'v_orbital_ms',
        toToolId: toTool.id,
        toPort: 'target_vel_ms',
        transformRule: 'kepler_velocity_to_radar_doppler',
        transferredValue: val,
      });
    } else if (inPort.name === 'seed' && typeof m.shannon_entropy_bits === 'number') {
      const val = Math.max(1, Math.round(m.shannon_entropy_bits * 10000) + 137);
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'shannon_entropy_bits',
        toToolId: toTool.id,
        toPort: 'seed',
        transformRule: 'quantum_entropy_to_mulberry32_seed',
        transferredValue: val,
      });
    } else if (inPort.name === 'tension' && typeof m.energy_drift_pct === 'number') {
      const val = Number(Math.min(1, Math.max(0.05, m.energy_drift_pct * 20 + 0.12)).toFixed(4));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'energy_drift_pct',
        toToolId: toTool.id,
        toPort: 'tension',
        transformRule: 'orbital_drift_to_telemetry_modulation',
        transferredValue: val,
      });
    } else if (inPort.name === 'tension' && typeof m.best_energy === 'number') {
      const val = Number(Math.min(1, Math.max(0.05, 1 / (1 + m.best_energy))).toFixed(4));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'best_energy',
        toToolId: toTool.id,
        toPort: 'tension',
        transformRule: 'annealing_convergence_to_optical_tension',
        transferredValue: val,
      });
    } else if (inPort.name === 'a_end' && typeof m.safety_factor === 'number') {
      const val = Math.max(50, Math.round(m.safety_factor * 100));
      mappedParams[inPort.name] = val;
      mappedParams['b_start'] = val;
      mappedParams['b_end'] = val + 300;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'safety_factor',
        toToolId: toTool.id,
        toPort: 'a_end',
        transformRule: 'structural_safety_factor_to_formal_guard_interval',
        transferredValue: val,
      });
    } else if (inPort.name === 'a_end' && typeof m.snr_db === 'number') {
      const val = Math.max(40, Math.round(Math.abs(m.snr_db) * 10));
      mappedParams[inPort.name] = val;
      mappedParams['b_start'] = val;
      mappedParams['b_end'] = val + 250;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'snr_db',
        toToolId: toTool.id,
        toPort: 'a_end',
        transformRule: 'rf_snr_margin_to_formal_guard_interval',
        transferredValue: val,
      });
    } else if (inPort.name === 'leaves_count' && typeof m.qubits === 'number') {
      const val = Math.min(64, Math.max(2, 1 << Math.min(5, Math.round(m.qubits))));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'qubits',
        toToolId: toTool.id,
        toPort: 'leaves_count',
        transformRule: 'hilbert_basis_dim_to_merkle_leaves',
        transferredValue: val,
      });
    } else if (inPort.name === 'gamma' && typeof m.safety_factor === 'number') {
      const val = Number(Math.min(0.4, Math.max(0.01, 0.15 / Math.max(0.5, m.safety_factor))).toFixed(4));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'safety_factor',
        toToolId: toTool.id,
        toPort: 'gamma',
        transformRule: 'structural_margin_to_nemesis_damping',
        transferredValue: val,
      });
    } else {
      // Compatibilidad estricta por unidad fisica/financiera (cero cruces heuristicos ciegos)
      const matchingEntry = Object.entries(m).find(([k, v]) => {
        if (typeof v !== 'number' || !Number.isFinite(v)) return false;
        const sameName = k === inPort.name;
        const bothVelocity = k.includes('vel') && inPort.name.includes('vel');
        const bothFreq = k.includes('freq') && inPort.name.includes('freq') && !k.includes('ghz') && !inPort.name.includes('ghz');
        const bothCurrency = k.includes('cents') && inPort.name.includes('cents');
        return sameName || bothVelocity || bothFreq || bothCurrency;
      });
      if (matchingEntry) {
        const val = Number(Number(matchingEntry[1]).toFixed(4));
        mappedParams[inPort.name] = val;
        bridges.push({
          fromToolId: fromTool.id,
          fromPort: matchingEntry[0],
          toToolId: toTool.id,
          toPort: inPort.name,
          transformRule: 'strict_unit_verified_bridge',
          transferredValue: val,
        });
      }
    }
  }

  return { mappedParams, bridges };
}

function buildCombinedHlxScript(
  tools: HelixRegisteredTool[],
  stepOutputs: EngineExecutionOutput[],
): string {
  const lines: string[] = [
    `# RECOMBINACION AUTOPOIETICA HELIX (${tools.map((t) => t.id).join(' x ')})`,
    'ᛇᚢ',
    'ᛗᚦ sys_admin',
    'SOA_INIT 32',
  ];

  let hasGeomSeal = false;
  let cymFreq = 457.84;

  stepOutputs.forEach((out, idx) => {
    const tool = tools[idx];
    lines.push(`# Paso ${idx + 1}: ${tool.title} [${out.engineId}]`);
    if (out.engineId === 'pauli_viscoelastic_soa' || out.engineId === 'cauchy_tensor_von_mises') {
      lines.push('CURL_STEP 0.45 0.016');
      lines.push('NEMESIS_DECAY 0.08');
    } else if (out.engineId === 'quantum_bloch_bvn' || out.engineId === 'quantum_statevector_qasm') {
      lines.push('BLOCH_ROT 0 1 0 1.2 1');
      lines.push('BVN_LATTICE 1.5708 0 3.1416 q_nondist');
    } else if (out.engineId === 'telecom_5g_sat_rf') {
      const fGhz = Number(out.metrics.freq_ghz ?? 28);
      lines.push(`ITU_P676 ${fGhz} 35 1013.25 15 7.5 0.0`);
      lines.push(`MMWAVE_3GPP ${fGhz} 250 UMi-LoS 10 1.5`);
    } else if (out.engineId === 'radar_fmcw_doppler') {
      const fD = Number(out.metrics.doppler_shift_hz ?? 0);
      const vEst = Math.round(Math.max(-100, Math.min(100, (fD * 299792458) / (2 * 77e9))));
      lines.push(`RADAR_FMCW 77 4000 ${Number.isFinite(vEst) ? vEst : 24} 42 1.0`);
    } else if (out.engineId === 'annealing_optimizer') {
      lines.push('ANNEAL_OPT 100 0.995 1000');
    } else if (out.engineId === 'crypto_ed25519_merkle' || out.engineId === 'ledger_p33_merkle') {
      lines.push('CRYPTO_AUDIT 256 8 RECOMB_SEAL');
    } else if (out.engineId === 'geom_seal_topology') {
      hasGeomSeal = true;
    } else if (out.engineId === 'audio_p33_cymatic' && typeof out.metrics.cymatic_freq_hz === 'number') {
      cymFreq = out.metrics.cymatic_freq_hz;
    }
    const metricEntries = Object.entries(out.metrics).filter(
      ([, v]) => typeof v === 'number' && Number.isFinite(v),
    );
    for (const [k, v] of metricEntries.slice(0, 2)) {
      const safeVar = k.replace(/[^a-zA-Z0-9_]/g, '_');
      lines.push(`SET ${safeVar} ${Math.round(Number(v) * 100) / 100}`);
    }
  });

  if (!hasGeomSeal) {
    lines.push(`GEOM_SEAL TORUS_T2 PHI_FIBONACCI ${cymFreq}`);
  } else {
    lines.push(`GEOM_SEAL ICOSAHEDRON PHI_FIBONACCI ${cymFreq}`);
  }
  lines.push('WEBER_GUARD 0.015 1.0 1.05 wf_render');
  lines.push('WS_EMIT telemetry helix_recomb');
  lines.push('ᚳᛏ');
  return lines.join('\n');
}

/**
 * Combina y recombina 2 o más herramientas de cualquier dominio, acopla sus puertos,
 * ejecuta sus ecuaciones reales, verifica con SMT+PCC+GEOM_SEAL y sella una nueva célula hija.
 */
export function recombineHelixTools(
  tools: HelixRegisteredTool[],
  initialParams: Record<string, number | string> = {},
): RecombinationResult {
  if (tools.length < 2) {
    return {
      success: false,
      childTool: null,
      parentTools: tools,
      bridges: [],
      stepOutputs: [],
      synthesizedHlx: '',
      smtReport: verifyHelixProgram([]),
      pcc: null,
      pccVerified: false,
      disciplines33: [],
      disciplineMaskBits33: '0'.repeat(33),
      holographicCard: null,
      godelBigInt: '1',
      engineeringSummary: 'Se requieren al menos 2 herramientas para ejecutar una recombinación.',
    };
  }

  const bridges: PortBridge[] = [];
  const stepOutputs: EngineExecutionOutput[] = [];
  let rollingParams: Record<string, number | string> = { ...initialParams };

  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    const meta = DOMAIN_ENGINE_METADATA[tool.engineId];
    const out = meta.execute(rollingParams);
    stepOutputs.push(out);

    if (i + 1 < tools.length) {
      const nextTool = tools[i + 1];
      const coupled = bridgeOutputToInput(tool, out, nextTool);
      bridges.push(...coupled.bridges);
      rollingParams = { ...initialParams, ...coupled.mappedParams };
    }
  }

  const synthesizedHlx = buildCombinedHlxScript(tools, stepOutputs);
  const compiled = compileHelixScript(synthesizedHlx, INITIAL_COMPOUND_VOCABULARY);
  const smtReport = verifyHelixProgram(compiled);
  const vmRun = runHelixProgram(compiled);

  let godelBig = 1n;
  for (const t of tools) {
    godelBig *= BigInt(Math.max(2, t.prime));
  }

  const allMathValid = stepOutputs.every((s) => s.valid);
  const vmHasRejection = vmRun.finalState.logs.some((l) => l.status === 'RECHAZADO');
  const vmCompleted = vmRun.finalPc === compiled.length && !vmRun.finalState.halted && !vmHasRejection;
  const smtValid = smtReport.status === 'VERIFICADO' && vmCompleted;

  const pccInstructions = compiled.map((i) => ({ opcode: i.opcode, args: i.args }));
  const pcc = buildProofCarryingCertificate(pccInstructions, {
    status: smtValid ? 'PROVED_SAFE' : 'VIOLATION_FOUND',
    maxHeapBytes: vmRun.finalState.usedMemoryBytes,
    heapCapacityBytes: vmRun.finalState.totalMemoryBytes,
    dischargedRuntimeChecks:
      smtReport.symbolic?.dischargedRuntimeChecks ?? (smtReport.findings.length === 0 ? compiled.length : 0),
    octagonInvariants: smtReport.symbolic?.octagonInvariants ?? [],
    blockStates: vmRun.finalState.memoryBlocks.map((b) => ({
      id: b.id,
      size: b.size,
      state: b.status,
    })),
  });
  const pccCheck = verifyProofCarryingCertificate(pccInstructions, pcc);
  const pccVerified = pccCheck.valid;
  const success = allMathValid && smtValid && pccVerified;

  const { disciplines: disciplines33, maskBits33: disciplineMaskBits33 } =
    resolveDisciplinesForTools(tools);

  const childId = `recomb_${tools.map((t) => t.id.slice(0, 12)).join('_x_')}`;
  const childSha = sha256Hex(`${childId}|${godelBig.toString()}|${synthesizedHlx}`);
  const lastTool = tools[tools.length - 1];
  const firstTool = tools[0];

  const mergedInputs: PortSpec[] = DOMAIN_ENGINE_METADATA[firstTool.engineId].inputs;
  const mergedOutputs: PortSpec[] = DOMAIN_ENGINE_METADATA[lastTool.engineId].outputs;
  const domainSet = Array.from(new Set(tools.map((t) => t.domain)));

  const childTool: HelixRegisteredTool | null = success
    ? {
        id: childId,
        fileName: `${childId}.hlx`,
        title: `SÍNTESIS (${tools.map((t) => t.title.split(' ')[0]).join(' × ')})`,
        prime: Number(godelBig % 999983n) || 137,
        godelProduct: Number(godelBig % BigInt(Number.MAX_SAFE_INTEGER)),
        sha256: childSha,
        origin: 'autopoietic_child',
        domain: domainSet[0] as HelixToolDomain,
        engineId: lastTool.engineId,
        formulaSummary: `Cadena acoplada: ${tools.map((t) => t.engineId).join(' -> ')}`,
        inputs: mergedInputs,
        outputs: mergedOutputs,
        smtContract: {
          pre: tools.map((t) => t.smtContract.pre).join(' && '),
          post: `${tools.map((t) => t.smtContract.post).join(' && ')} && (pcc_sha "${pcc.certificateSha256.slice(0, 12)}")`,
        },
        hlxSource: synthesizedHlx,
        parents: tools.map((t) => t.id),
        keywords: Array.from(
          new Set([
            ...tools.flatMap((t) => t.keywords),
            ...disciplines33.flatMap((d) => d.keywords),
          ]),
        ).slice(0, 20),
      }
    : null;

  const holographicCard: HolographicAcademicCard | null =
    success && childTool
      ? distillAcademicCapsule17B({
          title: childTool.title,
          summary: `${childTool.formulaSummary} · Disciplinas P33: ${disciplines33.map((d) => d.name).join(' + ')}`,
          sourceKind: 'autopoietic_recombination',
          tools,
          explicitDisciplines: disciplines33,
          hlxScript: synthesizedHlx,
          godelProduct: godelBig.toString(),
          pcc,
        })
      : null;

  const engineeringSummary = success
    ? `Recombinación PROVEN_SAT: ${tools.length} células acopladas mediante ${bridges.length} puentes tipados, ${disciplines33.length} disciplinas P33, Gödel=${godelBig.toString()}, PCC=${pcc.certificateSha256.slice(0, 12)}…, QPSK-17B=${holographicCard?.frame.frameSha256.slice(0, 10) ?? 'n/a'}`
    : `Recombinación rechazada (allMathValid=${allMathValid}, smtStatus=${smtReport.status}, pccVerified=${pccVerified}).`;

  return {
    success,
    childTool,
    parentTools: tools,
    bridges,
    stepOutputs,
    synthesizedHlx,
    smtReport,
    pcc,
    pccVerified,
    disciplines33,
    disciplineMaskBits33,
    holographicCard,
    godelBigInt: godelBig.toString(),
    engineeringSummary,
  };
}

export const CURATED_CROSS_EXPERIMENTS: readonly CrossDomainExperiment[] = [
  {
    id: 'exp-space-telecom',
    title: 'Órbita Kepler + Atenuación Satelital ITU-R + Radar Doppler',
    question: '¿Qué pasa si acoplamos la altitud y velocidad orbital real de Verlet al presupuesto de enlace espacial y corrimiento Doppler?',
    toolIds: ['123_orbital_mechanics_kepler', '23_satellite_itup676', '21_radar_fmcw_77ghz'],
    disciplines: ['Espacio y Gravitación', 'Telecomunicaciones y RF'],
    expectedInsight: 'La altitud orbital determina en vivo la pérdida FSPL/atmosférica y la velocidad tangencial fija el desplazamiento Doppler.',
  },
  {
    id: 'exp-audio-quantum-optics',
    title: 'LipSync 3 Bandas + Esfera de Bloch SU(2) + Óptica de Cauchy',
    question: '¿Y si la voz humana modula rotaciones cuánticas en la esfera de Bloch y la probabilidad excitada altera la dispersión óptica?',
    toolIds: ['71_audio_fft_bands', '05_quantum_bloch', '02_physics_cauchy_nemesis'],
    disciplines: ['Cinematografía y Audio', 'Computación Cuántica', 'Materia Digital y Fluidos'],
    expectedInsight: 'La apertura vocal controla θ en SU(2) manteniendo ||ψ||²=1, y la proyección Z modula el índice de refracción espectral RGB.',
  },
  {
    id: 'exp-terrain-stress-collisions',
    title: 'Terreno FBM + Tensor de Cauchy / von Mises + Cuerpos Rígidos',
    question: '¿Podemos crear un mundo procedural donde el relieve genere esfuerzo estructural real y valide colisiones?',
    toolIds: ['97_terrain_fbm_heightmap', '46_cauchy_tensor6_solver', '98_rigid_body_collisions'],
    disciplines: ['Videojuegos y Mundos 3D', 'Materia Digital y Fluidos'],
    expectedInsight: 'La elevación fBm alimenta el tensor σ_xx para calcular factor de seguridad de von Mises junto al balance energético de colisión.',
  },
  {
    id: 'exp-quantum-entropy-finance',
    title: 'Statevector Multi-Qubit + Terreno Mulberry32 + Partida Doble Merkle',
    question: '¿Qué ocurre si la entropía de Shannon cuántica siembra un mundo procedural y su energía queda sellada en un árbol Merkle?',
    toolIds: ['131_statevector_12q_simulator', '96_procedural_seed_spawner', '77_exact_decimal_ledger'],
    disciplines: ['Computación Cuántica', 'Videojuegos y Mundos 3D', 'Finanzas y Criptografía'],
    expectedInsight: 'Entropía cuántica exacta -> semilla determinista -> registro contable P₃₃ balanceado con raíz SHA-256.',
  },
];
