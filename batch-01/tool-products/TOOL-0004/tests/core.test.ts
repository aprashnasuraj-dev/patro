import { describe, it, expect } from 'vitest';
import { convert } from '../src/core';

describe('SQL DDL to Prisma subset',()=>{
 it('converts basic PostgreSQL fields with unique and PK annotations',()=>{
  const out=convert('CREATE TABLE users (id INTEGER PRIMARY KEY, email VARCHAR(100) UNIQUE NOT NULL);').text;
  expect(out).toContain('model users');expect(out).toContain('id Int @id');expect(out).toContain('email String @unique');
 });
 it('fails rather than inventing FK relations',()=>expect(()=>convert('CREATE TABLE x (id INT PRIMARY KEY, owner INT REFERENCES users(id));')).toThrow(/constraints/));
 it('supports named primary keys but still rejects comments',()=>{expect(convert('CREATE TABLE x (id INT, CONSTRAINT pk PRIMARY KEY (id));').text).toContain('id Int @id');expect(()=>convert('CREATE TABLE x (-- hello\nid INT);')).toThrow();});
 it('refuses SQL injection appended statements',()=>expect(()=>convert('CREATE TABLE x (id INT); DROP TABLE users;')).toThrow());
});
