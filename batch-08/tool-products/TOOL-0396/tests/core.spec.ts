import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { dough }=M as any; describe('396',()=>it('prepared reference case',()=>{ expect(dough(4,250,65,2,0,.2).total).toBe(1000) }));
