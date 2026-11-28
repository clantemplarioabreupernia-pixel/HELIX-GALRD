import {
  DISCIPLINE_BY_BIT_INDEX,
  Discipline33,
  DISCIPLINES_33,
  resolveDisciplinesForTools,
} from '../data/disciplines33';
import { ProofCarryingCertificate, sha256Hex } from '../utils/helixPcc';
import {
  createSoABuffer,
  decodeQpsk132Symbols,
  encodeQpsk132Frame,
  packToSoABuffer,
  Qpsk132Frame,
  Z4Symbol,
} from '../utils/helixSignal';
import type { HelixRegisteredTool } from './helixToolCatalog159';

export interface HolographicAcademicCard {
  id: string;
  title: string;
  summary: string;
  sourceKind: 'canonical_discipline' | 'autopoietic_recombination';
  disciplines: Discipline33[];
  activeBitIndices: number[];
  primeMaskBits33: string;
  frame: Qpsk132Frame;
  byteLength: 17;
  bitLength: 132;
  z4SymbolCount: 66;
  soaStrideBytes: 28;
  soaDigestSha256: string;
  godelProduct: string;
  pccCertificateSha256: string;
  hlxScript: string;
  createdAtIso: string;
}

export interface DecodedAcademicCard17B {
  frameSha256: string;
  validIntegrity: boolean;
  recoveredBitIndices: number[];
  recoveredDisciplines: Discipline33[];
  channel1Scaled: number;
  channel2Scaled: number;
  channel3Scaled: number;
}

function buildSoaProjectionDigest(
  disciplines: Discipline33[],
  channels: [number, number, number],
): { soaStrideBytes: 28; soaDigestSha256: string } {
  const count = Math.max(1, disciplines.length);
  const soa = createSoABuffer(count);
  disciplines.forEach((disc, idx) => {
    const theta = ((disc.index / 33) * Math.PI) % Math.PI;
    const phi = (((channels[1] % 360) + disc.frequencyHz) * Math.PI) / 180;
    const amp = Math.min(1, Math.max(0.1, (channels[2] % 1000) / 1000));
    packToSoABuffer(
      soa,
      idx,
      Math.sin(theta) * Math.cos(phi),
      Math.sin(theta) * Math.sin(phi),
      Math.cos(theta),
      disc.prime / 137,
      disc.frequencyHz / 600,
      amp,
      disc.cubeFaces.cara3_faseZ4 as Z4Symbol,
    );
  });
  const bytes = new Uint8Array(soa.backingBuffer);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return {
    soaStrideBytes: soa.strideBytes,
    soaDigestSha256: sha256Hex(`soa28|${hex}`),
  };
}

/**
 * Destila conocimiento científico o herramientas recombinadas en una ficha
 * holográfica compacta de exactamente 17 bytes (QPSK-132 = 66 símbolos Z4)
 * acoplada a las 33 Disciplinas (Canal 0) y al certificado PCC.
 */
export function distillAcademicCapsule17B(input: {
  id?: string;
  title: string;
  summary: string;
  sourceKind?: 'canonical_discipline' | 'autopoietic_recombination';
  tools?: HelixRegisteredTool[];
  explicitDisciplines?: Discipline33[];
  hlxScript: string;
  godelProduct: string;
  pcc: ProofCarryingCertificate | null;
  channelScalars?: [number, number, number];
}): HolographicAcademicCard {
  const resolvedFromTools =
    input.tools && input.tools.length > 0
      ? resolveDisciplinesForTools(input.tools).disciplines
      : [];
  const baseDisciplines =
    input.explicitDisciplines && input.explicitDisciplines.length > 0
      ? input.explicitDisciplines
      : resolvedFromTools.length > 0
        ? resolvedFromTools
        : [DISCIPLINES_33[0]];

  const uniqueByBit = new Map<number, Discipline33>();
  for (const d of baseDisciplines) {
    uniqueByBit.set(d.bitIndex, d);
  }
  const disciplines = Array.from(uniqueByBit.values()).sort((a, b) => a.bitIndex - b.bitIndex);
  const activeBitIndices = disciplines.map((d) => d.bitIndex);

  const avgFreq =
    disciplines.reduce((acc, d) => acc + d.frequencyHz, 0) / Math.max(1, disciplines.length);
  const scriptDigestInt = parseInt(sha256Hex(input.hlxScript).slice(0, 8), 16) >>> 0;
  const pccDigest = input.pcc?.certificateSha256 ?? sha256Hex(`pcc-fallback|${input.hlxScript}`);
  const pccInt = parseInt(pccDigest.slice(0, 8), 16) >>> 0;

  const channelValues: [number, number, number] = input.channelScalars ?? [
    scriptDigestInt,
    Math.round(avgFreq * 1000),
    pccInt,
  ];

  const frame = encodeQpsk132Frame(activeBitIndices, channelValues);
  const { soaStrideBytes, soaDigestSha256 } = buildSoaProjectionDigest(
    disciplines,
    channelValues,
  );

  const id =
    input.id ??
    `holo17b_${frame.frameSha256.slice(0, 12)}_${activeBitIndices.join('-')}`;

  return {
    id,
    title: input.title,
    summary: input.summary,
    sourceKind: input.sourceKind ?? 'autopoietic_recombination',
    disciplines,
    activeBitIndices,
    primeMaskBits33: frame.primeMaskBits,
    frame,
    byteLength: 17,
    bitLength: 132,
    z4SymbolCount: 66,
    soaStrideBytes,
    soaDigestSha256,
    godelProduct: input.godelProduct,
    pccCertificateSha256: pccDigest,
    hlxScript: input.hlxScript,
    createdAtIso: new Date().toISOString(),
  };
}

/**
 * Reconstruye desde los 66 símbolos Z4 (17 bytes) qué disciplinas académicas de P33
 * y qué canales escalares fueron codificados, verificando la integridad SHA-256.
 */
export function decodeAcademicCard17B(card: HolographicAcademicCard): DecodedAcademicCard17B {
  const decoded = decodeQpsk132Symbols(card.frame.symbols);
  const reEncoded = encodeQpsk132Frame(decoded.activePrimeIndices, decoded.channels);
  const recoveredDisciplines = decoded.activePrimeIndices
    .map((idx) => DISCIPLINE_BY_BIT_INDEX.get(idx))
    .filter((d): d is Discipline33 => Boolean(d));

  return {
    frameSha256: card.frame.frameSha256,
    validIntegrity: reEncoded.frameSha256 === card.frame.frameSha256,
    recoveredBitIndices: decoded.activePrimeIndices,
    recoveredDisciplines,
    channel1Scaled: decoded.channels[0],
    channel2Scaled: decoded.channels[1],
    channel3Scaled: decoded.channels[2],
  };
}

function opcodeForDisciplineEngine(engineId: string, discPrime: number, freqHz: number): string {
  switch (engineId) {
    case 'pauli_viscoelastic_soa':
      return 'SOA_INIT 32\nCURL_STEP 0.45 0.016\nNEMESIS_DECAY 0.08';
    case 'cauchy_tensor_von_mises':
      return 'TENSOR_VM 180 90 45';
    case 'cauchy_optical_sss':
      return 'CAUCHY_OPTIC 1458/1000 354/100000 12/100000';
    case 'nanotech_biopixel_quantum':
      return 'NANO_BRUS 2.6\nCAUCHY_OPTIC 1458/1000 354/100000 12/100000';
    case 'orbital_kepler_verlet':
      return 'ORBIT_KEPLER 420 398600.4418';
    case 'kinetic_p33_rational':
      return 'KINETIC_P33 12 5 0.016';
    case 'rigid_collision_3d':
      return 'RIGID_COLLIDE 10 10 8 0.85';
    case 'terrain_fbm_mulberry':
      return 'TERRAIN_FBM 6 1.2';
    case 'quantum_bloch_bvn':
      return 'BLOCH_ROT 0 1 0 1.2 1\nBVN_LATTICE 1.5708 0 3.1416 q_nondist';
    case 'quantum_statevector_qasm':
      return 'QASM_STATE 3\nBLOCH_ROT 0 1 0 1.2 1';
    case 'telecom_5g_sat_rf':
      return 'ITU_P676 28 35 1013.25 15 7.5 0.0\nMMWAVE_3GPP 28 250 UMi-LoS 10 1.5';
    case 'radar_fmcw_doppler':
      return 'RADAR_FMCW 77 4000 24 42 1.0';
    case 'annealing_optimizer':
      return 'ANNEAL_OPT 100 0.995 1000';
    case 'crypto_ed25519_merkle':
      return 'CRYPTO_AUDIT 256 8 DISC_SEAL';
    case 'ledger_p33_merkle':
      return 'LEDGER_MERKLE 10000 10000\nCRYPTO_AUDIT 256 8 LEDGER_SEAL';
    case 'audio_p33_cymatic':
      return `GALDR_SYNTH ${discPrime % 33} CIMATICA_P33`;
    case 'lipsync_3band_dsp':
      return `LIPSYNC_DSP ${freqHz.toFixed(1)} 0.65\nGALDR_SYNTH ${discPrime % 33} LIPSYNC`;
    case 'sintergia_cinema_spline':
      return 'CAM_6DOF 3.2 2.1 3.8 38 18 45\nDISNEY_KIN12 1.18';
    case 'chemistry_quantum_thermodynamics':
      return 'CHEM_THERMO 298.15 4.52';
    case 'qpsk_telemetry_bus':
      return 'WS_EMIT qpsk_132b z4_telemetry';
    case 'geom_seal_topology':
      return `MESH_NODE disc_mesh torus 640 1.0\nMAT_ORM disc_mesh 0.92 0.18 0.85`;
    case 'interval_formal_guard':
    case 'neural_smt_synthesizer':
    default:
      return 'WEBER_GUARD 0.015 1.0 1.05 wf_disc';
  }
}

function buildSeeded33Cards(): HolographicAcademicCard[] {
  return DISCIPLINES_33.map((disc) => {
    const domainBody = opcodeForDisciplineEngine(disc.primaryEngineId, disc.prime, disc.frequencyHz);
    const hlxScript = [
      `# FICHA CIENTIFICA 17B · ${disc.name}`,
      'ᛇᚢ',
      'ᛗᚦ acad_lib',
      `SET p33_prime ${disc.prime}`,
      domainBody,
      `GEOM_SEAL TORUS_T2 PHI_FIBONACCI ${disc.frequencyHz.toFixed(2)}`,
      'ᚳᛏ',
    ].join('\n');

    return distillAcademicCapsule17B({
      id: `seed17b_${disc.id}`,
      title: `${disc.glyph} (${disc.prime}) · ${disc.name}`,
      summary: `${disc.faculty} — ${disc.canonicalEquation}`,
      sourceKind: 'canonical_discipline',
      explicitDisciplines: [disc],
      hlxScript,
      godelProduct: String(2 * 41 * 71 * 3 * disc.prime * 59),
      pcc: null,
    });
  });
}

export class HolographicAcademicLibrary {
  private cards: HolographicAcademicCard[];

  constructor() {
    this.cards = buildSeeded33Cards();
  }

  public getCards(): HolographicAcademicCard[] {
    return [...this.cards];
  }

  public getTotalBytesStored(): number {
    return this.cards.reduce((acc, c) => acc + c.byteLength, 0);
  }

  public findByDisciplineBit(bitIndex: number): HolographicAcademicCard[] {
    return this.cards.filter((c) => c.activeBitIndices.includes(bitIndex));
  }

  public search(query: string): HolographicAcademicCard[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.getCards();
    return this.cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.disciplines.some(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.faculty.toLowerCase().includes(q) ||
            d.keywords.some((kw) => kw.includes(q)),
        ),
    );
  }

  public ingestRecombination(input: {
    title: string;
    summary: string;
    tools: HelixRegisteredTool[];
    hlxScript: string;
    godelProduct: string;
    pcc: ProofCarryingCertificate | null;
  }): HolographicAcademicCard {
    const card = distillAcademicCapsule17B({
      title: input.title,
      summary: input.summary,
      sourceKind: 'autopoietic_recombination',
      tools: input.tools,
      hlxScript: input.hlxScript,
      godelProduct: input.godelProduct,
      pcc: input.pcc,
    });

    const existingIdx = this.cards.findIndex(
      (c) => c.frame.frameSha256 === card.frame.frameSha256 && c.pccCertificateSha256 === card.pccCertificateSha256,
    );
    if (existingIdx >= 0) {
      this.cards[existingIdx] = card;
    } else {
      this.cards.unshift(card);
    }
    return card;
  }
}

export const sharedHolographicAcademicLibrary = new HolographicAcademicLibrary();

export function createHolographicAcademicLibrary(): HolographicAcademicLibrary {
  return new HolographicAcademicLibrary();
}
