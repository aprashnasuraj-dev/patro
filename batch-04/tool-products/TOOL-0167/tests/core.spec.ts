import {it,expect} from 'vitest'; import {planFrames} from '../src/core'; it('caps excessive frames',()=>expect(()=>planFrames(1000,.1,'png','i','o')).toThrow());
