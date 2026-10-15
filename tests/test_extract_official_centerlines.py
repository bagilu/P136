#!/usr/bin/env python3
import importlib.util,pathlib,tempfile,unittest,zipfile
import shapefile
from pyproj import CRS
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('extract',ROOT/'scripts/extract_official_centerlines.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class CenterlineTest(unittest.TestCase):
 def test_exact_name_and_crs(self):
  with tempfile.TemporaryDirectory() as d:
   d=pathlib.Path(d)
   w=shapefile.Writer(str(d/'r'),shapeType=shapefile.POLYLINE)
   w.field('RIVER','C')
   w.line([[[120.5,24.3],[120.6,24.4]]]);w.record('大甲溪')
   w.line([[[120.4,24.3],[120.5,24.4]]]);w.record('大安溪')
   w.close()
   (d/'r.prj').write_text(CRS.from_epsg(4326).to_wkt())
   z=d/'r.zip'
   with zipfile.ZipFile(z,'w') as archive:
    for ext in ('.shp','.shx','.dbf','.prj'):archive.write(d/('r'+ext),arcname='r'+ext)
   fc,meta=mod.extract(z,'r.shp','RIVER','大甲溪','EPSG:4326','https://example.org/official')
   self.assertEqual(len(fc['features']),1)
   self.assertFalse(meta['identity_verified'])
   with self.assertRaisesRegex(ValueError,'does not match'):mod.extract(z,'r.shp','RIVER','大甲溪','EPSG:3826','https://example.org/official')
   with self.assertRaisesRegex(ValueError,'No exact-name'):mod.extract(z,'r.shp','RIVER','不存在','EPSG:4326','https://example.org/official')
if __name__=='__main__':unittest.main()
