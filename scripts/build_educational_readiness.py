#!/usr/bin/env python3
"""Produce a public-safe *metadata-only* teaching readiness report.

Never exports source coordinates, centerlines, or a publication approval.
"""
import argparse,json,pathlib
def report(catalog,root,extra_candidates=None):
 data=json.loads(pathlib.Path(catalog).read_text(encoding='utf-8'))
 extra_candidates=extra_candidates or {}
 rivers=[]
 for r in data['rivers']:
  path=r.get('network_geojson')
  local=pathlib.Path(root)/path if path else None
  exists=bool(local and local.is_file())
  supplemental=extra_candidates.get(r['river_id'])
  extra_exists=bool(supplemental and (pathlib.Path(root)/supplemental).is_file())
  exists=exists or extra_exists
  rivers.append({'river_id':r['river_id'],'name_zh':r['name_zh'],
    'has_local_candidate_geometry':exists,
    'candidate_source':'supplemental_review_artifact' if extra_exists else ('catalog' if exists else None),
    'registered':True,'candidate_reaches':r.get('feature_count'),
    'geographic_identity_verified':bool(r.get('geographic_identity_verified')),
    'basin_boundary_verified':bool(r.get('boundary_verified')),
    'release_approved':False,
    'source_rights_review_required':True})
 return {'purpose':'EDUCATIONAL_PREVIEW_READINESS_METADATA_ONLY',
  'river_count':len(rivers),'local_candidate_count':sum(x['has_local_candidate_geometry'] for x in rivers),
  'not_official_basin_boundaries':True,
  'candidate_geometry_released_by_this_report':False,'rivers':rivers}
if __name__=='__main__':
 a=argparse.ArgumentParser()
 a.add_argument('--catalog',default='data/catalog/rivers.json')
 a.add_argument('--root',default='.')
 a.add_argument('--output',required=True)
 a.add_argument('--extra-candidate',action='append',default=[],help='RIVER_ID=relative/path/to/network.geojson')
 v=a.parse_args()
 extras={}
 for item in v.extra_candidate:
  if '=' not in item: a.error('Expected RIVER_ID=path')
  river_id,filepath=item.split('=',1)
  if not river_id or not filepath or river_id in extras: a.error('Invalid or duplicate extra candidate')
  extras[river_id]=filepath
 result=report(v.catalog,v.root,extras)
 pathlib.Path(v.output).parent.mkdir(parents=True,exist_ok=True)
 pathlib.Path(v.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({k:x for k,x in result.items() if k!='rivers'},ensure_ascii=False,indent=2))
