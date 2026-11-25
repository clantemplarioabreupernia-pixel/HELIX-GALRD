import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  DEFAULT_CAPSULES_FILENAME,
  DEFAULT_CHECKPOINT_FILENAME,
  N2TrainingExecutionReport,
  resolveConfinedWorkspacePath,
  runN2CapsuleTrainingPipeline,
  suggestHelixStructuresFromN2History,
} from './n2MiniGptService';

export interface N2ServerSyncResult {
  synced: boolean;
  reason: 'BOOT_INITIALIZED' | 'DATASET_UPDATED' | 'ALREADY_UP_TO_DATE';
  report?: N2TrainingExecutionReport;
  suggestionsCount: number;
}

/**
 * Script N2 interno del servidor: compara la marca temporal de `dataset_capsules.jsonl`
 * con `helix_minigpt_checkpoint.pth.json`, procesa el historial de usuario y actualiza
 * los pesos de `MiniGPTEngine` automáticamente cuando existen nuevas interacciones.
 */
export function runN2ServerDatasetWeightSync(options: {
  baseDir?: string;
  steps?: number;
  forceRetrain?: boolean;
} = {}): N2ServerSyncResult {
  const baseDir = path.resolve(options.baseDir ?? process.cwd());
  const capsulesPath = resolveConfinedWorkspacePath(baseDir, DEFAULT_CAPSULES_FILENAME);
  const checkpointPath = resolveConfinedWorkspacePath(baseDir, DEFAULT_CHECKPOINT_FILENAME);

  const hasCapsules = fs.existsSync(capsulesPath);
  const hasCheckpoint = fs.existsSync(checkpointPath);
  const capsulesMtime = hasCapsules ? fs.statSync(capsulesPath).mtimeMs : 0;
  const ckptMtime = hasCheckpoint ? fs.statSync(checkpointPath).mtimeMs : 0;

  if (!options.forceRetrain && hasCheckpoint && ckptMtime >= capsulesMtime) {
    const suggestions = suggestHelixStructuresFromN2History('', { baseDir, limit: 4 });
    return {
      synced: false,
      reason: 'ALREADY_UP_TO_DATE',
      suggestionsCount: suggestions.length,
    };
  }

  const report = runN2CapsuleTrainingPipeline({
    baseDir,
    steps: options.steps ?? (hasCheckpoint ? 8 : 20),
    resetWeights: false,
  });

  const suggestions = suggestHelixStructuresFromN2History('', { baseDir, limit: 4 });
  return {
    synced: true,
    reason: hasCheckpoint ? 'DATASET_UPDATED' : 'BOOT_INITIALIZED',
    report,
    suggestionsCount: suggestions.length,
  };
}

// Ejecución directa como script de servidor N2: npx tsx src/server/n2DatasetUpdater.ts [--force] [--steps 16] [--query "..."]
const isDirectEntry =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectEntry) {
  const args = process.argv.slice(2);
  const forceRetrain = args.includes('--force') || args.includes('--fresh');
  const stepsIdx = args.indexOf('--steps');
  const steps =
    stepsIdx >= 0 && args[stepsIdx + 1] ? Number(args[stepsIdx + 1]) : undefined;
  const queryIdx = args.indexOf('--query');
  const query = queryIdx >= 0 && args[queryIdx + 1] ? args[queryIdx + 1] : '';

  const syncRes = runN2ServerDatasetWeightSync({
    forceRetrain,
    steps: Number.isFinite(steps) ? steps : undefined,
  });
  const suggestions = suggestHelixStructuresFromN2History(query, { limit: 4 });

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: 'N2_SERVER_DATASET_UPDATER',
        synced: syncRes.synced,
        reason: syncRes.reason,
        report: syncRes.report
          ? {
              acceptedCapsulesCount: syncRes.report.acceptedCapsulesCount,
              rejectedCapsulesCount: syncRes.report.rejectedCapsulesCount,
              stepsTrainedTotal: syncRes.report.stepsTrainedTotal,
              initialLoss: Number(syncRes.report.initialLoss.toFixed(4)),
              finalLoss: Number(syncRes.report.finalLoss.toFixed(4)),
              finalValLoss: Number(syncRes.report.finalValLoss.toFixed(4)),
              checkpointBytes: syncRes.report.checkpointBytes,
            }
          : null,
        suggestions: suggestions.map((s) => ({
          prompt: s.prompt,
          shape: s.shape,
          domain: s.domain,
          relevanceScore: s.relevanceScore,
          smtVerified: s.smtVerified,
          godelValid: s.godelValid,
        })),
      },
      null,
      2,
    ),
  );
}
