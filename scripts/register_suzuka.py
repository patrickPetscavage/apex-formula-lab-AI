"""Rigid/no-reflection registration of legacy TUM geometry to independent OSM geometry."""
from pathlib import Path
import json, numpy as np
ROOT=Path(__file__).resolve().parents[1]
a=json.loads((ROOT/'public/data/atlas-2026/suzuka.json').read_text())
raw=np.array(json.loads((ROOT/'lib/sim/data/suzuka.json').read_text()))
legacy=np.column_stack([raw[:,0]-raw[:,0].mean(),-raw[:,1]+raw[:,1].mean()])
def resample(p,n=500):
 lengths=np.linalg.norm(np.roll(p,-1,axis=0)-p,axis=1);s=np.concatenate([[0],np.cumsum(lengths)]);p=np.vstack([p,p[0]])
 return np.column_stack([np.interp(np.arange(n)/n*s[-1],s,p[:,i]) for i in range(2)])
osm=np.array([[p[0],p[2]] for p in a['points']]);old=resample(legacy);new=resample(osm);oldmean=old.mean(axis=0);newmean=new.mean(axis=0);old-=oldmean;new-=newmean
best=None
for phase in range(len(new)):
 target=np.roll(new,phase,axis=0);u,s,vt=np.linalg.svd(old.T@target);r=u@vt
 if np.linalg.det(r)<0:continue
 scale=np.sum(s)/np.sum(old*old);error=np.sqrt(np.mean(np.sum((old@r*scale-target)**2,axis=1)))
 if best is None or error<best[0]:best=(float(error),phase,r,scale)
error,phase,r,scale=best
if error>25 or not .95<scale<1.05:raise RuntimeError(f'Registration needs manual review: {error:.1f} m RMS, scale {scale:.4f}')
def transform(p):return ((np.array(p)-newmean)@r.T/scale+oldmean).round(3).tolist()
selected=[]
for b in a['buildings']:
 if b['osmId'] in [184422099,183394522,183394524]:
  selected.append({**b,'kind':'grandstand' if b['osmId']==183394522 else b['kind'],'footprint':[transform(p) for p in b['footprint']]})
out={'schema':'suzuka-landmarks-1','source':'https://www.openstreetmap.org','license':'ODbL 1.0; © OpenStreetMap contributors','date':'2026-11-11','registration':{'method':'topological cyclic-station least squares, proper rotation only; no reflection','rmsMetres':error,'scale':float(scale),'phaseSamples':phase,'rotation':r.tolist(),'targetMean':newmean.tolist(),'legacyMean':oldmean.tolist(),'accuracy':'source-derived alignment, not surveyed control'},'buildings':selected,'pitLanes':[{**p,'points':[transform(x) for x in p['points']]} for p in a['pitLanes'][:1]]}
(ROOT/'lib/sim/data/suzuka-landmarks.json').write_text(json.dumps(out,separators=(',',':')),encoding='utf8')
print(f'Proper-rotation registration: {error:.2f} m RMS; scale {scale:.6f}; {len(selected)} mapped landmarks')
