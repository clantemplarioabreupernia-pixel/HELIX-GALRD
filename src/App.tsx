import { useState } from 'react';
import { PlanetaryFrameId } from './core/helixAutodidactLoop';
import { AiStudioWorkspace } from './components/AiStudioWorkspace';

export default function App() {
  const [planetId, setPlanetId] = useState<PlanetaryFrameId>('EARTH');

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#040812] text-slate-100">
      <AiStudioWorkspace
        planetId={planetId}
        onChangePlanet={setPlanetId}
      />
    </main>
  );
}
