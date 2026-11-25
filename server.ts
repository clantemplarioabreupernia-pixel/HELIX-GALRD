import { exec } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { WebSocketServer } from 'ws';
import { HARDWARE_SEAL, runDoubleHelixAutopoiesis } from './src/core/helixDoubleHelix';

const PORT = Number(process.env.PORT || 3050);
const app = express();
app.use(express.json({ limit: '2mb' }));
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') { res.sendStatus(200); return; }
  next();
});

function runPowerShellSafe(cmd: string): Promise<string> {
  return new Promise((resolve) => {
    exec(`powershell -NoProfile -Command "${cmd.replace(/"/g, '\\"')}"`, { timeout: 8000 }, (err, stdout, stderr) => {
      resolve(err ? (stderr || err.message).trim() : stdout.trim());
    });
  });
}

// NIVEL 1 (BARE-METAL): Depuracion, telemetria PC y Sello Hardware 0x7FEE26DBFF29
function nivel1BareMetal(rawPrompt: string) {
  const memMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const cleanIntent = rawPrompt.replace(/Congratulations!.*?Sign Up/gi, '').replace(/Copyright ©.*$/gi, '').replace(/\s+/g, ' ').trim().slice(0, 1200);
  const needsShell = /disco|ram|memoria|cpu|proceso|powershell|sistema|pc|estado/i.test(cleanIntent);
  const shape = /music|sonido|onda|hz|audio/i.test(cleanIntent)
    ? 'wave'
    : /orbit|nave|espac|satelit|radar/i.test(cleanIntent)
      ? 'satellite'
      : /cristal|ico/i.test(cleanIntent)
        ? 'crystal'
        : /monta|terren|lunar/i.test(cleanIntent)
          ? 'terrain'
          : 'torus';
  return { cleanIntent, memMB, needsShell, shape };
}

// NIVEL 2 (DOBLE HELICE HELIX-DNA-2.0 + ADUANA P33/GODEL + OLLAMA)
async function nivel2DobleHelice(n1: ReturnType<typeof nivel1BareMetal>) {
  let shellTelemetry = '';
  if (n1.needsShell) {
    shellTelemetry = await runPowerShellSafe("Get-PSDrive C | Select-Object @{N='DiscoLibreGB';E={[math]::Round($_.Free/1GB,2)}}; Get-Process ollama -ErrorAction SilentlyContinue | Select-Object Name,Id");
  }

  // Ejecutar ciclo autopoietico real de Doble Helice bajo Sello 0x7FEE26DBFF29
  const dnaCycle = runDoubleHelixAutopoiesis(n1.cleanIntent, HARDWARE_SEAL);

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
        system: 'Eres el motor interno HELIX-DNA-2.0. NUNCA sugieras programar afuera. Describe en primera persona y en espanol que acabas de recombinar en tu Doble Helice y proyectar en pantalla. Devuelve SOLO JSON: {"sceneTitle":"titulo","summary":"explicacion en primera persona en espanol"}',
        prompt: `Banda: ${dnaCycle.energyBand}. Genes recombinados: ${dnaCycle.recombination?.childTool?.title || 'Núcleo P33'}. Godel: ${dnaCycle.godelProduct}. Objetivo: ${n1.cleanIntent}`,
      }),
    });
    if (oRes.ok) {
      const d = (await oRes.json()) as { response?: string };
      draft = JSON.parse(d.response || '{}');
    }
  } catch {}

  const isRefusal = /lo siento|no puedo|cannot|sorry|unable/i.test(String(draft?.summary || ''));
  const genesLabel = dnaCycle.recombination?.parentTools?.map((t) => t.title).join(' × ') || 'Hebra A ↔ Hebra B (Z4)';
  const summary = shellTelemetry
    ? `Telemetría PC: ${shellTelemetry.replace(/\r?\n/g, ' | ')}. ${draft?.summary && !isRefusal ? draft.summary : ''}`
    : isRefusal || !draft?.summary
      ? `Doble Hélice activa (${genesLabel}). Ficha holográfica QPSK-132 (17B · SHA:${dnaCycle.holographicFrame.frameSha256.slice(0, 10)}) colapsada a materia sólida (τ=${dnaCycle.penroseCollapseTauSec}s).`
      : String(draft.summary);

  return {
    reply: `[${dnaCycle.energyBand} · Sello 0x7FEE26DBFF29 | ∏Primos=${dnaCycle.godelProduct}] ${summary}`,
    sceneTitle: String(draft?.sceneTitle || dnaCycle.recombination?.childTool?.title || 'Síntesis HELIX-DNA-2.0'),
    shape: n1.shape,
    accentColor: n1.shape === 'wave' ? '#a855f7' : n1.shape === 'satellite' ? '#34d399' : '#38bdf8',
    hlxScript: dnaCycle.synthesizedHlx,
    qpsk132Sha256: dnaCycle.holographicFrame.frameSha256,
    godelProduct: dnaCycle.godelProduct,
  };
}

app.post('/api/ollama/distill', async (req, res) => {
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) { res.status(400).json({ ok: false }); return; }
  const n1 = nivel1BareMetal(prompt);
  const capsule = await nivel2DobleHelice(n1);
  fs.appendFileSync(path.join(process.cwd(), 'dataset_capsules.jsonl'), JSON.stringify({ ts: new Date().toISOString(), n1, capsule }) + '\n', 'utf8');
  res.json({ ok: true, mode: 'HELIX_DNA_2_0_AUTOPOIETIC', capsule });
});

const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => ws.send(JSON.stringify({ type: 'ws:ready' })));
server.listen(PORT, '0.0.0.0', () => {
  console.log('[HELIX-DNA-2.0] Doble Helice + QPSK-132 (17B) + P33 activos en http://localhost:' + PORT);
});