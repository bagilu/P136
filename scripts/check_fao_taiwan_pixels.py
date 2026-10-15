#!/usr/bin/env python3
"""Inspect actual nontransparent pixels in FAO Taiwan WMS PNGs.

A positive result confirms painted pixels, not river identity or completeness.
"""
import argparse,io,json,pathlib,urllib.parse,urllib.request
from PIL import Image

BASE="https://data.apps.fao.org/map/gsrv/gsrv1/aquamaps/wms"
LAYERS=("rivers_asia_37331","rivers_world_47950","river_network")
def check(layer):
 params={"SERVICE":"WMS","VERSION":"1.1.1","REQUEST":"GetMap","LAYERS":layer,
 "STYLES":"","SRS":"EPSG:4326","BBOX":"119.2,21.7,122.5,25.5",
 "WIDTH":"512","HEIGHT":"640","FORMAT":"image/png","TRANSPARENT":"TRUE"}
 url=BASE+"?"+urllib.parse.urlencode(params)
 with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"P136/1.0"}),timeout=45) as response:
  raw=response.read(4000001)
 if len(raw)>4000000:raise ValueError("Image too large")
 im=Image.open(io.BytesIO(raw)).convert("RGBA")
 alpha=im.getchannel("A")
 count=sum(n for alpha_value,n in enumerate(alpha.histogram()) if alpha_value>0)
 return {"status":"IMAGE_INSPECTED","painted_pixels":count,
  "total_pixels":im.width*im.height,"nonempty":count>0,
  "river_identity_verified":False,"geometry_published":False}
if __name__=="__main__":
 a=argparse.ArgumentParser();a.add_argument("--output",required=True);v=a.parse_args()
 out={}
 for layer in LAYERS:
  try:out[layer]=check(layer)
  except Exception as exc:out[layer]={"status":"ERROR","error_type":type(exc).__name__,"error":str(exc)[:200]}
 report={"purpose":"TAIWAN_WMS_VISIBLE_PIXEL_CHECK","bbox":[119.2,21.7,122.5,25.5],
 "layers":out,"taiwan_river_identity_verified":False,"publication_approved":False}
 target=pathlib.Path(v.output);target.parent.mkdir(parents=True,exist_ok=True)
 target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
 print(json.dumps(report,ensure_ascii=False,indent=2))
