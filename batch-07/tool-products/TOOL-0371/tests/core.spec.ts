import {describe,it,expect} from 'vitest';import {validateTex} from '../src/core';describe('TOOL-0371 core',()=>{it('known-answer fixture',()=>{expect(validateTex('x^2')).toBe('x^2')})});
