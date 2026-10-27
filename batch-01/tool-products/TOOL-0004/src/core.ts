/** Strict, bounded PostgreSQL CREATE TABLE subset to Prisma 7 model DSL. */
export type Result={text:string;warnings:string[];details:{Tables:number;Columns:number}};
type Col={raw:string;name:string;type:string;nullable:boolean;primary:boolean;unique:boolean;defaultValue?:string;serial?:boolean};
const escape=(s:string)=>JSON.stringify(s);
const modelId=(s:string)=>{const r=s.replace(/[^a-zA-Z0-9_]/g,'_');return /^[a-zA-Z]/.test(r)?r:'Model_'+r;};
function splitColumns(src:string):string[]{let depth=0,quote='',out:string[]=[],start=0;
 for(let i=0;i<src.length;i++){const c=src[i];if(quote){if(c===quote){if(src[i+1]===quote){i++;continue;}quote='';}continue;}
 if(c==='"'||c==="'"){quote=c;continue;}if(c==='(')depth++;else if(c===')')depth--;else if(c===','&&depth===0){out.push(src.slice(start,i).trim());start=i+1;}if(depth<0)throw Error('Unbalanced DDL parentheses');}
 if(depth||quote)throw Error('Unbalanced or unterminated SQL definition');out.push(src.slice(start).trim());return out.filter(Boolean);
}
export function convert(input:string):Result{
 if(input.length>120_000)throw Error('DDL exceeds 120 KB');
 // Block statements beyond straightforward CREATE TABLE grammar to avoid misleading SQL parsing.
 if(/\/\*|--|\$\$/.test(input))throw Error('SQL comments/dollar-quoted strings require full SQL parser; remove them and retry');
 const inputClean=input.trim();if(!inputClean)throw Error('Paste CREATE TABLE statements');
 const regex=/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:("(?:[^"]|"")*"|[A-Za-z_][\w]*)\.)?("(?:[^"]|"")*"|[A-Za-z_][\w]*)\s*\(/ig;
 const groups:Array<{name:string;body:string}> = [];let consumed=0,m:RegExpExecArray|null;
 const strip=(s:string)=>s.startsWith('"')?s.slice(1,-1).replace(/""/g,'"'):s;
 while((m=regex.exec(inputClean))!==null){if(inputClean.slice(consumed,m.index).replace(/[;\s]/g,'')!=='')throw Error('Unsupported DDL before CREATE TABLE');
  let depth=1,quote='',i=regex.lastIndex;
  for(;i<inputClean.length&&depth;i++){const ch=inputClean[i];if(quote){if(ch===quote){if(inputClean[i+1]===quote){i++;continue;}quote='';}}else if(ch==='"'||ch==="'")quote=ch;else if(ch==='(')depth++;else if(ch===')')depth--;}
  if(depth)throw Error('CREATE TABLE missing closing parenthesis');groups.push({name:strip(m[2]),body:inputClean.slice(regex.lastIndex,i-1)});consumed=i;regex.lastIndex=i;
  if(groups.length>30)throw Error('Maximum 30 tables');
 }
 if(!groups.length||inputClean.slice(consumed).replace(/[;\s]/g,''))throw Error('Only isolated CREATE TABLE definitions supported');
 const used=new Set<string>(),warnings:string[]=[],models:string[]=[];let totalCols=0;
 for(const t of groups){const mn=modelId(t.name);if(used.has(mn))throw Error('Model naming collision: '+mn);used.add(mn);
  const cols:Col[]=[];let tablePk:string[]=[];
  for(const line of splitColumns(t.body)){
   const pk=/^CONSTRAINT\s+\S+\s+PRIMARY\s+KEY\s*\(([^)]+)\)$/i.exec(line)||/^PRIMARY\s+KEY\s*\(([^)]+)\)$/i.exec(line);
   if(pk){tablePk=pk[1].split(',').map(x=>strip(x.trim()));continue;}
   if(/^(?:CONSTRAINT|UNIQUE|FOREIGN|CHECK|EXCLUDE)\b/i.test(line))throw Error('Unsupported constraint: '+line.slice(0,60));
   const cm=/^("(?:[^"]|"")*"|[A-Za-z_][\w]*)\s+([A-Za-z][\w]*(?:\s*\([^)]*\))?)([\s\S]*)$/i.exec(line);
   if(!cm)throw Error('Cannot parse column: '+line.slice(0,70));const key=strip(cm[1]),type=cm[2].toLowerCase().replace(/\s+/g,'');const rest=cm[3];
   if(/\bREFERENCES\b|\bGENERATED\b|\bCOLLATE\b|\bCHECK\b/i.test(rest))throw Error('Complex constraints/generation unsupported for '+key);
   const prisma=/^(?:smallint|integer|int|serial|smallserial)$/.test(type)?'Int':/^(?:bigint|bigserial)$/.test(type)?'BigInt':/^(?:boolean|bool)$/.test(type)?'Boolean':/^(?:decimal|numeric|money)(?:\(\d+(?:,\d+)?\))?$/.test(type)?'Decimal':/^(?:float|float4|float8|real|doubleprecision)$/.test(type)?'Float':/^(?:text|varchar(?:\(\d+\))?|character(?:varying)?(?:\(\d+\))?|uuid|jsonb?|date|timestamp(?:tz)?|timestamptz|bytea)$/.test(type)?(/^(?:date|timestamp|timestamptz)/.test(type)?'DateTime':type==='bytea'?'Bytes':type==='json'||type==='jsonb'?'Json':'String'):null;
   if(!prisma)throw Error('Unsupported SQL type '+type+' in '+key);
   if(cols.some(x=>x.name===key))throw Error('Duplicate column '+key);
   cols.push({raw:key,name:/^[A-Za-z][A-Za-z0-9_]*$/.test(key)?key:'col_'+cols.length,type:prisma,nullable:!/\bNOT\s+NULL\b|\bPRIMARY\s+KEY\b/i.test(rest),primary:/\bPRIMARY\s+KEY\b/i.test(rest),unique:/\bUNIQUE\b/i.test(rest),defaultValue:/\bDEFAULT\s+([^\s,]+)/i.exec(rest)?.[1],serial:/^(?:serial|smallserial|bigserial)$/.test(type)});
   if(/\bDEFAULT\b/i.test(rest)&&!(/^(?:serial|smallserial|bigserial)$/.test(type)))warnings.push('Defaults other than auto-increment are not recreated; inspect source SQL.');
  }
  if(tablePk.length){for(const k of tablePk){const col=cols.find(c=>c.raw===k);if(!col)throw Error('Unknown table primary key column '+k);col.primary=true;col.nullable=false;}}
  if(!cols.length)throw Error('No columns in '+t.name);totalCols+=cols.length;
  const out=[`model ${mn} {`];const pk=cols.filter(c=>c.primary);
  for(const c of cols){let annotations=c.raw!==c.name?` @map(${escape(c.raw)})`:'';
   if(c.primary&&pk.length===1)annotations+=' @id';if(c.unique)annotations+=' @unique';
   if(c.serial)annotations+=' @default(autoincrement())';
   out.push(`  ${c.name} ${c.type}${c.nullable?'?':''}${annotations}`);
  }
  if(pk.length>1)out.push(`  @@id([${pk.map(c=>c.name).join(', ')}])`);
  if(mn!==t.name)out.push(`  @@map(${escape(t.name)})`);
  out.push('}');models.push(out.join('\n'));
 }
 warnings.push('Subset conversion only. Foreign keys, indexes, generated columns, complex defaults and schema namespaces require prisma db pull/manual review.');
 return {text:['// Prisma v7 draft. Configure datasource URL in prisma.config.ts.', 'datasource db {\n  provider = "postgresql"\n}', ...models].join('\n\n')+'\n', warnings,details:{Tables:groups.length,Columns:totalCols}};
}
