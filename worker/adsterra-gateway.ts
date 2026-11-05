import {adsterraResponse} from "../shared/adsterra";
export default {
 async fetch(request: Request,env: {ORIGIN: Fetcher; DATE: Fetcher}) {
  const url=new URL(request.url);
  const response=await (url.pathname.startsWith("/date/")?env.DATE:env.ORIGIN).fetch(request);
  return adsterraResponse(request,response);
 }
};
