import { sha256Hex } from '../utils/helixPcc';
import { applyLineaRectaFilter } from './helixAutodidactLoop';
import {
  DOMAIN_ENGINE_METADATA,
  DomainEngineId,
  EngineExecutionOutput,
} from './helixDomainEngines';
import {
  PortBridge,
  recombineHelixTools,
  RecombinationResult,
} from './helixRecombinator';
import { HelixRegisteredTool } from './helixToolCatalog159';

export type PersonaMode = 'AUTO' | 'KID_CREATIVE' | 'CREATOR_MEDIA' | 'ENGINEER_SCIENTIST';

export interface ClarificationQuestion {
  id: string;
  question: string;
  options: string[];
  defaultOption: string;
}

export interface DataFieldEntry {
  label: string;
  value: string;
}

export interface EngineeringReport {
  intent: string;
  detectedPersona: Exclude<PersonaMode, 'AUTO'>;
  detectedCategory: 'VIDEOJUEGO' | 'SIMULACION_ESPACIAL' | 'CINEMA_VIDEOCLIP' | 'CUANTICA' | 'FINANZAS_SEGURIDAD' | 'TELECOM_RF' | 'HETEROGENEO';
  clarificationNeeded: boolean;
  questions: ClarificationQuestion[];
  selectedTools: HelixRegisteredTool[];
  activatedEngines: {
    engineId: DomainEngineId;
    label: string;
    formulaSummary: string;
    result: EngineExecutionOutput;
  }[];
  crossBridges: PortBridge[];
  recombination: RecombinationResult | null;
  smtStatus: string;
  pccSha256: string;
  memoryBudgetBytes: number;
  dataInputs: DataFieldEntry[];
  dataOutputs: DataFieldEntry[];
  reportMarkdown: string;
  materializedHtmlPreview: string;
}

const DOMAIN_SIGNAL_RULES: {
  engineId: DomainEngineId;
  preferredToolId: string;
  triggers: string[];
}[] = [
  {
    engineId: 'orbital_kepler_verlet',
    preferredToolId: '123_orbital_mechanics_kepler',
    triggers: ['orbit', 'órbita', 'nasa', 'satel', 'kepler', 'cohete', 'nave', 'espaci', 'planeta', 'gravit', 'luna', 'marte', 'martes', 'astronaut', 'supervivencia', 'aeroespacial'],
  },
  {
    engineId: 'radar_fmcw_doppler',
    preferredToolId: '21_radar_fmcw_77ghz',
    triggers: ['radar', 'doppler', 'fmcw', '77 ghz', 'deteccion', 'detección', 'eco', 'aviacion', 'aviación', 'marina', 'ejercito', 'ejército', 'vuelo'],
  },
  {
    engineId: 'telecom_5g_sat_rf',
    preferredToolId: '23_satellite_itup676',
    triggers: ['5g', 'antena', 'telecom', 'enlace', 'señal', 'senal', 'itu', 'rf', 'ghz', 'satelital', 'radio', 'mision', 'misión'],
  },
  {
    engineId: 'quantum_bloch_bvn',
    preferredToolId: '05_quantum_bloch',
    triggers: ['bloch', 'cuantic', 'cuántic', 'spinor', 'superposicion', 'superposición', 'qubit'],
  },
  {
    engineId: 'quantum_statevector_qasm',
    preferredToolId: '131_statevector_12q_simulator',
    triggers: ['statevector', 'entrelaz', 'qasm', 'qubits', 'entropia', 'entropía', 'cuantic', 'cuántic'],
  },
  {
    engineId: 'pauli_viscoelastic_soa',
    preferredToolId: '02_physics_cauchy_nemesis',
    triggers: ['fluido', 'líquido', 'liquido', 'navier', 'visco', 'materia', 'agua', 'oceano', 'océano', 'onda', 'biomed', 'ultrasonido'],
  },
  {
    engineId: 'cauchy_optical_sss',
    preferredToolId: '04_render_3d_pbr',
    triggers: ['luz', 'óptica', 'optica', 'cristal', 'refrac', 'brillo', 'espectr', 'color', 'laser', 'láser', 'imagen', 'foto', 'mezcla', 'radiacion', 'radiación'],
  },
  {
    engineId: 'cauchy_tensor_von_mises',
    preferredToolId: '46_cauchy_tensor6_solver',
    triggers: ['esfuerzo', 'tensión', 'tension', 'estructura', 'mises', 'puente', 'material', 'resistencia', 'presion', 'presión'],
  },
  {
    engineId: 'terrain_fbm_mulberry',
    preferredToolId: '97_terrain_fbm_heightmap',
    triggers: ['terreno', 'montaña', 'montana', 'relieve', 'bioma', 'mapa', 'isla', 'paisaje', 'mundo', 'lunar', 'marciano'],
  },
  {
    engineId: 'rigid_collision_3d',
    preferredToolId: '98_rigid_body_collisions',
    triggers: ['colision', 'colisión', 'rebote', 'caida', 'caída', 'gravedad', 'salto', 'juego', 'videojuego', 'ejercicio'],
  },
  {
    engineId: 'lipsync_3band_dsp',
    preferredToolId: '71_audio_fft_bands',
    triggers: ['voz', 'habla', 'lipsync', 'labios', 'avatar', 'canto', 'cantar', 'boca', 'animo', 'ánimo'],
  },
  {
    engineId: 'audio_p33_cymatic',
    preferredToolId: '03_audio_p33_cymatic',
    triggers: ['música', 'musica', 'audio', 'sonido', 'hz', 'frecuencia', 'acústic', 'acustic', 'cimátic', 'cimatic', 'ritmo', 'coclear'],
  },
  {
    engineId: 'sintergia_cinema_spline',
    preferredToolId: '72_storyboard_hybrid_capture',
    triggers: ['videoclip', 'video', 'cine', 'pelicula', 'película', 'escena', 'camara', 'cámara', 'historia', 'animac', 'imagen', 'mezcla', 'catedratico', 'catedrático'],
  },
  {
    engineId: 'ledger_p33_merkle',
    preferredToolId: '77_exact_decimal_ledger',
    triggers: ['banco', 'financ', 'dinero', 'pago', 'contab', 'saldo', 'cripto', 'segur', 'moneda'],
  },
  {
    engineId: 'geom_seal_topology',
    preferredToolId: 'canon_geom_seal',
    triggers: ['toroide', 'icosa', 'geometr', 'cristal', 'esfera', 'forma', 'topolog', 'simetr'],
  },
  {
    engineId: 'annealing_optimizer',
    preferredToolId: '10_annealing_solver',
    triggers: ['recocido', 'annealing', 'optimiz', 'rastrigin', 'metropolis', 'minim', 'supervivencia', 'ruta'],
  },
  {
    engineId: 'crypto_ed25519_merkle',
    preferredToolId: '27_ed25519_signer',
    triggers: ['ed25519', 'hmac', 'merkle', 'firma', 'cifrad', 'hash', 'sha256', 'auditor'],
  },
  {
    engineId: 'interval_formal_guard',
    preferredToolId: 'canon_auth_check',
    triggers: ['umbral', 'intervalo', 'invariante', 'seguridad', 'verificacion', 'verificación', 'smt', 'guardia'],
  },
  {
    engineId: 'qpsk_telemetry_bus',
    preferredToolId: 'canon_ws_emit',
    triggers: ['telemetria', 'telemetría', 'sensor', 'luna', 'marte', 'aviacion', 'marina', 'transmision'],
  },
  {
    engineId: 'nanotech_biopixel_quantum',
    preferredToolId: '200_nanotech_biopixel_z4',
    triggers: ['biopixel', 'biopíxel', 'nanotec', 'brus', 'wkb', 'mott', 'gurney', 'igzo', 'euv', 'rayleigh', 'foton', 'fotón', 'cubo', '6 caras', 'holograf', '36000'],
  },
  {
    engineId: 'chemistry_quantum_thermodynamics',
    preferredToolId: '201_chemistry_nernst_gibbs',
    triggers: ['quimic', 'químic', 'molecul', 'molécul', 'reaccion', 'reacción', 'gibbs', 'nernst', 'arrhenius', 'morse', 'ph', 'acido', 'ácido', 'termodinamica', 'termodinámica', 'enlace', 'atomo', 'átomo'],
  },
];

// Orden natural de tubería de datos para maximizar acoplamientos automáticos entre motores
const PIPELINE_ENGINE_ORDER: Record<DomainEngineId, number> = {
  orbital_kepler_verlet: 10,
  terrain_fbm_mulberry: 12,
  lipsync_3band_dsp: 15,
  audio_p33_cymatic: 18,
  quantum_statevector_qasm: 22,
  quantum_bloch_bvn: 26,
  chemistry_quantum_thermodynamics: 27,
  annealing_optimizer: 28,
  cauchy_tensor_von_mises: 32,
  pauli_viscoelastic_soa: 38,
  cauchy_optical_sss: 42,
  nanotech_biopixel_quantum: 44,
  rigid_collision_3d: 45,
  kinetic_p33_rational: 50,
  telecom_5g_sat_rf: 55,
  radar_fmcw_doppler: 60,
  sintergia_cinema_spline: 65,
  geom_seal_topology: 70,
  ledger_p33_merkle: 80,
  crypto_ed25519_merkle: 82,
  interval_formal_guard: 85,
  qpsk_telemetry_bus: 90,
  neural_smt_synthesizer: 95,
};

function detectPersona(intent: string, requested: PersonaMode): Exclude<PersonaMode, 'AUTO'> {
  if (requested !== 'AUTO') return requested;
  const low = intent.toLowerCase();
  if (
    low.includes('niño') ||
    low.includes('nino') ||
    low.includes('juego') ||
    low.includes('juguete') ||
    low.includes('dinosaurio') ||
    low.includes('aventura') ||
    low.includes('robot') ||
    low.includes('fácil')
  ) {
    return 'KID_CREATIVE';
  }
  if (
    low.includes('video') ||
    low.includes('clip') ||
    low.includes('música') ||
    low.includes('musica') ||
    low.includes('cuento') ||
    low.includes('avatar') ||
    low.includes('cancion') ||
    low.includes('pelicula')
  ) {
    return 'CREATOR_MEDIA';
  }
  return 'ENGINEER_SCIENTIST';
}

function detectCategory(intent: string): EngineeringReport['detectedCategory'] {
  const low = intent
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (low.includes('videojuego') || low.includes('juego') || low.includes('nivel') || low.includes('personaje') || low.includes('plataform')) {
    return 'VIDEOJUEGO';
  }
  if (low.includes('cuantic') || low.includes('qubit') || low.includes('bloch') || low.includes('qasm')) {
    return 'CUANTICA';
  }
  if (low.includes('nasa') || low.includes('orbit') || low.includes('espaci') || low.includes('satel') || low.includes('kepler') || low.includes('cohete') || low.includes('planeta') || low.includes('nave')) {
    return 'SIMULACION_ESPACIAL';
  }
  if (low.includes('videoclip') || low.includes('video') || low.includes('musica') || low.includes('voz') || low.includes('cuento') || low.includes('animac') || low.includes('onda') || low.includes('hz')) {
    return 'CINEMA_VIDEOCLIP';
  }
  if (low.includes('5g') || low.includes('radar') || low.includes('antena') || low.includes('telecom') || low.includes('fmcw') || low.includes('rf')) {
    return 'TELECOM_RF';
  }
  if (low.includes('banco') || low.includes('financ') || low.includes('contab') || low.includes('ledger') || low.includes('escrow') || low.includes('merkle')) {
    return 'FINANZAS_SEGURIDAD';
  }
  return 'HETEROGENEO';
}

function buildQuestionsForCategory(
  category: EngineeringReport['detectedCategory'],
  persona: Exclude<PersonaMode, 'AUTO'>,
  intent = '',
): ClarificationQuestion[] {
  const low = intent.toLowerCase();
  const isSpace = /\b(nave|espaci|orbit|órbita|planeta|luna|marte|cohete|satel)\b/.test(low);
  if (category === 'VIDEOJUEGO') {
    return [
      {
        id: 'world_physics',
        question: persona === 'KID_CREATIVE'
          ? '¿Cómo quieres que se mueva el mundo de tu juego?'
          : '¿Qué modelo de física y gravedad debe gobernar la escena?',
        options: ['Espacio sin gravedad (órbita)', 'Planeta con gravedad y rebotes', 'Terreno de montañas fractales'],
        defaultOption: isSpace ? 'Espacio sin gravedad (órbita)' : 'Planeta con gravedad y rebotes',
      },
      {
        id: 'hero_shape',
        question: persona === 'KID_CREATIVE'
          ? '¿Qué personaje o nave principal quieres manejar?'
          : '¿Qué geometría principal representará al protagonista?',
        options: ['Nave orbital articulada', 'Cristal icosaédrico', 'Toroide energético'],
        defaultOption: isSpace ? 'Nave orbital articulada' : 'Cristal icosaédrico',
      },
      {
        id: 'audio_fx',
        question: persona === 'KID_CREATIVE'
          ? '¿Quieres música y sonidos que reaccionen cuando saltas o chocas?'
          : '¿Qué respuesta acústica deseas acoplar?',
        options: ['Resonancia armónica 457.84 Hz', 'Audio 3 bandas reactivo', 'Silencioso determinista'],
        defaultOption: 'Resonancia armónica 457.84 Hz',
      },
    ];
  }
  if (category === 'SIMULACION_ESPACIAL') {
    return [
      {
        id: 'orbit_altitude',
        question: '¿Qué altura orbital quieres simular?',
        options: ['Órbita baja LEO (400 km)', 'Órbita media MEO (20200 km)', 'Órbita geoestacionaria GEO (35786 km)'],
        defaultOption: 'Órbita baja LEO (400 km)',
      },
      {
        id: 'rf_telemetry',
        question: '¿Incluimos enlace satelital y rastreo por radar Doppler?',
        options: ['Sí, enlace satelital 28 GHz', 'Sí, radar Doppler 77 GHz', 'Solo trayectoria orbital'],
        defaultOption: 'Sí, enlace satelital 28 GHz',
      },
    ];
  }
  if (category === 'CINEMA_VIDEOCLIP') {
    return [
      {
        id: 'visual_engine',
        question: '¿Cómo quieres que reaccione visualmente la pantalla líquida?',
        options: ['Fluido luminoso con dispersión óptica', 'Ondas geométricas simétricas', 'Avatar sincronizado con la voz'],
        defaultOption: 'Fluido luminoso con dispersión óptica',
      },
      {
        id: 'fps_target',
        question: '¿Fluidez de cámara y animación?',
        options: ['60 FPS suave', '120 FPS alta velocidad'],
        defaultOption: '60 FPS suave',
      },
    ];
  }
  return [];
}

function selectToolsByCategoryAndIntent(
  intent: string,
  answers: Record<string, string>,
  catalog: readonly HelixRegisteredTool[],
  category: EngineeringReport['detectedCategory'],
): HelixRegisteredTool[] {
  const combined = `${intent} ${Object.values(answers).join(' ')}`.toLowerCase();
  const pick = (id: string) => catalog.find((t) => t.id === id);
  const chosen: HelixRegisteredTool[] = [];

  const pushUniqueByEngine = (t: HelixRegisteredTool | undefined) => {
    if (!t) return;
    if (chosen.some((x) => x.id === t.id || x.engineId === t.engineId)) return;
    chosen.push(t);
  };

  // 1. Selección autónoma multi-dominio guiada por los conceptos detectados en la petición
  const matchedRules: { tool: HelixRegisteredTool; score: number }[] = [];
  for (const rule of DOMAIN_SIGNAL_RULES) {
    let score = 0;
    for (const kw of rule.triggers) {
      if (combined.includes(kw)) score += 1;
    }
    if (score > 0) {
      const candidate =
        pick(rule.preferredToolId) ??
        catalog.find((t) => t.engineId === rule.engineId);
      if (candidate) matchedRules.push({ tool: candidate, score });
    }
  }

  // 2. Complemento por categoría principal para garantizar base física/geométrica sólida
  if (category === 'VIDEOJUEGO') {
    if (combined.includes('espacio') || combined.includes('órbita') || combined.includes('orbita') || combined.includes('nave')) {
      pushUniqueByEngine(pick('123_orbital_mechanics_kepler'));
    } else {
      pushUniqueByEngine(pick('97_terrain_fbm_heightmap'));
    }
    pushUniqueByEngine(pick('98_rigid_body_collisions'));
    pushUniqueByEngine(pick('canon_geom_seal'));
    pushUniqueByEngine(pick('03_audio_p33_cymatic'));
  } else if (category === 'SIMULACION_ESPACIAL') {
    pushUniqueByEngine(pick('123_orbital_mechanics_kepler'));
    if (combined.includes('radar') || combined.includes('fmcw') || combined.includes('doppler')) {
      pushUniqueByEngine(pick('21_radar_fmcw_77ghz'));
    }
    pushUniqueByEngine(pick('23_satellite_itup676'));
    pushUniqueByEngine(pick('canon_geom_seal'));
  } else if (category === 'CINEMA_VIDEOCLIP') {
    pushUniqueByEngine(pick('72_storyboard_hybrid_capture'));
    pushUniqueByEngine(pick('71_audio_fft_bands'));
    pushUniqueByEngine(pick('02_physics_cauchy_nemesis'));
    pushUniqueByEngine(pick('149_catmull_rom_camera_spline'));
  } else if (category === 'CUANTICA') {
    pushUniqueByEngine(pick('05_quantum_bloch'));
    if (matchedRules.length <= 2) {
      pushUniqueByEngine(pick('131_statevector_12q_simulator'));
    }
  } else if (category === 'TELECOM_RF') {
    pushUniqueByEngine(pick('20_5g_mmwave_pathloss'));
    pushUniqueByEngine(pick('23_satellite_itup676'));
    pushUniqueByEngine(pick('21_radar_fmcw_77ghz'));
  } else if (category === 'FINANZAS_SEGURIDAD') {
    pushUniqueByEngine(pick('77_exact_decimal_ledger'));
    pushUniqueByEngine(pick('28_merkle_tree_proof'));
  }

  // 3. Inyectar dominios adicionales solicitados por la petición (cruce autónomo)
  matchedRules
    .sort((a, b) => b.score - a.score)
    .forEach((m) => {
      if (chosen.length < 4) pushUniqueByEngine(m.tool);
    });

  // 4. Respaldo por puntuación general sobre todo el catálogo si la petición es muy abierta
  if (chosen.length < 2) {
    const scored = catalog
      .map((tool) => {
        let score = 0;
        for (const kw of tool.keywords) {
          if (combined.includes(kw)) score += 3;
        }
        if (combined.includes(tool.domain.toLowerCase())) score += 2;
        return { tool, score };
      })
      .sort((a, b) => b.score - a.score);

    for (const entry of scored) {
      if (entry.score > 0 && chosen.length < 3) pushUniqueByEngine(entry.tool);
    }
  }

  if (chosen.length < 2) {
    pushUniqueByEngine(pick('02_physics_cauchy_nemesis'));
    pushUniqueByEngine(pick('canon_geom_seal'));
    pushUniqueByEngine(pick('03_audio_p33_cymatic'));
  }

  // Ordenar según la tubería natural de acoplamiento de datos entre ecuaciones
  return chosen
    .slice(0, 4)
    .sort(
      (a, b) =>
        (PIPELINE_ENGINE_ORDER[a.engineId] ?? 50) -
        (PIPELINE_ENGINE_ORDER[b.engineId] ?? 50),
    );
}

function extractFirstNumberNear(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match || !match[1]) return null;
  const val = Number(match[1].replace(',', '.'));
  return Number.isFinite(val) ? val : null;
}

function buildParamsFromAnswers(
  intent: string,
  answers: Record<string, string>,
  explicitDataInputs: Record<string, number | string> = {},
): Record<string, number | string> {
  const combined = `${intent} ${Object.values(answers).join(' ')}`.toLowerCase();
  const lr = applyLineaRectaFilter(combined);
  const planet = lr.planetaryFrame;
  const params: Record<string, number | string> = {
    narrative: lr.distilledCore || intent,
    mu_km3_s2: planet.muKm3s2,
    gravity_ms2: planet.gravityMs2,
    pressure_hpa: planet.surfacePressureHPa,
  };

  // Altitud orbital en km adaptada al cuerpo planetario (Tierra, Luna o Marte)
  const kmMatch = extractFirstNumberNear(combined, /(\d+(?:[.,]\d+)?)\s*km\b/i);
  if (kmMatch !== null && kmMatch > 0) {
    params.radius_km = kmMatch > planet.meanRadiusKm ? kmMatch : planet.meanRadiusKm + kmMatch;
  } else if (combined.includes('geo') || combined.includes('35786')) {
    params.radius_km = 6371 + 35786;
  } else if (combined.includes('meo') || combined.includes('20200')) {
    params.radius_km = 6371 + 20200;
  } else {
    params.radius_km = planet.meanRadiusKm + (planet.id === 'EARTH' ? 400 : 120);
  }

  // Frecuencia acústica Hz o RF GHz
  const hzMatch = extractFirstNumberNear(combined, /(\d+(?:[.,]\d+)?)\s*hz\b/i);
  if (hzMatch !== null && hzMatch >= 20 && hzMatch <= 2000) {
    params.freq_hz = hzMatch;
  }
  const ghzMatch = extractFirstNumberNear(combined, /(\d+(?:[.,]\d+)?)\s*ghz\b/i);
  if (ghzMatch !== null && ghzMatch >= 0.4) {
    params.freq_ghz = ghzMatch;
  }

  // Gravedad, velocidad, masa, esfuerzo, qubits, FPS
  const gravMatch = extractFirstNumberNear(combined, /gravedad\s*(?:de|=|:)?\s*(\d+(?:[.,]\d+)?)/i);
  if (gravMatch !== null && gravMatch > 0) params.gravity_ms2 = gravMatch;

  const velMatch = extractFirstNumberNear(combined, /(\d+(?:[.,]\d+)?)\s*(?:m\/s|ms)\b/i);
  if (velMatch !== null && velMatch > 0) {
    params.velocity_ms = velMatch;
    params.target_vel_ms = velMatch;
  }

  const massMatch = extractFirstNumberNear(combined, /(\d+(?:[.,]\d+)?)\s*kg\b/i);
  if (massMatch !== null && massMatch > 0) params.mass_kg = massMatch;

  const mpaMatch = extractFirstNumberNear(combined, /(\d+(?:[.,]\d+)?)\s*mpa\b/i);
  if (mpaMatch !== null && mpaMatch > 0) params.sigma_xx = mpaMatch;

  const qubitsMatch = extractFirstNumberNear(combined, /(\d+)\s*qubits?\b/i);
  if (qubitsMatch !== null && qubitsMatch >= 2 && qubitsMatch <= 6) params.qubits = qubitsMatch;

  const moneyMatch = extractFirstNumberNear(combined, /(?:monto|saldo|pago|usd|\$)\s*(\d+(?:[.,]\d+)?)/i);
  if (moneyMatch !== null && moneyMatch > 0) {
    const cents = Math.round(moneyMatch * 100);
    params.debit_cents = cents;
    params.credit_cents = cents;
  }

  if (combined.includes('120 fps')) params.fps = 120;
  if (combined.includes('icosaédrico') || combined.includes('icosahedr')) params.topology = 'ICOSAHEDRON';
  if (combined.includes('toroide') || combined.includes('torus')) params.topology = 'TORUS_T2';

  // Sobrescribir con cualquier entrada estructurada provista en la consola
  for (const [k, v] of Object.entries(explicitDataInputs)) {
    if (v !== '' && v !== undefined && v !== null) {
      params[k] = v;
    }
  }

  return params;
}

const INPUT_LABEL_MAP: Record<string, string> = {
  radius_km: 'Radio orbital',
  altitude_km: 'Altitud orbital',
  freq_hz: 'Frecuencia acústica',
  freq_ghz: 'Frecuencia portadora',
  gravity_ms2: 'Gravedad',
  velocity_ms: 'Velocidad',
  mass_kg: 'Masa',
  sigma_xx: 'Esfuerzo aplicado',
  qubits: 'Qubits',
  fps: 'Cadencia visual',
  seed: 'Semilla determinista',
  debit_cents: 'Monto base',
};

const OUTPUT_METRIC_LABELS: Record<string, [string, string]> = {
  v_orbital_ms: ['Velocidad orbital', 'm/s'],
  period_min: ['Período orbital', 'min'],
  altitude_km: ['Altitud simulada', 'km'],
  snr_db: ['Relación señal/ruido', 'dB'],
  fspl_db: ['Pérdida espacial', 'dB'],
  doppler_shift_hz: ['Desplazamiento Doppler', 'Hz'],
  range_resolution_m: ['Resolución radar', 'm'],
  mean_tension: ['Tensión fluida media', 'Pa'],
  von_mises_mpa: ['Tensión equivalente von Mises', 'MPa'],
  safety_factor: ['Factor de seguridad', '×'],
  n_blue_435nm: ['Refracción espectral azul', 'IOR'],
  euler_chi: ['Invariante topológico χ', ''],
  mean_elevation: ['Elevación media del terreno', 'u'],
  dominant_biome: ['Bioma dominante', ''],
  jaw_open: ['Apertura vocal', 'u'],
  cymatic_freq_hz: ['Frecuencia resonante', 'Hz'],
  duration_sec: ['Duración calculada', 's'],
  total_frames: ['Fotogramas totales', 'frames'],
  norm_squared: ['Norma cuántica ||ψ||²', ''],
  shannon_entropy_bits: ['Entropía cuántica', 'bits'],
  bloch_z: ['Proyección cuántica Z', ''],
  bounces_count: ['Rebotes físicos', ''],
  energy_final_j: ['Energía residual', 'J'],
  balanced: ['Balance contable verificado', ''],
  payout_cents: ['Liquidación neta', 'centavos'],
  mmwave_pl_db: ['Pérdida 3GPP mmWave', 'dB'],
  o2_spec_db_km: ['Atenuación O₂ ITU-R', 'dB/km'],
  h2o_spec_db_km: ['Atenuación H₂O ITU-R', 'dB/km'],
  best_energy: ['Energía mínima Rastrigin', ''],
  merkle_verified: ['Prueba Merkle verificada', ''],
  hmac_verified: ['Integridad HMAC-SHA256', ''],
  brus_radius_nm: ['Radio Punto Cuántico Brus', 'nm'],
  photonic_thz: ['Eigen-frecuencia Cristal Z₄', 'THz'],
  euv_cd_nm: ['Resolución Litografía EUV', 'nm'],
  eqe_percent: ['Eficiencia Cuántica Externa', '%'],
};

function formatHumanInputsAndOutputs(
  params: Record<string, number | string>,
  activatedEngines: EngineeringReport['activatedEngines'],
): { dataInputs: DataFieldEntry[]; dataOutputs: DataFieldEntry[] } {
  const dataInputs: DataFieldEntry[] = [];
  if (typeof params.radius_km === 'number') {
    const alt = Math.max(0, Math.round(params.radius_km - 6371));
    if (alt > 0 && activatedEngines.some((e) => e.engineId === 'orbital_kepler_verlet' || e.engineId === 'telecom_5g_sat_rf')) {
      dataInputs.push({ label: 'Altitud orbital', value: `${alt} km` });
    }
  }
  for (const [k, v] of Object.entries(params)) {
    if (k === 'narrative' || k === 'radius_km' || k === 'credit_cents') continue;
    const label = INPUT_LABEL_MAP[k];
    if (label) {
      dataInputs.push({ label, value: String(v) });
    }
  }
  if (dataInputs.length === 0) {
    dataInputs.push({ label: 'Modalidad', value: 'Petición en lenguaje natural' });
  }

  const dataOutputs: DataFieldEntry[] = [];
  const seenLabels = new Set<string>();
  for (const eng of activatedEngines) {
    for (const [mk, mv] of Object.entries(eng.result.metrics)) {
      const mapping = OUTPUT_METRIC_LABELS[mk];
      if (!mapping) continue;
      const [label, unit] = mapping;
      if (seenLabels.has(label)) continue;
      seenLabels.add(label);
      const formattedVal =
        typeof mv === 'boolean'
          ? mv
            ? 'Sí (íntegro)'
            : 'No'
          : unit
            ? `${mv} ${unit}`
            : String(mv);
      dataOutputs.push({ label, value: formattedVal });
      if (dataOutputs.length >= 6) break;
    }
    if (dataOutputs.length >= 6) break;
  }

  return { dataInputs, dataOutputs };
}

function buildStandaloneArtifactHtml(
  intent: string,
  dataInputs: DataFieldEntry[],
  dataOutputs: DataFieldEntry[],
  category: EngineeringReport['detectedCategory'] = 'HETEROGENEO',
  params: Record<string, number | string> = {},
  activatedEngines: EngineeringReport['activatedEngines'] = [],
): string {
  const safeIntent = intent.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lr = applyLineaRectaFilter(intent);
  const planet = lr.planetaryFrame;
  const engineIds = new Set(activatedEngines.map((e) => e.engineId));

  const isSpaceCraft =
    category === 'SIMULACION_ESPACIAL' ||
    engineIds.has('orbital_kepler_verlet') ||
    /\b(nave|espaci|orbit|órbita|cohete|planeta|luna|marte|asteroide|satel)\b/i.test(intent);
  const isHealthMonitor =
    engineIds.has('interval_formal_guard') ||
    /\b(salud|monitor|astronaut|biomed|hospital|signos|vital|supervivencia|presion|glucosa|ritmo)\b/i.test(intent);
  const isTerrain =
    !isSpaceCraft &&
    (engineIds.has('terrain_fbm_mulberry') || /\b(montañ|terreno|relieve|paisaje|isla|ave|pájar)\b/i.test(intent));
  const isQuantum =
    engineIds.has('quantum_bloch_bvn') ||
    engineIds.has('quantum_statevector_qasm') ||
    engineIds.has('nanotech_biopixel_quantum');

  const modeKey = isHealthMonitor
    ? 'BIOMED_SURVIVAL'
    : isSpaceCraft
      ? 'ORBITAL_3D_FLIGHT'
      : isTerrain
        ? 'FBM_TERRAIN_3D'
        : isQuantum
          ? 'QUANTUM_Z4_LATTICE'
          : 'CAUCHY_SYNTH_3D';

  const freqSeed = Number(params.freq_hz ?? 457.84);
  const altSeed = Math.max(80, Math.round(Number(params.radius_km ?? planet.meanRadiusKm + 400) - planet.meanRadiusKm));
  const gravSeed = Number(params.gravity_ms2 ?? planet.gravityMs2);
  const muSeed = Number(params.mu_km3_s2 ?? planet.muKm3s2);
  const radiusSeed = planet.meanRadiusKm;

  const rowsHtml = [
    ...dataInputs.map((d) => ({ kind: 'Entrada', ...d })),
    ...dataOutputs.map((d) => ({ kind: 'Salida', ...d })),
  ]
    .map(
      (r) =>
        `<tr><td style="color:#94a3b8">${r.kind}</td><td>${r.label}</td><td style="color:#38bdf8;font-weight:600">${r.value}</td></tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Motor Procedural 3D · HELIX</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background: #05080f; color: #f8fafc; margin: 0; padding: 16px; }
  .wrap { max-width: 980px; margin: 0 auto; display: grid; gap: 12px; }
  .panel { background: #0a101d; border: 1px solid #1e293b; border-radius: 8px; padding: 14px; }
  .bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; font-size: 12px; color: #cbd5e1; }
  button, select, input { background: #0f172a; color: #f8fafc; border: 1px solid #334155; border-radius: 6px; padding: 5px 10px; font-size: 12px; }
  button { background: #0284c7; border-color: #0284c7; font-weight: 600; cursor: pointer; }
  canvas { width: 100%; height: 340px; background: #03060c; border-radius: 6px; display: block; cursor: grab; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td { padding: 6px; border-bottom: 1px solid #1e293b; }
</style>
</head>
<body>
<div class="wrap">
  <div class="panel">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#38bdf8;margin-bottom:4px">Proyección Procedural 3D · ${planet.label} · ${modeKey}</div>
    <p style="margin:0;color:#cbd5e1;font-size:13px">${safeIntent}</p>
  </div>
  <div class="panel">
    <div class="bar">
      <span id="hud">Motor 3D acoplado · Arrastra para rotar cámara · WASD / Flechas para maniobrar</span>
      <div style="display:flex;gap:8px;align-items:center">
        <label>Planeta:
          <select id="planetSel">
            <option value="EARTH" ${planet.id === 'EARTH' ? 'selected' : ''}>Tierra (9.81 m/s²)</option>
            <option value="MOON" ${planet.id === 'MOON' ? 'selected' : ''}>Luna (1.62 m/s²)</option>
            <option value="MARS" ${planet.id === 'MARS' ? 'selected' : ''}>Marte (3.72 m/s²)</option>
          </select>
        </label>
        <button id="btnReset">Recentrar</button>
      </div>
    </div>
    <canvas id="cv" width="900" height="340"></canvas>
  </div>
  <div class="panel">
    <table>${rowsHtml}</table>
  </div>
</div>
<script>
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const hud = document.getElementById('hud');
const planetSel = document.getElementById('planetSel');
const MODE = '${modeKey}';
const PLANETS = {
  EARTH: { g: 9.81, mu: 398600.44, r: 6371, colA: '#1d4ed8', colB: '#38bdf8' },
  MOON:  { g: 1.62, mu: 4902.8,    r: 1737.4, colA: '#475569', colB: '#cbd5e1' },
  MARS:  { g: 3.72, mu: 42828.37,  r: 3389.5, colA: '#9a3412', colB: '#fb923c' }
};
let yaw = 0.45, pitch = 0.32, drag = false, lx = 0, ly = 0, t = 0;
let ship = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0 };
const keys = {};
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
cv.addEventListener('pointerdown', e => { drag = true; lx = e.clientX; ly = e.clientY; });
window.addEventListener('pointerup', () => { drag = false; });
window.addEventListener('pointermove', e => {
  if (!drag) return;
  yaw += (e.clientX - lx) * 0.008;
  pitch = Math.max(-1.2, Math.min(1.2, pitch + (e.clientY - ly) * 0.008));
  lx = e.clientX; ly = e.clientY;
});
document.getElementById('btnReset').onclick = () => { yaw = 0.45; pitch = 0.32; ship = { x:0, y:0, z:0, vx:0, vy:0, vz:0, yaw:0 }; };

function proj(x, y, z) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const x1 = x * cy - z * sy;
  const z1 = x * sy + z * cy;
  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp + 6.5;
  if (z2 < 0.4) return null;
  const sc = 420 / z2;
  return { x: cv.width / 2 + x1 * sc, y: cv.height / 2 - y2 * sc, z: z2, s: sc };
}

function drawLine3(a, b, col, w = 1.2) {
  const pa = proj(a[0], a[1], a[2]), pb = proj(b[0], b[1], b[2]);
  if (!pa || !pb) return;
  ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
}

function loop() {
  t += 0.018;
  const p = PLANETS[planetSel.value] || PLANETS.EARTH;
  if (keys['w'] || keys['arrowup']) ship.vz -= 0.015;
  if (keys['s'] || keys['arrowdown']) ship.vz += 0.015;
  if (keys['a'] || keys['arrowleft']) ship.vx -= 0.015;
  if (keys['d'] || keys['arrowright']) ship.vx += 0.015;
  ship.vx *= 0.94; ship.vy *= 0.94; ship.vz *= 0.94;
  ship.x = Math.max(-2.6, Math.min(2.6, ship.x + ship.vx));
  ship.z = Math.max(-2.6, Math.min(2.6, ship.z + ship.vz));

  ctx.fillStyle = '#03060c';
  ctx.fillRect(0, 0, cv.width, cv.height);

  // Grilla espacial / horizonte procedural
  for (let i = -3; i <= 3; i++) {
    drawLine3([i, -1.6, -3], [i, -1.6, 3], 'rgba(56,189,248,0.12)', 1);
    drawLine3([-3, -1.6, i], [3, -1.6, i], 'rgba(56,189,248,0.12)', 1);
  }

  if (MODE === 'ORBITAL_3D_FLIGHT') {
    // Planeta esférico con anillos orbitales de Kepler + nave poliédrica 3D
    for (let lat = -2; lat <= 2; lat++) {
      const rLat = Math.cos(lat * 0.45) * 1.15;
      const yLat = Math.sin(lat * 0.45) * 1.15;
      for (let k = 0; k < 20; k++) {
        const a0 = (k / 20) * Math.PI * 2 + t * 0.25;
        const a1 = ((k + 1) / 20) * Math.PI * 2 + t * 0.25;
        drawLine3([Math.cos(a0)*rLat - 1.4, yLat, Math.sin(a0)*rLat], [Math.cos(a1)*rLat - 1.4, yLat, Math.sin(a1)*rLat], p.colB, 1.1);
      }
    }
    const sx = 1.3 + ship.x * 0.65, sy = 0.25 * Math.sin(t * 2) + ship.y, sz = ship.z * 0.65;
    const nose = [sx + 0.55, sy, sz], lw = [sx - 0.35, sy - 0.08, sz - 0.45], rw = [sx - 0.35, sy - 0.08, sz + 0.45], top = [sx - 0.2, sy + 0.22, sz];
    drawLine3(nose, lw, '#38bdf8', 2); drawLine3(nose, rw, '#38bdf8', 2);
    drawLine3(nose, top, '#e0f2fe', 2); drawLine3(lw, top, '#38bdf8', 1.6);
    drawLine3(rw, top, '#38bdf8', 1.6); drawLine3(lw, rw, '#f59e0b', 1.8);
    const vOrb = Math.sqrt(p.mu / (p.r + ${altSeed})) * 1000;
    hud.textContent = 'Órbita ' + planetSel.value + ' · v_orb=' + vOrb.toFixed(1) + ' m/s · g=' + p.g + ' m/s² · Freq acoplada=${freqSeed} Hz';
  } else {
    // Malla 3D FBM / Cubo Nanotecnológico Z4 de 6 caras
    const N = 12;
    for (let ix = -N/2; ix < N/2; ix++) {
      for (let iz = -N/2; iz < N/2; iz++) {
        const x0 = ix * 0.42, z0 = iz * 0.42;
        const y0 = Math.sin(x0 * 1.8 + t) * Math.cos(z0 * 1.8 - t * 0.7) * 0.45;
        const y1 = Math.sin((x0 + 0.42) * 1.8 + t) * Math.cos(z0 * 1.8 - t * 0.7) * 0.45;
        const y2 = Math.sin(x0 * 1.8 + t) * Math.cos((z0 + 0.42) * 1.8 - t * 0.7) * 0.45;
        drawLine3([x0, y0, z0], [x0 + 0.42, y1, z0], '#38bdf8', 1.2);
        drawLine3([x0, y0, z0], [x0, y2, z0 + 0.42], '#22d3ee', 1.2);
      }
    }
    hud.textContent = 'Campo Procedural 3D HELIX · g=' + p.g + ' m/s² · μ=' + p.mu + ' · Armónico=${freqSeed} Hz';
  }

  requestAnimationFrame(loop);
}
loop();
</script>
</body>
</html>`;
}

/**
 * Ejecuta el protocolo autónomo completo:
 * Petición + Entradas de datos -> Selección y recombinación automática invisible ->
 * Verificación formal interna -> Salidas de datos limpias para la consola.
 */
export function analyzeIntentAndBuildReport(
  intent: string,
  catalog: readonly HelixRegisteredTool[],
  answers: Record<string, string> = {},
  requestedPersona: PersonaMode = 'AUTO',
  explicitDataInputs: Record<string, number | string> = {},
): EngineeringReport {
  const cleanIntent = intent.trim() || 'Simulación líquida toroidal en equilibrio físico';
  const detectedPersona = detectPersona(cleanIntent, requestedPersona);
  const detectedCategory = detectCategory(cleanIntent);
  const questions = buildQuestionsForCategory(detectedCategory, detectedPersona, cleanIntent);
  const clarificationNeeded = questions.some((q) => !answers[q.id]);

  const effectiveAnswers: Record<string, string> = { ...answers };
  for (const q of questions) {
    if (!effectiveAnswers[q.id]) effectiveAnswers[q.id] = q.defaultOption;
  }

  const selectedTools = selectToolsByCategoryAndIntent(
    cleanIntent,
    effectiveAnswers,
    catalog,
    detectedCategory,
  );
  const params = buildParamsFromAnswers(cleanIntent, effectiveAnswers, explicitDataInputs);
  const recombination = recombineHelixTools(selectedTools, params);

  const activatedEngines = selectedTools.map((tool, idx) => {
    const meta = DOMAIN_ENGINE_METADATA[tool.engineId];
    return {
      engineId: tool.engineId,
      label: meta.label,
      formulaSummary: meta.formulaSummary,
      result: recombination.stepOutputs[idx] ?? meta.execute(params),
    };
  });

  const { dataInputs, dataOutputs } = formatHumanInputsAndOutputs(params, activatedEngines);

  const pccSha256 =
    recombination.pcc?.certificateSha256 ?? sha256Hex(`${cleanIntent}|${selectedTools.map((t) => t.id).join('|')}`);
  const memoryBudgetBytes = recombination.pcc?.provedSummary.maxHeapBytes ?? 28 * 32;

  const lines: string[] = [
    `# SÍNTESIS DE SALIDA · HELIX`,
    `- **Petición:** ${cleanIntent}`,
    `- **Entradas:** ${dataInputs.map((d) => `${d.label}: ${d.value}`).join(' · ')}`,
    `- **Salidas:** ${dataOutputs.map((d) => `${d.label}: ${d.value}`).join(' · ')}`,
  ];

  return {
    intent: cleanIntent,
    detectedPersona,
    detectedCategory,
    clarificationNeeded,
    questions,
    selectedTools,
    activatedEngines,
    crossBridges: recombination.bridges,
    recombination,
    smtStatus: recombination.smtReport.status,
    pccSha256,
    memoryBudgetBytes,
    dataInputs,
    dataOutputs,
    reportMarkdown: lines.join('\n'),
    materializedHtmlPreview: buildStandaloneArtifactHtml(
      cleanIntent,
      dataInputs,
      dataOutputs,
      detectedCategory,
      params,
      activatedEngines,
    ),
  };
}

