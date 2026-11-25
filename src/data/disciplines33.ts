import { CubeFacesZ4, deriveCubeFacesForPrime, RUNES } from './runes';
import type { DomainEngineId } from '../core/helixDomainEngines';
import type { HelixRegisteredTool, HelixToolDomain } from '../core/helixToolCatalog159';

export interface Discipline33 {
  bitIndex: number; // 0..32 (Canal 0 de Qpsk132Frame)
  index: number; // 1..33
  prime: number; // 2..137
  glyph: string;
  runeName: string;
  frequencyHz: number;
  id: string;
  name: string;
  faculty: string;
  domainMatch: HelixToolDomain;
  primaryEngineId: DomainEngineId;
  canonicalEquation: string;
  keywords: string[];
  cubeFaces: CubeFacesZ4;
}

interface DisciplineSeed {
  id: string;
  name: string;
  faculty: string;
  domainMatch: HelixToolDomain;
  primaryEngineId: DomainEngineId;
  canonicalEquation: string;
  keywords: string[];
}

const DISCIPLINE_SEEDS_33: readonly DisciplineSeed[] = [
  {
    id: 'disc_01_memoria_soa',
    name: 'Estructuras de Datos Contiguas y SoA',
    faculty: 'Arquitectura de Silicio',
    domainMatch: 'Materia Digital y Fluidos',
    primaryEngineId: 'pauli_viscoelastic_soa',
    canonicalEquation: 'Stride = 7 * Float32 = 28 B/celda (Zero-GC)',
    keywords: ['soa', 'pauli', 'memoria', 'buffer', 'zero-gc'],
  },
  {
    id: 'disc_02_termodinamica_kernel',
    name: 'Termodinámica Computacional y Homeostasis',
    faculty: 'Física Teórica',
    domainMatch: 'Materia Digital y Fluidos',
    primaryEngineId: 'pauli_viscoelastic_soa',
    canonicalEquation: 'T(t+dt) = T(t) * exp(-gamma * dt)',
    keywords: ['termodinamica', 'nemesis', 'homeostasis', 'decay', 'calor'],
  },
  {
    id: 'disc_03_seguridad_formal',
    name: 'Verificación Formal y Contratos SMT',
    faculty: 'Lógica y Cómputo',
    domainMatch: 'Verificación Formal y Seguridad',
    primaryEngineId: 'interval_formal_guard',
    canonicalEquation: 'min <= x <= max & (REQUIRES => ENSURES)',
    keywords: ['smt', 'acl', 'intervalo', 'contrato', 'formal', 'octagon'],
  },
  {
    id: 'disc_04_acustica_cimatica',
    name: 'Acústica Armónica 29-EDO y Cimática',
    faculty: 'Acústica y Audio',
    domainMatch: 'Cinematografía y Audio',
    primaryEngineId: 'audio_p33_cymatic',
    canonicalEquation: 'f_n = f_0 * (p_i / 2)^k [Hz]',
    keywords: ['audio', 'acustica', 'cimatica', 'hz', 'armonia', 'frecuencia'],
  },
  {
    id: 'disc_05_mecanica_orbital',
    name: 'Astrodinámica y Mecánica Orbital Kepler',
    faculty: 'Aeroespacial',
    domainMatch: 'Espacio y Gravitación',
    primaryEngineId: 'orbital_kepler_verlet',
    canonicalEquation: 'v_orb = sqrt(GM / r), x(t+dt) = 2x - x_prev + a*dt^2',
    keywords: ['orbita', 'kepler', 'verlet', 'espacio', 'satelite', 'gravedad'],
  },
  {
    id: 'disc_06_cinematica_p33',
    name: 'Cinemática Exacta en Subanillo P33',
    faculty: 'Física Matemática',
    domainMatch: 'Espacio y Gravitación',
    primaryEngineId: 'kinetic_p33_rational',
    canonicalEquation: 'x(t) = x_0 + v*t + 0.5*a*t^2 en Q(P_33)',
    keywords: ['cinematica', 'collatz', 'racional', 'p33', 'trayectoria'],
  },
  {
    id: 'disc_07_mecanica_medios_continuos',
    name: 'Tensor de Cauchy y Plasticidad von Mises',
    faculty: 'Ingeniería Mecánica',
    domainMatch: 'Materia Digital y Fluidos',
    primaryEngineId: 'cauchy_tensor_von_mises',
    canonicalEquation: 'sigma_vm = sqrt(0.5*((s1-s2)^2+(s2-s3)^2+(s3-s1)^2))',
    keywords: ['tensor', 'cauchy', 'von_mises', 'esfuerzo', 'estres', 'frobenius'],
  },
  {
    id: 'disc_08_optica_cauchy',
    name: 'Óptica Espectral y Dispersión de Cauchy',
    faculty: 'Fotónica',
    domainMatch: 'Materia Digital y Fluidos',
    primaryEngineId: 'cauchy_optical_sss',
    canonicalEquation: 'n(lambda) = A + B / lambda^2 (RGB Fraunhofer)',
    keywords: ['optica', 'dispersion', 'sss', 'shader', 'refraccion', 'pbr'],
  },
  {
    id: 'disc_09_radar_fmcw',
    name: 'Radar FMCW 77 GHz y Procesamiento Doppler',
    faculty: 'Telecomunicaciones',
    domainMatch: 'Telecomunicaciones y RF',
    primaryEngineId: 'radar_fmcw_doppler',
    canonicalEquation: 'dR = c / (2*B), f_D = 2*v / lambda, CFAR-2D',
    keywords: ['radar', 'fmcw', 'doppler', 'cfar', 'fft', '77ghz'],
  },
  {
    id: 'disc_10_optimizacion_recocido',
    name: 'Optimización Combinatoria y Recocido Simulado',
    faculty: 'Investigación Operativa',
    domainMatch: 'IA Acotada y Orquestación',
    primaryEngineId: 'annealing_optimizer',
    canonicalEquation: 'P(accept) = exp(-dE / T), T_{k+1} = alpha * T_k',
    keywords: ['annealing', 'recocido', 'rastrigin', 'optimizacion', 'metropolis'],
  },
  {
    id: 'disc_11_criptografia_ed25519',
    name: 'Criptografía Auditada Ed25519, HMAC y Merkle',
    faculty: 'Ciberseguridad',
    domainMatch: 'Finanzas y Criptografía',
    primaryEngineId: 'crypto_ed25519_merkle',
    canonicalEquation: 'Root = SHA256(H_left || H_right), HMAC-SHA256',
    keywords: ['ed25519', 'hmac', 'merkle', 'sha256', 'firma', 'crypto'],
  },
  {
    id: 'disc_12_dinamica_fluidos',
    name: 'Hidrodinámica Curl-Noise y Viscoelasticidad',
    faculty: 'Física de Fluidos',
    domainMatch: 'Materia Digital y Fluidos',
    primaryEngineId: 'pauli_viscoelastic_soa',
    canonicalEquation: 'div(v) = 0, sigma = E*eps + eta*d(eps)/dt',
    keywords: ['fluido', 'navier', 'curl', 'kelvin', 'voigt', 'biopixel'],
  },
  {
    id: 'disc_13_topologia_geometrica',
    name: 'Topología Diferencial y Sello de Euler',
    faculty: 'Geometría',
    domainMatch: 'Topología y Cimática',
    primaryEngineId: 'geom_seal_topology',
    canonicalEquation: 'chi = V - E + F, Muestreo de Fibonacci phi',
    keywords: ['topologia', 'euler', 'toro', 'icosaedro', 'malla', 'geom'],
  },
  {
    id: 'disc_14_entropia_shannon',
    name: 'Teoría de la Información y Entropía Cuántica',
    faculty: 'Ciencias de la Información',
    domainMatch: 'Computación Cuántica',
    primaryEngineId: 'quantum_statevector_qasm',
    canonicalEquation: 'H(X) = -sum p_i * log2(p_i) [bits]',
    keywords: ['entropia', 'shannon', 'aleatorio', 'qasm', 'statevector'],
  },
  {
    id: 'disc_15_aislamiento_pcc',
    name: 'Proof-Carrying Code y Aislamiento Determinista',
    faculty: 'Compiladores Seguros',
    domainMatch: 'Verificación Formal y Seguridad',
    primaryEngineId: 'interval_formal_guard',
    canonicalEquation: 'Cert = SHA256(ProgramSha | DnaSha | InvariantsHash)',
    keywords: ['pcc', 'sandbox', 'certificado', 'aislamiento', 'guard'],
  },
  {
    id: 'disc_16_psicofisica_weber',
    name: 'Psicofísica de Weber-Fechner y Sincronía',
    faculty: 'Percepción y Control',
    domainMatch: 'IA Acotada y Orquestación',
    primaryEngineId: 'neural_smt_synthesizer',
    canonicalEquation: 'dI / I >= k_weber => RENDER_FRAME',
    keywords: ['weber', 'fechner', 'reloj', 'energia', 'umbral', 'sincronia'],
  },
  {
    id: 'disc_17_compilacion_multitarget',
    name: 'Síntesis Multi-Target (Go, GLSL, JS, HTML5)',
    faculty: 'Ingeniería de Compiladores',
    domainMatch: 'Verificación Formal y Seguridad',
    primaryEngineId: 'interval_formal_guard',
    canonicalEquation: 'AST(P33) -> {Go, GLSL ES 3.00, JS ESM, HTML5}',
    keywords: ['compilador', 'go', 'glsl', 'html5', 'javascript', 'target'],
  },
  {
    id: 'disc_18_mecanica_cuantica_bloch',
    name: 'Dinámica Unitaria SU(2) y Esfera de Bloch',
    faculty: 'Física Cuántica',
    domainMatch: 'Computación Cuántica',
    primaryEngineId: 'quantum_bloch_bvn',
    canonicalEquation: 'U(t) = exp(-i*H*t/hbar), ||psi||^2 = 1',
    keywords: ['bloch', 'qubit', 'su2', 'schrodinger', 'unitario'],
  },
  {
    id: 'disc_19_telemetria_qpsk132',
    name: 'Transmisión Holográfica QPSK-132 (17 Bytes)',
    faculty: 'Sistemas Distribuidos',
    domainMatch: 'Telecomunicaciones y RF',
    primaryEngineId: 'qpsk_telemetry_bus',
    canonicalEquation: '4 canales * 33 bits = 132 bits = 66 Z4 = 17 B',
    keywords: ['qpsk', '17b', 'z4', 'telemetria', 'bus', 'ws'],
  },
  {
    id: 'disc_20_identidad_soberana',
    name: 'Identidad, Gobernanza y Control de Acceso',
    faculty: 'Sistemas Operativos',
    domainMatch: 'Verificación Formal y Seguridad',
    primaryEngineId: 'interval_formal_guard',
    canonicalEquation: 'AUTH_CHECK(uid) => CAPABILITY_GRANT',
    keywords: ['uid', 'identidad', 'acceso', 'sello', 'soberano'],
  },
  {
    id: 'disc_21_procesamiento_voz_dsp',
    name: 'Procesamiento Digital de Voz y LipSync 3 Bandas',
    faculty: 'Señales Biomédicas y Audio',
    domainMatch: 'Cinematografía y Audio',
    primaryEngineId: 'lipsync_3band_dsp',
    canonicalEquation: 'E_low[80-300], E_mid[300-2k], E_high[2k-8k Hz]',
    keywords: ['lipsync', 'voz', 'dsp', 'fft', 'bandas', 'habla'],
  },
  {
    id: 'disc_22_terrenos_procedurales',
    name: 'Geomorfología Fractal fBm y Biomas 3D',
    faculty: 'Gráficos Procedurales',
    domainMatch: 'Videojuegos y Mundos 3D',
    primaryEngineId: 'terrain_fbm_mulberry',
    canonicalEquation: 'h(x,z) = sum_i a^i * noise(b^i * x, b^i * z)',
    keywords: ['terreno', 'fbm', 'bioma', 'mulberry32', 'mapa', 'relieve'],
  },
  {
    id: 'disc_23_cinematografia_splines',
    name: 'Cinematografía 6-DoF y Trayectorias Catmull-Rom',
    faculty: 'Medios Digitales',
    domainMatch: 'Cinematografía y Audio',
    primaryEngineId: 'sintergia_cinema_spline',
    canonicalEquation: 'P(t) = 0.5 * [1 t t^2 t^3] * M_CR * [P0 P1 P2 P3]^T',
    keywords: ['camara', '6dof', 'spline', 'catmull', 'cinematica', 'storyboard'],
  },
  {
    id: 'disc_24_fisica_cuerpos_rigidos',
    name: 'Mecánica de Cuerpos Rígidos y Colisiones 3D',
    faculty: 'Simulación Física',
    domainMatch: 'Videojuegos y Mundos 3D',
    primaryEngineId: 'rigid_collision_3d',
    canonicalEquation: 'J = -(1+e)*(v_rel . n) / (1/m1 + 1/m2)',
    keywords: ['colision', 'rigido', 'raycast', 'gizmo', 'fisica3d'],
  },
  {
    id: 'disc_25_contabilidad_merkle',
    name: 'Contabilidad Exacta en Centavos y Partida Doble',
    faculty: 'Economía y Finanzas',
    domainMatch: 'Finanzas y Criptografía',
    primaryEngineId: 'ledger_p33_merkle',
    canonicalEquation: 'sum(Debitos) - sum(Creditos) == 0 (entero exacto)',
    keywords: ['contabilidad', 'ledger', 'balance', 'finanzas', 'escrow', 'centavos'],
  },
  {
    id: 'disc_26_propagacion_atmosferica',
    name: 'Propagación Atmosférica ITU-R P.676-12 (O2/H2O)',
    faculty: 'Radiofísica',
    domainMatch: 'Telecomunicaciones y RF',
    primaryEngineId: 'telecom_5g_sat_rf',
    canonicalEquation: 'gamma(f) = 0.1820 * f * (N_O2"(f) + N_H2O"(f)) [dB/km]',
    keywords: ['itur', 'p676', 'oxigeno', 'vapor', 'satelital', 'atenuacion'],
  },
  {
    id: 'disc_27_redes_5g_mmwave',
    name: 'Comunicaciones 5G NR / mmWave (3GPP TR 38.901)',
    faculty: 'Ingeniería de Redes',
    domainMatch: 'Telecomunicaciones y RF',
    primaryEngineId: 'telecom_5g_sat_rf',
    canonicalEquation: 'PL_UMi = 32.4 + 21*log10(d_3D) + 20*log10(f_GHz)',
    keywords: ['5g', 'mmwave', '3gpp', 'pathloss', 'umi', 'uma'],
  },
  {
    id: 'disc_28_aprendizaje_autonomo',
    name: 'Aprendizaje Incremental Acotado Mini-GPT',
    faculty: 'Inteligencia Artificial',
    domainMatch: 'IA Acotada y Orquestación',
    primaryEngineId: 'neural_smt_synthesizer',
    canonicalEquation: 'theta_{t+1} = theta_t - eta * grad(L_CE) bajo mascara P33',
    keywords: ['minigpt', 'neural', 'entrenamiento', 'pesos', 'prediccion', 'ia'],
  },
  {
    id: 'disc_29_logica_cuantica_bvn',
    name: 'Retículos Cuánticos de Birkhoff-von Neumann',
    faculty: 'Álgebra Cuántica',
    domainMatch: 'Computación Cuántica',
    primaryEngineId: 'quantum_bloch_bvn',
    canonicalEquation: 'P_a /\ (P_b \/ P_c) != (P_a /\ P_b) \/ (P_a /\ P_c)',
    keywords: ['bvn', 'lattice', 'reticulo', 'birkhoff', 'ortomodular'],
  },
  {
    id: 'disc_30_circuitos_openqasm',
    name: 'Simulación Cuántica Multi-Qubit y OpenQASM',
    faculty: 'Cómputo Cuántico',
    domainMatch: 'Computación Cuántica',
    primaryEngineId: 'quantum_statevector_qasm',
    canonicalEquation: '|psi> = sum alpha_k |k>, compuertas H, CNOT, RZ',
    keywords: ['openqasm', 'ghz', 'cnot', 'hadamard', 'statevector', 'multiqubit'],
  },
  {
    id: 'disc_31_recombinacion_adn',
    name: 'Autopoiesis y Recombinación Genética de Software',
    faculty: 'Ingeniería de Software',
    domainMatch: 'IA Acotada y Orquestación',
    primaryEngineId: 'neural_smt_synthesizer',
    canonicalEquation: 'C_hijo = Bridge(Out(A), In(B)) | preserve_all & zero_deletion',
    keywords: ['recombinacion', 'adn', 'autopoiesis', 'puente', 'acoplamiento'],
  },
  {
    id: 'disc_32_biomedicina_coclear',
    name: 'Bioingeniería Acusto-Óptica y Pulsos Cocleares',
    faculty: 'Biofísica',
    domainMatch: 'Cinematografía y Audio',
    primaryEngineId: 'audio_p33_cymatic',
    canonicalEquation: 'f_coclear = f_runa * R_caraB(Z4), modulacion sinusoide',
    keywords: ['coclear', 'rostro', 'avatar', 'biomedicina', 'pulso', 'holograma'],
  },
  {
    id: 'disc_33_codex_sigrdrifa',
    name: 'Aritmetización de Gödel P33 y Codex Inmutable',
    faculty: 'Matemáticas Fundamentales',
    domainMatch: 'Verificación Formal y Seguridad',
    primaryEngineId: 'interval_formal_guard',
    canonicalEquation: 'G = prod_{k=1..n} p_k^{e_k} (Factorizacion unica)',
    keywords: ['godel', 'primo', 'codex', 'sigrdrifa', 'inmutable', 'checksum'],
  },
];

export const DISCIPLINES_33: readonly Discipline33[] = RUNES.map((rune, i) => {
  const seed = DISCIPLINE_SEEDS_33[i];
  return {
    bitIndex: i,
    index: rune.index,
    prime: rune.prime,
    glyph: rune.glyph,
    runeName: rune.name,
    frequencyHz: rune.frequencyHz,
    id: seed.id,
    name: seed.name,
    faculty: seed.faculty,
    domainMatch: seed.domainMatch,
    primaryEngineId: seed.primaryEngineId,
    canonicalEquation: seed.canonicalEquation,
    keywords: seed.keywords,
    cubeFaces: deriveCubeFacesForPrime(rune.index, rune.prime),
  };
});

export const DISCIPLINE_BY_BIT_INDEX = new Map<number, Discipline33>(
  DISCIPLINES_33.map((d) => [d.bitIndex, d]),
);

export const DISCIPLINE_BY_PRIME = new Map<number, Discipline33>(
  DISCIPLINES_33.map((d) => [d.prime, d]),
);

export const DISCIPLINE_BY_ID = new Map<string, Discipline33>(
  DISCIPLINES_33.map((d) => [d.id, d]),
);

/**
 * Resuelve las disciplinas académicas de P33 (Canal 0 de 33 bits) asociadas a una herramienta.
 */
export function resolveDisciplinesForTool(tool: HelixRegisteredTool): Discipline33[] {
  const haystack = [
    tool.id,
    tool.fileName,
    tool.title,
    tool.domain,
    tool.engineId,
    tool.formulaSummary,
    ...tool.keywords,
  ]
    .join(' ')
    .toLowerCase();

  const scored = DISCIPLINES_33.map((d) => {
    let score = 0;
    if (d.primaryEngineId === tool.engineId) score += 6;
    if (d.domainMatch === tool.domain) score += 2;
    for (const kw of d.keywords) {
      if (haystack.includes(kw)) score += 3;
    }
    return { discipline: d, score };
  })
    .filter((entry) => entry.score >= 3)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored.slice(0, 3).map((s) => s.discipline);
  }

  const fallback =
    DISCIPLINES_33.find((d) => d.primaryEngineId === tool.engineId) ??
    DISCIPLINES_33.find((d) => d.domainMatch === tool.domain) ??
    DISCIPLINES_33[0];
  return [fallback];
}

export function resolveDisciplinesForTools(tools: HelixRegisteredTool[]): {
  disciplines: Discipline33[];
  activeBitIndices: number[];
  maskBits33: string;
} {
  const seen = new Map<number, Discipline33>();
  for (const tool of tools) {
    for (const disc of resolveDisciplinesForTool(tool)) {
      seen.set(disc.bitIndex, disc);
    }
  }
  const disciplines = Array.from(seen.values()).sort((a, b) => a.bitIndex - b.bitIndex);
  const activeBitIndices = disciplines.map((d) => d.bitIndex);
  const bitSet = new Set(activeBitIndices);
  const maskBits33 = Array.from({ length: 33 }, (_, i) => (bitSet.has(i) ? '1' : '0')).join('');
  return { disciplines, activeBitIndices, maskBits33 };
}
