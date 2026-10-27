import {it,expect} from 'vitest'; import {spectrogram} from '../src/core'; it('rejects non-power-of-two fft',()=>expect(()=>spectrogram(new Float32Array(10000),1000)).toThrow());
