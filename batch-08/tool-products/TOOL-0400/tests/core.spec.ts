import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { gear }=M as any; describe('400',()=>it('prepared reference case',()=>{ expect(gear(50,25,26,170,90).ratio).toBe(2) }));
