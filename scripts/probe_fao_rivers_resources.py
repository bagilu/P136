#!/usr/bin/env python3
"""Inspect FAO CKAN resource metadata, without downloading or republishing GIS data."""
import argparse,json,urllib.request
DATASET='e22667af-3977-4e9f-b58b-67fb91b0fa87'
API='https://data.fao.org/catalog/api/3/action/package_show?id='+DATASET
def probe(url=API):
 req=urllib.request.Request(url,headers={'User-Agent':'P136-educational-source-audit/1.0','Accept':'application/json'})
 with urllib.request.urlopen(req,timeout=30) as res:
  if res.status!=200:raise RuntimeError('Unexpected HTTP status')
  raw=res.read(2_000_001)
  if len(raw)>2_000_000:raise RuntimeError('Metadata too large')
 obj=json.loads(raw)
 if not obj.get('success'):raise RuntimeError('CKAN API did not confirm success')
 d=obj['result']
 return {'dataset_id':d.get('id'),'title':d.get('title'),
  'license_id':d.get('license_id'),'license_title':d.get('license_title'),
  'resources':[{'name':r.get('name'),'format':r.get('format'),'mimetype':r.get('mimetype'),
    'url':r.get('url'),'resource_id':r.get('id'),
    'size':r.get('size')} for r in d.get('resources',[])],
  'source_api':url,'vector_bytes_downloaded':False,
  'taiwan_coverage_verified':False,'public_geometry_released':False}
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--output',required=True);v=a.parse_args()
 try:r=probe()
 except Exception as exc:r={'status':'SOURCE_UNAVAILABLE','error_type':type(exc).__name__,
   'error':str(exc)[:400],'source_api':API,'vector_bytes_downloaded':False}
 import pathlib
 pathlib.Path(v.output).parent.mkdir(parents=True,exist_ok=True)
 pathlib.Path(v.output).write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(r,ensure_ascii=False,indent=2))
