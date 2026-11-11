"""Pre-2025-only FastF1 -> portable Apex archive. No web credentials required."""
import argparse
import hashlib
import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path

CUTOFF = '2025-01-01T00:00:00Z'
ROOT = Path(__file__).resolve().parents[1]
CIRCUITS = {'suzuka': ('Japanese Grand Prix', 'suzuka-5807-v1', 5807), 'monza': ('Italian Grand Prix', 'monza-tum-v1', 5793), 'spa': ('Belgian Grand Prix', 'spa-tum-v1', 7004)}

def guard_year(year):
    if not isinstance(year, int) or not 2018 <= year <= 2024:
        raise ValueError('Only 2018–2024 FastF1 telemetry is supported. No 2025+ requests are allowed.')

def guard_date(value):
    import pandas as pd
    dt = pd.Timestamp(value)
    if pd.isna(dt):
        raise ValueError('Missing session date')
    dt = dt.tz_localize('UTC') if dt.tzinfo is None else dt.tz_convert('UTC')
    if not pd.Timestamp('2018-01-01', tz='UTC') <= dt < pd.Timestamp(CUTOFF):
        raise ValueError('Session date violates archive cutoff')
    return dt.isoformat().replace('+00:00', 'Z')

def number(v):
    try:
        n = float(v)
        return round(n, 6) if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None

def seconds(v):
    try:
        return number(v.total_seconds())
    except (AttributeError, ValueError):
        return None

def clean(v):
    import pandas as pd
    if pd.isna(v):
        return None
    return str(v)

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(data, allow_nan=False, separators=(',', ':')), encoding='utf8')
    os.replace(temp, path)

def ingest(year, circuit, session_code='Q', telemetry_drivers=2, output=None, cache_dir=None, offline=False, drivers=None, lap_numbers=None):
    guard_year(year)  # Must happen BEFORE importing/loading/requesting any session.
    if circuit not in CIRCUITS or session_code not in ['Q', 'R', 'FP1', 'FP2', 'FP3', 'S', 'SQ']:
        raise ValueError('Unsupported circuit/session')
    import fastf1
    import pandas as pd
    cache = Path(cache_dir) if cache_dir else ROOT / '.fastf1-cache' / 'pre2025-v1'
    cache.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.configure(cache_dir=str(cache))
    fastf1.Cache.offline_mode(offline)
    event_name, version, length = CIRCUITS[circuit]
    session = fastf1.get_session(year, event_name, session_code, backend='fastf1', exact_match=True)
    date = guard_date(session.date)
    # Respect the provider's authentication boundary; fail once, before loading
    # ten separate channels. FastF1 handles sign-in outside Apex when available.
    if not offline:
        response = fastf1.Cache.requests_get('https://livetiming.formula1.com' + session.api_path + 'SessionInfo.jsonStream', timeout=30)
        if response.status_code in (401, 403):
            raise RuntimeError(f'Formula 1 HTTP {response.status_code}. Run python -m fastf1 auth f1tv --authenticate in your own terminal, or use --cache-dir PATH --offline with an authorized existing cache. Do not put credentials in Apex or JSON exports.')
        if response.status_code != 200:
            raise RuntimeError(f'Historical session unavailable: HTTP {response.status_code}; no archive was created.')
    session.load(telemetry=telemetry_drivers > 0, weather=True, messages=False)
    laps = []
    for _, lap in session.laps.iterlaps():
        laps.append({'driver': clean(lap.get('Driver')), 'driverNumber': clean(lap.get('DriverNumber')),
                     'lap': number(lap.get('LapNumber')), 'lapTime': seconds(lap.get('LapTime')),
                     'sectors': [seconds(lap.get(f'Sector{i}Time')) for i in [1, 2, 3]],
                     'compound': clean(lap.get('Compound')), 'tireAge': number(lap.get('TyreLife')),
                     'stint': number(lap.get('Stint')), 'trackStatus': clean(lap.get('TrackStatus')),
                     'accurate': bool(lap.get('IsAccurate')) if not pd.isna(lap.get('IsAccurate')) else False,
                     'pitIn': seconds(lap.get('PitInTime')), 'pitOut': seconds(lap.get('PitOutTime')),
                     'sessionTime': seconds(lap.get('Time')), 'startTime': seconds(lap.get('LapStartTime')),
                     'deleted': bool(lap.get('Deleted')) if not pd.isna(lap.get('Deleted')) else False})
    warnings = []
    results = []
    for _, row in session.results.iterrows():
        results.append({k: (number(row.get(k)) if k in ['Position', 'GridPosition', 'Points', 'Laps'] else clean(row.get(k)))
                        for k in ['DriverNumber', 'Abbreviation', 'FullName', 'TeamName', 'Position', 'GridPosition', 'Points', 'Laps', 'Status']})
    weather = []
    try:
        weather_frame = session.weather_data
    except Exception as e:
        weather_frame = pd.DataFrame()
        warnings.append(f'Weather unavailable: {e}')
    for _, row in weather_frame.iterrows():
        weather.append({'time': seconds(row.get('Time')), 'airTemp': number(row.get('AirTemp')), 'trackTemp': number(row.get('TrackTemp')),
                        'rainfall': bool(row.get('Rainfall')) if not pd.isna(row.get('Rainfall')) else None,
                        'humidity': number(row.get('Humidity')), 'pressure': number(row.get('Pressure')),
                        'windSpeed': number(row.get('WindSpeed')), 'windDirection': number(row.get('WindDirection'))})
    traces = []
    # Fastest accurate non-deleted lap per driver. Full session lap table remains available.
    candidates = [l for l in laps if l['lapTime'] and l['accurate'] and not l['deleted'] and l['pitIn'] is None and l['pitOut'] is None]
    seen = set()
    for item in sorted(candidates, key=lambda l: l['lapTime']):
        driver = item['driver']
        if drivers and driver not in drivers:
            continue
        if lap_numbers and int(item['lap']) not in lap_numbers:
            continue
        if (not lap_numbers and driver in seen) or (driver not in seen and len(seen) >= telemetry_drivers) or len(traces) >= 20 or telemetry_drivers == 0:
            continue
        seen.add(driver)
        try:
            lap = session.laps.pick_drivers(driver).pick_laps(int(item['lap'])).iloc[0]
            car = lap.get_car_data().add_distance()
            try:
                pos = lap.get_pos_data()
            except Exception as e:
                pos = pd.DataFrame()
                warnings.append(f'{driver} lap {item["lap"]}: positions unavailable; car trace preserved: {e}')
            car_rows = []
            for _, r in car.iterrows():
                stamp = guard_date(r['Date'])
                brake = None if pd.isna(r.get('Brake')) else bool(r['Brake'])
                car_rows.append({'t': seconds(r['Time']), 'date': stamp, 'sessionTime': seconds(r['SessionTime']),
                                 'speed': number(r.get('Speed')), 'throttle': number(r.get('Throttle')), 'brake': brake,
                                 'rpm': number(r.get('RPM')), 'gear': number(r.get('nGear')), 'distance': number(r.get('Distance')),
                                 'source': clean(r.get('Source'))})
            positions = [{'t': seconds(r['Time']), 'date': guard_date(r['Date']), 'x': number(r.get('X')), 'y': number(r.get('Y')),
                          'z': number(r.get('Z')), 'status': clean(r.get('Status')), 'source': clean(r.get('Source'))} for _, r in pos.iterrows()]
            car_rows = [r for r in car_rows if r['t'] is not None and 0 <= r['t'] <= item['lapTime']]
            positions = [r for r in positions if r['t'] is not None and 0 <= r['t'] <= item['lapTime']]
            if len(car_rows) < 10:
                raise ValueError('Fewer than ten car samples')
            traces.append({'driver': driver, 'lap': item['lap'], 'lapTime': item['lapTime'], 'car': car_rows, 'positions': positions})
        except Exception as e:
            warnings.append(f'{driver} lap {item["lap"]}: telemetry unavailable: {e}')
    ident = f'{year}-{circuit}-{session_code}'
    archive = {'schema': 'apex-fastf1-1', 'cutoff': CUTOFF, 'id': ident, 'year': year, 'date': date,
               'circuitId': circuit, 'trackVersion': version, 'referenceLength': length, 'session': session_code,
               'event': str(session.event['EventName']), 'layout': 'Full Grand Prix; historical identity retained; map alignment approximate',
               'provenance': {'provider': 'FastF1', 'version': fastf1.__version__, 'retrievedAt': datetime.now(timezone.utc).isoformat(),
                              'source': session.api_path, 'cutoff': CUTOFF,
                              'rights': 'Underlying Formula 1 data rights are separate from FastF1 MIT software. Local analysis; not a redistribution licence.',
                              'channels': {'speed': 'km/h, source car stream', 'throttle': 'percent, source car stream', 'brake': 'boolean brake activation; not pressure',
                                           'rpm': 'rpm, source car stream', 'gear': 'integer, source car stream', 'distance': 'metres, FastF1 speed integration',
                                           'position': 'source timing coordinates in decimetres; not surveyed GPS', 'time': 'seconds from lap start; UTC dates retained',
                                           'weather': 'air/track temperature deg C; humidity percent; pressure hPa; wind m/s and degrees; rainfall boolean'},
                              'missing': 'null is unavailable; no zero filling', 'interpolation': 'No resampling on export; FastF1 Source retained. UI linearly interpolates for replay.'},
               'laps': laps, 'results': results, 'weather': weather, 'traces': traces, 'warnings': warnings}
    payload = json.dumps(archive, allow_nan=False, sort_keys=True, separators=(',', ':')).encode()
    archive['contentHash'] = hashlib.sha256(payload).hexdigest()
    destination = Path(output) if output else ROOT / 'data-local' / 'fastf1'
    path = destination / f'{ident}.json'
    write_json(path, archive)
    index_path = destination / 'index.json'
    index = json.loads(index_path.read_text(encoding='utf8')) if index_path.exists() else {'schema': 'apex-fastf1-index-1', 'cutoff': CUTOFF, 'sessions': []}
    for entry in index['sessions']:
        guard_year(entry['year']); guard_date(entry['date'])
    index['sessions'] = sorted([e for e in index['sessions'] if e['id'] != ident] +
                              [{k: archive[k] for k in ['id', 'year', 'date', 'circuitId', 'session', 'event', 'contentHash']}], key=lambda e: e['date'])
    write_json(index_path, index)
    print(f'EXPORTED {path}: {len(laps)} laps, {len(traces)} traces, {len(results)} results', flush=True)
    return archive

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--years', type=int, nargs='+', required=True)
    p.add_argument('--circuits', nargs='+', choices=list(CIRCUITS), default=['suzuka'])
    p.add_argument('--session', default='Q', choices=['Q', 'R', 'FP1', 'FP2', 'FP3', 'S', 'SQ'])
    p.add_argument('--telemetry-drivers', type=int, default=2, help='0 for timing-only training ingestion, 20 for all available driver best laps')
    p.add_argument('--output', help='Default data-local/fastf1, intentionally outside public/; import locally in Apex')
    p.add_argument('--cache-dir', help='Existing authorized FastF1 cache directory')
    p.add_argument('--offline', action='store_true', help='Read cached data only; no network access')
    p.add_argument('--drivers', nargs='+', help='Optional driver abbreviations, e.g. VER NOR LEC')
    p.add_argument('--laps', type=int, nargs='+', help='Optional lap numbers; otherwise one fastest accurate lap per driver. Up to 20 traces per archive.')
    args = p.parse_args()
    for year in args.years:
        guard_year(year)
    if not 0 <= args.telemetry_drivers <= 20:
        p.error('telemetry-drivers must be 0–20')
    failures = []
    for year in args.years:
        for circuit in args.circuits:
            try:
                ingest(year, circuit, args.session, args.telemetry_drivers, args.output, args.cache_dir, args.offline, args.drivers, args.laps)
            except Exception as e:
                failures.append(f'{year} {circuit}: {e}')
                print(f'FAILED {failures[-1]}', flush=True)
    if failures:
        raise SystemExit('\n'.join(failures))
