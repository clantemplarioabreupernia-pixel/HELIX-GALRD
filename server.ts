import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 3000);
const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, engine: 'HELIX-BRIDGE-OLLAMA' }));

app.post('/api/ollama/distill', async (req, res) => {
  const prompt = String(req.body?.prompt || '').trim();
  const model = String(req.body?.model || 'qwen2.5-coder:1.5b');
  if (!prompt) { res.status(400).json({ ok: false }); return; }

  try {
    const endpoint = ['http://127.0.0.1', ':11434/api/generate'].join('');
    const oRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        system: 'Eres el núcleo cognitivo puente de HELIX-GALRD. Conversa en español natural con inteligencia y precisión técnica. Si el usuario pide crear o simular algo, incluye al final un bloque JSON con {"sceneTitle":"...","shape":"torus|satellite|terrain","accentColor":"#38bdf8","hlxScript":"MESH_NODE core 1200 1.2"}.',
        prompt,
      }),
    });

    if (!oRes.ok) {
      res.json({ ok: false, mode: 'OLLAMA_OFFLINE' });
      return;
    }

    const d = (await oRes.json()) as { response?: string };
    const fullText = String(d.response || '').trim();

    let capsule: Record<string, unknown> = {
      reply: fullText,
      hlxScript: 'MESH_NODE core 1200 1.2',
      sceneTitle: 'Síntesis Cognitiva HELIX',
    };
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const cleanReply = fullText.replace(jsonMatch[0], '').trim() || parsed.reply || 'Escena sintetizada y proyectada.';
        capsule = { ...parsed, reply: cleanReply };
      } catch {
        // Mantener texto conversacional puro
      }
    }

    // Encapsular cada interacción para educar a tus IAs Bare-Metal en segundo plano
    fs.appendFileSync(
      path.join(process.cwd(), 'dataset_capsules.jsonl'),
      JSON.stringify({ ts: new Date().toISOString(), model, prompt, capsule }) + '\n',
      'utf8',
    );

    res.json({ ok: true, mode: 'OLLAMA_BRIDGE_ACTIVE', capsule });
  } catch (err) {
    res.json({ ok: false, mode: 'OLLAMA_OFFLINE', error: String(err) });
  }
});

async function boot() {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws) => ws.send(JSON.stringify({ type: 'ws:ready' })));
  server.listen(PORT, '0.0.0.0', () => {
    console.log('[Helix Bridge] Servidor + Qwen/DeepSeek activo en http://localhost:' + PORT);
  });
}
boot();