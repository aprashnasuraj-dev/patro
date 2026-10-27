import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { cupsToGrams }=M as any; describe('393',()=>it('prepared reference case',()=>{ expect(cupsToGrams(2,120)).toBe(240) }));
