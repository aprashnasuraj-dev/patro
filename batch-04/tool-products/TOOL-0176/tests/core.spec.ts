import {it,expect} from 'vitest'; import {validateWavHeader} from '../src/core'; it('rejects junk',()=>expect(()=>validateWavHeader(new Uint8Array(64))).toThrow());
