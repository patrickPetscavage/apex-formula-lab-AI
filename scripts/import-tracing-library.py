"""Normalize cached TracingInsights/FastF1 lap exports. No fabricated flags or telemetry.
Acquire session_laptimes.json from the recorded source URL first. Network is developer-only.
"""
from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,shutil
ROOT=Path(__file__).resolve().parents[1];DEST=ROOT/'public/data/fastf1'
def number(v):return float(v) if isinstance(v,(int,float)) and not isinstance(v,bool) else None
index=json.loads((DEST/'index.json').read_text());entries={e['id']:e for e in index['sessions']}
for f in sorted((ROOT/'work/tracing-cache').glob('20??-*.json')):
 raw=json.loads(f.read_text());d=raw['data'];year=raw['year'];c=raw['id'];ident=f'{year}-{c}-R'
 assert year<2025 and all(k in d for k in ['time','lap','life','status','iacc','del','lSD'])
 start=min(t for t in d['lSD'] if isinstance(t,str) and t!='None')[:26]+'Z'
 assert datetime.fromisoformat(start.replace('Z','+00:00')).year==year
 rows=[]
 for i in range(len(d['lap'])):
  get=lambda k: d.get(k,[None]*len(d['lap']))[i]
  rows.append(dict(driver=get('drv'),driverNumber=str(get('dNum')),lap=int(get('lap')),lapTime=number(get('time')),sectors=[number(get('s1')),number(get('s2')),number(get('s3'))],compound=get('compound') if get('compound')!='None' else None,tireAge=number(get('life')),stint=number(get('stint')),trackStatus=get('status') if isinstance(get('status'),str) and get('status')!='None' else None,accurate=get('iacc') if isinstance(get('iacc'),bool) else None,deleted=get('del') if isinstance(get('del'),bool) else None,pitIn=number(get('pin')),pitOut=number(get('pout')),sessionTime=number(get('sesT')),startTime=number(get('lST'))))
 assert all(r['accurate'] is not None and r['deleted'] is not None for r in rows)
 a=dict(schema='apex-fastf1-1',cutoff=index['cutoff'],id=ident,year=year,date=start,circuitId=c,trackVersion={'suzuka':'suzuka-5807-v1','monza':'monza-tum-v1','spa':'spa-tum-v1'}[c],referenceLength={'suzuka':5807,'monza':5793,'spa':7004}[c],session='R',event=raw['event'],layout='Historical Grand Prix; current reference geometry is approximate',provenance=dict(provider='FastF1',version='TracingInsights FastF1 export / apex-normalizer-1',retrievedAt=datetime.now(timezone.utc).isoformat(),source=raw['url'],cutoff=index['cutoff'],rights=f'TracingInsights-Archive {year} repository: MIT, copyright 2023 TracingInsights-Archive. Original F1 timing rights remain with their owners; repository software license is not an assertion of commercial rights to F1 data. Source: https://github.com/TracingInsights/{year}. OpenF1-derived combined artifacts retain CC BY-NC-SA 4.0.',channels={'laps':'FastF1 fields exported by TracingInsights, seconds','flags':'Original iacc, del, status retained','date':'Earliest original lap-start UTC date; not a fabricated schedule time'},missing='Source None and absent values remain null.',interpolation='No telemetry resampled. No car/position traces included.'),laps=rows,results=[],weather=[],traces=[],warnings=['Historical timing and original FastF1 quality flags. No measured positions or telemetry included.','2019–2022 cars and historical layouts differ from modern reference rendering.'])
 a['contentHash']=hashlib.sha256(json.dumps(a,sort_keys=True,separators=(',',':')).encode()).hexdigest();(DEST/(ident+'.json')).write_text(json.dumps(a,separators=(',',':')))
 entries[ident]={k:a[k] for k in ['id','year','date','circuitId','session','event','contentHash']};print(ident,len(rows))
index['sessions']=sorted(entries.values(),key=lambda e:e['date']);(DEST/'index.json').write_text(json.dumps(index,separators=(',',':')))
license_file=ROOT/'work/tracing-cache/LICENSE-2022.txt'
if license_file.exists():shutil.copyfile(license_file,DEST/'TRACINGINSIGHTS-LICENSE.txt')
