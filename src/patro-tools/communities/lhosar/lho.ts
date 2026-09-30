/**
 * "Which lho (animal year) am I?" for Tamang, Gurung and Tibetan/Sherpa systems.
 * Year boundaries: Sonam Lhosar (Tamang), Tamu Lhosar Poush 15 (Gurung), Gyalpo Lhosar (Sherpa/Tibetan).
 */
import { animalOf, elementOf, eraYear } from '../shared/cycles';
import { ruleDates, type ResolveOptions } from '../shared/resolve';
import { LHOSAR } from './data';

const ny = (id: string, gy: number, opts?: ResolveOptions) =>
  ruleDates(LHOSAR.festivals.find((f) => f.id === id)!.rule, gy, LHOSAR, opts)[0]?.date;

export function lhoFor(iso: string, opts: ResolveOptions = {}) {
  const gy = Number(iso.slice(0, 4));
  // Tamang: new year in Jan/Feb of gy
  const tamangYear = iso >= ny('sonam-lhosar', gy, opts) ? gy : gy - 1;
  // Tibetan/Sherpa: new year in Feb/Mar of gy
  const tibYear = iso >= ny('gyalpo-lhosar', gy, opts) ? gy : gy - 1;
  // Gurung: new year on Poush 15 (≈ 30 Dec of gy) starts the lho of gy+1
  const gurungYear = iso >= ny('tamu-lhosar', gy, opts) ? gy + 1 : gy;
  return {
    tamang: { ...animalOf('tamang', tamangYear), era: eraYear('tamang', tamangYear) },
    tibetan: { ...animalOf('tibetan', tibYear), element: elementOf(tibYear), era: eraYear('tibetan', tibYear) },
    gurung: { ...animalOf('gurung', gurungYear) },
  };
}
