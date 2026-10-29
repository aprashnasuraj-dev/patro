import { routeGeoJson, routeGpx, routeKml } from "./export-core.mjs";

function download(name,type,text){
  const blob=new Blob([text],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function exportRoute(format,input){
  const stamp=new Date().toISOString().slice(0,10);
  if(format==="gpx") return download("aafnaipatro-nepal-route-"+stamp+".gpx","application/gpx+xml",routeGpx(input));
  if(format==="kml") return download("aafnaipatro-nepal-route-"+stamp+".kml","application/vnd.google-earth.kml+xml",routeKml(input));
  if(format==="geojson") return download("aafnaipatro-nepal-route-"+stamp+".geojson","application/geo+json",routeGeoJson(input));
  throw new Error("unsupported export format");
}
window.AafnaiExports={exportRoute};
