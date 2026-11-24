import type { EngineeringReport } from './helixPlanner';

export type ConversationalIntentKind =
  | 'greeting'
  | 'identity'
  | 'capabilities'
  | 'learning'
  | 'gratitude'
  | 'feedback'
  | 'creation_or_simulation'
  | 'open_chat';

export interface ConversationTurnContext {
  report?: EngineeringReport;
  previousIntent?: string;
  userName?: string;
  turnCount?: number;
  confirmed?: boolean;
}

const ACTION_CREATION_RE =
  /\b(crea|crear|creame|créame|simul|calcul|diseñ|disen|construy|genera|haz|hagam|esculp|proyecta|cambia|cambialo|cámbialo|ajusta|ponle|agrega|añade|combina|mezcla|mueve|anima|dibuja|modela|transforma|deforma|videojuego|juego|nave|espaci|gravedad|asteroide|enemigo|obst[aá]culo|velocidad|r[aá]pido|lento|color|brillo|órbita|orbita|cohete|satelit|planeta|radar|montaña|montana|terreno|fluido|onda|cuántic|cuantic|videoclip|música|musica|balance|financier|saldo)\b/i;

const PHYSICAL_VALUE_RE =
  /\b\d+(?:[.,]\d+)?\s*(?:km|m\/s|hz|ghz|mpa|kg|fps|qubits?|\$|usd)\b/i;

const PURE_CHAT_OVERRIDE_RE =
  /^(hola|buenas|buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches|hey|saludos|qu[eé]\s+tal|c[oó]mo\s+est[aá]s|c[oó]mo\s+te\s+llamas|cu[aá]l\s+es\s+tu\s+nombre|qui[eé]n\s+eres|qu[eé]\s+eres|qu[eé]\s+puedes\s+hacer|para\s+qu[eé]\s+sirves|gracias|muchas\s+gracias|ok|vale|listo|genial|perfecto|hello|hi|who\s+are\s+you|what\s+is\s+your\s+name)\b/i;

/**
 * Determina si el mensaje del usuario pide crear, simular, calcular o transformar
 * la pantalla líquida, o si es una conversación humana directa.
 */
export function isActionOrCreationIntent(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (PHYSICAL_VALUE_RE.test(t) || ACTION_CREATION_RE.test(t)) {
    // Aun si empieza con "hola", si pide crear/simular algo concreto ("hola, quiero crear una nave") es acción
    return true;
  }
  if (PURE_CHAT_OVERRIDE_RE.test(t)) {
    return false;
  }
  return false;
}

export function classifyConversationIntent(raw: string): ConversationalIntentKind {
  const t = raw.trim().toLowerCase();
  if (!t) return 'open_chat';

  if (
    /c[oó]mo\s+te\s+llamas|cu[aá]l\s+es\s+tu\s+nombre|tu\s+nombre|qui[eé]n\s+eres|qu[eé]\s+eres|who\s+are\s+you|what\s+is\s+your\s+name/i.test(
      t,
    )
  ) {
    return 'identity';
  }
  if (
    /^(hola|buenas|buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches|hey|saludos|qu[eé]\s+tal|c[oó]mo\s+est[aá]s|hello|hi)\b/i.test(
      t,
    ) &&
    !ACTION_CREATION_RE.test(t)
  ) {
    return 'greeting';
  }
  if (
    /qu[eé]\s+puedes\s+hacer|c[oó]mo\s+funciona|para\s+qu[eé]\s+sirves|ayuda|what\s+can\s+you\s+do/i.test(
      t,
    )
  ) {
    return 'capabilities';
  }
  if (/aprender|enseñ|ensena|explic|por\s+qu[eé]|por\s+que|learn|teach|explain/i.test(t)) {
    return 'learning';
  }
  if (/^(gracias|muchas\s+gracias|genial|excelente|s[uú]per|me\s+encanta|perfecto|thanks)/i.test(t)) {
    return 'gratitude';
  }
  if (isActionOrCreationIntent(t)) {
    return 'creation_or_simulation';
  }
  if (/opinas|crees|ves|parece|entiendes|verdad|cierto/i.test(t)) {
    return 'feedback';
  }
  return 'open_chat';
}

function summarizeTopOutputs(report?: EngineeringReport): string {
  if (!report || report.dataOutputs.length === 0) return '';
  const top = report.dataOutputs
    .slice(0, 2)
    .map((d) => `${d.label.toLowerCase()} de ${d.value}`)
    .join(' y ');
  return top ? ` (por ejemplo, ${top})` : '';
}

/**
 * Motor conversacional humano de Helix: responde con calidez, contexto y
 * preguntas interactivas, sin mostrar código ni nombres internos de herramientas.
 */
export function buildHumanConversationReply(
  raw: string,
  shapeLabel: string,
  _engineCount: number,
  isAction: boolean,
  context: ConversationTurnContext = {},
): string {
  const t = raw.trim().toLowerCase();
  const en = /\b(hello|hi|what|who|how|learn|teach|create|thanks|your name|spaceship|game)\b/i.test(t) &&
    !/\b(hola|quiero|como|cómo|crear|naves|juego|pantalla|gracias)\b/i.test(t);

  const kind = isAction ? 'creation_or_simulation' : classifyConversationIntent(raw);
  const report = context.report;
  const outputHint = summarizeTopOutputs(report);

  if (kind === 'identity') {
    const alsoGreeting = /\b(hola|buenas|hey|hello|hi)\b/i.test(t);
    if (en) {
      return `${alsoGreeting ? 'Hello! ' : ''}My name is Helix. I am your creative and scientific companion: you can chat with me naturally, ask questions, or tell me what to build or simulate on the liquid screen without writing any code. What would you like to talk about or create today?`;
    }
    return `${alsoGreeting ? '¡Hola! ' : ''}Me llamo Helix. Soy tu compañero creativo y científico: puedes conversar conmigo con naturalidad, preguntarme cualquier duda o pedirme que dé forma a mundos, simulaciones y escenas vivas en la pantalla líquida sin escribir código. ¿Cómo te llamas o qué tienes en mente hoy?`;
  }

  if (kind === 'greeting') {
    if (en) {
      return 'Hello! Nice to talk with you. How are you doing today? Tell me what you have in mind — we can chat, explore an idea, or sculpt something live on the screen.';
    }
    return '¡Hola! Qué gusto saludarte. ¿Cómo estás hoy? Podemos charlar sobre cualquier idea, resolver cálculos o empezar a dar vida a lo que imagines directamente en la pantalla líquida. ¿Qué te gustaría hacer?';
  }

  if (kind === 'capabilities') {
    if (en) {
      return 'Just talk to me in plain words! I can chat with you, help design interactive games, simulate orbits or fluid optics, react to frequencies, or calculate exact numbers — and you can also touch the liquid screen or attach custom data whenever you want. What should we try first?';
    }
    return 'Solo háblame con tus palabras, sin nada de código. Puedo conversar contigo, ayudarte a imaginar videojuegos, simular órbitas o terrenos, reaccionar a música y frecuencias, o hacer cálculos precisos mientras ves cómo cobra forma en la pantalla líquida. ¿Por dónde te gustaría empezar?';
  }

  if (kind === 'learning') {
    if (en) {
      return 'I would love to explore that with you! Tell me which topic sparks your curiosity — space trajectories, fluids and waves, quantum states, or visual design — and we can test it together right on the screen.';
    }
    const activeNote = context.previousIntent
      ? ` Ahora mismo tenemos en pantalla "${shapeLabel}"${outputHint}.`
      : '';
    return `¡Con mucho gusto lo exploramos juntos!${activeNote} Dime qué tema o duda tienes —desde órbitas espaciales y ondas sonoras hasta física de fluidos o matemáticas— y te lo explico paso a paso o lo probamos en vivo en la pantalla.`;
  }

  if (kind === 'gratitude') {
    if (en) {
      return 'You are very welcome! Would you like to tweak what is on the screen or try a brand-new idea?';
    }
    return '¡Con mucho gusto! ¿Quieres que ajustemos algún detalle de lo que ves en pantalla o probamos otra idea nueva?';
  }

  if (kind === 'creation_or_simulation') {
    const category = report?.detectedCategory;
    const hasQuestions = Boolean(report && report.questions.length > 0 && !context.confirmed);

    if (category === 'VIDEOJUEGO') {
      if (hasQuestions) {
        return `¡Qué buena idea! Ya formé un primer prototipo visual («${shapeLabel}») en la pantalla líquida${outputHint}. Para ir dándole el estilo que tú quieres, cuéntame o elige abajo: ¿prefieres que tu nave vuele en el espacio abierto, sobre un planeta con gravedad o entre montañas fractales? ¿Y qué tipo de desafíos o enemigos te gustaría agregar?`;
      }
      return `¡Listo! Actualicé tu mundo de juego en la pantalla líquida con forma de «${shapeLabel}»${outputHint}. ¿Cómo sientes el resultado hasta ahora? Podemos cambiar la velocidad, la gravedad, el sonido o añadir nuevos obstáculos cuando me digas.`;
    }

    if (category === 'SIMULACION_ESPACIAL') {
      if (hasQuestions) {
        return `¡En marcha! Proyecté «${shapeLabel}» en la pantalla líquida con los primeros cálculos espaciales${outputHint}. ¿A qué altitud orbital te gustaría llevar la misión o quieres sumar rastreo por radar y enlace satelital? Puedes tocar las opciones de abajo o escribirme los detalles.`;
      }
      return `Simulación espacial ajustada en «${shapeLabel}»${outputHint}. Si quieres probar otra altura, velocidad o cambiar a otro escenario, solo dímelo.`;
    }

    if (category === 'CINEMA_VIDEOCLIP') {
      if (hasQuestions) {
        return `¡Me gusta! La pantalla líquida ya tomó forma de «${shapeLabel}» para tu escena visual${outputHint}. ¿Prefieres que el fluido responda con destellos de luz, ondas simétricas o sincronizado con la voz? Dime cómo te imaginas el ritmo.`;
      }
      return `Escena audiovisual actualizada en «${shapeLabel}»${outputHint}. ¿Quieres cambiar los colores, la frecuencia o darle más intensidad al movimiento?`;
    }

    if (en) {
      return `Done! I shaped "${shapeLabel}" on the liquid screen${outputHint}. How does it look to you, and what would you like to adjust next?`;
    }

    return `¡Hecho! Ya di forma a «${shapeLabel}» en la pantalla líquida${outputHint}. ¿Qué te parece cómo se ve y qué detalle te gustaría cambiar o combinar ahora?`;
  }

  if (kind === 'feedback') {
    return `Sí, te sigo perfectamente. Ahora mismo estamos trabajando sobre «${shapeLabel}». Cuéntame qué parte te gustaría pulir, cambiar o profundizar y lo conversamos.`;
  }

  if (en) {
    return 'I am listening! Tell me more about what you are thinking, or let me know if you want me to shape or simulate something on the screen.';
  }

  return '¡Te escucho! Cuéntame más sobre lo que estás pensando, o dime si quieres que transformemos esta idea en una escena viva en la pantalla líquida.';
}