import { describe,it,expect } from 'vitest';
import { convert } from '../src/core';
describe("Terraform tfvars to JSON Converter",()=>{it('parses scalar, array and object literal tfvars',()=>{const x=JSON.parse(convert('replicas = 2\nenabled = true\ntags = {team = "ops"}\nports=[80,443]').text);expect(x.replicas).toBe(2);expect(x.tags.team).toBe('ops');expect(x.ports).toEqual([80,443]);});it('rejects functions and interpolation',()=>{expect(()=>convert('id = uuid()')).toThrow();expect(()=>convert('x = "${var.secret}"')).toThrow();});
});
