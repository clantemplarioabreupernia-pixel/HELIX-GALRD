import { useEffect, useState } from 'react';
import { Activity, Cpu, Film, Mic, Mountain, Sparkles } from 'lucide-react';
import { AiStudioWorkspace, HologramProjectionPayload } from './components/AiStudioWorkspace';
import { HelixMusicVoiceStudio } from './components/HelixMusicVoiceStudio';
import { HelixCinemaRecorderView } from './components/HelixCinemaRecorderView';
import { LiquidMorphShape } from './components/LiquidBiopixelCanvas';
import { DEFAULT_HELIX_PRODUCTION, HelixCineProductionScript } from './core/helixProductionScript';

type VistaActiva = 'estudio' | 'audio' | 'cine';

export default function App() {
  const [vista, setVista] = useState<VistaActiva>('estudio');
  const [script, setScript] = useState<HelixCineProductionScript>(DEFAULT_HELIX_PRODUCTION);
  const [motorGoActivo, setMotorGoActivo] = useState<boolean>(false);

  // Proyección maestra inicial: Pantalla Líquida de Montañas y Aves acoplada a Cauchy + Brus
  const [proyeccion, setProyeccion] = useState<HologramProjectionPayload>({
    id: 1,
    hlxScript: 'TERRAIN_CAUCHY_BRUS_6FACES',
    title: 'Pantalla Líquida HELIX · Montañas y Aves',
    subtitle: 'Física Viscoelástica de Cauchy + BioPíxeles Cúbicos (6 Caras) + Espectro Brus',
    shape: 'terrain',
    accentHex: '#38bdf8',
  });

  // Verificar latido del motor nativo en Go (puerto 8090)
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('ws://localhost:8090/ws');
      ws.onopen = () => setMotorGoActivo(true);
      ws.onclose = () => setMotorGoActivo(false);
      ws.onerror = () => setMotorGoActivo(false);
    } catch {
      setMotorGoActivo(false);
    }
    return () => {
      if (ws) ws.close();
    };
  }, []);

  const cambiarEntornoLiquido = (forma: LiquidMorphShape, titulo: string, colorHex: string) => {
    setVista('estudio');
    setProyeccion({
      id: Date.now(),
      hlxScript: `ENTORNO_${forma.toUpperCase()}`,
      title: titulo,
      subtitle: 'Sincronizado con Núcleo Viscoelástico HELIX',
      shape: forma,
      accentHex: colorHex,
    });
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#05080f] text-slate-100">
      {/* Barra Superior Maestra Estilo AI Studio en Español */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800/80 bg-[#080d18] px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-bold tracking-wider text-slate-100">HELIX</span>
            <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300 border border-sky-500/30">
              AI ESTUDIO
            </span>
          </div>

          {/* Indicador en vivo del motor Go (Cauchy + 6 Caras) */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-0.5 text-[11px]">
            <Activity className={`h-3 w-3 ${motorGoActivo ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            <span className={motorGoActivo ? 'text-emerald-300' : 'text-slate-400'}>
              {motorGoActivo ? 'Motor Go Cuántico: Activo (:8090)' : 'Motor Local WebGL2: Activo'}
            </span>
          </div>
        </div>

        {/* Selectores Rápidos de Pantalla Líquida + Módulos Integrados */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => cambiarEntornoLiquido('terrain', 'Pantalla Líquida · Montañas y Aves', '#38bdf8')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              vista === 'estudio' && proyeccion.shape === 'terrain'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-300 hover:bg-slate-800/70'
            }`}
          >
            <Mountain className="h-3.5 w-3.5" />
            <span>Montañas y Aves</span>
          </button>

          <button
            type="button"
            onClick={() => setVista('estudio')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              vista === 'estudio'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-300 hover:bg-slate-800/70'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Estudio AI</span>
          </button>

          <button
            type="button"
            onClick={() => setVista('audio')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              vista === 'audio'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-300 hover:bg-slate-800/70'
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            <span>Audio y Voz</span>
          </button>

          <button
            type="button"
            onClick={() => setVista('cine')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              vista === 'cine'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-300 hover:bg-slate-800/70'
            }`}
          >
            <Film className="h-3.5 w-3.5" />
            <span>Cine</span>
          </button>
        </div>
      </header>

      {/* Área de Trabajo Principal Única */}
      <main className="relative min-h-0 flex-1 overflow-hidden">
        {vista === 'estudio' && <AiStudioWorkspace externalProjection={proyeccion} />}

        {vista === 'audio' && (
          <HelixMusicVoiceStudio
            script={script}
            onChangeScript={setScript}
            onSendToCinema={(next) => {
              setScript(next);
              setVista('cine');
            }}
          />
        )}

        {vista === 'cine' && (
          <HelixCinemaRecorderView
            script={script}
            onBackToComposer={() => setVista('audio')}
          />
        )}
      </main>
    </div>
  );
}
