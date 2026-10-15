import importlib.util,json,pathlib,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('readiness',ROOT/'scripts/build_educational_readiness.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ReadinessTest(unittest.TestCase):
 def test_unpublished_candidate_is_counted_but_never_approved(self):
  with tempfile.TemporaryDirectory() as d:
   root=pathlib.Path(d);(root/'data').mkdir()
   (root/'data'/'catalog.json').write_text(json.dumps({'rivers':[{
    'river_id':'P136-R-DAJIA','name_zh':'大甲溪','network_geojson':None}]}))
   (root/'data'/'candidate.geojson').write_text('{}')
   report=m.report(root/'data'/'catalog.json',root,
      {'P136-R-DAJIA':'data/candidate.geojson'})
   self.assertEqual(report['local_candidate_count'],1)
   self.assertEqual(report['rivers'][0]['candidate_source'],'supplemental_review_artifact')
   self.assertFalse(report['rivers'][0]['release_approved'])
   self.assertFalse(report['candidate_geometry_released_by_this_report'])
if __name__=='__main__':unittest.main()
