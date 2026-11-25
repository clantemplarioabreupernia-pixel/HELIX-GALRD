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
import { normalizeCandidateHlx } from './helixCapsuleTrainer';

export type CapsuleRejectionReason =
  | 'REFUSAL_FILTERED'
  | 'EMPTY_SCRIPT'
  | 'SMT_REJECTED'
  | 'INVALID_JSON';

export interface MiniGPTCapsuleRecord {
  index: number;
  timestamp?: string;
  prompt: string;
  hlxScript: string;
  reply: string;
  domain?: string;
  shape?: string;
  tokensCount: number;
  smtVerified: boolean;
  validForTraining: boolean;
  rejectionReason?: string;
}

export interface MiniGPTDatasetParseResult {
  totalLines: number;
  accepted: MiniGPTCapsuleRecord[];
  rejected: MiniGPTCapsuleRecord[];
  uniqueScripts: string[];
  refusalsFiltered: number;
  smtRejected: number;
  emptyOrInvalid: number;
}

export interface MiniGPTTrainingOptions {
  steps?: number;
  seed?: number;
  existingCheckpointJson?: string;
  resetWeights?: boolean;
}

export interface MiniGPTTrainingSummary {
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
  lossHistory: { step: number; loss: number; valLoss: number }[];
  checkpointJson: string;
}

export interface MiniGPTPredictionOptions {
  temperature?: number;
  maxLines?: number;
  seed?: number;
}

export interface MiniGPTPredictionResult {
  prompt: string;
  predictedScript: string;
  seedPrefix: string[];
  matchedPrompt: string | null;
  similarityScore: number;
  capsulesInMemory: number;
  stepsTrained: number;
  blockedHallucinations: number;
  smtVerified: boolean;
  godelValid: boolean;
  generation: NeuralGenerationResult;
}

export interface MiniGPTEngineStatus {
  initialized: boolean;
  capsulesRead: number;
  acceptedCapsules: number;
  rejectedCapsules: number;
  uniqueSequences: number;
  trainedSteps: number;
  parameterCount: number;
  initialLoss: number;
  finalLoss: number;
  finalValLoss: number;
  hasCheckpoint: boolean;
}

function tokenizeWords(text: string): Set<string> {
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

function promptCosineOverlap(a: string, b: string): number {
  const setA = tokenizeWords(a);
  const setB = tokenizeWords(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let overlap = 0;
  for (const tok of setA) {
    if (setB.has(tok)) overlap++;
  }
  return overlap / Math.sqrt(setA.size * setB.size);
}

function encodeScriptToSequence(
  hlxScript: string,
  stoi: Map<string, number>,
): string[] | null {
  const tokens = ['<BOS>'];
  for (const line of hlxScript.split(/\r?\n/)) {
    const clean = line.split('#')[0].trim();
    if (!clean) continue;
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.every((tok) => stoi.has(tok))) {
      tokens.push(...parts, '\n');
    }
  }
  tokens.push('<EOS>');
  return tokens.length >= 4 ? tokens : null;
}

/**
 * Parsea el contenido de `dataset_capsules.jsonl`, filtra negativas/errores
 * y certifica cada estructura candidata con el compilador y verificador SMT.
 */
export function parseCapsulesJsonl(rawJsonl: string): MiniGPTDatasetParseResult {
  const lines = rawJsonl
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const accepted: MiniGPTCapsuleRecord[] = [];
  const rejected: MiniGPTCapsuleRecord[] = [];
  let refusalsFiltered = 0;
  let smtRejected = 0;
  let emptyOrInvalid = 0;

  lines.forEach((line, index) => {
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      const capsuleObj = (obj.capsule ?? obj.certified ?? {}) as Record<string, unknown>;
      const n1Obj = (obj.n1 ?? {}) as Record<string, unknown>;

      const timestamp = typeof obj.ts === 'string' ? obj.ts : undefined;
      const prompt = String(obj.prompt ?? n1Obj.cleanIntent ?? '').trim();
      const reply = String(capsuleObj.reply ?? '').trim();
      const rawScript = String(
        capsuleObj.hlxScript ?? capsuleObj.hxScript ?? obj.hlxScript ?? '',
      ).trim();

      const isRefusal = /lo siento|no puedo|cannot|sorry|unable/i.test(reply);
      if (isRefusal) {
        refusalsFiltered++;
        rejected.push({
          index,
          timestamp,
          prompt,
          hlxScript: rawScript,
          reply,
          tokensCount: 0,
          smtVerified: false,
          validForTraining: false,
          rejectionReason: 'REFUSAL_FILTERED',
        });
        return;
      }

      const normalizedScript = normalizeCandidateHlx(rawScript);
      if (!normalizedScript) {
        emptyOrInvalid++;
        rejected.push({
          index,
          timestamp,
          prompt,
          hlxScript: '',
          reply,
          tokensCount: 0,
          smtVerified: false,
          validForTraining: false,
          rejectionReason: 'EMPTY_SCRIPT',
        });
        return;
      }

      const compiled = compileHelixScript(normalizedScript, INITIAL_COMPOUND_VOCABULARY);
      const report = verifyHelixProgram(compiled);
      const smtValid =
        report.status === 'VERIFICADO' && report.symbolic?.status === 'PROVED_SAFE';

      if (!smtValid) {
        smtRejected++;
        rejected.push({
          index,
          timestamp,
          prompt,
          hlxScript: normalizedScript,
          reply,
          tokensCount: normalizedScript.split(/\s+/).filter(Boolean).length,
          smtVerified: false,
          validForTraining: false,
          rejectionReason: report.findings[0]?.rule ?? 'SMT_REJECTED',
        });
        return;
      }

      accepted.push({
        index,
        timestamp,
        prompt,
        hlxScript: normalizedScript,
        reply,
        domain: typeof n1Obj.domain === 'string' ? n1Obj.domain : undefined,
        shape:
          typeof n1Obj.shape === 'string'
            ? n1Obj.shape
            : typeof capsuleObj.shape === 'string'
              ? capsuleObj.shape
              : undefined,
        tokensCount: normalizedScript.split(/\s+/).filter(Boolean).length,
        smtVerified: true,
        validForTraining: true,
      });
    } catch {
      emptyOrInvalid++;
      rejected.push({
        index,
        prompt: '',
        hlxScript: '',
        reply: '',
        tokensCount: 0,
        smtVerified: false,
        validForTraining: false,
        rejectionReason: 'INVALID_JSON',
      });
    }
  });

  const uniqueScripts = Array.from(new Set(accepted.map((r) => r.hlxScript)));

  return {
    totalLines: lines.length,
    accepted,
    rejected,
    uniqueScripts,
    refusalsFiltered,
    smtRejected,
    emptyOrInvalid,
  };
}

/**
 * Motor autónomo del Mini-GPT local de HELIX (cero dependencias de UI/DOM).
 * Lee y parsea `dataset_capsules.jsonl`, entrena los pesos predictivos sobre
 * interacciones certificadas por SMT y predice estructuras HELIX verificadas.
 */
export class MiniGPTEngine {
  private readonly config: NeuralModelConfig;
  private model: HelixNeuralModel | null = null;
  private sequences: string[][] = [];
  private parsedDataset: MiniGPTDatasetParseResult = {
    totalLines: 0,
    accepted: [],
    rejected: [],
    uniqueScripts: [],
    refusalsFiltered: 0,
    smtRejected: 0,
    emptyOrInvalid: 0,
  };
  private initialLoss = 0;
  private finalLoss = 0;
  private finalValLoss = 0;
  private checkpointJson = '';

  constructor(config: NeuralModelConfig = DEFAULT_NEURAL_CONFIG) {
    this.config = { ...config };
  }

  /**
   * Parsea e indexa en memoria un flujo JSONL (`dataset_capsules.jsonl`).
   */
  public loadCapsulesFromJsonl(rawJsonl: string): MiniGPTDatasetParseResult {
    this.parsedDataset = parseCapsulesJsonl(rawJsonl);
    return this.parsedDataset;
  }

  /**
   * Lee el archivo de cápsulas usando un lector inyectado (compatible con Node `fs` o `fetch` en navegador)
   * o una cadena JSONL directa, y carga el historial certificado.
   */
  public async readCapsules(
    source: string | (() => string | Promise<string>),
  ): Promise<MiniGPTDatasetParseResult> {
    const rawJsonl = typeof source === 'function' ? await source() : source;
    return this.loadCapsulesFromJsonl(rawJsonl);
  }

  /**
   * Restaura los pesos del Mini-GPT desde un checkpoint `.pth` serializado si el SHA-256
   * y el vocabulario coinciden con la arquitectura actual.
   */
  public restoreCheckpoint(checkpointJson: string): boolean {
    if (!checkpointJson.trim()) return false;
    try {
      const imported = importNeuralCheckpointPth(checkpointJson);
      const { model: baseline } = createHelixNeuralModel(
        INITIAL_COMPOUND_VOCABULARY,
        this.getTrainingScripts(),
        this.config,
        1337,
      );
      if (imported.shaMatched && imported.model.vocab.length === baseline.vocab.length) {
        this.model = imported.model;
        this.checkpointJson = checkpointJson;
        const first = imported.model.lossHistory[0];
        const last = imported.model.lossHistory[imported.model.lossHistory.length - 1];
        this.initialLoss = first?.loss ?? this.initialLoss;
        this.finalLoss = last?.loss ?? this.finalLoss;
        this.finalValLoss = last?.valLoss ?? this.finalValLoss;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private getTrainingScripts(): string[] {
    return this.parsedDataset.uniqueScripts.length > 0
      ? this.parsedDataset.uniqueScripts
      : [DEFAULT_HELIX_PHYSICS_PROGRAM];
  }

  /**
   * Entrena o actualiza los pesos predictivos del Mini-GPT procesando el historial
   * de interacciones certificadas previamente cargado desde `dataset_capsules.jsonl`.
   */
  public trainOnCertifiedHistory(
    options: MiniGPTTrainingOptions = {},
  ): MiniGPTTrainingSummary {
    const stepsAdded = Math.max(1, Math.min(200, Math.round(options.steps ?? 24)));
    const seed = options.seed ?? 1337;
    const scripts = this.getTrainingScripts();

    const { model: freshModel, sequences } = createHelixNeuralModel(
      INITIAL_COMPOUND_VOCABULARY,
      scripts,
      this.config,
      seed,
    );

    let restoredFromCheckpoint = false;
    let stepsBefore = 0;

    if (options.resetWeights) {
      this.model = freshModel;
    } else {
      if (options.existingCheckpointJson) {
        restoredFromCheckpoint = this.restoreCheckpoint(options.existingCheckpointJson);
      }
      if (!this.model || this.model.vocab.length !== freshModel.vocab.length) {
        this.model = freshModel;
        restoredFromCheckpoint = false;
      } else if (!options.existingCheckpointJson && this.model.trainedSteps > 0) {
        restoredFromCheckpoint = true;
      }
    }

    stepsBefore = restoredFromCheckpoint ? this.model.trainedSteps : 0;
    this.sequences = sequences;

    trainHelixNeuralSteps(this.model, this.sequences, stepsAdded);

    const firstPoint = this.model.lossHistory[0];
    const lastPoint = this.model.lossHistory[this.model.lossHistory.length - 1];
    this.initialLoss = firstPoint?.loss ?? 0;
    this.finalLoss = lastPoint?.loss ?? 0;
    this.finalValLoss = lastPoint?.valLoss ?? 0;
    this.checkpointJson = exportNeuralCheckpointPth(this.model);

    return {
      totalLinesRead: this.parsedDataset.totalLines,
      acceptedCapsulesCount: this.parsedDataset.accepted.length,
      rejectedCapsulesCount: this.parsedDataset.rejected.length,
      uniqueScriptsCount: this.parsedDataset.uniqueScripts.length,
      restoredFromCheckpoint,
      stepsBefore,
      stepsAdded,
      stepsTrainedTotal: this.model.trainedSteps,
      parameterCount: this.model.parameterCount,
      initialLoss: this.initialLoss,
      finalLoss: this.finalLoss,
      finalValLoss: this.finalValLoss,
      lossHistory: [...this.model.lossHistory],
      checkpointJson: this.checkpointJson,
    };
  }

  /**
   * Incorpora una nueva cápsula certificada por SMT al historial y ejecuta pasos
   * incrementales de ajuste sobre los pesos del Mini-GPT.
   */
  public ingestAndTrainIncremental(
    entry: {
      prompt: string;
      reply: string;
      hlxScript: string;
      shape?: string;
      domain?: string;
      timestamp?: string;
    },
    retrainSteps = 4,
  ): boolean {
    const normalized = normalizeCandidateHlx(entry.hlxScript);
    if (!normalized) return false;

    const compiled = compileHelixScript(normalized, INITIAL_COMPOUND_VOCABULARY);
    const report = verifyHelixProgram(compiled);
    if (report.status !== 'VERIFICADO' || report.symbolic?.status !== 'PROVED_SAFE') {
      return false;
    }

    if (!this.model) {
      this.trainOnCertifiedHistory({ steps: 8 });
    }

    const record: MiniGPTCapsuleRecord = {
      index: this.parsedDataset.totalLines,
      timestamp: entry.timestamp,
      prompt: entry.prompt,
      hlxScript: normalized,
      reply: entry.reply,
      shape: entry.shape,
      domain: entry.domain,
      tokensCount: normalized.split(/\s+/).filter(Boolean).length,
      smtVerified: true,
      validForTraining: true,
    };

    this.parsedDataset.totalLines += 1;
    this.parsedDataset.accepted.push(record);
    if (!this.parsedDataset.uniqueScripts.includes(normalized)) {
      this.parsedDataset.uniqueScripts.push(normalized);
    }

    const encoded = encodeScriptToSequence(normalized, this.model!.stoi);
    if (encoded) {
      this.sequences.push(encoded);
    }

    if (this.sequences.length === 0) {
      const fallback = encodeScriptToSequence(DEFAULT_HELIX_PHYSICS_PROGRAM, this.model!.stoi);
      if (fallback) this.sequences.push(fallback);
    }

    trainHelixNeuralSteps(this.model!, this.sequences, Math.max(1, Math.round(retrainSteps)));
    const lastPoint = this.model!.lossHistory[this.model!.lossHistory.length - 1];
    if (lastPoint) {
      if (this.initialLoss === 0) {
        this.initialLoss = this.model!.lossHistory[0]?.loss ?? lastPoint.loss;
      }
      this.finalLoss = lastPoint.loss;
      this.finalValLoss = lastPoint.valLoss;
    }
    this.checkpointJson = exportNeuralCheckpointPth(this.model!);
    return true;
  }

  /**
   * Predice una estructura HELIX verificada utilizando los pesos entrenados del Mini-GPT
   * guiados por la interacción histórica más cercana al prompt.
   */
  public predictStructure(
    prompt: string,
    options: MiniGPTPredictionOptions = {},
  ): MiniGPTPredictionResult {
    if (!this.model) {
      this.trainOnCertifiedHistory({ steps: 12 });
    }

    let matchedRecord: MiniGPTCapsuleRecord | null = null;
    let bestScore = 0;

    for (const rec of this.parsedDataset.accepted) {
      if (!rec.prompt) continue;
      const score = promptCosineOverlap(prompt, rec.prompt);
      if (score > bestScore) {
        bestScore = score;
        matchedRecord = rec;
      }
    }

    let seedPrefix: string[] | null = null;
    if (matchedRecord && bestScore > 0) {
      const lines = matchedRecord.hlxScript
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && l !== 'ᚳᛏ' && l !== 'EXIT_OK');
      if (lines.length >= 2) {
        seedPrefix = lines.slice(0, Math.min(3, lines.length));
      }
    }

    if (!seedPrefix) {
      const low = prompt.toLowerCase();
      const roleTag = /orbit|nave|espaci|satel|juego/i.test(low)
        ? 'root'
        : /onda|m[uú]sica|528|457|audio|fluid/i.test(low)
          ? 'optic_lead'
          : 'capsule_agent';
      seedPrefix = ['ᛇᚢ', `ᛗᚦ ${roleTag}`];
    }

    let hash = 2166136261;
    for (let i = 0; i < prompt.length; i++) {
      hash ^= prompt.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    const generation = generateVerifiedFromNeuralModel(
      this.model!,
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
      similarityScore: Number(bestScore.toFixed(4)),
      capsulesInMemory: this.parsedDataset.accepted.length,
      stepsTrained: this.model!.trainedSteps,
      blockedHallucinations: generation.blockedHallucinations,
      smtVerified:
        generation.verification.status === 'VERIFICADO' &&
        generation.verification.symbolic?.status === 'PROVED_SAFE',
      godelValid: generation.godelReport.valid,
      generation,
    };
  }

  public exportCheckpoint(): string {
    if (!this.model) {
      this.trainOnCertifiedHistory({ steps: 8 });
    }
    this.checkpointJson = exportNeuralCheckpointPth(this.model!);
    return this.checkpointJson;
  }

  public getParsedDataset(): MiniGPTDatasetParseResult {
    return this.parsedDataset;
  }

  public getModel(): HelixNeuralModel | null {
    return this.model;
  }

  public getStatus(): MiniGPTEngineStatus {
    return {
      initialized: Boolean(this.model),
      capsulesRead: this.parsedDataset.totalLines,
      acceptedCapsules: this.parsedDataset.accepted.length,
      rejectedCapsules: this.parsedDataset.rejected.length,
      uniqueSequences: this.sequences.length,
      trainedSteps: this.model?.trainedSteps ?? 0,
      parameterCount: this.model?.parameterCount ?? 0,
      initialLoss: this.initialLoss,
      finalLoss: this.finalLoss,
      finalValLoss: this.finalValLoss,
      hasCheckpoint: Boolean(this.checkpointJson),
    };
  }
}

export function createMiniGPTEngine(
  config: NeuralModelConfig = DEFAULT_NEURAL_CONFIG,
): MiniGPTEngine {
  return new MiniGPTEngine(config);
}
