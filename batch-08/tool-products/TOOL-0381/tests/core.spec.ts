import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { decode }=M as any; describe('381',()=>it('prepared reference case',()=>{ expect(decode(['brown','black','black','red','brown']).ohms).toBe(10000) }));
