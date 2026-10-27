export type OrgRow={id:string;name:string;title:string;managerId:string};
export type OrgNode=OrgRow&{children:OrgNode[];depth:number};
export function orgTree(input:OrgRow[]){
 if(!Array.isArray(input)||input.length<1||input.length>500)throw new Error('Use 1–500 organization rows.');
 const rows=input.map((r,i)=>({id:String(r.id||'').trim().slice(0,80),name:String(r.name||'').trim().slice(0,160),title:String(r.title||'').trim().slice(0,160),managerId:String(r.managerId||'').trim().slice(0,80)}));
 const map=new Map<string,OrgNode>();for(const [i,r] of rows.entries()){if(!r.id)throw new Error(`Row ${i+1}: ID is required.`);if(map.has(r.id))throw new Error(`Duplicate ID: ${r.id}`);if(!r.name)throw new Error(`Row ${i+1}: name is required.`);map.set(r.id,{...r,children:[],depth:0})}
 for(const n of map.values()){if(n.managerId===n.id)throw new Error(`Node ${n.id} cannot manage itself.`);if(n.managerId&&!map.has(n.managerId))throw new Error(`Missing manager ${n.managerId} referenced by ${n.id}.`)}
 const state=new Map<string,number>();function visit(id:string,depth=0){if(depth>100)throw new Error('Hierarchy depth exceeds 100.');const s=state.get(id)||0;if(s===1)throw new Error(`Cycle detected involving ${id}.`);if(s===2)return;state.set(id,1);const n=map.get(id)!;if(n.managerId)visit(n.managerId,depth+1);state.set(id,2)}for(const id of map.keys())visit(id);
 const roots:OrgNode[]=[];for(const n of map.values()){if(n.managerId)map.get(n.managerId)!.children.push(n);else roots.push(n)}if(roots.length<1)throw new Error('No root node found.');
 let maxDepth=0;function setDepth(n:OrgNode,d:number){n.depth=d;maxDepth=Math.max(maxDepth,d);n.children.sort((a,b)=>a.name.localeCompare(b.name));for(const c of n.children)setDepth(c,d+1)}roots.sort((a,b)=>a.name.localeCompare(b.name));for(const r of roots)setDepth(r,0);
 return {roots,maxDepth,count:rows.length};
}
