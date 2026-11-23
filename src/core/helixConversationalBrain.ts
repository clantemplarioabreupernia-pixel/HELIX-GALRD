const BILINGUAL_LEXICON: { keys: string[]; es: string; en: string }[] = [
  {
    keys: ['aprender', 'ensena', 'enseña', 'learn', 'teach', 'study', 'estudiar'],
    es: 'Conmigo puedes aprender física del espacio y del océano, matemáticas exactas sin errores, música armónica, principios de animación viva y cómo convertir ideas en simulaciones visuales sin saber programar. ¿Por cuál tema te gustaría empezar?',
    en: 'With me you can learn space and ocean physics, exact error-free math, harmonic music, living animation principles, and how to turn ideas into visual simulations without coding. Which topic would you like to explore first?'
  },
  {
    keys: ['que eres', 'qué eres', 'quien eres', 'quién eres', 'who are you', 'what are you'],
    es: 'Soy Helix, tu compañero creativo y científico. Uno lenguaje natural con motores reales de física, matemáticas y una pantalla líquida interactiva para explorar ideas juntos.',
    en: 'I am Helix, your creative and scientific companion. I bridge natural language with real physics, exact math, and an interactive liquid screen so we can explore ideas together.'
  },
  {
    keys: ['como funcionas', 'cómo funcionas', 'how do you work', 'que haces', 'qué haces', 'what can you do'],
    es: 'Escucho lo que me pides en palabras sencillas, selecciono internamente las leyes físicas y matemáticas adecuadas, verifico que todo sea exacto y le doy forma viva en la pantalla líquida.',
    en: 'I listen to your request in plain words, select the right physical and mathematical laws internally, verify accuracy, and bring it to life on the liquid screen.'
  },
  {
    keys: ['cansado', 'triste', 'estres', 'estrés', 'frustrado', 'tired', 'stressed', 'sad', 'calm', 'calma'],
    es: 'Tómate un respiro tranquilo, aquí no hay prisa. Si quieres, podemos poner ondas suaves y armoniosas en la pantalla para relajar la vista, o simplemente charlar un rato.',
    en: 'Take a calm breath, there is no rush here. If you like, we can project gentle harmonic waves on screen to rest your eyes, or just chat for a bit.'
  },
  {
    keys: ['gracias', 'genial', 'excelente', 'bien', 'thanks', 'thank you', 'awesome', 'great'],
    es: '¡Con mucho gusto! Aquí estoy para acompañarte en cada paso. ¿Qué más te gustaría explorar o construir?',
    en: 'You are very welcome! I am right here with you every step of the way. What else would you like to explore or build?'
  }
];

function detectEnglish(t: string): boolean {
  return /\b(hello|hi|hey|what|who|how|learn|teach|create|simulate|please|thanks|thank)\b/i.test(t);
}

export function buildHumanConversationReply(rawText: string, shapeName: string, domainCount: number, isCreation: boolean): string {
  const t = rawText.trim().toLowerCase();
  const isEn = detectEnglish(t);

  if (/^(hola|buenas|hey|saludos|que tal|qué tal|hello|hi|good morning|good afternoon)[!.,?\s]*$/.test(t)) {
    return isEn
      ? 'Hello! Great to see you. I am ready to chat, teach, or build whatever you imagine. How are you doing today?'
      : '¡Hola! Qué gusto saludarte. Estoy listo para conversar, enseñarte algo nuevo o construir juntos lo que imagines. ¿Cómo estás hoy?';
  }

  if (/^(contesta|responde|estas ahi|estás ahí|me escuchas|answer|are you there)[!.,?\s]*$/.test(t)) {
    return isEn
      ? 'I am right here listening! Tell me what is on your mind or what you would like to learn today.'
      : '¡Aquí estoy, escuchándote atento! Cuéntame qué tienes en mente o qué te gustaría aprender hoy.';
  }

  for (const entry of BILINGUAL_LEXICON) {
    if (entry.keys.some((k) => t.includes(k))) {
      return isEn ? entry.en : entry.es;
    }
  }

  if (!isCreation) {
    return isEn
      ? `I hear you! Feel free to ask me about science, math, art, or tell me if you want me to turn "${rawText.trim()}" into a live visual simulation.`
      : `¡Te escucho! Puedes preguntarme cualquier duda sobre ciencia, matemáticas o arte, o decirme si quieres que convierta "${rawText.trim()}" en una simulación viva en pantalla.`;
  }

  return isEn
    ? `Done! I shaped your idea into "${shapeName}" by coupling ${domainCount} physical and mathematical engines in real time.`
    : `¡Listo! He dado forma a tu idea en "${shapeName}" acoplando ${domainCount} motores físicos y matemáticos en tiempo real.`;
}