// Turn raw API responses into source CANDIDATES (leads). Nothing here is evidence until snapshotted and grounded.
const yr=v=>v?String(v).slice(0,10):null;
const inv=ix=>{if(!ix)return '';const w=[];for(const [k,pos] of Object.entries(ix))for(const p of pos)w[p]=k;return w.join(' ');};
const plain=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
export const NORMALIZERS={
 crossref:d=>(d.message?.items||[]).filter(i=>i.URL&&i.title?.[0]).map(i=>({url:i.URL,title:i.title[0],publisher:i.publisher||'Crossref',author:(i.author||[]).map(a=>[a.family,a.given].filter(Boolean).join(', ')).slice(0,3).join('; ')||null,published_at:yr(i.issued?.['date-parts']?.[0]?.join('-').replace(/-(\d)(?!\d)/g,'-0$1')),abstract:plain(i.abstract)})),
 openalex:d=>(d.results||[]).filter(r=>r.doi||r.id).map(r=>({url:r.doi||r.id,title:r.display_name,publisher:r.primary_location?.source?.display_name||'OpenAlex',author:(r.authorships||[]).map(a=>a.author?.display_name).filter(Boolean).slice(0,3).join('; ')||null,published_at:yr(r.publication_date),abstract:inv(r.abstract_inverted_index)})),
 europepmc:d=>(d.resultList?.result||[]).filter(r=>r.doi).map(r=>({url:'https://doi.org/'+r.doi,title:r.title,publisher:r.journalTitle||'Europe PMC',author:r.authorString||null,published_at:yr(r.firstPublicationDate),abstract:plain(r.abstractText)})),
 'wikipedia-search':d=>Object.values(d.query?.pages||{}).filter(p=>p.extract&&p.extract.length>200).map(p=>({url:'https://en.wikipedia.org/?curid='+p.pageid,title:p.title,publisher:'Wikipedia',author:null,published_at:null,abstract:p.extract})),
 wikipedia:(d)=>d.content_urls?.desktop?.page?[{url:d.content_urls.desktop.page,title:d.title,publisher:'Wikipedia',author:null,published_at:yr(d.timestamp)}]:[],
};
export function candidatesFrom(apiId,data){const f=NORMALIZERS[apiId];return f?f(data).filter(c=>c.url&&c.title&&/^https:\/\//.test(c.url)):[];}
export function dedupeByHost(cands,maxPerHost=2){const n=new Map(),seen=new Set();return cands.filter(c=>{if(seen.has(c.url))return false;seen.add(c.url);const h=new URL(c.url).host;n.set(h,(n.get(h)||0)+1);return n.get(h)<=maxPerHost;});}
