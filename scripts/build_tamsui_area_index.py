#!/usr/bin/env python3
"""P136 V0.008: extract local/cumulative HydroRIVERS areas; validate topology.
The resulting estimates are SOURCE-PRELIMINARY, not independently verified basin polygons.
"""
import collections,datetime,hashlib,io,json,math,pathlib,urllib.request,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
PUB=ROOT/"data"/"published"
URL="https://data.hydrosheds.org/file/HydroRIVERS/HydroRIVERS_v10_as_shp.zip"
def encode(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(",",":"))+"\n").encode()
def main():
 import shapefile
 network=json.loads((PUB/"tamsui-network.geojson").read_text())
 manifest=json.loads((PUB/"tamsui-network-manifest.json").read_text())
 audit=json.loads((PUB/"tamsui-field-audit.json").read_text())
 ids={str(f["properties"]["id"]) for f in network["features"]}
 if len(ids)!=443 or manifest["feature_count"]!=len(ids) or audit["status"]!="SOURCE_FIELDS_AUDITED_NOT_CATCHMENT_VERIFIED":raise ValueError("source network or audit has changed")
 req=urllib.request.Request(URL,headers={"User-Agent":"P136-hydrology-area-extract/0.008"})
 with urllib.request.urlopen(req,timeout=240) as response:raw=response.read()
 sha=hashlib.sha256(raw).hexdigest()
 if sha!=manifest["source_sha256"] or sha!=audit["source_sha256"]:raise ValueError("source hash mismatch")
 with zipfile.ZipFile(io.BytesIO(raw)) as z:
  shp=next(n for n in z.namelist() if n.lower().endswith(".shp"));prefix=shp[:-4]
  def member(ext):return io.BytesIO(z.read(prefix+ext))
  reader=shapefile.Reader(shp=member(".shp"),shx=member(".shx"),dbf=member(".dbf"))
  fields=[f[0] for f in reader.fields[1:]]
  for field in ("HYRIV_ID","CATCH_SKM","UPLAND_SKM","NEXT_DOWN"): 
   if field not in fields:raise ValueError("missing "+field)
  ix={name:fields.index(name) for name in ("HYRIV_ID","CATCH_SKM","UPLAND_SKM","NEXT_DOWN")}
  areas={}
  for record in reader.iterRecords():
   rid=str(record[ix["HYRIV_ID"]])
   if rid not in ids:continue
   if rid in areas:raise ValueError("duplicate "+rid)
   local=float(record[ix["CATCH_SKM"]]);cumulative=float(record[ix["UPLAND_SKM"]])
   if not all(map(math.isfinite,(local,cumulative))) or local<=0 or cumulative<=0:raise ValueError("nonpositive/invalid area "+rid)
   areas[rid]={"local_area_km2":local,"upstream_area_km2":cumulative,"source_next_down":str(record[ix["NEXT_DOWN"]])}
   if len(areas)==len(ids):break
 if set(areas)!=ids:raise ValueError("missing source records")
 downstream={str(f["properties"]["id"]):f["properties"]["downstream_id"] for f in network["features"]}
 for rid,dn in downstream.items():
  if dn is not None and areas[rid]["source_next_down"]!=str(dn):raise ValueError("topology changed "+rid)
 children=collections.defaultdict(list)
 for rid,dn in downstream.items():
  if dn is not None:children[str(dn)].append(rid)
 memo={}
 def total(rid,stack):
  if rid in memo:return memo[rid]
  if rid in stack:raise ValueError("cycle")
  val=areas[rid]["local_area_km2"]+sum(total(x,stack|{rid}) for x in children[rid])
  memo[rid]=val
  return val
 for rid in ids:total(rid,set())
 differences=[{"reach_id":rid,"source_upstream_area_km2":areas[rid]["upstream_area_km2"],"sum_local_area_km2":round(memo[rid],3),"difference_km2":round(memo[rid]-areas[rid]["upstream_area_km2"],3)} for rid in sorted(ids)]
 absolute=[abs(x["difference_km2"]) for x in differences]
 outlet=[rid for rid,dn in downstream.items() if dn is None]
 if len(outlet)!=1:raise ValueError("expected exactly one outlet")
 result={"dataset_id":"P136-TAMSUI-AREAS-SOURCE-PRELIMINARY","source_sha256":sha,"network_sha256":manifest["published_sha256"],"feature_count":len(ids),"units":"km2","basin_boundary_verified":False,"hydrological_interpretation_verified":False,"source":"HydroRIVERS v1 DBF CATCH_SKM and UPLAND_SKM","reaches":{rid:{"local_area_km2":areas[rid]["local_area_km2"],"upstream_area_km2":areas[rid]["upstream_area_km2"],"quality_status":"SOURCE_PRELIMINARY"} for rid in sorted(ids)}}
 data=encode(result);(PUB/"tamsui-area-index.json").write_bytes(data)
 report={"status":"AREA_SOURCE_EXTRACTED_BOUNDARY_UNVERIFIED","feature_count":len(ids),"outlet_id":outlet[0],"outlet_source_upstream_area_km2":areas[outlet[0]]["upstream_area_km2"],"outlet_sum_local_area_km2":round(memo[outlet[0]],3),"maximum_absolute_difference_km2":max(absolute),"mean_absolute_difference_km2":round(sum(absolute)/len(absolute),3),"differences_over_1_km2":sum(x>1 for x in absolute),"basin_boundary_verified":False,"rainfall_simulation_authorized":False,"source_sha256":sha,"published_sha256":hashlib.sha256(data).hexdigest(),"generated_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"warning":"Summed local catchments and cumulative areas can differ due to river-network extraction and source topology; no claim of full basin coverage."}
 (PUB/"tamsui-area-validation.json").write_bytes(encode(report))
 print("AREA_SOURCE_EXTRACTED",len(ids),"outlet",outlet[0],"max_difference",max(absolute))
if __name__=="__main__":main()
