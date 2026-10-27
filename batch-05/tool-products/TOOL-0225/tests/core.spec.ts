import {describe,it,expect} from 'vitest';
import {compoundInflation} from '../src/core';
describe('TOOL-0225 known-answer and boundary plan',()=>{it('matches a simple known answer',()=>{expect(compoundInflation({initial:1000,monthly:0,years:1,annualReturnPct:0,inflationPct:0}).nominalFutureValue).toBe(1000);});it.todo('rejects malformed and out-of-domain inputs');it.todo('covers zero/near-zero and upper bounds');it.todo('verifies output formatting and rounding semantics');});
