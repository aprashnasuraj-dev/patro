import {describe,it,expect} from 'vitest';
import {stepUpSip} from '../src/core';
describe('TOOL-0226 known-answer and boundary plan',()=>{it('matches a simple known answer',()=>{expect(stepUpSip({initialPrincipal:0,monthlyContribution:100,annualStepPct:0,annualReturnPct:0,years:1}).endingValue).toBe(1200);});it.todo('rejects malformed and out-of-domain inputs');it.todo('covers zero/near-zero and upper bounds');it.todo('verifies output formatting and rounding semantics');});
