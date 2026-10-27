import {it,expect} from 'vitest'; import {detectBpm} from '../src/core'; it('rejects too-short audio',()=>expect(()=>detectBpm(new Float32Array(100),48000)).toThrow());
