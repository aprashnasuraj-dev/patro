import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { abv }=M as any; describe('397',()=>it('prepared reference case',()=>{ expect(abv(1.05,1.01).simple).toBeCloseTo(5.25) }));
