import data from "./mm530-registry.json";

export type Mm530ToolMeta = {
  id:string; sequence:number; title:string; route:string; sourceDir:string; batch:string;
  category:string; categoryLabel:string; summary:string;
};

export const MM530_TOOLS = data.tools as Mm530ToolMeta[];
export const MM530_ROUTE_MAP = new Map(MM530_TOOLS.map(tool=>[tool.route,tool] as const));
export const MM530_ID_MAP = new Map(MM530_TOOLS.map(tool=>[tool.id,tool] as const));
export const MM530_CATEGORIES = [...new Map(MM530_TOOLS.map(tool=>[
  tool.category,{key:tool.category,label:tool.categoryLabel,count:MM530_TOOLS.filter(x=>x.category===tool.category).length}
] as const)).values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
export function mm530ToolForRoute(path:string){return MM530_ROUTE_MAP.get(path.replace(/\/+$/,"")||"/")||null}
