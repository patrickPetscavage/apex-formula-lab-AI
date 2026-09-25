'use client';
import {useMemo} from 'react';
import type {Lap} from '@/lib/sim/physics';
import {sections,samePath} from '@/lib/sim/experiments';
export default function SectionComparison({a,b,onSeek}:{a:Lap;b:Lap;onSeek:(s:number)=>void}){
 const rows=useMemo(()=>sections(a,b),[a,b]),shared=useMemo(()=>samePath(a,b),[a,b]);
 return <section className="section-comparison"><h3>{shared?'Setup-only comparison · identical sampled trajectory':'Setup + line comparison · different sampled trajectories'}</h3><p className="small-copy">12 common reference-distance sections, not official timing sectors. Deltas are B − A. Selecting a section seeks playback to its start. Multiple changed inputs prevent attributing gains to a single component.</p><div className="section-table"><table><thead><tr><th>Section / station</th><th>A time (s)</th><th>B time (s)</th><th>Δ time (s)</th><th>A min (km/h)</th><th>B min (km/h)</th><th>Δ min (km/h)</th><th>A braking (g)</th><th>B braking (g)</th></tr></thead><tbody>{rows.map(r=><tr key={r.number}><td><button className="text-button" onClick={()=>onSeek(r.start)}>S{r.number} · {r.start.toFixed(0)}–{r.end.toFixed(0)} m</button></td><td>{r.a.time.toFixed(3)}</td><td>{r.b.time.toFixed(3)}</td><td className={r.delta<0?'faster':''}>{r.delta>=0?'+':''}{r.delta.toFixed(3)}</td><td>{r.a.minSpeed.toFixed(1)}</td><td>{r.b.minSpeed.toFixed(1)}</td><td>{(r.b.minSpeed-r.a.minSpeed).toFixed(1)}</td><td>{r.a.peakBrake.toFixed(2)}</td><td>{r.b.peakBrake.toFixed(2)}</td></tr>)}</tbody></table></div></section>;
}
