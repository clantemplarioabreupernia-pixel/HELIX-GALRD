import type { SoAHolographicBuffer } from './helixSignal';

/**
 * Constantes matemáticas exactas derivadas de ingeniería inversa geométrica:
 *  - φ = (1 + √5)/2: autovalor dominante de Fibonacci y número más irracional (Teorema de Hurwitz).
 *  - θ_g = 2π(1 - 1/φ) ≈ 137.507764°: ángulo áureo para muestreo S² de baja discrepancia.
 *  - η_A2 = π/(2√3) ≈ 0.9068997: densidad máxima de empaquetamiento de discos en R² (Thue-Tóth).
 *  - √3: razón exacta de la Vesica Piscis.
 */
export const GOLDEN_RATIO_PHI = (1 + Math.sqrt(5)) / 2;
export const GOLDEN_ANGLE_RAD = Math.PI * 2 * (1 - 1 / GOLDEN_RATIO_PHI);
export const GOLDEN_ANGLE_DEG = (GOLDEN_ANGLE_RAD * 180) / Math.PI;
export const A2_PACKING_DENSITY = Math.PI / (2 * Math.sqrt(3));
export const VESICA_SQRT3 = Math.sqrt(3);

export type HelixGeomTopology =
  | 'TORUS_T2'
  | 'ICOSAHEDRON'
  | 'DODECAHEDRON'
  | 'OCTAHEDRON'
  | 'CUBE'
  | 'TETRAHEDRON'
  | 'A2_HEX';

export type HelixGeomSampling =
  | 'PHI_FIBONACCI'
  | 'A2_HEX_VORONOI'
  | 'SCHLAFLI_GEODESIC';

export interface SchlafliTopologySpec {
  topology: HelixGeomTopology;
  schlafliSymbol: string;
  p: number;
  q: number;
  vertices: number;
  edges: number;
  faces: number;
  expectedEulerChi: number;
  symmetryGroup: string;
  singularityFreeFlow: boolean;
  manifoldClosed: boolean;
  shaderGeomMode: number;
  label: string;
}

export const HELIX_GEOM_TOPOLOGIES: Record<HelixGeomTopology, SchlafliTopologySpec> = {
  TORUS_T2: {
    topology: 'TORUS_T2',
    schlafliSymbol: '{4,4}_T2',
    p: 4,
    q: 4,
    vertices: 256,
    edges: 512,
    faces: 256,
    expectedEulerChi: 0,
    symmetryGroup: 'S1×S1 (T²)',
    singularityFreeFlow: true,
    manifoldClosed: true,
    shaderGeomMode: 1,
    label: 'Toroide compacto T² (χ=0, flujo sin polos)',
  },
  ICOSAHEDRON: {
    topology: 'ICOSAHEDRON',
    schlafliSymbol: '{3,5}',
    p: 3,
    q: 5,
    vertices: 12,
    edges: 30,
    faces: 20,
    expectedEulerChi: 2,
    symmetryGroup: 'Ih (A5×Z2)',
    singularityFreeFlow: false,
    manifoldClosed: true,
    shaderGeomMode: 2,
    label: 'Icosaedro geodésico {3,5} (χ=2, grupo Ih)',
  },
  DODECAHEDRON: {
    topology: 'DODECAHEDRON',
    schlafliSymbol: '{5,3}',
    p: 5,
    q: 3,
    vertices: 20,
    edges: 30,
    faces: 12,
    expectedEulerChi: 2,
    symmetryGroup: 'Ih (A5×Z2)',
    singularityFreeFlow: false,
    manifoldClosed: true,
    shaderGeomMode: 2,
    label: 'Dodecaedro regular {5,3} (χ=2, dual Ih)',
  },
  OCTAHEDRON: {
    topology: 'OCTAHEDRON',
    schlafliSymbol: '{3,4}',
    p: 3,
    q: 4,
    vertices: 6,
    edges: 12,
    faces: 8,
    expectedEulerChi: 2,
    symmetryGroup: 'Oh (S4×Z2)',
    singularityFreeFlow: false,
    manifoldClosed: true,
    shaderGeomMode: 2,
    label: 'Octaedro regular {3,4} (χ=2, grupo Oh)',
  },
  CUBE: {
    topology: 'CUBE',
    schlafliSymbol: '{4,3}',
    p: 4,
    q: 3,
    vertices: 8,
    edges: 12,
    faces: 6,
    expectedEulerChi: 2,
    symmetryGroup: 'Oh (S4×Z2)',
    singularityFreeFlow: false,
    manifoldClosed: true,
    shaderGeomMode: 2,
    label: 'Hexaedro / Cubo {4,3} (χ=2, grupo Oh)',
  },
  TETRAHEDRON: {
    topology: 'TETRAHEDRON',
    schlafliSymbol: '{3,3}',
    p: 3,
    q: 3,
    vertices: 4,
    edges: 6,
    faces: 4,
    expectedEulerChi: 2,
    symmetryGroup: 'Td (A4)',
    singularityFreeFlow: false,
    manifoldClosed: true,
    shaderGeomMode: 2,
    label: 'Tetraedro simplex {3,3} (χ=2, autodual A4)',
  },
  A2_HEX: {
    topology: 'A2_HEX',
    schlafliSymbol: '{6,3}',
    p: 6,
    q: 3,
    vertices: 54,
    edges: 72,
    faces: 19,
    expectedEulerChi: 1,
    symmetryGroup: 'p6m (Red A₂)',
    singularityFreeFlow: true,
    manifoldClosed: false,
    shaderGeomMode: 2,
    label: 'Retícula hexagonal A₂ / Dual Voronoi (η=90.69%)',
  },
};

export const VALID_GEOM_TOPOLOGIES = new Set<string>(Object.keys(HELIX_GEOM_TOPOLOGIES));
export const VALID_GEOM_SAMPLINGS = new Set<string>([
  'PHI_FIBONACCI',
  'A2_HEX_VORONOI',
  'SCHLAFLI_GEODESIC',
]);

export interface GeomSealReport {
  valid: boolean;
  topology: HelixGeomTopology;
  sampling: HelixGeomSampling;
  schlafliSymbol: string;
  symmetryGroup: string;
  eulerChi: number;
  expectedEulerChi: number;
  vertices: number;
  edges: number;
  faces: number;
  packingDensity: number;
  goldenAngleDeg: number;
  wavenumberK: number;
  dominantBesselMode: number;
  singularityFreeFlow: boolean;
  manifoldClosed: boolean;
  shaderGeomMode: number;
  reason: string;
}

export interface HexLatticePoint2D {
  q: number;
  r: number;
  x: number;
  y: number;
}

/**
 * Genera el empaquetamiento hexagonal óptimo A₂ (densidad η = π/(2√3) ≈ 90.69%)
 * con paso unitario entre centros vecinos.
 */
export function generateHexLatticeA2(rings = 2, spacing = 1.0): HexLatticePoint2D[] {
  const pts: HexLatticePoint2D[] = [];
  const safeRings = Math.max(0, Math.min(8, Math.floor(rings)));
  for (let q = -safeRings; q <= safeRings; q++) {
    const rMin = Math.max(-safeRings, -q - safeRings);
    const rMax = Math.min(safeRings, -q + safeRings);
    for (let r = rMin; r <= rMax; r++) {
      const x = spacing * (q + r * 0.5);
      const y = spacing * ((VESICA_SQRT3 / 2) * r);
      pts.push({ q, r, x, y });
    }
  }
  return pts;
}

export interface FibonacciPoint3D {
  index: number;
  x: number;
  y: number;
  z: number;
  theta: number;
  phi: number;
}

/**
 * Distribución Fibonacci en la esfera S² mediante el ángulo áureo θ_g ≈ 137.508°
 * para muestreo casi uniforme sin acumulación de vértices en los polos.
 */
export function generateFibonacciSpherePoints(
  count: number,
  radius = 1.0,
): FibonacciPoint3D[] {
  const n = Math.max(1, Math.min(4096, Math.floor(count)));
  const pts: FibonacciPoint3D[] = [];
  for (let i = 0; i < n; i++) {
    const yNorm = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
    const radial = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
    const theta = i * GOLDEN_ANGLE_RAD;
    const x = Math.cos(theta) * radial * radius;
    const y = yNorm * radius;
    const z = Math.sin(theta) * radial * radius;
    const phi = Math.acos(Math.max(-1, Math.min(1, yNorm)));
    pts.push({ index: i, x, y, z, theta, phi });
  }
  return pts;
}

/**
 * Evalúa la función de Bessel de primera especie J_m(x) por serie de potencias truncada.
 * Permite calcular modos nodales exactos de Helmholtz / cimática sobre discos y mallas.
 */
export function besselJ(m: number, x: number): number {
  const order = Math.max(0, Math.min(8, Math.floor(Math.abs(m))));
  const halfX = x * 0.5;
  let term = 1;
  let factM = 1;
  for (let i = 2; i <= order; i++) factM *= i;
  term = Math.pow(halfX, order) / factM;

  let sum = term;
  const negQuarterX2 = -halfX * halfX;
  for (let k = 1; k <= 14; k++) {
    term *= negQuarterX2 / (k * (k + order));
    sum += term;
    if (Math.abs(term) < 1e-10) break;
  }
  return sum;
}

/**
 * Modo propio nodal de la ecuación de Helmholtz (∇²u + k²u = 0) en coordenadas polares:
 *   u(r, θ) = J_m(k·r) · cos(m·θ)
 */
export function evaluateHelmholtzCymaticNode(
  rNorm: number,
  thetaRad: number,
  freqHz: number,
  mMode = 3,
): { wavenumberK: number; amplitude: number } {
  const safeHz = Math.max(110, Math.min(2400, freqHz));
  const wavenumberK = Number(((2 * Math.PI * safeHz) / 457.84).toFixed(4));
  const radial = Math.max(0, Math.min(1.5, rNorm));
  const m = Math.max(1, Math.min(7, Math.floor(mMode)));
  const amplitude = besselJ(m, wavenumberK * radial) * Math.cos(m * thetaRad);
  return { wavenumberK, amplitude };
}

/**
 * Evalúa la invariante topológica de Euler (χ = V - E + F) y la condición angular de Schläfli.
 */
export function evaluateSchlafliEuler(
  topology: HelixGeomTopology,
  subdivision = 1,
): {
  vertices: number;
  edges: number;
  faces: number;
  eulerChi: number;
  expectedChi: number;
  angularDefectValid: boolean;
  valid: boolean;
} {
  const spec = HELIX_GEOM_TOPOLOGIES[topology];
  const s = Math.max(1, Math.min(4, Math.floor(subdivision)));

  let vertices = spec.vertices;
  let edges = spec.edges;
  let faces = spec.faces;

  if (topology === 'TORUS_T2') {
    const grid = 8 * s;
    vertices = grid * grid;
    faces = grid * grid;
    edges = 2 * grid * grid;
  } else if (spec.p === 3 && s > 1) {
    // Subdivisión triangular preservando χ = 2 exactamente
    const factor = s * s;
    faces = spec.faces * factor;
    edges = (3 * faces) / 2;
    vertices = spec.expectedEulerChi - faces + edges;
  }

  const eulerChi = vertices - edges + faces;
  const angularDefectValid =
    topology === 'TORUS_T2'
      ? 1 / spec.p + 1 / spec.q === 0.5
      : topology === 'A2_HEX'
        ? 1 / spec.p + 1 / spec.q === 0.5
        : 1 / spec.p + 1 / spec.q > 0.5;

  return {
    vertices,
    edges,
    faces,
    eulerChi,
    expectedChi: spec.expectedEulerChi,
    angularDefectValid,
    valid: eulerChi === spec.expectedEulerChi && angularDefectValid,
  };
}

/**
 * Ejecuta la auditoría del sello geométrico universal `GEOM_SEAL` sobre una topología,
 * un esquema de muestreo y una frecuencia cymática 29-EDO.
 */
export function evaluateGeomSeal(
  topologyRaw = 'TORUS_T2',
  samplingRaw = 'PHI_FIBONACCI',
  freqHz = 457.84,
  subdivision = 1,
): GeomSealReport {
  const topoNorm = topologyRaw.trim().toUpperCase();
  const sampNorm = samplingRaw.trim().toUpperCase();

  if (!VALID_GEOM_TOPOLOGIES.has(topoNorm)) {
    return {
      valid: false,
      topology: 'TORUS_T2',
      sampling: 'PHI_FIBONACCI',
      schlafliSymbol: 'INVALID',
      symmetryGroup: 'N/A',
      eulerChi: -999,
      expectedEulerChi: 0,
      vertices: 0,
      edges: 0,
      faces: 0,
      packingDensity: A2_PACKING_DENSITY,
      goldenAngleDeg: GOLDEN_ANGLE_DEG,
      wavenumberK: 0,
      dominantBesselMode: 3,
      singularityFreeFlow: false,
      manifoldClosed: false,
      shaderGeomMode: 0,
      reason: `Topología "${topologyRaw}" fuera del catálogo Schläfli/T²/A₂ permitido.`,
    };
  }

  const resolvedSampling: HelixGeomSampling = VALID_GEOM_SAMPLINGS.has(sampNorm)
    ? (sampNorm as HelixGeomSampling)
    : 'PHI_FIBONACCI';

  if (sampNorm && !VALID_GEOM_SAMPLINGS.has(sampNorm)) {
    return {
      valid: false,
      topology: topoNorm as HelixGeomTopology,
      sampling: 'PHI_FIBONACCI',
      schlafliSymbol: HELIX_GEOM_TOPOLOGIES[topoNorm as HelixGeomTopology].schlafliSymbol,
      symmetryGroup: HELIX_GEOM_TOPOLOGIES[topoNorm as HelixGeomTopology].symmetryGroup,
      eulerChi: -999,
      expectedEulerChi: HELIX_GEOM_TOPOLOGIES[topoNorm as HelixGeomTopology].expectedEulerChi,
      vertices: 0,
      edges: 0,
      faces: 0,
      packingDensity: A2_PACKING_DENSITY,
      goldenAngleDeg: GOLDEN_ANGLE_DEG,
      wavenumberK: 0,
      dominantBesselMode: 3,
      singularityFreeFlow: false,
      manifoldClosed: false,
      shaderGeomMode: 0,
      reason: `Esquema de muestreo "${samplingRaw}" inválido (use PHI_FIBONACCI, A2_HEX_VORONOI o SCHLAFLI_GEODESIC).`,
    };
  }

  const topology = topoNorm as HelixGeomTopology;
  const spec = HELIX_GEOM_TOPOLOGIES[topology];
  const euler = evaluateSchlafliEuler(topology, subdivision);
  const dominantBesselMode = spec.p >= 3 && spec.p <= 6 ? spec.p : 3;
  const helm = evaluateHelmholtzCymaticNode(0.65, GOLDEN_ANGLE_RAD, freqHz, dominantBesselMode);

  return {
    valid: euler.valid,
    topology,
    sampling: resolvedSampling,
    schlafliSymbol: spec.schlafliSymbol,
    symmetryGroup: spec.symmetryGroup,
    eulerChi: euler.eulerChi,
    expectedEulerChi: euler.expectedChi,
    vertices: euler.vertices,
    edges: euler.edges,
    faces: euler.faces,
    packingDensity: A2_PACKING_DENSITY,
    goldenAngleDeg: GOLDEN_ANGLE_DEG,
    wavenumberK: helm.wavenumberK,
    dominantBesselMode,
    singularityFreeFlow: spec.singularityFreeFlow,
    manifoldClosed: spec.manifoldClosed,
    shaderGeomMode: spec.shaderGeomMode,
    reason: euler.valid
      ? `${spec.label} · χ=${euler.eulerChi} · V=${euler.vertices}/E=${euler.edges}/F=${euler.faces} · k=${helm.wavenumberK}`
      : `Invariante Euler violado: χ=${euler.eulerChi} ≠ ${euler.expectedChi}`,
  };
}

/**
 * Alinea las celdas contiguas Pauli-SoA con la variedad geométrica sellada
 * (Fibonacci S², Toroide T² o Red Hexagonal A₂) sin asignaciones dinámicas.
 */
export function applyGeomSealToSoA(
  soa: SoAHolographicBuffer,
  report: GeomSealReport,
): void {
  const n = soa.capacity;
  if (n <= 0) return;

  if (report.sampling === 'A2_HEX_VORONOI' || report.topology === 'A2_HEX') {
    const pts = generateHexLatticeA2(Math.max(1, Math.ceil(Math.sqrt(n) * 0.55)), 0.28);
    for (let i = 0; i < n; i++) {
      const pt = pts[i % pts.length];
      const rNorm = Math.min(1.0, Math.hypot(pt.x, pt.y));
      const theta = Math.atan2(pt.y, pt.x);
      const helm = evaluateHelmholtzCymaticNode(
        rNorm,
        theta,
        (report.wavenumberK * 457.84) / (2 * Math.PI),
        report.dominantBesselMode,
      );
      soa.x[i] = pt.x;
      soa.y[i] = helm.amplitude * 0.18;
      soa.z[i] = pt.y;
    }
    return;
  }

  if (report.topology === 'TORUS_T2') {
    const majorR = 0.72;
    const minorR = 0.26;
    for (let i = 0; i < n; i++) {
      const u = i * GOLDEN_ANGLE_RAD;
      const v = (i / Math.max(1, n)) * Math.PI * 2 * GOLDEN_RATIO_PHI;
      const ring = majorR + minorR * Math.cos(v);
      soa.x[i] = ring * Math.cos(u);
      soa.y[i] = minorR * Math.sin(v);
      soa.z[i] = ring * Math.sin(u);
    }
    return;
  }

  const fib = generateFibonacciSpherePoints(n, 0.72);
  for (let i = 0; i < n; i++) {
    soa.x[i] = fib[i].x;
    soa.y[i] = fib[i].y;
    soa.z[i] = fib[i].z;
  }
}
