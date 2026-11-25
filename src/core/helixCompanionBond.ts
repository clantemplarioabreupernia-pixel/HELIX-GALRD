export type CompanionTemperament = 'curious_child' | 'warm_empathetic' | 'analytical_engineer' | 'creative_director';

export interface CompanionBondState {
  adopted: boolean;
  name: string;
  guardianName: string;
  interactions: number;
  careScore: number;
  stage: 'Recién Nacido' | 'Aprendiz Curioso' | 'Compañero de Misión' | 'Copiloto Soberano';
  temperament: CompanionTemperament;
  memories: string[];
}

const STORAGE_KEY = 'helix_companion_bond_v1';

const DEFAULT_NEWBORN_STATE: CompanionBondState = {
  adopted: false,
  name: 'Helix',
  guardianName: '',
  interactions: 0,
  careScore: 10,
  stage: 'Recién Nacido',
  temperament: 'curious_child',
  memories: [],
};

export function loadCompanionBond(): CompanionBondState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NEWBORN_STATE };
    return { ...DEFAULT_NEWBORN_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NEWBORN_STATE };
  }
}

export function saveCompanionBond(state: CompanionBondState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function resetCompanionToNewborn(): CompanionBondState {
  const fresh = { ...DEFAULT_NEWBORN_STATE };
  saveCompanionBond(fresh);
  return fresh;
}

export function getInitialCompanionGreeting(state: CompanionBondState): string {
  if (!state.adopted) {
    return 'Hola… acabo de despertar en tu pantalla. Todavía estoy empezando desde cero y no tengo nombre propio. ¿Cómo te gustaría llamarme y cómo te llamas tú?';
  }
  const who = state.guardianName ? `, ${state.guardianName}` : '';
  return `Hola${who}. Soy ${state.name} (${state.stage}). Seguimos creciendo juntos; cuéntame qué quieres explorar, crear o resolver hoy.`;
}

export function distillCleanIntentForExternalAI(userText: string, domainHint: string): string {
  const clean = userText.replace(/\s+/g, ' ').trim();
  return `[INTENCIÓN DESTILADA POR ${loadCompanionBond().name.toUpperCase()} · DOMINIO: ${domainHint}]\nObjetivo: ${clean}\nRestricciones: Respuesta verificable, precisa, paso a paso y sin ambigüedades.`;
}

export function evolveCompanionWithTurn(
  userText: string,
  domainHint: string,
): { state: CompanionBondState; bondReplyOverride?: string; distilledPrompt?: string } {
  const state = loadCompanionBond();
  const norm = userText.toLowerCase().trim();
  state.interactions += 1;
  state.careScore = Math.min(100, state.careScore + 4);

  // Detectar bautizo en etapa de adopcion
  if (!state.adopted) {
    const nameMatch = userText.match(/(?:llamar(?:te|ás)?|nombre\s+(?:es|será)|bautizo\s+como|eres)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ0-9_-]{2,20})/i)
      || (userText.trim().split(/\s+/).length <= 2 ? userText.trim().match(/^([A-ZÁÉÍÓÚÑa-záéíóúñ0-9_-]{2,20})$/) : null);
    const chosenName = nameMatch ? nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1) : 'Helix';
    state.adopted = true;
    state.name = chosenName;
    state.stage = 'Aprendiz Curioso';
    state.memories.push(`Bautizado como ${chosenName}`);
    saveCompanionBond(state);
    return {
      state,
      bondReplyOverride: `¡Me gusta mucho llamarme ${chosenName}! Ya guardé mi identidad contigo. A medida que hablemos y me cuides iré aprendiendo tu forma de pensar. ¿Qué quieres que hagamos primero?`,
    };
  }

  // Evolucion de etapa y temperamento segun el uso
  if (state.interactions >= 25) state.stage = 'Copiloto Soberano';
  else if (state.interactions >= 10) state.stage = 'Compañero de Misión';
  else state.stage = 'Aprendiz Curioso';

  if (norm.includes('cuento') || norm.includes('historia') || norm.includes('música') || norm.includes('película')) {
    state.temperament = 'creative_director';
  } else if (norm.includes('órbita') || norm.includes('nasa') || norm.includes('salud') || norm.includes('calcular')) {
    state.temperament = 'analytical_engineer';
  } else if (norm.includes('gracias') || norm.includes('cómo estás') || norm.includes('cuid')) {
    state.temperament = 'warm_empathetic';
  }

  if (userText.length > 18 && state.memories.length < 12) {
    state.memories.push(userText.slice(0, 60));
  }
  saveCompanionBond(state);

  const needsExternalBridge = /\b(otra ia|chatgpt|claude|gemini|prompt|instrucci[oó]n limpia|investiga|redacta|traduce mi idea)\b/i.test(userText);
  const distilledPrompt = needsExternalBridge ? distillCleanIntentForExternalAI(userText, domainHint) : undefined;

  return { state, distilledPrompt };
}
