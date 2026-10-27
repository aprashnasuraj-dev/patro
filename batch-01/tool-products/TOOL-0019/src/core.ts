export type Result={text:string;warnings?:string[];details?:Record<string,string|number>};
function getName(path:string):string{const k='node_modules/';const idx=path.lastIndexOf(k);return idx<0?'':path.slice(idx+k.length);}
export function convert(input:string,opts:Record<string,string|boolean>={}):Result{
 if(input.length>1200000)throw Error('Lockfile exceeds 1.2 MB browser input budget');let v:unknown;try{v=JSON.parse(input)}catch{throw Error('Invalid lockfile JSON')}
 if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Expected npm package-lock object');const lock=v as Record<string,unknown>;
 if(lock.lockfileVersion!==2&&lock.lockfileVersion!==3)throw Error('Only npm lockfileVersion 2 or 3 is supported');
 const pkgs=lock.packages;if(!pkgs||typeof pkgs!=='object'||Array.isArray(pkgs))throw Error('Missing packages map');const map=new Map<string,Map<string,string[]>>();
 for(const [path,raw] of Object.entries(pkgs as Record<string,unknown>)){if(!path||path.length>400)continue;const name=getName(path);if(!name)continue;if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
 const version=(raw as Record<string,unknown>).version;if(typeof version!=='string'||version.length>100)continue;const versions=map.get(name)||new Map<string,string[]>();const dirs=versions.get(version)||[];dirs.push(path);versions.set(version,dirs);map.set(name,versions);}
 const min=Number(opts.minLocations||2);if(!Number.isInteger(min)||min<2||min>20)throw Error('minLocations must be between 2 and 20');const duplicates=[] as Array<{name:string;locations:number;versions:Array<{version:string;paths:string[]}>}>;
 for(const [name,versions] of map){const locations=[...versions.values()].reduce((a,p)=>a+p.length,0);if(locations>=min)duplicates.push({name,locations,versions:[...versions].map(([version,paths])=>({version,paths:paths.sort()})).sort((a,b)=>a.version.localeCompare(b.version))});}
 duplicates.sort((a,b)=>b.locations-a.locations||a.name.localeCompare(b.name));
 return{text:JSON.stringify({lockfileVersion:lock.lockfileVersion,duplicatePackages:duplicates},null,2)+'\n',details:{packages:map.size,duplicateNames:duplicates.length},warnings:['Duplicate physical installations are not automatically vulnerable or unnecessary.','Review semver constraints before npm dedupe; no external vulnerability lookup performed.']};
}
