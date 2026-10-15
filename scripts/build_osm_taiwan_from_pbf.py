#!/usr/bin/env python3
"""Build educational Taiwan river lines from the Geofabrik OSM Taiwan extract.

OSM contributors ODbL. Named river ways are selectable, outlet dots approximate.
No inference of named tributary-to-basin membership.
"""
import argparse,collections,json,pathlib,urllib.request
import osmium
URL="https://download.geofabrik.de/asia/taiwan-latest.osm.pbf"
OUTLETS={
"淡水河":[121.42,25.18],"蘭陽溪":[121.83,24.73],"花蓮溪":[121.61,23.93],
"南澳溪":[121.81,24.47],"秀姑巒溪":[121.49,23.47],"卑南溪":[121.16,22.75],
"頭前溪":[120.94,24.85],"大甲溪":[120.55,24.33],"烏溪":[120.49,24.21],
"濁水溪":[120.28,23.82],"曾文溪":[120.07,23.05],"高屏溪":[120.44,22.48],
"和平溪":[121.76,24.30],"立霧溪":[121.65,24.17],"二仁溪":[120.18,22.91]}
class Rivers(osmium.SimpleHandler):
 def __init__(self):
  super().__init__();self.features=[];self.counts=collections.Counter()
 def way(self,w):
  if w.tags.get("waterway")!="river":return
  name=w.tags.get("name","").strip()
  if not name:return
  try:coords=[[round(n.lon,6),round(n.lat,6)] for n in w.nodes]
  except osmium.InvalidLocationError:return
  if len(coords)<2 or not all(119<=x<=123 and 21<=y<=26 for x,y in coords):return
  river="烏溪" if name=="大肚溪" else name
  main=river in OUTLETS
  self.features.append({"type":"Feature","properties":{"id":"osm-way-"+str(w.id),"name":name,
   "major_river":river if main else None,
   "classification":"main_name" if main else "named_tributary_or_other_river",
   "osm_way_id":w.id,"source":"OpenStreetMap contributors","geographic_identity_verified":False},
   "geometry":{"type":"LineString","coordinates":coords}})
  self.counts["major" if main else "other_named"]+=1
def main():
 a=argparse.ArgumentParser();a.add_argument("--output",required=True);a.add_argument("--pbf",default="/tmp/p136-taiwan.osm.pbf");v=a.parse_args()
 pbf=pathlib.Path(v.pbf)
 if not pbf.exists():
  request=urllib.request.Request(URL,headers={"User-Agent":"P136-Educational-River-Builder/1.0"})
  with urllib.request.urlopen(request,timeout=120) as response,pbf.open("wb") as output:
   total=0
   while True:
    chunk=response.read(1024*1024)
    if not chunk:break
    total+=len(chunk)
    if total>350_000_000:raise ValueError("OSM extract exceeds 350MB limit")
    output.write(chunk)
 rivers=Rivers();rivers.apply_file(str(pbf),locations=True)
 if not rivers.features:raise ValueError("No named river ways found")
 rivers.features.sort(key=lambda x:x["properties"]["osm_way_id"])
 obj={"type":"FeatureCollection","metadata":{"source":"OpenStreetMap contributors (ODbL)",
 "source_extract":URL,"status":"EDUCATIONAL_PREVIEW","outlets":"approximate_reference_not_surveyed",
 "tributary_association_verified":False,"total_ways":len(rivers.features),
 "major_named_ways":rivers.counts["major"],"other_named_river_ways":rivers.counts["other_named"],
 "outlet_reference_points":OUTLETS},"features":rivers.features}
 path=pathlib.Path(v.output);path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(obj,ensure_ascii=False,separators=(",",":"))+"\n")
 print(json.dumps({"total":len(rivers.features),"major":rivers.counts["major"],"other":rivers.counts["other_named"]}))
if __name__=="__main__":main()
