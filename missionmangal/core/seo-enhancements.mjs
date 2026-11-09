import {BYLINE,ROUTES,SITE} from './portfolio.mjs';
export const EDITORIAL_URL=SITE+'/editorial-guidelines/';
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function structuredData(a,r){
 const kind=r.type||'blog',parts=[{'@type':'Article','@id':r.url+'#article',headline:a.title,mainEntityOfPage:r.url,inLanguage:'en',author:{'@type':'Organization',name:BYLINE,url:EDITORIAL_URL},publisher:{'@type':'Organization',name:'Aafnai Patro',url:SITE},citation:a.sources.map(s=>s.url)}];
 if(kind==='article')parts[0]['@type']='Article';
 if(kind==='blog')parts[0]['@type']='BlogPosting';
 // Single-editorial-answer pages are NOT user-submitted QAPage. FAQPage requires genuine visible multiple Q&As.
 if(Array.isArray(a.faq)&&a.faq.length>=2&&a.faq.every(x=>x.question&&x.answer))parts.push({'@type':'FAQPage',mainEntity:a.faq.map(x=>({'@type':'Question',name:x.question,acceptedAnswer:{'@type':'Answer',text:x.answer}}))});
 const folder=ROUTES[kind];parts.push({'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:SITE+'/'},{'@type':'ListItem',position:2,name:folder,item:SITE+'/'+folder+'/'},{'@type':'ListItem',position:3,name:a.title,item:r.url}]});
 return {'@context':'https://schema.org','@graph':parts};
}
export function relatedHtml(links){return links?.length?'<nav aria-label="Related reading"><h2>Related reading</h2><ul>'+links.map(l=>'<li><a href="'+esc(l.url)+'">'+esc(l.anchor)+'</a></li>').join('')+'</ul></nav>':'';}
export function editorialPage(){return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Editorial guidelines | Aafnai Patro</title><link rel="canonical" href="'+EDITORIAL_URL+'"></head><body><main><h1>Editorial guidelines</h1><p>Articles are credited to '+BYLINE+'. We distinguish sourced claims, analysis and uncertainty; require five to twenty actually used, independently assessed sources; document image permissions; disclose corrections and require editorial approval before publication. AI can assist drafting and checking but is not itself evidence or a claimed human credential.</p><h2>Corrections and reviews</h2><p>Unsupported claims are held for investigation. Publication dates and review decisions are recorded; we do not invent authors, quotations or professional qualifications.</p></main></body></html>';}
