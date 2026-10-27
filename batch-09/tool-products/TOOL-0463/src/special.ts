
import {calculate} from './core';
const esc=(s:string)=>s.replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x] as string));
export function attachSpecial(configId:string):void {
 const app=document.getElementById('tool-app');if(!app)return;
 const form=app.querySelector('form');const out=app.querySelector('.output-column');if(!form||!out)return;
 const section=document.createElement('section');section.className='special-panel';const title=document.createElement('h3');title.textContent=configId==='TOOL-0463'?'Pleading paper print master':'Printable customs worksheet';
 const btn=document.createElement('button');btn.type='button';btn.className='secondary-action';btn.textContent=configId==='TOOL-0463'?'Download printable SVG':'Download printable HTML';
 const guidance=document.createElement('p');guidance.textContent='Generated locally; verify filing and printing requirements. No sensitive content leaves the browser.';section.append(title,guidance,btn);out.append(section);
 function current(k:string):string {const e=app.querySelector('#input-'+configId+'-'+k) as HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement|null;return e?.value||''}
 btn.addEventListener('click',()=>{try{const inputs:Record<string,unknown>={};for(const k of (configId==='TOOL-0463'?['page','lines','left','right','top','bottom','court']:['sender','recipient','currency','invoice','items','reason']))inputs[k]=current(k);calculate(inputs);let content='',type='',extension='';
 if(configId==='TOOL-0463'){
 const paper=current('page'),lines=Number(current('lines')),left=Number(current('left')),top=Number(current('top')),bottom=Number(current('bottom'));
 const right=Number(current('right'));const w=paper==='US Letter'?8.5:210/25.4,h=paper==='US Letter'?11:297/25.4,spacing=(h-top-bottom)/(lines-1);
 if(!Number.isInteger(lines)||lines<20||lines>36||!Number.isFinite(spacing)||spacing<.15||spacing>1/3+1e-9)throw Error('Invalid paper geometry');
 const labels=Array.from({length:lines},(_,j)=>{const y=(top+j*spacing)*72;return `<text x="${left*72-14}" y="${y}" text-anchor="end" font-size="9" font-family="serif">${j+1}</text><line x1="${left*72}" x2="${(w-right)*72}" y1="${y}" y2="${y}" stroke="#b8c0c9" stroke-width="0.3"/>`}).join('');
 content=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}in" height="${h}in" viewBox="0 0 ${w*72} ${h*72}"><rect width="100%" height="100%" fill="white"/><line x1="${left*72-6}" x2="${left*72-6}" y1="${top*72-11}" y2="${(h-bottom)*72+8}" stroke="#333" stroke-width="0.6"/>${labels}</svg>`;type='image/svg+xml';extension='svg';
 }else{
 const lines=current('items').split(/\r?\n/).filter(Boolean);
 if(lines.length<1||lines.length>50)throw Error('Invalid number of items');
 const trs=lines.map(line=>{const p=line.split('|');if(p.length!==6)throw Error('Invalid item row');return `<tr>${p.map(z=>`<td>${esc(z.trim())}</td>`).join('')}</tr>`}).join('');
 content=`<!doctype html><html><head><meta charset="utf-8"><title>Customs invoice worksheet</title><style>body{font:13px Arial;margin:2cm}h1{font-size:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #333;padding:7px;text-align:left;overflow-wrap:anywhere}.note{border-top:2px solid #333;margin-top:20px;padding-top:12px}</style></head><body><h1>COMMERCIAL INVOICE — DRAFT</h1><p><b>Exporter:</b> ${esc(current('sender'))}</p><p><b>Consignee:</b> ${esc(current('recipient'))}</p><p><b>Invoice:</b> ${esc(current('invoice'))}</p><p><b>Currency:</b> ${esc(current('currency'))}</p><p><b>Reason:</b> ${esc(current('reason'))}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Unit value</th><th>HS</th><th>Origin</th><th>Net kg</th></tr></thead><tbody>${trs}</tbody></table><p class="note">Draft source worksheet only; not an official CN22/CN23, not a carrier-approved declaration or signed customs submission.</p></body></html>`;type='text/html';extension='html';
 }
 const u=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=u;a.download=configId+'-draft.'+extension;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
 }catch(e){guidance.textContent=e instanceof Error?e.message:'Cannot produce draft'}});
}
