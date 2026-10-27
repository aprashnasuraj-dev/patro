import {escapeHtml} from '../_vendor/document';
import {safeHttpUrl} from '../_vendor/business';
export type SignatureInput={name:string;title:string;company:string;email:string;phone:string;website:string;address:string;accent:string};
const text=(v:string,max=500)=>String(v||'').trim().slice(0,max);
function safeEmail(v:string){const s=text(v,254);if(s&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw new Error('Email address is invalid.');return s}
function safePhone(v:string){const s=text(v,80);if(s&&!/^[0-9+().\-\s]{3,80}$/.test(s))throw new Error('Phone contains unsupported characters.');return s}
export function signature(x:SignatureInput){
 const name=text(x.name,100);if(!name)throw new Error('Name is required.');const title=text(x.title,120),company=text(x.company,120),email=safeEmail(x.email),phone=safePhone(x.phone),website=x.website?safeHttpUrl(x.website):'',address=text(x.address,500);
 const accent=/^#[0-9a-f]{6}$/i.test(x.accent)?x.accent:'#1d4ed8';const rows=[title,company,address].filter(Boolean).map(v=>`<div style="margin:2px 0;color:#444">${escapeHtml(v).replace(/\n/g,'<br>')}</div>`).join('');
 const links=[email?`<a href="mailto:${encodeURIComponent(email)}" style="color:${accent};text-decoration:none">${escapeHtml(email)}</a>`:'',phone?`<a href="tel:${phone.replace(/[^\d+]/g,'')}" style="color:${accent};text-decoration:none">${escapeHtml(phone)}</a>`:'',website?`<a href="${escapeHtml(website)}" style="color:${accent};text-decoration:none">${escapeHtml(new URL(website).hostname)}</a>`:''].filter(Boolean).join(' &nbsp;·&nbsp; ');
 const html=`<table role="presentation" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.4;color:#222"><tr><td style="border-left:4px solid ${accent};padding-left:12px"><div style="font-size:18px;font-weight:700;color:#111">${escapeHtml(name)}</div>${rows}${links?`<div style="margin-top:7px">${links}</div>`:''}</td></tr></table>`;
 const plain=[name,title,company,email,phone,website,address].filter(Boolean).join('\n');
 return {html,plain};
}
