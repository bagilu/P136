#!/usr/bin/env python3
"""Build a Taiwan educational named-river preview from OpenStreetMap Overpass.

Source OSM ODbL; output contains source tags and no HydroRIVERS geometry.
Every OSM way is an independently clickable reach; tributary topology is NOT inferred.
"""
import argparse,json,pathlib,urllib.parse,urllib.request,collections,time
NAMES=["淡水河","蘭陽溪","花蓮溪","南澳溪","秀姑巒溪","卑南溪","頭前溪","大甲溪","烏溪","大肚溪","濁水溪","曾文溪","高屏溪","和平溪","立霧溪","二仁溪"]
# Approximate geographic reference positions only, not surveyed river mouths.
OUTLETS={
"淡水河":[121.42,25.18],"蘭陽溪":[121.83,24.73],"花蓮溪":[121.61,23.93],
"南澳溪":[121.81,24.47],"秀姑巒溪":[121.49,23.47],"卑南溪":[121.16,22.75],
"頭前溪":[120.94,24.85],"大甲溪":[120.55,24.33],"烏溪":[120.49,24.21],
"濁水溪":[120.28,23.82],"曾文溪":[120.07,23.05],"高屏溪":[120.44,22.48],
"和平溪":[121.76,24.30],"立霧溪":[121.65,24.17],"二仁溪":[120.18,22.91]}
ALIASES={"大肚溪":"烏溪"}
OVERPASS=["https://overpass.kumi.systems/api/interpreter","https://overpass.nchc.org.tw/api/interpreter","https://overpass-api.de/api/interpreter"]
def download():
 # All named river ways in Taiwan bbox; preserve main stems and tributaries.
 q='[out:json][timeout:180];way["waterway"="river"]["name"](21.8,119.2,25.5,122.2);out geom;'
 payload=urllib.parse.urlencode({"data":q}).encode()
 last=None
 for endpoint in OVERPASS:
  try:
   req=urllib.request.Request(endpoint,data=payload,headers={"User-Agent":"P136-Taiwan-Educational-River-Preview/1.0 (OSM ODbL)"})
   with urllib.request.urlopen(req,timeout=210) as res:
    raw=res.read(40_000_001)
   if len(raw)>40_000_000:raise ValueError("Overpass payload exceeds limit")
   return json.loads(raw),endpoint
  except Exception as exc:last=exc;time.sleep(3)
 raise RuntimeError("All Overpass endpoints failed: "+str(last))
def build(obj):
 features=[];counts=collections.Counter()
 for e in obj.get("elements",[]):
  if e.get("type")!="way":continue
  tags=e.get("tags") or {};name=tags.get("name","").strip()
  points=e.get("geometry") or []
  if not name or len(points)<2:continue
  coords=[[round(p["lon"],6),round(p["lat"],6)] for p in points]
  if not all(119<=x<=123 and 21<=y<=26 for x,y in coords):continue
  river=ALIASES.get(name,name)
  is_major=river in OUTLETS
  # Preserve named tributaries as their own reaches, not invented basin memberships.
  feature={"type":"Feature","properties":{"id":"osm-way-"+str(e["id"]),"name":name,
    "major_river":river if is_major else None,"classification":"main_name" if is_major else "named_tributary_or_other_river",
    "osm_way_id":e["id"],"source":"OpenStreetMap contributors","geographic_identity_verified":False},
   "geometry":{"type":"LineString","coordinates":coords}}
  features.append(feature);counts["major" if is_major else "other_named"]+=1
 if not features:raise ValueError("No named river ways retrieved")
 features.sort(key=lambda x:x["properties"]["osm_way_id"])
 return {"type":"FeatureCollection","metadata":{"source":"OpenStreetMap contributors (ODbL)",
  "status":"EDUCATIONAL_PREVIEW","outlets":"approximate_reference_not_surveyed",
  "tributary_association_verified":False,"total_ways":len(features),
  "major_named_ways":counts["major"],"other_named_river_ways":counts["other_named"],
  "outlet_reference_points":OUTLETS},"features":features}
if __name__=="__main__":
 a=argparse.ArgumentParser();a.add_argument("--output",required=True);v=a.parse_args()
 obj,endpoint=download();out=build(obj)
 path=pathlib.Path(v.output);path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(out,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
 print(json.dumps({"endpoint":endpoint,"total":out["metadata"]["total_ways"],
 "major":out["metadata"]["major_named_ways"],"other_named":out["metadata"]["other_named_river_ways"]}))
