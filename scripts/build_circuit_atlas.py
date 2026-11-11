"""Build an offline, attributed 2026 circuit atlas from public OSM and SRTM data."""
import argparse, hashlib, json, math, time, re
from pathlib import Path
import requests

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'public/data/atlas-2026'
CACHE=ROOT/'work/atlas-cache'
STAMP='2026-11-11'
# Current official F1 calendar checked against FIA. No session telemetry ingested.
# id, OSM search locator latitude/longitude, reference length, GeoJSON locator ID,
# event date, theme, official circuit route (not a timing-data endpoint).
VENUES=[
 ('melbourne',-37.8497,144.968,5278,'au-1953','2026-03-08','park','australia'),
 ('shanghai',31.339,121.221,5451,'cn-2004','2026-03-15','park','china'),
 ('suzuka',34.8433,136.5403,5807,'jp-1962','2026-03-29','forest','japan'),
 ('miami',25.958,-80.239,5412,'us-2022','2026-05-03','coastal','miami'),
 ('montreal',45.501,-73.523,4361,'ca-1978','2026-05-24','park','canada'),
 ('monaco',43.735,7.421,3337,'mc-1929','2026-06-07','urban','monaco'),
 ('barcelona',41.57,2.261,4657,'es-1991','2026-06-14','dry','barcelona-catalunya'),
 ('spielberg',47.2197,14.7647,4318,'at-1969','2026-06-28','alpine','austria'),
 ('silverstone',52.078,-1.016,5891,'gb-1948','2026-07-05','park','great-britain'),
 ('spa',50.4372,5.9714,7004,'be-1925','2026-07-19','forest','belgium'),
 ('hungaroring',47.58,19.248,4381,'hu-1986','2026-07-26','dry','hungary'),
 ('zandvoort',52.388,4.54,4259,'nl-1948','2026-08-23','dunes','netherlands'),
 ('monza',45.6156,9.2811,5793,'it-1922','2026-09-06','forest','italy'),
 ('madrid',40.4652,-3.6169,5414,'es-2026','2026-09-13','dry','spain'),
 ('baku',40.373,49.853,6003,'az-2016','2026-09-26','urban','azerbaijan'),
 ('sepang',2.760,101.738,5543,'my-1999','2026-10-04','tropical','bahrain'),
 ('singapore',1.291,103.864,4940,'sg-2008','2026-10-11','urban','singapore'),
 ('austin',30.133,-97.641,5513,'us-2012','2026-10-25','dry','united-states'),
 ('mexico',19.404,-99.09,4304,'mx-1962','2026-11-01','urban','mexico'),
 ('interlagos',-23.704,-46.698,4309,'br-1940','2026-11-08','park','brazil'),
 ('las-vegas',36.11,-115.162,6201,'us-2023','2026-11-21','urban','las-vegas'),
 ('lusail',25.49,51.454,5419,'qa-2004','2026-11-29','desert','qatar'),
 ('yas-marina',24.469,54.606,5281,'ae-2009','2026-12-06','coastal','abu-dhabi'),
]

def get_json(url,params=None,key=None):
 CACHE.mkdir(parents=True,exist_ok=True)
 key=key or hashlib.sha256((url+json.dumps(params,sort_keys=True)).encode()).hexdigest()
 p=CACHE/(key+'.json')
 if p.exists():return json.loads(p.read_text(encoding='utf8'))
 for attempt in range(3):
  r=requests.get(url,params=params,timeout=45,headers={'User-Agent':'ApexFormulaLab-research/1.0 (offline circuit atlas; cached requests)'})
  if r.status_code in (406,502,504) and 'overpass' in url:
   try:r=requests.post(url,data=params,timeout=35,headers={'User-Agent':'ApexFormulaLab research https://github.com/patrickPetscavage/apex-formula-lab-AI'})
   except requests.RequestException:pass
  if r.status_code==200:
   data=r.json();p.write_text(json.dumps(data),encoding='utf8');return data
  if r.status_code not in (429,500,502,503,504):raise RuntimeError(f'{url}: HTTP {r.status_code}')
  time.sleep(3*(attempt+1))
 raise RuntimeError(f'{url}: HTTP {r.status_code}')

def xy(lon,lat,origin):
 return ((lon-origin[0])*math.pi/180*6378137*math.cos(origin[1]*math.pi/180),-(lat-origin[1])*math.pi/180*6378137)

def length(coords,origin):
 pts=[xy(p['lon'],p['lat'],origin) for p in coords]
 return sum(math.dist(a,b) for a,b in zip(pts,pts[1:]))

def choose_cycle(ways,origin,target):
 # OSM node identity joins segmented ways without guessing nearest points at crossings.
 edges=[]
 for w in ways:
  tags=w.get('tags',{});g=w.get('geometry',[]);nodes=w.get('nodes',[])
  if len(g)<2 or len(nodes)!=len(g) or tags.get('area')=='yes' or tags.get('raceway') in ['pit_lane','pitlane','karting'] or tags.get('service')=='pit_lane' or re.search(r'pit[ -]?lane',tags.get('name',''),re.I):continue
  if tags.get('highway')!='raceway':continue
  edges.append((w['id'],nodes[0],nodes[-1],g,length(g,origin),tags))
 graph={}
 for i,e in enumerate(edges):
  for node in [e[1],e[2]]:graph.setdefault(node,[]).append(i)
 candidates=[];seen=set();budget=[0]
 def visit(start,node,used,sequence,distance):
  budget[0]+=1
  if budget[0]>200000 or distance>target*1.22 or len(used)>90:return
  if sequence and node==start:
   identity=tuple(sorted(used))
   if identity not in seen and target*.7<distance<target*1.2:
    seen.add(identity);candidates.append((abs(distance-target),sequence[:],distance))
   return
  for i in graph.get(node,[]):
   if i in used:continue
   e=edges[i];forward=node==e[1];nxt=e[2] if forward else e[1]
   if (e[5].get('oneway')=='yes' and not forward) or (e[5].get('oneway')=='-1' and forward):continue
   visit(start,nxt,used|{i},sequence+[(i,forward)],distance+e[4])
 for e in edges:
  if budget[0]>200000:break
  visit(e[1],e[1],set(),[],0)
 if not candidates:raise ValueError('No closed OSM raceway cycle matching the reference length; manual route review required')
 candidates.sort(key=lambda c:c[0]);_,sequence,dist=candidates[0];coords=[];ids=[]
 for i,forward in sequence:
  e=edges[i];part=e[3] if forward else list(reversed(e[3]));coords.extend(part if not coords else part[1:]);ids.append(e[0])
 # Use OSM oneway direction where present; otherwise preserve mapped ordering and disclose uncertainty.
 agreements=sum(1 if (edges[i][5].get('oneway')=='yes')==f else -1 for i,f in sequence if edges[i][5].get('oneway') in ['yes','-1'])
 if agreements<0:coords=list(reversed(coords));ids=list(reversed(ids))
 return coords,ids,dist,agreements!=0

def resample(coords,origin,step=6):
 raw=[xy(p['lon'],p['lat'],origin) for p in coords]
 if math.dist(raw[0],raw[-1])<.05:raw.pop()
 if len(raw)<8:raise ValueError('Insufficient geometry')
 distances=[0]
 for i,p in enumerate(raw):distances.append(distances[-1]+math.dist(p,raw[(i+1)%len(raw)]))
 total=distances[-1];count=max(300,round(total/step));points=[];j=0
 for i in range(count):
  s=i/count*total
  while j<len(raw)-1 and distances[j+1]<s:j+=1
  u=(s-distances[j])/(distances[j+1]-distances[j]);a,b=raw[j],raw[(j+1)%len(raw)]
  points.append([round(a[0]+(b[0]-a[0])*u,3),0,round(a[1]+(b[1]-a[1])*u,3)])
 return points,total

def build(v,terrain=True):
 ident,lat,lon,reference,geo,date,theme,slug=v;origin=[lon,lat]
 # Include mapped raceways, pit lanes, buildings/grandstands and bridge identity.
 bbox=f'{lat-.025},{lon-.035},{lat+.025},{lon+.035}'
 query=f'[out:json][timeout:60];(way[highway=raceway]({bbox});way[leisure=grandstand]({bbox});way[building]({lat-.006},{lon-.008},{lat+.006},{lon+.008}););out geom;'
 data=None
 for endpoint in ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter']:
  try:data=get_json(endpoint,{'data':query},'osm-'+ident);break
  except Exception as e:print(f'{ident}: public endpoint unavailable: {e}',flush=True)
 if data is None:raise RuntimeError('Public OSM endpoints unavailable')
 elements=data.get('elements',[])
 try:coords,ids,mapped_length,direction=choose_cycle(elements,origin,reference)
 except ValueError:
  relation_query=f'[out:json][timeout:25];(relation[type=circuit]({bbox});relation[route=race]({bbox});relation[route=raceway]({bbox}););(._;>;);out geom;'
  relation_data=get_json('https://overpass-api.de/api/interpreter',{'data':relation_query},'relations-'+ident)
  relation_elements=relation_data.get('elements',[])
  member_ids={m['ref'] for e in relation_elements if e['type']=='relation' for m in e.get('members',[]) if m['type']=='way'}
  for e in relation_elements:
   if e['type']=='way' and e['id'] in member_ids:
    e=dict(e);e['tags']={**e.get('tags',{}),'highway':'raceway'};elements.append(e)
  coords,ids,mapped_length,direction=choose_cycle(elements,origin,reference)
 # Locator is approximate; station 0 is nearest mapped point to the researched start/finish locator.
 k=min(range(len(coords)-1),key=lambda i:sum(c*c for c in xy(coords[i]['lon'],coords[i]['lat'],origin)))
 coords=coords[k:-1]+coords[:k]+[coords[k]]
 points,total=resample(coords,origin)
 grid=None;heights=[];datum=0
 if terrain:
  xs=[p[0] for p in points];zs=[p[2] for p in points];side=13
  box=[min(xs)-300,min(zs)-300,max(xs)+300,max(zs)+300]
  locations=[]
  for z in range(side):
   for x in range(side):
    east=box[0]+(box[2]-box[0])*x/(side-1);south=box[1]+(box[3]-box[1])*z/(side-1)
    locations.append((lat-south/6378137*180/math.pi,lon+east/(6378137*math.cos(lat*math.pi/180))*180/math.pi))
  for start in range(0,len(locations),95):
   subset=locations[start:start+95];response=get_json('https://api.opentopodata.org/v1/srtm90m',{'locations':'|'.join(f'{a:.6f},{b:.6f}' for a,b in subset),'interpolation':'bilinear'},f'dem-{ident}-{start}')
   if response.get('status')!='OK':raise ValueError('SRTM query failed')
   heights.extend(r['elevation'] for r in response['results']);time.sleep(1.1)
  valid=[h for h in heights if h is not None];datum=valid[0] if valid else 0
  grid={'size':side,'bounds':box,'heights':[None if h is None else round(h-datum,2) for h in heights],'datumMSL':datum,'verticalDatum':'EGM96 orthometric; local y = height - datumMSL','resolutionMetres':90,'source':'https://www.opentopodata.org/datasets/srtm/','license':'NASA SRTM public-domain elevation; API attribution Open Topo Data'}
  def height(x,z):
   u=max(0,min(side-1,(x-box[0])/(box[2]-box[0])*(side-1)));v=max(0,min(side-1,(z-box[1])/(box[3]-box[1])*(side-1)))
   ix=min(side-2,int(u));iz=min(side-2,int(v));a=u-ix;b=v-iz
   hs=[grid['heights'][iz*side+ix],grid['heights'][iz*side+ix+1],grid['heights'][(iz+1)*side+ix],grid['heights'][(iz+1)*side+ix+1]]
   if any(h is None for h in hs):return 0
   return hs[0]*(1-a)*(1-b)+hs[1]*a*(1-b)+hs[2]*(1-a)*b+hs[3]*a*b
  for p in points:p[1]=round(height(p[0],p[2]),3)
  # DEM is a coarse surface proxy; bridge upper decks are explicitly separated below.
  if ident=='suzuka':
   # Nearest crossing pair in horizontal coordinates, constrained far apart in station.
   crossing=min(((math.hypot(a[0]-points[j][0],a[2]-points[j][2]),i,j) for i,a in enumerate(points) for j in range(i+len(points)//4,min(len(points),i+3*len(points)//4)) ),key=lambda x:x[0])
   _,lower,upper=crossing
   if lower>upper:lower,upper=upper,lower
   # Back-straight pass near 85% lap goes over Degner pass near 44%.
   for i,p in enumerate(points):
    delta=min(abs(i-upper),len(points)-abs(i-upper))*total/len(points)
    if delta<95:p[1]+=round(8*(1+math.cos(math.pi*delta/95))/2,3)
 else:crossing=None
 buildings=[];pits=[]
 for e in elements:
  tags=e.get('tags',{});geometry=e.get('geometry',[])
  if e['id'] in ids or len(geometry)<2:continue
  if tags.get('highway')=='raceway' and (tags.get('raceway')=='pit_lane' or 'pit' in tags.get('name','').lower()):
   pits.append({'osmId':e['id'],'points':[[*xy(p['lon'],p['lat'],origin)] for p in geometry]});continue
  if tags.get('building') or tags.get('leisure')=='grandstand':
   poly=[xy(p['lon'],p['lat'],origin) for p in geometry]
   # Only genuine mapped buildings within 500 m of the raceway are included.
   cx=sum(p[0] for p in poly)/len(poly);cz=sum(p[1] for p in poly)/len(poly)
   if min((p[0]-cx)**2+(p[2]-cz)**2 for p in points)>500**2:continue
   height=tags.get('height','')
   try:height=float(height.replace(' m',''))
   except ValueError:height=float(tags.get('building:levels','2'))*3 if tags.get('building:levels','2').isdigit() else 6
   buildings.append({'osmId':e['id'],'name':tags.get('name',tags.get('name:en','Mapped structure')),'kind':'grandstand' if tags.get('leisure')=='grandstand' else 'building','height':min(120,max(3,height)),'heightStatus':'OSM height' if tags.get('height') else 'estimated from levels/default','footprint':[[round(x,2),round(z,2)] for x,z in poly]})
 record={'schema':'apex-atlas-1','id':ident,'version':f'{ident}-osm-srtm-2026.1','date':STAMP,'origin':{'longitude':lon,'latitude':lat,'datumMSL':datum},'points':points,'length':round(total,3),'referenceLength':reference,'terrain':grid,'buildings':buildings[:250],'pitLanes':pits,'crossing':crossing if ident=='suzuka' else None,'widthMetres':12,'theme':theme,
  'provenance':{'horizontal':{'source':'https://www.openstreetmap.org','license':'ODbL 1.0','attribution':'© OpenStreetMap contributors','wayIds':ids,'retrieved':STAMP,'crs':'WGS84 EPSG:4326 -> local east/up/south metres','resolution':'OSM vertex precision is not surveyed accuracy','direction': 'OSM oneway checked' if direction else 'mapped order; requires direction review'},'elevation':{'source':grid['source'] if grid else None,'status':'90 m DEM proxy, NOT surveyed road elevation' if grid else 'unavailable; flat fallback','bridge':'Suzuka upper pass adds estimated 8 m separation; not surveyed' if ident=='suzuka' else 'Bridge/tunnel road surfaces require review'},'width':'12 m estimated uniform corridor, not measured widths','banking':'unavailable; flat road cross-section','startFinish':'nearest source vertex to approximate researched locator; not official timing line','scenery':'OSM footprints; procedural materials, vegetation and inferred structure heights; not photogrammetry'},'warnings':[]}
 if abs(total-reference)/reference>.025:record['warnings'].append('OSM cycle length differs by more than 2.5% from official reference; layout requires review')
 if ident in ['madrid','melbourne','barcelona','singapore','yas-marina']:record['warnings'].append('Changed/recent layout: OSM geometry is provisional until independently reconciled with the 2026 homologated plan')
 DEST.mkdir(parents=True,exist_ok=True);(DEST/(ident+'.json')).write_text(json.dumps(record,separators=(',',':')),encoding='utf8')
 print(f'{ident}: {len(points)} stations; {total:.0f}/{reference} m; {len(buildings)} mapped buildings',flush=True)
 return record

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--circuits',nargs='*');p.add_argument('--no-terrain',action='store_true');args=p.parse_args()
 failures=[]
 for venue in VENUES:
  if args.circuits and venue[0] not in args.circuits:continue
  try:build(venue,not args.no_terrain)
  except Exception as e:failures.append((venue[0],str(e)));print(f'FAILED {venue[0]}: {e}',flush=True)
 if failures:raise SystemExit(json.dumps(failures))
