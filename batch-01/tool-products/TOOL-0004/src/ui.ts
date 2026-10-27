import './styles.css';
import { mountWorkbench } from '../_vendor/workbench';
import { convert } from './core';
/** Dedicated Data model migration interaction. Imported only on this route. */
export function mount(root:HTMLElement):()=>void {
 root.dataset.toolId="TOOL-0004";
 return mountWorkbench({
  root,title:"Convert plain CREATE TABLE SQL into Prisma models", inputLabel:"PostgreSQL CREATE TABLE statements",
  inputHint:"Supports scalar columns and simple primary/unique constraints; no foreign keys, named constraints or generated columns.",sample:"CREATE TABLE users (\n  id INTEGER PRIMARY KEY,\n  email VARCHAR(255) NOT NULL UNIQUE,\n  created_at TIMESTAMP NOT NULL\n);\nCREATE TABLE sessions (\n  id INTEGER PRIMARY KEY,\n  user_id INTEGER NOT NULL,\n  expires_at TIMESTAMP\n);\n",action:"Draft Prisma models",
  inputKind:"both",outputLabel:"schema.prisma draft",filename:"schema.prisma",
  maxBytes:120000,
  options:[],
  run:(text,options)=>convert(text)
 });
}
export default mount;
