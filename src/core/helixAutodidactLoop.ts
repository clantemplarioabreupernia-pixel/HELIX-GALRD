import { sha256Hex } from '../utils/helixPcc';
import { AutopoieticCycleReport, runDoubleHelixAutopoiesis } from './helixDoubleHelix';
import { RecombinationResult } from './helixRecombinator';
import {
  HolographicAcademicCard,
  HolographicAcademicLibrary,
  sharedHolographicAcademicLibrary,
} from './holographicAcademicLibrary';

export type PlanetaryFrameId = 'EARTH' | 'MOON' | 'MARS' | 'ORBIT_ZERO_G';

export interface PlanetaryEnvironmentSpec {
  id: PlanetaryFrameId;
  label: string;
  gravityMs2: number;
  muKm3s2: number;
  meanRadiusKm: number;
  surfacePressureHPa: number;
}

export const PLANETARY_FRAMES: Record<PlanetaryFrameId, PlanetaryEnvironmentSpec> = {
  EARTH: {
    id: 'EARTH',
    label: 'Tierra (1g)',
    gravityMs2: 9.81,
    muKm3s2: 398600.4418,
    meanRadiusKm: 6371,
    surfacePressureHPa: 1013.25,
  },
  MOON: {
    id: 'MOON',
    label: 'Luna (0.165g)',
    gravityMs2: 1.62,
    muKm3s2: 4902.8,
    meanRadiusKm: 1737.4,
    surfacePressureHPa: 100,
  },
  MARS: {
    id: 'MARS',
    label: 'Marte (0.379g)',
    gravityMs2: 3.72,
    muKm3s2: 42828.37,
    meanRadiusKm: 3389.5,
    surfacePressureHPa: 100,
  },
  ORBIT_ZERO_G: {
    id: 'ORBIT_ZERO_G',
    label: 'Órbita / Microgravedad',
    gravityMs2: 0.01,
    muKm3s2: 398600.4418,
    meanRadiusKm: 6771,
    surfacePressureHPa: 1013.25,
  },
};

export interface LineaRectaFilteredIntent {
  rawInput: string;
  distilledCore: string;
  noiseWordsStripped: number;
  planetaryFrame: PlanetaryEnvironmentSpec;
  detectedKeywords: string[];
  extractedNumericSignals: Record<string, number>;
  lineageSha256: string;
}

export interface AutodidactCycleOutput {
  lineaRecta: LineaRectaFilteredIntent;
  doubleHelix: AutopoieticCycleReport;
  priorCardsFound: number;
  matchedCards: HolographicAcademicCard[];
  newlyLearnedCard: HolographicAcademicCard | null;
  totalLibraryCards: number;
}

const NOISE_ADJECTIVES_AND_FILLERS = new Set([
  'por',
  'favor',
  'hola',
  'bueno',
  'buena',
  'increible',
  'brutal',
  'locura',
  'super',
  'genial',
  'necesito',
  'quiero',
  'puedes',
  'podrias',
  'hazme',
  'dame',
  'como',
  'para',
  'una',
  'uno',
  'unos',
  'unas',
  'con',
  'sin',
  'que',
  'del',
  'las',
  'los',
  'esto',
  'esta',
  'este',
  'eso',
  'muy',
  'mas',
  'todo',
  'toda',
]);

export function detectPlanetaryFrame(raw: string): PlanetaryEnvironmentSpec {
  const low = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (/\b(luna|lunar|artemis|selene|regolito)\b/.test(low)) {
    return PLANETARY_FRAMES.MOON;
  }
  if (/\b(marte|martes|marciano|marciana|mars)\b/.test(low)) {
    return PLANETARY_FRAMES.MARS;
  }
  if (/\b(orbita|orbital|microgravedad|estacion espacial|iss|espacio profundo|gravedad cero)\b/.test(low)) {
    return PLANETARY_FRAMES.ORBIT_ZERO_G;
  }
  return PLANETARY_FRAMES.EARTH;
}

/**
 * Protocolo de la Línea Recta:
 * Depura el ruido adjetivo/emocional de la entrada y extrae el núcleo factual,
 * las señales numéricas físicas/biomédicas y el marco planetario de operación.
 */
export function applyLineaRectaFilter(rawInput: string): LineaRectaFilteredIntent {
  const normalized = rawInput
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const words = normalized.split(/[^a-z0-9_.,/+%-]+/).filter(Boolean);
  const coreTokens: string[] = [];
  let stripped = 0;

  for (const w of words) {
    if (NOISE_ADJECTIVES_AND_FILLERS.has(w)) {
      stripped += 1;
      continue;
    }
    coreTokens.push(w);
  }

  const distilledCore = coreTokens.join(' ') || normalized;
  const planetaryFrame = detectPlanetaryFrame(rawInput);

  const extractedNumericSignals: Record<string, number> = {};
  const captureNum = (regex: RegExp, key: string) => {
    const m = rawInput.match(regex);
    if (m && m[1]) {
      const val = Number(m[1].replace(',', '.'));
      if (Number.isFinite(val)) extractedNumericSignals[key] = val;
    }
  };

  captureNum(/(\d+(?:[.,]\d+)?)\s*km\b/i, 'altitude_or_distance_km');
  captureNum(/(\d+(?:[.,]\d+)?)\s*hz\b/i, 'frequency_hz');
  captureNum(/(\d+(?:[.,]\d+)?)\s*ghz\b/i, 'carrier_ghz');
  captureNum(/(\d+(?:[.,]\d+)?)\s*(?:bpm|lpm)\b/i, 'heart_rate_bpm');
  captureNum(/(\d+(?:[.,]\d+)?)\s*mg\/dl\b/i, 'blood_glucose_mgdl');
  captureNum(/(\d+(?:[.,]\d+)?)\s*(?:°c|grados)\b/i, 'temperature_c');
  captureNum(/(\d+(?:[.,]\d+)?)\s*mmhg\b/i, 'blood_pressure_mmhg');

  const detectedKeywords = Array.from(
    new Set(coreTokens.filter((t) => t.length >= 3 && !/^\d/.test(t))),
  ).slice(0, 16);

  return {
    rawInput,
    distilledCore,
    noiseWordsStripped: stripped,
    planetaryFrame,
    detectedKeywords,
    extractedNumericSignals,
    lineageSha256: sha256Hex(`${distilledCore}|${planetaryFrame.id}`),
  };
}

/**
 * Bucle Autodidacta Unificado (Especialidades P33 <-> Herramientas <-> Memoria 17B):
 * Consulta conocimiento holográfico previo, activa la Doble Hélice en Z4 y destila
 * una nueva ficha de 17 bytes cuando detecta conocimiento nuevo certificado por PCC.
 */
export function runAutodidactCycle(
  rawIntent: string,
  library: HolographicAcademicLibrary = sharedHolographicAcademicLibrary,
  existingRecombination?: RecombinationResult | null,
): AutodidactCycleOutput {
  const lineaRecta = applyLineaRectaFilter(rawIntent);
  const doubleHelix = runDoubleHelixAutopoiesis(lineaRecta.distilledCore);

  const activeRecomb = existingRecombination ?? doubleHelix.recombination;
  const activeMask = activeRecomb?.disciplineMaskBits33;

  // 1. Consulta en la memoria holográfica de 17 bytes por intersección de bits P33 o búsqueda semántica
  const allCards = library.getCards();
  let matchedCards: HolographicAcademicCard[] = [];

  if (activeMask) {
    const targetBits: number[] = [];
    for (let i = 0; i < activeMask.length; i++) {
      if (activeMask[i] === '1') targetBits.push(i);
    }
    if (targetBits.length > 0) {
      matchedCards = allCards.filter((card) =>
        targetBits.every((b) => card.activeBitIndices.includes(b)),
      );
    }
  }

  if (matchedCards.length === 0 && lineaRecta.detectedKeywords.length > 0) {
    matchedCards = allCards.filter((card) => {
      const hay = `${card.title} ${card.summary} ${card.disciplines.map((d) => d.name).join(' ')}`.toLowerCase();
      return lineaRecta.detectedKeywords.some((kw) => hay.includes(kw));
    });
  }

  // 2. Adquisición autodidacta en 17B si el cruce interdisciplinario aún no tiene ficha combinada propia
  const hasCombinedMatch = matchedCards.some((c) => c.sourceKind === 'autopoietic_recombination');
  let newlyLearnedCard: HolographicAcademicCard | null = null;
  if (
    activeRecomb &&
    activeRecomb.success &&
    activeRecomb.pccVerified &&
    !hasCombinedMatch
  ) {
    newlyLearnedCard = library.ingestRecombination({
      title: activeRecomb.childTool?.title ?? `SÍNTESIS · ${lineaRecta.planetaryFrame.label}`,
      summary: `${lineaRecta.distilledCore.slice(0, 140)} · ${activeRecomb.engineeringSummary}`,
      tools: activeRecomb.parentTools,
      hlxScript: activeRecomb.synthesizedHlx,
      godelProduct: activeRecomb.godelBigInt,
      pcc: activeRecomb.pcc,
    });
    matchedCards = [newlyLearnedCard, ...matchedCards];
  }

  return {
    lineaRecta,
    doubleHelix,
    priorCardsFound: matchedCards.length,
    matchedCards: matchedCards.slice(0, 6),
    newlyLearnedCard,
    totalLibraryCards: library.getCards().length,
  };
}
