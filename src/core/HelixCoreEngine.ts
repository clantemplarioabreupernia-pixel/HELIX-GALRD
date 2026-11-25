import { Discipline33, DISCIPLINES_33 } from '../data/disciplines33';
import { INITIAL_COMPOUND_VOCABULARY } from '../data/vocabulary';
import {
  AI_DECODING_SCENARIOS,
  AiSequenceRunResult,
  runConstrainedAiSequence,
} from '../utils/helixAiProtocol';
import {
  assemblePureFromCells,
  CellTarget,
  DEFAULT_HELIX_CELLS,
  PureAssemblyResult,
} from '../utils/helixCells';
import {
  validateHelixProgram33Tokens,
} from '../utils/godel';
import {
  buildProofCarryingCertificate,
  ProofCarryingCertificate,
  sha256Hex,
} from '../utils/helixPcc';
import {
  computeCauchySpectralTriple,
  createPauliSoAPhysicsState,
  evaluateWeberFechnerFrame,
  PauliSoAPhysicsState,
  PauliSoAPhysicsStepReport,
  stepPauliSoAPhysics,
} from '../utils/helixPhysics';
import {
  CauchySpectralTriple,
  createSiliconBridgeState,
  getSiliconBridgeTelemetry,
  HELIX_OPTIC_FRAGMENT_PARS,
  HELIX_OPTIC_FRAGMENT_SSS_CAUCHY,
  HELIX_OPTIC_VERTEX_DISPLACE,
  HELIX_OPTIC_VERTEX_PARS,
  injectTokenImpulse,
  SiliconBridgeTelemetrySnapshot,
  SiliconUniformSnapshot,
  stepSiliconBridgeFrame,
  syncScriptToSiliconBridge,
  TokenPauliBridgeState,
} from '../utils/helixSiliconBridge';
import {
  createSoABuffer,
  packToSoABuffer,
  SoAHolographicBuffer,
} from '../utils/helixSignal';
import {
  compileHelixScript,
  createInitialVmState,
  HelixVmState,
  ParsedScriptInstruction,
  ProgramVerificationReport,
  runHelixProgram,
  verifyHelixProgram,
} from '../utils/helixVm';
import {
  DOMAIN_ENGINE_METADATA,
  EngineExecutionOutput,
} from './helixDomainEngines';
import {
  analyzeIntentAndBuildReport,
  EngineeringReport,
  PersonaMode,
} from './helixPlanner';
import {
  CURATED_CROSS_EXPERIMENTS,
  CrossDomainExperiment,
  decomposeHelixProgram,
  DecompositionResult,
  recombineHelixTools,
  RecombinationResult,
} from './helixRecombinator';
import {
  BASE_HELIX_TOOL_CATALOG,
  HelixRegisteredTool,
} from './helixToolCatalog159';
import {
  HolographicAcademicCard,
  HolographicAcademicLibrary,
  sharedHolographicAcademicLibrary,
} from './holographicAcademicLibrary';
import {
  createNemesisGovernor,
  NEMESIS_GAMMA_PRESETS,
  NEMESIS_THERMAL_CUTOFF,
  NemesisGovernor,
  NemesisRelaxationMode,
  NemesisRelaxationReport,
  WEBER_PERCEPTUAL_K,
} from './NemesisGovernor';
import {
  appendCertifiedCapsuleToPredictor,
  CapsulePredictionResult,
  createCapsulePredictorFromJsonl,
  predictHelixStructureFromHistory,
  TrainedCapsulePredictorState,
} from './helixCapsuleTrainer';
import {
  AutodidactCycleOutput,
  runAutodidactCycle,
} from './helixAutodidactLoop';
import { createMiniGPTEngine, MiniGPTEngine } from './MiniGPTEngine';

export interface VerifiedExecutionBundle {
  source: string;
  valid: boolean;
  instructions: ParsedScriptInstruction[];
  godelBigInt: string;
  programSha256: string;
  smtReport: ProgramVerificationReport;
  pcc: ProofCarryingCertificate;
  diagnostics: string[];
}

export interface VmExecutionSnapshot {
  valid: boolean;
  completed: boolean;
  halted: boolean;
  runtimeError: string | null;
  finalPc: number;
  finalState: HelixVmState;
}

export interface ConstrainedGenerationResult {
  scenarioId: string;
  sequence: AiSequenceRunResult;
  verifiedBundle: VerifiedExecutionBundle;
}

export interface MatterKernelState {
  soa: SoAHolographicBuffer;
  phys: PauliSoAPhysicsState;
  elapsedSec: number;
  lastMeanTension?: number;
}

export interface SiliconPhysicsStepOptions {
  curlGain?: number;
  elasticityE?: number;
  viscosityEta?: number;
  nemesisMode?: NemesisRelaxationMode;
  gamma?: number;
  nemesisCutoff?: number;
  weberK?: number;
  governor?: NemesisGovernor;
}

export interface SiliconPhysicsStepResult {
  dt: number;
  elapsedSec: number;
  soaCapacity: number;
  soaStrideBytes: 28;
  soaByteLength: number;
  physicsReport: PauliSoAPhysicsStepReport;
  nemesisReport: NemesisRelaxationReport;
  cauchyTriple: CauchySpectralTriple;
  weberDecision: 'RENDER_FRAME' | 'SKIP_FRAME';
  weberDeltaRatio: number;
}

export interface MultiTargetAssemblyBundle {
  valid: boolean;
  programSha256: string;
  manifestSha256: string;
  targets: CellTarget[];
  totalCellsUsed: number;
  artifacts: Partial<Record<CellTarget, PureAssemblyResult>>;
}

export interface NativeSiliconBridgeHandle {
  readonly state: TokenPauliBridgeState;
  readonly governor: NemesisGovernor;
  readonly transportUrl: string | null;
  syncScript: (script: string) => ReturnType<typeof syncScriptToSiliconBridge>;
  injectImpulse: (glyphOrName?: string, strength?: number) => ReturnType<typeof injectTokenImpulse>;
  stepFrame: (
    dtSec?: number,
    opticEnabled?: boolean,
  ) => SiliconUniformSnapshot & { nemesisReport: NemesisRelaxationReport };
  getTelemetry: () => SiliconBridgeTelemetrySnapshot;
  getSoaMemoryLayout: () => {
    capacity: number;
    strideBytes: 28;
    byteLength: number;
    planes: ['x', 'y', 'z', 'u', 'v', 'amp', 'phaseQuad'];
  };
  getShaderBindings: () => {
    vertexPars: string;
    vertexDisplace: string;
    fragmentPars: string;
    fragmentSssCauchy: string;
  };
}

/**
 * Núcleo Determinista Autocontenido y Embebible (`@helix/core-engine`).
 * Cero dependencias de UI/DOM. Centraliza compilación, SMT, PCC, Pauli-SoA,
 * introspección de 188+ herramientas, descomposición y recombinación autopoiética.
 */
export class HelixCoreEngine {
  private tools: HelixRegisteredTool[];
  private capsulePredictor: TrainedCapsulePredictorState | null = null;
  private readonly miniGptEngine: MiniGPTEngine = createMiniGPTEngine();
  private readonly holographicLibrary: HolographicAcademicLibrary =
    sharedHolographicAcademicLibrary;

  constructor(initialTools: readonly HelixRegisteredTool[] = BASE_HELIX_TOOL_CATALOG) {
    this.tools = [...initialTools];
  }

  public getMiniGPTEngine(): MiniGPTEngine {
    return this.miniGptEngine;
  }

  public getDisciplines33(): readonly Discipline33[] {
    return DISCIPLINES_33;
  }

  public getHolographicLibrary(): HolographicAcademicLibrary {
    return this.holographicLibrary;
  }

  public getHolographicCards(): HolographicAcademicCard[] {
    return this.holographicLibrary.getCards();
  }

  public getRegisteredTools(): HelixRegisteredTool[] {
    return [...this.tools];
  }

  public getToolById(toolId: string): HelixRegisteredTool | undefined {
    return this.tools.find((t) => t.id === toolId || t.fileName === toolId);
  }

  public createMatterKernel(capacity = 32): MatterKernelState {
    const soa = createSoABuffer(capacity);
    for (let i = 0; i < capacity; i++) {
      packToSoABuffer(soa, i, i * 0.1, 0.05, -0.05, 0, 0, 0.5, 0);
    }
    return {
      soa,
      phys: createPauliSoAPhysicsState(capacity),
      elapsedSec: 0,
    };
  }

  /**
   * Puerta 1: Compilación + Gödel P33 + Verificador Formal SMT + Certificado PCC SHA-256.
   */
  public compileAndVerify(sourceOrIntent: string): VerifiedExecutionBundle {
    const trimmed = sourceOrIntent.trim();
    const looksLikeScript =
      trimmed.includes('ᛇᚢ') ||
      trimmed.includes('KERN_BOOT') ||
      trimmed.includes('SET ') ||
      trimmed.includes('SOA_INIT') ||
      trimmed.includes('GEOM_SEAL');

    let source = trimmed;
    if (!looksLikeScript) {
      const report = this.analyzeIntent(trimmed);
      source = report.recombination?.synthesizedHlx || 'ᛇᚢ\nᛗᚦ sys_admin\nGEOM_SEAL TORUS_T2 PHI_FIBONACCI 457.84\nᚳᛏ';
    }

    const instructions = compileHelixScript(source, INITIAL_COMPOUND_VOCABULARY);
    const smtReport = verifyHelixProgram(instructions);
    const tokenValidation = validateHelixProgram33Tokens(source, {
      vocabulary: INITIAL_COMPOUND_VOCABULARY,
      cells: DEFAULT_HELIX_CELLS,
    });
    const programSha256 = sha256Hex(source);

    const valid = smtReport.status === 'VERIFICADO';
    const pcc = buildProofCarryingCertificate(
      instructions.map((i) => ({ opcode: i.opcode, args: i.args })),
      {
        status: valid ? 'PROVED_SAFE' : 'VIOLATION_FOUND',
        maxHeapBytes: smtReport.symbolic?.maxHeapBytes ?? 0,
        heapCapacityBytes: smtReport.symbolic?.heapCapacityBytes ?? 1024,
        dischargedRuntimeChecks:
          smtReport.symbolic?.dischargedRuntimeChecks ?? (valid ? instructions.length : 0),
        octagonInvariants: smtReport.symbolic?.octagonInvariants ?? [],
        blockStates: (smtReport.symbolic?.blockStates ?? []).map((b) => ({
          id: b.id,
          size: b.size,
          state: b.state,
        })),
      },
    );

    return {
      source,
      valid,
      instructions,
      godelBigInt: tokenValidation.godelProduct,
      programSha256,
      smtReport,
      pcc,
      diagnostics: smtReport.findings.map((f) => f.detail),
    };
  }

  /**
   * Puerta 2: Ejecución determinista en la VM de Helix (solo si el bundle está verificado).
   */
  public executeProgram(bundle: VerifiedExecutionBundle): VmExecutionSnapshot {
    if (!bundle.valid) {
      const empty = createInitialVmState();
      return {
        valid: false,
        completed: false,
        halted: false,
        runtimeError: `Ejecución bloqueada por aduana SMT: ${bundle.diagnostics.join(' | ')}`,
        finalPc: 0,
        finalState: empty,
      };
    }

    const res = runHelixProgram(bundle.instructions);
    const rejectedLog = res.finalState.logs.find((l) => l.status === 'RECHAZADO');
    const completed =
      res.finalPc === bundle.instructions.length && !res.finalState.halted && !rejectedLog;
    return {
      valid: !rejectedLog,
      completed,
      halted: res.finalState.halted,
      runtimeError: rejectedLog ? rejectedLog.detail : null,
      finalPc: res.finalPc,
      finalState: res.finalState,
    };
  }

  /**
   * Puerta 2 (Compatibilidad): Paso continuo del núcleo físico Pauli-SoA (28B Zero-GC) + Curl + Némesis.
   */
  public stepMatterKernel(
    state: MatterKernelState,
    dt = 1 / 60,
    curlGain = 0.45,
    gamma = 0.05,
  ): PauliSoAPhysicsStepReport {
    state.elapsedSec += dt;
    return stepPauliSoAPhysics(state.soa, state.phys, state.elapsedSec, dt, {
      curlGain,
      nemesisGamma: gamma,
    });
  }

  /**
   * Puerta 2 (10D Silicio): Física continua Pauli-SoA (28 B/celda Zero-GC) + Navier-Stokes Curl Noise
   * + Kelvin-Voigt + Controlador Némesis de Cauchy (T_cut=0.001f) + Dispersión Cauchy + Weber-Fechner (120 FPS).
   */
  public stepSiliconPhysics(
    state: MatterKernelState,
    dt = 1 / 120,
    options: SiliconPhysicsStepOptions = {},
  ): SiliconPhysicsStepResult {
    const safeDt = Math.min(0.05, Math.max(1 / 240, dt));
    state.elapsedSec += safeDt;

    const curlGain = options.curlGain ?? 0.35;
    const gamma =
      options.gamma ??
      (options.nemesisMode && options.nemesisMode !== 'CUSTOM'
        ? NEMESIS_GAMMA_PRESETS[options.nemesisMode]
        : NEMESIS_GAMMA_PRESETS.STANDARD);

    const physicsReport = stepPauliSoAPhysics(
      state.soa,
      state.phys,
      state.elapsedSec,
      safeDt,
      {
        curlGain,
        elasticityE: options.elasticityE ?? 16.0,
        viscosityEta: options.viscosityEta ?? 5.5,
        nemesisGamma: gamma,
      },
    );

    const governor =
      options.governor ??
      createNemesisGovernor({
        mode: options.nemesisMode,
        gamma,
        cutoffThreshold: options.nemesisCutoff ?? NEMESIS_THERMAL_CUTOFF,
        weberK: options.weberK ?? WEBER_PERCEPTUAL_K,
      });

    const prevMetric = state.lastMeanTension ?? -1;
    const nemesisReport = governor.stepSoABuffer(
      state.soa,
      state.phys,
      prevMetric >= 0 ? prevMetric : undefined,
    );

    let weberDecision: 'RENDER_FRAME' | 'SKIP_FRAME' = 'RENDER_FRAME';
    let weberDeltaRatio = 1;
    if (prevMetric >= 0) {
      const wf = evaluateWeberFechnerFrame(
        prevMetric,
        nemesisReport.meanTension,
        governor.weberK,
      );
      weberDecision = wf.decision;
      weberDeltaRatio = wf.deltaRatio;
    }
    if (weberDecision === 'RENDER_FRAME' || state.lastMeanTension === undefined) {
      state.lastMeanTension = nemesisReport.meanTension;
    }

    return {
      dt: safeDt,
      elapsedSec: state.elapsedSec,
      soaCapacity: state.soa.capacity,
      soaStrideBytes: state.soa.strideBytes,
      soaByteLength: state.soa.backingBuffer.byteLength,
      physicsReport,
      nemesisReport: {
        ...nemesisReport,
        weberDecision,
        weberDeltaRatio,
      },
      cauchyTriple: computeCauchySpectralTriple(),
      weberDecision,
      weberDeltaRatio,
    };
  }

  /**
   * Puerta 3: Generación IA acotada por autómata gramatical + máscara SMT cero-alucinaciones.
   */
  public generateConstrained(
    goalOrScenarioId: string,
    temperature = 0.85,
  ): ConstrainedGenerationResult {
    const matched =
      AI_DECODING_SCENARIOS.find((s) => s.id === goalOrScenarioId) ??
      AI_DECODING_SCENARIOS.find((s) =>
        goalOrScenarioId.toLowerCase().includes('3d') || goalOrScenarioId.toLowerCase().includes('geom')
          ? s.id.includes('3d') || s.id.includes('geom')
          : s.id === AI_DECODING_SCENARIOS[0].id,
      ) ??
      AI_DECODING_SCENARIOS[0];

    const sequence = runConstrainedAiSequence(
      matched.id,
      INITIAL_COMPOUND_VOCABULARY,
      DEFAULT_HELIX_CELLS,
      temperature,
    );
    const verifiedBundle = this.compileAndVerify(sequence.constrainedScript);
    return {
      scenarioId: matched.id,
      sequence,
      verifiedBundle,
    };
  }

  /**
   * Puerta 4 (Un solo target, compatibilidad): Enlazador Puro de células .hlx a código Go / GLSL / JS / HTML.
   */
  public assemblePureArtifact(
    bundle: VerifiedExecutionBundle,
    target: CellTarget = 'go',
  ): PureAssemblyResult {
    return assemblePureFromCells(bundle.instructions, DEFAULT_HELIX_CELLS, target);
  }

  /**
   * Puerta 4 (Multitarget): Ensamblado determinista desde células .hlx firmadas hacia Go, GLSL, JS y HTML.
   */
  public assembleTargetArtifacts(
    bundle: VerifiedExecutionBundle,
    targets: CellTarget[] = ['go', 'glsl', 'js', 'html'],
  ): MultiTargetAssemblyBundle {
    const artifacts: Partial<Record<CellTarget, PureAssemblyResult>> = {};
    let allValid = bundle.valid;
    let firstManifest = '';
    const uniqueCells = new Set<string>();

    for (const target of targets) {
      const assembled = assemblePureFromCells(
        bundle.instructions,
        DEFAULT_HELIX_CELLS,
        target,
      );
      artifacts[target] = assembled;
      if (!assembled.valid) allValid = false;
      if (!firstManifest) firstManifest = assembled.manifestSha256;
      for (const c of assembled.usedCells) {
        uniqueCells.add(c.fileName);
      }
    }

    return {
      valid: allValid,
      programSha256: bundle.programSha256,
      manifestSha256: firstManifest || bundle.programSha256,
      targets: [...targets],
      totalCellsUsed: uniqueCells.size,
      artifacts,
    };
  }

  /**
   * Puerta 5: Puente Nativo al Silicio sin dependencias de UI (Pauli-SoA 28B + Némesis + Cauchy + GLSL + Blindaje SMT).
   */
  public connectNativeSiliconBridge(
    capacity = 32,
    initialScript?: string,
    transportUrl: string | null = null,
    governorConfig: { mode?: NemesisRelaxationMode; gamma?: number; cutoffThreshold?: number; weberK?: number } = {},
  ): NativeSiliconBridgeHandle {
    const state = createSiliconBridgeState(capacity);
    const governor = createNemesisGovernor({
      mode: governorConfig.mode ?? 'FAST_RESTORE',
      gamma: governorConfig.gamma ?? state.nemesisGamma,
      cutoffThreshold: governorConfig.cutoffThreshold ?? NEMESIS_THERMAL_CUTOFF,
      weberK: governorConfig.weberK ?? WEBER_PERCEPTUAL_K,
    });

    if (initialScript && initialScript.trim().length > 0) {
      syncScriptToSiliconBridge(state, initialScript, INITIAL_COMPOUND_VOCABULARY);
    }

    return {
      state,
      governor,
      transportUrl,
      syncScript: (script: string) =>
        syncScriptToSiliconBridge(state, script, INITIAL_COMPOUND_VOCABULARY),
      injectImpulse: (glyphOrName = 'ᚩ', strength = 0.95) =>
        injectTokenImpulse(state, glyphOrName, strength),
      stepFrame: (dtSec = 1 / 120, opticEnabled = true) => {
        const snapshot = stepSiliconBridgeFrame(state, dtSec, opticEnabled);
        const nemesisReport = governor.stepSoABuffer(state.soaBuffer, state.phys);
        return {
          ...snapshot,
          nemesisReport,
        };
      },
      getTelemetry: () => getSiliconBridgeTelemetry(state),
      getSoaMemoryLayout: () => ({
        capacity: state.soaBuffer.capacity,
        strideBytes: state.soaBuffer.strideBytes,
        byteLength: state.soaBuffer.backingBuffer.byteLength,
        planes: ['x', 'y', 'z', 'u', 'v', 'amp', 'phaseQuad'],
      }),
      getShaderBindings: () => ({
        vertexPars: HELIX_OPTIC_VERTEX_PARS,
        vertexDisplace: HELIX_OPTIC_VERTEX_DISPLACE,
        fragmentPars: HELIX_OPTIC_FRAGMENT_PARS,
        fragmentSssCauchy: HELIX_OPTIC_FRAGMENT_SSS_CAUCHY,
      }),
    };
  }

  /**
   * Entrena o actualiza el Mini-GPT local leyendo el historial de cápsulas certificadas (`dataset_capsules.jsonl`).
   */
  public trainFromCapsules(
    rawJsonl: string,
    steps = 16,
    existingCheckpointJson?: string,
  ): TrainedCapsulePredictorState {
    this.miniGptEngine.loadCapsulesFromJsonl(rawJsonl);
    this.capsulePredictor = createCapsulePredictorFromJsonl(rawJsonl, {
      steps,
      existingCheckpointJson,
    });
    this.miniGptEngine.restoreCheckpoint(this.capsulePredictor.checkpointJson);
    return this.capsulePredictor;
  }

  public getCapsulePredictorStatus(): {
    initialized: boolean;
    acceptedCapsules: number;
    stepsTrained: number;
    finalLoss: number;
    checkpointJson: string | null;
  } {
    if (!this.capsulePredictor) {
      return {
        initialized: false,
        acceptedCapsules: 0,
        stepsTrained: 0,
        finalLoss: 0,
        checkpointJson: null,
      };
    }
    return {
      initialized: true,
      acceptedCapsules: this.capsulePredictor.acceptedRecords.length,
      stepsTrained: this.capsulePredictor.model.trainedSteps,
      finalLoss: this.capsulePredictor.finalLoss,
      checkpointJson: this.capsulePredictor.checkpointJson,
    };
  }

  /**
   * Predice una estructura HELIX verificada por SMT a partir del historial de cápsulas certificadas.
   */
  public predictFromCertifiedHistory(
    prompt: string,
    fallbackJsonl = '',
    stepsIfUninitialized = 12,
  ): CapsulePredictionResult {
    if (!this.capsulePredictor) {
      this.trainFromCapsules(fallbackJsonl, stepsIfUninitialized);
    }
    return predictHelixStructureFromHistory(this.capsulePredictor!, prompt);
  }

  /**
   * Registra una nueva interacción certificada y ejecuta aprendizaje incremental en el Mini-GPT.
   */
  public recordCertifiedCapsule(
    entry: { prompt: string; reply: string; hlxScript: string; shape?: string; domain?: string },
    retrainSteps = 3,
  ): boolean {
    if (!this.capsulePredictor) {
      this.trainFromCapsules('', 8);
    }
    const updated = appendCertifiedCapsuleToPredictor(this.capsulePredictor!, entry, retrainSteps);
    if (updated && this.capsulePredictor) {
      this.miniGptEngine.ingestAndTrainIncremental(entry, 1);
      this.miniGptEngine.restoreCheckpoint(this.capsulePredictor.checkpointJson);
    }
    return updated;
  }

  /**
   * Ejecuta directamente el motor matemático real asociado a cualquiera de las 188+ herramientas.
   */
  public invokeTool(
    toolId: string,
    params: Record<string, number | string> = {},
  ): EngineExecutionOutput {
    const tool = this.getToolById(toolId);
    if (!tool) {
      return {
        engineId: 'neural_smt_synthesizer',
        valid: false,
        invariantSummary: `Herramienta no encontrada en el catálogo vivo: ${toolId}`,
        metrics: { error: 'NOT_FOUND' },
      };
    }
    return DOMAIN_ENGINE_METADATA[tool.engineId].execute(params);
  }

  /**
   * Entrevista adaptativa + auto-introspección + combinación autónoma invisible por petición.
   */
  public analyzeIntent(
    intent: string,
    answers: Record<string, string> = {},
    persona: PersonaMode = 'AUTO',
    explicitDataInputs: Record<string, number | string> = {},
    registerSynthesizedChild = false,
  ): EngineeringReport {
    const report = analyzeIntentAndBuildReport(
      intent,
      this.tools,
      answers,
      persona,
      explicitDataInputs,
    );
    if (
      registerSynthesizedChild &&
      report.recombination?.success &&
      report.recombination.childTool &&
      !this.tools.some((t) => t.id === report.recombination!.childTool!.id)
    ) {
      this.tools.unshift(report.recombination.childTool);
    }
    return report;
  }

  /**
   * Desarma cualquier programa en células atómicas con puertos e invariantes (y opcionalmente las registra).
   */
  public decomposeProgram(
    source: string,
    label = 'modulo_usuario.hlx',
    registerAtoms = false,
  ): DecompositionResult {
    const res = decomposeHelixProgram(source, label);
    if (registerAtoms && res.atoms.length > 0) {
      for (const atom of res.atoms) {
        if (!this.tools.some((t) => t.id === atom.atomId)) {
          const meta = DOMAIN_ENGINE_METADATA[atom.suggestedEngineId];
          this.tools.push({
            id: atom.atomId,
            fileName: `${atom.atomId}.hlx`,
            title: `ÁTOMO EXTRAÍDO (${atom.opcode})`,
            prime: 7,
            godelProduct: 7,
            sha256: atom.sha256,
            origin: 'autopoietic_child',
            domain: 'Verificación Formal y Seguridad',
            engineId: atom.suggestedEngineId,
            formulaSummary: meta.formulaSummary,
            inputs: meta.inputs,
            outputs: meta.outputs,
            smtContract: {
              pre: `(atom_extracted "${atom.atomId}")`,
              post: `(invariant "${atom.smtInvariant}")`,
            },
            hlxSource: atom.hlxCellScript,
            keywords: [atom.opcode.toLowerCase(), atom.atomId],
          });
        }
      }
    }
    return res;
  }

  /**
   * Combina/recombina 2 o más herramientas de cualquier dominio, valida con SMT + PCC,
   * destila una ficha holográfica de 17B, entrena MiniGPTEngine y registra el gen hijo.
   */
  public recombineTools(
    toolIds: string[],
    params: Record<string, number | string> = {},
    registerChild = true,
  ): RecombinationResult {
    const resolved = toolIds
      .map((id) => this.getToolById(id))
      .filter((t): t is HelixRegisteredTool => Boolean(t));
    const res = recombineHelixTools(resolved, params);
    if (registerChild && res.success && res.childTool) {
      if (!this.tools.some((t) => t.id === res.childTool!.id)) {
        this.tools.unshift(res.childTool);
      }
      this.holographicLibrary.ingestRecombination({
        title: res.childTool.title,
        summary: res.engineeringSummary,
        tools: res.parentTools,
        hlxScript: res.synthesizedHlx,
        godelProduct: res.godelBigInt,
        pcc: res.pcc,
      });
      this.recordCertifiedCapsule(
        {
          prompt: `Recombinar ${res.parentTools.map((t) => t.title).join(' x ')}`,
          reply: res.engineeringSummary,
          hlxScript: res.synthesizedHlx,
          shape: 'avatar',
          domain: res.childTool.domain,
        },
        2,
      );
    }
    return res;
  }

  /**
   * Ensambla cualquier herramienta recombinada y certificada hacia los 4 targets reales
   * (Go, GLSL ES 3.00, JS ESM y HTML5).
   */
  public exportRecombinationMultiTarget(
    res: RecombinationResult,
    targets: CellTarget[] = ['go', 'glsl', 'js', 'html'],
  ): MultiTargetAssemblyBundle | null {
    if (!res.synthesizedHlx.trim()) return null;
    const bundle = this.compileAndVerify(res.synthesizedHlx);
    return this.assembleTargetArtifacts(bundle, targets);
  }

  public discoverCrossDomainExperiments(): readonly CrossDomainExperiment[] {
    return CURATED_CROSS_EXPERIMENTS;
  }

  /**
   * Ejecuta el filtro Línea Recta + Doble Hélice + Consulta/Adquisición Autodidacta en 17 bytes.
   */
  public runAutodidactSynthesis(
    intent: string,
    existingRecombination?: RecombinationResult | null,
  ): AutodidactCycleOutput {
    const out = runAutodidactCycle(intent, this.holographicLibrary, existingRecombination);
    if (out.newlyLearnedCard) {
      this.recordCertifiedCapsule(
        {
          prompt: out.lineaRecta.distilledCore || intent,
          reply: out.newlyLearnedCard.summary,
          hlxScript: out.doubleHelix.synthesizedHlx,
          shape: 'avatar',
          domain: out.newlyLearnedCard.disciplines[0]?.name ?? 'AUTODIDACTA_P33',
        },
        2,
      );
    }
    return out;
  }
}

export function createHelixCoreEngine(): HelixCoreEngine {
  return new HelixCoreEngine();
}
