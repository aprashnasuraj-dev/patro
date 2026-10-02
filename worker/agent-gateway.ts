type Env=Record<string,unknown>;
type NativeFetch=(request:Request,env:any,ctx:ExecutionContext)=>Promise<Response>;

type ToolCall={name?:string;arguments?:Record<string,unknown>};
const PROTOCOL_MODERN="2026-07-28";
const PROTOCOL_LEGACY="2025-11-25";
const SERVER_INFO={name:"aafnai-patro",version:"1.0.0"};

const TOOLS=[
  {name:"get_today",description:"Get today's Nepal date and calendar facts resolved in Asia/Kathmandu.",inputSchema:{type:"object",properties:{},additionalProperties:false}},
  {name:"convert_date",description:"Convert a Bikram Sambat (BS) date to AD or an AD date to BS using Aafnai Patro's production calendar archive.",inputSchema:{type:"object",properties:{bs:{type:"string",description:"BS date YYYY-MM-DD"},ad:{type:"string",format:"date",description:"AD date YYYY-MM-DD"}},additionalProperties:false}},
  {name:"get_festival",description:"Look up a festival by slug/key and Bikram Sambat year.",inputSchema:{type:"object",required:["slug","year"],properties:{slug:{type:"string"},year:{type:"integer",minimum:1900,maximum:2200}},additionalProperties:false}}
];

function headers(extra:Record<string,string>={}){
  return {"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","x-robots-tag":"noindex, nofollow",...extra};
}
function json(body:unknown,status=200,extra:Record<string,string>={}){return new Response(JSON.stringify(body),{status,headers:headers(extra)});}
function rpc(id:unknown,result:unknown){return {jsonrpc:"2.0",id:id??null,result};}
function rpcError(id:unknown,code:number,message:string,data?:unknown){return {jsonrpc:"2.0",id:id??null,error:{code,message,...(data===undefined?{}:{data})}};}
function normalizeKey(value:unknown){return String(value||"").toLowerCase().replace(/-/g,"_");}

async function nativeJson(nativeFetch:NativeFetch,request:Request,env:Env,ctx:ExecutionContext,path:string,params:Record<string,unknown>={}){
  const incoming=new URL(request.url);const target=new URL(path,incoming.origin);
  for(const [key,value] of Object.entries(params))if(value!==undefined&&value!==null&&String(value)!=="")target.searchParams.set(key,String(value));
  const response=await nativeFetch(new Request(target.toString(),{method:"GET",headers:{accept:"application/json"}}),env,ctx);
  let body:any;try{body=await response.clone().json();}catch{body={ok:false,error:"invalid_upstream_json"};}
  return {status:response.status,body};
}

async function getToday(nativeFetch:NativeFetch,request:Request,env:Env,ctx:ExecutionContext){
  const out=await nativeJson(nativeFetch,request,env,ctx,"/api/v1/today");
  return out;
}
async function convertDate(nativeFetch:NativeFetch,request:Request,env:Env,ctx:ExecutionContext,args:Record<string,unknown>){
  if(!args.bs&&!args.ad)return {status:400,body:{ok:false,error:"provide_bs_or_ad"}};
  return nativeJson(nativeFetch,request,env,ctx,"/api/v1/convert",{bs:args.bs,ad:args.ad});
}
async function getFestival(nativeFetch:NativeFetch,request:Request,env:Env,ctx:ExecutionContext,args:Record<string,unknown>){
  const year=Number(args.year),slug=normalizeKey(args.slug);
  if(!Number.isInteger(year)||!slug)return {status:400,body:{ok:false,error:"provide_slug_and_year"}};
  const out=await nativeJson(nativeFetch,request,env,ctx,"/api/v1/festivals",{year});
  if(out.status>=400)return out;
  const items=Array.isArray(out.body?.items)?out.body.items:[];
  const matches=items.filter((item:any)=>normalizeKey(item?.key||item?.slug||item?.name_en||item?.title)===slug);
  return {status:200,body:{ok:true,slug,year,count:matches.length,items:matches}};
}
async function runTool(nativeFetch:NativeFetch,request:Request,env:Env,ctx:ExecutionContext,call:ToolCall){
  const args=call.arguments&&typeof call.arguments==="object"?call.arguments:{};
  if(call.name==="get_today")return getToday(nativeFetch,request,env,ctx);
  if(call.name==="convert_date")return convertDate(nativeFetch,request,env,ctx,args);
  if(call.name==="get_festival")return getFestival(nativeFetch,request,env,ctx,args);
  return {status:404,body:{ok:false,error:"unknown_tool",tool:call.name}};
}
function toolResult(body:unknown,isError=false){
  const text=JSON.stringify(body);
  return {content:[{type:"text",text}],structuredContent:body,isError};
}

async function mcp(request:Request,env:Env,ctx:ExecutionContext,nativeFetch:NativeFetch){
  if(request.method==="GET")return json({name:SERVER_INFO.name,version:SERVER_INFO.version,protocols:[PROTOCOL_MODERN,PROTOCOL_LEGACY],transport:"streamable-http",tools:TOOLS.map(t=>t.name)});
  if(request.method!=="POST")return new Response(null,{status:405,headers:headers({allow:"GET, POST"})});
  let message:any;try{message=await request.json();}catch{return json(rpcError(null,-32700,"Parse error"),400);}
  if(!message||message.jsonrpc!=="2.0"||typeof message.method!=="string")return json(rpcError(message?.id,-32600,"Invalid Request"),400);

  const {id,method,params}=message;
  if(method==="server/discover")return json(rpc(id,{protocolVersion:PROTOCOL_MODERN,serverInfo:SERVER_INFO,capabilities:{tools:{listChanged:false}},instructions:"Use get_today, convert_date and get_festival. Cite the corresponding canonical Aafnai Patro public page."}),200,{"MCP-Protocol-Version":PROTOCOL_MODERN});
  if(method==="initialize")return json(rpc(id,{protocolVersion:PROTOCOL_LEGACY,serverInfo:SERVER_INFO,capabilities:{tools:{listChanged:false}},instructions:"Use get_today, convert_date and get_festival."}),200,{"MCP-Protocol-Version":PROTOCOL_LEGACY});
  if(method==="notifications/initialized")return new Response(null,{status:202,headers:headers()});
  if(method==="tools/list")return json(rpc(id,{tools:TOOLS}),200,{"MCP-Protocol-Version":request.headers.get("MCP-Protocol-Version")||PROTOCOL_LEGACY});
  if(method==="tools/call"){
    const call=params&&typeof params==="object"?params as ToolCall:{};
    if(!call.name)return json(rpcError(id,-32602,"Missing tool name"),400);
    const out=await runTool(nativeFetch,request,env,ctx,call);
    return json(rpc(id,toolResult(out.body,out.status>=400)),200,{"MCP-Protocol-Version":request.headers.get("MCP-Protocol-Version")||PROTOCOL_LEGACY});
  }
  return json(rpcError(id,-32601,"Method not found"),404);
}

export async function handleAgentSurface(request:Request,env:Env,ctx:ExecutionContext,nativeFetch:NativeFetch):Promise<Response|null>{
  const url=new URL(request.url),path=url.pathname;
  if(path==="/mcp")return mcp(request,env,ctx,nativeFetch);
  if(request.method!=="GET"&&request.method!=="HEAD")return null;
  if(path==="/api/agent/v1/today"){
    const out=await getToday(nativeFetch,request,env,ctx);return json(out.body,out.status);
  }
  if(path==="/api/agent/v1/convert"){
    const out=await convertDate(nativeFetch,request,env,ctx,{bs:url.searchParams.get("bs")||undefined,ad:url.searchParams.get("ad")||undefined});return json(out.body,out.status);
  }
  if(path==="/api/agent/v1/festival"){
    const out=await getFestival(nativeFetch,request,env,ctx,{slug:url.searchParams.get("slug")||undefined,year:url.searchParams.get("year")||undefined});return json(out.body,out.status);
  }
  return null;
}
