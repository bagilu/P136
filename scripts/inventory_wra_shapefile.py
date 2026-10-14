#!/usr/bin/env python3
"""Inventory Taiwan WRA official SHP download without treating it as verified linework."""
import argparse,hashlib,io,json,pathlib,urllib.request,zipfile
import shapefile
SOURCES={
 'RIVERLIN':'https://gic.wra.gov.tw/gis/gic/API/Google/DownLoad.aspx?fname=RIVERLIN&filetype=SHP',
 'RIVERPOLY':'https://gic.wra.gov.tw/gis/gic/API/Google/DownLoad.aspx?fname=RIVERPOLY&filetype=SHP',
 'BASIN':'https://gic.wra.gov.tw/gis/gic/API/Google/DownLoad.aspx?fname=BASIN&filetype=SHP'
}
def inventory(layer,max_bytes=120_000_000):
 url=SOURCES[layer]
 req=urllib.request.Request(url,headers={'User-Agent':'P136-research-GIS-inventory/1.0'})
 with urllib.request.urlopen(req,timeout=90) as resp:
  raw=resp.read(max_bytes+1)
 if len(raw)>max_bytes:raise ValueError('Source exceeded safe download limit')
 if not zipfile.is_zipfile(io.BytesIO(raw)):raise ValueError('Expected official ZIP SHP; response not a ZIP')
 with zipfile.ZipFile(io.BytesIO(raw)) as z:
  members=[x for x in z.namelist() if not x.startswith('__MACOSX/') and not x.endswith('/')]
  shp=[x for x in members if x.lower().endswith('.shp')]
  if len(shp)!=1:raise ValueError(f'Expected one shapefile, found {len(shp)}')
  stem=shp[0][:-4]
  names={x.lower():x for x in members}
  dbf=names.get((stem+'.dbf').lower());shx=names.get((stem+'.shx').lower());prj=names.get((stem+'.prj').lower())
  if not dbf or not shx:raise ValueError('Missing required DBF or SHX')
  with z.open(shp[0]) as sf,z.open(shx) as xf,z.open(dbf) as df:
   reader=shapefile.Reader(shp=sf,shx=xf,dbf=df)
   fields=[f[0] for f in reader.fields[1:]]
   count=len(reader);shape_type=reader.shapeTypeName
  projection=z.read(prj).decode('utf-8',errors='replace')[:2000] if prj else None
 return {'status':'INVENTORY_ONLY_NOT_GEOMETRY_VALIDATION','layer':layer,'source_url':url,
  'archive_sha256':hashlib.sha256(raw).hexdigest(),'archive_bytes':len(raw),
  'shapefile':shp[0],'shape_type':shape_type,'record_count':count,
  'attribute_fields':fields,'projection_wkt':projection,
  'projection_must_be_verified_before_overlay':True,
  'official_dajia_features_identified':False,'identity_verified':False,
  'publication_approved':False}
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--layer',choices=SOURCES,default='RIVERLIN')
 a.add_argument('--output',required=True);v=a.parse_args()
 result=inventory(v.layer)
 pathlib.Path(v.output).parent.mkdir(parents=True,exist_ok=True)
 pathlib.Path(v.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(result,ensure_ascii=False,indent=2))
