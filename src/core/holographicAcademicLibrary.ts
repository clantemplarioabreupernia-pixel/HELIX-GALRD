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

function buildSeeded33Cards(): HolographicAcademicCard[] {
  return DISCIPLINES_33.map((disc) => {
    const hlxScript = [
      `# FICHA CIENTIFICA 17B · ${disc.name}`,
      'ᛇᚢ',
      'ᛗᚦ acad_lib',
      `SET p33_prime ${disc.prime}`,
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
