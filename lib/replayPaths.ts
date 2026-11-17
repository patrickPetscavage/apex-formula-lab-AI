/** Missing positions and long sample gaps must break a trace, never create straight connectors. */
export function positionSegments<T extends {t:number;x:number|null;y:number|null}>(rows:T[],maxGap=2){
 const segments:T[][]=[];let current:T[]=[];
 for(const row of rows){const last=current.at(-1);if(row.x===null||row.y===null||!Number.isFinite(row.x)||!Number.isFinite(row.y)||(last&&(row.t<=last.t||row.t-last.t>maxGap))){if(current.length>1)segments.push(current);current=[];}if(row.x!==null&&row.y!==null&&Number.isFinite(row.x)&&Number.isFinite(row.y))current.push(row);}
 if(current.length>1)segments.push(current);return segments;
}
