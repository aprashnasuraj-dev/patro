import {describe,it,expect} from 'vitest';import {trajectory} from '../src/core';describe('TOOL-0375 core',()=>{it('known-answer fixture',()=>{expect(trajectory(10,45).range).toBeGreaterThan(9)})});
