#!/usr/bin/env python3
"""Run independent centerline extraction and diagnostic overlay in a private workspace.

Fail closed: official ZIP and candidate must be supplied explicitly. Never fetches,
commits or publishes derived geometry. Audit and comparison remain separate gates.
"""
import argparse,json,pathlib,tempfile
from audit_official_vector_archive import inspect
from extract_official_centerlines import extract
from compare_official_river_lines import review

def run(args):
 audit=inspect(args.archive)
 if any('error' in item for item in audit['shapefiles']):
  raise ValueError('Official archive has missing or invalid SHP components')
 fc,metadata=extract(args.archive,args.layer,args.name_field,args.name_value,
                     args.source_crs,args.source_url)
 out=pathlib.Path(args.output_dir)
 out.mkdir(parents=True,exist_ok=True)
 # Review-only derived data are intentionally local and must never be committed.
 with tempfile.TemporaryDirectory() as tmp:
  official=pathlib.Path(tmp)/'official.geojson'
  official.write_text(json.dumps(fc,ensure_ascii=False),encoding='utf-8')
  result=review(args.candidate,official,args.name_value,args.source_url)
 result['official_archive_sha256']=audit['archive_sha256']
 result['official_selection']=metadata
 result['official_geojson_temporary_only']=True
 result['publication_approved']=False
 (out/'official-archive-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
 (out/'official-selection.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
 (out/'diagnostic-overlay.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:v for k,v in result.items() if k!='reaches'},ensure_ascii=False,indent=2))
 return result
if __name__=='__main__':
 a=argparse.ArgumentParser()
 for key in ('archive','layer','name-field','name-value','source-crs','source-url','candidate','output-dir'):
  a.add_argument('--'+key,required=True)
 run(a.parse_args())
