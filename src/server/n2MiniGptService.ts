import fs from 'node:fs';
import path from 'node:path';
import {
  appendCertifiedCapsuleToPredictor,
  CapsulePredictionResult,
  createCapsulePredictorFromJsonl,
  predictHelixStructureFromHistory,
  TrainedCapsulePredictorState,
} from '../core/helixCapsuleTrainer';

export const DEFAULT_CAPSULES_FILENAME = 'dataset_capsules.jsonl';
export const DEFAULT_CHECKPOINT_FILENAME = 'helix_minigpt_checkpoint.pth.json';

export interface N2TrainingPipelineOptions {
  baseDir?: string;
  capsulesFileName?: string;
  checkpointFileName?: string;
  steps?: number;
  seed?: number;
  resetWeights?: boolean;
  samplePrompt?: string;
}

export interface N2TrainingExecutionReport {
  capsulesPath: string;
  checkpointPath: string;
  totalLinesRead: number;
  acceptedCapsulesCount: number;
  rejectedCapsulesCount: number;
  uniqueScriptsCount: number;
  restoredFromCheckpoint: boolean;
  stepsBefore: number;
  stepsAdded: number;
  stepsTrainedTotal: number;
  parameterCount: number;
  initialLoss: number;
  finalLoss: number;
  finalValLoss: number;
  checkpointBytes: number;
  samplePrediction: CapsulePredictionResult;
}

export interface N2PredictorStatusSnapshot {
  initialized: boolean;
  capsulesPath: string;
  checkpointPath: string;
  capsuleCount: number;
  acceptedCapsulesCount: number;
  rejectedCapsulesCount: number;
  stepsTrained: number;
  parameterCount: number;
  initialLoss: number;
  finalLoss: number;
  finalValLoss: number;
  hasCheckpoint: boolean;
  checkpointBytes: number;
  checkpointUpdatedAt: string | null;
}

interface LiveCacheEntry {
  baseDir: string;
  capsulesPath: string;
  checkpointPath: string;
  capsulesMtimeMs: number;
  checkpointMtimeMs: number;
  predictor: TrainedCapsulePredictorState;
}

let liveCache: LiveCacheEntry | null = null;

/**
 * Resuelve rutas dentro de `baseDir` garantizando confinamiento estricto
 * contra path traversal.
 */
export function resolveConfinedWorkspacePath(baseDir: string, fileName: string): string {
  const safeBase = path.resolve(baseDir);
  const cleanName = path.basename(String(fileName || '').trim());
  if (!cleanName || cleanName === '.' || cleanName === '..') {
    throw new Error(`Nombre de archivo inválido para N2: ${fileName}`);
  }
  const resolved = path.resolve(safeBase, cleanName);
  if (!resolved.startsWith(safeBase + path.sep)) {
    throw new Error(`Ruta fuera del directorio permitido: ${resolved}`);
  }
  return resolved;
}

function getFileMtimeMs(filePath: string): number {
  try {
    return fs.existsSync(filePath) ? fs.statSync(filePath).mtimeMs : 0;
  } catch {
    return 0;
  }
}

function writeFileAtomic(targetPath: string, content: string): void {
  const dir = path.dirname(targetPath);
  const tmpPath = path.join(dir, `.${path.basename(targetPath)}.tmp.${process.pid}`);
  fs.writeFileSync(tmpPath, content, 'utf8');
  fs.renameSync(tmpPath, targetPath);
}

function clampSteps(steps: unknown, fallback = 24): number {
  const n = Number(steps);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(4, Math.min(200, Math.round(n)));
}

/**
 * Procesa `dataset_capsules.jsonl` en Nivel 2, entrena/actualiza los pesos del modelo
 * local Mini-GPT (conservando pesos previos cuando el vocabulario coincide salvo
 * `resetWeights: true`) y persiste el checkpoint `.pth` de forma atómica.
 */
export function runN2CapsuleTrainingPipeline(
  options: N2TrainingPipelineOptions = {},
): N2TrainingExecutionReport {
  const baseDir = path.resolve(options.baseDir ?? process.cwd());
  const capsulesPath = resolveConfinedWorkspacePath(
    baseDir,
    options.capsulesFileName ?? DEFAULT_CAPSULES_FILENAME,
  );
  const checkpointPath = resolveConfinedWorkspacePath(
    baseDir,
    options.checkpointFileName ?? DEFAULT_CHECKPOINT_FILENAME,
  );

  const rawJsonl = fs.existsSync(capsulesPath) ? fs.readFileSync(capsulesPath, 'utf8') : '';
  const hasExistingCheckpoint = !options.resetWeights && fs.existsSync(checkpointPath);
  const existingCheckpointJson = hasExistingCheckpoint
    ? fs.readFileSync(checkpointPath, 'utf8')
    : undefined;

  let stepsBefore = 0;
  if (existingCheckpointJson) {
    try {
      const parsedMeta = JSON.parse(existingCheckpointJson) as { trainedSteps?: number };
      if (typeof parsedMeta.trainedSteps === 'number' && Number.isFinite(parsedMeta.trainedSteps)) {
        stepsBefore = parsedMeta.trainedSteps;
      }
    } catch {
      stepsBefore = 0;
    }
  }

  const stepsRequested = clampSteps(options.steps, 24);
  const predictor = createCapsulePredictorFromJsonl(rawJsonl, {
    steps: stepsRequested,
    seed: options.seed ?? 1337,
    existingCheckpointJson,
  });

  writeFileAtomic(checkpointPath, predictor.checkpointJson);

  const uniqueScriptsCount = new Set(predictor.acceptedRecords.map((r) => r.hlxScript)).size;
  const fallbackSamplePrompt =
    options.samplePrompt?.trim() ||
    predictor.acceptedRecords.find((r) => r.prompt.trim().length > 4)?.prompt ||
    'Simula una estructura orbital verificada en Helix';

  const samplePrediction = predictHelixStructureFromHistory(predictor, fallbackSamplePrompt);

  liveCache = {
    baseDir,
    capsulesPath,
    checkpointPath,
    capsulesMtimeMs: getFileMtimeMs(capsulesPath),
    checkpointMtimeMs: getFileMtimeMs(checkpointPath),
    predictor,
  };

  const checkpointBytes = Buffer.byteLength(predictor.checkpointJson, 'utf8');
  const restoredFromCheckpoint = Boolean(existingCheckpointJson && predictor.model.trainedSteps > stepsRequested);

  return {
    capsulesPath,
    checkpointPath,
    totalLinesRead: predictor.totalLinesRead,
    acceptedCapsulesCount: predictor.acceptedRecords.length,
    rejectedCapsulesCount: predictor.rejectedCapsulesCount,
    uniqueScriptsCount,
    restoredFromCheckpoint,
    stepsBefore: restoredFromCheckpoint ? stepsBefore : 0,
    stepsAdded: stepsRequested,
    stepsTrainedTotal: predictor.model.trainedSteps,
    parameterCount: predictor.model.parameterCount,
    initialLoss: predictor.initialLoss,
    finalLoss: predictor.finalLoss,
    finalValLoss: predictor.finalValLoss,
    checkpointBytes,
    samplePrediction,
  };
}

/**
 * Mantiene sincronizado en memoria el predictor Mini-GPT de N2 respecto a los archivos
 * en disco (`dataset_capsules.jsonl` y `helix_minigpt_checkpoint.pth.json`).
 */
export function ensureN2Predictor(options: {
  baseDir?: string;
  persistIfMissing?: boolean;
  initialSteps?: number;
} = {}): TrainedCapsulePredictorState {
  const baseDir = path.resolve(options.baseDir ?? process.cwd());
  const capsulesPath = resolveConfinedWorkspacePath(baseDir, DEFAULT_CAPSULES_FILENAME);
  const checkpointPath = resolveConfinedWorkspacePath(baseDir, DEFAULT_CHECKPOINT_FILENAME);

  const diskCapsulesMtime = getFileMtimeMs(capsulesPath);
  const diskCkptMtime = getFileMtimeMs(checkpointPath);

  if (
    liveCache &&
    liveCache.baseDir === baseDir &&
    liveCache.capsulesMtimeMs === diskCapsulesMtime &&
    liveCache.checkpointMtimeMs === diskCkptMtime
  ) {
    return liveCache.predictor;
  }

  const rawJsonl = fs.existsSync(capsulesPath) ? fs.readFileSync(capsulesPath, 'utf8') : '';
  const hasCheckpoint = fs.existsSync(checkpointPath);
  const existingCheckpointJson = hasCheckpoint ? fs.readFileSync(checkpointPath, 'utf8') : undefined;

  const steps = clampSteps(options.initialSteps, hasCheckpoint ? 4 : 20);
  const predictor = createCapsulePredictorFromJsonl(rawJsonl, {
    steps,
    existingCheckpointJson,
  });

  if (!hasCheckpoint && options.persistIfMissing !== false) {
    writeFileAtomic(checkpointPath, predictor.checkpointJson);
  }

  liveCache = {
    baseDir,
    capsulesPath,
    checkpointPath,
    capsulesMtimeMs: getFileMtimeMs(capsulesPath),
    checkpointMtimeMs: getFileMtimeMs(checkpointPath),
    predictor,
  };

  return predictor;
}

/**
 * Predice una estructura HELIX formalmente verificada a partir del historial
 * guardado en `dataset_capsules.jsonl` y los pesos actuales del Mini-GPT.
 */
export function predictWithN2MiniGpt(
  prompt: string,
  options: {
    baseDir?: string;
    temperature?: number;
    maxLines?: number;
    seed?: number;
  } = {},
): CapsulePredictionResult {
  const predictor = ensureN2Predictor({ baseDir: options.baseDir });
  return predictHelixStructureFromHistory(predictor, prompt, {
    temperature: options.temperature,
    maxLines: options.maxLines,
    seed: options.seed,
  });
}

/**
 * Registra una cápsula certificada L2 y actualiza de forma incremental los pesos
 * del modelo local Mini-GPT y su checkpoint `.pth` en disco.
 */
export function recordCapsuleAndUpdateN2Weights(
  entry: {
    prompt: string;
    reply: string;
    hlxScript: string;
    shape?: string;
    domain?: string;
    rawJsonlLine?: string;
  },
  options: {
    baseDir?: string;
    retrainSteps?: number;
    appendToJsonl?: boolean;
  } = {},
): { updatedWeights: boolean; predictor: TrainedCapsulePredictorState } {
  const baseDir = path.resolve(options.baseDir ?? process.cwd());
  const capsulesPath = resolveConfinedWorkspacePath(baseDir, DEFAULT_CAPSULES_FILENAME);
  const checkpointPath = resolveConfinedWorkspacePath(baseDir, DEFAULT_CHECKPOINT_FILENAME);

  if (options.appendToJsonl && entry.rawJsonlLine) {
    fs.appendFileSync(capsulesPath, entry.rawJsonlLine.endsWith('\n') ? entry.rawJsonlLine : `${entry.rawJsonlLine}\n`, 'utf8');
  }

  const predictor = ensureN2Predictor({ baseDir });
  const updatedWeights = appendCertifiedCapsuleToPredictor(
    predictor,
    {
      prompt: entry.prompt,
      reply: entry.reply,
      hlxScript: entry.hlxScript,
      shape: entry.shape,
      domain: entry.domain,
    },
    Math.max(1, Math.min(24, Math.round(options.retrainSteps ?? 3))),
  );

  if (updatedWeights) {
    writeFileAtomic(checkpointPath, predictor.checkpointJson);
  }

  liveCache = {
    baseDir,
    capsulesPath,
    checkpointPath,
    capsulesMtimeMs: getFileMtimeMs(capsulesPath),
    checkpointMtimeMs: getFileMtimeMs(checkpointPath),
    predictor,
  };

  return { updatedWeights, predictor };
}

export function getN2MiniGptStatus(baseDir = process.cwd()): N2PredictorStatusSnapshot {
  const resolvedBase = path.resolve(baseDir);
  const capsulesPath = resolveConfinedWorkspacePath(resolvedBase, DEFAULT_CAPSULES_FILENAME);
  const checkpointPath = resolveConfinedWorkspacePath(resolvedBase, DEFAULT_CHECKPOINT_FILENAME);
  const predictor = ensureN2Predictor({ baseDir: resolvedBase, persistIfMissing: false });

  let checkpointBytes = 0;
  let checkpointUpdatedAt: string | null = null;
  const hasCheckpoint = fs.existsSync(checkpointPath);
  if (hasCheckpoint) {
    const stat = fs.statSync(checkpointPath);
    checkpointBytes = stat.size;
    checkpointUpdatedAt = stat.mtime.toISOString();
  }

  return {
    initialized: true,
    capsulesPath,
    checkpointPath,
    capsuleCount: predictor.totalLinesRead,
    acceptedCapsulesCount: predictor.acceptedRecords.length,
    rejectedCapsulesCount: predictor.rejectedCapsulesCount,
    stepsTrained: predictor.model.trainedSteps,
    parameterCount: predictor.model.parameterCount,
    initialLoss: predictor.initialLoss,
    finalLoss: predictor.finalLoss,
    finalValLoss: predictor.finalValLoss,
    hasCheckpoint,
    checkpointBytes,
    checkpointUpdatedAt,
  };
}
