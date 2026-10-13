#!/usr/bin/env python3
"""P136 V0.005: HydroRIVERS Asia directed river network; conservative topology validation.
No guessed NEXT_DOWN links. Taiwan north-area crop is explicitly not a verified basin boundary.
"""
import collections, datetime, hashlib, io, json, math, pathlib, urllib.request, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
URL='https://data.hydrosheds.org/file/HydroRIVERS/HydroRIVERS_v10_as_shp.zip'
# North Taiwan envelope: only reaches with geometry intersecting envelope.
BBOX=(120.85,24.35,122.10,25.40)
MOUTH=(121.435,25.18)
def encode(o):return (json.dumps(o,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
def intersects(points):return any(BBOX[0]<=p[0]<=BBOX[2] and BBOX[1]<=p[1]<=BBOX[3] for p in points)
def main():
 import shapefile
 request=urllib.request.Request(URL,headers={'User-Agent':'P136-research-hydrography/0.005'})
 with urllib.request.urlopen(request,timeout=240) as response: raw=response.read()
 source_hash=hashlib.sha256(raw).hexdigest()
 with zipfile.ZipFile(io.BytesIO(raw)) as z:
  shp=next(n for n in z.namelist() if n.lower().endswith('.shp'))
  prefix=shp[:-4]
  def member(ext):return io.BytesIO(z.read(prefix+ext))
  reader=shapefile.Reader(shp=member('.shp'),shx=member('.shx'),dbf=member('.dbf'))
  fields=[f[0] for f in reader.fields[1:]]
  reaches={}
  for record in reader.iterShapeRecords():
   props=dict(zip(fields,record.record))
   points=record.shape.points
   if not points or not intersects(points):continue
   rid=int(props['HYRIV_ID']);dn=int(props['NEXT_DOWN'] or 0)
   if rid in reaches:raise ValueError('duplicate HYRIV_ID')
   if len(points)<2:continue
   reaches[rid]={'id':rid,'downstream_id':dn,'main_riv':int(props.get('MAIN_RIV') or 0),'points':[[round(x,6),round(y,6)] for x,y in points]}
 if len(reaches)<20:raise ValueError('too few river reaches in northern Taiwan crop')
 # Candidate outlet: a reach with no NEXT_DOWN in crop, close to Tamsui mouth.
 candidates=[]
 for reach in reaches.values():
  if reach['downstream_id'] in reaches:continue
  d=min(math.hypot(x-MOUTH[0],y-MOUTH[1]) for x,y in (reach['points'][0],reach['points'][-1]))
  candidates.append((d,reach['id']))
 if not candidates:raise ValueError('no basin outlet candidates')
 distance,outlet=min(candidates)
 if distance>0.16:raise ValueError('no plausible Tamsui outlet in selected envelope')
 upstream=collections.defaultdict(list)
 for reach in reaches.values():upstream[reach['downstream_id']].append(reach['id'])
 selected=set();queue=[outlet]
 while queue:
  rid=queue.pop()
  if rid in selected:raise ValueError('cycle detected')
  selected.add(rid);queue.extend(upstream[rid])
 if len(selected)<10:raise ValueError('too few upstream reaches for plausible basin')
 # Reject any cycle, orphan, or ambiguous topology among selected reaches.
 for rid in selected:
  dn=reaches[rid]['downstream_id']
  if rid!=outlet and dn not in selected:raise ValueError('dangling downstream edge')
 if len({reaches[i]['main_riv'] for i in selected})>1:raise ValueError('mixed MAIN_RIV values')
 features=[]
 for rid in sorted(selected):
  reach=reaches[rid]
  features.append({'type':'Feature','properties':{'id':str(rid),'downstream_id':str(reach['downstream_id']) if rid!=outlet else None,'source':'HydroRIVERS v1','topology_verified':True},'geometry':{'type':'LineString','coordinates':reach['points']}})
 output={'type':'FeatureCollection','features':features};data=encode(output)
 dest=ROOT/'data'/'published';dest.mkdir(parents=True,exist_ok=True)
 (dest/'tamsui-network.geojson').write_bytes(data)
 report={'status':'TOPOLOGY_PASS_BOUNDARY_PRELIMINARY','feature_count':len(features),'outlet_reach_id':str(outlet),'outlet_distance_degrees':round(distance,6),'geometry_envelope':BBOX,'cycles':0,'dangling_downstream_links':0,'mixed_main_riv':False,'basin_boundary_verified':False,'field_flow_direction':'HydroRIVERS NEXT_DOWN','output_sha256':hashlib.sha256(data).hexdigest(),'source_sha256':source_hash}
 manifest={'dataset_id':'P136-TAMSUI-HYDRORIVERS-PRELIMINARY','version':'0.005','source_url':URL,'source_provider':'HydroSHEDS HydroRIVERS v1','source_license':'HydroSHEDS terms; review redistribution and attribution','retrieved_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_sha256':source_hash,'published_sha256':report['output_sha256'],'feature_count':len(features),'topology_verified':True,'basin_boundary_verified':False,'validation_status':report['status'],'processing':'scripts/build_tamsui_network.py'}
 (dest/'tamsui-network-manifest.json').write_bytes(encode(manifest))
 (dest/'tamsui-network-validation.json').write_bytes(encode(report))
 print('PRELIMINARY',len(features),'reaches, outlet',outlet,'distance',distance)
if __name__=='__main__':main()
