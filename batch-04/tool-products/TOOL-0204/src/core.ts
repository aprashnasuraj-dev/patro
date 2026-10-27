
import {invNorm} from "../_vendor/stats";
export function surveySampleSize(population:number,margin:number,confidence:number,proportion=0.5,designEffect=1,expectedResponse=1){
  if(!Number.isFinite(population)||population<1)throw new Error("Population must be at least 1.");
  if(!(margin>0&&margin<1&&confidence>0&&confidence<1&&proportion>0&&proportion<1&&designEffect>=1&&expectedResponse>0&&expectedResponse<=1))throw new Error("Invalid planning assumptions.");
  const z=invNorm(0.5+confidence/2);
  const n0=z*z*proportion*(1-proportion)/(margin*margin);
  const finite=population*n0/(population+n0-1);
  const completed=Math.ceil(finite*designEffect);
  const invited=Math.ceil(completed/expectedResponse);
  return {infinitePopulation:n0,finitePopulation:finite,completedResponses:completed,invitations:invited,z,assumptions:{proportion,designEffect,expectedResponse},warning:proportion===0.5?"p=0.5 is the conservative maximum-variance assumption.":null};
}
