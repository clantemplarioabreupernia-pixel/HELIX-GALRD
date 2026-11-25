import {
  predictWithN2MiniGpt,
  runN2CapsuleTrainingPipeline,
} from '../src/server/n2MiniGptService';

interface CliOptions {
  steps: number;
  fresh: boolean;
  json: boolean;
  predictPrompt: string | null;
}

function parseCliArgs(argv: string[]): CliOptions {
  let steps = 24;
  let fresh = false;
  let json = false;
  let predictPrompt: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--fresh' || arg === '--reset') {
      fresh = true;
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--steps' && i + 1 < argv.length) {
      const parsed = Number(argv[++i]);
      if (Number.isFinite(parsed)) {
        steps = Math.max(4, Math.min(200, Math.round(parsed)));
      }
    } else if (arg.startsWith('--steps=')) {
      const parsed = Number(arg.slice('--steps='.length));
      if (Number.isFinite(parsed)) {
        steps = Math.max(4, Math.min(200, Math.round(parsed)));
      }
    } else if (arg === '--predict' && i + 1 < argv.length) {
      predictPrompt = argv[++i];
    } else if (arg.startsWith('--predict=')) {
      predictPrompt = arg.slice('--predict='.length);
    } else if (!arg.startsWith('--') && !predictPrompt) {
      predictPrompt = arg;
    }
  }

  return { steps, fresh, json, predictPrompt };
}

function main() {
  const opts = parseCliArgs(process.argv.slice(2));

  const report = runN2CapsuleTrainingPipeline({
    baseDir: process.cwd(),
    steps: opts.steps,
    resetWeights: opts.fresh,
    samplePrompt: opts.predictPrompt ?? undefined,
  });

  const prediction = opts.predictPrompt
    ? predictWithN2MiniGpt(opts.predictPrompt, { baseDir: process.cwd() })
    : report.samplePrediction;

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          training: {
            totalLinesRead: report.totalLinesRead,
            acceptedCapsulesCount: report.acceptedCapsulesCount,
            rejectedCapsulesCount: report.rejectedCapsulesCount,
            uniqueScriptsCount: report.uniqueScriptsCount,
            restoredFromCheckpoint: report.restoredFromCheckpoint,
            stepsBefore: report.stepsBefore,
            stepsAdded: report.stepsAdded,
            stepsTrainedTotal: report.stepsTrainedTotal,
            parameterCount: report.parameterCount,
            initialLoss: Number(report.initialLoss.toFixed(6)),
            finalLoss: Number(report.finalLoss.toFixed(6)),
            finalValLoss: Number(report.finalValLoss.toFixed(6)),
            checkpointPath: report.checkpointPath,
            checkpointBytes: report.checkpointBytes,
          },
          prediction: {
            prompt: prediction.prompt,
            matchedPrompt: prediction.matchedPrompt,
            similarityScore: prediction.similarityScore,
            smtVerified: prediction.smtVerified,
            godelValid: prediction.godelValid,
            blockedHallucinations: prediction.blockedHallucinations,
            predictedScript: prediction.predictedScript,
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log('=== [HELIX N2] Entrenamiento y Actualización Mini-GPT ===');
  console.log(`Archivo de cápsulas   : ${report.capsulesPath}`);
  console.log(
    `Registros procesados  : ${report.totalLinesRead} leídos | ${report.acceptedCapsulesCount} aceptados (${report.uniqueScriptsCount} únicos) | ${report.rejectedCapsulesCount} filtrados`,
  );
  console.log(
    `Pesos Mini-GPT        : ${report.parameterCount.toLocaleString('en-US')} parámetros | ${report.restoredFromCheckpoint ? `continuando desde paso ${report.stepsBefore}` : 'inicialización limpia'} + ${report.stepsAdded} pasos -> total ${report.stepsTrainedTotal}`,
  );
  console.log(
    `Convergencia Loss     : ${report.initialLoss.toFixed(4)} -> ${report.finalLoss.toFixed(4)} (val: ${report.finalValLoss.toFixed(4)})`,
  );
  console.log(
    `Checkpoint guardado   : ${report.checkpointPath} (${(report.checkpointBytes / 1024).toFixed(1)} KB)`,
  );
  console.log('');
  console.log('=== [HELIX N2] Predicción de Estructura Basada en Historial ===');
  console.log(`Prompt                : ${prediction.prompt}`);
  console.log(
    `Coincidencia histórica: ${prediction.matchedPrompt ?? 'Sin coincidencia directa (semilla de dominio)'} (similitud=${prediction.similarityScore})`,
  );
  console.log(
    `Verificación Formal   : SMT=${prediction.smtVerified ? 'VERIFICADO' : 'NO_VERIFICADO'} | Gödel=${prediction.godelValid ? 'VÁLIDO' : 'INVÁLIDO'} | Alucinaciones bloqueadas=${prediction.blockedHallucinations}`,
  );
  console.log('Estructura HELIX predicha:');
  console.log(prediction.predictedScript);
}

try {
  main();
} catch (err) {
  console.error('[HELIX N2] Error en entrenamiento/predicción Mini-GPT:', err);
  process.exit(1);
}
