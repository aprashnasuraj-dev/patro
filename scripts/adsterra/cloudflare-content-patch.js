// Reapply to a dedicated Worker through the Cloudflare API adapter.
// Call deployAds(name) with cloudflare.request(), accountId and AD_MODULE
// (the stripped shared/adsterra.ts source) in the surrounding async scope.
// Only the deployed code changes; content-only mode retains bindings/settings.
async function deployAds(name, options={}) {
 if(options.assetRouting)throw Error("keep_assets preserves routing too; deploy wrangler.adsterra.jsonc for static HTML coverage");
 const root="/accounts/"+accountId+"/workers/scripts/"+name;
 const settings=(await cloudflare.request({method:"GET",path:root+"/settings"})).result;
 const source=await cloudflare.request({method:"GET",path:root});
 if(typeof source!=="string"||source.includes(" --- TRUNCATED --- "))throw Error("Incomplete original source");
 const deployments=await cloudflare.request({method:"GET",path:root+"/deployments"});
 const oldVersion=deployments.result?.deployments?.[0]?.versions?.[0]?.version_id;
 let parts=[];
 if(source.startsWith("--")){
  const boundary=source.slice(0,source.indexOf("\r\n"));
  for(const piece of source.split(boundary).slice(1)){
   if(piece.startsWith("--"))continue;
   const index=piece.indexOf("\r\n\r\n");if(index<0)continue;
   const header=piece.slice(0,index),match=header.match(/name="([^"]+)"/);
   if(!match)throw Error("Invalid part");
   parts.push({name:match[1],body:piece.slice(index+4).replace(/\r\n$/,""),type:header.match(/Content-Type:\s*([^\r\n]+)/i)?.[1]||"application/javascript+module"});
  }
 }else parts=[{name:"worker.js",body:source,type:"application/javascript"}];
 if(parts.some(p=>p.name==="patro-adsterra-entry.mjs"))throw Error("Ads already installed");
 const module=parts.find(p=>/\.(?:m?js)$/.test(p.name));if(!module)throw Error("Missing entry");
 let metadata, routing, oldAssets;
 if(!/export\s*(?:\{|default)/.test(module.body)) {
  if(!/addEventListener\((["'])fetch\1\s*,/.test(module.body))throw Error("Unrecognized service-worker listener");
  module.body=module.body.replace(/addEventListener\((["'])fetch\1\s*,/,'__patroAdsListener("fetch",');
  module.body+="\n"+AD_MODULE.replace(/export\s+(?=(?:const|function))/g,"")+"\nfunction __patroAdsListener(type,listener){addEventListener(type,event=>listener(new Proxy(event,{get(target,key){if(key==='respondWith')return value=>target.respondWith(Promise.resolve(value).then(response=>adsterraResponse(target.request,response)));const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}})));}\n";
  module.type="application/javascript";metadata={body_part:module.name};
 } else {
  let prelude="";
  if(options.assetRouting) {
   const version=(await cloudflare.request({method:"GET",path:root+"/versions/"+oldVersion})).result;
   oldAssets=version.resources.script_runtime.assets;
   const oldRules=oldAssets.raw_run_worker_first||[];
   const nonHtml=/^!\/(?:assets\/|data\/|vendor\/|icons\/|fonts\/|nepali-tools\/core\/|_mm530\/|aap\/|advancetools\/(?:assets|downloads|licenses)(?:\/|$))|\.(?:js|mjs|json|txt|xml|png|ico|svg|webmanifest|ics)(?:$|\*)/;
   routing=options.datePages?["/*"]:oldRules.filter(r=>r==="/*"||nonHtml.test(r));
   const removed=options.datePages?["/date/*"]:oldRules.filter(r=>r.startsWith("!")&&!routing.includes(r)).map(r=>r.slice(1));
   prelude="const assetPaths="+JSON.stringify(removed)+";\nfunction assetPath(path){return assetPaths.some(rule=>{const i=rule.indexOf('*');return i<0?path===rule:path.startsWith(rule.slice(0,i))&&path.endsWith(rule.slice(i+1));});}\n";
  }
  const wrapper='import original from "./'+module.name+'";\nimport {adsterraResponse} from "./patro-adsterra.mjs";\nexport * from "./'+module.name+'";\n'+prelude+'export default {...original,async fetch(request,env,ctx){'+(options.assetRouting?'if(["GET","HEAD"].includes(request.method)&&assetPath(new URL(request.url).pathname)&&env.ASSETS){const asset=await env.ASSETS.fetch(request);if(asset.status!==404)return adsterraResponse(request,asset);}\n':'')+'return adsterraResponse(request,await original.fetch(request,env,ctx));}};\n';
  parts.push({name:"patro-adsterra.mjs",body:AD_MODULE,type:"application/javascript+module"},{name:"patro-adsterra-entry.mjs",body:wrapper,type:"application/javascript+module"});
  metadata={main_module:"patro-adsterra-entry.mjs"};
 }
 let endpoint=root+"/content";
 if(options.assetRouting){
  endpoint=root;
  const bindingTypes=[...new Set(settings.bindings.map(x=>x.type))];
  metadata={...metadata,keep_assets:true,keep_bindings:bindingTypes,compatibility_date:settings.compatibility_date,compatibility_flags:settings.compatibility_flags,usage_model:settings.usage_model,observability:settings.observability,logpush:settings.logpush,tags:settings.tags,tail_consumers:settings.tail_consumers,
   assets:{config:{not_found_handling:oldAssets.not_found_handling||"none",...(oldAssets.html_handling?{html_handling:oldAssets.html_handling}:{}),base_path:oldAssets.base_path||"/",_headers:oldAssets.raw_headers||"",_redirects:oldAssets.raw_redirects||"",run_worker_first:routing}}
  };
 }
 const b="PatroAds"+Date.now();
 const body=[["metadata",JSON.stringify(metadata),"application/json"],...parts.map(p=>[p.name,p.body,p.type])].map(([n,s,t])=>"--"+b+'\r\nContent-Disposition: form-data; name="'+n+'"; filename="'+n+'"\r\nContent-Type: '+t+'\r\n\r\n'+s+"\r\n").join("")+"--"+b+"--\r\n";
 const upload=await cloudflare.request({method:"PUT",path:endpoint,body,contentType:"multipart/form-data; boundary="+b,rawBody:true});
 if(!upload.success)return {name,oldVersion,success:false,errors:upload.errors};
 return {name,oldVersion,success:true,version:upload.result?.version_id,etag:upload.result?.etag,parts:parts.map(p=>p.name),routing};
}

