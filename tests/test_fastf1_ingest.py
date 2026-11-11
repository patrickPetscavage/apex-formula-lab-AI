"""Offline input guards: must reject future sessions without any network request."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
from types import SimpleNamespace
import tempfile
import json
spec = importlib.util.spec_from_file_location('ingest', Path(__file__).parents[1] / 'scripts' / 'fastf1_ingest.py')
ingest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ingest)

class CutoffTests(unittest.TestCase):
    def test_year_cutoff(self):
        for year in [2025, 2026, 2017, '2024', None]:
            with self.assertRaises(ValueError):
                ingest.ingest(year, 'suzuka')
    def test_exact_boundary(self):
        self.assertEqual(ingest.guard_date('2024-12-31T23:59:59Z'), '2024-12-31T23:59:59Z')
        for stamp in ['2025-01-01T00:00:00Z', '2026-01-01', None]:
            with self.assertRaises(ValueError):
                ingest.guard_date(stamp)
    def test_nullable_values(self):
        self.assertIsNone(ingest.number(float('nan')))
        self.assertIsNone(ingest.number(float('inf')))
        self.assertIsNone(ingest.seconds(None))

    def test_export_pipeline_with_missing_positions(self):
        # Test-only synthetic session exercises serialization, not provider accuracy.
        import pandas as pd
        import fastf1
        t = pd.to_timedelta(range(0, 101, 10), unit='s')
        car = fastf1.core.Telemetry(pd.DataFrame({'Time': t, 'SessionTime': t,
            'Date': pd.Timestamp('2024-04-06T06:00:00Z') + t,
            'Speed': [200] * 11, 'Throttle': [100] * 11, 'Brake': [False] * 11,
            'RPM': [10000] * 11, 'nGear': [6] * 11, 'Source': ['car'] * 11}))
        row = pd.Series({'Driver': 'TST', 'DriverNumber': '1', 'LapNumber': 2,
            'LapTime': pd.Timedelta(seconds=100), 'IsAccurate': True, 'Deleted': False,
            'PitInTime': pd.NaT, 'PitOutTime': pd.NaT, 'Compound': 'MEDIUM',
            'TyreLife': 2, 'Stint': 1, 'TrackStatus': '1', 'Time': pd.Timedelta(seconds=110),
            'LapStartTime': pd.Timedelta(seconds=10)})
        class SelectedLap:
            def get_car_data(self):
                return car.copy()
            def get_pos_data(self):
                raise RuntimeError('TEST missing positions')
        class Laps:
            iloc = [SelectedLap()]
            def iterlaps(self):
                yield 0, row
            def pick_drivers(self, _driver):
                return self
            def pick_laps(self, _lap):
                return self
        session = SimpleNamespace(date=pd.Timestamp('2024-04-06T06:00:00Z'),
            api_path='/static/2024/TEST_ONLY/', event={'EventName': 'Japanese Grand Prix'},
            laps=Laps(), results=pd.DataFrame([{'Abbreviation': 'TST', 'Position': 1}]),
            weather_data=pd.DataFrame(), load=lambda **_kwargs: None)
        with tempfile.TemporaryDirectory() as output, patch.object(fastf1, 'get_session', return_value=session) as get_session, patch.object(fastf1.Cache, 'configure'), patch.object(fastf1.Cache, 'offline_mode'), patch.object(fastf1.Cache, 'requests_get', side_effect=AssertionError('Offline ingestion must not request network')):
            archive = ingest.ingest(2024, 'suzuka', 'Q', 1, output, offline=True)
            get_session.assert_called_once_with(2024, 'Japanese Grand Prix', 'Q', backend='fastf1', exact_match=True)
            self.assertEqual(len(archive['traces']), 1)
            self.assertEqual(archive['traces'][0]['positions'], [])
            self.assertIs(archive['traces'][0]['car'][0]['brake'], False)
            self.assertTrue(any('positions unavailable' in warning for warning in archive['warnings']))
            self.assertEqual(archive['cutoff'], ingest.CUTOFF)
            restored = json.loads((Path(output) / '2024-suzuka-Q.json').read_text())
            self.assertEqual(restored['contentHash'], archive['contentHash'])

if __name__ == '__main__':
    unittest.main()
