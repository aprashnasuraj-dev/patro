// Single source of truth: used by build.mjs (static site) AND inlined into playbox.html. Zero dependencies, zero network requests.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cite=(t,n)=>esc(t).replace(/\[(\d+)\]/g,(m,i)=>`<sup class="c"><a href="#src-${i}" aria-label="Source ${i}">[${i}]</a></sup>`);
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const words=t=>(String(t).replace(/\[\d+\]/g,'').match(/[\w'’-]+/g)||[]).length;
export function countWords(a){return (a.sections||[]).flatMap(s=>s.paras).concat((a.faq||[]).flatMap(f=>[f.q,f.a])).reduce((n,t)=>n+words(t),0);}
// Publish gate: every rule maps to something a reader or Google would notice.
export function checkArticle(a,{minWords=1000,takenSlugs=[],requireImage=false}={}){
 const used=new Set(),all=[...(a.sections||[]).flatMap(s=>s.paras),...(a.faq||[]).map(f=>f.a)];
 all.forEach(t=>[...String(t).matchAll(/\[(\d+)\]/g)].forEach(m=>used.add(+m[1])));
 const n=(a.sources||[]).map(s=>s.n),wc=countWords(a);
 const r=(ok,label,detail='')=>({ok,label,detail});
 return [r(wc>=minWords,`At least ${minWords} words`,wc+' words'),
  r(a.title&&a.title.length<=60,'Title ≤ 60 characters',(a.title||'').length+' chars'),
  r(a.meta_description&&a.meta_description.length>=110&&a.meta_description.length<=160,'Meta description 110–160 characters',(a.meta_description||'').length+' chars'),
  r(a.slug===slug(a.slug)&&a.slug.length<=60&&!takenSlugs.includes(a.slug),'Unique, clean slug (≤ 60 chars)',a.slug),
  r((a.sources||[]).length>=3,'At least 3 sources',(a.sources||[]).length+' sources'),
  r([...used].every(i=>n.includes(i)),'Every [n] citation points to a listed source'),
  r(n.every(i=>used.has(i)),'Every listed source is cited in the text'),
  r((a.sections||[]).length>=5,'At least 5 sections',(a.sections||[]).length+' sections'),
  r((a.faq||[]).length>=3,'At least 3 FAQ answers',(a.faq||[]).length+' FAQs'),
  r((a.sources||[]).every(s=>/^https:\/\//.test(s.url)),'All source URLs are https'),
  ...(a.image||requireImage?[r(!!a.image&&/\.(png|jpe?g|webp)$/i.test(a.image.file||'')&&String(a.image.alt||'').length>=20&&String(a.image.alt||'').length<=160&&!!a.image.credit&&!!a.image.license,'Hero image: file (.png/.jpg/.webp), alt text 20–160 chars, credit and licence')]:[])];
}
const CSS=`:root{--bg:#fff;--fg:#1d2733;--mut:#5b6877;--ac:#0b6bcb;--card:#f4f7fb;--bd:#dbe3ec}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0f1620;--fg:#e6edf5;--mut:#9aa8b8;--ac:#6db3ff;--card:#17212d;--bd:#283546}}
:root[data-theme=dark]{--bg:#0f1620;--fg:#e6edf5;--mut:#9aa8b8;--ac:#6db3ff;--card:#17212d;--bd:#283546}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--fg);font:18px/1.7 Georgia,'Times New Roman',serif}
main{max-width:720px;margin:0 auto;padding:24px 18px 64px}h1,h2,h3,.meta,nav,.card,footer{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
h1{font-size:2rem;line-height:1.2;margin:.4em 0 .2em}h2{font-size:1.35rem;margin:2em 0 .4em;line-height:1.3}.meta{color:var(--mut);font-size:.85rem}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:14px 18px;margin:20px 0}.card ul{margin:.4em 0;padding-left:1.2em}
a{color:var(--ac)}sup.c{font-size:.7em}sup.c a{text-decoration:none}nav.toc a{display:block;padding:2px 0;text-decoration:none}
details{border-bottom:1px solid var(--bd);padding:10px 0}summary{cursor:pointer;font-weight:600}ol.src li{margin:.5em 0;word-break:break-word}
figure{margin:16px 0}figure img{max-width:100%;height:auto;border-radius:12px;display:block}figcaption{margin-top:6px}footer{margin-top:40px;color:var(--mut);font-size:.8rem}@media (max-width:480px){body{font-size:17px}h1{font-size:1.65rem}}`;
export function renderArticle(a,{site='Aafnai Patro',siteUrl='https://aafnaipatro.com'}={}){
 const wc=a.word_count||countWords(a),mins=a.reading_minutes||Math.max(1,Math.round(wc/220)),toc=(a.sections||[]).map((s,i)=>`<a href="#s${i}">${esc(s.h2)}</a>`).join('');
 const ld=[{'@context':'https://schema.org','@type':'Article',headline:a.title,description:a.meta_description,datePublished:a.published,dateModified:a.updated||a.published,author:{'@type':'Person',name:a.author||site},publisher:{'@type':'Organization',name:site},mainEntityOfPage:a.canonical_url,...(a.image?{image:a.canonical_url+a.image.file}:{}),citation:(a.sources||[]).map(s=>s.url)},
  {'@context':'https://schema.org','@type':'FAQPage',mainEntity:(a.faq||[]).map(f=>({'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:String(f.a).replace(/\s*\[\d+\]/g,'')}}))}];
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(a.title)} | ${esc(site)}</title>
<meta name="description" content="${esc(a.meta_description)}"><link rel="canonical" href="${esc(a.canonical_url)}"><meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(a.title)}"><meta property="og:description" content="${esc(a.meta_description)}"><meta property="og:url" content="${esc(a.canonical_url)}">${a.image?`<meta property="og:image" content="${esc(a.canonical_url+a.image.file)}"><meta name="twitter:card" content="summary_large_image">`:'<meta name="twitter:card" content="summary">'}
<style>${CSS}</style>${ld.map(o=>`<script type="application/ld+json">${JSON.stringify(o).replace(/</g,'\\u003c')}</script>`).join('')}</head>
<body><main><nav class="meta" aria-label="Breadcrumb"><a href="${esc(siteUrl)}/">Home</a> › ${esc(a.category||'Answers')}</nav>
<article><h1>${esc(a.h1||a.title)}</h1><p class="meta">By ${esc(a.author||site)} · ${esc(a.published)} · ${mins} min read · ${wc} words</p>
${a.image?`<figure><img src="${esc(a.image.file)}" alt="${esc(a.image.alt)}" width="${a.image.width||1200}" height="${a.image.height||630}" decoding="async"><figcaption class="meta">${esc(a.image.caption||'')} Image: ${esc(a.image.credit)} (${esc(a.image.license)})</figcaption></figure>`:''}<div class="card"><strong>Key takeaways</strong><ul>${(a.key_takeaways||[]).map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>
<nav class="card toc" aria-label="Contents"><strong>In this article</strong>${toc}</nav>
${(a.sections||[]).map((s,i)=>`<section id="s${i}"><h2>${esc(s.h2)}</h2>${s.paras.map(p=>`<p>${cite(p)}</p>`).join('')}</section>`).join('')}
<section id="faq"><h2>Frequently asked questions</h2>${(a.faq||[]).map(f=>`<details><summary>${esc(f.q)}</summary><p>${cite(f.a)}</p></details>`).join('')}</section>
<section id="sources"><h2>Sources</h2><ol class="src">${(a.sources||[]).map(s=>`<li id="src-${s.n}"><a href="${esc(s.url)}" rel="noopener nofollow">${esc(s.title)}</a> — ${esc(s.publisher)}${s.published_at?' ('+esc(s.published_at)+')':''}, retrieved ${esc(s.retrieved_at)}</li>`).join('')}</ol></section></article>
<footer>Written from the cited sources and reviewed against them. This page is educational and not professional advice.</footer></main></body></html>`;
}
