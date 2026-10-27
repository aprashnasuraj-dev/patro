import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { analyze }=M as any; describe('389',()=>it('prepared reference case',()=>{ expect(analyze([[[0,0,0],[1,0,0],[0,1,0]]],1).triangles).toBe(1) }));
