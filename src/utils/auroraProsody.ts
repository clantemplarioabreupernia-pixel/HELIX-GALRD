export interface VocalProsodyState {
  mood: 'calm' | 'focused' | 'worried' | 'urgent';
  pitchVariance: number;
  energyRms: number;
  empathyPrefix: string;
}

export function analyzeVocalAndTextProsody(
  text: string,
  energyRms: number,
  pitchVariance: number,
): VocalProsodyState {
  const norm = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const textWorried = /\b(preocupad|miedo|angusti|triste|cansad|agotad|falla|peligro|emergencia|ayuda|no se|perdido|estres)\b/.test(norm);
  const vocalTension = energyRms > 0.02 && energyRms < 0.09 && pitchVariance < 0.018;

  if (textWorried || vocalTension) {
    return {
      mood: 'worried',
      pitchVariance,
      energyRms,
      empathyPrefix: 'Disculpa, noto cierta preocupación en tu voz… ¿qué te pasa? Estoy aquí contigo. ',
    };
  }
  if (energyRms >= 0.16 || /\b(rapido|urgente|alerta|ahora|ya)\b/.test(norm)) {
    return { mood: 'urgent', pitchVariance, energyRms, empathyPrefix: '' };
  }
  return { mood: 'calm', pitchVariance, energyRms, empathyPrefix: '' };
}
