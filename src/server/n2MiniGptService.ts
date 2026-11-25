import fs from 'node:fs';
import path from 'node:path';
import {
  createMiniGPTEngine,
  MiniGPTEngine,
  MiniGPTHistorySuggestion,
  MiniGPTPredictionResult,
} from '../core/MiniGPTEngine';

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
  samplePrediction: MiniGPTPredictionResult;
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
  engine: MiniGPTEngine;
  checkpointJson: string;
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
 * Procesa `dataset_capsules.jsonl` usando `MiniGPTEngine`, entrena o actualiza
 * los pesos del modelo local Mini-GPT y persiste el checkpoint `.pth` de forma atómica.
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

  const miniGpt = createMiniGPTEngine();
  const parsed = miniGpt.loadCapsulesFromJsonl(rawJsonl);
  const stepsRequested = clampSteps(options.steps, 24);

  const summary = miniGpt.trainOnCertifiedHistory({
    steps: stepsRequested,
    seed: options.seed ?? 1337,
    existingCheckpointJson,
    resetWeights: options.resetWeights,
  });

  writeFileAtomic(checkpointPath, summary.checkpointJson);

  const fallbackSamplePrompt =
    options.samplePrompt?.trim() ||
    parsed.accepted.find((r) => r.prompt.trim().length > 4)?.prompt ||
    'Simula una estructura orbital verificada en Helix';

  const samplePrediction = miniGpt.predictStructure(fallbackSamplePrompt);

  liveCache = {
    baseDir,
    capsulesPath,
    checkpointPath,
    capsulesMtimeMs: getFileMtimeMs(capsulesPath),
    checkpointMtimeMs: getFileMtimeMs(checkpointPath),
    engine: miniGpt,
    checkpointJson: summary.checkpointJson,
  };

  return {
    capsulesPath,
    checkpointPath,
    totalLinesRead: summary.totalLinesRead,
    acceptedCapsulesCount: summary.acceptedCapsulesCount,
    rejectedCapsulesCount: summary.rejectedCapsulesCount,
    uniqueScriptsCount: summary.uniqueScriptsCount,
    restoredFromCheckpoint: summary.restoredFromCheckpoint,
    stepsBefore: summary.stepsBefore,
    stepsAdded: summary.stepsAdded,
    stepsTrainedTotal: summary.stepsTrainedTotal,
    parameterCount: summary.parameterCount,
    initialLoss: summary.initialLoss,
    finalLoss: summary.finalLoss,
    finalValLoss: summary.finalValLoss,
    checkpointBytes: Buffer.byteLength(summary.checkpointJson, 'utf8'),
    samplePrediction,
  };
}

/**
 * Mantiene sincronizada en memoria la instancia de `MiniGPTEngine` respecto a
 * `dataset_capsules.jsonl` y `helix_minigpt_checkpoint.pth.json` en disco.
 */
export function ensureN2Predictor(options: {
  baseDir?: string;
  persistIfMissing?: boolean;
  initialSteps?: number;
} = {}): MiniGPTEngine {
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
    return liveCache.engine;
  }

  const rawJsonl = fs.existsSync(capsulesPath) ? fs.readFileSync(capsulesPath, 'utf8') : '';
  const hasCheckpoint = fs.existsSync(checkpointPath);
  const existingCheckpointJson = hasCheckpoint ? fs.readFileSync(checkpointPath, 'utf8') : undefined;

  const miniGpt = createMiniGPTEngine();
  miniGpt.loadCapsulesFromJsonl(rawJsonl);
  const summary = miniGpt.trainOnCertifiedHistory({
    steps: clampSteps(options.initialSteps, hasCheckpoint ? 4 : 20),
    existingCheckpointJson,
  });

  if (!hasCheckpoint && options.persistIfMissing !== false) {
    writeFileAtomic(checkpointPath, summary.checkpointJson);
  }

  liveCache = {
    baseDir,
    capsulesPath,
    checkpointPath,
    capsulesMtimeMs: getFileMtimeMs(capsulesPath),
    checkpointMtimeMs: getFileMtimeMs(checkpointPath),
    engine: miniGpt,
    checkpointJson: summary.checkpointJson,
  };

  return miniGpt;
}

/**
 * Predice una estructura HELIX verificada usando `MiniGPTEngine` sobre el historial
 * guardado en `dataset_capsules.jsonl`.
 */
export function predictWithN2MiniGpt(
  prompt: string,
  options: {
    baseDir?: string;
    temperature?: number;
    maxLines?: number;
    seed?: number;
  } = {},
): MiniGPTPredictionResult {
  const miniGpt = ensureN2Predictor({ baseDir: options.baseDir });
  return miniGpt.predictStructure(prompt, {
    temperature: options.temperature,
    maxLines: options.maxLines,
    seed: options.seed,
  });
}

/**
 * Sugiere automáticamente estructuras HELIX verificadas desde el historial
 * de usuario almacenado en `dataset_capsules.jsonl`.
 */
export function suggestHelixStructuresFromN2History(
  query = '',
  options: {
    baseDir?: string;
    limit?: number;
  } = {},
): MiniGPTHistorySuggestion[] {
  const miniGpt = ensureN2Predictor({ baseDir: options.baseDir });
  return miniGpt.suggestStructuresFromHistory(query, options.limit ?? 4);
}

/**
 * Registra una cápsula certificada L2 y actualiza de forma incremental los pesos
 * del `MiniGPTEngine` y su checkpoint `.pth` en disco.
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
): { updatedWeights: boolean; engine: MiniGPTEngine } {
  const baseDir = path.resolve(options.baseDir ?? process.cwd());
  const capsulesPath = resolveConfinedWorkspacePath(baseDir, DEFAULT_CAPSULES_FILENAME);
  const checkpointPath = resolveConfinedWorkspacePath(baseDir, DEFAULT_CHECKPOINT_FILENAME);

  if (options.appendToJsonl && entry.rawJsonlLine) {
    fs.appendFileSync(
      capsulesPath,
      entry.rawJsonlLine.endsWith('\n') ? entry.rawJsonlLine : `${entry.rawJsonlLine}\n`,
      'utf8',
    );
  }

  const miniGpt = ensureN2Predictor({ baseDir });
  const updatedWeights = miniGpt.ingestAndTrainIncremental(
    {
      prompt: entry.prompt,
      reply: entry.reply,
      hlxScript: entry.hlxScript,
      shape: entry.shape,
      domain: entry.domain,
    },
    Math.max(1, Math.min(24, Math.round(options.retrainSteps ?? 3))),
  );

  let ckpt = liveCache?.checkpointJson ?? '';
  if (updatedWeights) {
    ckpt = miniGpt.exportCheckpoint();
    writeFileAtomic(checkpointPath, ckpt);
  }

  liveCache = {
    baseDir,
    capsulesPath,
    checkpointPath,
    capsulesMtimeMs: getFileMtimeMs(capsulesPath),
    checkpointMtimeMs: getFileMtimeMs(checkpointPath),
    engine: miniGpt,
    checkpointJson: ckpt,
  };

  return { updatedWeights, engine: miniGpt };
}

export function getN2MiniGptStatus(baseDir = process.cwd()): N2PredictorStatusSnapshot {
  const resolvedBase = path.resolve(baseDir);
  const capsulesPath = resolveConfinedWorkspacePath(resolvedBase, DEFAULT_CAPSULES_FILENAME);
  const checkpointPath = resolveConfinedWorkspacePath(resolvedBase, DEFAULT_CHECKPOINT_FILENAME);
  const miniGpt = ensureN2Predictor({ baseDir: resolvedBase, persistIfMissing: false });
  const st = miniGpt.getStatus();

  let checkpointBytes = 0;
  let checkpointUpdatedAt: string | null = null;
  const hasCheckpoint = fs.existsSync(checkpointPath);
  if (hasCheckpoint) {
    const stat = fs.statSync(checkpointPath);
    checkpointBytes = stat.size;
    checkpointUpdatedAt = stat.mtime.toISOString();
  }

  return {
    initialized: st.initialized,
    capsulesPath,
    checkpointPath,
    capsuleCount: st.capsulesRead,
    acceptedCapsulesCount: st.acceptedCapsules,
    rejectedCapsulesCount: st.rejectedCapsules,
    stepsTrained: st.trainedSteps,
    parameterCount: st.parameterCount,
    initialLoss: st.initialLoss,
    finalLoss: st.finalLoss,
    finalValLoss: st.finalValLoss,
    hasCheckpoint,
    checkpointBytes,
    checkpointUpdatedAt,
  };
}
