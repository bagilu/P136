#!/usr/bin/env python3
import importlib.util,io,json,pathlib,struct,tempfile,unittest,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('audit',ROOT/'scripts/audit_official_vector_archive.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class TestArchiveAudit(unittest.TestCase):
 def test_reject_non_zip(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'x.zip';p.write_bytes(b'not a zip')
   with self.assertRaisesRegex(ValueError,'Expected ZIP'):mod.inspect(p)
 def test_reject_zip_without_shp(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'x.zip'
   with zipfile.ZipFile(p,'w') as z:z.writestr('readme.txt','metadata only')
   with self.assertRaisesRegex(ValueError,'No SHP'):mod.inspect(p)
 def test_missing_shapefile_components_are_reported(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'x.zip'
   with zipfile.ZipFile(p,'w') as z:z.writestr('river.shp',b'incomplete')
   r=mod.inspect(p)
   self.assertEqual(r['shapefiles'][0]['error'],'missing .shx or .dbf')
   self.assertFalse(r['publication_approved'])
if __name__=='__main__':unittest.main()
