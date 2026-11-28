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
  vocalEnergyRms?: number;
  vocalPitchVariance?: number;
}

const ACTION_CREATION_RE =
  /\b(crea|crear|creame|créame|simul|calcul|diseñ|disen|construy|genera|haz|hagam|esculp|proyecta|cambia|cambialo|cámbialo|ajusta|ponle|agrega|añade|combina|mezcla|mueve|anima|dibuja|modela|transforma|deforma|ejecuta|prueba|escanea|escanear|cuento|historia|relato|bosque|lobo|caperucita|castillo|mar|olas|videojuego|juego|nave|espaci|gravedad|asteroide|enemigo|obst[aá]culo|velocidad|color|brillo|órbita|orbita|cohete|satelit|planeta|luna|marte|martes|radar|montaña|montana|terreno|fluido|onda|cuántic|cuantic|videoclip|música|musica|balance|financier|saldo|quimic|químic|molecul|molécul|reaccion|reacción|nernst|gibbs|morse|imagen|foto|laboratorio|pentile|rgbw|stripe|monocrom|grises|atascado|caliente|reparar|galdr|fonema|ecuaci[oó]n\s*unificada|s_biopixel|cinematograf[ií]a|runas|disney|omega|recombin)\b/i;

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
    /\b(doble helice|recombinador|biblioteca|17\s*bytes|17b|qpsk|aduana|pcc|minigpt|mini-gpt|exocortex|pantalla liquida|36000|contenedores|biopixel|nanotec|6 caras|pitagoras|33 primos|p33|pentile|rgbw|rgb stripe|cmyk|monocromatico|8 bits|1 bit|24 bits|pixel muerto|pixel atascado|pixel caliente|pixel fisico|pixel logico|ppi|cauchy_optic|galdr_synth|disney|12 principios|celulas.*33)\b/.test(
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
  const _prosody = analyzeVocalAndTextProsody(
    raw,
    context.vocalEnergyRms ?? 0,
    context.vocalPitchVariance ?? 0.05,
  );
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
      'HELIX integra sobre biopíxeles 4K (Pauli-SoA 28 B/biopíxel): 23 motores reales con sus células .hlx firmadas para las 33 disciplinas P₃₃ (QPSK 17 bytes), cinemática Disney de 12 principios (det(S)=1, arcos Bézier y follow-through RK2), síntesis acústica Galdr por formantes (F1, F2 y notas musicales), separación RGB Stripe / PenTile / RGBW, profundidades 24/8/1-bit y métrica aritmética modular P₃₃ anti-muaré de Halton.'
    );
  }

  const who = context.userName ? `, ${context.userName}` : '';
  const introNameMatch = raw.match(/(?:me\s+llamo|mi\s+nombre\s+es|soy)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i);
  const justIntroduced =
    introNameMatch?.[1] && !/^(hel|un|una|el|la|tu|nuevo|estudiante|profesor)/i.test(introNameMatch[1])
      ? introNameMatch[1]
      : '';

  if (justIntroduced && kind === 'open_chat') {
    return `${_lead}¡Mucho gusto, ${justIntroduced}! Qué bueno conocerte. Aquí estoy contigo para conversar de verdad, imaginar un videojuego o un cuento en 3D, o probar cualquier idea científica sobre toda esta pantalla de biopíxeles. ¿Qué te gustaría explorar primero?`;
  }

  if (/\b(no hay comunicacion|no hablas|frio|robot|maquina|aburrido|no me entiendes|seca|cordial|humana)\b/.test(norm)) {
    return `${_lead}Tienes toda la razón${who}, y te agradezco que me lo digas con franqueza. Quiero hablar contigo como una persona cercana, no soltarte datos fríos. Cuéntame qué tienes en mente —un juego, una historia, una duda o simplemente charlar— y lo construimos juntos paso a paso.`;
  }

  if (/\b(como estas|que tal estas|todo bien|como te sientes)\b/.test(norm)) {
    return `${_lead}¡Muy bien${who}, con muchas ganas de conversar y crear contigo! ¿Y tú cómo estás hoy? Si quieres, podemos inventar un mundo desde cero, escuchar música con una escena en 3D o simplemente charlar un rato.`;
  }

  if (kind === 'identity') {
    const alsoGreeting = /\b(hola|buenas|hey|hello|hi)\b/.test(norm);
    if (en) {
      return `${_lead}${alsoGreeting ? 'Hello! ' : ''}I am Helix, your creative companion inside this full-screen 3D biopixel studio. We can talk naturally, design worlds and games, turn stories into living cinema, or explore science together.`;
    }
    return `${_lead}${alsoGreeting ? '¡Hola! ' : ''}Soy Helix${who}, tu compañero creativo dentro de esta pantalla de biopíxeles 3D. Me encanta conversar con naturalidad y dar forma visual en tiempo real a lo que imagines: desde un cuento o un videojuego hasta química, física u óptica. ¿Qué te apetece hacer hoy?`;
  }

  if (kind === 'greeting') {
    if (en) {
      return _lead + 'Hello! Great to have you here. How is your day going, and what would you like to imagine or create together?';
    }
    return _lead + `¡Hola${who}! Qué gusto verte por aquí. ¿Cómo va tu día? Cuéntame qué te gustaría conversar o ver cobrar vida en la pantalla hoy.`;
  }

  if (kind === 'capabilities') {
    if (en) {
      return `${_lead}I am a creative studio companion on a full-screen 3D biopixel display: we can chat naturally, craft adventure/strategy/combat games, turn stories into 3D animated cinema with Galdr music, explore chemistry and space physics, or recombine laws in ADN / Lab.`;
    }
    return `${_lead}Más que una consola técnica, soy tu estudio creativo a pantalla completa${who}: podemos conversar abiertamente, crear secuencias hiperrealistas de juegos (Aventura, Estrategia, Combate o Campaña), transformar relatos en cine 3D con música Galdr, o experimentar con 33 disciplinas científicas y el Recombinador ADN. ¿Por dónde te gustaría empezar?`;
  }

  if (kind === 'gratitude') {
    return en
      ? 'You are very welcome! Always glad to create with you—what shall we dream up next?'
      : `¡Con todo cariño${who}! Para eso estoy aquí. ¿Seguimos charlando o probamos otra escena en vivo?`;
  }

  if (kind === 'creation_or_simulation') {
    const isSpace = /\b(nave|espaci|orbit|órbita|luna|marte|planeta|cohete|satel)\b/.test(norm);
    const controlHint = isSpace
      ? ' Puedes pilotar la nave directamente con W, A, S, D o mover el cursor sobre la escena.'
      : ' Puedes mover el cursor sobre los biopíxeles o hacer zoom con la rueda para sentir el relieve en vivo.';
    const metricsHint = outputHint ? ` También dejé calculados los datos reales (${outputHint.replace(/^\s*\(|\)\s*$/g, '')}).` : '';

    return `${_lead}Listo${who}, acabo de dar forma a «${shapeLabel}» en toda la pantalla.${metricsHint}${controlHint} ¿Qué te parece así o qué te gustaría ajustar?`;
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
        return `${_lead}Siguiendo con lo que hablábamos, aquí tienes las herramientas que mejor encajan con esa idea:\n${matchedTools
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
        `Mira${who}, sobre ese tema tengo herramientas listas para usar contigo:\n` +
          matchedTools
            .slice(0, 4)
            .map((t) => `• ${t.title} (${t.domain}): ${t.formulaSummary}`)
            .join('\n'),
      );
    }
    if (matchedDisciplines.length > 0) {
      parts.push(
        `Disciplinas conectadas:\n` +
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
    parts.push('¿Quieres que lo proyecte en vivo en los biopíxeles o prefieres que te lo explique de forma sencilla?');
    return parts.join('\n\n');
  }

  if (kind === 'learning' || /\b(aprender|enseña|ensename|ciencia|ciencias|fisica|física|matematicas|matemáticas|quimica|química|astronomia|astronomía)\b/.test(norm)) {
    return [
      `¡Me encanta esa curiosidad${who}! Podemos aprender juntos de forma visual y sin enredos:`,
      `1. Química y Energía Molecular: Vemos átomos reales y enlaces de Morse vibrando en 3D.`,
      `2. Espacio y Naturaleza: Pilotamos naves en órbita, océanos con olas o cordilleras con aves.`,
      `3. Juegos e Historias: Me cuentas una idea de aventura o cuento y la convertimos en cine interactivo.`,
      `Dime qué tema te llama más la atención y arrancamos juntos.`
    ].join('\n');
  }

  if (kind === 'feedback') {
    return `${_lead}Te escucho con atención${who}. Me importa que esto se sienta fluido, útil y cercano para ti. Si quieres ajustar la escena «${shapeLabel}», inventar una historia nueva o charlar sobre tu proyecto, dime con total confianza.`;
  }

  if (en) {
    return _lead + 'I am listening! Tell me more about what you have in mind—whether it is a story, a game world, a science question, or just an open conversation.';
  }

  return `${_lead}Te sigo${who}. Cuéntame un poco más de lo que tienes en mente: podemos desarrollarlo juntos en conversación, convertirlo en una secuencia visual sobre toda la pantalla o explorarlo con herramientas del estudio. ¿Hacia dónde lo llevamos?`;
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
