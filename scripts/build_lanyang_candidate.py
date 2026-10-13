#!/usr/bin/env python3
"""P136 V0.018: independently build a *candidate* Lanyang HydroRIVERS network.
Never publish it as a verified watershed; require human approval before catalog activation.
"""
import collections,datetime,hashlib,io,json,math,pathlib,urllib.request,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
URL="https://data.hydrosheds.org/file/HydroRIVERS/HydroRIVERS_v10_as_shp.zip"
BBOX=(121.25,24.25,122.15,25.15) # broad eastern Taiwan screening envelope, not basin polygon
MOUTH=(121.83,24.72) # approximate search seed, NOT a surveyed mouth
def encode(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))+"\n").encode()
def length_km(points):
 result=0
 for (x,y),(a,b) in zip(points,points[1:]):
  lat1,lat2=math.radians(y),math.radians(b)
  h=math.sin((lat2-lat1)/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin(math.radians(a-x)/2)**2
  result+=6371*2*math.asin(min(1,math.sqrt(h)))
 return result
def main():
 import shapefile
 req=urllib.request.Request(URL,headers={"User-Agent":"P136-river-candidate-research/0.018"})
 with urllib.request.urlopen(req,timeout=240) as response:raw=response.read()
 source_sha=hashlib.sha256(raw).hexdigest()
 with zipfile.ZipFile(io.BytesIO(raw)) as z:
  shp=next(n for n in z.namelist() if n.lower().endswith(".shp"));prefix=shp[:-4]
  reader=shapefile.Reader(shp=io.BytesIO(z.read(shp)),shx=io.BytesIO(z.read(prefix+".shx")),dbf=io.BytesIO(z.read(prefix+".dbf")))
  fields=[f[0] for f in reader.fields[1:]]
  reaches={}
  for sr in reader.iterShapeRecords():
   points=sr.shape.points
   if len(points)<2 or not any(BBOX[0]<=x<=BBOX[2] and BBOX[1]<=y<=BBOX[3] for x,y in points):continue
   p=dict(zip(fields,sr.record));rid=int(p["HYRIV_ID"]);dn=int(p["NEXT_DOWN"] or 0)
   if rid in reaches:raise ValueError("Duplicate reach")
   reaches[rid]={"dn":dn,"main":int(p.get("MAIN_RIV") or 0),"points":[[round(x,6),round(y,6)] for x,y in points],"local":float(p.get("CATCH_SKM") or 0),"upstream":float(p.get("UPLAND_SKM") or 0)}
 upstream=collections.defaultdict(list)
 for rid,r in reaches.items():
  if r["dn"] in reaches:upstream[r["dn"]].append(rid)
 def trace(root):
  seen=set();stack=[root]
  while stack:
   rid=stack.pop()
   if rid in seen:raise ValueError("Cycle detected")
   seen.add(rid);stack.extend(upstream[rid])
  return seen
 candidates=[]
 for rid,r in reaches.items():
  if r["dn"] in reaches:continue
  distance=min(math.hypot(x-MOUTH[0],y-MOUTH[1]) for x,y in [r["points"][0],r["points"][-1]])
  if distance<=0.12:
   members=trace(rid)
   candidates.append((len(members),distance,rid,members))
 candidates.sort(key=lambda c:(-c[0],c[1],c[2]))
 print("Candidate outlet ranking:",[(c[2],c[0],round(c[1],5)) for c in candidates[:12]],flush=True)
 qualified=[c for c in candidates if c[0]>=10]
 if not qualified:raise ValueError("No sufficiently connected candidate outlet")
 best=qualified[0]
 if len(qualified)>1 and qualified[1][0]>=best[0]*0.8:raise ValueError("Ambiguous candidate outlets; manual review required")
 _,distance,outlet,members=best
 if len({reaches[r]["main"] for r in members})>1:raise ValueError("Mixed main river identifiers")
 features=[];index={};area={}
 for rid in sorted(members):
  r=reaches[rid];dn=r["dn"] if rid!=outlet else None
  if rid!=outlet and dn not in members:raise ValueError("Dangling downstream reach")
  if not all(math.isfinite(v) and v>=0 for v in (r["local"],r["upstream"])):raise ValueError("Invalid source area")
  features.append({"type":"Feature","properties":{"id":str(rid),"downstream_id":str(dn) if dn is not None else None,"source":"HydroRIVERS v1","topology_verified":True},"geometry":{"type":"LineString","coordinates":r["points"]}})
  area[str(rid)]={"local_area_km2":r["local"],"upstream_area_km2":r["upstream"],"quality_status":"SOURCE_PRELIMINARY"}
 for rid in sorted(members):
  upstream_ids=sorted(trace(rid)-{rid})
  index[str(rid)]={"upstream_ids":[str(x) for x in upstream_ids],"length_km":round(length_km(reaches[rid]["points"]),6)}
 output={"type":"FeatureCollection","features":features}
 rawgeo=encode(output);sha=hashlib.sha256(rawgeo).hexdigest()
 areaobj={"feature_count":len(features),"basin_boundary_verified":False,"network_sha256":sha,"source_sha256":source_sha,"reaches":area}
 rawarea=encode(areaobj);areasha=hashlib.sha256(rawarea).hexdigest()
 report={"status":"TOPOLOGY_PASS_BOUNDARY_PRELIMINARY","feature_count":len(features),"outlet_reach_id":str(outlet),"outlet_distance_degrees":round(distance,6),"candidate_outlets_evaluated":len(candidates),"selection_method":"largest connected candidate near approximate mouth; manual identity verification pending","cycles":0,"dangling_downstream_links":0,"basin_boundary_verified":False,"output_sha256":sha,"source_sha256":source_sha}
 manifest={"dataset_id":"P136-LANYANG-HYDRORIVERS-PRELIMINARY","version":"0.018","source_url":URL,"source_provider":"HydroSHEDS HydroRIVERS v1","source_license":"HydroSHEDS terms; review redistribution and attribution","retrieved_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"source_sha256":source_sha,"published_sha256":sha,"feature_count":len(features),"topology_verified":True,"basin_boundary_verified":False,"validation_status":report["status"],"processing":"scripts/build_lanyang_candidate.py"}
 areaval={"status":"AREA_SOURCE_EXTRACTED_BOUNDARY_UNVERIFIED","feature_count":len(features),"published_sha256":areasha,"source_sha256":source_sha,"basin_boundary_verified":False,"rainfall_simulation_authorized":False}
 folder=ROOT/"data"/"candidates"/"lanyang";folder.mkdir(parents=True,exist_ok=True)
 for name,value in [("network.geojson",output),("network-manifest.json",manifest),("network-validation.json",report),("network-index.json",{"source_feature_count":len(features),"boundary_verified":False,"reaches":index}),("area-index.json",areaobj),("area-validation.json",areaval)]:
  (folder/name).write_bytes(encode(value))
 print("Candidate files generated:",len(features),"reaches; manual review REQUIRED before publication.")
if __name__=="__main__":main()
