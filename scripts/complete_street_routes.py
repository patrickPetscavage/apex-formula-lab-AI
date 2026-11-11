"""Map-match MIT community route guides onto independently acquired OSM road coordinates.

Community guide vertices are not published; output coordinates are projected OSM
road positions. All such routes remain provisional, with source/registration error.
"""
import importlib.util,json,math,time
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('builder',ROOT/'scripts/build_circuit_atlas.py');b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)

def complete(v):
 ident,lat,lon,reference,geo,*_=v;origin=[lon,lat]
 guide=b.get_json(f'https://raw.githubusercontent.com/bacinger/f1-circuits/master/circuits/{geo}.geojson',key='guide-'+ident)
 coords=guide['features'][0]['geometry']['coordinates'];bbox=guide.get('bbox',guide['features'][0].get('bbox'))
 if bbox is None:raise ValueError('Missing source-guide extent')
 query=f'[out:json][timeout:35];way[highway~"^(raceway|trunk|primary|secondary|tertiary|unclassified|residential|service|construction|road)$"]({bbox[1]-.001},{bbox[0]-.001},{bbox[3]+.001},{bbox[2]+.001});out geom;'
 data=None
 for endpoint in ['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter']:
  try:data=b.get_json(endpoint,{'data':query},'streets-'+ident);break
  except Exception as e:print(f'{ident}: {e}',flush=True)
 if data is None:raise RuntimeError('OSM public streets unavailable')
 segments=[];way_ids=[]
 for way in data.get('elements',[]):
  if way['type']!='way' or b.re.search('pit[ -]?lane',way.get('tags',{}).get('name',''),b.re.I):continue
  g=way.get('geometry',[])
  for a,c in zip(g,g[1:]):
   p=b.xy(a['lon'],a['lat'],origin);q=b.xy(c['lon'],c['lat'],origin)
   if math.dist(p,q)>.05:segments.append((p,q));way_ids.append(way['id'])
 if not segments:raise ValueError('No public road segments')
 raw=np.array([b.xy(p[0],p[1],origin) for p in coords]);lens=np.linalg.norm(np.diff(raw,axis=0),axis=1);s=np.concatenate([[0],np.cumsum(lens)]);n=round(s[-1]/8);sample=np.column_stack([np.interp(np.arange(n)/n*s[-1],s,raw[:,i]) for i in range(2)])
 starts=np.array([p for p,q in segments]);delta=np.array([np.subtract(q,p) for p,q in segments]);denom=np.sum(delta**2,axis=1);mapped=[];used=set();errors=[]
 for point in sample:
  t=np.clip(np.sum((point-starts)*delta,axis=1)/denom,0,1);projections=starts+delta*t[:,None];dist=np.sum((projections-point)**2,axis=1);i=int(np.argmin(dist));mapped.append(projections[i]);used.add(way_ids[i]);errors.append(float(math.sqrt(dist[i])))
 if np.percentile(errors,95)>35:raise ValueError(f'Map matching needs manual review: p95 {np.percentile(errors,95):.1f} m')
 # Smooth changes of mapped segment at junctions, bounded to the acquired street corridor.
 mapped=np.array(mapped);clean=[]
 for p in mapped:
  if not clean or np.linalg.norm(p-clean[-1])>.1:clean.append(p)
 g=[]
 for p in clean:
  g.append({'lon':lon+p[0]/(6378137*math.cos(lat*math.pi/180))*180/math.pi,'lat':lat-p[1]/6378137*180/math.pi})
 g.append(g[0]);nodes=list(range(len(g)-1))+[0]
 cached_path=b.CACHE/('osm-'+ident+'.json');existing=json.loads(cached_path.read_text()) if cached_path.exists() else {'elements':[]}
 if not any(e.get('tags',{}).get('building') for e in existing['elements']):
  try:
   buildings_query=f'[out:json][timeout:25];way[building]({lat-.004},{lon-.006},{lat+.004},{lon+.006});out geom 300;'
   structures=b.get_json('https://overpass-api.de/api/interpreter',{'data':buildings_query},'structures-'+ident)
   existing['elements'].extend(structures.get('elements',[]))
  except Exception as e:print(f'{ident}: structure footprints unavailable: {e}',flush=True)
 # Explicit derived closed way; original OSM way IDs are retained separately, never impersonated.
 synthetic={'id':-2026000,'type':'way','nodes':nodes,'geometry':g,'tags':{'highway':'raceway','oneway':'yes','apex:derived':'OSM projection onto MIT community route guide'}}
 previous=b.choose_cycle
 def selected(_ways,_origin,_reference):return g,sorted(used),b.length(g,origin),False
 b.choose_cycle=selected
 original_get=b.get_json
 def get(url,params=None,key=None):
  if key=='osm-'+ident:return {'elements':[synthetic]+[e for e in existing.get('elements',[]) if e.get('tags',{}).get('building') or e.get('tags',{}).get('leisure')=='grandstand']}
  return original_get(url,params,key)
 b.get_json=get
 try:record=b.build(v)
 finally:b.choose_cycle=previous;b.get_json=original_get
 record['provenance']['horizontal']['routeGuide']={'source':f'https://github.com/bacinger/f1-circuits/blob/master/circuits/{geo}.geojson','license':'MIT, Copyright 2019–2025 Tomislav Bacinger','use':'Route selection only. Published points are projections onto OSM road geometry; community guide coordinates not redistributed.','rmsMetres':round(float(np.sqrt(np.mean(np.array(errors)**2))),2),'p95Metres':round(float(np.percentile(errors,95)),2),'upstreamAcknowledgment':'Community project acknowledges an initial Google My Maps source; not used as imagery or terrain.'}
 record['warnings'].append('PROVISIONAL: public-street route is map-matched to a community guide; junction ordering, changed corners and homologated 2026 configuration need independent review')
 (b.DEST/(ident+'.json')).write_text(json.dumps(record,separators=(',',':')),encoding='utf8')
 print(f'{ident}: map-matched public OSM roads; {record["length"]:.0f} m; p95 guide residual {np.percentile(errors,95):.1f} m',flush=True)

if __name__=='__main__':
 import sys
 failures=[]
 for v in b.VENUES:
  if len(sys.argv)>1 and v[0] not in sys.argv[1:]:continue
  if len(sys.argv)==1 and (b.DEST/(v[0]+'.json')).exists():continue
  try:complete(v)
  except Exception as e:failures.append((v[0],str(e)));print(f'FAILED {v[0]}: {e}',flush=True)
 if failures:raise SystemExit(json.dumps(failures))
