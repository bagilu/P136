#!/usr/bin/env python3
"""Inspect FAO AQUASTAT WMS GetCapabilities metadata, never publish geometry."""
import argparse
import json
import pathlib
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

BASE = "https://data.apps.fao.org/map/gsrv/gsrv1/aquamaps/wms"

def local_tag(element):
    return element.tag.split("}")[-1]

def parse_capabilities(payload):
    root = ET.fromstring(payload)
    names = []
    for layer in root.iter():
        if local_tag(layer) != "Layer":
            continue
        direct = {local_tag(c): (c.text or "").strip() for c in layer}
        if direct.get("Name"):
            names.append({"name": direct["Name"], "title": direct.get("Title", "")})
    matched = [x for x in names if any(t in (x["name"] + " " + x["title"]).lower()
               for t in ("river", "hydro", "aquamap", "aquastat"))]
    return {"layer_count": len(names), "matching_layers": matched[:100],
            "matching_layer_count": len(matched), "taiwan_coverage_verified": False,
            "vector_download_verified": False, "geometry_published": False}

def run():
    query = urllib.parse.urlencode({"SERVICE": "WMS", "REQUEST": "GetCapabilities", "VERSION": "1.3.0"})
    request = urllib.request.Request(BASE + "?" + query, headers={"User-Agent": "P136-Research/1.0"})
    with urllib.request.urlopen(request, timeout=35) as response:
        payload = response.read(5_000_001)
    if len(payload) > 5_000_000:
        raise ValueError("WMS capabilities exceeds size limit")
    return parse_capabilities(payload)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    try:
        result = run()
    except Exception as exc:
        result = {"status": "SOURCE_UNAVAILABLE", "error_type": type(exc).__name__,
                  "error": str(exc)[:300], "taiwan_coverage_verified": False,
                  "vector_download_verified": False, "geometry_published": False}
    result["service_url"] = BASE
    pathlib.Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    pathlib.Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
