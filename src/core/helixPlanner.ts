import { sha256Hex } from '../utils/helixPcc';
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
    triggers: ['orbit', 'órbita', 'nasa', 'satel', 'kepler', 'cohete', 'nave', 'espaci', 'planeta', 'gravit'],
  },
  {
    engineId: 'radar_fmcw_doppler',
    preferredToolId: '21_radar_fmcw_77ghz',
    triggers: ['radar', 'doppler', 'fmcw', '77 ghz', 'deteccion', 'detección', 'eco'],
  },
  {
    engineId: 'telecom_5g_sat_rf',
    preferredToolId: '23_satellite_itup676',
    triggers: ['5g', 'antena', 'telecom', 'enlace', 'señal', 'senal', 'itu', 'rf', 'ghz', 'satelital'],
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
    triggers: ['fluido', 'líquido', 'liquido', 'navier', 'visco', 'materia', 'agua', 'oceano', 'océano', 'onda'],
  },
  {
    engineId: 'cauchy_optical_sss',
    preferredToolId: 'canon_sss_optics',
    triggers: ['luz', 'óptica', 'optica', 'cristal', 'refrac', 'brillo', 'espectr', 'color', 'laser', 'láser'],
  },
  {
    engineId: 'cauchy_tensor_von_mises',
    preferredToolId: '46_cauchy_tensor6_solver',
    triggers: ['esfuerzo', 'tensión', 'tension', 'estructura', 'mises', 'puente', 'material', 'resistencia', 'presion', 'presión'],
  },
  {
    engineId: 'terrain_fbm_mulberry',
    preferredToolId: '97_terrain_fbm_heightmap',
    triggers: ['terreno', 'montaña', 'montana', 'relieve', 'bioma', 'mapa', 'isla', 'paisaje', 'mundo'],
  },
  {
    engineId: 'rigid_collision_3d',
    preferredToolId: '98_rigid_body_collisions',
    triggers: ['colision', 'colisión', 'rebote', 'caida', 'caída', 'gravedad', 'salto', 'juego', 'videojuego'],
  },
  {
    engineId: 'lipsync_3band_dsp',
    preferredToolId: '71_audio_fft_bands',
    triggers: ['voz', 'habla', 'lipsync', 'labios', 'avatar', 'canto', 'cantar', 'boca'],
  },
  {
    engineId: 'audio_p33_cymatic',
    preferredToolId: '03_audio_p33_cymatic',
    triggers: ['música', 'musica', 'audio', 'sonido', 'hz', 'frecuencia', 'acústic', 'acustic', 'cimátic', 'cimatic', 'ritmo'],
  },
  {
    engineId: 'sintergia_cinema_spline',
    preferredToolId: '72_storyboard_hybrid_capture',
    triggers: ['videoclip', 'video', 'cine', 'pelicula', 'película', 'escena', 'camara', 'cámara', 'historia', 'animac'],
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
];

// Orden natural de tubería de datos para maximizar acoplamientos automáticos entre motores
const PIPELINE_ENGINE_ORDER: Record<DomainEngineId, number> = {
  orbital_kepler_verlet: 10,
  terrain_fbm_mulberry: 12,
  lipsync_3band_dsp: 15,
  audio_p33_cymatic: 18,
  quantum_statevector_qasm: 22,
  quantum_bloch_bvn: 26,
  cauchy_tensor_von_mises: 32,
  pauli_viscoelastic_soa: 38,
  cauchy_optical_sss: 42,
  rigid_collision_3d: 45,
  kinetic_p33_rational: 50,
  telecom_5g_sat_rf: 55,
  radar_fmcw_doppler: 60,
  sintergia_cinema_spline: 65,
  geom_seal_topology: 70,
  ledger_p33_merkle: 80,
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
): ClarificationQuestion[] {
  if (category === 'VIDEOJUEGO') {
    return [
      {
        id: 'world_physics',
        question: persona === 'KID_CREATIVE'
          ? '¿Cómo quieres que se mueva el mundo de tu juego?'
          : '¿Qué modelo de física y gravedad debe gobernar la escena?',
        options: ['Planeta con gravedad y rebotes', 'Espacio sin gravedad (órbita)', 'Terreno de montañas fractales'],
        defaultOption: 'Terreno de montañas fractales',
      },
      {
        id: 'hero_shape',
        question: persona === 'KID_CREATIVE'
          ? '¿Qué personaje o nave principal quieres manejar?'
          : '¿Qué geometría principal representará al protagonista?',
        options: ['Nave esférica / satélite', 'Cristal icosaédrico', 'Toroide energético'],
        defaultOption: 'Cristal icosaédrico',
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
  const params: Record<string, number | string> = {
    narrative: intent,
  };

  // Altitud orbital en km
  const kmMatch = extractFirstNumberNear(combined, /(\d+(?:[.,]\d+)?)\s*km\b/i);
  if (kmMatch !== null && kmMatch > 0) {
    params.radius_km = kmMatch > 6371 ? kmMatch : 6371 + kmMatch;
  } else if (combined.includes('geo') || combined.includes('35786')) {
    params.radius_km = 6371 + 35786;
  } else if (combined.includes('meo') || combined.includes('20200')) {
    params.radius_km = 6371 + 20200;
  } else {
    params.radius_km = 6371 + 400;
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
): string {
  const safeIntent = intent.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rowsHtml = [
    ...dataInputs.map((d) => ({ kind: 'Entrada', ...d })),
    ...dataOutputs.map((d) => ({ kind: 'Salida', ...d })),
  ]
    .map(
      (r) =>
        `<tr><td style="color:#94a3b8">${r.kind}</td><td>${r.label}</td><td style="color:#38bdf8;font-weight:600">${r.value}</td></tr>`,
    )
    .join('');

  const freqSeed = Number(params.freq_hz ?? 528);
  const altSeed = Math.max(150, Math.round(Number(params.radius_km ?? 6771) - 6371));
  const gravSeed = Number(params.gravity_ms2 ?? 1.62);

  let interactiveScript = '';
  let interactiveControls = '';
  let appBadge = 'Simulación Interactiva en Vivo';

  if (category === 'VIDEOJUEGO') {
    appBadge = 'Videojuego Interactivo · Controles WASD / Flechas / Clic';
    interactiveControls =
      '<div class="bar"><span id="hud">Puntuación: 0 · Escudo: 100%</span><button id="btnReset">Reiniciar Misión</button></div>';
    interactiveScript = `
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const hud = document.getElementById('hud');
let ship = { x: 120, y: 150, vy: 0, vx: 0, hp: 100, score: 0 };
let keys = {};
let stars = Array.from({length: 55}, () => ({ x: Math.random()*820, y: Math.random()*300, s: 1+Math.random()*2 }));
let rocks = Array.from({length: 7}, (_, i) => ({ x: 420 + i*95, y: 30 + Math.random()*240, r: 12 + Math.random()*14, sp: 1.8 + Math.random()*1.8 }));
let lasers = [];
window.addEventListener('keydown', (e) => { keys[e.key] = true; if (e.key === ' ') lasers.push({ x: ship.x+18, y: ship.y }); });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });
cv.addEventListener('pointermove', (e) => {
  if (e.buttons) {
    const rc = cv.getBoundingClientRect();
    ship.x = ((e.clientX - rc.left)/rc.width)*cv.width;
    ship.y = ((e.clientY - rc.top)/rc.height)*cv.height;
  }
});
cv.addEventListener('pointerdown', () => lasers.push({ x: ship.x+18, y: ship.y }));
document.getElementById('btnReset').onclick = () => { ship = { x: 120, y: 150, vy: 0, vx: 0, hp: 100, score: 0 }; lasers = []; };
function loop() {
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, cv.width, cv.height);
  for (const st of stars) {
    st.x -= st.s * 0.9;
    if (st.x < 0) st.x = cv.width;
    ctx.fillStyle = 'rgba(186,230,253,0.75)';
    ctx.fillRect(st.x, st.y, st.s, st.s);
  }
  if (keys['ArrowUp'] || keys['w']) ship.vy -= 0.42;
  if (keys['ArrowDown'] || keys['s']) ship.vy += 0.42;
  if (keys['ArrowLeft'] || keys['a']) ship.vx -= 0.42;
  if (keys['ArrowRight'] || keys['d']) ship.vx += 0.42;
  ship.vx *= 0.92; ship.vy *= 0.92;
  ship.x = Math.max(20, Math.min(cv.width - 20, ship.x + ship.vx));
  ship.y = Math.max(20, Math.min(cv.height - 20, ship.y + ship.vy));

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-14, -10); ctx.lineTo(-8, 0); ctx.lineTo(-14, 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f59e0b'; ctx.fillRect(-16, -3, 6, 6);
  ctx.restore();

  lasers = lasers.filter((l) => l.x < cv.width);
  ctx.fillStyle = '#22d3ee';
  for (const l of lasers) { l.x += 9; ctx.fillRect(l.x, l.y - 1.5, 12, 3); }

  for (const r of rocks) {
    r.x -= r.sp;
    if (r.x < -30) { r.x = cv.width + 30; r.y = 25 + Math.random()*(cv.height-50); ship.score += 5; }
    for (const l of lasers) {
      if (Math.hypot(l.x - r.x, l.y - r.y) < r.r + 6) {
        r.x = cv.width + 40; r.y = 25 + Math.random()*(cv.height-50); l.x = cv.width + 99; ship.score += 25;
      }
    }
    if (Math.hypot(ship.x - r.x, ship.y - r.y) < r.r + 12) {
      ship.hp = Math.max(0, ship.hp - 15); r.x = cv.width + 40;
    }
    ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI*2); ctx.stroke();
  }
  hud.textContent = 'Puntuación: ' + ship.score + ' · Escudo: ' + ship.hp + '% · Gravedad campo: ${gravSeed} m/s²';
  requestAnimationFrame(loop);
}
loop();`;
  } else if (category === 'SIMULACION_ESPACIAL' || category === 'TELECOM_RF') {
    appBadge = 'Simulador Orbital y Telemetría en Tiempo Real';
    interactiveControls =
      `<div class="bar"><label>Altitud orbital: <input id="altRange" type="range" min="200" max="35786" value="${altSeed}" /> <strong id="altVal">${altSeed} km</strong></label><span id="orbStats"></span></div>`;
    interactiveScript = `
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const altRange = document.getElementById('altRange');
const altVal = document.getElementById('altVal');
const orbStats = document.getElementById('orbStats');
let ang = 0;
function loop() {
  const alt = Number(altRange.value);
  const rKm = 6371 + alt;
  const vOrb = Math.sqrt(398600.4418 / rKm) * 1000;
  const periodMin = (2 * Math.PI * Math.sqrt((rKm*rKm*rKm) / 398600.4418)) / 60;
  altVal.textContent = alt + ' km';
  orbStats.textContent = 'v = ' + vOrb.toFixed(1) + ' m/s · T = ' + periodMin.toFixed(1) + ' min';
  ang += 0.018 * Math.sqrt(6771 / rKm);
  ctx.fillStyle = '#020617'; ctx.fillRect(0,0,cv.width,cv.height);
  const cx = cv.width/2, cy = cv.height/2;
  const radPx = 56 + (Math.min(alt, 35786)/35786) * 76;
  ctx.strokeStyle = 'rgba(56,189,248,0.35)'; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.arc(cx, cy, radPx, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#1d4ed8'; ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI*2); ctx.fill();
  const sx = cx + Math.cos(ang)*radPx, sy = cy + Math.sin(ang)*radPx;
  ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(52,211,153,0.5)'; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(sx,sy); ctx.stroke();
  requestAnimationFrame(loop);
}
loop();`;
  } else if (category === 'CINEMA_VIDEOCLIP') {
    appBadge = 'Sintetizador Audiovisual Armónico en Vivo';
    interactiveControls =
      `<div class="bar"><label>Frecuencia: <input id="freqRange" type="range" min="110" max="960" value="${freqSeed}" /> <strong id="freqVal">${freqSeed} Hz</strong></label><button id="btnTone">Activar Tono Armónico</button></div>`;
    interactiveScript = `
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const freqRange = document.getElementById('freqRange');
const freqVal = document.getElementById('freqVal');
const btnTone = document.getElementById('btnTone');
let osc = null, audioCtx = null, t = 0;
btnTone.onclick = () => {
  if (osc) { osc.stop(); osc = null; btnTone.textContent = 'Activar Tono Armónico'; return; }
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  gain.gain.value = 0.08;
  osc.frequency.value = Number(freqRange.value);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start();
  btnTone.textContent = 'Silenciar';
};
freqRange.oninput = () => { freqVal.textContent = freqRange.value + ' Hz'; if (osc) osc.frequency.value = Number(freqRange.value); };
function loop() {
  const f = Number(freqRange.value);
  t += 0.03 + (f/528)*0.02;
  ctx.fillStyle = 'rgba(2,6,23,0.22)'; ctx.fillRect(0,0,cv.width,cv.height);
  ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let x = 0; x < cv.width; x += 4) {
    const y = cv.height/2 + Math.sin(x*0.02*(f/440) + t)*55 + Math.cos(x*0.05 - t*1.4)*20;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  requestAnimationFrame(loop);
}
loop();`;
  } else {
    interactiveControls =
      '<div class="bar"><span>Haz clic sobre el lienzo para inyectar ondas viscoelásticas Kelvin-Voigt</span></div>';
    interactiveScript = `
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let t = 0, pulse = 1.0;
cv.addEventListener('pointerdown', () => { pulse = 1.8; });
function loop() {
  t += 0.025;
  pulse = Math.max(0.25, pulse * 0.98);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.25)';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < cv.width; x += 6) {
    const y = cv.height/2 + Math.sin(x * 0.02 + t) * 48 * pulse + Math.cos(x * 0.045 - t * 1.3) * 18;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  requestAnimationFrame(loop);
}
loop();`;
  }

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>App en Vivo · Helix</title>
<style>
  body { font-family: system-ui, sans-serif; background: #070b14; color: #f8fafc; margin: 0; padding: 20px; }
  .wrap { max-width: 880px; margin: 0 auto; display: grid; gap: 14px; }
  .panel { background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 16px; }
  .bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; font-size: 13px; color: #cbd5e1; }
  button { background: #0284c7; color: #fff; border: 0; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
  button:hover { background: #0369a1; }
  canvas { width: 100%; height: 290px; background: #020617; border-radius: 8px; display: block; cursor: crosshair; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 7px 6px; border-bottom: 1px solid #1e293b; }
</style>
</head>
<body>
<div class="wrap">
  <div class="panel">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#38bdf8;margin-bottom:4px">${appBadge}</div>
    <h2 style="margin:0 0 6px;font-size:18px">App Interactiva Generada</h2>
    <p style="margin:0;color:#cbd5e1;font-size:13px">${safeIntent}</p>
  </div>
  <div class="panel">
    ${interactiveControls}
    <canvas id="cv" width="820" height="290"></canvas>
  </div>
  <div class="panel">
    <h3 style="margin:0 0 10px;font-size:14px">Entradas y Salidas Calculadas</h3>
    <table>${rowsHtml}</table>
  </div>
</div>
<script>
${interactiveScript}
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
  const questions = buildQuestionsForCategory(detectedCategory, detectedPersona);
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
    ),
  };
}

