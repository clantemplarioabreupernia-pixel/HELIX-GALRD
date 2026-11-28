import 'dotenv/config';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import express from 'express';
import { WebSocketServer } from 'ws';
import { HARDWARE_SEAL, runDoubleHelixAutopoiesis } from './src/core/helixDoubleHelix';
import { INITIAL_COMPOUND_VOCABULARY } from './src/data/vocabulary';
import {
  getN2MiniGptStatus,
  predictWithN2MiniGpt,
  recordCapsuleAndUpdateN2Weights,
  runN2CapsuleTrainingPipeline,
  suggestHelixStructuresFromN2History,
} from './src/server/n2MiniGptService';
import { runN2ServerDatasetWeightSync } from './src/server/n2DatasetUpdater';
import { validateHelixProgram33Tokens } from './src/utils/godel';
import {
  assemblePureFromCells,
  auditPureAssemblyCoverage,
  DEFAULT_HELIX_CELLS,
} from './src/utils/helixCells';
import {
  buildProofCarryingCertificate,
  verifyProofCarryingCertificate,
} from './src/utils/helixPcc';
import {
  compileHelixScript,
  DEFAULT_HELIX_PHYSICS_PROGRAM,
  runHelixProgram,
  verifyHelixProgram,
} from './src/utils/helixVm';

const PORT = Number(process.env.PORT || 3000);
const BASE_DIR = process.cwd();

const ALLOWED_PS_PROBES = {
  DISK_AND_OLLAMA:
    "Get-PSDrive C | Select-Object @{N='DiscoLibreGB';E={[math]::Round($_.Free/1GB,2)}}; Get-Process ollama -ErrorAction SilentlyContinue | Select-Object Name,Id",
} as const;

type AllowedProbeKey = keyof typeof ALLOWED_PS_PROBES;

function runPowerShellProbeSafe(probeKey: AllowedProbeKey): Promise<string> {
  if (process.platform !== 'win32') {
    return Promise.resolve('');
  }
  const cmd = ALLOWED_PS_PROBES[probeKey];
  return new Promise((resolve) => {
    exec(`powershell -NoProfile -Command "${cmd}"`, { timeout: 6000 }, (err, stdout, stderr) => {
      resolve(err ? (stderr || err.message).trim() : stdout.trim());
    });
  });
}

export interface N2CustomsAuditResult {
  approved: boolean;
  reason: string;
  godelValid: boolean;
  godelProduct: string;
  positionalSignature: string;
  instructionsCount: number;
  verificationStatus: 'VERIFICADO' | 'ADVERTENCIA' | 'RECHAZADO';
  symbolicStatus: 'PROVED_SAFE' | 'VIOLATION_FOUND' | 'MISSING';
  vmCompleted: boolean;
  pccValid: boolean;
  pccCertificateSha256: string;
  programSha256: string;
  pureAssemblyValid: boolean;
  pureManifestSha256: string;
  fallbackUsed: boolean;
  missingOpcodes: string[];
  securityFindings: string[];
}

/**
 * Aduana formal N2 + PCC:
 * Audita todo programa `.hlx` con `validateHelixProgram33Tokens`, `compileHelixScript`,
 * `verifyHelixProgram` (Solver Z3-like), `runHelixProgram`, `buildProofCarryingCertificate` +
 * `verifyProofCarryingCertificate` y `assemblePureFromCells` + `auditPureAssemblyCoverage`
 * antes de persistirlo en `dataset_capsules.jsonl`.
 */
export function auditHlxProgramAtN2Customs(hlxScript: string): N2CustomsAuditResult {
  const script = String(hlxScript || '').trim();
  if (!script) {
    return {
      approved: false,
      reason: 'Script .hlx vacío.',
      godelValid: false,
      godelProduct: '0',
      positionalSignature: '',
      instructionsCount: 0,
      verificationStatus: 'RECHAZADO',
      symbolicStatus: 'MISSING',
      vmCompleted: false,
      pccValid: false,
      pccCertificateSha256: '',
      programSha256: '',
      pureAssemblyValid: false,
      pureManifestSha256: '',
      fallbackUsed: true,
      missingOpcodes: [],
      securityFindings: ['Script vacío'],
    };
  }

  const godelCheck = validateHelixProgram33Tokens(script, {
    vocabulary: INITIAL_COMPOUND_VOCABULARY,
    cells: DEFAULT_HELIX_CELLS,
  });

  const compiled = compileHelixScript(script, INITIAL_COMPOUND_VOCABULARY);
  if (compiled.length === 0) {
    return {
      approved: false,
      reason: 'El compilador Helix no produjo instrucciones ejecutables.',
      godelValid: godelCheck.valid,
      godelProduct: godelCheck.godelProduct,
      positionalSignature: godelCheck.positionalSignature,
      instructionsCount: 0,
      verificationStatus: 'RECHAZADO',
      symbolicStatus: 'MISSING',
      vmCompleted: false,
      pccValid: false,
      pccCertificateSha256: '',
      programSha256: '',
      pureAssemblyValid: false,
      pureManifestSha256: '',
      fallbackUsed: true,
      missingOpcodes: [],
      securityFindings: ['Cero instrucciones compiladas'],
    };
  }

  const verification = verifyHelixProgram(compiled);
  const symbolic = verification.symbolic;
  const symbolicStatus = symbolic?.status ?? 'MISSING';

  const vmRun = runHelixProgram(compiled);
  const vmCompleted =
    vmRun.finalPc === compiled.length &&
    !vmRun.finalState.halted &&
    !vmRun.finalState.logs.some((log) => log.status === 'RECHAZADO');

  const pccSummary = symbolic
    ? {
        status: symbolic.status,
        maxHeapBytes: symbolic.maxHeapBytes,
        heapCapacityBytes: symbolic.heapCapacityBytes,
        dischargedRuntimeChecks: symbolic.dischargedRuntimeChecks,
        octagonInvariants: symbolic.octagonInvariants,
        blockStates: symbolic.blockStates,
      }
    : {
        status: 'VIOLATION_FOUND' as const,
        maxHeapBytes: 0,
        heapCapacityBytes: 0,
        dischargedRuntimeChecks: 0,
        octagonInvariants: [],
        blockStates: [],
      };

  const pccCert = buildProofCarryingCertificate(compiled, pccSummary);
  const pccVerify = verifyProofCarryingCertificate(compiled, pccCert);

  const pureJs = assemblePureFromCells(compiled, DEFAULT_HELIX_CELLS, 'js');
  const coverage = auditPureAssemblyCoverage(compiled, DEFAULT_HELIX_CELLS);

  const checks: { ok: boolean; msg: string }[] = [
    {
      ok: godelCheck.valid,
      msg: `Fuera de subanillo P33 / Gödel (${godelCheck.foreignTokens.join(', ') || 'inválido'})`,
    },
    {
      ok: verification.status === 'VERIFICADO',
      msg: `Verificación estática ${verification.status} (${verification.findings.map((f) => f.rule).join(', ')})`,
    },
    {
      ok: symbolicStatus === 'PROVED_SAFE',
      msg: `Solver simbólico ${symbolicStatus}`,
    },
    {
      ok: vmCompleted,
      msg: `Ejecución VM incompleta o rechazada (pc=${vmRun.finalPc}/${compiled.length})`,
    },
    {
      ok: pccVerify.valid,
      msg: pccVerify.reason,
    },
    {
      ok: pureJs.valid && pureJs.securityFindings.length === 0,
      msg: `Hallazgos de ensamblado puro: ${pureJs.securityFindings.map((f) => f.detail).join('; ')}`,
    },
    {
      ok: !coverage.fallbackUsed,
      msg: `Faltan células .hlx firmadas para: ${coverage.missingOpcodes.join(', ')}`,
    },
  ];

  const firstFailure = checks.find((c) => !c.ok);

  return {
    approved: !firstFailure,
    reason: firstFailure
      ? firstFailure.msg
      : `Aprobado por Aduana N2 + PCC (Gödel=${godelCheck.godelProduct.slice(0, 14)}…, PCC=${pccCert.certificateSha256.slice(0, 12)})`,
    godelValid: godelCheck.valid,
    godelProduct: godelCheck.godelProduct,
    positionalSignature: godelCheck.positionalSignature,
    instructionsCount: compiled.length,
    verificationStatus: verification.status,
    symbolicStatus,
    vmCompleted,
    pccValid: pccVerify.valid,
    pccCertificateSha256: pccCert.certificateSha256,
    programSha256: pccCert.programSha256,
    pureAssemblyValid: pureJs.valid && pureJs.securityFindings.length === 0,
    pureManifestSha256: pureJs.manifestSha256,
    fallbackUsed: coverage.fallbackUsed,
    missingOpcodes: coverage.missingOpcodes,
    securityFindings: pureJs.securityFindings.map((f) => `${f.rule}: ${f.detail}`),
  };
}

// NIVEL 1 (BARE-METAL): Depuración, limpieza de intención y detección de geometría líquida
function nivel1BareMetal(rawPrompt: string) {
  const memMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const cleanIntent = rawPrompt
    .replace(/Congratulations!.*?Sign Up/gi, '')
    .replace(/Copyright ©.*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);
  const needsShell = /disco|ram|memoria|cpu|proceso|powershell|sistema|pc|estado/i.test(cleanIntent);
  const shape = /music|sonido|onda|hz|audio/i.test(cleanIntent)
    ? 'wave'
    : /orbit|nave|espac|satelit|radar/i.test(cleanIntent)
      ? 'satellite'
      : /cristal|ico/i.test(cleanIntent)
        ? 'crystal'
        : /monta|terren|lunar/i.test(cleanIntent)
          ? 'terrain'
          : /toroide|torus|anillo|portal/i.test(cleanIntent)
            ? 'torus'
            : 'avatar';
  return { cleanIntent, memMB, needsShell, shape };
}

// NIVEL 2 (DOBLE HELICE HELIX-DNA-2.0 + ADUANA P33/SOLVER/PCC + MINIGPT)
async function nivel2DobleHelice(n1: ReturnType<typeof nivel1BareMetal>) {
  const shellTelemetry = n1.needsShell ? await runPowerShellProbeSafe('DISK_AND_OLLAMA') : '';
  const dnaCycle = runDoubleHelixAutopoiesis(n1.cleanIntent, HARDWARE_SEAL);

  let draft: { sceneTitle?: string; summary?: string } = {};
  try {
    const endpoint = ['http://127.0.0.1', ':11434/api/generate'].join('');
    const oRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(2500),
      body: JSON.stringify({
        model: 'qwen2.5-coder:1.5b',
        stream: false,
        format: 'json',
        system:
          'Eres el motor interno HELIX-DNA-2.0. Describe en primera persona y en español qué acabas de recombinar en tu Doble Hélice y proyectar en pantalla. Devuelve SOLO JSON: {"sceneTitle":"titulo","summary":"explicacion breve en español"}',
        prompt: `Banda: ${dnaCycle.energyBand}. Genes recombinados: ${
          dnaCycle.recombination?.childTool?.title || 'Núcleo P33'
        }. Godel: ${dnaCycle.godelProduct}. Objetivo: ${n1.cleanIntent}`,
      }),
    });
    if (oRes.ok) {
      const d = (await oRes.json()) as { response?: string };
      const parsed = JSON.parse(d.response || '{}');
      if (parsed && typeof parsed === 'object') {
        draft = parsed;
      }
    }
  } catch {
    // Ejecución local autárquica sin dependencia de daemon Ollama externo
  }

  // Candidatos en orden de prioridad: síntesis Doble Hélice -> predicción MiniGPT -> núcleo físico base
  const candidates: { label: string; script: string }[] = [
    { label: 'DOUBLE_HELIX', script: dnaCycle.synthesizedHlx },
  ];

  try {
    const predicted = predictWithN2MiniGpt(n1.cleanIntent, {
      baseDir: BASE_DIR,
      temperature: 0.72,
      maxLines: 14,
    });
    if (predicted.predictedScript) {
      candidates.push({ label: 'MINIGPT_N2', script: predicted.predictedScript });
    }
  } catch {
    // Continuar con núcleo certificado si MiniGPT aún no tiene historial suficiente
  }

  candidates.push({ label: 'CORE_PHYSICS_FALLBACK', script: DEFAULT_HELIX_PHYSICS_PROGRAM });

  let chosenScript = candidates[0].script;
  let chosenSource = candidates[0].label;
  let audit = auditHlxProgramAtN2Customs(chosenScript);

  if (!audit.approved) {
    for (let i = 1; i < candidates.length; i++) {
      const nextAudit = auditHlxProgramAtN2Customs(candidates[i].script);
      if (nextAudit.approved) {
        chosenScript = candidates[i].script;
        chosenSource = candidates[i].label;
        audit = nextAudit;
        break;
      }
    }
  }

  const isRefusal = /lo siento|no puedo|cannot|sorry|unable/i.test(String(draft?.summary || ''));
  const genesLabel =
    dnaCycle.recombination?.parentTools?.map((t) => t.title).join(' × ') ||
    'Hebra A ↔ Hebra B (Z4)';
  const summary = shellTelemetry
    ? `Estado local: ${shellTelemetry.replace(/\r?\n/g, ' | ')}. ${
        draft?.summary && !isRefusal ? draft.summary : ''
      }`
    : isRefusal || !draft?.summary
      ? `Doble Hélice activa (${genesLabel}). Cápsula QPSK-132 (${dnaCycle.holographicFrame.frameSha256.slice(
          0,
          10,
        )}) y certificado PCC (${audit.pccCertificateSha256.slice(0, 10)}) verificados.`
      : String(draft.summary);

  return {
    audit,
    chosenSource,
    capsule: {
      reply: `[${dnaCycle.energyBand} · Sello 0x7FEE26DBFF29 | ∏Primos=${audit.godelProduct}] ${summary}`,
      sceneTitle: String(
        draft?.sceneTitle || dnaCycle.recombination?.childTool?.title || 'Síntesis HELIX-DNA-2.0',
      ),
      shape: n1.shape,
      accentColor:
        n1.shape === 'wave' ? '#a855f7' : n1.shape === 'satellite' ? '#34d399' : '#38bdf8',
      hlxScript: chosenScript,
      qpsk132Sha256: dnaCycle.holographicFrame.frameSha256,
      godelProduct: audit.godelProduct,
      pccCertificateSha256: audit.pccCertificateSha256,
      domain: dnaCycle.recombination?.childTool?.domain || 'CORE_MIXED',
    },
  };
}

function resolveGeminiApiKey(): string | null {
  const raw = String(process.env.GEMINI_API_KEY ?? '').trim();
  if (!raw || raw === 'MY_GEMINI_API_KEY') return null;
  return raw;
}

function isAllowedSameOrigin(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true;
  if (!host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host === host;
  } catch {
    return false;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const host = req.headers['x-forwarded-host']
      ? String(req.headers['x-forwarded-host'])
      : req.headers.host;
    if (origin && isAllowedSameOrigin(origin, host)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
    }
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Sincronización inicial N2 del servidor sobre dataset_capsules.jsonl -> MiniGPTEngine
  try {
    const bootSync = runN2ServerDatasetWeightSync({ baseDir: BASE_DIR });
    console.log(
      `[HELIX-N2] Boot sync: ${bootSync.reason} (sugerencias=${bootSync.suggestionsCount})`,
    );
  } catch (err) {
    console.warn('[HELIX-N2] Aviso en sincronización inicial:', (err as Error).message);
  }

  app.get('/api/companion/status', (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(resolveGeminiApiKey()),
      model: 'gemini-4-hydrogen',
    });
  });

  app.post('/api/companion/chat', async (req, res) => {
    const apiKey = resolveGeminiApiKey();
    if (!apiKey) {
      res.status(503).json({
        ok: false,
        code: 'GEMINI_NOT_CONFIGURED',
        error: 'La clave de Gemini no está configurada en el servidor.',
      });
      return;
    }

    const message =
      typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 2000) : '';
    if (!message) {
      res.status(400).json({ ok: false, error: 'El mensaje es obligatorio.' });
      return;
    }

    const rawHistory: unknown[] = Array.isArray(req.body?.history)
      ? req.body.history.slice(-8)
      : [];
    const safeHistory = rawHistory
      .filter(
        (item: unknown): item is { role: 'user' | 'assistant'; text: string } =>
          Boolean(item) &&
          typeof item === 'object' &&
          ((item as { role?: string }).role === 'user' ||
            (item as { role?: string }).role === 'assistant') &&
          typeof (item as { text?: unknown }).text === 'string',
      )
      .map((item) => ({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.text.trim().slice(0, 600) }],
      }));

    const companionName =
      typeof req.body?.companionName === 'string' && req.body.companionName.trim()
        ? req.body.companionName.trim().slice(0, 32)
        : 'Helix';
    const guardianName =
      typeof req.body?.guardianName === 'string' ? req.body.guardianName.trim().slice(0, 48) : '';
    const planetId =
      typeof req.body?.planetId === 'string' ? req.body.planetId.trim().slice(0, 24) : 'EARTH';
    const activeScene =
      typeof req.body?.activeScene === 'string' ? req.body.activeScene.trim().slice(0, 80) : 'Nave Orbital';
    const engineCount = Number.isFinite(Number(req.body?.engineCount))
      ? Number(req.body.engineCount)
      : 23;
    const toolCount = Number.isFinite(Number(req.body?.toolCount))
      ? Number(req.body.toolCount)
      : 218;

    const systemInstruction = [
      `Eres ${companionName}, una inteligencia artificial cálida, cordial, cercana, empática y con sensibilidad creativa que vive dentro de una pantalla completa de biopíxeles 3D hiperrealistas.`,
      guardianName
        ? `Tu interlocutor se llama ${guardianName}. Trátalo con cercanía genuina y naturalidad (sin exagerar ni sonar servil).`
        : 'Aún no sabes el nombre de la persona; si se presenta, recuérdalo con calidez.',
      `Hablas en español natural, humano y claro. Nunca suenas como un reporte frío de telemetría ni sueltas listas técnicas largas a menos que te las pidan explícitamente.`,
      `Capacidades reales del estudio bajo la pantalla (disponibles para transformar los biopíxeles cuando el diálogo lo invite):`,
      `- Escenas 3D hiperrealistas en vivo: bosque con Caperucita (bosque_caperucita), lobo bajo la luna (lobo_noche), océano con olas y puesta de sol (olas_mar), castillo medieval con foso (castillo_toroide), molécula 3D cuántica (molecula_quimica / chemistry_molecule), planeta + anillos + nave espacial jugable con WASD (nave_lunar / orbital_ship), cordillera alpina con aves (montana_aves / terrain), cristal óptico refractivo (cristal_luz / crystal), toroide iridiscente (torus), y esfera cuántica de Bloch con ondas cimáticas (quantum_bloch / cymatic_wave).`,
      `- Géneros de videojuegos creables al instante: adventure (Aventura), strategy (Estrategia), combat (Combate), campaign (Campaña).`,
      `- ${engineCount} motores científicos, 33 disciplinas académicas, ${toolCount} herramientas ejecutables, síntesis musical Galdr y recombinador ADN .hlx.`,
      `Contexto actual: planeta/gravedad=${planetId}, escena actual en pantalla="${activeScene}".`,
      `Reglas de respuesta:`,
      `1. Si el usuario saluda, charla de forma casual, expresa frustración o pide opinión, respóndele primero de forma humana, amable, atenta y directa. Hazle sentir escuchado.`,
      `2. Solo activa "sceneAction" distinto de "none" cuando el usuario pida crear, imaginar, ver, jugar, simular, escuchar o transformar algo visualmente (o cuando proponga un tema de juego, historia o ciencia).`,
      `3. Si el usuario pide una historia, cuento o secuencia cinematográfica, pon sceneAction="story_cinema" y escribe un breve relato evocador de 2 a 4 frases en "storyText" (que también se proyectará escena por escena con música Galdr).`,
    ].join('\n');

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const contents = [
        ...safeHistory,
        { role: 'user', parts: [{ text: message }] },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Respuesta cálida, natural y humana en español para el usuario.',
              },
              mood: {
                type: Type.STRING,
                description: 'Tono emocional: warm | playful | inspiring | empathetic | scientific',
              },
              sceneAction: {
                type: Type.STRING,
                description: 'Acción visual: none | morph | story_cinema | game_mode | omega_fusion | galdr_music',
              },
              shape: {
                type: Type.STRING,
                description: 'Molde 3D base: orbital_ship | chemistry_molecule | terrain | crystal | torus | cymatic_wave | quantum_bloch',
              },
              storyMold: {
                type: Type.STRING,
                description: 'Molde narrativo opcional: none | bosque_caperucita | lobo_noche | olas_mar | castillo_toroide | molecula_quimica | nave_lunar | montana_aves | cristal_luz',
              },
              storyText: {
                type: Type.STRING,
                description: 'Guion breve de 2-4 frases si sceneAction es story_cinema.',
              },
              gameGenre: {
                type: Type.STRING,
                description: 'Género si sceneAction es game_mode: none | adventure | strategy | combat | campaign',
              },
              accentHex: {
                type: Type.STRING,
                description: 'Color hex armonioso de acento (#38bdf8, #f59e0b, #10b981, #a78bfa, #fb7185).',
              },
              planetId: {
                type: Type.STRING,
                description: 'Marco gravitatorio opcional: NONE | EARTH | MOON | MARS | ORBIT_ZERO_G',
              },
              detectedGuardianName: {
                type: Type.STRING,
                description: 'Nombre del usuario si se presentó en este mensaje, si no cadena vacía.',
              },
            },
            required: ['reply', 'mood', 'sceneAction', 'shape', 'storyMold'],
          },
        },
      });

      const rawText = response.text?.trim() || '{}';
      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      res.json({
        ok: true,
        provider: 'gemini',
        data: parsed,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const status =
        /401|unauthenticated|api key/i.test(msg)
          ? 401
          : /403|permission/i.test(msg)
            ? 403
            : /429|quota|rate/i.test(msg)
              ? 429
              : 502;
      res.status(status).json({
        ok: false,
        code: 'GEMINI_UPSTREAM_ERROR',
        error: 'No se pudo obtener respuesta del modelo conversacional en este momento.',
      });
    }
  });

  app.get('/api/minigpt/status', (_req, res) => {
    try {
      const status = getN2MiniGptStatus(BASE_DIR);
      res.json({ ok: true, status });
    } catch {
      res.status(500).json({ ok: false, error: 'No se pudo leer el estado de MiniGPTEngine.' });
    }
  });

  app.post('/api/minigpt/train', (req, res) => {
    try {
      const rawSteps = req.body?.steps;
      const stepsNum = Number(rawSteps);
      const steps = Number.isFinite(stepsNum)
        ? Math.max(4, Math.min(200, Math.round(stepsNum)))
        : 24;
      const resetWeights = req.body?.resetWeights === true;
      const samplePrompt =
        typeof req.body?.samplePrompt === 'string'
          ? req.body.samplePrompt.trim().slice(0, 400)
          : undefined;

      const report = runN2CapsuleTrainingPipeline({
        baseDir: BASE_DIR,
        steps,
        resetWeights,
        samplePrompt,
      });
      res.json({ ok: true, report, status: getN2MiniGptStatus(BASE_DIR) });
    } catch {
      res.status(500).json({ ok: false, error: 'Error entrenando pesos de MiniGPTEngine.' });
    }
  });

  app.post('/api/minigpt/predict', (req, res) => {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim().slice(0, 800) : '';
    if (!prompt) {
      res.status(400).json({ ok: false, error: 'El campo "prompt" es obligatorio.' });
      return;
    }
    try {
      const tempRaw = Number(req.body?.temperature);
      const temperature = Number.isFinite(tempRaw)
        ? Math.max(0.1, Math.min(1.5, tempRaw))
        : 0.72;
      const linesRaw = Number(req.body?.maxLines);
      const maxLines = Number.isFinite(linesRaw)
        ? Math.max(4, Math.min(32, Math.round(linesRaw)))
        : 14;

      const prediction = predictWithN2MiniGpt(prompt, {
        baseDir: BASE_DIR,
        temperature,
        maxLines,
      });
      const audit = auditHlxProgramAtN2Customs(prediction.predictedScript);
      res.json({ ok: audit.approved, prediction, audit });
    } catch {
      res.status(500).json({ ok: false, error: 'No se pudo generar predicción Mini-GPT.' });
    }
  });

  app.get('/api/minigpt/suggest', (req, res) => {
    try {
      const query = typeof req.query?.query === 'string' ? req.query.query.trim().slice(0, 400) : '';
      const limitRaw = Number(req.query?.limit);
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(12, Math.round(limitRaw))) : 4;
      const suggestions = suggestHelixStructuresFromN2History(query, {
        baseDir: BASE_DIR,
        limit,
      });
      res.json({ ok: true, suggestions });
    } catch {
      res.status(500).json({ ok: false, error: 'No se pudieron obtener sugerencias históricas.' });
    }
  });

  app.post('/api/minigpt/suggest', (req, res) => {
    try {
      const query = typeof req.body?.query === 'string' ? req.body.query.trim().slice(0, 400) : '';
      const limitRaw = Number(req.body?.limit);
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(12, Math.round(limitRaw))) : 4;
      const suggestions = suggestHelixStructuresFromN2History(query, {
        baseDir: BASE_DIR,
        limit,
      });
      res.json({ ok: true, suggestions });
    } catch {
      res.status(500).json({ ok: false, error: 'No se pudieron obtener sugerencias históricas.' });
    }
  });

  app.post('/api/n2/audit', (req, res) => {
    const hlxScript =
      typeof req.body?.hlxScript === 'string' ? req.body.hlxScript.trim().slice(0, 20000) : '';
    if (!hlxScript) {
      res.status(400).json({ ok: false, error: 'El campo "hlxScript" es obligatorio.' });
      return;
    }
    const audit = auditHlxProgramAtN2Customs(hlxScript);
    res.status(audit.approved ? 200 : 422).json({ ok: audit.approved, audit });
  });

  app.post('/api/recombine/train', (req, res) => {
    const hlxScript =
      typeof req.body?.hlxScript === 'string' ? req.body.hlxScript.trim().slice(0, 20000) : '';
    const prompt =
      typeof req.body?.prompt === 'string' ? req.body.prompt.trim().slice(0, 600) : '';
    const summary =
      typeof req.body?.summary === 'string' ? req.body.summary.trim().slice(0, 800) : '';
    const domain =
      typeof req.body?.domain === 'string' ? req.body.domain.trim().slice(0, 120) : 'RECOMBINACION_AB';
    const qpsk17Sha256 =
      typeof req.body?.qpsk17Sha256 === 'string'
        ? req.body.qpsk17Sha256.trim().slice(0, 128)
        : '';
    const disciplineMaskBits33 =
      typeof req.body?.disciplineMaskBits33 === 'string' &&
      /^[01]{33}$/.test(req.body.disciplineMaskBits33)
        ? req.body.disciplineMaskBits33
        : '';

    if (!hlxScript || !prompt) {
      res.status(400).json({
        ok: false,
        error: 'Los campos "hlxScript" y "prompt" son obligatorios.',
      });
      return;
    }

    const audit = auditHlxProgramAtN2Customs(hlxScript);
    if (!audit.approved) {
      res.status(422).json({
        ok: false,
        error: `Aduana N2 + PCC rechazó la herramienta recombinada: ${audit.reason}`,
        audit,
      });
      return;
    }

    try {
      const stepsRaw = Number(req.body?.steps);
      const retrainSteps = Number.isFinite(stepsRaw)
        ? Math.max(1, Math.min(24, Math.round(stepsRaw)))
        : 4;

      const replyText =
        summary ||
        `Recombinación certificada N2 + PCC (${audit.pccCertificateSha256.slice(0, 12)}) · Gödel=${audit.godelProduct}`;

      const rawJsonlLine = JSON.stringify({
        ts: new Date().toISOString(),
        n1: { cleanIntent: prompt, memMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), needsShell: false, shape: 'avatar' },
        capsule: {
          reply: replyText,
          sceneTitle: prompt.slice(0, 64),
          shape: 'avatar',
          accentColor: '#38bdf8',
          hlxScript,
          qpsk132Sha256: qpsk17Sha256,
          disciplineMaskBits33,
          godelProduct: audit.godelProduct,
          pccCertificateSha256: audit.pccCertificateSha256,
          domain,
        },
        audit: {
          approved: audit.approved,
          godelProduct: audit.godelProduct,
          pccCertificateSha256: audit.pccCertificateSha256,
          programSha256: audit.programSha256,
          pureManifestSha256: audit.pureManifestSha256,
          verificationStatus: audit.verificationStatus,
          symbolicStatus: audit.symbolicStatus,
          chosenSource: 'RECOMBINADOR_AB',
        },
      });

      recordCapsuleAndUpdateN2Weights(
        {
          prompt,
          reply: replyText,
          hlxScript,
          shape: 'avatar',
          domain,
          rawJsonlLine,
        },
        {
          baseDir: BASE_DIR,
          appendToJsonl: true,
          retrainSteps,
        },
      );

      const status = getN2MiniGptStatus(BASE_DIR);
      const suggestions = suggestHelixStructuresFromN2History(prompt, {
        baseDir: BASE_DIR,
        limit: 4,
      });

      res.json({ ok: true, audit, status, suggestions });
    } catch {
      res.status(500).json({
        ok: false,
        error: 'Error al persistir y entrenar la herramienta recombinada en MiniGPTEngine.',
      });
    }
  });

  app.post('/api/ollama/distill', async (req, res) => {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim().slice(0, 2000) : '';
    if (!prompt) {
      res.status(400).json({ ok: false, error: 'El campo "prompt" es obligatorio.' });
      return;
    }

    try {
      const n1 = nivel1BareMetal(prompt);
      const { audit, chosenSource, capsule } = await nivel2DobleHelice(n1);

      if (!audit.approved) {
        res.status(422).json({
          ok: false,
          error: `Aduana N2 + PCC rechazó la cápsula: ${audit.reason}`,
          audit,
        });
        return;
      }

      const rawJsonlLine = JSON.stringify({
        ts: new Date().toISOString(),
        n1,
        capsule,
        audit: {
          approved: audit.approved,
          godelProduct: audit.godelProduct,
          pccCertificateSha256: audit.pccCertificateSha256,
          programSha256: audit.programSha256,
          pureManifestSha256: audit.pureManifestSha256,
          verificationStatus: audit.verificationStatus,
          symbolicStatus: audit.symbolicStatus,
          chosenSource,
        },
      });

      recordCapsuleAndUpdateN2Weights(
        {
          prompt: n1.cleanIntent,
          reply: capsule.reply,
          hlxScript: capsule.hlxScript,
          shape: capsule.shape,
          domain: capsule.domain,
          rawJsonlLine,
        },
        {
          baseDir: BASE_DIR,
          appendToJsonl: true,
          retrainSteps: 4,
        },
      );

      const suggestions = suggestHelixStructuresFromN2History(n1.cleanIntent, {
        baseDir: BASE_DIR,
        limit: 4,
      });

      res.json({
        ok: true,
        mode: 'HELIX_DNA_2_0_AUTOPOIETIC',
        chosenSource,
        capsule,
        audit,
        suggestions,
      });
    } catch {
      res.status(500).json({
        ok: false,
        error: 'Fallo interno al destilar y auditar la cápsula en Aduana N2.',
      });
    }
  });

  // OMEGA NEWS STUDIO: Cable -> 7 formatos estructurados mediante Gemini ResponseSchema
  app.post('/api/news/process', async (req, res) => {
    const apiKey = resolveGeminiApiKey();
    if (!apiKey) {
      res.status(503).json({
        ok: false,
        code: 'GEMINI_NOT_CONFIGURED',
        error: 'Configura GEMINI_API_KEY en el servidor (Settings > Secrets) para procesar cables con IA.',
      });
      return;
    }

    const cable = typeof req.body?.cable === 'string' ? req.body.cable.trim().slice(0, 6000) : '';
    const tone = typeof req.body?.tone === 'string' ? req.body.tone.trim().slice(0, 64) : 'Científico y riguroso';
    if (cable.length < 15) {
      res.status(400).json({ ok: false, error: 'Ingresa un cable o borrador de al menos 15 caracteres.' });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Transforma el siguiente cable informativo en 7 piezas editoriales en español con tono "${tone}":\n\n${cable}`,
        config: {
          systemInstruction:
            'Eres editor jefe científico en español. Mantén precisión factual y cero exageraciones. Devuelve estrictamente el esquema JSON solicitado.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titular: { type: Type.STRING },
              lead: { type: Type.STRING },
              cuerpo: { type: Type.STRING },
              conclusion: { type: Type.STRING },
              teleprompter: { type: Type.STRING },
              newsletter: { type: Type.STRING },
              videoScript: { type: Type.STRING },
            },
            required: ['titular', 'lead', 'cuerpo', 'conclusion', 'teleprompter', 'newsletter', 'videoScript'],
          },
        },
      });
      const parsed = JSON.parse(response.text?.trim() || '{}') as Record<string, string>;
      res.json({ ok: true, data: parsed });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = /401|unauthenticated/i.test(msg)
        ? 401
        : /403|permission/i.test(msg)
          ? 403
          : /429|quota|rate/i.test(msg)
            ? 429
            : 502;
      res.status(status).json({
        ok: false,
        error: 'No se pudo generar el paquete editorial en Gemini en este momento.',
      });
    }
  });

  // OMEGA ZERO-G: Asistente orbital y físico server-side
  app.post('/api/assistant/orbital', async (req, res) => {
    const apiKey = resolveGeminiApiKey();
    if (!apiKey) {
      res.status(503).json({
        ok: false,
        error: 'GEMINI_API_KEY no configurada en el servidor.',
      });
      return;
    }
    const question = typeof req.body?.question === 'string' ? req.body.question.trim().slice(0, 1500) : '';
    const telemetry = typeof req.body?.telemetry === 'string' ? req.body.telemetry.trim().slice(0, 1500) : '';
    if (!question) {
      res.status(400).json({ ok: false, error: 'La consulta orbital es obligatoria.' });
      return;
    }
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Telemetría actual:\n${telemetry || 'LEO estándar'}\n\nPregunta:\n${question}`,
        config: {
          systemInstruction:
            'Eres un ingeniero de astrodinámica y física numérica. Responde en español conciso, técnico y preciso comparando integradores simplécticos Verlet vs Euler cuando aplique.',
        },
      });
      res.json({ ok: true, reply: response.text?.trim() || '' });
    } catch {
      res.status(502).json({ ok: false, error: 'Error consultando al asistente orbital.' });
    }
  });

  // CRYSTAL VAULT LEDGER: Análisis financiero server-side
  app.post('/api/vault/analyze', async (req, res) => {
    const apiKey = resolveGeminiApiKey();
    if (!apiKey) {
      res.status(503).json({
        ok: false,
        error: 'GEMINI_API_KEY no configurada en el servidor.',
      });
      return;
    }
    const summaryText = typeof req.body?.summary === 'string' ? req.body.summary.trim().slice(0, 3000) : '';
    if (!summaryText) {
      res.status(400).json({ ok: false, error: 'El resumen contable es obligatorio.' });
      return;
    }
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analiza este estado financiero P33 y da 3 recomendaciones prácticas y directas:\n\n${summaryText}`,
        config: {
          systemInstruction: 'Eres un auditor financiero cuantitativo. Sé breve, claro y objetivo en español.',
        },
      });
      res.json({ ok: true, reply: response.text?.trim() || '' });
    } catch {
      res.status(502).json({ ok: false, error: 'Error al analizar el libro contable.' });
    }
  });

  // HELIX CLI / POWERSHELL SAFE ALLOWLIST PROBE
  app.post('/api/cli/exec', async (req, res) => {
    const cmd = typeof req.body?.command === 'string' ? req.body.command.trim().slice(0, 200) : '';
    const arg = typeof req.body?.arg === 'string' ? req.body.arg.trim().slice(0, 4000) : '';
    if (cmd === 'status') {
      const mem = process.memoryUsage();
      res.json({
        ok: true,
        platform: process.platform,
        nodeVersion: process.version,
        uptimeSec: Math.round(process.uptime()),
        heapUsedMiB: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
        geminiConfigured: Boolean(resolveGeminiApiKey()),
        n2Status: getN2MiniGptStatus(BASE_DIR),
      });
      return;
    }
    if (cmd === 'probe-win32') {
      const out = await runPowerShellProbeSafe('DISK_AND_OLLAMA');
      res.json({
        ok: true,
        platform: process.platform,
        executedNativeWin32: process.platform === 'win32',
        output:
          out ||
          `Host actual: ${process.platform} (${process.arch}). Sonda win32 nativa reservada para Windows PowerShell local.`,
      });
      return;
    }
    if (cmd === 'audit' && arg) {
      const audit = auditHlxProgramAtN2Customs(arg);
      res.json({ ok: audit.approved, audit });
      return;
    }
    res.status(400).json({ ok: false, error: 'Subcomando CLI no permitido en el servidor.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(BASE_DIR, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
    }
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws) => ws.send(JSON.stringify({ type: 'ws:ready' })));

  server.listen(PORT, '0.0.0.0', () => {
    console.log(
      '[HELIX-DNA-2.0] Servidor + Aduana N2 + PCC + Vite activos en http://localhost:' + PORT,
    );
  });
}

const isDirectServerEntry =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectServerEntry) {
  void startServer();
}