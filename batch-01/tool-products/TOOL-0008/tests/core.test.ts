import { describe, it, expect } from 'vitest';
import { convert } from '../src/core';

describe('Postman -> Markdown',()=>{
 const sample=JSON.stringify({info:{name:'Backend API',schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'},item:[{name:'Accounts',item:[{name:'List',request:{method:'GET',url:'https://api.example.com/users?api_token=NEVERCOPY',auth:{bearer:[{value:'NEVERCOPY'}]},body:{raw:'NEVERCOPY'}}}]}]});
 it('captures folder, method and endpoint',()=>{const r=convert(sample);expect(r.text).toContain('Accounts');expect(r.text).toContain('GET');expect(r.details.Endpoints).toBe(1);});
 it('never exports body or token values',()=>expect(convert(sample).text).not.toContain('NEVERCOPY'));
 it('rejects non-collection exports',()=>expect(()=>convert('{"foo":1}')).toThrow());
 it('bounds nesting depth',()=>{let item:any={name:'Ping',request:{method:'GET',url:'/'}};for(let i=0;i<20;i++)item={name:'Folder',item:[item]};expect(()=>convert(JSON.stringify({info:{name:'a'},item:[item]}))).toThrow(/nested/);});
});
