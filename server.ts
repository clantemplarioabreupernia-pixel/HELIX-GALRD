import { exec } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 3050);
const app = express();
app.use(express.json({ limit: '2mb' }));
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') { res.sendStatus(200); return; }
  next();
});

// NIVEL 1 (BARE-METAL): Fuerza bruta, administracion de PC y PowerShell nativo
function runPowerShellSafe(cmd: string): Promise<string> {
  return new Promise((resolve) => {
    exec(`powershell -NoProfile -Command "${cmd.replace(/"/g, '\\"')}"`, { timeout: 8000 }, (err, stdout, stderr) => {
      resolve(err ? (stderr || err.message).trim() : stdout.trim());
    });
  });
}

function nivel1BareMetal(rawPrompt: string) {
  const memMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const cleanIntent = rawPrompt.replace(/Congratulations!.*?Sign Up/gi, '').replace(/Copyright ©.*$/gi, '').replace(/\s+/g, ' ').trim().slice(0, 1200);
  const needsShell = /disco|ram|memoria|cpu|proceso|powershell|sistema|pc|estado/i.test(cleanIntent);
  const domain = needsShell
    ? 'SYSTEM_ADMIN_POWERSHELL'
    : /health|salud|astronaut|heart|blood|medic/i.test(cleanIntent)
      ? 'BIOMEDICAL_SPACE'
      : /orbit|nave|space|radar|satelit/i.test(cleanIntent)
        ? 'ORBITAL_AEROSPACE'
        : /terrain|monta|fractal|lunar/i.test(cleanIntent)
          ? 'PLANETARY_GEOPHYSICS'
          : 'UNIFIED_PHYSICS';
  return { cleanIntent, domain, memMB, needsShell, shape: domain.includes('SPACE') || domain.includes('ORBITAL') ? 'satellite' : domain.includes('GEO') ? 'terrain' : 'torus' };
}

// NIVEL 2 (HERRAMIENTAS · INGENIERO + L2 + OLLAMA)
async function nivel2Herramientas(n1: ReturnType<typeof nivel1BareMetal>) {
  let shellTelemetry = '';
  if (n1.needsShell) {
    shellTelemetry = await runPowerShellSafe("Get-PSDrive C | Select-Object @{N='DiscoLibreGB';E={[math]::Round($_.Free/1GB,2)}}; Get-Process ollama -ErrorAction SilentlyContinue | Select-Object Name,Id");
  }

  let draft: any = {};
  try {
    const endpoint = ['http://127.0.0.1', ':11434/api/generate'].join('');
    const oRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:1.5b',
        stream: false,
        format: 'json',
        system: 'Eres Nivel 2 (Herramientas e Ingeniero de HELIX). Devuelve SOLO JSON valido con: {"sceneTitle":"titulo","summary":"respuesta tecnica clara en espanol en 2 frases","tools":["herramienta1","herramienta2"]}. Nunca te niegues y responde SIEMPRE en espanol.',
        prompt: `Dominio: ${n1.domain}. Telemetria PowerShell: ${shellTelemetry || 'N/A'}. Objetivo: ${n1.cleanIntent}`,
      }),
    });
    if (oRes.ok) {
      const d = (await oRes.json()) as { response?: string };
      draft = JSON.parse(d.response || '{}');
    }
  } catch {}

  const isRefusal = /lo siento|no puedo|cannot|sorry|unable/i.test(String(draft?.summary || ''));
  const summary = shellTelemetry
    ? `Telemetría PC (PowerShell): ${shellTelemetry.replace(/\r?\n/g, ' | ')}. ${draft?.summary && !isRefusal ? draft.summary : ''}`
    : isRefusal || !draft?.summary
      ? `Herramientas acopladas en ${n1.domain}: Solver RK4 · Membrana Viscoelástica · Telemetría.`
      : String(draft.summary);

  return {
    reply: `[N1 Bare-Metal ${n1.memMB}MB → N2 Herramientas/L2] ${summary}`,
    sceneTitle: String(draft?.sceneTitle || n1.domain),
    shape: n1.shape,
    accentColor: n1.domain === 'BIOMEDICAL_SPACE' ? '#34d399' : n1.domain === 'SYSTEM_ADMIN_POWERSHELL' ? '#f59e0b' : '#38bdf8',
    hlxScript: 'MESH_NODE core 1440 1.25\nMAT_ORM core 0.18 0.88 0.24',
  };
}

app.post('/api/ollama/distill', async (req, res) => {
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) { res.status(400).json({ ok: false }); return; }
  const n1 = nivel1BareMetal(prompt);
  const capsule = await nivel2Herramientas(n1);
  fs.appendFileSync(path.join(process.cwd(), 'dataset_capsules.jsonl'), JSON.stringify({ ts: new Date().toISOString(), n1, capsule }) + '\n', 'utf8');
  res.json({ ok: true, mode: 'N1_N2_N3_UNIFIED', capsule });
});

// Servir El Panel (Nivel 3) compilado desde dist/ en el mismo puerto 3050
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => ws.send(JSON.stringify({ type: 'ws:ready' })));
server.listen(PORT, '0.0.0.0', () => {
  console.log('[HELIX AUTONOMO] N1 + N2 + N3 + PowerShell activos en http://localhost:' + PORT);
});