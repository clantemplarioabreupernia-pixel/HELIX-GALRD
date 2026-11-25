import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { HelixMusicVoiceStudio } from './components/HelixMusicVoiceStudio';
import { HelixCinemaRecorderView } from './components/HelixCinemaRecorderView';
import { DEFAULT_HELIX_PRODUCTION, HelixCineProductionScript } from './core/helixProductionScript';

export default function App() {
  const [screen, setScreen] = useState<'cinema' | 'audio'>('cinema');
  const [script, setScript] = useState<HelixCineProductionScript>(DEFAULT_HELIX_PRODUCTION);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#05080f] text-slate-100">
      {/* Único cambio directo entre las 2 pantallas */}
      <button
        type="button"
        onClick={() => setScreen(screen === 'cinema' ? 'audio' : 'cinema')}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-[#05080f]/85 px-4 py-2 text-xs font-bold text-amber-300 shadow-lg backdrop-blur-md hover:border-amber-400 hover:bg-slate-900"
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
        <span>{screen === 'cinema' ? 'Ir a Creación de Audio' : 'Ir a Pantalla Cinematográfica'}</span>
      </button>

      {screen === 'cinema' ? (
        <HelixCinemaRecorderView
          script={script}
          onBackToComposer={() => setScreen('audio')}
        />
      ) : (
        <HelixMusicVoiceStudio
          script={script}
          onChangeScript={setScript}
          onSendToCinema={(next) => {
            setScript(next);
            setScreen('cinema');
          }}
        />
      )}
    </div>
  );
}
