import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { decodeCap }=M as any; describe('384',()=>it('prepared reference case',()=>{ expect(decodeCap('104K').uf).toBeCloseTo(0.1) }));
