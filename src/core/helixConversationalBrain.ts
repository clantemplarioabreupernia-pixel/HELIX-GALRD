import { parseStoryIntoMusicalScore, StorySceneCue } from './helixStoryScoreEngine';
import { analyzeVocalAndTextProsody } from '../utils/auroraProsody';
import { DISCIPLINES_33 } from '../data/disciplines33';
import { DOMAIN_ENGINE_METADATA } from './helixDomainEngines';
import type { HelixCoreEngine } from './HelixCoreEngine';
import type { EngineeringReport } from './helixPlanner';
import { BASE_HELIX_TOOL_CATALOG, HelixRegisteredTool } from './helixToolCatalog159';

export type ConversationalIntentKind =
  | 'greeting'
  | 'identity'
  | 'tools_inventory'
  | 'disciplines_inventory'
  | 'engines_inventory'
  | 'architecture_explain'
  | 'capabilities'
  | 'learning'
  | 'gratitude'
  | 'feedback'
  | 'creation_or_simulation'
  | 'open_chat';

export interface ChatTurnSummary {
  role: 'user' | 'assistant';
  text: string;
}

export interface ConversationTurnContext {
  engine?: HelixCoreEngine;
  report?: EngineeringReport;
  history?: ChatTurnSummary[];
  previousIntent?: string;
  userName?: string;
  turnCount?: number;
  confirmed?: boolean;
}

const ACTION_CREATION_RE =
  /\b(crea|crear|creame|créame|simul|calcul|diseñ|disen|construy|genera|haz|hagam|esculp|proyecta|cambia|cambialo|cámbialo|ajusta|ponle|agrega|añade|combina|mezcla|mueve|anima|dibuja|modela|transforma|deforma|ejecuta|prueba|escanea|escanear|cuento|historia|relato|bosque|lobo|caperucita|castillo|mar|olas|videojuego|juego|nave|espaci|gravedad|asteroide|enemigo|obst[aá]culo|velocidad|color|brillo|órbita|orbita|cohete|satelit|planeta|luna|marte|martes|radar|montaña|montana|terreno|fluido|onda|cuántic|cuantic|videoclip|música|musica|balance|financier|saldo|quimic|químic|molecul|molécul|reaccion|reacción|nernst|gibbs|morse|imagen|foto|laboratorio)\b/i;

const PHYSICAL_VALUE_RE =
  /\b\d+(?:[.,]\d+)?\s*(?:km|m\/s|hz|ghz|mpa|kg|fps|qubits?|bpm|lpm|mg\/dl|mmhg|°c|\$|usd)\b/i;

const INVENTORY_VERB_RE =
  /\b(lista|listar|listame|enumera|enumerar|muestra|muestrame|dime|dame|cuales|que|todas|todos|catalogo|inventario|revisa|revisar|audita|auditar|verifica|verificar|inspecciona|analiza)\b/;

const TOOLS_NOUN_RE =
  /\b(herramienta|herramientas|erramienta|erramientas|funcion|funciones|funsion|funsiones|modulo|modulos|capacidad|capacidades|comando|comandos|utilidad|utilidades)\b/;

function normalizeEs(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\berramienta(s)?\b/g, 'herramienta$1')
    .replace(/\bfunsion(es)?\b/g, 'funcion$1')
    .replace(/\bdesiplina(s)?\b/g, 'disciplina$1')
    .replace(/\bcuantiqu(a|o)\b/g, 'cuantic$1').replace(/quieroqprender|quieroaprender/g, 'quiero aprender')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determina si el mensaje del usuario pide crear, simular, calcular o transformar
 * la pantalla líquida, o si es una conversación/consulta directa.
 */
export function isActionOrCreationIntent(raw: string): boolean {
  const norm = normalizeEs(raw);
  if (!norm) return false;

  // Preguntas de inventario o explicación ("puedes listar...", "qué herramientas...", "qué es...")
  // deben responderse informativamente sin disparar modo creación genérico.
  if (
    (INVENTORY_VERB_RE.test(norm) &&
      (TOOLS_NOUN_RE.test(norm) ||
        /\b(disciplina|disciplinas|motor|motores|area|areas|ciencia|ciencias)\b/.test(norm))) ||
    /^(como|que|cual|cuales|quien|para\s+que|puedes\s+(explicar|listar|mostrar|decir)|explica|explicame)\b/.test(
      norm,
    )
  ) {
    return false;
  }

  if (PHYSICAL_VALUE_RE.test(raw) || ACTION_CREATION_RE.test(raw)) {
    return true;
  }
  return false;
}

export function classifyConversationIntent(raw: string): ConversationalIntentKind {
  const norm = normalizeEs(raw);
  if (!norm) return 'open_chat';

  if (
    /\b(como te llamas|cual es tu nombre|tu nombre|quien eres|que eres|who are you|what is your name)\b/.test(
      norm,
    )
  ) {
    return 'identity';
  }

  if (
    /\b(disciplina|disciplinas|materia|materias|facultad|facultades)\b/.test(norm) &&
    /\b(lista|listar|cuales|todas|que|muestra|ver|33|tienes|conoces)\b/.test(norm)
  ) {
    return 'disciplines_inventory';
  }

  if (
    /\b(motor|motores|ecuacion|ecuaciones)\b/.test(norm) &&
    /\b(lista|listar|cuales|todos|que|muestra|ver|tienes|usas|matematico|matematicos)\b/.test(norm)
  ) {
    return 'engines_inventory';
  }

  if (
    TOOLS_NOUN_RE.test(norm) &&
    (INVENTORY_VERB_RE.test(norm) || /\b(tienes|disponibles|haces|ofreces)\b/.test(norm))
  ) {
    return 'tools_inventory';
  }

  if (
    /\b(doble helice|recombinador|biblioteca|17\s*bytes|17b|qpsk|aduana|pcc|minigpt|mini-gpt|exocortex|pantalla liquida|36000|contenedores|biopixel|nanotec|6 caras)\b/.test(
      norm,
    )
  ) {
    return 'architecture_explain';
  }

  if (
    /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|saludos|que tal|como estas|hello|hi)\b/.test(
      norm,
    ) &&
    !ACTION_CREATION_RE.test(raw) &&
    !TOOLS_NOUN_RE.test(norm)
  ) {
    return 'greeting';
  }

  if (
    /\b(que puedes hacer|como funciona|para que sirves|ayuda|what can you do|que sabes hacer)\b/.test(
      norm,
    )
  ) {
    return 'capabilities';
  }

  if (/\b(aprender|ensena|ensenar|explica|explicame|por que)\b/.test(norm)) {
    return 'learning';
  }

  if (/^(gracias|muchas gracias|genial|excelente|super|me encanta|perfecto|thanks)\b/.test(norm)) {
    return 'gratitude';
  }

  if (isActionOrCreationIntent(raw)) {
    return 'creation_or_simulation';
  }

  if (/\b(opinas|crees|ves|parece|entiendes|verdad|cierto)\b/.test(norm)) {
    return 'feedback';
  }

  return 'open_chat';
}

function getLiveTools(context: ConversationTurnContext): HelixRegisteredTool[] {
  if (context.engine) {
    return context.engine.getRegisteredTools();
  }
  return [...BASE_HELIX_TOOL_CATALOG];
}

function extractDomainFilterFromQuery(
  raw: string,
  tools: HelixRegisteredTool[],
): string | null {
  const norm = normalizeEs(raw);
  const domains = Array.from(new Set(tools.map((t) => t.domain)));

  for (const domain of domains) {
    const dNorm = normalizeEs(domain);
    const words = dNorm.split(/\s+/).filter((w) => w.length >= 4 && w !== 'para');
    if (words.some((w) => norm.includes(w))) {
      return domain;
    }
  }

  if (/\b(dinero|banco|economi|contab|cripto|merkle|pago|saldo)\b/.test(norm)) {
    return 'Finanzas y Criptografía';
  }
  if (/\b(espaci|orbit|cohete|satel|kepler|gravit|planeta|astro)\b/.test(norm)) {
    return 'Espacio y Gravitación';
  }
  if (/\b(5g|radar|telecom|antena|fmcw|satelit|rf|senal)\b/.test(norm)) {
    return 'Telecomunicaciones y RF';
  }
  if (/\b(cuantic|qubit|bloch|qasm|entrelaz)\b/.test(norm)) {
    return 'Computación Cuántica';
  }
  if (/\b(audio|voz|musica|sonido|cine|video|camara|cimatic)\b/.test(norm)) {
    return 'Cinematografía y Audio';
  }
  if (/\b(fluido|optica|luz|tensor|cauchy|materia|biopixel)\b/.test(norm)) {
    return 'Materia Digital y Fluidos';
  }
  if (/\b(juego|videojuego|terreno|montana|colision|mundo)\b/.test(norm)) {
    return 'Videojuegos y Mundos 3D';
  }
  if (/\b(seguridad|formal|smt|contrato|verificacion)\b/.test(norm)) {
    return 'Verificación Formal y Seguridad';
  }
  if (/\b(topologia|geometria|toroide|euler|fibonacci)\b/.test(norm)) {
    return 'Topología y Cimática';
  }
  if (/\b(ia|inteligencia|optimiz|recocido|minigpt|orquestacion)\b/.test(norm)) {
    return 'IA Acotada y Orquestación';
  }
  if (/\b(quimic|molecul|nernst|gibbs|arrhenius|morse|termodinamica|reaccion|ph)\b/.test(norm)) {
    return 'Química y Termodinámica';
  }

  return null;
}

function searchMatchingKnowledge(
  raw: string,
  tools: HelixRegisteredTool[],
): {
  matchedTools: HelixRegisteredTool[];
  matchedDisciplines: typeof DISCIPLINES_33[number][];
  matchedEngines: [string, (typeof DOMAIN_ENGINE_METADATA)[keyof typeof DOMAIN_ENGINE_METADATA]][];
} {
  const stopWords = new Set([
    'para',
    'como',
    'cual',
    'cuales',
    'puedes',
    'quiero',
    'tienes',
    'sobre',
    'todas',
    'todos',
    'lista',
    'listar',
    'dime',
    'explica',
    'muestra',
    'herramientas',
    'funciones',
    'helix',
    'esta',
    'este',
    'esto',
    'hacer',
    'algo',
  ]);
  const tokens = normalizeEs(raw)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  if (tokens.length === 0) {
    return { matchedTools: [], matchedDisciplines: [], matchedEngines: [] };
  }

  const matchedTools = tools
    .map((tool) => {
      const hay = normalizeEs(
        `${tool.title} ${tool.domain} ${tool.formulaSummary} ${tool.keywords.join(' ')}`,
      );
      const score = tokens.reduce((acc, tok) => (hay.includes(tok) ? acc + 1 : acc), 0);
      return { tool, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((x) => x.tool);

  const matchedDisciplines = DISCIPLINES_33.map((d) => {
    const hay = normalizeEs(`${d.name} ${d.faculty} ${d.canonicalEquation} ${d.keywords.join(' ')}`);
    const score = tokens.reduce((acc, tok) => (hay.includes(tok) ? acc + 1 : acc), 0);
    return { d, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.d);

  const matchedEngines = Object.entries(DOMAIN_ENGINE_METADATA)
    .map(([id, meta]) => {
      const hay = normalizeEs(`${meta.label} ${meta.discipline} ${meta.formulaSummary}`);
      const score = tokens.reduce((acc, tok) => (hay.includes(tok) ? acc + 1 : acc), 0);
      return { pair: [id, meta] as [string, typeof meta], score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.pair);

  return { matchedTools, matchedDisciplines, matchedEngines };
}

function formatDomainToolList(domain: string, tools: HelixRegisteredTool[]): string {
  const domainTools = tools.filter((t) => t.domain === domain);
  const preview = domainTools.slice(0, 12);
  const lines = preview.map((t, i) => `${i + 1}. ${t.title} — ${t.formulaSummary}`);
  const remaining = domainTools.length - preview.length;
  const tail =
    remaining > 0
      ? `\n...y ${remaining} herramientas adicionales en esta área. Dime cuál quieres probar o combinar.`
      : '\nDime cuál de estas herramientas quieres ejecutar, explicar o combinar.';

  return `En ${domain} cuento con ${domainTools.length} herramientas activas:\n${lines.join('\n')}${tail}`;
}

function formatFullInventory(context: ConversationTurnContext): string {
  const tools = getLiveTools(context);
  const disciplines = context.engine ? context.engine.getDisciplines33() : DISCIPLINES_33;
  const enginesCount = Object.keys(DOMAIN_ENGINE_METADATA).length;

  const requestedDomain = context.previousIntent
    ? extractDomainFilterFromQuery(context.previousIntent, tools)
    : null;
  if (requestedDomain) {
    return formatDomainToolList(requestedDomain, tools);
  }

  const byDomain = new Map<string, HelixRegisteredTool[]>();
  for (const t of tools) {
    const arr = byDomain.get(t.domain) ?? [];
    arr.push(t);
    byDomain.set(t.domain, arr);
  }

  const domainLines = Array.from(byDomain.entries()).map(([domain, list]) => {
    const examples = list
      .slice(0, 3)
      .map((t) => t.title)
      .join(', ');
    return `• ${domain} (${list.length}): ${examples}`;
  });

  return [
    `Tengo integradas ${tools.length} herramientas ejecutables, ${enginesCount} motores matemáticos verificados y ${disciplines.length} disciplinas académicas.`,
    '',
    'Mis funciones principales:',
    '1. Conversar contigo y moldear la pantalla líquida 4K UHD (8.29M biopíxeles) en Educación, Investigación y Entretenimiento.',
    '2. Calcular y simular física orbital, fluidos Pauli-SoA, óptica Cauchy, química cuántica, RF 5G/radar, cuántica Bloch y finanzas exactas.',
    '3. Descomponer programas .hlx en átomos verificables y recombinar herramientas (A×B) con puentes tipados, SMT y PCC SHA-256.',
    '4. Aprender de cada sesión certificada mediante cápsulas holográficas de 17 bytes y 36,000 contenedores.',
    '',
    'Áreas y herramientas disponibles:',
    ...domainLines,
    '',
    'Pídeme el detalle de cualquier área (por ejemplo: "herramientas de Finanzas", "herramientas de Espacio") o dime qué quieres simular o combinar.',
  ].join('\n');
}

function formatDisciplinesInventory(context: ConversationTurnContext): string {
  const disciplines = context.engine ? context.engine.getDisciplines33() : DISCIPLINES_33;
  const byFaculty = new Map<string, string[]>();
  for (const d of disciplines) {
    const arr = byFaculty.get(d.faculty) ?? [];
    arr.push(d.name);
    byFaculty.set(d.faculty, arr);
  }
  const lines = Array.from(byFaculty.entries()).map(
    ([faculty, names]) => `• ${faculty}: ${names.join(', ')}`,
  );
  return [
    `Trabajo sobre ${disciplines.length} disciplinas científicas y universitarias conectadas a mis motores:`,
    ...lines,
    '',
    'Si quieres explorar las ecuaciones de alguna disciplina o combinar dos de ellas, solo dímelo.',
  ].join('\n');
}

function formatEnginesInventory(): string {
  const entries = Object.values(DOMAIN_ENGINE_METADATA);
  const lines = entries.map((m, idx) => `${idx + 1}. ${m.label} (${m.discipline})`);
  return [
    `Cuento con ${entries.length} motores matemáticos reales en ejecución:`,
    ...lines,
    '',
    'Pídeme simular cualquiera de ellos con tus propios datos (altitud, frecuencia, monto o velocidad) y te muestro los resultados.',
  ].join('\n');
}

function summarizeTopOutputs(report?: EngineeringReport): string {
  if (!report || report.dataOutputs.length === 0) return '';
  const top = report.dataOutputs
    .slice(0, 3)
    .map((d) => `${d.label}: ${d.value}`)
    .join(' · ');
  return top ? ` (${top})` : '';
}

/**
 * Extrae una versión breve y hablada (sin listados largos) para la síntesis Web Speech.
 */
export function toSpokenSummary(replyText: string): string {
  const firstPara = replyText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' ');
  return firstPara.slice(0, 240);
}

/**
 * Motor conversacional humano de Helix conectado directamente al catálogo vivo,
 * las 33 disciplinas, los 21 motores matemáticos y el historial reciente.
 */
export function buildHumanConversationReply(
  raw: string,
  shapeLabel: string,
  _engineCount: number,
  isAction: boolean,
  context: ConversationTurnContext = {},
): string {
  const _prosody = analyzeVocalAndTextProsody(raw, 0, 0.05);
  const _lead = _prosody.mood === 'worried' ? _prosody.empathyPrefix : '';
  const norm = normalizeEs(raw);
  const tools = getLiveTools(context);
  const en =
    /\b(hello|hi|what|who|how|learn|teach|create|thanks|your name|spaceship|game|tools|list)\b/.test(
      norm,
    ) && !/\b(hola|quiero|como|crear|naves|juego|pantalla|gracias|herramienta|funcion|lista)\b/.test(norm);

  const kind = isAction ? 'creation_or_simulation' : classifyConversationIntent(raw);
  const report = context.report;
  const outputHint = summarizeTopOutputs(report);

  // 1. Consulta filtrada por dominio específico ("muéstrame las de finanzas", "herramientas de espacio")
  const explicitDomain = extractDomainFilterFromQuery(raw, tools);
  if (
    explicitDomain &&
    (kind === 'tools_inventory' ||
      kind === 'capabilities' ||
      kind === 'learning' ||
      INVENTORY_VERB_RE.test(norm) ||
      TOOLS_NOUN_RE.test(norm))
  ) {
    return formatDomainToolList(explicitDomain, tools);
  }

  if (kind === 'tools_inventory') {
    return formatFullInventory({ ...context, previousIntent: raw });
  }

  if (kind === 'disciplines_inventory') {
    return formatDisciplinesInventory(context);
  }

  if (kind === 'engines_inventory') {
    return formatEnginesInventory();
  }

  if (kind === 'architecture_explain') {
    return (
      _lead +
      'Todo el núcleo determinista de HELIX corre en esta consola híbrida autárquica sin depender de la nube: Pauli-SoA de 28 bytes/biopíxel (4K UHD), 36,000 contenedores holográficos, 23 motores matemáticos/físicos/químicos/cuánticos, raymarching SDF, red hexagonal Voronoi A₂ y descomposición/recombinación autopoiética de ADN (.hlx).'
    );
  }

  if (kind === 'identity') {
    const alsoGreeting = /\b(hola|buenas|hey|hello|hi)\b/.test(norm);
    if (en) {
      return `${_lead}${alsoGreeting ? 'Hello! ' : ''}I am Helix, your universal science, research, and entertainment console. Ask me anything and watch the 4K liquid biopixels transform live.`;
    }
    return `${_lead}${alsoGreeting ? '¡Hola! ' : ''}Soy Helix, tu consola universal de educación, investigación y entretenimiento para la Tierra, la Luna o Marte. Puedo explicar cualquier ley científica, descomponer y recombinar herramientas con su ADN y transformar esta pantalla líquida 4K en tiempo real. ¿Qué quieres descubrir?`;
  }

  if (kind === 'greeting') {
    if (en) {
      return _lead + 'Hello! Tell me what you want to explore — molecules, a trip to the Moon, 3D geometry, or interactive stories — and I will shape the 4K screen live.';
    }
    return _lead + '¡Hola! Qué alegría verte. Dime qué quieres explorar hoy —una molécula química, una nave hacia la Luna, geometría SDF en 3D, ondas cuánticas o un cuento interactivo— y lo formo en vivo en los biopíxeles 4K.';
  }

  if (kind === 'capabilities') {
    if (en) {
      return `${_lead}I combine Education, Research, and Entertainment in one 4K liquid screen: orbital flight games, chemistry thermodynamics, quantum Bloch spheres, story-to-math scanning, and an interactive DNA tool recombinator.`;
    }
    return `${_lead}Sirvo como una consola universal de Educación, Investigación y Entretenimiento: puedes explorar moléculas y reacciones químicas, pilotar una nave orbital con W/A/S/D, probar geometría raymarched SDF + red hexagonal A₂, escanear cuentos en partituras 3D o abrir la pestaña ADN / Lab para descomponer código y recombinar cualquiera de las 190+ herramientas en vivo.`;
  }

  if (kind === 'gratitude') {
    return en
      ? 'You are welcome! What shall we morph on the screen next?'
      : '¡Con mucho gusto! ¿Qué quieres que transformemos ahora en la pantalla?';
  }

  if (kind === 'creation_or_simulation') {
    const isSpace = /\b(nave|espaci|orbit|órbita|luna|marte|planeta|cohete|satel)\b/.test(norm);
    const controlHint = isSpace
      ? ' Puedes girar la escena con el ratón y pilotar la nave con las teclas W, A, S, D.'
      : ' Puedes rotar y acercar el modelo 3D directamente en la pantalla líquida.';
    const metricsHint = outputHint ? ` Datos vivos en este instante${outputHint}.` : '';

    return `${_lead}Transformé la materia de la pantalla en «${shapeLabel}» en tiempo real.${metricsHint}${controlHint} Dime qué parte quieres cambiar, acelerar o investigar.`;
  }

  // 2. Seguimiento contextual ("más detalles", "y las demás?", "continúa")
  if (
    /\b(mas detalles|profundiza|continua|sigue|demas|otras|mas sobre eso|explicalo mejor)\b/.test(
      norm,
    ) &&
    context.history &&
    context.history.length > 0
  ) {
    const lastTopic = [...context.history]
      .reverse()
      .find((m) => m.role === 'user' && m.text.trim() !== raw.trim())?.text;
    if (lastTopic) {
      const dom = extractDomainFilterFromQuery(lastTopic, tools);
      if (dom) return formatDomainToolList(dom, tools);
      const { matchedTools } = searchMatchingKnowledge(lastTopic, tools);
      if (matchedTools.length > 0) {
        return `${_lead}Sobre tu consulta anterior, estas son las herramientas relacionadas más relevantes:\n${matchedTools
          .slice(0, 5)
          .map((t, i) => `${i + 1}. ${t.title} (${t.domain}): ${t.formulaSummary}`)
          .join('\n')}`;
      }
    }
  }

  // 3. Búsqueda semántica real sobre catálogo, 33 disciplinas y motores antes de caer en charla abierta
  const { matchedTools, matchedDisciplines, matchedEngines } = searchMatchingKnowledge(raw, tools);
  if (matchedTools.length > 0 || matchedDisciplines.length > 0 || matchedEngines.length > 0) {
    const parts: string[] = [];
    if (matchedTools.length > 0) {
      parts.push(
        `Sobre eso tengo ${matchedTools.length} herramientas directas en mi catálogo:\n` +
          matchedTools
            .slice(0, 4)
            .map((t) => `• ${t.title} (${t.domain}): ${t.formulaSummary}`)
            .join('\n'),
      );
    }
    if (matchedDisciplines.length > 0) {
      parts.push(
        `Disciplinas relacionadas:\n` +
          matchedDisciplines
            .slice(0, 3)
            .map((d) => `• ${d.name} (${d.faculty}) — ${d.canonicalEquation}`)
            .join('\n'),
      );
    }
    if (matchedTools.length === 0 && matchedEngines.length > 0) {
      parts.push(
        `Motores matemáticos aplicables:\n` +
          matchedEngines.map(([, m]) => `• ${m.label}: ${m.formulaSummary}`).join('\n'),
      );
    }
    parts.push('Si quieres que ejecute una simulación o te explique una en detalle, dime cuál prefieres.');
    return parts.join('\n\n');
  }

  if (kind === 'learning' || /\b(aprender|enseña|ensename|ciencia|ciencias|fisica|física|matematicas|matemáticas|quimica|química|astronomia|astronomía)\b/.test(norm)) {
    return [
      `¡Excelente! Empecemos tu sesión interactiva en la consola HELIX (Educación · Investigación · Entretenimiento):`,
      `1. Química y Energía Molecular: Simulamos gases ideales (PV=nRT), Gibbs (ΔG), Arrhenius, Nernst y enlaces anarmónicos de Morse en 3D.`,
      `2. Física Espacial y Geometría: Órbitas Kepler/Verlet, raymarching SDF, teselación hexagonal Voronoi A₂ y ondas de Helmholtz-Bessel.`,
      `3. Cuántica y Recombinación ADN: Esfera de Bloch SU(2), Statevector OpenQASM 2.0 y síntesis autopoiética A×B desde la pestaña ADN / Lab.`,
      `Dime qué tema quieres probar (por ejemplo: "simula una molécula con Morse", "pilota la nave a la Luna" o "recombina óptica con cuántica").`
    ].join('\n');
  }

  if (kind === 'feedback') {
    return `${_lead}Te sigo. Si quieres comprobar algo en vivo, puedes preguntarme por cualquiera de las ${tools.length} herramientas disponibles o pedirme que calcule y proyecte una escena sobre «${shapeLabel}».`;
  }

  if (en) {
    return _lead + 'I understand. You can ask me to list all my tools and functions, explain any scientific topic, or run a live simulation on the screen.';
  }

  return `${_lead}Te entiendo. Si buscas una capacidad concreta, puedo listarte todas mis herramientas y funciones (${tools.length} en total), explicarte cualquier disciplina o ejecutar una simulación ahora mismo sobre «${shapeLabel}». ¿Qué te gustaría hacer?`;
}

export interface HumanCineReplyResult {
  intent: ConversationalIntentKind;
  replyText: string;
  spokenSummary: string;
  cues: StorySceneCue[];
}

export function buildHumanCineReply(
  raw: string,
  shapeLabel: string,
  engineCount: number,
  isAction: boolean,
  context: ConversationTurnContext = {},
): HumanCineReplyResult {
  const intent = isAction ? 'creation_or_simulation' : classifyConversationIntent(raw);
  const replyText = buildHumanConversationReply(raw, shapeLabel, engineCount, isAction, context);
  const spokenSummary = toSpokenSummary(replyText);
  const cues = parseStoryIntoMusicalScore(replyText, intent);

  return {
    intent,
    replyText,
    spokenSummary,
    cues,
  };
}
