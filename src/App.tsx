import { useState } from 'react';
import { ArrowLeft, Settings } from 'lucide-react';
import { AiProtocolView } from './components/AiProtocolView';
import {
  AiStudioWorkspace,
  HologramProjectionPayload,
} from './components/AiStudioWorkspace';
import { CellTemplatesSection } from './components/CellTemplatesSection';
import { CoreEngineStudioView } from './components/CoreEngineStudioView';
import { LiquidMorphShape } from './components/LiquidBiopixelCanvas';
import { MeshStudio3DView } from './components/MeshStudio3DView';
import { VmShellView } from './components/VmShellView';
import { INITIAL_COMPOUND_VOCABULARY } from './data/vocabulary';
import { DEFAULT_HELIX_CELLS, HelixCell } from './utils/helixCells';
import { DEFAULT_HELIX_PHYSICS_PROGRAM } from './utils/helixVm';

type LabViewId = 'c' | 'p' | 'cells' | 'vm' | '3d';

export default function App() {
  const [labOpen, setLabOpen] = useState<boolean>(false);
  const [labView, setLabView] = useState<LabViewId>('c');
  const [vocabulary] = useState(INITIAL_COMPOUND_VOCABULARY);
  const [cells, setCells] = useState<HelixCell[]>(() => DEFAULT_HELIX_CELLS);
  const [vmScript, setVmScript] = useState<string>(DEFAULT_HELIX_PHYSICS_PROGRAM);
  const [projectedHologram, setProjectedHologram] =
    useState<HologramProjectionPayload | null>(null);

  const handleSaveCell = (cell: HelixCell) => {
    setCells((prev) => {
      const idx = prev.findIndex((item) => item.fileName === cell.fileName);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cell;
        return next;
      }
      return [...prev, cell];
    });
  };

  const handleDeleteCell = (fileName: string) => {
    setCells((prev) => prev.filter((item) => item.fileName !== fileName));
  };

  const handleResetAllCells = () => {
    setCells(DEFAULT_HELIX_CELLS);
  };

  const handleOpenInVm = (nextScript: string) => {
    if (nextScript.trim()) {
      setVmScript(nextScript);
    }
    setLabView('vm');
    setLabOpen(true);
  };

  const handleOpenIn3DStudio = (nextScript: string) => {
    if (nextScript.trim()) {
      setVmScript(nextScript);
    }
    setLabView('3d');
    setLabOpen(true);
  };

  const handleProjectToHologram = (payload: {
    hlxScript: string;
    title: string;
    subtitle?: string;
    shape?: LiquidMorphShape;
    accentHex?: string;
  }) => {
    if (payload.hlxScript.trim()) {
      setVmScript(payload.hlxScript);
    }
    setProjectedHologram({
      id: Date.now(),
      hlxScript: payload.hlxScript,
      title: payload.title,
      subtitle: payload.subtitle,
      shape: payload.shape ?? 'avatar',
      accentHex: payload.accentHex ?? '#38bdf8',
    });
    setLabOpen(false);
  };

  const handleTestCellInVm = (sampleScriptLine: string) => {
    const program = [
      'ᛇᚢ                          # KERN_BOOT',
      'ᛗᚦ cell_verify              # AUTH_CHECK',
      sampleScriptLine.trim(),
      'ᚳᛏ                          # EXIT_OK',
    ]
      .filter(Boolean)
      .join('\n');
    setVmScript(program);
    setLabView('vm');
    setLabOpen(true);
  };

  if (!labOpen) {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
        <button
          type="button"
          onClick={() => setLabOpen(true)}
          title="Abrir modo Laboratorio para investigación e ingeniería"
          aria-label="Abrir modo Laboratorio"
          className="fixed right-4 top-4 z-30 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-md transition-colors hover:border-white/25 hover:bg-slate-900/90 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 whitespace-nowrap shrink-0"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Laboratorio</span>
        </button>

        <main className="h-full w-full">
          <AiStudioWorkspace externalProjection={projectedHologram} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <header className="flex h-14 shrink-0 items-center justify-between gap-8 border-b border-slate-800 bg-slate-900 px-5">
        <span className="font-display text-sm font-semibold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
          Helix Laboratorio
        </span>

        <nav className="flex items-center gap-4 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setLabView('c')}
            className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
              labView === 'c'
                ? 'border-sky-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-100'
            }`}
          >
            Recombinador A×B
          </button>
          <button
            type="button"
            onClick={() => setLabView('p')}
            className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
              labView === 'p'
                ? 'border-sky-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-100'
            }`}
          >
            Protocolo P33 / Mini-GPT
          </button>
          <button
            type="button"
            onClick={() => setLabView('cells')}
            className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
              labView === 'cells'
                ? 'border-sky-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-100'
            }`}
          >
            Células .hlx
          </button>
          <button
            type="button"
            onClick={() => setLabView('vm')}
            className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
              labView === 'vm'
                ? 'border-sky-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-100'
            }`}
          >
            VM &amp; Ensamblador
          </button>
          <button
            type="button"
            onClick={() => setLabView('3d')}
            className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
              labView === '3d'
                ? 'border-sky-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-100'
            }`}
          >
            Estudio 3D
          </button>
        </nav>

        <button
          type="button"
          onClick={() => setLabOpen(false)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Volver al Compañero</span>
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-auto">
        {labView === 'c' && (
          <CoreEngineStudioView
            onOpenInVm={handleOpenInVm}
            onOpenIn3DStudio={handleOpenIn3DStudio}
            onProjectToHologram={handleProjectToHologram}
          />
        )}
        {labView === 'p' && (
          <AiProtocolView
            vocabulary={vocabulary}
            cells={cells}
            onOpenInVm={handleOpenInVm}
            onOpenIn3DStudio={handleOpenIn3DStudio}
          />
        )}
        {labView === 'cells' && (
          <div className="min-h-full bg-slate-50 p-4 text-slate-900 sm:p-6">
            <CellTemplatesSection
              cells={cells}
              vocabulary={vocabulary}
              onSaveCell={handleSaveCell}
              onDeleteCell={handleDeleteCell}
              onResetAllCells={handleResetAllCells}
              onTestCellInVm={handleTestCellInVm}
            />
          </div>
        )}
        {labView === 'vm' && (
          <div className="min-h-full bg-slate-50 p-4 text-slate-900 sm:p-6">
            <VmShellView
              vocabulary={vocabulary}
              script={vmScript}
              onChangeScript={setVmScript}
              onOpenIn3DStudio={handleOpenIn3DStudio}
              cells={cells}
              onChangeCells={setCells}
              onResetCells={handleResetAllCells}
            />
          </div>
        )}
        {labView === '3d' && (
          <div className="min-h-full bg-slate-50 p-4 text-slate-900 sm:p-6">
            <MeshStudio3DView
              vocabulary={vocabulary}
              script={vmScript}
              onChangeScript={setVmScript}
            />
          </div>
        )}
      </main>
    </div>
  );
}
