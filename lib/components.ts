import type {NumericKey} from './sim/setup';
export type Part = {id:string;name:string;assembly:string;role:string;geometry:string;mass:number;parentId:string;mountsTo:string[];geometryEffects:string[];modelEffects:string[];parameters:NumericKey[];provenance:'Reference-based reconstruction'|'Schematic internal component';confidence:'medium'|'low';sources:string[];dependencies:string[]};
export const PARTS:Part[]=[];
const add=(id:string,name:string,assembly:string,role:string,mass:number,parameters:NumericKey[]=[],internal=false)=>PARTS.push({id,name,assembly,role,mass,parentId:`assembly:${assembly.toLowerCase().replaceAll(' ','-')}`,mountsTo:[],geometryEffects:parameters.filter(p=>['frontWing','rearWing','rideHeight','camber','toe'].includes(p)),modelEffects:parameters.filter(p=>!['camber','toe'].includes(p)),parameters,geometry:`procedural:${id}`,confidence:internal?'low':'medium',sources:['https://www.ferrari.com/en-EN/formula1/f2004'],provenance:internal?'Schematic internal component':'Reference-based reconstruction',dependencies:parameters.filter(p=>!['camber','toe'].includes(p))});
add('front-main','Main plane','Front wing','Primary front aerodynamic surface.',8,['frontWing']);
add('front-flap','Adjustable flap','Front wing','Front downforce adjustment and flow conditioning.',3,['frontWing']);
for(const s of ['left','right'])add(`front-end-${s}`,`${s==='left'?'Left':'Right'} endplate`,'Front wing','Controls the front wing edge flow.',1.5,['frontWing']);
add('rear-main','Main plane','Rear wing','Primary rear aerodynamic surface.',8,['rearWing']);
add('rear-flap','Adjustable flap','Rear wing','Rear downforce adjustment.',3,['rearWing']);
for(const s of ['left','right'])add(`rear-end-${s}`,`${s==='left'?'Left':'Right'} endplate`,'Rear wing','Rear wing edge surface.',2,['rearWing']);
add('rear-pylon','Central support','Rear wing','Transfers wing loads into the rear structure.',3);
add('floor','Floor assembly','Floor & diffuser','Underbody aerodynamic surface.',30,['rideHeight']);
add('diffuser','Diffuser ramp','Floor & diffuser','Expands underfloor airflow toward the rear.',7,['rideHeight']);
for(let i=0;i<4;i++)add(`fence-${i}`,`Diffuser strake ${i+1}`,'Floor & diffuser','Schematic underbody flow guide.',1,['rideHeight']);
add('tub','Survival cell','Chassis & cockpit','Representative carbon-composite monocoque.',100,['ballast','frontWeight','cgHeight']);
add('nose','Nose cone','Chassis & cockpit','Front bodywork and impact structure.',12);
add('cockpit','Cockpit opening','Chassis & cockpit','Schematic driver compartment.',4);
add('halo','Cockpit rim & mirrors','Chassis & cockpit','Reconstructed 2004 cockpit surround. Stable legacy ID; this car has no halo.',2);
add('seat','Driver seat','Chassis & cockpit','Schematic seated-driver support.',5,[],true);
add('engine-cover','Engine cover','Bodywork','Removable representative upper bodywork.',9);
add('airbox','Air intake','Bodywork','Representative overhead engine intake.',3);
for(const s of ['left','right'])add(`sidepod-${s}`,`${s==='left'?'Left':'Right'} sidepod`,'Bodywork','Houses cooling and shapes external airflow.',6);
for(const axle of ['front','rear'])for(const side of ['left','right']){
 const label=`${axle==='front'?'Front':'Rear'} ${side}`,id=`${axle}-${side}`;
 add(`tire-${id}`,`${label} tire`,'Wheels & tires','Reconstructed grooved tire; compound controls modeled grip.',10,['camber','toe']);
 add(`rim-${id}`,`${label} rim`,'Wheels & tires','Reconstructed 13-inch wheel.',8,['camber','toe']);
 add(`disc-${id}`,`${label} brake disc`,'Brakes','Schematic carbon brake rotor.',2,['brakeBias'],true);
 add(`caliper-${id}`,`${label} caliper`,'Brakes','Schematic brake caliper.',2,['brakeBias'],true);
 for(const k of ['upper','lower','pushrod'])add(`${id}-${k}`,`${label} ${k}`,'Suspension','Schematic suspension link; transient link dynamics are not modeled.',1,[],true);
}
add('engine','3.0 litre V10','Powertrain & cooling','Schematic ten-cylinder engine; power control sets effective wheel power.',145,['power'],true);
add('gearbox','Transmission','Powertrain & cooling','Schematic seven-speed transmission. Ratios and power curve are estimated; no shift delay.',40,['finalDrive'],true);
add('battery','Electronics enclosure','Powertrain & cooling','Schematic control electronics. No hybrid energy store on this car.',35,[],true);
add('fuel-cell','Fuel cell','Powertrain & cooling','Fuel mass is constant throughout the lap.',8,['fuel'],true);
for(const s of ['left','right'])add(`radiator-${s}`,`${s==='left'?'Left':'Right'} radiator`,'Powertrain & cooling','Schematic cooling core; no thermal model.',8,[],true);
// Additional replaceable mechanical subassemblies. Shape and mounting dimensions remain estimates.
for(const axle of ['front','rear'])for(const side of ['left','right']){const id=`${axle}-${side}`,label=`${axle} ${side}`;
 add(`upright-${id}`,`${label} upright`,'Suspension','Connects upper/lower wishbones, hub bearing and brake caliper; reconstructed carrier envelope.',1.8,[],true);
 add(`hub-${id}`,`${label} hub & nut`,'Wheels & tires','Coaxial wheel bearing, stub axle and center-lock nut; bearing internals not modeled.',1.2,[],true);
 add(`damper-${id}`,`${label} inboard damper`,'Suspension','Pushrod rocker drives an inboard damper. Damping response is not simulated.',.8,[],true);
 add(`rocker-${id}`,`${label} rocker & torsion bar`,'Suspension','Bellcrank transfers pushrod motion into a torsion spring and damper. No coil-over spring is implied.',.6,[],true);
 add(`tie-${id}`,`${label} ${axle==='front'?'steering link':'toe link'}`,'Suspension','Locates upright yaw; front links connect to the steering rack. Detailed steering kinematics are not solved.',.3,[],true);
 add(`duct-${id}`,`${label} brake duct`,'Brakes','Schematic air inlet feeding the disc; brake cooling and temperature are unsupported.',.3,[],true);
}
add('steering-wheel','Steering wheel','Chassis & cockpit','Reconstructed compact carbon control wheel. Buttons are geometric details, not unimplemented UI controls.',1,[],true);
add('steering-column','Steering column','Chassis & cockpit','Connects the steering wheel to the rack through the front bulkhead.',.6,[],true);
add('steering-rack','Steering rack','Suspension','Translates column rotation into front tie-rod movement; steering dynamics remain unsupported.',1.8,[],true);
add('differential','Differential casing','Powertrain & cooling','Transfers transmission output to two half-shafts. Locking and differential dynamics are unsupported.',5,[],true);
for(const side of ['left','right']){
 add(`driveshaft-${side}`,`${side} driveshaft`,'Powertrain & cooling','Rear half-shaft and schematic CV joints connect differential to hub.',1.4,[],true);
 add(`head-${side}`,`${side} cylinder head`,'Powertrain & cooling','Five-cylinder bank cover with fasteners; dimensions are a packaging reconstruction.',7,[],true);
 add(`exhaust-${side}`,`${side} exhaust manifold`,'Powertrain & cooling','Five primary pipes merge toward a top-exit collector, appropriate to the V10 era. Tube routing and heat colors estimated.',2.5,[],true);
 add(`bargeboard-${side}`,`${side} bargeboard`,'Bodywork','Sculpted vertical flow-conditioning panel ahead of the sidepod. No independent aerodynamic map.',.6,[],false);
}
for(const p of PARTS){
 if(p.id.startsWith('head-')||p.id.startsWith('exhaust-')){p.parentId='engine';p.mountsTo=['engine'];}
 if(p.id.startsWith('driveshaft-')||p.id==='differential'){p.parentId='gearbox';p.mountsTo=['gearbox'];}
 if(p.id.startsWith('hub-')){p.parentId='upright-'+p.id.slice(4);p.mountsTo=[p.parentId];}
 if(p.id.startsWith('disc-')||p.id.startsWith('caliper-')){p.mountsTo=['upright-'+p.id.slice(p.id.indexOf('-')+1)];p.sources.push('https://www.brembo.com/en/news-archive/20-years-f1-brake-discs');}
}
// Connect the existing hierarchy to the replaceable engineering model.
for(const p of PARTS){
 const front=p.id.includes('front');
 if(p.id.startsWith('tire-'))p.parameters.push('tirePressure','gripScale');
 if(p.assembly==='Suspension'&&!p.id.startsWith('damper-')&&p.id!=='steering-rack'){
  p.parameters.push(front?'frontSpring':'rearSpring',front?'frontARB':'rearARB');
  p.role+=' Axle wheel rates feed an estimated steady-state load-transfer model.';
 }
 if(p.id.startsWith('disc-')||p.id.startsWith('caliper-'))p.parameters.push('brakeLimit');
 if(p.id==='gearbox')p.parameters.push('gear1','gear2','gear3','gear4','gear5','gear6','gear7');
 p.modelEffects=[...p.parameters];p.dependencies=[...p.parameters];
}
// Build 2D: schematic wheel-end detail, not extra solver degrees of freedom.
// Added after shared-parameter wiring deliberately: no fictitious component controls.
for(const axle of ['front','rear'])for(const side of ['left','right']){
 const corner=`${axle}-${side}`;
 for(const [prefix,name,assembly,parent,role,mass] of [
 ['bearing','hub bearing','Wheels & tires',`upright-${corner}`,'Supports hub rotation; bearing friction and compliance are not independently modeled.',.2],
 ['bell','brake rotor bell','Brakes',`disc-${corner}`,'Rotates with the rotor and hub; no independent inertia or thermal model.',.3],
 ['bridge','caliper bridge','Brakes',`caliper-${corner}`,'Stationary caliper detail; stiffness and piston dynamics are not modeled.',.15],
 ['arm',axle==='front'?'steering arm':'toe arm','Suspension',`upright-${corner}`,'Upright attachment detail. Front yaw is a curvature-derived visual approximation; link dynamics are unsupported.',.15]
 ] as const){
 add(`${prefix}-${corner}`,`${axle} ${side} ${name}`,assembly,`ESTIMATED geometry and mass. ${role}`,mass,[],true);
 const p=PARTS[PARTS.length-1];p.parentId=parent;p.mountsTo=[parent];p.sources=[];
 }
}
export const ASSEMBLIES=Array.from(new Set(PARTS.map(p=>p.assembly)));

export type SimulationStatus='VISUAL'|'HIERARCHY-ONLY'|'SHARED MODEL INPUT'|'INDEPENDENTLY SIMULATED'|'UNSUPPORTED';
export type DataClass='DOCUMENTED'|'DERIVED'|'ESTIMATED'|'USER-DEFINED';
export type ComponentNode={id:string;name:string;kind:'vehicle'|'subsystem'|'assembly'|'component'|'subcomponent';subsystem:string;assembly:string;role:string;mass:number;material:string;parentId:string|null;childrenIds:string[];mountsTo:string[];geometryIds:string[];geometry:string;parameters:NumericKey[];dependencies:string[];simulationStatus:SimulationStatus;dataClass:DataClass;confidence:'high'|'medium'|'low';sources:string[];notes:string};

const systemFor=(assembly:string)=>['Front wing','Rear wing','Floor & diffuser','Bodywork'].includes(assembly)?'Aerodynamics':['Chassis & cockpit'].includes(assembly)?'Structure':['Wheels & tires','Brakes','Suspension'].includes(assembly)?'Vehicle dynamics':'Powertrain';
const materialFor=(assembly:string)=>['Front wing','Rear wing','Floor & diffuser','Bodywork','Chassis & cockpit','Suspension'].includes(assembly)?'Carbon composite / mixed':['Wheels & tires','Brakes'].includes(assembly)?'Metal / carbon composite':'Metal / mixed';
const slug=(s:string)=>s.toLowerCase().replaceAll('&','and').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const assemblyId=(s:string)=>`assembly:${s.toLowerCase().replaceAll(' ','-')}`;
const systems=['Aerodynamics','Structure','Vehicle dynamics','Powertrain'];
const hierarchy:ComponentNode[]=[{id:'vehicle:f2004',name:'F2004 reference vehicle',kind:'vehicle',subsystem:'Vehicle',assembly:'Vehicle',role:'Root of the reconstructed engineering hierarchy.',mass:0,material:'Mixed',parentId:null,childrenIds:[],mountsTo:[],geometryIds:[],geometry:'hierarchy',parameters:[],dependencies:[],simulationStatus:'HIERARCHY-ONLY',dataClass:'DERIVED',confidence:'medium',sources:[],notes:'Hierarchy and displayed component masses are metadata; they are not summed into simulated vehicle mass.'}];
for(const name of systems)hierarchy.push({id:`subsystem:${slug(name)}`,name,kind:'subsystem',subsystem:name,assembly:name,role:`Groups ${name.toLowerCase()} assemblies.`,mass:0,material:'Mixed',parentId:'vehicle:f2004',childrenIds:[],mountsTo:[],geometryIds:[],geometry:'hierarchy',parameters:[],dependencies:[],simulationStatus:'HIERARCHY-ONLY',dataClass:'DERIVED',confidence:'medium',sources:[],notes:'Organizational node; child geometry is selected as a group.'});
for(const name of ASSEMBLIES){const subsystem=systemFor(name);hierarchy.push({id:assemblyId(name),name,kind:'assembly',subsystem,assembly:name,role:`Groups the ${name.toLowerCase()} components.`,mass:0,material:materialFor(name),parentId:`subsystem:${slug(subsystem)}`,childrenIds:[],mountsTo:[],geometryIds:[],geometry:'hierarchy',parameters:[],dependencies:[],simulationStatus:'HIERARCHY-ONLY',dataClass:'DERIVED',confidence:'medium',sources:[],notes:'Organizational node; aggregate mass is intentionally not calculated from metadata.'});}

const legacy:ComponentNode[]=PARTS.map(p=>{const unsupported=p.id.startsWith('damper-')||p.id==='differential';return {id:p.id,name:p.name,kind:'component',subsystem:systemFor(p.assembly),assembly:p.assembly,role:p.role,mass:p.mass,material:materialFor(p.assembly),parentId:p.parentId,childrenIds:[],mountsTo:[...p.mountsTo],geometryIds:[p.id],geometry:p.geometry,parameters:[...p.parameters],dependencies:[...p.dependencies],simulationStatus:unsupported?'UNSUPPORTED':p.parameters.length?'SHARED MODEL INPUT':'VISUAL',dataClass:p.provenance==='Schematic internal component'?'ESTIMATED':'DERIVED',confidence:p.confidence,sources:[...p.sources],notes:unsupported?'Detailed dynamics are unsupported; this item does not add an independent solver degree of freedom.':'Displayed mass is non-additive metadata.'};});

// Forty-eight hierarchy-only wheel-end records: twelve at each corner. They resolve
// to an existing aggregate mesh and never create fake geometry or physics controls.
const detailSpecs=[
 ['wheel-center','Wheel center','rim','Aluminum / magnesium alloy'],['center-lock-nut','Center-lock nut','hub','Metal alloy'],
 ['friction-ring-inboard','Inboard friction ring','disc','Carbon composite'],['friction-ring-outboard','Outboard friction ring','disc','Carbon composite'],
 ['caliper-body','Caliper body','caliper','Metal alloy'],['brake-pad-set','Brake pad set','caliper','Carbon composite'],['piston-bank','Caliper piston bank','caliper','Metal / seal assembly'],
 ['duct-inlet','Brake duct inlet','duct','Carbon composite'],['duct-outlet','Brake duct outlet','duct','Carbon composite'],
 ['upper-front-leg','Upper wishbone front leg','upper','Carbon composite'],['upper-rear-leg','Upper wishbone rear leg','upper','Carbon composite'],['lower-leg-set','Lower wishbone leg set','lower','Carbon composite']
] as const;
const details:ComponentNode[]=[];
for(const axle of ['front','rear'])for(const side of ['left','right'])for(const [key,label,parentPrefix,material] of detailSpecs){const corner=`${axle}-${side}`,parentId=parentPrefix==='upper'||parentPrefix==='lower'?`${corner}-${parentPrefix}`:`${parentPrefix}-${corner}`;details.push({id:`detail:${key}-${corner}`,name:`${axle} ${side} ${label}`,kind:'subcomponent',subsystem:'Vehicle dynamics',assembly:parentPrefix==='rim'||parentPrefix==='hub'?'Wheels & tires':parentPrefix==='disc'||parentPrefix==='caliper'||parentPrefix==='duct'?'Brakes':'Suspension',role:`Estimated replaceable ${label.toLowerCase()} represented by the parent assembly geometry.`,mass:0,material,parentId,childrenIds:[],mountsTo:[parentId],geometryIds:[parentId],geometry:`shared:${parentId}`,parameters:[],dependencies:[],simulationStatus:'HIERARCHY-ONLY',dataClass:'ESTIMATED',confidence:'low',sources:[],notes:'No independent geometry, mass contribution, inertia, compliance, temperature, wear, or dynamics are modeled.'});}

export const COMPONENTS:ComponentNode[]=[...hierarchy,...legacy,...details];
export const COMPONENT_BY_ID=new Map(COMPONENTS.map(c=>[c.id,c]));
for(const node of COMPONENTS)if(node.parentId)COMPONENT_BY_ID.get(node.parentId)?.childrenIds.push(node.id);
export function componentDescendants(id:string){const out:string[]=[];const visit=(nodeId:string)=>{for(const child of COMPONENT_BY_ID.get(nodeId)?.childrenIds??[]){out.push(child);visit(child);}};visit(id);return out;}
export function componentPath(id:string){const out:ComponentNode[]=[];let node=COMPONENT_BY_ID.get(id);const seen=new Set<string>();while(node&&!seen.has(node.id)){seen.add(node.id);out.unshift(node);node=node.parentId?COMPONENT_BY_ID.get(node.parentId):undefined;}return out;}
export function resolveGeometryIds(id:string){const node=COMPONENT_BY_ID.get(id);if(!node)return [];if(node.geometryIds.length)return [...new Set(node.geometryIds)];const members=node.kind==='vehicle'?COMPONENTS:node.kind==='subsystem'?COMPONENTS.filter(c=>c.subsystem===node.name):node.kind==='assembly'?COMPONENTS.filter(c=>c.assembly===node.name):componentDescendants(id).map(child=>COMPONENT_BY_ID.get(child)!).filter(Boolean);return [...new Set(members.flatMap(c=>c.geometryIds))];}
export function filterComponents(query='',status:'ALL'|SimulationStatus='ALL',dataClass:'ALL'|DataClass='ALL'){const q=query.trim().toLowerCase();return COMPONENTS.filter(c=>(!q||`${c.name} ${c.id} ${c.assembly} ${c.role}`.toLowerCase().includes(q))&&(status==='ALL'||c.simulationStatus===status)&&(dataClass==='ALL'||c.dataClass===dataClass));}
// Shared derived attitudes never imply independently simulated linkage degrees of freedom.
for(const node of COMPONENTS){if(node.assembly==='Suspension'||node.assembly==='Wheels & tires'||node.assembly==='Brakes')node.notes+=' Build 2F: shared DERIVED / ESTIMATED wheel loads and bounded chassis attitude; wheels remain road-supported. Linkage articulation, damping, compliance and tire deformation are unsupported. Animation is not independent component simulation.';}
export const COMPONENT_SUMMARY={total:COMPONENTS.length,geometryBacked:PARTS.length,hierarchyOnly:COMPONENTS.filter(c=>c.simulationStatus==='HIERARCHY-ONLY').length,bySubsystem:Object.fromEntries(systems.map(s=>[s,COMPONENTS.filter(c=>c.subsystem===s).length])),byStatus:Object.fromEntries(['VISUAL','HIERARCHY-ONLY','SHARED MODEL INPUT','INDEPENDENTLY SIMULATED','UNSUPPORTED'].map(s=>[s,COMPONENTS.filter(c=>c.simulationStatus===s).length])),byProvenance:Object.fromEntries(['DOCUMENTED','DERIVED','ESTIMATED','USER-DEFINED'].map(s=>[s,COMPONENTS.filter(c=>c.dataClass===s).length]))};
