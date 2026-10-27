import {it,expect} from 'vitest'; import {waveform} from '../src/core'; it('returns requested buckets',()=>expect(waveform(new Float32Array(10000),320)).toHaveLength(320));
