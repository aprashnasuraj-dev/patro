import { describe, it, expect } from 'vitest';
import { convert } from '../src/core';

describe('JSON -> proto3',()=>{
 it('creates tag-assigned protobuf fields from JSON',()=>{
  const output=convert('{"id":1,"enabled":true,"tags":["a"]}',{rootName:'Feature',packageName:'app.test'}).text;
  expect(output).toContain('message Feature');expect(output).toContain('int32 id = 1;');expect(output).toContain('bool enabled = 2;');expect(output).toContain('repeated string tags = 3;');
 });
 it('generates nested messages',()=>expect(convert('{"profile":{"name":"X"}}').text).toContain('message RootProfile'));
 it('rejects root arrays, illegal packages and nested arrays',()=>{
  expect(()=>convert('[1,2]')).toThrow();expect(()=>convert('{}',{packageName:'x;evil'})).toThrow();expect(()=>convert('{"items":[[1,2]]}')).toThrow();
 });
 it('does not silently collapse normalized name collisions',()=>expect(()=>convert('{"my key":1,"my_key":2}')).toThrow());
});
