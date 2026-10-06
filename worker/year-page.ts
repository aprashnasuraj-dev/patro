import { publicArchivePageResponse } from "./public-archive-pages";

type Env = Record<string, unknown> & { PUBLIC_SITE_URL?: string };

/**
 * Compatibility wrapper retained for the agent gateway and contracts.
 * Calendar year HTML is now served from the immutable R2 calendar archive; there is no normal
 * D1 page-read path. If the R2 archive is unavailable, fail closed instead of spending D1 quota.
 */
export async function yearPageResponse(request:Request,env:Env):Promise<Response|null>{
  if(request.method!=="GET"&&request.method!=="HEAD")return null;
  const path=new URL(request.url).pathname.replace(/\/+$/,"")||"/";
  const match=path.match(/^\/calendar\/(\d{4})$/);if(!match)return null;
  const year=Number(match[1]);if(!Number.isInteger(year)||year<1800||year>2200)return new Response("Invalid BS year",{status:400});
  const response=await publicArchivePageResponse(request,env);
  return response||new Response("Calendar R2 archive unavailable",{status:503,headers:{"cache-control":"no-store","x-robots-tag":"noindex, nofollow","x-patro-backend":"r2-required"}});
}
