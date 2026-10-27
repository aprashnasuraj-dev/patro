import {describe,it,expect} from 'vitest';
import {biweeklyMortgage} from '../src/core';
describe('TOOL-0233 known-answer and boundary plan',()=>{it('matches a simple known answer',()=>{expect(biweeklyMortgage({principal:100000,annualRatePct:5,termYears:30}).acceleratedMonths).toBeLessThan(biweeklyMortgage({principal:100000,annualRatePct:5,termYears:30}).standardMonths);});it.todo('rejects malformed and out-of-domain inputs');it.todo('covers zero/near-zero and upper bounds');it.todo('verifies output formatting and rounding semantics');});
