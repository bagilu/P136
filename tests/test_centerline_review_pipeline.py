#!/usr/bin/env python3
"""End-to-end synthetic evidence test; does not assert Dajia verification."""
import importlib.util,json,pathlib,tempfile,unittest,zipfile
import shapefile
from pyproj import CRS
ROOT=pathlib.Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0,str(ROOT/'scripts'))
from run_official_centerline_review import run
class Args:pass
class TestPipeline(unittest.TestCase):
 def test_end_to_end_and_no_publication(self):
  with tempfile.TemporaryDirectory() as d:
   d=pathlib.Path(d)
   w=shapefile.Writer(str(d/'river'),shapeType=shapefile.POLYLINE)
   w.field('RIVER','C',size=60)
   w.line([[[120.5,24.3],[120.51,24.31]]]);w.record('大甲溪')
   w.line([[[120.7,24.3],[120.71,24.31]]]);w.record('大安溪')
   w.close()
   (d/'river.prj').write_text(CRS.from_epsg(4326).to_wkt())
   z=d/'official.zip'
   with zipfile.ZipFile(z,'w') as f:
    for ext in ('.shp','.shx','.dbf','.prj'):f.write(d/('river'+ext),arcname='river'+ext)
   candidate=d/'candidate.geojson'
   candidate.write_text(json.dumps({'type':'FeatureCollection','features':[{
    'type':'Feature','properties':{'id':'test-1'},'geometry':{
    'type':'LineString','coordinates':[[120.5,24.3],[120.51,24.31]]}}]}))
   a=Args();a.archive=z;a.layer='river.shp';a.name_field='RIVER'
   a.name_value='大甲溪';a.source_crs='EPSG:4326'
   a.source_url='https://example.org/official';a.candidate=candidate;a.output_dir=d/'review'
   r=run(a)
   self.assertEqual(r['official_features'],1)
   self.assertEqual(r['overall_fraction_within_m']['100'],1)
   self.assertFalse(r['publication_approved'])
   self.assertFalse((a.output_dir/'official.geojson').exists())
   self.assertTrue((a.output_dir/'diagnostic-overlay.json').exists())
if __name__=='__main__':unittest.main()
