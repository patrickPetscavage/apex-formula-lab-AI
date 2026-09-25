export type VehicleId='f2004'|'sf26';
export const VEHICLES={
 f2004:{id:'f2004',name:'Ferrari F2004',year:2004,simulation:true,status:'Existing simulation'},
 sf26:{id:'sf26',name:'Ferrari SF-26',year:2026,simulation:true,status:'Experimental · ICE-only, fixed aero'},
} as const;
export function vehicleId(id:unknown):VehicleId{
 if(id===undefined)return 'f2004';
 if(id==='f2004'||id==='sf26')return id;
 throw Error('Unknown vehicle identity.');
}
export function requireSimulatedVehicle(id:unknown){
 const resolved=vehicleId(id);

 return resolved;
}
