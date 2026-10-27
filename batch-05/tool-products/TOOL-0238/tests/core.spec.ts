import {describe,it,expect} from 'vitest';
import {inflationCustom} from '../src/core';
describe('TOOL-0238 known-answer and boundary plan',()=>{it('matches a simple known answer',()=>{expect(inflationCustom({amount:100,annualRatePct:10,years:1,direction:'forward'}).result).toBe(110);});it.todo('rejects malformed and out-of-domain inputs');it.todo('covers zero/near-zero and upper bounds');it.todo('verifies output formatting and rounding semantics');});
