#!/usr/bin/env python3
"""Extract explicitly named official river centerlines from a reviewed SHP ZIP.

Requires the analyst to supply exact DBF field/value and CRS. Never guesses.
The output is review-only, not proof of network identity.
"""
import argparse,hashlib,io,json,pathlib,zipfile
import shapefile
from pyproj import CRS,Transformer
from shapely.geometry import shape,mapping
from shapely.ops import transform

def extract(archive,layer,name_field,name_value,source_crs,source_url):
 raw=pathlib.Path(archive).read_bytes()
 if not source_url.startswith('https://'):raise ValueError('HTTPS source URL required')
 with zipfile.ZipFile(io.BytesIO(raw)) as z:
  members={n.lower():n for n in z.namelist()}
  key=layer.lower()
  if not key.endswith('.shp'):key+='.shp'
  if key not in members:raise ValueError('Explicit SHP layer not present')
  stem=key[:-4]
  for ext in ('.shx','.dbf','.prj'):
   if stem+ext not in members:raise ValueError('Missing required '+ext)
  prj=z.read(members[stem+'.prj']).decode('utf-8-sig',errors='replace')
  supplied=CRS.from_user_input(source_crs)
  embedded=CRS.from_wkt(prj)
  if not supplied.equals(embedded,ignore_axis_order=True):
   raise ValueError('Declared CRS does not match archive PRJ')
  with z.open(members[key]) as sf,z.open(members[stem+'.shx']) as xf,z.open(members[stem+'.dbf']) as df:
   reader=shapefile.Reader(shp=sf,shx=xf,dbf=df)
   fields=[f[0] for f in reader.fields[1:]]
   if name_field not in fields:raise ValueError('Exact river-name DBF field absent')
   ix=fields.index(name_field)
   to_wgs=Transformer.from_crs(supplied,'EPSG:4326',always_xy=True).transform
   features=[]
   for rec in reader.iterShapeRecords():
    if str(rec.record[ix]).strip()!=name_value:continue
    geom=shape(rec.shape.__geo_interface__)
    if geom.is_empty or geom.geom_type not in ('LineString','MultiLineString'):
     raise ValueError('Selected official feature is not a river centerline')
    out=transform(to_wgs,geom)
    if not all(-180<=v[0]<=180 and -90<=v[1]<=90 for g in ([out] if out.geom_type=='LineString' else out.geoms) for v in g.coords):
     raise ValueError('Transformed coordinates outside longitude/latitude range')
    features.append({'type':'Feature','geometry':mapping(out),
      'properties':{'official_name':name_value}})
 if not features:raise ValueError('No exact-name matches; do not guess aliases')
 return {'type':'FeatureCollection','features':features}, {
  'status':'EXACT_NAME_EXTRACTION_NOT_IDENTITY_VERIFICATION',
  'archive_sha256':hashlib.sha256(raw).hexdigest(),
  'source_url':source_url,'layer':layer,'name_field':name_field,
  'name_value':name_value,'source_crs':source_crs,
  'matching_features':len(features),'identity_verified':False,
  'redistribution_cleared':False,'publication_approved':False}
if __name__=='__main__':
 a=argparse.ArgumentParser()
 for key in ('archive','layer','name-field','name-value','source-crs','source-url','output','report'):
  a.add_argument('--'+key,required=True)
 v=a.parse_args()
 fc,report=extract(v.archive,v.layer,v.name_field,v.name_value,v.source_crs,v.source_url)
 pathlib.Path(v.output).write_text(json.dumps(fc,ensure_ascii=False)+'\n',encoding='utf-8')
 pathlib.Path(v.report).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(report,ensure_ascii=False,indent=2))
