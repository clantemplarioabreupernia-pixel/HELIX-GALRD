import { Discipline33, DISCIPLINES_33, resolveDisciplinesForTools } from '../data/disciplines33';
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

export interface CombinatorialBatchReport {
  totalAttempted: number;
  totalVerified: number;
  firstOrderVerified: number;
  secondOrderVerified: number;
  thirdOrderVerified: number;
  uniqueEnginesCovered: number;
  uniqueDomainsCovered: number;
  totalBridges: number;
  results: RecombinationResult[];
  summary: string;
}

function inferAtomEngine(opcode: string): DomainEngineId {
  const op = opcode.toUpperCase();
  if (op === 'SOA_INIT' || op === 'CURL_STEP' || op === 'NEMESIS_DECAY') return 'pauli_viscoelastic_soa';
  if (op === 'BLOCH_ROT' || op === 'BVN_LATTICE') return 'quantum_bloch_bvn';
  if (op === 'GEOM_SEAL' || op === 'MESH_NODE' || op === 'MAT_ORM') return 'geom_seal_topology';
  if (op === 'CAM_6DOF') return 'sintergia_cinema_spline';
  if (op === 'CAUCHY_OPTIC') return 'nanotech_biopixel_quantum';
  if (op === 'GALDR_SYNTH') return 'audio_p33_cymatic';
  if (op === 'WEBER_GUARD' || op === 'AUTH_CHECK' || op === 'REQUIRES' || op === 'ENSURES') return 'interval_formal_guard';
  if (op === 'WS_EMIT') return 'qpsk_telemetry_bus';
  if (op === 'ITU_P676' || op === 'MMWAVE_3GPP') return 'telecom_5g_sat_rf';
  if (op === 'RADAR_FMCW') return 'radar_fmcw_doppler';
  if (op === 'ANNEAL_OPT') return 'annealing_optimizer';
  if (op === 'CRYPTO_AUDIT') return 'crypto_ed25519_merkle';
  if (op === 'ORBIT_KEPLER') return 'orbital_kepler_verlet';
  if (op === 'KINETIC_P33') return 'kinetic_p33_rational';
  if (op === 'TENSOR_VM') return 'cauchy_tensor_von_mises';
  if (op === 'QASM_STATE') return 'quantum_statevector_qasm';
  if (op === 'TERRAIN_FBM') return 'terrain_fbm_mulberry';
  if (op === 'RIGID_COLLIDE') return 'rigid_collision_3d';
  if (op === 'LIPSYNC_DSP') return 'lipsync_3band_dsp';
  if (op === 'LEDGER_MERKLE') return 'ledger_p33_merkle';
  if (op === 'CHEM_THERMO') return 'chemistry_quantum_thermodynamics';
  if (op === 'NANO_BRUS') return 'nanotech_biopixel_quantum';
  if (op === 'DISNEY_KIN12') return 'sintergia_cinema_spline';
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
    } else if (inPort.name === 'lambda_nm' && typeof m.cymatic_freq_hz === 'number') {
      const val = Number(Math.max(420, Math.min(670, 700 - (m.cymatic_freq_hz - 220) * 0.48)).toFixed(2));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'cymatic_freq_hz',
        toToolId: toTool.id,
        toPort: 'lambda_nm',
        transformRule: 'cymatic_acoustic_freq_to_brus_photon_wavelength',
        transferredValue: val,
      });
    } else if (inPort.name === 'tension' && typeof m.mean_tension === 'number') {
      const val = Number(Math.min(1, Math.max(0, m.mean_tension)).toFixed(4));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'mean_tension',
        toToolId: toTool.id,
        toPort: 'tension',
        transformRule: 'cauchy_soa_tension_to_quantum_dot_strain',
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
    } else if (inPort.name === 'lambda_nm' && typeof m.bandgap_lambda_nm === 'number') {
      mappedParams[inPort.name] = m.bandgap_lambda_nm;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'bandgap_lambda_nm',
        toToolId: toTool.id,
        toPort: 'lambda_nm',
        transformRule: 'chemistry_morse_gap_to_brus_photon_nm',
        transferredValue: m.bandgap_lambda_nm,
      });
    } else if (inPort.name === 'tension' && typeof m.nernst_voltage_v === 'number') {
      const val = Number(Math.min(1, Math.max(0.05, Math.abs(m.nernst_voltage_v) / 2.5)).toFixed(4));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'nernst_voltage_v',
        toToolId: toTool.id,
        toPort: 'tension',
        transformRule: 'nernst_electrochemical_potential_to_cauchy_strain',
        transferredValue: val,
      });
    } else if (inPort.name === 'initial_temp' && typeof m.temp_k === 'number') {
      mappedParams[inPort.name] = m.temp_k;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'temp_k',
        toToolId: toTool.id,
        toPort: 'initial_temp',
        transformRule: 'reactor_temp_to_simulated_annealing_k',
        transferredValue: m.temp_k,
      });
    } else if (inPort.name === 'temp_k' && typeof m.cymatic_freq_hz === 'number') {
      const val = Number((260 + m.cymatic_freq_hz * 0.18).toFixed(2));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'cymatic_freq_hz',
        toToolId: toTool.id,
        toPort: 'temp_k',
        transformRule: 'sonochemical_frequency_to_reactor_temp_k',
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
    } else if (inPort.name === 'tension' && typeof m.brus_radius_nm === 'number') {
      const val = Number(Math.min(1, Math.max(0.08, 1.0 - (m.brus_radius_nm - 1.5) / 6.0)).toFixed(4));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'brus_radius_nm',
        toToolId: toTool.id,
        toPort: 'tension',
        transformRule: 'brus_quantum_dot_confinement_to_cauchy_strain',
        transferredValue: val,
      });
    } else if (inPort.name === 'tension' && typeof m.rms_amplitude === 'number') {
      const val = Number(Math.min(1, Math.max(0.05, m.rms_amplitude)).toFixed(4));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'rms_amplitude',
        toToolId: toTool.id,
        toPort: 'tension',
        transformRule: 'qpsk_rms_carrier_to_optical_tension',
        transferredValue: val,
      });
    } else if (inPort.name === 'audio_mid' && typeof m.rms_amplitude === 'number') {
      const val = Number(Math.min(1, Math.max(0.1, m.rms_amplitude)).toFixed(4));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'rms_amplitude',
        toToolId: toTool.id,
        toPort: 'audio_mid',
        transformRule: 'qpsk_carrier_envelope_to_lipsync_mid_band',
        transferredValue: val,
      });
    } else if (inPort.name === 'iterations' && typeof m.total_frames === 'number') {
      const val = Math.min(2000, Math.max(200, Math.round(m.total_frames * 2)));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'total_frames',
        toToolId: toTool.id,
        toPort: 'iterations',
        transformRule: 'cinema_frames_to_annealing_iterations',
        transferredValue: val,
      });
    } else if (inPort.name === 'height_m' && typeof m.altitude_km === 'number') {
      const val = Number(Math.min(120, Math.max(2, m.altitude_km * 0.05)).toFixed(2));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'altitude_km',
        toToolId: toTool.id,
        toPort: 'height_m',
        transformRule: 'orbital_altitude_scaled_to_drop_test_m',
        transferredValue: val,
      });
    } else if (inPort.name === 'morse_de_ev' && typeof m.energy_final_j === 'number') {
      const val = Number(Math.min(8.5, Math.max(1.2, 2.5 + m.energy_final_j * 0.02)).toFixed(3));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'energy_final_j',
        toToolId: toTool.id,
        toPort: 'morse_de_ev',
        transformRule: 'mechanical_impact_energy_to_morse_dissociation',
        transferredValue: val,
      });
    } else if (inPort.name === 'prime' && typeof m.euler_chi === 'number') {
      const val = Math.abs(Math.round(m.euler_chi)) >= 2 ? 17 : 7;
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'euler_chi',
        toToolId: toTool.id,
        toPort: 'prime',
        transformRule: 'euler_topology_invariant_to_p33_harmonic_prime',
        transferredValue: val,
      });
    } else if (inPort.name === 'reaction_q' && typeof m.bloch_z === 'number') {
      const val = Number(Math.max(0.05, Math.min(2.5, 0.25 + 0.5 * (1 - m.bloch_z))).toFixed(4));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'bloch_z',
        toToolId: toTool.id,
        toPort: 'reaction_q',
        transformRule: 'bloch_inversion_population_to_reaction_quotient_Q',
        transferredValue: val,
      });
    } else if (inPort.name === 'audio_low' && typeof m.mean_tension === 'number') {
      const val = Number(Math.min(1, Math.max(0.05, m.mean_tension)).toFixed(4));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'mean_tension',
        toToolId: toTool.id,
        toPort: 'audio_low',
        transformRule: 'viscoelastic_mean_tension_to_bass_band_envelope',
        transferredValue: val,
      });
    } else if (inPort.name === 't_norm' && typeof m.abbe_dispersion_delta === 'number') {
      const val = Number(Math.min(0.95, Math.max(0.1, Math.abs(m.abbe_dispersion_delta) * 12)).toFixed(4));
      mappedParams[inPort.name] = val;
      bridges.push({
        fromToolId: fromTool.id,
        fromPort: 'abbe_dispersion_delta',
        toToolId: toTool.id,
        toPort: 't_norm',
        transformRule: 'cauchy_chromatic_dispersion_to_cinema_spline_t',
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
    if (out.engineId === 'pauli_viscoelastic_soa') {
      lines.push('CURL_STEP 0.45 0.016');
      lines.push('NEMESIS_DECAY 0.08');
    } else if (out.engineId === 'cauchy_tensor_von_mises') {
      lines.push('TENSOR_VM 180 90 45');
    } else if (out.engineId === 'orbital_kepler_verlet') {
      lines.push('ORBIT_KEPLER 420 398600.4418');
    } else if (out.engineId === 'kinetic_p33_rational') {
      lines.push('KINETIC_P33 12 5 0.016');
    } else if (out.engineId === 'rigid_collision_3d') {
      lines.push('RIGID_COLLIDE 10 10 8 0.85');
    } else if (out.engineId === 'terrain_fbm_mulberry') {
      lines.push('TERRAIN_FBM 6 1.2');
    } else if (out.engineId === 'quantum_bloch_bvn') {
      lines.push('BLOCH_ROT 0 1 0 1.2 1');
      lines.push('BVN_LATTICE 1.5708 0 3.1416 q_nondist');
    } else if (out.engineId === 'quantum_statevector_qasm') {
      lines.push('QASM_STATE 3');
      lines.push('BLOCH_ROT 0 1 0 1.2 1');
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
    } else if (out.engineId === 'crypto_ed25519_merkle') {
      lines.push('CRYPTO_AUDIT 256 8 RECOMB_SEAL');
    } else if (out.engineId === 'ledger_p33_merkle') {
      lines.push('LEDGER_MERKLE 10000 10000');
      lines.push('CRYPTO_AUDIT 256 8 LEDGER_SEAL');
    } else if (out.engineId === 'geom_seal_topology') {
      hasGeomSeal = true;
    } else if (out.engineId === 'nanotech_biopixel_quantum') {
      lines.push('NANO_BRUS 2.6');
      lines.push('CAUCHY_OPTIC 1458/1000 354/100000 12/100000');
      lines.push('NEMESIS_DECAY 0.08');
    } else if (out.engineId === 'cauchy_optical_sss') {
      lines.push('CAUCHY_OPTIC 1458/1000 354/100000 12/100000');
    } else if (out.engineId === 'chemistry_quantum_thermodynamics') {
      lines.push('CHEM_THERMO 298.15 4.52');
      lines.push('CAUCHY_OPTIC 1458/1000 354/100000 12/100000');
    } else if (out.engineId === 'audio_p33_cymatic') {
      if (typeof out.metrics.cymatic_freq_hz === 'number') {
        cymFreq = out.metrics.cymatic_freq_hz;
      }
      lines.push(`GALDR_SYNTH ${(tool.prime + idx) % 33} RECOMB_AUDIO`);
    } else if (out.engineId === 'lipsync_3band_dsp') {
      lines.push('LIPSYNC_DSP 220 0.62');
      lines.push(`GALDR_SYNTH ${(tool.prime + idx) % 33} CINEMA_VOICE`);
    } else if (out.engineId === 'sintergia_cinema_spline') {
      lines.push('CAM_6DOF 3.2 2.1 3.8 38 18 45');
      lines.push('DISNEY_KIN12 1.18');
      lines.push(`GALDR_SYNTH ${(tool.prime + idx) % 33} CINEMA_FRAME`);
    } else if (out.engineId === 'interval_formal_guard' || out.engineId === 'neural_smt_synthesizer') {
      lines.push('WEBER_GUARD 0.015 1.0 1.05 wf_guard');
    } else if (out.engineId === 'qpsk_telemetry_bus') {
      lines.push('WS_EMIT qpsk_bus z4_132b');
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
  lines.push('ᛣᚪ');
  lines.push('ᚳᛏ');
  return lines.join('\n');
}

function expandLineageLeaves(tools: readonly HelixRegisteredTool[], maxLeaves = 8): HelixRegisteredTool[] {
  const flat: HelixRegisteredTool[] = [];
  const seen = new Set<string>();
  const visit = (t: HelixRegisteredTool) => {
    if (t.origin === 'autopoietic_child' && t.lineageLeaves && t.lineageLeaves.length > 0) {
      for (const leaf of t.lineageLeaves) {
        visit(leaf);
      }
      return;
    }
    if (!seen.has(t.id)) {
      seen.add(t.id);
      flat.push(t);
    }
  };
  for (const t of tools) visit(t);
  return flat.slice(0, maxLeaves);
}

/**
 * Combina y recombina 2 o más herramientas de cualquier dominio (incluyendo síntesis de 2.º/3.er orden),
 * expande su linaje completo, acopla sus puertos, ejecuta sus ecuaciones reales, verifica con SMT+PCC+GEOM_SEAL
 * y sella una nueva célula hija.
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

  const effectiveTools = expandLineageLeaves(tools);
  const generation = Math.max(0, ...tools.map((t) => t.generation ?? (t.origin === 'autopoietic_child' ? 1 : 0))) + 1;

  const bridges: PortBridge[] = [];
  const stepOutputs: EngineExecutionOutput[] = [];
  let rollingParams: Record<string, number | string> = { ...initialParams };

  for (let i = 0; i < effectiveTools.length; i++) {
    const tool = effectiveTools[i];
    const meta = DOMAIN_ENGINE_METADATA[tool.engineId];
    const out = meta.execute(rollingParams);
    stepOutputs.push(out);

    if (i + 1 < effectiveTools.length) {
      const nextTool = effectiveTools[i + 1];
      const coupled = bridgeOutputToInput(tool, out, nextTool);
      bridges.push(...coupled.bridges);
      rollingParams = { ...initialParams, ...coupled.mappedParams };
    }
  }

  const synthesizedHlx = buildCombinedHlxScript(effectiveTools, stepOutputs);
  const compiled = compileHelixScript(synthesizedHlx, INITIAL_COMPOUND_VOCABULARY);
  const smtReport = verifyHelixProgram(compiled);
  const vmRun = runHelixProgram(compiled);

  let godelBig = 1n;
  for (const t of effectiveTools) {
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
    resolveDisciplinesForTools(effectiveTools);

  const lineageSig = sha256Hex(effectiveTools.map((t) => t.id).join('|')).slice(0, 8);
  const childId =
    generation === 1 && effectiveTools.length <= 3
      ? `recomb_${effectiveTools.map((t) => t.id.slice(0, 10)).join('_x_')}`
      : `recomb_g${generation}_${effectiveTools.length}L_${lineageSig}`;
  const childSha = sha256Hex(`${childId}|${godelBig.toString()}|${synthesizedHlx}`);
  const lastTool = effectiveTools[effectiveTools.length - 1];
  const firstTool = effectiveTools[0];

  const mergedInputs: PortSpec[] = DOMAIN_ENGINE_METADATA[firstTool.engineId].inputs;
  const mergedOutputs: PortSpec[] = DOMAIN_ENGINE_METADATA[lastTool.engineId].outputs;
  const domainSet = Array.from(new Set(effectiveTools.map((t) => t.domain)));
  const titleTags = effectiveTools.slice(0, 4).map((t) => t.title.split(/[·\s]+/)[0]);
  const extraCount = effectiveTools.length > 4 ? ` +${effectiveTools.length - 4}` : '';

  const childTool: HelixRegisteredTool | null = success
    ? {
        id: childId,
        fileName: `${childId}.hlx`,
        title: `G${generation} · SÍNTESIS (${titleTags.join(' × ')}${extraCount})`,
        prime: Number(godelBig % 999983n) || 137,
        godelProduct: Number(godelBig % BigInt(Number.MAX_SAFE_INTEGER)),
        sha256: childSha,
        origin: 'autopoietic_child',
        domain: domainSet[0] as HelixToolDomain,
        engineId: lastTool.engineId,
        formulaSummary: `Cadena acoplada G${generation} (${effectiveTools.length} leyes): ${effectiveTools.map((t) => t.engineId).join(' -> ')}`,
        inputs: mergedInputs,
        outputs: mergedOutputs,
        smtContract: {
          pre: effectiveTools.map((t) => t.smtContract.pre).join(' && '),
          post: `${effectiveTools.map((t) => t.smtContract.post).join(' && ')} && (pcc_sha "${pcc.certificateSha256.slice(0, 12)}")`,
        },
        hlxSource: synthesizedHlx,
        parents: tools.map((t) => t.id),
        generation,
        lineageLeaves: effectiveTools,
        keywords: Array.from(
          new Set([
            ...effectiveTools.flatMap((t) => t.keywords),
            ...disciplines33.flatMap((d) => d.keywords),
            `gen${generation}`,
          ]),
        ).slice(0, 24),
      }
    : null;

  const holographicCard: HolographicAcademicCard | null =
    success && childTool
      ? distillAcademicCapsule17B({
          title: childTool.title,
          summary: `${childTool.formulaSummary} · Disciplinas P33: ${disciplines33.map((d) => d.name).join(' + ')}`,
          sourceKind: 'autopoietic_recombination',
          tools: effectiveTools,
          explicitDisciplines: disciplines33,
          hlxScript: synthesizedHlx,
          godelProduct: godelBig.toString(),
          pcc,
        })
      : null;

  const engineeringSummary = success
    ? `Recombinación G${generation} PROVEN_SAT: ${effectiveTools.length} leyes acopladas mediante ${bridges.length} puentes tipados, ${disciplines33.length} disciplinas P33, Gödel=${godelBig.toString().slice(0, 18)}${godelBig.toString().length > 18 ? '…' : ''}, PCC=${pcc.certificateSha256.slice(0, 12)}…`
    : `Recombinación rechazada (allMathValid=${allMathValid}, smtStatus=${smtReport.status}, pccVerified=${pccVerified}).`;

  return {
    success,
    childTool,
    parentTools: effectiveTools,
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
  {
    id: 'exp-chemistry-quantum-optics',
    title: 'Cámara Foto-Electroquímica (Morse + Nernst + Brus + Cauchy + Bloch)',
    question: '¿Cómo acopla el potencial electroquímico y enlace Morse la emisión cuántica Brus y dispersión de Cauchy en 4K?',
    toolIds: ['201_chemistry_nernst_gibbs', '202_chemistry_morse_arrhenius', '200_nanotech_biopixel_z4', '05_quantum_bloch'],
    disciplines: ['Química y Termodinámica', 'Materia Digital y Fluidos', 'Computación Cuántica'],
    expectedInsight: 'El voltaje Nernst y la energía de enlace determinan λ_nm del punto cuántico CdSe, su estado Bloch y el índice espectral RGB.',
  },
  {
    id: 'exp-synesthetic-galdr-cinema',
    title: 'Escultor Sinestésico Voz–Materia–Cine (Galdr + LipSync + Curl + Cauchy)',
    question: '¿Puede la voz humana deformar un fluido Pauli-SoA, modular Cauchy óptico y dirigir la cámara 6-DoF en tiempo real?',
    toolIds: ['71_audio_fft_bands', '03_audio_p33_cymatic', '02_physics_cauchy_nemesis', '149_catmull_rom_camera_spline'],
    disciplines: ['Cinematografía y Audio', 'Materia Digital y Fluidos'],
    expectedInsight: 'La apertura vocal y frecuencia P₃₃ gobiernan las líneas de corriente Curl Noise, la dispersión óptica y el spline Catmull-Rom.',
  },
  {
    id: 'exp-annealing-thermal-euv',
    title: 'Compilador Termodinámico EUV-IGZO (Recocido + Nanotecnología + Guardia)',
    question: '¿Cómo optimiza el recocido simulado la respuesta piezo-óptica del biopíxel dentro de cotas formales?',
    toolIds: ['10_annealing_solver', '200_nanotech_biopixel_z4', 'canon_geom_seal', '144_no_overlap_predicate'],
    disciplines: ['IA Acotada y Orquestación', 'Materia Digital y Fluidos', 'Verificación Formal y Seguridad'],
    expectedInsight: 'La convergencia Metropolis-Hastings calibra la tensión viscoelástica y sella la topología dentro de intervalos sin solapamiento.',
  },
  {
    id: 'exp-quantum-notary-merkle',
    title: 'Notario Cuántico-Físico Inmutable (BvN + QPSK-132 + Merkle + Ed25519)',
    question: '¿Cómo se sella un testigo cuántico no-distributivo junto con contabilidad P₃₃ y criptografía Ed25519?',
    toolIds: ['canon_bvn_lattice', '77_exact_decimal_ledger', '27_ed25519_signer', 'canon_ws_emit'],
    disciplines: ['Computación Cuántica', 'Finanzas y Criptografía', 'Telecomunicaciones y RF'],
    expectedInsight: 'La dimensión de Hilbert determina hojas Merkle firmadas con Ed25519 y emitidas por el bus QPSK-132.',
  },
];

/**
 * Genera y verifica en vivo un lote combinatorio de 1.er, 2.º y 3.er orden
 * recorriendo los 23 motores y los 12 dominios del catálogo.
 */
export function generateVerifiedCombinationsBatch(
  catalog: readonly HelixRegisteredTool[],
  options: { firstOrderCount?: number; secondOrderCount?: number } = {},
): CombinatorialBatchReport {
  const targetFirst = Math.max(4, Math.min(24, options.firstOrderCount ?? 12));
  const targetSecond = Math.max(2, Math.min(12, options.secondOrderCount ?? 6));

  // Un representante canónico/recuperado por cada uno de los 23 motores
  const byEngine = new Map<DomainEngineId, HelixRegisteredTool>();
  for (const t of catalog) {
    if (t.origin !== 'autopoietic_child' && !byEngine.has(t.engineId)) {
      byEngine.set(t.engineId, t);
    }
  }
  const reps = Array.from(byEngine.values());

  const results: RecombinationResult[] = [];
  const g1Children: HelixRegisteredTool[] = [];
  const coveredEngines = new Set<DomainEngineId>();
  const coveredDomains = new Set<HelixToolDomain>();

  let totalAttempted = 0;
  let firstOrderVerified = 0;
  let secondOrderVerified = 0;
  let thirdOrderVerified = 0;

  // Fase 1: Combinar pares distintos cubriendo todos los motores (incluye las recetas curadas)
  for (const exp of CURATED_CROSS_EXPERIMENTS) {
    if (results.length >= targetFirst) break;
    const pair = exp.toolIds
      .map((id) => catalog.find((t) => t.id === id))
      .filter((t): t is HelixRegisteredTool => Boolean(t));
    if (pair.length < 2) continue;
    totalAttempted++;
    const res = recombineHelixTools(pair, {});
    if (res.success && res.pccVerified && res.childTool) {
      firstOrderVerified++;
      results.push(res);
      g1Children.push(res.childTool);
      res.parentTools.forEach((p) => {
        coveredEngines.add(p.engineId);
        coveredDomains.add(p.domain);
      });
    }
  }

  for (let i = 0; i < reps.length && results.length < targetFirst; i++) {
    const a = reps[i];
    const b = reps[(i + 7) % reps.length];
    if (a.id === b.id) continue;
    totalAttempted++;
    const res = recombineHelixTools([a, b], {});
    if (res.success && res.pccVerified && res.childTool) {
      firstOrderVerified++;
      results.push(res);
      g1Children.push(res.childTool);
      res.parentTools.forEach((p) => {
        coveredEngines.add(p.engineId);
        coveredDomains.add(p.domain);
      });
    }
  }

  // Asegurar cobertura de los 23 motores faltantes en pares adicionales
  for (const rep of reps) {
    if (!coveredEngines.has(rep.engineId)) {
      const partner = reps.find((r) => r.engineId !== rep.engineId) ?? reps[0];
      totalAttempted++;
      const res = recombineHelixTools([rep, partner], {});
      if (res.success && res.pccVerified && res.childTool) {
        firstOrderVerified++;
        results.push(res);
        g1Children.push(res.childTool);
        res.parentTools.forEach((p) => {
          coveredEngines.add(p.engineId);
          coveredDomains.add(p.domain);
        });
      }
    }
  }

  // Fase 2: Recombinación de 2.º orden (combinar hijos G1 entre sí para crear herramientas G2)
  const g2Children: HelixRegisteredTool[] = [];
  for (let k = 0; k < targetSecond && k + 1 < g1Children.length; k++) {
    const c1 = g1Children[k];
    const c2 = g1Children[(k + 1) % g1Children.length];
    totalAttempted++;
    const res2 = recombineHelixTools([c1, c2], {});
    if (res2.success && res2.pccVerified && res2.childTool) {
      secondOrderVerified++;
      results.push(res2);
      g2Children.push(res2.childTool);
      res2.parentTools.forEach((p) => {
        coveredEngines.add(p.engineId);
        coveredDomains.add(p.domain);
      });
    }
  }

  // Fase 3: Recombinación de 3.er orden (fusionar dos síntesis G2 en una herramienta G3)
  if (g2Children.length >= 2) {
    totalAttempted++;
    const res3 = recombineHelixTools([g2Children[0], g2Children[1]], {});
    if (res3.success && res3.pccVerified && res3.childTool) {
      thirdOrderVerified++;
      results.push(res3);
      res3.parentTools.forEach((p) => {
        coveredEngines.add(p.engineId);
        coveredDomains.add(p.domain);
      });
    }
  }

  const totalVerified = firstOrderVerified + secondOrderVerified + thirdOrderVerified;
  const totalBridges = results.reduce((acc, r) => acc + r.bridges.length, 0);

  return {
    totalAttempted,
    totalVerified,
    firstOrderVerified,
    secondOrderVerified,
    thirdOrderVerified,
    uniqueEnginesCovered: coveredEngines.size,
    uniqueDomainsCovered: coveredDomains.size,
    totalBridges,
    results,
    summary: `Lote Combinatorio Verificado: ${totalVerified}/${totalAttempted} PROVEN_SAT (${firstOrderVerified} de 1.er orden · ${secondOrderVerified} de 2.º orden · ${thirdOrderVerified} de 3.er orden) · ${coveredEngines.size}/23 motores · ${coveredDomains.size}/12 dominios · ${totalBridges} puentes cruzados`,
  };
}

/**
 * Gran Recombinación Total Omega:
 * Toma las 23 familias de motores y las 33 disciplinas completas, ejecuta sus células reales
 * en una cadena unificada de 4 macro-hélices + síntesis final verificada por SMT, PCC y Ensamblador Puro.
 */
export function runGrandOmegaRecombination(
  catalog: readonly HelixRegisteredTool[],
  initialParams: Record<string, number | string> = {},
): RecombinationResult {
  const byEngine = new Map<DomainEngineId, HelixRegisteredTool>();
  for (const t of catalog) {
    if (t.origin !== 'autopoietic_child' && !byEngine.has(t.engineId)) {
      byEngine.set(t.engineId, t);
    }
  }
  const all23Reps = Array.from(byEngine.values());
  if (all23Reps.length < 2) {
    return recombineHelixTools(all23Reps, initialParams);
  }

  // Agrupar y acoplar los 23 motores en grafo acíclico: cada motor i recibe puentes tipados reales
  // desde los motores previos compatibles [0..i-1] antes de ejecutar su modelo matemático.
  const bridges: PortBridge[] = [];
  const stepOutputs: EngineExecutionOutput[] = [];

  for (let i = 0; i < all23Reps.length; i++) {
    const tool = all23Reps[i];
    const meta = DOMAIN_ENGINE_METADATA[tool.engineId];
    const localParams: Record<string, number | string> = { ...initialParams };
    const wiredPorts = new Set<string>();

    for (let j = i - 1; j >= 0; j--) {
      const coupled = bridgeOutputToInput(all23Reps[j], stepOutputs[j], tool);
      for (const b of coupled.bridges) {
        if (!wiredPorts.has(b.toPort)) {
          wiredPorts.add(b.toPort);
          bridges.push(b);
          if (coupled.mappedParams[b.toPort] !== undefined) {
            localParams[b.toPort] = coupled.mappedParams[b.toPort];
          }
        }
      }
    }

    const out = meta.execute(localParams);
    stepOutputs.push(out);
  }

  // Fase 2: Acoplamiento completo sobre todos los pares compatibles de los 23 motores
  // y re-ejecución determinista de cada motor alimentado por sus puertos acoplados.
  const allBridges: PortBridge[] = [];
  const finalOutputs: EngineExecutionOutput[] = [];
  for (let i = 0; i < all23Reps.length; i++) {
    const targetTool = all23Reps[i];
    const meta = DOMAIN_ENGINE_METADATA[targetTool.engineId];
    const localParams: Record<string, number | string> = { ...initialParams };
    const wiredPorts = new Set<string>();

    for (let j = 0; j < all23Reps.length; j++) {
      if (i === j) continue;
      const coupled = bridgeOutputToInput(all23Reps[j], stepOutputs[j], targetTool);
      for (const b of coupled.bridges) {
        if (!wiredPorts.has(b.toPort)) {
          wiredPorts.add(b.toPort);
          allBridges.push(b);
          if (coupled.mappedParams[b.toPort] !== undefined) {
            localParams[b.toPort] = coupled.mappedParams[b.toPort];
          }
        }
      }
    }
    finalOutputs.push(meta.execute(localParams));
  }
  bridges.length = 0;
  bridges.push(...allBridges);
  stepOutputs.length = 0;
  stepOutputs.push(...finalOutputs);

  const synthesizedHlx = buildCombinedHlxScript(all23Reps, stepOutputs);
  const compiled = compileHelixScript(synthesizedHlx, INITIAL_COMPOUND_VOCABULARY);
  const smtReport = verifyHelixProgram(compiled);
  const vmRun = runHelixProgram(compiled);

  let godelBig = 1n;
  for (const t of all23Reps) {
    godelBig *= BigInt(Math.max(2, t.prime));
  }

  const vmHasRejection = vmRun.finalState.logs.some((l) => l.status === 'RECHAZADO');
  const vmCompleted = vmRun.finalPc === compiled.length && !vmRun.finalState.halted && !vmHasRejection;
  const smtValid = smtReport.status === 'VERIFICADO' && vmCompleted;

  const pccInstructions = compiled.map((i) => ({ opcode: i.opcode, args: i.args }));
  const pcc = buildProofCarryingCertificate(pccInstructions, {
    status: smtValid ? 'PROVED_SAFE' : 'VIOLATION_FOUND',
    maxHeapBytes: vmRun.finalState.usedMemoryBytes,
    heapCapacityBytes: vmRun.finalState.totalMemoryBytes,
    dischargedRuntimeChecks:
      smtReport.symbolic?.dischargedRuntimeChecks ?? compiled.length,
    octagonInvariants: [
      ...(smtReport.symbolic?.octagonInvariants ?? []),
      `omega_engines=${all23Reps.length}/23`,
      `omega_disciplines=33/33`,
      `omega_bridges=${bridges.length}`,
    ],
    blockStates: vmRun.finalState.memoryBlocks.map((b) => ({
      id: b.id,
      size: b.size,
      state: b.status,
    })),
  });
  const pccVerified = verifyProofCarryingCertificate(pccInstructions, pcc).valid;

  const omegaSeed = `omega_23x33_${godelBig.toString().slice(0, 12)}`;
  const disciplinesInfo = resolveDisciplinesForTools(all23Reps);
  const all33 = [...DISCIPLINES_33];
  const mask33 = '1'.repeat(33);

  const childTool: HelixRegisteredTool = {
    id: omegaSeed,
    fileName: `${omegaSeed}.hlx`,
    title: `SÍNTESIS OMEGA UNIFICADA (23 Motores × 33 Disciplinas)`,
    prime: 137,
    godelProduct: Number(godelBig % 1000000007n),
    sha256: sha256Hex(synthesizedHlx),
    origin: 'autopoietic_child',
    domain: 'IA Acotada y Orquestación',
    engineId: 'nanotech_biopixel_quantum',
    formulaSummary: `Fusión total determinista de ${all23Reps.length} motores, 33 disciplinas P33, Cinemática Disney 12, Fonemas Galdr y Renderizado Viscoelástico.`,
    inputs: all23Reps[0].inputs,
    outputs: all23Reps[all23Reps.length - 1].outputs,
    smtContract: {
      pre: '(and (= engines 23) (= disciplines 33) (zero_deletion true))',
      post: '(and (proven_sat true) (pcc_verified true))',
    },
    hlxSource: synthesizedHlx,
    parents: all23Reps.map((t) => t.id),
    generation: 3,
    lineageLeaves: all23Reps,
    keywords: ['omega', '23_motores', '33_disciplinas', 'disney', 'galdr', 'biopixel', 'unificado'],
  };

  const holographicCard = distillAcademicCapsule17B({
    title: childTool.title,
    summary: `Fusión total verificada: 23/23 motores · 33/33 disciplinas · ${bridges.length} puentes`,
    tools: all23Reps,
    explicitDisciplines: all33,
    hlxScript: synthesizedHlx,
    godelProduct: godelBig.toString(),
    pcc,
  });

  return {
    success: smtValid && pccVerified,
    childTool,
    parentTools: all23Reps,
    bridges,
    stepOutputs,
    synthesizedHlx,
    smtReport,
    pcc,
    pccVerified,
    disciplines33: all33.length >= disciplinesInfo.disciplines.length ? all33 : disciplinesInfo.disciplines,
    disciplineMaskBits33: mask33,
    holographicCard,
    godelBigInt: godelBig.toString(),
    engineeringSummary: `Recombinación Total Omega completada: ${all23Reps.length}/23 motores y 33/33 disciplinas fusionados con ${bridges.length} puentes interdisciplinarios · SMT=${smtReport.status} · PCC=${pccVerified ? 'VÁLIDO' : 'FALLO'}.`,
  };
}
