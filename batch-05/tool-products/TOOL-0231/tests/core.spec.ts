import {describe,it,expect} from 'vitest';
import {bracketTax} from '../src/core';
describe('TOOL-0231 known-answer and boundary plan',()=>{it('matches a simple known answer',()=>{expect(bracketTax({income:20000,deductions:0,brackets:[{upTo:10000,ratePct:10},{upTo:null,ratePct:20}]}).totalTax).toBe(3000);});it.todo('rejects malformed and out-of-domain inputs');it.todo('covers zero/near-zero and upper bounds');it.todo('verifies output formatting and rounding semantics');});
