import {describe,it,expect} from 'vitest';import {molarMass} from '../src/core';describe('TOOL-0372 core',()=>{it('known-answer fixture',()=>{expect(molarMass('H2O').mass).toBeCloseTo(18.015,3)})});
