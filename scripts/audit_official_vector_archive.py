#!/usr/bin/env python3
"""P136 fail-closed inspection of an independently sourced official vector ZIP.

Never auto-select a river by guessing field names. Produces evidence only;
no candidate geometry is published or marked verified.
"""
import argparse,hashlib,io,json,pathlib,zipfile
import shapefile

def inspect(path):
 raw=pathlib.Path(path).read_bytes()
 if not zipfile.is_zipfile(io.BytesIO(raw)):
  raise ValueError('Expected ZIP archive with shapefile components')
 reports=[]
 with zipfile.ZipFile(io.BytesIO(raw)) as z:
  names=z.namelist()
  if len(names)>2000:raise ValueError('Archive has too many members')
  for name in names:
   if not name.lower().endswith('.shp'):continue
   stem=name[:-4]
   index={n.lower():n for n in names}
   shx=index.get((stem+'.shx').lower())
   dbf=index.get((stem+'.dbf').lower())
   prj=index.get((stem+'.prj').lower())
   if not shx or not dbf:
    reports.append({'shp':name,'error':'missing .shx or .dbf'})
    continue
   with z.open(name) as sf,z.open(shx) as xf,z.open(dbf) as df:
    reader=shapefile.Reader(shp=sf,shx=xf,dbf=df)
    reports.append({'shp':name,'geometry_type':reader.shapeTypeName,
      'record_count':len(reader),'fields':[f[0] for f in reader.fields[1:]],
      'projection_wkt':z.read(prj).decode('utf-8','replace')[:3000] if prj else None,
      'projection_confirmed':False,
      'dajia_identity_confirmed':False})
 if not reports:raise ValueError('No SHP files found in ZIP')
 return {'status':'INVENTORY_ONLY','archive_sha256':hashlib.sha256(raw).hexdigest(),
  'archive_bytes':len(raw),'shapefiles':reports,
  'independent_identity_verified':False,'license_cleared':False,'publication_approved':False}

if __name__=='__main__':
 a=argparse.ArgumentParser()
 a.add_argument('--archive',required=True)
 a.add_argument('--source-url',required=True)
 a.add_argument('--output',required=True)
 v=a.parse_args()
 if not v.source_url.startswith('https://'):a.error('HTTPS official source URL required')
 report=inspect(v.archive)
 report['declared_source_url']=v.source_url
 pathlib.Path(v.output).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(report,ensure_ascii=False,indent=2))
