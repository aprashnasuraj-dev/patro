import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { brew }=M as any; describe('398',()=>it('prepared reference case',()=>{ expect(brew(55,1000).gPerL).toBeCloseTo(55) }));
