import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { estimateGcode }=M as any; describe('388',()=>it('prepared reference case',()=>{ expect(estimateGcode('G1 X60 F60').timeSec).toBeCloseTo(60) }));
