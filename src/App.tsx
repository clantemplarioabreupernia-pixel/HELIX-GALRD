import { useState } from 'react';
import { AiProtocolView } from './components/AiProtocolView';
import { AiStudioWorkspace } from './components/AiStudioWorkspace';
import { CoreEngineStudioView } from './components/CoreEngineStudioView';

type StudioMode = 'workspace' | 'core' | 'protocol';

export default function App() {
  const [mode, setMode] = useState<StudioMode>('workspace');

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2 text-xs">
        <div className="flex items-center gap-2 font-mono font-bold tracking-wider text-sky-400">
          <span>HELIX-GALRD</span>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-emerald-400">N1 → N2 → N3 · P33</span>
        </div>
        <nav className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setMode('workspace')}
            className={mode === 'workspace' ? 'rounded bg-sky-500 px-3 py-1 font-semibold text-slate-950' : 'rounded bg-slate-800 px-3 py-1 text-slate-300 hover:bg-slate-700'}
          >
            Consola & Membrana Líquida
          </button>
          <button
            type="button"
            onClick={() => setMode('core')}
            className={mode === 'core' ? 'rounded bg-emerald-400 px-3 py-1 font-semibold text-slate-950' : 'rounded bg-slate-800 px-3 py-1 text-slate-300 hover:bg-slate-700'}
          >
            Estudio & Recombinador (159 Células)
          </button>
          <button
            type="button"
            onClick={() => setMode('protocol')}
            className={mode === 'protocol' ? 'rounded bg-violet-400 px-3 py-1 font-semibold text-slate-950' : 'rounded bg-slate-800 px-3 py-1 text-slate-300 hover:bg-slate-700'}
          >
            Protocolo P33 · Gödel & Mini-GPT
          </button>
        </nav>
      </header>
      <main className="min-h-0 flex-1 overflow-auto">
        {mode === 'workspace' && <AiStudioWorkspace />}
        {mode === 'core' && <CoreEngineStudioView />}
        {mode === 'protocol' && <AiProtocolView />}
      </main>
    </div>
  );
}