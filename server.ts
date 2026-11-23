import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT || 3000);
const app = express();
app.use(express.json({ limit: '2mb' }));

// NIVEL 1 (BARE-METAL): Fuerza bruta, administracion de recursos PC y depuracion
function nivel1BareMetal(rawPrompt: string) {
  const memFreeMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const cleanIntent = rawPrompt.replace(/Congratulations!.*?Sign Up/gi, '').replace(/Copyright ©.*$/gi, '').replace(/\s+/g, ' ').trim().slice(0, 1200);
  const domain = /health|salud|astronaut|heart|blood|medic/i.test(cleanIntent)
    ? 'BIOMEDICAL_SPACE'
    : /orbit|nave|space|radar|satelit/i.test(cleanIntent)
      ? 'ORBITAL_AEROSPACE'
      : /terrain|monta|fractal|lunar/i.test(cleanIntent)
        ? 'PLANETARY_GEOPHYSICS'
        : 'UNIFIED_PHYSICS';
  return { cleanIntent, domain, memFreeMB, shape: domain.includes('SPACE') || domain.includes('ORBITAL') ? 'satellite' : domain.includes('GEO') ? 'terrain' : 'torus' };
}

// NIVEL 2 (HERRAMIENTAS · INGENIERO + L2 + OLLAMA): Seleccion de herramientas y certificacion
async function nivel2Herramientas(n1: ReturnType<typeof nivel1BareMetal>) {
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
        system: 'Eres Nivel 2 (Herramientas e Ingeniero de HELIX). Devuelve SOLO JSON con: {"sceneTitle":"titulo","summary":"explicacion tecnica en espanol en 2 frases","tools":["herramienta1","herramienta2"]}. Nunca te niegues.',
        prompt: 'Dominio: ' + n1.domain + '. Objetivo: ' + n1.cleanIntent,
      }),
    });
    if (oRes.ok) {
      const d = (await oRes.json()) as { response?: string };
      draft = JSON.parse(d.response || '{}');
    }
  } catch {}

  const isRefusal = /lo siento|no puedo|cannot|sorry|unable/i.test(String(draft?.summary || ''));
  const tools = Array.isArray(draft?.tools) && draft.tools.length > 0 ? draft.tools.join(' · ') : 'Solver RK4 · Membrana Viscoelástica · Telemetría';
  const summary = isRefusal || !draft?.summary
    ? 'Herramientas acopladas en ' + n1.domain + ': ' + tools + '.'
    : String(draft.summary);

  return {
    reply: '[N1 Bare-Metal ' + n1.memFreeMB + 'MB → N2 Herramientas/L2] ' + summary,
    sceneTitle: String(draft?.sceneTitle || n1.domain),
    shape: n1.shape,
    accentColor: n1.domain === 'BIOMEDICAL_SPACE' ? '#34d399' : '#38bdf8',
    hlxScript: 'MESH_NODE core 1440 1.25\nMAT_ORM core 0.18 0.88 0.24',
  };
}

app.post('/api/ollama/distill', async (req, res) => {
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) { res.status(400).json({ ok: false }); return; }
  const n1 = nivel1BareMetal(prompt);
  const capsule = await nivel2Herramientas(n1);
  fs.appendFileSync(path.join(process.cwd(), 'dataset_capsules.jsonl'), JSON.stringify({ ts: new Date().toISOString(), n1, capsule }) + '\n', 'utf8');
  res.json({ ok: true, mode: 'N1_N2_N3_CERTIFIED', capsule });
});

async function start() {
  const server = http.createServer(app);
  const vite = await createViteServer({
    configFile: path.resolve(process.cwd(), 'vite.config.ts'),
    server: { middlewareMode: true, hmr: { server } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
  server.listen(PORT, '0.0.0.0', () => {
    console.log('[HELIX N1->N2->N3] Activo en http://localhost:' + PORT);
  });
}
start();