import Papa from 'papaparse';
import { buildSchema, validateSchema } from 'graphql';

export type Scalar = 'String' | 'Int' | 'Float' | 'Boolean' | 'ID' | 'DateTime';
export interface Options { typeName: string; delimiter: ',' | ';' | '\t'; nonNull: boolean; dateTime: boolean; overrides?: Record<string, Scalar> }
export interface Column { source: string; name: string; scalar: Scalar; blanks: number; count: number; reason: string; renamed: boolean }
export interface Result { sdl: string; rows: number; columns: Column[]; warnings: string[] }
export const LIMITS = { bytes: 1048576, rows: 20000, columns: 100, header: 120 };
const scalars = new Set(['String', 'Int', 'Float', 'Boolean', 'ID', 'DateTime']);
const namePattern = /^[_A-Za-z][_0-9A-Za-z]*$/;
const integer = /^-?(?:0|[1-9]\d*)$/;
const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
function validName(s: string) { return namePattern.test(s) && !s.startsWith('__'); }
function fieldName(s: string, used: Set<string>): string {
  let base = s.trim().replace(/[^_0-9A-Za-z]/g, '_') || 'column';
  if (/^[0-9]/.test(base)) base = 'field_' + base;
  if (base.startsWith('__')) base = 'field' + base;
  let name = base, suffix = 2;
  while (used.has(name)) name = `${base}_${suffix++}`;
  used.add(name); return name;
}
// Deliberately bounded DateTime profile: UTC Z, seconds, optional 1–3 fraction digits.
export function isDateTime(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/.exec(s);
  if (!m || +m[1] < 1 || +m[2] < 1 || +m[2] > 12 || +m[4] > 23 || +m[5] > 59 || +m[6] > 59) return false;
  const day = +m[3]; const year = +m[1]; const month = +m[2];
  const max = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31,30,31,30,31,31,30,31,30,31][month-1];
  return day >= 1 && day <= max;
}
function accepts(s: string, type: Scalar): boolean {
  if (type === 'String' || type === 'ID') return true;
  if (type === 'DateTime') return isDateTime(s);
  if (type === 'Boolean') return s === 'true' || s === 'false';
  if (type === 'Int') return integer.test(s) && +s >= -2147483648 && +s <= 2147483647;
  return number.test(s) && Number.isFinite(+s) && (!integer.test(s) || Number.isSafeInteger(+s)) && !(+s === 0 && /[1-9]/.test(s.split(/[eE]/)[0]));
}
function infer(values: string[], header: string, dateTime: boolean): { scalar: Scalar; reason: string } {
  if (!values.length) return {scalar:'String', reason:'Only empty cells; no evidence for a narrower type.'};
  if (/(^id$|[_ -]id$)/i.test(header.trim())) return {scalar:'ID', reason:'Identifier header; preserve lexical values, including leading zeros.'};
  for (const type of ['Boolean', 'Int', 'Float'] as Scalar[]) if (values.every(v => accepts(v, type))) return {scalar:type, reason:`Every non-empty value fits ${type}.`};
  if (dateTime && values.every(isDateTime)) return {scalar:'DateTime',reason:'Every non-empty value fits the documented UTC DateTime profile.'};
  return {scalar:'String',reason:'Text, mixed types, significant leading zeros, or unsafe numeric values.'};
}
export function convert(csv: string, options: Options): Result {
  if (typeof csv !== 'string' || new TextEncoder().encode(csv).length > LIMITS.bytes) throw new Error('CSV must be at most 1 MiB (1,048,576 UTF-8 bytes).');
  if (!csv.trim()) throw new Error('Paste a CSV header and at least one data row.');
  if (csv.includes('\0')) throw new Error('NUL bytes are not supported. Use a UTF-8 text CSV.');
  if (!options || !validName(options.typeName) || options.typeName.length > 80 || ['Query','String','Boolean','Int','Float','ID','DateTime'].includes(options.typeName)) throw new Error('Use a GraphQL type name of 1–80 ASCII letters, digits or underscores; start with a letter or underscore. Reserved names are unavailable.');
  if (![',',';','\t'].includes(options.delimiter)) throw new Error('Choose comma, semicolon or tab as the delimiter.');
  const records: string[][] = []; let failure = '';
  Papa.parse<string[]>(csv.replace(/^\uFEFF/, ''), {
    delimiter: options.delimiter, dynamicTyping: false, skipEmptyLines: true,
    step(result, parser) {
      if (result.errors.length) { failure = `Malformed CSV near record ${records.length+1}: ${result.errors[0].message}`; parser.abort(); return; }
      if (result.data.length > LIMITS.columns) { failure = 'CSV exceeds the 100-column limit.'; parser.abort(); return; }
      records.push(result.data);
      if (records.length > LIMITS.rows + 1) { failure = 'CSV exceeds the 20,000-data-row limit.'; parser.abort(); }
    }
  });
  if (failure) throw new Error(failure);
  if (records.length < 2) throw new Error('Include a header and at least one data row. Blank lines are skipped.');
  const headers = records[0];
  if (headers.some(h => h.length > LIMITS.header)) throw new Error('Each column header must be at most 120 characters.');
  for (let i = 1; i < records.length; i++) if (records[i].length !== headers.length) throw new Error(`Record ${i+1} has ${records[i].length} cells; expected ${headers.length}. Fix the delimiter or missing/extra cells.`);
  const used = new Set<string>(); const warnings: string[] = [];
  const columns = headers.map((source, index): Column => {
    const name = fieldName(source, used);
    const values = records.slice(1).map(r => r[index]);
    const nonEmpty = values.filter(v => v !== '');
    const guessed = infer(nonEmpty, source, options.dateTime);
    const override = options.overrides && Object.hasOwn(options.overrides, name) ? options.overrides[name] : undefined;
    if (override && (!scalars.has(override) || (override === 'DateTime' && !options.dateTime))) throw new Error(`Unsupported override for ${name}.`);
    if (override && !nonEmpty.every(v => accepts(v, override))) throw new Error(`Column ${name} contains a value incompatible with ${override}. Choose String or correct the input.`);
    const scalar = override ?? guessed.scalar;
    return {source, name, scalar, blanks: values.length-nonEmpty.length, count: values.length, reason: override ? 'User-selected type; every non-empty cell checked.' : guessed.reason, renamed: name !== source};
  });
  if (options.overrides && Object.keys(options.overrides).some(k => !used.has(k))) throw new Error('An override refers to a missing column. Generate again after changing the CSV.');
  if (columns.some(c => c.renamed)) warnings.push('Headers were normalized or deduplicated. Use the field map when implementing resolvers.');
  if (options.nonNull) warnings.push('Non-null marks describe these samples only. Future records may still contain missing data.');
  if (columns.some(c => c.scalar === 'DateTime')) warnings.push('DateTime is a custom scalar. Supply a server-side serializer and validator; this tool does not create them.');
  const custom = columns.some(c => c.scalar === 'DateTime') ? 'scalar DateTime\n\n' : '';
  const sdl = `${custom}type ${options.typeName} {\n${columns.map(c => `  ${c.name}: ${c.scalar}${options.nonNull && c.blanks === 0 ? '!' : ''}`).join('\n')}\n}\n\ntype Query {\n  rows: [${options.typeName}!]!\n}\n`;
  const errors = validateSchema(buildSchema(sdl)); if (errors.length) throw new Error(errors[0].message);
  return {sdl, rows: records.length-1, columns, warnings};
}
