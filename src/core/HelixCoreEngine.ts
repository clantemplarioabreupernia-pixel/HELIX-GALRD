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
  createPauliSoAPhysicsState,
  PauliSoAPhysicsState,
  PauliSoAPhysicsStepReport,
  stepPauliSoAPhysics,
} from '../utils/helixPhysics';
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
}

/**
 * Núcleo Determinista Autocontenido y Embebible (`@helix/core-engine`).
 * Cero dependencias de UI/DOM. Centraliza compilación, SMT, PCC, Pauli-SoA,
 * introspección de 188+ herramientas, descomposición y recombinación autopoiética.
 */
export class HelixCoreEngine {
  private tools: HelixRegisteredTool[];

  constructor(initialTools: readonly HelixRegisteredTool[] = BASE_HELIX_TOOL_CATALOG) {
    this.tools = [...initialTools];
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
   * Puerta 3: Paso continuo del núcleo físico Pauli-SoA (28B Zero-GC) + Curl + Némesis.
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
   * Puerta 4: Generación IA acotada por autómata gramatical + máscara SMT cero-alucinaciones.
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
   * Puerta 5: Enlazador Puro de células .hlx a código Go / GLSL / JS / HTML.
   */
  public assemblePureArtifact(
    bundle: VerifiedExecutionBundle,
    target: CellTarget = 'go',
  ): PureAssemblyResult {
    return assemblePureFromCells(bundle.instructions, DEFAULT_HELIX_CELLS, target);
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
   * Combina/recombina 2 o más herramientas de cualquier dominio, valida con SMT y registra el gen hijo.
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
    }
    return res;
  }

  public discoverCrossDomainExperiments(): readonly CrossDomainExperiment[] {
    return CURATED_CROSS_EXPERIMENTS;
  }
}

export function createHelixCoreEngine(): HelixCoreEngine {
  return new HelixCoreEngine();
}
