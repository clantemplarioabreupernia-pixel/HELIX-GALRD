export interface AstronautHealthAssessment {
  detected: boolean;
  statusColor: 'VERDE' | 'ÁMBAR' | 'ROJO';
  accentHex: string;
  summary: string;
  guidance: string;
}

export function evaluateAstronautMissionHealth(text: string): AstronautHealthAssessment {
  const low = text.toLowerCase();
  const isHealthQuery = /\b(salud|astronauta|pulso|card[ií]ac|presi[oó]n|glucosa|sue[ñn]o|radiaci[oó]n|ox[ií]geno|o2|co2|temperatura|nasa|space apps|biom[eé]dic)\b/.test(low);
  if (!isHealthQuery) {
    return { detected: false, statusColor: 'VERDE', accentHex: '#38bdf8', summary: '', guidance: '' };
  }

  const hrMatch = low.match(/(\d{2,3})\s*(?:lpm|bpm|pulsaciones)/);
  const gluMatch = low.match(/(\d{2,3})\s*(?:mg\/dl|glucosa)/);
  const sleepMatch = low.match(/(\d+(?:\.\d+)?)\s*(?:horas?\s*de\s*sue[ñn]o|h\s*sue[ñn]o)/);
  const o2Match = low.match(/(\d{2,3}(?:\.\d+)?)\s*%?\s*(?:o2|ox[ií]geno)/);

  const hr = hrMatch ? Number(hrMatch) : null;
  const glu = gluMatch ? Number(gluMatch) : null;
  const sleep = sleepMatch ? Number(sleepMatch) : null;
  const o2 = o2Match ? Number(o2Match) : null;

  let statusColor: AstronautHealthAssessment['statusColor'] = 'VERDE';
  const findings: string[] = [];

  if (hr !== null) {
    if (hr > 120 || hr < 45) { statusColor = 'ROJO'; findings.push(`Pulso ${hr} lpm fuera de rango de reposo`); }
    else if (hr > 100 || hr < 55) { if (statusColor === 'VERDE') statusColor = 'ÁMBAR'; findings.push(`Pulso ${hr} lpm ligeramente alterado`); }
    else { findings.push(`Pulso ${hr} lpm en rango normal`); }
  }
  if (glu !== null) {
    if (glu < 65 || glu > 200) { statusColor = 'ROJO'; findings.push(`Glucosa ${glu} mg/dL requiere atención inmediata`); }
    else if (glu < 75 || glu > 140) { if (statusColor === 'VERDE') statusColor = 'ÁMBAR'; findings.push(`Glucosa ${glu} mg/dL en vigilancia`); }
    else { findings.push(`Glucosa ${glu} mg/dL estable`); }
  }
  if (sleep !== null && sleep < 6) {
    if (statusColor === 'VERDE') statusColor = 'ÁMBAR';
    findings.push(`Sueño reducido (${sleep} h): fatiga circadiana probable`);
  }
  if (o2 !== null && o2 < 94) {
    statusColor = 'ROJO';
    findings.push(`Saturación/O₂ ${o2}% baja: revisar soporte vital`);
  }

  const accentHex = statusColor === 'ROJO' ? '#f43f5e' : statusColor === 'ÁMBAR' ? '#f59e0b' : '#22c55e';
  const summary = findings.length > 0
    ? `[ESTADO BIOMÉDICO: ${statusColor}] ${findings.join(' · ')}.`
    : `[MODO MONITOREO ASTRONAUTA: ${statusColor}] Listo para evaluar pulso (lpm), presión arterial, glucosa (mg/dL), horas de sueño, O₂ o imágenes médicas.`;

  const guidance = statusColor === 'ROJO'
    ? 'Acción recomendada: Detener esfuerzo físico, verificar suministro de O₂/hidratación, repetir lectura en 5 min y notificar al cirujano de vuelo.'
    : statusColor === 'ÁMBAR'
      ? 'Acción recomendada: Hidratación, protocolo de respiración pausada y nueva medición de control en 30 minutos.'
      : 'Rutina preventiva: Mantener ejercicio resistivo diario (ARED) para densidad ósea y registrar signos vitales antes del descanso. (Nota: herramienta de apoyo técnico; no sustituye criterio médico oficial).';

  return { detected: true, statusColor, accentHex, summary, guidance };
}
