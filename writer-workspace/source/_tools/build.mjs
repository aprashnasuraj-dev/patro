// node build.mjs  →  site/<slug>/index.html for every articles/*.json, plus sitemap.xml, a QA report and playbox.html (renderer inlined).
import {readdirSync,readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync} from 'node:fs';import {renderArticle,checkArticle} from './render.mjs';
const arts=readdirSync('articles').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync('articles/'+f,'utf8')));
const slugs=arts.map(a=>a.slug);if(new Set(slugs).size!==slugs.length)throw Error('duplicate slugs');
const needImg=process.env.REQUIRE_IMAGE==='1';let bad=0;for(const a of arts){const res=checkArticle(a,{takenSlugs:[],requireImage:needImg});
 if(a.image&&!existsSync('images/'+a.image.file))res.push({ok:false,label:'Image file missing in images/: '+a.image.file});
 const fail=res.filter(x=>!x.ok);if(fail.length){bad++;console.log('FAIL',a.slug,fail.map(f=>f.label));}
 mkdirSync('site/'+a.slug,{recursive:true});if(a.image&&existsSync('images/'+a.image.file))copyFileSync('images/'+a.image.file,`site/${a.slug}/${a.image.file}`);writeFileSync(`site/${a.slug}/index.html`,renderArticle(a));}
writeFileSync('site/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${arts.map(a=>`<url><loc>${a.canonical_url}</loc><lastmod>${a.updated||a.published}</lastmod></url>`).join('')}</urlset>`);
const src=readFileSync('render.mjs','utf8').replace(/export /g,'');
const tpl=readFileSync('playbox.template.html','utf8').replace('/*RENDER*/',src).replace('/*SAMPLE*/',JSON.stringify(arts[0]||{}).replace(/</g,'\\u003c'));
writeFileSync('playbox.html',tpl);console.log('built',arts.length,'article(s);',bad,'failing the publish gate');
if(bad&&process.env.STRICT)process.exit(1);
