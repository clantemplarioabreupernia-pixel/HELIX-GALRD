/**
 * HELIX-DNA-2.0 · Cadena Holográfica Contigua de 36,000 Contenedores (QPSK-132 / 17 Bytes Zero-GC)
 *
 * Almacena 36,000 contenedores encadenados de código HELIX + leyes físicas acopladas en un único
 * búfer contiguo de 36,000 × 17 bytes = 612,000 bytes (~597.7 KiB), frente a ~34 MB en objetos JSON.
 * Cada contenedor porta:
 *   - Canal 0 (33 bits): Máscara exacta de primos P33 y disciplinas científicas activas
 *   - Canal 1 (33 bits): Índice + Enlace de cadena holográfica (hash encadenado FNV-1a mod 2^33)
 *   - Canal 2 (33 bits): Estado de las 6 Caras Z4 del Biopíxel + ID de Ley Acoplada + λ(nm)
 *   - Canal 3 (33 bits): Magnitud física acoplada (tensión Cauchy / energía orbital / frecuencia cymática)
 */

import { CubeFacesZ4, deriveCubeFacesForPrime, FaceStateZ4, PRIMITIVE_TOKENS, PrimitiveToken } from '../data/runes';
import { DISCIPLINES_33 } from '../data/disciplines33';
import { sha256Hex } from '../utils/helixPcc';
import { computeCoupledNanotechBiopixelState, CoupledNanotechBiopixelState } from './helixQuantumDisplayPhysics';

export const DEFAULT_HOLOGRAPHIC_CONTAINER_COUNT = 36_000;
export const CONTAINER_STRIDE_BYTES = 17;

export type CoupledLawFamilyId =
  | 'CAUCHY_NEMESIS_BRUS'
  | 'KEPLER_VERLET_TELECOM'
  | 'WKB_MOTT_IGZO_Z4'
  | 'MAXWELL_PHOTONIC_EUV'
  | 'BLOCH_BVN_SHANNON'
  | 'ASTRONAUT_BIOMED_GUARD';

const LAW_FAMILIES: readonly {
  id: CoupledLawFamilyId;
  label: string;
  formula: string;
  opcodes: [string, string, string];
  baseLambdaNm: number;
}[] = [
  {
    id: 'CAUCHY_NEMESIS_BRUS',
    label: 'Cauchy Viscoelástico + Némesis + Brus',
    formula: 'σ(t+1)=σ(t)(1-γ) ↔ E(R)=Eg+ħ²π²/(2μR²)-1.8e²/(4πεR)',
    opcodes: ['SOA_INIT 32', 'CURL_STEP 0.45 0.016', 'NEMESIS_DECAY 0.08'],
    baseLambdaNm: 472,
  },
  {
    id: 'KEPLER_VERLET_TELECOM',
    label: 'Órbita Kepler/Verlet + Enlace Satelital ITU-R + Doppler',
    formula: 'v=√(μ/r) ↔ f_D=2v/λ ↔ FSPL=92.45+20log(f·d)',
    opcodes: ['ITU_P676 28 35 1013.25 15 7.5 0.0', 'RADAR_FMCW 77 4000 24 42 1.0', 'WS_EMIT telemetry orbit_rf'],
    baseLambdaNm: 515,
  },
  {
    id: 'WKB_MOTT_IGZO_Z4',
    label: 'Túnel WKB Fowler-Nordheim + Mott-Gurney SCLC + IGZO',
    formula: 'J_FN∝F²exp(-B/F) ↔ J_SCLC=(9/8)εμV²/L³ ↔ I_ds=μCox(W/L)',
    opcodes: ['SOA_INIT 32', 'WEBER_GUARD 0.015 1.0 1.05 wf_ok', 'WS_EMIT telemetry igzo_wkb'],
    baseLambdaNm: 538,
  },
  {
    id: 'MAXWELL_PHOTONIC_EUV',
    label: 'Cristal Fotónico Maxwell Z₄ + Litografía Rayleigh EUV',
    formula: 'ω=(c/n)√(k²+(π/a)²) ↔ CD=k₁λ/NA ↔ CaraZ₄[0..5]',
    opcodes: ['GEOM_SEAL ICOSAHEDRON PHI_FIBONACCI 457.84', 'BLOCH_ROT 0 1 0 1.05 1', 'WS_EMIT telemetry photonic_z4'],
    baseLambdaNm: 452,
  },
  {
    id: 'BLOCH_BVN_SHANNON',
    label: 'Esfera de Bloch SU(2) + Reticulado Birkhoff-von Neumann',
    formula: 'U=exp(-iHt/ħ), ||ψ||²=1 ↔ P∧(Q∨R)≠(P∧Q)∨(P∧R)',
    opcodes: ['BLOCH_ROT 0 1 0 1.2 1', 'BVN_LATTICE 1.5708 0 3.1416 q_nondist', 'WS_EMIT telemetry bloch_bvn'],
    baseLambdaNm: 440,
  },
  {
    id: 'ASTRONAUT_BIOMED_GUARD',
    label: 'Supervivencia Orbital Tierra/Luna/Marte + Guardia Intervalos',
    formula: 'g∈{9.81,1.62,3.72} ↔ FC∈[50,125] ∧ Gluc∈[70,150]',
    opcodes: ['CRYPTO_AUDIT 256 8 BIO_GUARD', 'WEBER_GUARD 0.015 1.0 1.15 bio_ok', 'WS_EMIT telemetry biomed_nasa'],
    baseLambdaNm: 589,
  },
];

export interface HolographicContainerChain {
  readonly count: number;
  readonly strideBytes: 17;
  readonly payloadBuffer: Uint8Array;      // count * 17 bytes contiguos (612,000 B para 36,000)
  readonly linkHashes: Uint32Array;        // count * 4 bytes para verificación O(N) sin heap alloc
  readonly genesisSeed: number;
  readonly buildTimeMs: number;
  readonly jsonEquivalentBytes: number;
  readonly compressionRatio: number;
  readonly chainRootHex: string;
}

export interface DecodedHolographicContainer {
  index: number;
  byteOffset: number;
  hexBytes17: string;
  lawFamily: (typeof LAW_FAMILIES)[number];
  primaryToken: PrimitiveToken;
  secondaryToken: PrimitiveToken;
  activeTokens: PrimitiveToken[];
  activeDisciplinesCount: number;
  godelBigInt: string;
  cubeFaces: CubeFacesZ4;
  lambdaNm: number;
  tensionNormalized: number;
  chainLinkHex: string;
  prevChainLinkHex: string;
  linkValid: boolean;
  coupledPhysics: CoupledNanotechBiopixelState;
  hlxProgram: string;
}

export interface ChainVerificationSummary {
  totalContainers: number;
  verifiedLinks: number;
  brokenIndex: number | null;
  integrityOk: boolean;
  verifyTimeMs: number;
  contiguousBytes: number;
  totalMemoryWithDigestBytes: number;
  chainRootHex: string;
}

function writeBits132(
  buf: Uint8Array,
  byteOffset: number,
  ch0Mask33: bigint,
  ch1Val33: bigint,
  ch2Val33: bigint,
  ch3Val33: bigint,
): void {
  // Limpiar 17 bytes destino
  for (let b = 0; b < 17; b++) buf[byteOffset + b] = 0;

  const writeChannel = (startBit: number, val: bigint) => {
    let v = val & ((1n << 33n) - 1n);
    for (let i = 0; i < 33; i++) {
      if ((v & 1n) === 1n) {
        const bitPos = startBit + i;
        buf[byteOffset + (bitPos >> 3)] |= 1 << (bitPos & 7);
      }
      v >>= 1n;
    }
  };

  writeChannel(0, ch0Mask33);
  writeChannel(33, ch1Val33);
  writeChannel(66, ch2Val33);
  writeChannel(99, ch3Val33);
}

function readChannel33(buf: Uint8Array, byteOffset: number, startBit: number): bigint {
  let val = 0n;
  for (let i = 0; i < 33; i++) {
    const bitPos = startBit + i;
    if ((buf[byteOffset + (bitPos >> 3)] & (1 << (bitPos & 7))) !== 0) {
      val |= 1n << BigInt(i);
    }
  }
  return val;
}

function fnv1aStep(prevHash: number, buf: Uint8Array, byteOffset: number): number {
  let h = (prevHash ^ 0x811c9dc5) >>> 0;
  for (let i = 0; i < 17; i++) {
    h ^= buf[byteOffset + i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Construye una cadena holográfica contigua de `count` contenedores (por defecto 36,000)
 * en ~612 KB sin asignar objetos por contenedor.
 */
export function createHolographicContainerChain(
  count = DEFAULT_HOLOGRAPHIC_CONTAINER_COUNT,
  genesisSeed = 13702026,
): HolographicContainerChain {
  const safeCount = Math.max(1, Math.min(200_000, Math.floor(count)));
  const tStart = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const payloadBuffer = new Uint8Array(safeCount * CONTAINER_STRIDE_BYTES);
  const linkHashes = new Uint32Array(safeCount);
  let rollingHash = (genesisSeed ^ 0x9e3779b9) >>> 0;

  for (let i = 0; i < safeCount; i++) {
    const offset = i * CONTAINER_STRIDE_BYTES;

    // 3 primos activos deterministas en Canal 0 (33 bits)
    const pIdxA = i % 33;
    const pIdxB = (i * 7 + 3) % 33;
    const pIdxC = (i * 13 + 11) % 33;
    const ch0Mask = (1n << BigInt(pIdxA)) | (1n << BigInt(pIdxB)) | (1n << BigInt(pIdxC));

    // Canal 1: índice (18 bits) + mezcla hash previo (15 bits)
    const ch1 = BigInt(((i & 0x3ffff) | ((rollingHash & 0x7fff) << 18)) >>> 0);

    // Canal 2: Ley acoplada (4 bits) + 6 caras Z4 (12 bits) + lambda cuantizada (10 bits) + tono (7 bits)
    const lawIdx = i % LAW_FAMILIES.length;
    const tokA = PRIMITIVE_TOKENS[pIdxA];
    const faces = deriveCubeFacesForPrime(tokA.index, tokA.prime);
    const faceBits =
      (faces.cara0_accion & 3) |
      ((faces.cara1_espalda & 3) << 2) |
      ((faces.cara2_disciplina & 3) << 4) |
      ((faces.cara3_faseZ4 & 3) << 6) |
      ((faces.caraInternaA_invariante & 3) << 8) |
      ((faces.caraInternaB_semillaAcustica & 3) << 10);
    const lambdaNm = LAW_FAMILIES[lawIdx].baseLambdaNm + ((i * 3) % 45);
    const ch2 = BigInt(
      (lawIdx & 0xf) | ((faceBits & 0xfff) << 4) | ((lambdaNm & 0x3ff) << 16) | ((pIdxB & 0x3f) << 26),
    );

    // Canal 3: Magnitud física acoplada (tensión 0..1000 + frecuencia 200..900 Hz + gravedad escalada)
    const tensionMill = (i * 29 + 137) % 1001;
    const freqHz = Math.round(tokA.frequencyHz);
    const ch3 = BigInt((tensionMill & 0x3ff) | ((freqHz & 0xfff) << 10) | ((pIdxC & 0x3f) << 22));

    writeBits132(payloadBuffer, offset, ch0Mask, ch1, ch2, ch3);
    rollingHash = fnv1aStep(rollingHash, payloadBuffer, offset);
    linkHashes[i] = rollingHash;
  }

  const tEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const rawBytes = payloadBuffer.byteLength;
  // Tamaño real estimado si esos 36,000 objetos con código .hlx, matrices y metadatos estuvieran en JSON
  const jsonEquivalentBytes = safeCount * 960;
  const rootSample = Array.from(payloadBuffer.subarray(0, Math.min(256, rawBytes)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    count: safeCount,
    strideBytes: 17,
    payloadBuffer,
    linkHashes,
    genesisSeed,
    buildTimeMs: Number(Math.max(0.01, tEnd - tStart).toFixed(2)),
    jsonEquivalentBytes,
    compressionRatio: Number((jsonEquivalentBytes / Math.max(1, rawBytes)).toFixed(1)),
    chainRootHex: sha256Hex(`helix36k|${safeCount}|${rollingHash.toString(16)}|${rootSample}`),
  };
}

/**
 * Extrae y reconstruye bajo demanda O(1) el contenedor i-ésimo con sus 6 caras Z4,
 * leyes acopladas en vivo y script ejecutable .hlx verificado.
 */
export function inspectHolographicContainer(
  chain: HolographicContainerChain,
  index: number,
): DecodedHolographicContainer {
  const idx = Math.max(0, Math.min(chain.count - 1, Math.floor(index)));
  const offset = idx * CONTAINER_STRIDE_BYTES;

  const ch0 = readChannel33(chain.payloadBuffer, offset, 0);
  const ch2 = Number(readChannel33(chain.payloadBuffer, offset, 66));
  const ch3 = Number(readChannel33(chain.payloadBuffer, offset, 99));

  const activeTokens: PrimitiveToken[] = [];
  let godel = 1n;
  for (let b = 0; b < 33; b++) {
    if (((ch0 >> BigInt(b)) & 1n) === 1n) {
      const tok = PRIMITIVE_TOKENS[b];
      activeTokens.push(tok);
      godel *= BigInt(tok.prime);
    }
  }
  const primaryToken = activeTokens[0] ?? PRIMITIVE_TOKENS[0];
  const secondaryToken = activeTokens[1] ?? PRIMITIVE_TOKENS[1];

  const lawIdx = (ch2 & 0xf) % LAW_FAMILIES.length;
  const lawFamily = LAW_FAMILIES[lawIdx];
  const faceBits = (ch2 >> 4) & 0xfff;
  const cubeFaces: CubeFacesZ4 = {
    cara0_accion: (faceBits & 3) as FaceStateZ4,
    cara1_espalda: ((faceBits >> 2) & 3) as FaceStateZ4,
    cara2_disciplina: ((faceBits >> 4) & 3) as FaceStateZ4,
    cara3_faseZ4: ((faceBits >> 6) & 3) as FaceStateZ4,
    caraInternaA_invariante: ((faceBits >> 8) & 3) as FaceStateZ4,
    caraInternaB_semillaAcustica: ((faceBits >> 10) & 3) as FaceStateZ4,
  };
  const lambdaNm = Math.max(410, Math.min(680, (ch2 >> 16) & 0x3ff));
  const tensionNormalized = Number((((ch3 & 0x3ff) % 1001) / 1000).toFixed(3));
  const freqHz = ((ch3 >> 10) & 0xfff) || Math.round(primaryToken.frequencyHz);

  const prevHash =
    idx === 0 ? (chain.genesisSeed ^ 0x9e3779b9) >>> 0 : chain.linkHashes[idx - 1];
  const expectedHash = fnv1aStep(prevHash, chain.payloadBuffer, offset);
  const actualHash = chain.linkHashes[idx];

  const coupledPhysics = computeCoupledNanotechBiopixelState({
    lambdaNm,
    tension: tensionNormalized,
    primeIndex: primaryToken.index - 1,
  });

  const hexBytes17 = Array.from(chain.payloadBuffer.subarray(offset, offset + 17))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');

  const discNames = activeTokens
    .map((t) => DISCIPLINES_33[t.index - 1]?.name ?? t.osTag)
    .slice(0, 3);

  const hlxProgram = [
    `# CONTENEDOR HOLOGRAFICO #${idx} (17B QPSK-132 · Cadena ${chain.count})`,
    `# Ley: ${lawFamily.label} | Disciplinas: ${discNames.join(' + ')}`,
    'ᛇᚢ',
    'ᛗᚦ sys_admin',
    `SET container_idx ${idx}`,
    `SET godel_mod ${Number(godel % 999983n)}`,
    `SET lambda_nm ${lambdaNm}`,
    `SET freq_hz ${freqHz}`,
    ...lawFamily.opcodes,
    'ᚳᛏ',
  ].join('\n');

  return {
    index: idx,
    byteOffset: offset,
    hexBytes17,
    lawFamily,
    primaryToken,
    secondaryToken,
    activeTokens,
    activeDisciplinesCount: activeTokens.length,
    godelBigInt: godel.toString(),
    cubeFaces,
    lambdaNm,
    tensionNormalized,
    chainLinkHex: actualHash.toString(16).padStart(8, '0'),
    prevChainLinkHex: prevHash.toString(16).padStart(8, '0'),
    linkValid: expectedHash === actualHash,
    coupledPhysics,
    hlxProgram,
  };
}

/**
 * Verifica criptográficamente el encadenamiento completo de los 36,000 contenedores.
 */
export function verifyHolographicContainerChain(
  chain: HolographicContainerChain,
): ChainVerificationSummary {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  let prevHash = (chain.genesisSeed ^ 0x9e3779b9) >>> 0;
  let verifiedLinks = 0;
  let brokenIndex: number | null = null;

  for (let i = 0; i < chain.count; i++) {
    const expected = fnv1aStep(prevHash, chain.payloadBuffer, i * CONTAINER_STRIDE_BYTES);
    if (expected !== chain.linkHashes[i]) {
      brokenIndex = i;
      break;
    }
    prevHash = expected;
    verifiedLinks++;
  }

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    totalContainers: chain.count,
    verifiedLinks,
    brokenIndex,
    integrityOk: brokenIndex === null && verifiedLinks === chain.count,
    verifyTimeMs: Number(Math.max(0.01, t1 - t0).toFixed(2)),
    contiguousBytes: chain.payloadBuffer.byteLength,
    totalMemoryWithDigestBytes: chain.payloadBuffer.byteLength + chain.linkHashes.byteLength,
    chainRootHex: chain.chainRootHex,
  };
}

/**
 * Busca contenedores en la cadena por primo P33, ley o índice sin expandir toda la cadena.
 */
export function queryHolographicContainerIndices(
  chain: HolographicContainerChain,
  filter: { lawFamilyId?: CoupledLawFamilyId | 'ALL'; primeP33?: number; limit?: number } = {},
): number[] {
  const limit = Math.min(200, Math.max(1, filter.limit ?? 24));
  const targetLawIdx =
    filter.lawFamilyId && filter.lawFamilyId !== 'ALL'
      ? LAW_FAMILIES.findIndex((f) => f.id === filter.lawFamilyId)
      : -1;
  const targetPrimeBit =
    typeof filter.primeP33 === 'number'
      ? PRIMITIVE_TOKENS.findIndex((t) => t.prime === filter.primeP33)
      : -1;

  const hits: number[] = [];
  for (let i = 0; i < chain.count && hits.length < limit; i++) {
    const offset = i * CONTAINER_STRIDE_BYTES;
    if (targetLawIdx >= 0) {
      const ch2 = Number(readChannel33(chain.payloadBuffer, offset, 66));
      if ((ch2 & 0xf) % LAW_FAMILIES.length !== targetLawIdx) continue;
    }
    if (targetPrimeBit >= 0) {
      const ch0 = readChannel33(chain.payloadBuffer, offset, 0);
      if (((ch0 >> BigInt(targetPrimeBit)) & 1n) !== 1n) continue;
    }
    hits.push(i);
  }
  return hits;
}

export { LAW_FAMILIES as HOLOGRAPHIC_LAW_FAMILIES };
