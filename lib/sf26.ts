import type {ComponentNode} from './components';
import {makeCatalog} from './componentCatalog';
export const SF26_SOURCES={
 launch:{url:'https://www.formula1.com/en/latest/article/first-look-ferrari-reveal-new-sf-26-car-for-2026-f1-season.19b0ad82cdsyXgvA675Ey4',date:'2026-01-23',title:'Official F1 SF-26 launch and imagery'},
 regulations:{url:'https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_c_technical_-_iss_20_-_2026-08-05.pdf',date:'2026-08-05',title:'FIA 2026 Section C — Issue 20'},
 ferrari:{url:'https://www.ferrari.com/en-EN/formula1/sf-26',date:null,title:'Ferrari SF-26 — automated access unavailable'},
};
export type Specification={name:string;value:string|number|null;unit:string;scope:'Actual vehicle'|'Regulatory reference'|'Preview geometry';provenance:'DOCUMENTED'|'DERIVED'|'ESTIMATED'|'USER-DEFINED';confidence:'high'|'medium'|'low';source:keyof typeof SF26_SOURCES;note:string};
export const SF26_SPECS:Specification[]=[
 {name:'Maximum wheelbase',value:3400,unit:'mm',scope:'Regulatory reference',provenance:'DOCUMENTED',confidence:'high',source:'regulations',note:'C2.3.3, legality setup. Not the measured SF-26 wheelbase.'},
 {name:'Engine architecture',value:'90° V6, 1600 cc (+0 / −10)',unit:'',scope:'Regulatory reference',provenance:'DOCUMENTED',confidence:'high',source:'regulations',note:'C5.1.1–3, four-stroke. No Ferrari power curve is supplied.'},
 {name:'ERS-K electrical ceiling',value:350,unit:'kW',scope:'Regulatory reference',provenance:'DOCUMENTED',confidence:'high',source:'regulations',note:'C5.2.7–8. Speed, mode and energy constraints also apply; not constant wheel power.'},
 {name:'Forward gear count',value:8,unit:'ratios',scope:'Regulatory reference',provenance:'DOCUMENTED',confidence:'high',source:'regulations',note:'C9.6.1. Exact Ferrari ratios unknown; reverse required by C9.7.'},
 {name:'Active aerodynamics',value:'Front and rear wing adjustment',unit:'',scope:'Regulatory reference',provenance:'DOCUMENTED',confidence:'high',source:'regulations',note:'C3.10.10 and C3.11.6. Preview wings are stationary; deployment and aero maps unsupported.'},
 {name:'Reference configuration',value:'SF-26 launch, 23 January 2026',unit:'',scope:'Actual vehicle',provenance:'DOCUMENTED',confidence:'high',source:'launch',note:'Visual reference only; subsequent race upgrades are not reproduced.'},
 {name:'Regulation revision checked',value:'2026 Section C, Issue 20',unit:'',scope:'Regulatory reference',provenance:'DOCUMENTED',confidence:'high',source:'regulations',note:'Current research reference, published 5 August 2026; not the launch-date rule revision or proof of measured Ferrari geometry.'},
 {name:'Preview wheelbase',value:3.35,unit:'m',scope:'Preview geometry',provenance:'ESTIMATED',confidence:'low',source:'launch',note:'Artist reconstruction for visual proportions, not measured SF-26 data.'},
 {name:'Preview front / rear track',value:'1.58 / 1.53',unit:'m',scope:'Preview geometry',provenance:'ESTIMATED',confidence:'low',source:'launch',note:'Wheel-centre spacing; not overall width or a regulatory value.'},
 {name:'Preview tire radius',value:0.355,unit:'m',scope:'Preview geometry',provenance:'ESTIMATED',confidence:'low',source:'launch',note:'Visual approximation; not a Pirelli loaded-radius measurement.'},
 ...['Measured dimensions and component masses','Suspension hardpoints and motion ratios','Spring and damper specifications','Aerodynamic maps','Tire force maps','Power / torque curves and gear ratios'].map(name=>({name,value:null,unit:'',scope:'Actual vehicle' as const,provenance:'ESTIMATED' as const,confidence:'low' as const,source:'launch' as const,note:'UNKNOWN — not supplied by the verified launch source. Actual Ferrari values remain unknown. Build 3B uses separate explicitly estimated hypotheses, not values supplied by this source.'})),
];
export const SF26_PREVIEW={wheelbase:3.35,frontZ:-1.65,rearZ:1.70,frontTrack:1.58,rearTrack:1.53,tireRadius:.355};
const nodes:ComponentNode[]=[];
function node(key:string,name:string,kind:ComponentNode['kind'],parent:string|null,subsystem:string,assembly:string,visible=false){
 const id=`sf26:${key}`;
 nodes.push({id,name,kind,parentId:parent?`sf26:${parent}`:null,childrenIds:[],subsystem,assembly,role:visible?'Selectable estimated exterior reconstruction.':'Engineering organization; internal geometry is not reconstructed.',mass:0,material:'Unknown / mixed',mountsTo:parent?[`sf26:${parent}`]:[],geometryIds:visible?[id]:[],geometry:visible?'procedural-estimate':'hierarchy',parameters:[],dependencies:[],simulationStatus:visible?'VISUAL':'HIERARCHY-ONLY',dataClass:visible?'ESTIMATED':'DERIVED',confidence:'low',sources:[SF26_SOURCES.launch.url],notes:'Mass unknown (zero is an unallocated metadata sentinel). No independent simulation or functional setup control. Not Ferrari CAD.'});
}
node('vehicle','Ferrari SF-26','vehicle',null,'Vehicle','Vehicle');
for(const [system,assemblies] of [['Structure',['Chassis','Bodywork']],['Aerodynamics',['Front wing','Floor','Rear wing']],['Running gear',['Wheels & brakes','Suspension']],['Powertrain',['Power unit','Transmission']]] as [string,string[]][]){
 node(system,system,'subsystem','vehicle',system,system);
 for(const assembly of assemblies)node(assembly,assembly,'assembly',system,system,assembly);
}
for(const [key,name,assembly,system] of [
 ['tub','Survival cell','Chassis','Structure'],['halo','Halo','Chassis','Structure'],['nose','Nose','Bodywork','Structure'],['cover','Engine cover and airbox','Bodywork','Structure'],
 ['front-wing','Front wing mainplane','Front wing','Aerodynamics'],['front-flaps','Front wing flaps','Front wing','Aerodynamics'],['floor','Floor','Floor','Aerodynamics'],['diffuser','Diffuser','Floor','Aerodynamics'],['rear-wing','Rear wing elements','Rear wing','Aerodynamics'],['rear-endplates','Rear wing endplates','Rear wing','Aerodynamics'],
 ] as string[][])node(key,name,'component',assembly,system,assembly,true);
for(const side of ['left','right'])node(`sidepod-${side}`,`${side} sidepod`,'component','Bodywork','Structure','Bodywork',true);
for(const axle of ['front','rear'])for(const side of ['left','right']){
 const corner=`${axle}-${side}`;
 for(const [part,name] of [['tire','tire'],['rim','rim'],['hub','hub'],['disc','brake disc'],['caliper','brake caliper']])node(`${part}-${corner}`,`${corner} ${name}`,'component','Wheels & brakes','Running gear','Wheels & brakes',true);
 for(const part of ['upper-wishbone','lower-wishbone','pushrod'])node(`${part}-${corner}`,`${corner} ${part}`,'component','Suspension','Running gear','Suspension',true);
}
for(const [key,name,assembly] of [['ice','Combustion engine','Power unit'],['turbo','Turbocharger','Power unit'],['mgu-k','MGU-K','Power unit'],['energy-store','Energy store','Power unit'],['electronics','Control electronics','Power unit'],['gearbox','Gearbox','Transmission'],['differential','Differential','Transmission']])node(key,name,'component',assembly,'Powertrain',assembly);
// Build 3B: coherent exterior detail, preserving every existing identity.
for(const [key,name,assembly,system] of [
 ['front-flap-upper','Upper front flap','Front wing','Aerodynamics'],
 ['front-endplate-left','Left front endplate','Front wing','Aerodynamics'],['front-endplate-right','Right front endplate','Front wing','Aerodynamics'],
 ['rear-flap','Rear wing flap','Rear wing','Aerodynamics'],['rear-support-left','Left rear wing support','Rear wing','Aerodynamics'],['rear-support-right','Right rear wing support','Rear wing','Aerodynamics'],
 ['seat','Cockpit seat','Chassis','Structure'],['steering-wheel','Steering wheel','Chassis','Structure'],
 ['mirror-left','Left mirror','Bodywork','Structure'],['mirror-right','Right mirror','Bodywork','Structure'],['air-intake','Air intake lip','Bodywork','Structure'],
 ] as string[][])node(key,name,'component',assembly,system,assembly,true);
for(const axle of ['front','rear'])for(const side of ['left','right']){
 const corner=`${axle}-${side}`;
 for(const [key,name] of [['center-lock','center-lock nut'],['rotor-bell','rotor bell'],['brake-duct','brake cooling duct']])node(`${key}-${corner}`,`${corner} ${name}`,'component','Wheels & brakes','Running gear','Wheels & brakes',true);
 for(const [key,name] of [['upright','upright'],['link',axle==='front'?'steering tie rod':'rear toe link']])node(`${key}-${corner}`,`${corner} ${name}`,'component','Suspension','Running gear','Suspension',true);
}
for(const n of nodes){
 n.notes='ESTIMATED original reconstruction, not Ferrari CAD. Mass unknown; zero is unallocated metadata. No independent component dynamics.';
 if(n.id.includes('tire-')){n.parameters=['gripScale'];n.simulationStatus='SHARED MODEL INPUT';n.role='Tire force envelope shared across all corners; grip multiplier, no carcass dynamics.';}
 if(n.id.includes('caliper-')){n.parameters=['brakeBias','brakeLimit'];n.simulationStatus='SHARED MODEL INPUT';n.role='Shared axle braking demand and ceiling; no piston or thermal dynamics.';}
 if(n.id==='sf26:ice'){n.parameters=['power'];n.simulationStatus='SHARED MODEL INPUT';n.role='Estimated combustion-only wheel-power envelope, not measured engine output.';}
 if(n.id==='sf26:gearbox'){n.parameters=['finalDrive','gear1','gear2','gear3','gear4','gear5','gear6','gear7'];n.simulationStatus='SHARED MODEL INPUT';n.role='Eight estimated ratios (including SF-26 gear8) and final drive; no shift transients.';}
 if(['sf26:mgu-k','sf26:energy-store','sf26:differential'].includes(n.id)){n.simulationStatus='UNSUPPORTED';n.notes+=' Energy accounting and differential dynamics are unsupported.';}
}
for(const n of nodes)if(n.parentId)nodes.find(p=>p.id===n.parentId)!.childrenIds.push(n.id);
export const SF26_CATALOG=makeCatalog(nodes);
export const SF26_DEFINITION={id:'sf26',name:'Ferrari SF-26',reference:'Launch configuration — 23 January 2026',setupDefaults:'sf26-ice-fixed-3b.1',capabilities:{garage:true,simulation:true,setup:true,telemetry:true,hybrid:false,activeAero:false,suspension:false},specifications:SF26_SPECS,catalog:SF26_CATALOG};
