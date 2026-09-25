import type {ComponentNode} from './components';
/** Shared catalog adapter; legacy F2004 IDs and classifications remain untouched. */
export function makeCatalog(nodes:ComponentNode[]){
 const byId=new Map(nodes.map(n=>[n.id,n]));
 const path=(id:string)=>{const out:ComponentNode[]=[],seen=new Set<string>();let n=byId.get(id);while(n&&!seen.has(n.id)){seen.add(n.id);out.unshift(n);n=n.parentId?byId.get(n.parentId):undefined;}return out;};
 const resolve=(id:string):string[]=>{const out=new Set<string>(),seen=new Set<string>();const visit=(key:string)=>{if(seen.has(key))return;seen.add(key);const n=byId.get(key);if(n){n.geometryIds.forEach(g=>out.add(g));n.childrenIds.forEach(visit);}};visit(id);return [...out];};
 const filter=(q='',status='ALL',provenance='ALL')=>nodes.filter(n=>(!q||`${n.name} ${n.id} ${n.assembly} ${n.role}`.toLowerCase().includes(q.toLowerCase()))&&(status==='ALL'||n.simulationStatus===status)&&(provenance==='ALL'||n.dataClass===provenance));
 const counts=(key:'subsystem'|'simulationStatus'|'dataClass')=>Object.fromEntries([...new Set(nodes.map(n=>n[key]))].map(v=>[v,nodes.filter(n=>n[key]===v).length]));
 return {nodes,byId,path,resolve,filter,summary:{total:nodes.length,geometryBacked:new Set(nodes.flatMap(n=>n.geometryIds)).size,hierarchyOnly:nodes.filter(n=>!n.geometryIds.length).length,bySubsystem:counts('subsystem'),byStatus:counts('simulationStatus'),byProvenance:counts('dataClass')}};
}
