import {BYLINE,ROUTES,SITE} from './portfolio.mjs';
export const EDITORIAL_URL=SITE+'/editorial-guidelines/';
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function structuredData(a,r){
 const kind=r.type||'blog',parts=[{'@type':'Article','@id':r.url+'#article',headline:a.title,description:a.description||a.intent,mainEntityOfPage:r.url,inLanguage:'en',...(r.published_at?{datePublished:r.published_at}:{}),...((r.updated_at||r.published_at)?{dateModified:r.updated_at||r.published_at}:{}),...(a.media?.find(m=>m.rights_verified&&['image','chart','diagram'].includes(m.type))?{image:a.media.find(m=>m.rights_verified&&['image','chart','diagram'].includes(m.type)).url}:{}),author:{'@type':'Organization',name:BYLINE,url:EDITORIAL_URL},publisher:{'@type':'Organization',name:'Aafnai Patro',url:SITE},citation:a.sources.map(s=>s.url)}];
 if(kind==='article')parts[0]['@type']='Article';
 if(kind==='blog')parts[0]['@type']='BlogPosting';
 // Single-editorial-answer pages are NOT user-submitted QAPage. FAQPage requires genuine visible multiple Q&As.
 if(Array.isArray(a.faq)&&a.faq.length>=2&&a.faq.every(x=>x.question&&x.answer))parts.push({'@type':'FAQPage',mainEntity:a.faq.map(x=>({'@type':'Question',name:x.question,acceptedAnswer:{'@type':'Answer',text:x.answer}}))});
 const folder=ROUTES[kind];const crumbs=[{'@type':'ListItem',position:1,name:'Home',item:SITE+'/'}];if(folder)crumbs.push({'@type':'ListItem',position:2,name:folder,item:SITE+'/'+folder+'/'});crumbs.push({'@type':'ListItem',position:crumbs.length+1,name:a.title,item:r.url});parts.push({'@type':'BreadcrumbList',itemListElement:crumbs});
 return {'@context':'https://schema.org','@graph':parts};
}
export function relatedHtml(links){return links?.length?'<nav aria-label="Related reading"><h2>Related reading</h2><ul>'+links.map(l=>'<li><a href="'+esc(l.url)+'">'+esc(l.anchor)+'</a></li>').join('')+'</ul></nav>':'';}
export function editorialPage(){return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Editorial guidelines | Aafnai Patro</title><link rel="canonical" href="'+EDITORIAL_URL+'"></head><body><main><h1>Editorial guidelines</h1><p>Articles are credited to '+BYLINE+'. Many articles are drafted with AI assistance from the sources they cite. Each draft is checked automatically: every claim must quote a passage found in its cited source, numbers must match, enough distinct sources must be used, copying is limited, and each page needs a licensed image with visible credit. Articles that pass these automated checks may be published without individual human review. AI output is not itself evidence, and we do not invent authors, quotations or qualifications.</p><h2 id="corrections">Corrections</h2><p>Automated checks can miss mistakes. If you find an error, tell us through the site contact page; we correct or remove inaccurate pages and update the page. Health and money topics are educational only and are not professional advice.</p></main></body></html>';}

export function metaTags(a,r){
 const t=esc(a.title),d=esc((a.description||a.intent||'').slice(0,160)),u=esc(r.url);
 const img=a.media?.find(m=>m.rights_verified&&['image','chart','diagram'].includes(m.type));
 return '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">'
 +'<meta property="og:type" content="article"><meta property="og:site_name" content="Aafnai Patro"><meta property="og:title" content="'+t+'"><meta property="og:description" content="'+d+'"><meta property="og:url" content="'+u+'">'
 +(img?'<meta property="og:image" content="'+esc(img.url)+'"><meta property="og:image:alt" content="'+esc(img.alt)+'">':'')
 +'<meta name="twitter:card" content="'+(img?'summary_large_image':'summary')+'"><meta name="twitter:title" content="'+t+'"><meta name="twitter:description" content="'+d+'">'
 +'<link rel="alternate" hreflang="en" href="'+u+'"><link rel="alternate" hreflang="x-default" href="'+u+'">';
}
