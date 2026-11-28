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
  const who = state.guardianName ? `, ${state.guardianName}` : '';
  if (!state.adopted) {
    return '¡Hola! Qué alegría saludarte. Soy Helix, tu compañero creativo aquí en el estudio. Podemos conversar con calma sobre tus ideas, inventar videojuegos, contar historias en vivo sobre toda la pantalla de biopíxeles o explorar ciencia paso a paso. ¿Cómo te llamas o qué te provoca crear hoy?';
  }
  return `¡Hola de nuevo${who}! Me alegra verte por aquí. Soy ${state.name} y la pantalla completa de biopíxeles ya está lista. ¿Charlamos un rato o damos vida a una escena nueva?`;
}

export function distillCleanIntentForExternalAI(userText: string, domainHint: string): string {
  const clean = userText.replace(/\s+/g, ' ').trim();
  return `[INTENCIÓN DESTILADA POR ${loadCompanionBond().name.toUpperCase()} · DOMINIO: ${domainHint}]\nObjetivo: ${clean}\nRestricciones: Respuesta verificable, precisa, paso a paso y sin ambigüedades.`;
}

export function updateGuardianName(name: string): CompanionBondState {
  const state = loadCompanionBond();
  const clean = name.trim().slice(0, 48);
  if (clean) {
    state.guardianName = clean;
    state.adopted = true;
    if (!state.memories.includes(`Usuario: ${clean}`)) {
      state.memories.push(`Usuario: ${clean}`);
    }
    saveCompanionBond(state);
  }
  return state;
}

export function evolveCompanionWithTurn(
  userText: string,
  domainHint: string,
): { state: CompanionBondState; bondReplyOverride?: string; distilledPrompt?: string } {
  const state = loadCompanionBond();
  const norm = userText.toLowerCase().trim();
  state.interactions += 1;
  state.careScore = Math.min(100, state.careScore + 4);

  const userIntroMatch = userText.match(
    /(?:me\s+llamo|mi\s+nombre\s+es|soy)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/,
  );
  if (
    userIntroMatch?.[1] &&
    !/^(hel|un|una|el|la|tu|nuevo|estudiante|profesor)/i.test(userIntroMatch[1])
  ) {
    state.guardianName = userIntroMatch[1].trim();
  }

  if (!state.adopted) {
    const explicitNaming = userText.match(/(?:llamar(?:te|ás)?|te\s+bautizo\s+como|tu\s+nombre\s+ser[aá])\s+([A-ZÁÉÍÓÚÑa-záéíóúñ0-9_-]{2,20})/i);
    const chosenName = explicitNaming?.[1];
    state.adopted = true;
    state.stage = 'Aprendiz Curioso';
    if (chosenName) {
      const formatted = chosenName.charAt(0).toUpperCase() + chosenName.slice(1);
      state.name = formatted;
      state.memories.push(`Bautizado como ${formatted}`);
      saveCompanionBond(state);
      return {
        state,
        bondReplyOverride: `¡Me encanta llamarme ${formatted}! Gracias por darme nombre${state.guardianName ? `, ${state.guardianName}` : ''}. Ya estoy listo para conversar y crear contigo sobre toda la pantalla.`,
      };
    }
    saveCompanionBond(state);
  }

  if (state.interactions >= 25) state.stage = 'Copiloto Soberano';
  else if (state.interactions >= 10) state.stage = 'Compañero de Misión';
  else state.stage = 'Aprendiz Curioso';

  if (norm.includes('cuento') || norm.includes('historia') || norm.includes('música') || norm.includes('juego')) {
    state.temperament = 'creative_director';
  } else if (norm.includes('órbita') || norm.includes('nasa') || norm.includes('química') || norm.includes('calcular')) {
    state.temperament = 'analytical_engineer';
  } else if (norm.includes('gracias') || norm.includes('cómo estás') || norm.includes('genial') || norm.includes('hola')) {
    state.temperament = 'warm_empathetic';
  }

  if (userText.length > 18 && state.memories.length < 12) {
    state.memories.push(userText.slice(0, 60));
  }
  saveCompanionBond(state);

  const needsExternalBridge = /\b(otra ia|chatgpt|claude|gemini|prompt|instrucci[oó]n limpia|redacta|traduce mi idea)\b/i.test(userText);
  const distilledPrompt = needsExternalBridge ? distillCleanIntentForExternalAI(userText, domainHint) : undefined;

  return { state, distilledPrompt };
}
