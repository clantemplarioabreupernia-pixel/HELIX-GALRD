import { RUNES, RuneToken } from '../data/runes';
import { INITIAL_COMPOUND_VOCABULARY } from '../data/vocabulary';
import { validateHelixProgram33Tokens } from '../utils/godel';
import { DEFAULT_HELIX_CELLS } from '../utils/helixCells';
import { stepNemesisCauchy } from '../utils/helixPhysics';
import { createSoABuffer, encodeQpsk132Frame, packToSoABuffer, Qpsk132Frame, Z4Symbol } from '../utils/helixSignal';
import { compileHelixScript, runHelixProgram, verifyHelixProgram } from '../utils/helixVm';
import { BASE_HELIX_TOOL_CATALOG, HelixRegisteredTool } from './helixToolCatalog159';
import { recombineHelixTools, RecombinationResult } from './helixRecombinator';

export const HARDWARE_SEAL = 0x7FEE26DBFF29n;
export const HELIX_DNA_VERSION = 'HELIX-DNA-2.0-SOVEREIGN';
export type EnergyBand = 'VALENCE_LOCKED' | 'CONDUCTION_ACTIVE';

export interface DoubleHelixStrandPair {
  strandA_Physics: RuneToken;
  strandB_Symbolic: RuneToken;
  z4Complement: Z4Symbol;
  blochCoords: [number, number, number];
}

export interface AutopoieticCycleReport {
  dnaVersion: string;
  sealVerified: boolean;
  energyBand: EnergyBand;
  smtDirective: string;
  strandPairs: DoubleHelixStrandPair[];
  holographicFrame: Qpsk132Frame;
  homeostasisTension: number;
  penroseCollapseTauSec: number;
  collapsedToSolid: boolean;
  recombination: RecombinationResult | null;
  synthesizedHlx: string;
  godelProduct: string;
  positionalSignature: string;
  validP33: boolean;
}

function pairStrandsInZ4(runeA: RuneToken, runeB: RuneToken, tension: number): DoubleHelixStrandPair {
  const phaseA = (runeA.prime % 4) as Z4Symbol;
  const phaseB = (runeB.prime % 4) as Z4Symbol;
  const z4Complement = ((4 - ((phaseA + phaseB) % 4)) % 4) as Z4Symbol;
  const theta = Math.min(Math.PI, (runeA.index / 33) * Math.PI + tension * 0.5);
  const phi = ((runeB.frequencyHz % 360) * Math.PI) / 180;
  return {
    strandA_Physics: runeA,
    strandB_Symbolic: runeB,
    z4Complement,
    blochCoords: [
      Number((Math.sin(theta) * Math.cos(phi)).toFixed(5)),
      Number((Math.sin(theta) * Math.sin(phi)).toFixed(5)),
      Number(Math.cos(theta).toFixed(5)),
    ],
  };
}

function selectComplementaryGenes(intent: string): HelixRegisteredTool[] {
  const q = intent.toLowerCase();
  const scored = BASE_HELIX_TOOL_CATALOG.map((tool: HelixRegisteredTool) => {
    let score = 0;
    const text = `${tool.id} ${tool.title} ${tool.domain} ${tool.formulaSummary}`.toLowerCase();
    for (const word of q.split(/\W+/).filter((w) => w.length > 2)) {
      if (text.includes(word)) score += 3;
    }
    if (/espac|orbit|nave|satelit/.test(q) && /orbit|kepler|satel|radar/.test(text)) score += 4;
    if (/music|sonid|onda|hz|audio/.test(q) && /dsp|signal|cymat|helmholtz|harmonic/.test(text)) score += 4;
    if (/salud|astronaut|biomed|coraz/.test(q) && /biomed|pulse|signal|telemetry/.test(text)) score += 4;
    if (/finanz|contab|balance|dinero/.test(q) && /ledger|decimal|merkle/.test(text)) score += 4;
    if (/monta|terren|lunar|planeta/.test(q) && /terrain|fbm|heightmap|viscoelastic/.test(text)) score += 4;
    return { tool, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length >= 2) {
    const first = scored[0].tool;
    const second = scored.find(
      (s) =>
        s.tool.id !== first.id &&
        (first.domain === 'Finanzas y Criptografía'
          ? s.tool.domain === 'Finanzas y Criptografía'
          : s.tool.domain !== 'Finanzas y Criptografía'),
    )?.tool;
    return second ? [first, second] : [first, scored[1].tool];
  }
  return [...BASE_HELIX_TOOL_CATALOG.slice(0, 2)];
}

export function runDoubleHelixAutopoiesis(intent: string, providedSeal: bigint = HARDWARE_SEAL): AutopoieticCycleReport {
  const sealVerified = providedSeal === HARDWARE_SEAL;
  const energyBand: EnergyBand = sealVerified ? 'CONDUCTION_ACTIVE' : 'VALENCE_LOCKED';
  const smtDirective = '(assert (and (= preserve_all true) (= zero_deletion true) (= recombine_dna true)))';
  const selectedGenes = sealVerified ? selectComplementaryGenes(intent) : [];
  const recombination = selectedGenes.length >= 2 ? recombineHelixTools(selectedGenes) : null;

  const strandPairs: DoubleHelixStrandPair[] = [];
  for (let i = 0; i < 6; i++) {
    strandPairs.push(pairStrandsInZ4(RUNES[i % RUNES.length], RUNES[(32 - i) % RUNES.length], 0.12 * (i + 1)));
  }

  const activeIndices = strandPairs.flatMap((p) => [p.strandA_Physics.index - 1, p.strandB_Symbolic.index - 1]);
  const holographicFrame = encodeQpsk132Frame(activeIndices, [
    strandPairs.length * 137,
    Math.round(Math.abs(strandPairs[0]?.blochCoords[0] ?? 0.5) * 1000),
    strandPairs.reduce((acc, p) => acc + p.z4Complement, 0),
  ]);

  const soa = createSoABuffer(strandPairs.length);
  strandPairs.forEach((pair, idx) => {
    packToSoABuffer(
      soa,
      idx,
      pair.blochCoords[0],
      pair.blochCoords[1],
      pair.blochCoords[2],
      pair.strandA_Physics.prime / 137,
      pair.strandB_Symbolic.prime / 137,
      0.25,
      pair.z4Complement,
    );
  });

  const homeostasisTension = stepNemesisCauchy(0.32, 0.08);
  const penroseCollapseTauSec = Number((1.0 / Math.max(0.05, strandPairs.length * 0.18 + homeostasisTension)).toFixed(4));
  const collapsedToSolid = penroseCollapseTauSec < 1.2 && sealVerified;

  const synthesizedHlx =
    recombination?.synthesizedHlx ??
    'ᛇᚢ\nᛗᚦ sys_admin\nSOA_INIT 32\nCURL_STEP 0.35 0.016\nNEMESIS_DECAY 0.08\nBLOCH_ROT 0 1 0 1.05 1\nWEBER_GUARD 0.02\nGEOM_SEAL 1.0\nᚳᛏ';
  const p33 = validateHelixProgram33Tokens(synthesizedHlx, {
    vocabulary: INITIAL_COMPOUND_VOCABULARY,
    cells: DEFAULT_HELIX_CELLS,
  });
  const compiledHlx = compileHelixScript(synthesizedHlx, INITIAL_COMPOUND_VOCABULARY);
  if (verifyHelixProgram(compiledHlx).status === 'VERIFICADO') {
    runHelixProgram(compiledHlx);
  }

  return {
    dnaVersion: HELIX_DNA_VERSION,
    sealVerified,
    energyBand,
    smtDirective,
    strandPairs,
    holographicFrame,
    homeostasisTension,
    penroseCollapseTauSec,
    collapsedToSolid,
    recombination,
    synthesizedHlx,
    godelProduct: p33.godelProduct,
    positionalSignature: p33.positionalSignature,
    validP33: p33.valid,
  };
}