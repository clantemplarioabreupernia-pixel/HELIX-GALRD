export function buildHumanConversationReply(rawText: string, shapeName: string, domainCount: number, isCreation: boolean): string {
  const t = rawText.trim().toLowerCase();
  if (/^(hola|buenas|hey|saludos|que tal|qué tal|buen dia|buenos dias|buenas tardes|buenas noches)[!.,?\s]*$/.test(t)) {
    return '¡Hola! Qué gusto saludarte. Estoy aquí contigo y listo para conversar o crear lo que imagines. ¿Cómo estás hoy y qué te gustaría explorar?';
  }
  if (t.includes('que eres') || t.includes('qué eres') || t.includes('quien eres') || t.includes('quién eres')) {
    return 'Soy Helix, tu compañero creativo y científico. No soy un simple chat: por dentro tengo motores de física, matemáticas exactas, música armónica y gráficos líquidos que cobran vida con tus palabras. Puedes hablarme normal o pedirme que construya simulaciones, juegos o cálculos.';
  }
  if (/^(contesta|responde|estas ahi|estás ahí|me escuchas|hola\?)[!.,?\s]*$/.test(t)) {
    return '¡Aquí estoy, escuchándote atento! Perdona si antes soné muy técnico. Dime qué tienes en mente o qué quieres que hagamos juntos.';
  }
  if (t.includes('quien te creo') || t.includes('quién te creó') || t.includes('tu creador')) {
    return 'Fui diseñado y construido como un sistema soberano que une física continua, matemáticas verificadas y creatividad visual para ayudar a familias, estudiantes y científicos sin complicaciones.';
  }
  if (t.includes('gracias') || t.includes('genial') || t.includes('excelente') || t.includes('impresionante')) {
    return '¡Gracias a ti! Me alegra muchísimo que te guste. Cuando quieras seguimos construyendo o ajustando lo que necesites.';
  }
  if (!isCreation) {
    return `Te entiendo perfectamente. Si quieres que convierta "${rawText.trim()}" en una simulación visual, una app interactiva o un cálculo exacto en la pantalla líquida, solo dime cómo te gustaría verlo y lo armamos al instante.`;
  }
  return `¡Listo! He dado forma a tu idea en "${shapeName}" combinando ${domainCount} motores físicos y matemáticos en tiempo real. Puedes interactuar con la membrana líquida a la derecha o descargar el resultado.`;
}