/** Read-only route mapping and safe related-link view model for Patro integration. */
import {readFile} from 'node:fs/promises';
const registry=JSON.parse(await readFile(new URL('./route-catalog-530.json',import.meta.url),'utf8'));
const byId=new Map(registry.map(t=>[t.id,t]));
const byRoute=new Map(registry.map(t=>[t.canonical_proposed,t]));
export const allTools=Object.freeze(registry);
export const getToolById=id=>byId.get(id)||null;
export const getToolByProposedRoute=path=>byRoute.get(path)||null;
export function createToolPageModel({id,publishedIds,siteCollisionFreeRoutes}){
 const t=byId.get(id);
 if(!t||!publishedIds.has(id)||!siteCollisionFreeRoutes.has(t.canonical_proposed))return null;
 const related=(t.related_tool_ids||[]).map(ref=>byId.get(ref)).filter(x=>x&&publishedIds.has(x.id)&&siteCollisionFreeRoutes.has(x.canonical_proposed)).map(x=>({title:x.title,url:x.canonical_proposed,id:x.id}));
 return Object.freeze({id:t.id,title:t.title,canonical:t.canonical_proposed,group:t.primary_group,topic:t.topic_group,
   breadcrumbs:[{label:'Utilities',href:'/utilities'},{label:t.primary_group,href:'/'+t.primary_group},{label:t.title,href:t.canonical_proposed}],
   related,robots:'index, follow'});
}
export function toolCardViewModel(id,publishedIds,siteCollisionFreeRoutes){
 const page=createToolPageModel({id,publishedIds,siteCollisionFreeRoutes});
 return page?{id:page.id,title:page.title,url:page.canonical,topic:page.topic}:null;
}
// NEVER create publishedIds or siteCollisionFreeRoutes from draft/source JSON status alone.
// Populate them only from actual QA receipts and Patro baseline collision audit.
