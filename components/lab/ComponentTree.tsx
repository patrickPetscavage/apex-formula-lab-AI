'use client';
import {useState} from 'react';
import {Box,EyeOff,Layers3,Search} from 'lucide-react';
import {COMPONENTS as LEGACY_COMPONENTS,COMPONENT_BY_ID as LEGACY_BY_ID,COMPONENT_SUMMARY as LEGACY_SUMMARY,componentPath as legacyPath,filterComponents as legacyFilter} from '@/lib/components';

import type {makeCatalog} from '@/lib/componentCatalog';
type Props={catalog?:ReturnType<typeof makeCatalog>;selected:string;hidden:Set<string>;search:string;onSearch:(value:string)=>void;onSelect:(id:string)=>void};
const statuses=['ALL','VISUAL','HIERARCHY-ONLY','SHARED MODEL INPUT','INDEPENDENTLY SIMULATED','UNSUPPORTED'] as const;
const provenances=['ALL','DOCUMENTED','DERIVED','ESTIMATED','USER-DEFINED'] as const;
export default function ComponentTree({selected,hidden,search,onSearch,onSelect,catalog}:Props){
 const COMPONENTS=catalog?.nodes??LEGACY_COMPONENTS,COMPONENT_BY_ID=catalog?.byId??LEGACY_BY_ID,COMPONENT_SUMMARY=catalog?.summary??LEGACY_SUMMARY,componentPath=catalog?.path??legacyPath,filterComponents=catalog?.filter??legacyFilter;
 const [status,setStatus]=useState<(typeof statuses)[number]>('ALL'),[provenance,setProvenance]=useState<(typeof provenances)[number]>('ALL');
 const query=search.trim().toLowerCase(),matching=new Set(filterComponents(query,status,provenance).map(c=>c.id)),matches=(id:string)=>matching.has(id);
 const subsystems=COMPONENTS.filter(c=>c.kind==='subsystem');let visibleCount=0;
 return <>
  <div className="panel-heading"><span>COMPONENTS</span><span className="count">{COMPONENTS.length}</span></div>
  <label className="search-field"><Search size={15}/><input value={search} onChange={e=>onSearch(e.target.value)} placeholder="Name or component ID…" aria-label="Find a component"/></label>
  <div className="component-filters"><select aria-label="Simulation status filter" value={status} onChange={e=>setStatus(e.target.value as typeof status)}>{statuses.map(s=><option key={s}>{s}</option>)}</select><select aria-label="Provenance filter" value={provenance} onChange={e=>setProvenance(e.target.value as typeof provenance)}>{provenances.map(s=><option key={s}>{s}</option>)}</select></div>
  <div className="component-tree">{subsystems.map(system=>{const assemblies=system.childrenIds.map(id=>COMPONENT_BY_ID.get(id)!).filter(Boolean);const rows=assemblies.map(assembly=>{const members=COMPONENTS.filter(c=>(c.kind==='component'||c.kind==='subcomponent')&&c.assembly===assembly.name),ids=members.filter(c=>matches(c.id)).map(c=>c.id);visibleCount+=ids.length;if(!ids.length&&!matches(assembly.id))return null;return <details className="assembly-node" key={assembly.id} open={!!query||componentPath(selected).some(c=>c.id===assembly.id)||COMPONENT_BY_ID.get(selected)?.assembly===assembly.name}><summary><Layers3 size={13}/><span>{assembly.name}</span><small>{members.length}</small></summary>{ids.map(id=>{const c=COMPONENT_BY_ID.get(id)!,depth=c.kind==='subcomponent'?1:0;return <button style={{paddingLeft:`${22+depth*13}px`}} className={`part-row ${selected===id?'selected':''}`} key={id} onClick={()=>onSelect(id)} aria-pressed={selected===id} title={`${c.simulationStatus} · ${c.dataClass}`}><span className={`tree-line ${c.kind==='subcomponent'?'detail':''}`}/><span>{c.name}</span>{c.childrenIds.length>0&&<small>{c.childrenIds.length}</small>}{hidden.has(id)&&<EyeOff size={12}/>}</button>;})}</details>});if(rows.every(r=>!r)&&!matches(system.id))return null;return <details className="subsystem-node" key={system.id} open={!!query||componentPath(selected).some(c=>c.id===system.id)||COMPONENT_BY_ID.get(selected)?.subsystem===system.name}><summary><Box size={14}/><span>{system.name}</span><small>{system.childrenIds.length}</small></summary>{rows}</details>;})}{visibleCount===0&&<p className="empty">No matching components.</p>}</div>
  <details className="component-summary"><summary>Catalog summary</summary><p><strong>{COMPONENT_SUMMARY.geometryBacked}</strong> geometry-backed · <strong>{COMPONENT_SUMMARY.hierarchyOnly}</strong> hierarchy nodes</p>{Object.entries(COMPONENT_SUMMARY.bySubsystem).map(([name,count])=><p key={name}>{name}<span>{count}</span></p>)}{Object.entries(COMPONENT_SUMMARY.byStatus).filter(([,count])=>count>0).map(([name,count])=><p key={name}>{name}<span>{count}</span></p>)}{Object.entries(COMPONENT_SUMMARY.byProvenance).filter(([,count])=>count>0).map(([name,count])=><p key={name}>{name}<span>{count}</span></p>)}</details>
  <div className="sidebar-note"><Box size={17}/><p>Engineering hierarchy.<br/><span>Geometry and physics status shown separately.</span></p></div>
 </>;
}
