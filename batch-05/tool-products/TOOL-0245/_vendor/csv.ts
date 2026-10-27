export type CsvRow=string[];
export function parseCsv(input:string,maxBytes=1_000_000,maxRows=10000,maxCols=32){
 if(new TextEncoder().encode(input).length>maxBytes)throw new Error(`CSV exceeds ${maxBytes} bytes.`);const rows:CsvRow[]=[];let row:string[]=[],cell='',q=false;
 for(let i=0;i<input.length;i++){const c=input[i];if(q){if(c==='"'&&input[i+1]==='"'){cell+='"';i++;}else if(c==='"')q=false;else cell+=c;}else{if(c==='"')q=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));if(row.some(x=>x!==''))rows.push(row);row=[];cell='';if(rows.length>maxRows)throw new Error(`CSV exceeds ${maxRows} rows.`);}else cell+=c;}}
 if(q)throw new Error('CSV has an unterminated quoted field.');row.push(cell.replace(/\r$/,''));if(row.some(x=>x!==''))rows.push(row);if(rows.some(r=>r.length>maxCols))throw new Error(`CSV exceeds ${maxCols} columns.`);return rows;
}
export function safeCsvCell(v:unknown){let s=String(v??'');if(/^[=+\-@]/.test(s))s="'"+s;return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
export function toCsv(rows:unknown[][]){return rows.map(r=>r.map(safeCsvCell).join(',')).join('\n');}
