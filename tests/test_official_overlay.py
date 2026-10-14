#!/usr/bin/env python3
"""Regression tests for independent official river-line overlay."""
import importlib.util,json,pathlib,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('p136_overlay',ROOT/'scripts/compare_official_river_lines.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
def feature(rid,coords):
 return {'type':'Feature','properties':{'id':rid},'geometry':{'type':'LineString','coordinates':coords}}
def write(p,features):
 p.write_text(json.dumps({'type':'FeatureCollection','features':features}),encoding='utf-8')
class OverlayTest(unittest.TestCase):
 def test_exact_match_and_publication_hold(self):
  with tempfile.TemporaryDirectory() as d:
   c=pathlib.Path(d)/'candidate.json';o=pathlib.Path(d)/'official.json'
   f=feature('1',[[120.5,24.3],[120.51,24.31]])
   write(c,[f]);write(o,[f])
   r=mod.review(c,o,'大甲溪','https://data.gov.tw/dataset/example')
   self.assertEqual(r['candidate_reaches'],1)
   self.assertEqual(r['overall_fraction_within_m']['100'],1)
   self.assertFalse(r['identity_verified'])
   self.assertFalse(r['publication_approved'])
 def test_far_away_not_a_match(self):
  with tempfile.TemporaryDirectory() as d:
   c=pathlib.Path(d)/'candidate.json';o=pathlib.Path(d)/'official.json'
   write(c,[feature('1',[[120.5,24.3],[120.51,24.31]])])
   write(o,[feature('2',[[121.5,25.3],[121.51,25.31]])])
   r=mod.review(c,o,'大甲溪','https://data.gov.tw/dataset/example')
   self.assertEqual(r['overall_fraction_within_m']['1000'],0)
 def test_reject_unverified_crs(self):
  with tempfile.TemporaryDirectory() as d:
   c=pathlib.Path(d)/'candidate.json';o=pathlib.Path(d)/'official.json'
   write(c,[feature('1',[[120.5,24.3],[120.51,24.31]])])
   obj={'type':'FeatureCollection','crs':{'type':'name','properties':{'name':'EPSG:3826'}},'features':[feature('1',[[250000,2600000],[251000,2601000]])]}
   o.write_text(json.dumps(obj))
   with self.assertRaises(ValueError):mod.review(c,o,'大甲溪','https://data.gov.tw/dataset/example')
if __name__=='__main__':unittest.main()
