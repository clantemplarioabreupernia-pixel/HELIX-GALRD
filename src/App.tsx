import { useState } from 'react';
import { PlanetaryFrameId } from './core/helixAutodidactLoop';
import { AiStudioWorkspace } from './components/AiStudioWorkspace';

export default function App() {
  const [planetId, setPlanetId] = useState<PlanetaryFrameId>('EARTH');
  const [dnaLabTrigger, setDnaLabTrigger] = useState<number>(0);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#05080f] text-slate-100">
      {/* Cabecera de 3 zonas: Marca — Gravedad Planetaria — Acceso directo al Recombinador ADN */}
      <header className="flex h-11 shrink-0 items-center justify-between gap-6 border-b border-slate-800 bg-[#080d18] px-4">
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="whitespace-nowrap font-display text-sm font-bold tracking-wider text-slate-100">
            HELIX
          </span>
          <span className="hidden text-[11px] text-slate-400 sm:inline">
            Educación · Investigación · Entretenimiento
          </span>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {(
            [
              { id: 'EARTH', label: 'Tierra · 1g' },
              { id: 'MOON', label: 'Luna · 0.165g' },
              { id: 'MARS', label: 'Marte · 0.379g' },
              { id: 'ORBIT_ZERO_G', label: 'Órbita · 0g' },
            ] as const
          ).map((env) => (
            <button
              key={env.id}
              type="button"
              onClick={() => setPlanetId(env.id)}
              className={`shrink-0 whitespace-nowrap px-3 py-1 text-xs font-medium transition-colors ${
                planetId === env.id
                  ? 'border border-sky-500/40 bg-sky-500/15 text-sky-300'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {env.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setDnaLabTrigger((n) => n + 1)}
          className="shrink-0 whitespace-nowrap border border-sky-500/40 bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-200 hover:bg-sky-500/25"
        >
          Recombinador ADN
        </button>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <AiStudioWorkspace
          planetId={planetId}
          onChangePlanet={setPlanetId}
          dnaLabTrigger={dnaLabTrigger}
        />
      </main>
    </div>
  );
}
