"""Build a small real pre-2025 educational library; developer tool, never a visitor prerequisite.

OpenF1 data: CC BY-NC-SA 4.0, https://openf1.org/ . No credentials, paid access or future observations.
Raw HTTP responses stay in ignored work/openf1-cache. Published transformations are documented.
"""
import hashlib,json,time
from pathlib import Path
from datetime import datetime,timezone,timedelta
import requests

ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'work/openf1-cache';CACHE.mkdir(parents=True,exist_ok=True)
DEST=ROOT/'public/data/fastf1';DEST.mkdir(parents=True,exist_ok=True)
CUTOFF='2025-01-01T00:00:00Z'
BASE='https://api.openf1.org/v1/'
TRACKS={'Suzuka':('suzuka','suzuka-5807-v1',5807),'Monza':('monza','monza-tum-v1',5793),'Spa-Francorchamps':('spa','spa-tum-v1',7004)}
retrieved=datetime.now(timezone.utc).isoformat()
def stamp(s):return datetime.fromisoformat(s.replace('Z','+00:00'))
def get(endpoint,**params):
    query=requests.Request('GET',BASE+endpoint,params=params).prepare().url
    p=CACHE/(hashlib.sha256(query.encode()).hexdigest()+'.json')
    if p.exists():return json.loads(p.read_text())
    for attempt in range(5):
        time.sleep(2.2+attempt*3)
        r=requests.get(query,timeout=65)
        if r.status_code==200:
            data=r.json();p.write_text(json.dumps(data));return data
        if r.status_code==404 and endpoint in ('car_data','location'):
            p.write_text('[]');return []
        if r.status_code not in (429,500,502,503,504):r.raise_for_status()
    raise RuntimeError(f'{query}: {r.status_code}')

def build(s):
    circuit,version,length=TRACKS[s['circuit_short_name']];year=s['year'];key=s['session_key'];date=s['date_start']
    assert year in (2023,2024) and stamp(date)<stamp(CUTOFF)
    ident=f'{year}-{circuit}-R'
    raw=get('laps',session_key=key);stints=get('stints',session_key=key);drivers=get('drivers',session_key=key);pits=get('pit',session_key=key);weather_raw=get('weather',session_key=key)
    names={d['driver_number']:d['name_acronym'] for d in drivers};start=stamp(date)
    laps=[];original={}
    for l in raw:
        num=l['driver_number'];lap=l['lap_number'];driver=names.get(num,str(num));duration=l.get('lap_duration');duration=duration if duration and duration>0 else None;when=l.get('date_start')
        if not when or stamp(when)>=stamp(CUTOFF):continue
        stint=next((t for t in stints if t['driver_number']==num and t['lap_start']<=lap<=t['lap_end']),None)
        pit=next((p for p in pits if p['driver_number']==num and p['lap_number']==lap),None)
        row={'driver':driver,'driverNumber':str(num),'lap':lap,'lapTime':duration,'sectors':[l.get('duration_sector_'+str(i)) for i in (1,2,3)],'compound':stint['compound'] if stint else None,'tireAge':stint['tyre_age_at_start']+lap-stint['lap_start']+1 if stint and stint.get('tyre_age_at_start') is not None else None,'stint':stint['stint_number'] if stint else None,'trackStatus':None,'accurate':None,'deleted':None,'pitIn':(stamp(pit['date'])-start).total_seconds() if pit and pit.get('date') else None,'pitOut':(stamp(when)-start).total_seconds() if l.get('is_pit_out_lap') else None,'sessionTime':(stamp(when)-start).total_seconds()+duration if duration else None,'startTime':(stamp(when)-start).total_seconds()}
        laps.append(row);original[(driver,lap)]=l
    laps=list({(l['driver'],l['lap']):l for l in laps}.values())
    traces=[]
    # Two real lap traces per 2024 event; do not fabricate positions or missing channels.
    if year==2024:
        candidates=sorted([l for l in laps if l['lapTime'] and l['lap']>1 and l['pitIn'] is None and l['pitOut'] is None],key=lambda l:l['lapTime'])
        chosen=[]
        for l in candidates:
            if l['driver'] not in [x['driver'] for x in chosen]:chosen.append(l)
            if len(chosen)==2:break
        for l in chosen:
            source=original[(l['driver'],l['lap'])];begin=stamp(source['date_start']);end=begin+timedelta(seconds=l['lapTime']);params={'session_key':key,'driver_number':int(l['driverNumber']),'date>=':begin.isoformat(),'date<=':end.isoformat()}
            car_raw=get('car_data',**params);pos_raw=get('location',**params);car=[];positions=[];distance=0
            for c in sorted(car_raw,key=lambda x:x['date']):
                t=(stamp(c['date'])-begin).total_seconds()
                if not 0<=t<=l['lapTime'] or (car and t<=car[-1]['t']):continue
                if car and c.get('speed') is not None and car[-1]['speed'] is not None:distance+=(t-car[-1]['t'])*(c['speed']+car[-1]['speed'])/7.2
                car.append({'t':t,'date':c['date'],'sessionTime':(stamp(c['date'])-start).total_seconds(),'speed':c.get('speed'),'throttle':c.get('throttle'),'brake':None if c.get('brake') is None else c['brake']>0,'rpm':c.get('rpm'),'gear':c.get('n_gear'),'distance':round(distance,4),'source':'OpenF1 car_data'})
            for p in sorted(pos_raw,key=lambda x:x['date']):
                t=(stamp(p['date'])-begin).total_seconds()
                if not 0<=t<=l['lapTime'] or (positions and t<=positions[-1]['t']):continue
                positions.append({'t':t,'date':p['date'],'x':p.get('x'),'y':p.get('y'),'z':p.get('z'),'status':None,'source':'OpenF1 location'})
            if len(car)>=10:traces.append({'driver':l['driver'],'lap':l['lap'],'lapTime':l['lapTime'],'car':car,'positions':positions})
    weather=[{'time':(stamp(w['date'])-start).total_seconds(),'airTemp':w.get('air_temperature'),'trackTemp':w.get('track_temperature'),'rainfall':None if w.get('rainfall') is None else bool(w['rainfall']),'humidity':w.get('humidity'),'pressure':w.get('pressure'),'windSpeed':w.get('wind_speed'),'windDirection':w.get('wind_direction')} for w in weather_raw if stamp(w['date'])<stamp(CUTOFF)]
    a={'schema':'apex-historical-1','cutoff':CUTOFF,'id':ident,'year':year,'date':date,'circuitId':circuit,'trackVersion':version,'referenceLength':length,'session':'R','event':{'suzuka':'Japanese Grand Prix','monza':'Italian Grand Prix','spa':'Belgian Grand Prix'}[circuit],'layout':'Historical Grand Prix; replay alignment approximate','provenance':{'provider':'OpenF1','version':'REST v1 / apex-normalizer-1','retrievedAt':retrieved,'source':BASE+'sessions?session_key='+str(key),'cutoff':CUTOFF,'rights':'OpenF1: CC BY-NC-SA 4.0; non-commercial educational/fan analysis. https://openf1.org/ ; https://creativecommons.org/licenses/by-nc-sa/4.0/ . Modified: joined laps/stints/pits, lap-relative traces and integrated distance; missing fields remain null.','channels':{'lapTime':'OpenF1 lap_duration seconds','compound':'OpenF1 stints.compound','tireAge':'tyre_age_at_start + lap - lap_start + 1; derived','pit':'OpenF1 pit visits and is_pit_out_lap','accurate/deleted/trackStatus':'unavailable, null; never claimed to be FastF1 flags','car':'OpenF1 native samples, speed km/h, throttle %, brake boolean, rpm, gear','position':'source broadcast coordinates, not surveyed GPS; no rotation/scale applied','distance':'trapezoidal speed integration from first available sample, metres','weather':'OpenF1 samples, UTC; no interpolation or zero fill'},'missing':'null is unavailable; no invented telemetry or flags','interpolation':'No resampling on export. UI interpolation hides gaps over 2 seconds.'},'laps':laps,'results':[],'weather':weather,'traces':traces,'warnings':['Track-status, deleted-lap and FastF1 accuracy flags are unavailable. The OpenF1 regression uses numerical-consistency, dry-compound, pit and duration filters; it cannot certify green-flag laps.','Observed lap times are real. Ghost replay positions between observations are interpolated; statistical ghosts use illustrative map motion.']}
    a['contentHash']=hashlib.sha256(json.dumps(a,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    (DEST/(ident+'.json')).write_text(json.dumps(a,separators=(',',':')),encoding='utf8')
    print(f'{ident}: {len(laps)} real laps, {len(traces)} traces',flush=True)
    return {k:a[k] for k in ['id','year','date','circuitId','session','event','contentHash']}

if __name__=='__main__':
    sessions=[]
    for year in (2023,2024):sessions.extend(s for s in get('sessions',year=year,session_name='Race') if s['circuit_short_name'] in TRACKS)
    entries=[build(s) for s in sorted(sessions,key=lambda s:s['date_start'])]
    (DEST/'index.json').write_text(json.dumps({'schema':'apex-fastf1-index-1','cutoff':CUTOFF,'sessions':entries},separators=(',',':')))
    print(f'Published {len(entries)} real sessions',flush=True)
