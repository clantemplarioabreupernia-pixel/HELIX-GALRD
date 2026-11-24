import { INITIAL_COMPOUND_VOCABULARY } from '../data/vocabulary';
import { DEFAULT_HELIX_CELLS } from '../utils/helixCells';
import {
  createHelixNeuralModel,
  DEFAULT_NEURAL_CONFIG,
  exportNeuralCheckpointPth,
  generateVerifiedFromNeuralModel,
  HelixNeuralModel,
  importNeuralCheckpointPth,
  NeuralGenerationResult,
  NeuralModelConfig,
  trainHelixNeuralSteps,
} from '../utils/helixNeuralEngine';
import {
  compileHelixScript,
  DEFAULT_HELIX_PHYSICS_PROGRAM,
  verifyHelixProgram,
} from '../utils/helixVm';

export interface ParsedCapsuleRecord {
  index: number;
  prompt: string;
  hlxScript: string;
  reply: string;
  domain?: string;
  shape?: string;
  smtVerified: boolean;
  validForTraining: boolean;
  rejectionReason?: string;
}

export interface OfflineMiniGptTrainingReport {
  totalLinesRead: number;
  acceptedCapsulesCount: number;
  rejectedCapsulesCount: number;
  stepsTrained: number;
  parameterCount: number;
  initialLoss: number;
  finalLoss: number;
  finalValLoss: number;
  checkpointJson: string;
  sampleGeneration: NeuralGenerationResult;
  model: HelixNeuralModel;
  acceptedRecords: ParsedCapsuleRecord[];
}

export interface CapsulePredictionResult {
  prompt: string;
  predictedScript: string;
  seedPrefix: string[];
  matchedPrompt: string | null;
  similarityScore: number;
  matchedCapsulesCount: number;
  stepsTrained: number;
  blockedHallucinations: number;
  smtVerified: boolean;
  godelValid: boolean;
  generation: NeuralGenerationResult;
}

export interface TrainedCapsulePredictorState {
  model: HelixNeuralModel;
  sequences: string[][];
  acceptedRecords: ParsedCapsuleRecord[];
  totalLinesRead: number;
  rejectedCapsulesCount: number;
  initialLoss: number;
  finalLoss: number;
  finalValLoss: number;
  checkpointJson: string;
}

function normalizeTextTokens(text: string): Set<string> {
  const clean = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
  return new Set(
    clean
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 3),
  );
}

function computePromptSimilarity(a: string, b: string): number {
  const setA = normalizeTextTokens(a);
  const setB = normalizeTextTokens(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let overlap = 0;
  for (const tok of setA) {
    if (setB.has(tok)) overlap++;
  }
  return overlap / Math.sqrt(setA.size * setB.size);
}

export function normalizeCandidateHlx(rawScript: string): string {
  const cleaned = rawScript
    .replace(/\\n/g, '\n')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (cleaned.length === 0) return '';

  // Normaliza encabezados antiguos tipo "HELIX core 1200 1.2" hacia sintaxis válida MESH_NODE
  const normalizedLines = cleaned.map((line) =>
    line.startsWith('HELIX ') ? `MESH_NODE ${line.slice(6)}` : line,
  );

  const hasBoot = normalizedLines[0] === 'ᛇᚢ' || normalizedLines[0].startsWith('KERN_BOOT');
  const hasExit =
    normalizedLines[normalizedLines.length - 1] === 'ᚳᛏ' ||
    normalizedLines[normalizedLines.length - 1].startsWith('EXIT_OK');

  const body = normalizedLines.map((line) => {
    if (line.startsWith('MESH_NODE ')) {
      const parts = line.split(/\s+/);
      // Formato canónico: MESH_NODE <id> <shape> <triangles> <scale>
      if (parts.length === 4 && /^\d+$/.test(parts[2])) {
        return `MESH_NODE ${parts[1]} torus ${parts[2]} ${parts[3]}`;
      }
    }
    return line;
  });

  const full = [
    ...(hasBoot ? [] : ['ᛇᚢ', 'ᛗᚦ capsule_agent']),
    ...body,
    ...(hasExit ? [] : ['ᚳᛏ']),
  ];
  return full.join('\n');
}

/**
 * Parsea y filtra cápsulas L2 desde `dataset_capsules.jsonl`, validando
 * cada script candidato con el compilador y el verificador formal SMT.
 */
export function parseAndFilterCapsulesJsonl(rawJsonl: string): {
  totalLines: number;
  accepted: ParsedCapsuleRecord[];
  rejected: ParsedCapsuleRecord[];
} {
  const lines = rawJsonl
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const accepted: ParsedCapsuleRecord[] = [];
  const rejected: ParsedCapsuleRecord[] = [];

  lines.forEach((line, index) => {
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      const capsuleObj = (obj.capsule ?? obj.certified ?? {}) as Record<string, unknown>;
      const n1Obj = (obj.n1 ?? {}) as Record<string, unknown>;

      const prompt = String(obj.prompt ?? n1Obj.cleanIntent ?? '').trim();
      const reply = String(capsuleObj.reply ?? '').trim();
      const rawScript = String(
        capsuleObj.hlxScript ?? capsuleObj.hxScript ?? obj.hlxScript ?? '',
      ).trim();

      const isRefusal = /lo siento|no puedo|cannot|sorry|unable/i.test(reply);
      if (isRefusal) {
        rejected.push({
          index,
          prompt,
          hlxScript: rawScript,
          reply,
          smtVerified: false,
          validForTraining: false,
          rejectionReason: 'REFUSAL_FILTERED',
        });
        return;
      }

      const normalizedScript = normalizeCandidateHlx(rawScript);
      if (!normalizedScript) {
        rejected.push({
          index,
          prompt,
          hlxScript: '',
          reply,
          smtVerified: false,
          validForTraining: false,
          rejectionReason: 'EMPTY_SCRIPT',
        });
        return;
      }

      const compiled = compileHelixScript(normalizedScript, INITIAL_COMPOUND_VOCABULARY);
      const report = verifyHelixProgram(compiled);
      const smtVerified =
        report.status === 'VERIFICADO' && report.symbolic?.status === 'PROVED_SAFE';

      if (!smtVerified) {
        rejected.push({
          index,
          prompt,
          hlxScript: normalizedScript,
          reply,
          smtVerified: false,
          validForTraining: false,
          rejectionReason: report.findings[0]?.rule ?? 'SMT_REJECTED',
        });
        return;
      }

      accepted.push({
        index,
        prompt,
        hlxScript: normalizedScript,
        reply,
        domain: typeof n1Obj.domain === 'string' ? n1Obj.domain : undefined,
        shape: typeof n1Obj.shape === 'string' ? n1Obj.shape : typeof capsuleObj.shape === 'string' ? capsuleObj.shape : undefined,
        smtVerified: true,
        validForTraining: true,
      });
    } catch {
      rejected.push({
        index,
        prompt: '',
        hlxScript: '',
        reply: '',
        smtVerified: false,
        validForTraining: false,
        rejectionReason: 'INVALID_JSON',
      });
    }
  });

  return {
    totalLines: lines.length,
    accepted,
    rejected,
  };
}

/**
 * Inicializa y entrena un predictor Mini-GPT vivo a partir de `dataset_capsules.jsonl`
 * (opcionalmente restaurando pesos previos desde un checkpoint `.pth` serializado).
 */
export function createCapsulePredictorFromJsonl(
  rawJsonl: string,
  options: {
    steps?: number;
    seed?: number;
    config?: NeuralModelConfig;
    existingCheckpointJson?: string;
  } = {},
): TrainedCapsulePredictorState {
  const steps = Math.max(4, Math.min(200, Math.round(options.steps ?? 24)));
  const seed = options.seed ?? 1337;
  const parsed = parseAndFilterCapsulesJsonl(rawJsonl);

  const extraScripts = Array.from(
    new Set(
      parsed.accepted.length > 0
        ? parsed.accepted.map((r) => r.hlxScript)
        : [DEFAULT_HELIX_PHYSICS_PROGRAM],
    ),
  );

  const { model: freshModel, sequences } = createHelixNeuralModel(
    INITIAL_COMPOUND_VOCABULARY,
    extraScripts,
    options.config ?? DEFAULT_NEURAL_CONFIG,
    seed,
  );

  let activeModel = freshModel;
  if (options.existingCheckpointJson) {
    try {
      const imported = importNeuralCheckpointPth(options.existingCheckpointJson);
      if (imported.shaMatched && imported.model.vocab.length === freshModel.vocab.length) {
        activeModel = imported.model;
      }
    } catch {
      // Si el checkpoint no coincide en vocabulario, entrena desde freshModel
    }
  }

  trainHelixNeuralSteps(activeModel, sequences, steps);

  const firstPoint = activeModel.lossHistory[0];
  const lastPoint = activeModel.lossHistory[activeModel.lossHistory.length - 1];

  return {
    model: activeModel,
    sequences,
    acceptedRecords: parsed.accepted,
    totalLinesRead: parsed.totalLines,
    rejectedCapsulesCount: parsed.rejected.length,
    initialLoss: firstPoint?.loss ?? 0,
    finalLoss: lastPoint?.loss ?? 0,
    finalValLoss: lastPoint?.valLoss ?? 0,
    checkpointJson: exportNeuralCheckpointPth(activeModel),
  };
}

/**
 * Entrenador Offline del Mini-GPT Causal sobre cápsulas certificadas de `dataset_capsules.jsonl`.
 * Zero dependencias de UI/DOM.
 */
export function trainMiniGptFromCapsulesJsonl(
  rawJsonl: string,
  options: {
    steps?: number;
    seed?: number;
    config?: NeuralModelConfig;
    existingCheckpointJson?: string;
  } = {},
): OfflineMiniGptTrainingReport {
  const predictor = createCapsulePredictorFromJsonl(rawJsonl, options);
  const sampleGeneration = generateVerifiedFromNeuralModel(
    predictor.model,
    INITIAL_COMPOUND_VOCABULARY,
    DEFAULT_HELIX_CELLS,
    0.75,
    9,
    ['ᛇᚢ', 'ᛗᚦ capsule_agent'],
    (options.seed ?? 1337) + 7,
  );

  return {
    totalLinesRead: predictor.totalLinesRead,
    acceptedCapsulesCount: predictor.acceptedRecords.length,
    rejectedCapsulesCount: predictor.rejectedCapsulesCount,
    stepsTrained: predictor.model.trainedSteps,
    parameterCount: predictor.model.parameterCount,
    initialLoss: predictor.initialLoss,
    finalLoss: predictor.finalLoss,
    finalValLoss: predictor.finalValLoss,
    checkpointJson: predictor.checkpointJson,
    sampleGeneration,
    model: predictor.model,
    acceptedRecords: predictor.acceptedRecords,
  };
}

function selectSeedPrefixFromHistory(
  prompt: string,
  acceptedRecords: ParsedCapsuleRecord[],
): {
  seedPrefix: string[];
  matchedRecord: ParsedCapsuleRecord | null;
  similarityScore: number;
} {
  let bestRecord: ParsedCapsuleRecord | null = null;
  let bestScore = 0;

  for (const rec of acceptedRecords) {
    if (!rec.prompt) continue;
    const score = computePromptSimilarity(prompt, rec.prompt);
    if (score > bestScore) {
      bestScore = score;
      bestRecord = rec;
    }
  }

  if (bestRecord && bestScore > 0) {
    const lines = bestRecord.hlxScript
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && l !== 'ᚳᛏ' && l !== 'EXIT_OK');
    const prefix = lines.slice(0, Math.min(3, lines.length));
    if (prefix.length >= 2) {
      return {
        seedPrefix: prefix,
        matchedRecord: bestRecord,
        similarityScore: Number(bestScore.toFixed(4)),
      };
    }
  }

  const low = prompt.toLowerCase();
  const roleTag = /orbit|nave|espaci|satel|juego/i.test(low)
    ? 'root'
    : /onda|m[uú]sica|528|457|audio|fluid/i.test(low)
      ? 'optic_lead'
      : 'capsule_agent';

  return {
    seedPrefix: ['ᛇᚢ', `ᛗᚦ ${roleTag}`],
    matchedRecord: bestRecord,
    similarityScore: Number(bestScore.toFixed(4)),
  };
}

/**
 * Predice una estructura HELIX formalmente verificada utilizando el Mini-GPT
 * entrenado sobre `dataset_capsules.jsonl` y el historial de interacciones certificadas.
 */
export function predictHelixStructureFromHistory(
  predictor: TrainedCapsulePredictorState,
  prompt: string,
  options: { temperature?: number; maxLines?: number; seed?: number } = {},
): CapsulePredictionResult {
  const { seedPrefix, matchedRecord, similarityScore } = selectSeedPrefixFromHistory(
    prompt,
    predictor.acceptedRecords,
  );

  // Semilla determinista derivada del prompt para reproducibilidad en la consola
  let hash = 2166136261;
  for (let i = 0; i < prompt.length; i++) {
    hash ^= prompt.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const generation = generateVerifiedFromNeuralModel(
    predictor.model,
    INITIAL_COMPOUND_VOCABULARY,
    DEFAULT_HELIX_CELLS,
    options.temperature ?? 0.72,
    options.maxLines ?? 9,
    seedPrefix,
    options.seed ?? (hash >>> 0),
  );

  return {
    prompt,
    predictedScript: generation.script,
    seedPrefix,
    matchedPrompt: matchedRecord?.prompt ?? null,
    similarityScore,
    matchedCapsulesCount: predictor.acceptedRecords.length,
    stepsTrained: predictor.model.trainedSteps,
    blockedHallucinations: generation.blockedHallucinations,
    smtVerified:
      generation.verification.status === 'VERIFICADO' &&
      generation.verification.symbolic?.status === 'PROVED_SAFE',
    godelValid: generation.godelReport.valid,
    generation,
  };
}

/**
 * Incorpora una nueva cápsula certificada al historial y ejecuta pasos incrementales
 * de aprendizaje en el Mini-GPT sin reiniciar el servidor.
 */
export function appendCertifiedCapsuleToPredictor(
  predictor: TrainedCapsulePredictorState,
  entry: { prompt: string; reply: string; hlxScript: string; shape?: string; domain?: string },
  retrainSteps = 4,
): boolean {
  const normalized = normalizeCandidateHlx(entry.hlxScript);
  if (!normalized) return false;

  const compiled = compileHelixScript(normalized, INITIAL_COMPOUND_VOCABULARY);
  const report = verifyHelixProgram(compiled);
  if (report.status !== 'VERIFICADO' || report.symbolic?.status !== 'PROVED_SAFE') {
    return false;
  }

  predictor.acceptedRecords.push({
    index: predictor.acceptedRecords.length,
    prompt: entry.prompt,
    hlxScript: normalized,
    reply: entry.reply,
    shape: entry.shape,
    domain: entry.domain,
    smtVerified: true,
    validForTraining: true,
  });
  predictor.totalLinesRead += 1;

  const tokens = ['<BOS>'];
  for (const line of normalized.split(/\r?\n/)) {
    const clean = line.split('#')[0].trim();
    if (!clean) continue;
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.every((tok) => predictor.model.stoi.has(tok))) {
      tokens.push(...parts, '\n');
    }
  }
  tokens.push('<EOS>');
  if (tokens.length >= 4) {
    predictor.sequences.push(tokens);
  }

  trainHelixNeuralSteps(predictor.model, predictor.sequences, Math.max(1, retrainSteps));
  const lastPoint = predictor.model.lossHistory[predictor.model.lossHistory.length - 1];
  if (lastPoint) {
    predictor.finalLoss = lastPoint.loss;
    predictor.finalValLoss = lastPoint.valLoss;
  }
  predictor.checkpointJson = exportNeuralCheckpointPth(predictor.model);
  return true;
}
