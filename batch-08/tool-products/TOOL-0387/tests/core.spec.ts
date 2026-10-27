import {describe,it,expect} from 'vitest';import * as M from '../src/core';
const { uart }=M as any; describe('387',()=>it('prepared reference case',()=>{ expect(uart(16000000,9600)[0].ubrr).toBeGreaterThanOrEqual(0) }));
