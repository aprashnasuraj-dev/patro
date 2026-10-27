import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { crop }=M as any; describe('392',()=>it('prepared reference case',()=>{ expect(crop(36,24,50,2.8).cf).toBeCloseTo(1) }));
