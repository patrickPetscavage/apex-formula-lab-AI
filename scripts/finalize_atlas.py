"""Fingerprint acquired geometry so changed roads cannot reuse an old experiment identity."""
import hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
files=[p for p in (root/'public/data/atlas-2026').glob('*.json') if p.name!='index.json']
for p in files:
 a=json.loads(p.read_text())
 if a.get('terrain'):
  g=a['terrain'];g['sampleSpacingMetres']=[round((g['bounds'][2]-g['bounds'][0])/(g['size']-1),1),round((g['bounds'][3]-g['bounds'][1])/(g['size']-1),1)]
 source={k:a[k] for k in ['points','terrain','buildings','pitLanes','provenance','widthMetres']}
 digest=hashlib.sha256(json.dumps(source,sort_keys=True,separators=(',',':')).encode()).hexdigest()[:12]
 a['version']=f'{a["id"]}-atlas-2026.1-{digest}'
 p.write_text(json.dumps(a,separators=(',',':')),encoding='utf8')
print(f'Fingerprinted {len(files)} circuit geometry assets')
