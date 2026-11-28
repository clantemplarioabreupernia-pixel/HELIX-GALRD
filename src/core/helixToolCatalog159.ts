import { DEFAULT_HELIX_CELLS, HelixCell } from '../utils/helixCells';
import { sha256Hex } from '../utils/helixPcc';
import {
  DOMAIN_ENGINE_METADATA,
  DomainEngineId,
  PortSpec,
} from './helixDomainEngines';
import { RAW_HLX_CELLS_159 } from './helixRawCells159';

export type HelixToolDomain =
  | 'Espacio y Gravitación'
  | 'Materia Digital y Fluidos'
  | 'Topología y Cimática'
  | 'Computación Cuántica'
  | 'Cinematografía y Audio'
  | 'Telecomunicaciones y RF'
  | 'Finanzas y Criptografía'
  | 'Videojuegos y Mundos 3D'
  | 'Verificación Formal y Seguridad'
  | 'Kernel, Red y Telemetría'
  | 'IA Acotada y Orquestación'
  | 'Química y Termodinámica';

export type ToolOrigin = 'canonical_opcode' | 'recovered_159' | 'autopoietic_child';

export interface HelixRegisteredTool {
  id: string;
  fileName: string;
  title: string;
  prime: number;
  godelProduct: number;
  sha256: string;
  origin: ToolOrigin;
  domain: HelixToolDomain;
  engineId: DomainEngineId;
  formulaSummary: string;
  inputs: PortSpec[];
  outputs: PortSpec[];
  smtContract: {
    pre: string;
    post: string;
  };
  hlxSource: string;
  parents?: string[];
  generation?: number;
  lineageLeaves?: readonly HelixRegisteredTool[];
  keywords: string[];
}

function classifyTool(fileName: string, title: string): {
  domain: HelixToolDomain;
  engineId: DomainEngineId;
} {
  const key = `${fileName} ${title}`.toLowerCase();

  if (key.includes('chem') || key.includes('quim') || key.includes('nernst') || key.includes('gibbs') || key.includes('arrhenius') || key.includes('morse') || key.includes('molecul')) {
    return { domain: 'Química y Termodinámica', engineId: 'chemistry_quantum_thermodynamics' };
  }
  if (key.includes('radar') || key.includes('fmcw') || key.includes('cfar') || key.includes('doppler')) {
    return { domain: 'Telecomunicaciones y RF', engineId: 'radar_fmcw_doppler' };
  }
  if (key.includes('5g') || key.includes('mmwave') || key.includes('rf_') || key.includes('itup676') || key.includes('link_budget')) {
    return { domain: 'Telecomunicaciones y RF', engineId: 'telecom_5g_sat_rf' };
  }
  if (key.includes('orbit') || key.includes('kepler') || key.includes('gravity') || key.includes('schwarzschild') || key.includes('verlet') || key.includes('satellite')) {
    return { domain: 'Espacio y Gravitación', engineId: 'orbital_kepler_verlet' };
  }
  if (key.includes('kinetic') || key.includes('collatz')) {
    return { domain: 'Espacio y Gravitación', engineId: 'kinetic_p33_rational' };
  }
  if (key.includes('tensor') || key.includes('von_mises') || key.includes('frobenius') || key.includes('stress')) {
    return { domain: 'Materia Digital y Fluidos', engineId: 'cauchy_tensor_von_mises' };
  }
  if (key.includes('cauchy') || key.includes('nemesis') || key.includes('biopixel') || key.includes('pauli') || key.includes('point_cloud') || key.includes('phase_')) {
    return { domain: 'Materia Digital y Fluidos', engineId: 'pauli_viscoelastic_soa' };
  }
  if (key.includes('pbr') || key.includes('shader') || key.includes('sss') || key.includes('glasmorph') || key.includes('r8ui')) {
    return { domain: 'Materia Digital y Fluidos', engineId: 'cauchy_optical_sss' };
  }
  if (key.includes('geom') || key.includes('medu') || key.includes('hexagonal') || key.includes('torus') || key.includes('mesh') || key.includes('isometric') || key.includes('render_3d') || key.includes('aurora_graphic')) {
    return { domain: 'Topología y Cimática', engineId: 'geom_seal_topology' };
  }
  if (key.includes('statevector') || key.includes('openqasm') || key.includes('qasm') || key.includes('quantum_gates') || key.includes('quantum_dsl') || key.includes('kronecker') || key.includes('amplitude') || key.includes('svg_circuit')) {
    return { domain: 'Computación Cuántica', engineId: 'quantum_statevector_qasm' };
  }
  if (key.includes('bloch') || key.includes('qubit') || key.includes('hilbert') || key.includes('bvn')) {
    return { domain: 'Computación Cuántica', engineId: 'quantum_bloch_bvn' };
  }
  if (key.includes('lipsync') || key.includes('fft') || key.includes('dsp')) {
    return { domain: 'Cinematografía y Audio', engineId: 'lipsync_3band_dsp' };
  }
  if (key.includes('audio') || key.includes('cymatic') || key.includes('note') || key.includes('melody') || key.includes('webaudio')) {
    return { domain: 'Cinematografía y Audio', engineId: 'audio_p33_cymatic' };
  }
  if (key.includes('storyboard') || key.includes('catmull') || key.includes('camera') || key.includes('easing') || key.includes('palette') || key.includes('teleprompter') || key.includes('chapter') || key.includes('news') || key.includes('reading')) {
    return { domain: 'Cinematografía y Audio', engineId: 'sintergia_cinema_spline' };
  }
  if (key.includes('radar') || key.includes('fmcw') || key.includes('cfar') || key.includes('doppler')) {
    return { domain: 'Telecomunicaciones y RF', engineId: 'radar_fmcw_doppler' };
  }
  if (key.includes('5g') || key.includes('mmwave') || key.includes('rf_') || key.includes('itup676') || key.includes('link_budget')) {
    return { domain: 'Telecomunicaciones y RF', engineId: 'telecom_5g_sat_rf' };
  }
  if (key.includes('qpsk') || key.includes('ws_sync') || key.includes('delta_state') || key.includes('multiplayer')) {
    return { domain: 'Telecomunicaciones y RF', engineId: 'qpsk_telemetry_bus' };
  }
  if (key.includes('annealing')) {
    return { domain: 'IA Acotada y Orquestación', engineId: 'annealing_optimizer' };
  }
  if (key.includes('hmac') || key.includes('ed25519') || key.includes('merkle_tree_proof') || key.includes('crypto_sha') || key.includes('crypto_audit')) {
    return { domain: 'Finanzas y Criptografía', engineId: 'crypto_ed25519_merkle' };
  }
  if (key.includes('ledger') || key.includes('income') || key.includes('cashflow') || key.includes('kpi') || key.includes('escrow') || key.includes('merito') || key.includes('merit') || key.includes('token') || key.includes('supply') || key.includes('merkle') || key.includes('blockchain') || key.includes('cristal') || key.includes('audit') || key.includes('vault') || key.includes('crystal')) {
    return { domain: 'Finanzas y Criptografía', engineId: 'ledger_p33_merkle' };
  }
  if (key.includes('terrain') || key.includes('biome') || key.includes('world') || key.includes('spawner') || key.includes('stage') || key.includes('avatar') || key.includes('automata')) {
    return { domain: 'Videojuegos y Mundos 3D', engineId: 'terrain_fbm_mulberry' };
  }
  if (key.includes('rigid') || key.includes('raycast') || key.includes('gizmo') || key.includes('outliner') || key.includes('scene_schema') || key.includes('undo_redo') || key.includes('swarm')) {
    return { domain: 'Videojuegos y Mundos 3D', engineId: 'rigid_collision_3d' };
  }
  if (key.includes('interval') || key.includes('overlap') || key.includes('gap') || key.includes('frame_containment') || key.includes('counterexample') || key.includes('dual_formal') || key.includes('formal_sat') || key.includes('ast_mesh') || key.includes('pqc') || key.includes('sha_') || key.includes('bio_range') || key.includes('triad') || key.includes('protocol_l2') || key.includes('result_ok')) {
    return { domain: 'Verificación Formal y Seguridad', engineId: 'interval_formal_guard' };
  }
  if (key.includes('omega') || key.includes('architect') || key.includes('adaptive_persona') || key.includes('symbiotic') || key.includes('student') || key.includes('entropy') || key.includes('shannon') || key.includes('design_') || key.includes('material3') || key.includes('m3_') || key.includes('portfolio')) {
    return { domain: 'IA Acotada y Orquestación', engineId: 'neural_smt_synthesizer' };
  }
  return { domain: 'Kernel, Red y Telemetría', engineId: 'qpsk_telemetry_bus' };
}

function classifyCanonicalCell(cell: HelixCell): {
  domain: HelixToolDomain;
  engineId: DomainEngineId;
} {
  switch (cell.id) {
    case 'soa_init':
    case 'curl_step':
    case 'nemesis_decay':
      return { domain: 'Materia Digital y Fluidos', engineId: 'pauli_viscoelastic_soa' };
    case 'bloch_rot':
    case 'bvn_lattice':
      return { domain: 'Computación Cuántica', engineId: 'quantum_bloch_bvn' };
    case 'geom_seal':
    case 'mesh_node':
    case 'mat_orm':
      return { domain: 'Topología y Cimática', engineId: 'geom_seal_topology' };
    case 'cam_6dof':
      return { domain: 'Cinematografía y Audio', engineId: 'sintergia_cinema_spline' };
    case 'weber_guard':
    case 'auth_check':
    case 'fn_requires':
    case 'fn_ensures':
      return { domain: 'Verificación Formal y Seguridad', engineId: 'interval_formal_guard' };
    case 'ws_emit':
      return { domain: 'Telecomunicaciones y RF', engineId: 'qpsk_telemetry_bus' };
    case 'itu_p676':
    case 'mmwave_3gpp':
      return { domain: 'Telecomunicaciones y RF', engineId: 'telecom_5g_sat_rf' };
    case 'radar_fmcw':
      return { domain: 'Telecomunicaciones y RF', engineId: 'radar_fmcw_doppler' };
    case 'anneal_opt':
      return { domain: 'IA Acotada y Orquestación', engineId: 'annealing_optimizer' };
    case 'crypto_audit':
      return { domain: 'Finanzas y Criptografía', engineId: 'crypto_ed25519_merkle' };
    case 'cauchy_optic':
      return { domain: 'Materia Digital y Fluidos', engineId: 'cauchy_optical_sss' };
    case 'nano_brus':
      return { domain: 'Materia Digital y Fluidos', engineId: 'nanotech_biopixel_quantum' };
    case 'tensor_vm':
      return { domain: 'Materia Digital y Fluidos', engineId: 'cauchy_tensor_von_mises' };
    case 'galdr_synth':
      return { domain: 'Cinematografía y Audio', engineId: 'audio_p33_cymatic' };
    case 'lipsync_dsp':
      return { domain: 'Cinematografía y Audio', engineId: 'lipsync_3band_dsp' };
    case 'disney_kin12':
      return { domain: 'Cinematografía y Audio', engineId: 'sintergia_cinema_spline' };
    case 'orbit_kepler':
      return { domain: 'Espacio y Gravitación', engineId: 'orbital_kepler_verlet' };
    case 'kinetic_p33':
      return { domain: 'Espacio y Gravitación', engineId: 'kinetic_p33_rational' };
    case 'qasm_state':
      return { domain: 'Computación Cuántica', engineId: 'quantum_statevector_qasm' };
    case 'terrain_fbm':
      return { domain: 'Videojuegos y Mundos 3D', engineId: 'terrain_fbm_mulberry' };
    case 'rigid_collide':
      return { domain: 'Videojuegos y Mundos 3D', engineId: 'rigid_collision_3d' };
    case 'ledger_merkle':
      return { domain: 'Finanzas y Criptografía', engineId: 'ledger_p33_merkle' };
    case 'chem_thermo':
      return { domain: 'Química y Termodinámica', engineId: 'chemistry_quantum_thermodynamics' };
    default:
      return { domain: 'Kernel, Red y Telemetría', engineId: 'kinetic_p33_rational' };
  }
}

function extractKeywords(fileName: string, title: string, domain: string): string[] {
  const tokens = `${fileName.replace('.hlx', '')} ${title} ${domain}`
    .toLowerCase()
    .split(/[^a-z0-9áéíóúñ]+/)
    .filter((t) => t.length >= 2);
  return Array.from(new Set(tokens));
}

function buildCanonicalTools(): HelixRegisteredTool[] {
  return DEFAULT_HELIX_CELLS.map((cell) => {
    const { domain, engineId } = classifyCanonicalCell(cell);
    const meta = DOMAIN_ENGINE_METADATA[engineId];
    const numericGodel = Number(cell.godelProduct) || 2;
    return {
      id: `canon_${cell.id}`,
      fileName: cell.fileName,
      title: `${cell.opcode} · ${cell.description}`,
      prime: numericGodel,
      godelProduct: numericGodel,
      sha256: cell.cellSha256,
      origin: 'canonical_opcode',
      domain,
      engineId,
      formulaSummary: meta.formulaSummary,
      inputs: meta.inputs,
      outputs: meta.outputs,
      smtContract: {
        pre: `(and (valid_glyph "${cell.glyphs}") (>= heap_free 0))`,
        post: `(and (sha256_sealed "${cell.cellSha256.slice(0, 12)}") (proven_sat true))`,
      },
      hlxSource: `ᛇᚢ\nᛗᚦ sys_admin\n${cell.glyphs}\nᚳᛏ`,
      keywords: extractKeywords(cell.fileName, `${cell.opcode} ${cell.description}`, domain),
    };
  });
}

function buildRecovered159Tools(): HelixRegisteredTool[] {
  return RAW_HLX_CELLS_159.map((rec) => {
    const id = rec.fileName.replace('.hlx', '');
    const { domain, engineId } = classifyTool(rec.fileName, rec.title);
    const meta = DOMAIN_ENGINE_METADATA[engineId];
    return {
      id,
      fileName: rec.fileName,
      title: rec.title,
      prime: rec.prime,
      godelProduct: rec.prime,
      sha256: sha256Hex(`${rec.fileName}|${rec.prime}|${rec.hlxSource}`),
      origin: 'recovered_159',
      domain,
      engineId,
      formulaSummary: meta.formulaSummary,
      inputs: meta.inputs,
      outputs: meta.outputs,
      smtContract: {
        pre: `(and (> prime_${rec.prime} 1) (bounded_memory_28b true))`,
        post: `(and (= engine "${engineId}") (invariant_ok true))`,
      },
      hlxSource: rec.hlxSource,
      keywords: extractKeywords(rec.fileName, rec.title, domain),
    };
  });
}

function buildNanotechCoupledTool(): HelixRegisteredTool {
  const engineId: DomainEngineId = 'nanotech_biopixel_quantum';
  const meta = DOMAIN_ENGINE_METADATA[engineId];
  const hlxSource = [
    '# BIOPÍXEL NANOTECNOLÓGICO ACOPLADO (Brus + WKB + Mott-Gurney + Maxwell Z4 + EUV)',
    'ᛇᚢ',
    'ᛗᚦ sys_admin',
    'SOA_INIT 32',
    'CURL_STEP 0.38 0.016',
    'BLOCH_ROT 0 1 0 1.05 1',
    'NEMESIS_DECAY 0.08',
    'GEOM_SEAL ICOSAHEDRON PHI_FIBONACCI 457.84',
    'ᚳᛏ',
  ].join('\n');
  return {
    id: '200_nanotech_biopixel_z4',
    fileName: '200_nanotech_biopixel_z4.hlx',
    title: meta.label,
    prime: 137,
    godelProduct: 137,
    sha256: sha256Hex(`200_nanotech_biopixel_z4|137|${hlxSource}`),
    origin: 'canonical_opcode',
    domain: 'Materia Digital y Fluidos',
    engineId,
    formulaSummary: meta.formulaSummary,
    inputs: meta.inputs,
    outputs: meta.outputs,
    smtContract: {
      pre: '(and (> lambda_nm 380) (<= tension 1.0))',
      post: '(and (> brus_radius_nm 0) (<= z4_polarity 3))',
    },
    hlxSource,
    keywords: [
      'nanotecnologia',
      'biopixel',
      'brus',
      'wkb',
      'mott',
      'gurney',
      'maxwell',
      'fotonico',
      'euv',
      'rayleigh',
      'igzo',
      'z4',
      'cubo',
      '6',
      'caras',
      'holograma',
      '36000',
    ],
  };
}

function buildChemistryTools(): HelixRegisteredTool[] {
  const engineId: DomainEngineId = 'chemistry_quantum_thermodynamics';
  const meta = DOMAIN_ENGINE_METADATA[engineId];
  const nernstHlx = [
    '# QUÍMICA ELECTROQUÍMICA Y TERMODINÁMICA (PV=nRT · ΔG · Nernst)',
    'ᛇᚢ',
    'ᛗᚦ sys_admin',
    'SET temp_k 298',
    'SET delta_h -48',
    'GEOM_SEAL ICOSAHEDRON PHI_FIBONACCI 457.84',
    'ᚳᛏ',
  ].join('\n');
  const morseHlx = [
    '# ENLACE ANARMÓNICO DE MORSE Y CINÉTICA ARRHENIUS',
    'ᛇᚢ',
    'ᛗᚦ sys_admin',
    'SOA_INIT 32',
    'CURL_STEP 0.34 0.016',
    'NEMESIS_DECAY 0.08',
    'GEOM_SEAL TORUS_T2 PHI_FIBONACCI 512.0',
    'ᚳᛏ',
  ].join('\n');
  return [
    {
      id: '201_chemistry_nernst_gibbs',
      fileName: '201_chemistry_nernst_gibbs.hlx',
      title: 'Termodinámica Química (Gibbs · Gases Ideales · Nernst)',
      prime: 113,
      godelProduct: 113,
      sha256: sha256Hex(`201_chemistry_nernst_gibbs|113|${nernstHlx}`),
      origin: 'canonical_opcode',
      domain: 'Química y Termodinámica',
      engineId,
      formulaSummary: meta.formulaSummary,
      inputs: meta.inputs,
      outputs: meta.outputs,
      smtContract: {
        pre: '(and (> temp_k 0) (> volume_l 0))',
        post: '(and (finite_gibbs true) (nernst_bounded true))',
      },
      hlxSource: nernstHlx,
      keywords: ['quimica', 'termodinamica', 'gibbs', 'nernst', 'gases', 'ph', 'electroquimica', 'reaccion'],
    },
    {
      id: '202_chemistry_morse_arrhenius',
      fileName: '202_chemistry_morse_arrhenius.hlx',
      title: 'Enlace Molecular Morse y Cinética de Arrhenius',
      prime: 127,
      godelProduct: 127,
      sha256: sha256Hex(`202_chemistry_morse_arrhenius|127|${morseHlx}`),
      origin: 'canonical_opcode',
      domain: 'Química y Termodinámica',
      engineId,
      formulaSummary: 'V(r)=D_e·(1-e^(-a(r-r_e)))² y k=A·e^(-Ea/RT)',
      inputs: meta.inputs,
      outputs: meta.outputs,
      smtContract: {
        pre: '(and (> morse_de_ev 0) (> temp_k 50))',
        post: '(and (>= morse_potential_ev 0) (> arrhenius_rate 0))',
      },
      hlxSource: morseHlx,
      keywords: ['molecula', 'enlace', 'morse', 'arrhenius', 'cinetica', 'quimica', 'orbital'],
    },
  ];
}

export const BASE_HELIX_TOOL_CATALOG: readonly HelixRegisteredTool[] = [
  ...buildCanonicalTools(),
  ...buildRecovered159Tools(),
  buildNanotechCoupledTool(),
  ...buildChemistryTools(),
];
