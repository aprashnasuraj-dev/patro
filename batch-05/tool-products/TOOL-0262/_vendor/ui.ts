export function q(id:string){const el=document.getElementById(id);if(!el)throw new Error(`Missing element #${id}`);return el as HTMLElement;}
export function num(id:string){const el=q(id) as HTMLInputElement;const n=Number(el.value);if(!Number.isFinite(n))throw new Error(`${el.labels?.[0]?.textContent||id} must be a number.`);return n;}
export function val(id:string){return (q(id) as HTMLInputElement|HTMLSelectElement).value;}
export function checked(id:string){return (q(id) as HTMLInputElement).checked;}
export function fmt(n:number,d=2){return new Intl.NumberFormat(undefined,{maximumFractionDigits:d}).format(n);}
export function currency(n:number,code='USD'){try{return new Intl.NumberFormat(undefined,{style:'currency',currency:code,maximumFractionDigits:2}).format(n)}catch{return `${fmt(n,2)} ${code}`}}
export function clear(el:HTMLElement){el.replaceChildren();}
export function setError(el:HTMLElement,e:unknown){clear(el);const p=document.createElement('p');p.className='error';p.textContent=e instanceof Error?e.message:String(e);el.append(p);}
export function metricGrid(items:[string,string][]) {const g=document.createElement('div');g.className='metrics';for(const [k,v] of items){const d=document.createElement('div');const s=document.createElement('span');s.textContent=k;const b=document.createElement('strong');b.textContent=v;d.append(s,b);g.append(d)}return g;}
export function textBlock(title:string,text:string){const s=document.createElement('section');const h=document.createElement('h3');h.textContent=title;const p=document.createElement('p');p.textContent=text;s.append(h,p);return s;}
export async function copyText(text:string){await navigator.clipboard.writeText(text)}
export function downloadText(name:string,text:string,type='text/plain;charset=utf-8'){const b=new Blob([text],{type});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),500)}
export function table(headers:string[],rows:(string|number)[][]){const wrap=document.createElement('div');wrap.className='table-wrap';const t=document.createElement('table');const th=document.createElement('thead');const tr=document.createElement('tr');headers.forEach(x=>{const e=document.createElement('th');e.textContent=x;tr.append(e)});th.append(tr);t.append(th);const tb=document.createElement('tbody');for(const row of rows){const rr=document.createElement('tr');row.forEach(x=>{const td=document.createElement('td');td.textContent=String(x);rr.append(td)});tb.append(rr)}t.append(tb);wrap.append(t);return wrap;}
