
export function q<T extends HTMLElement=HTMLElement>(id:string){const el=document.getElementById(id);if(!el)throw new Error(`Missing #${id}`);return el as T;}
export function num(id:string){const v=Number((q<HTMLInputElement>(id)).value);if(!Number.isFinite(v))throw new Error(`Invalid value for ${id}.`);return v;}
export function text(id:string){return q<HTMLInputElement|HTMLTextAreaElement>(id).value;}
export function select(id:string){return q<HTMLSelectElement>(id).value;}
export function clear(el:HTMLElement){el.replaceChildren();}
export function el<K extends keyof HTMLElementTagNameMap>(tag:K,txt?:string,cls?:string){const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;if(cls)e.className=cls;return e;}
export function metric(label:string,value:string){const d=el("div",undefined,"metric");d.append(el("span",label),el("b",value));return d;}
export function metrics(items:Array<[string,string]>){const g=el("div",undefined,"metric-grid");for(const [a,b] of items)g.append(metric(a,b));return g;}
export function notice(msg:string){return el("div",msg,"warning");}
export function table(headers:string[],rows:(string|number)[][]){const wrap=el("div",undefined,"scroll"),t=el("table"),thead=el("thead"),tr=el("tr");for(const h of headers)tr.append(el("th",h));thead.append(tr);const tb=el("tbody");for(const r of rows){const rr=el("tr");for(const c of r)rr.append(el("td",String(c)));tb.append(rr);}t.append(thead,tb);wrap.append(t);return wrap;}
export function pre(obj:unknown){return el("pre",JSON.stringify(obj,null,2));}
export function setError(out:HTMLElement,e:unknown){clear(out);out.append(notice(e instanceof Error?e.message:String(e)));}
export function pct(x:number,d=2){return `${(x*100).toFixed(d)}%`;}
export function nfmt(x:number,d=4){return Number.isFinite(x)?x.toLocaleString(undefined,{maximumFractionDigits:d}):"—";}
export function bindCopy(buttonId:string,outId:string){q<HTMLButtonElement>(buttonId).addEventListener("click",async()=>{await navigator.clipboard.writeText(q(outId).textContent||"");});}
