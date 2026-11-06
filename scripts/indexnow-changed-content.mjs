// Explicit, one-batch notification for published library and tool changes.
// Run with --submit only after a real change; the default is a no-submit preview.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const ORIGIN='https://aafnaipatro.com';
const SOURCES=[
  ['library','/sitemap-library.xml',p=>p==='/library'||/^\/article\/[a-z0-9-]+$/.test(p)],
  ['subjects','/library/subjects/sitemap.xml',p=>p.startsWith('/library/subjects/')],
  ['clientTools','/sitemap-client-tools.xml',p=>/^\/tool\/[a-z0-9-]+\/?$/.test(p)],
  ['mmTools','/sitemap-mm530.xml',p=>/^\/(?:calculators|generators|converters|utilities|validators|editors|planners|extractors|analyzers|formatters|comparisons|timers)\/[a-z0-9-]+\/?$/.test(p)],
  ['advancedTools','/sitemap-tools.xml',p=>/^\/advanced-tools\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/?$/.test(p)],
];
export async function collectPublicUrls(fetcher=fetch) {
  const groups=await Promise.all(SOURCES.map(async ([name,path,allow])=>{
    const response=await fetcher(ORIGIN+path);
    if(!response.ok)throw new Error(name+' sitemap HTTP '+response.status);
    const xml=await response.text();
    if(!/<urlset(?:\s|>)/i.test(xml))throw new Error(name+' sitemap is not a URL set');
    const urls=[];
    for(const m of xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/gi)){
      let url;
      try {url=new URL(m[1].replaceAll('&amp;','&'));} catch {continue}
      if(url.origin===ORIGIN&&!url.search&&!url.hash&&allow(url.pathname))urls.push(url.href);
    }
    return {name,urls:[...new Set(urls)]};
  }));
  const counts=Object.fromEntries(groups.map(x=>[x.name,x.urls.length]));
  if(counts.library<2000||counts.subjects<1||counts.clientTools<300||counts.mmTools<400||counts.advancedTools<1)
    throw new Error('Sitemap coverage incomplete: '+JSON.stringify(counts));
  const urls=[...new Set(groups.flatMap(x=>x.urls))];
  if(urls.length>10000)throw new Error('IndexNow batch exceeds 10,000 URLs');
  return {counts,urls};
}
export async function submitChanges({fetcher=fetch,key,submit=false}={}) {
  if(!/^[a-f0-9]{32}$/i.test(key||''))throw new Error('Existing IndexNow key is invalid');
  const keyResponse=await fetcher(ORIGIN+'/'+key+'.txt');
  if(!keyResponse.ok||(await keyResponse.text()).trim()!==key)throw new Error('Published IndexNow key file does not match');
  const {counts,urls}=await collectPublicUrls(fetcher);
  if(!submit)return {submitted:false,preview:true,counts,total:urls.length};
  const response=await fetcher('https://api.indexnow.org/indexnow',{
    method:'POST',headers:{'content-type':'application/json; charset=utf-8'},
    body:JSON.stringify({host:'aafnaipatro.com',key,keyLocation:ORIGIN+'/'+key+'.txt',urlList:urls}),
  });
  return {submitted:[200,202].includes(response.status),status:response.status,retryAfter:response.headers.get('retry-after'),counts,total:urls.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try {
    const script=await readFile('scripts/indexnow.mjs','utf8'),match=script.match(/const key\s*=\s*["']([a-f0-9]{32})["']/i);
    if(!match)throw new Error('Existing project IndexNow key was not found');
    const local=(await readFile('public/'+match[1]+'.txt','utf8')).trim();
    if(local!==match[1])throw new Error('Local IndexNow key file does not match');
    const result=await submitChanges({key:match[1],submit:process.argv.includes('--submit')});
    console.log(JSON.stringify(result,null,2));
    if(process.argv.includes('--submit')&&!result.submitted)process.exitCode=1;
  } catch(error) {console.error(String(error.message||error));process.exitCode=1}
}
