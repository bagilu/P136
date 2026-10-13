#!/usr/bin/env python3
"""P136 deterministic geometry-only pipeline. No hydrological topology inferred."""
import argparse, datetime, hashlib, json, pathlib, urllib.request
URL="https://waterwaymap.org/river/%E6%B7%A1%E6%B0%B4%E6%B2%B3%20000132413267/geometry.geojson"
ROOT=pathlib.Path(__file__).resolve().parents[1]
def canon(o):return (json.dumps(o,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
def lines(g):
 if not isinstance(g,dict):return []
 t=g.get('type');c=g.get('coordinates')
 if t=='LineString':return [c]
 if t=='MultiLineString':return c
 if t=='GeometryCollection':return [l for child in g.get('geometries',[]) for l in lines(child)]
 return []
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--input',help='use a locally downloaded immutable source');a=ap.parse_args()
 raw=pathlib.Path(a.input).read_bytes() if a.input else urllib.request.urlopen(urllib.request.Request(URL,headers={'User-Agent':'P136-research/0.004'}),timeout=75).read()
 original=json.loads(raw)
 objects=original.get('features',[]) if original.get('type')=='FeatureCollection' else [original]
 geometries=[]
 for o in objects:
  g=o.get('geometry',{}) if o.get('type')=='Feature' else o
  geometries+=lines(g)
 good=[];invalid=0
 for line in geometries:
  if not isinstance(line,list) or len(line)<2 or any(not isinstance(p,list) or len(p)<2 or not all(isinstance(v,(int,float)) and not isinstance(v,bool) for v in p[:2]) or not (120<=p[0]<=123 and 23<=p[1]<=26) for p in line):
   invalid+=1;continue
  if len({(p[0],p[1]) for p in line})<2:invalid+=1;continue
  good.append([[p[0],p[1]] for p in line])
 if not good or invalid:raise SystemExit(f'VALIDATION FAILED: valid={len(good)} invalid={invalid}; nothing published')
 features=[{'type':'Feature','properties':{'id':f'P136-{i:05d}','name':'淡水河水系（來源圖資）','topology_verified':False},'geometry':{'type':'LineString','coordinates':line}} for i,line in enumerate(good,1)]
 output={'type':'FeatureCollection','features':features}
 rawsha=hashlib.sha256(raw).hexdigest();outbytes=canon(output);outsha=hashlib.sha256(outbytes).hexdigest()
 dest=ROOT/'data'/'published';dest.mkdir(parents=True,exist_ok=True)
 (dest/'tamsui.geojson').write_bytes(outbytes)
 manifest={'schema_version':'P136-0.004','dataset_id':'P136-TAMSUI-OSM','title':'淡水河水系：OSM 衍生幾何資料','source_url':URL,'source_provider':'WaterwayMap.org derived from OpenStreetMap','source_license':'OpenStreetMap ODbL 1.0; attribution required','source_sha256':rawsha,'published_sha256':outsha,'feature_count':len(features),'coordinate_system':'EPSG:4326','topology_verified':False,'flow_direction_verified':False,'processing':'scripts/build_tamsui.py','source_retrieved_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'validation_status':'geometry_pass_topology_unverified'}
 report={'status':'GEOMETRY_PASS_TOPOLOGY_UNVERIFIED','source_sha256':rawsha,'output_sha256':outsha,'input_lines':len(geometries),'published_lines':len(good),'invalid_lines':invalid,'checks':{'parse_geojson':True,'coordinate_bounds':True,'minimum_vertices':True,'unique_geometry_ids':True,'flow_direction':'NOT_TESTED','hydrological_connectivity':'NOT_TESTED','watershed_completeness':'NOT_TESTED'}}
 (dest/'manifest.json').write_bytes(canon(manifest));(dest/'validation-report.json').write_bytes(canon(report))
 print('PUBLISHED',len(good),'lines',outsha)
if __name__=='__main__':main()
