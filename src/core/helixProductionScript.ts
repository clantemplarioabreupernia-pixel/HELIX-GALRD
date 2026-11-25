import { FUTHORC_33 } from '../data/futhorc33';
import { GALDR_CAST_20 } from '../data/galdrCast20';
import type { LiquidMorphShape } from '../components/LiquidBiopixelCanvas';

export interface ProductionSceneBeat {
  id: string;
  castId: string;
  runeIndex: number; // 1..33
  oldEnglishLine: string;
  modernEnglishLine: string;
  durationSec: number;
  energy: number;
  tension: number;
}

export interface HelixCineProductionScript {
  title: string;
  createdAt: string;
  beats: ProductionSceneBeat[];
}

export const DEFAULT_HELIX_PRODUCTION: HelixCineProductionScript = {
  title: 'SAGA OF THE RUNIC HALL · P33',
  createdAt: new Date().toISOString(),
  beats: [
    {
      id: 'beat-1',
      castId: 'host-aldric',
      runeIndex: 4, // Os
      oldEnglishLine: 'Hwæt! Wilcuma tō þǣm healle of rīm and lēohte.',
      modernEnglishLine: 'Listen! Welcome to the hall of number and light.',
      durationSec: 4,
      energy: 0.65,
      tension: 0.4,
    },
    {
      id: 'beat-2',
      castId: 'band-torstein',
      runeIndex: 17, // Tir
      oldEnglishLine: 'Singað mid strengum ofer þā hrimcealdan sæ!',
      modernEnglishLine: 'Sing with strings over the ice-cold sea!',
      durationSec: 5,
      energy: 0.9,
      tension: 0.85,
    },
    {
      id: 'beat-3',
      castId: 'actor-morrigan',
      runeIndex: 13, // Eoh
      oldEnglishLine: 'Wyrd bið ful ārǣd; þā rūna sprēcaþ eft.',
      modernEnglishLine: 'Fate is fully set; the runes speak once more.',
      durationSec: 4,
      energy: 0.55,
      tension: 0.6,
    },
  ],
};

export function resolveBeatMetadata(beat: ProductionSceneBeat) {
  const actor = GALDR_CAST_20.find((c) => c.id === beat.castId) ?? GALDR_CAST_20[0];
  const rune = FUTHORC_33.find((r) => r.index === beat.runeIndex) ?? FUTHORC_33[0];
  const freqHz = Number((146.83 * rune.harmonicRatio).toFixed(2)); // Base D3 Lira Sutton Hoo
  const shape: LiquidMorphShape =
    rune.envMode === 1 ? 'terrain_fbm' : rune.envMode === 2 ? 'cymatic_wave' : rune.envMode === 3 ? 'crystal' : 'avatar';
  return { actor, rune, freqHz, shape };
}

