import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { decodeSmd }=M as any; describe('382',()=>it('prepared reference case',()=>{ expect(decodeSmd('472')).toBe(4700) }));
