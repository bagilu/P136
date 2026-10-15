#!/usr/bin/env python3
"""Probe whether FAO WMS river layers return nonempty map imagery over Taiwan.

This is an availability probe, NOT a river-identity or vector validation.
"""
import argparse
import hashlib
import json
import pathlib
import struct
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

BASE = "https://data.apps.fao.org/map/gsrv/gsrv1/aquamaps/wms"
LAYERS = ("rivers_asia_37331", "rivers_world_47950", "river_network")
BBOX = (119.2, 21.7, 122.5, 25.5)

def get_map(layer):
    params = {"SERVICE": "WMS", "VERSION": "1.1.1", "REQUEST": "GetMap",
              "LAYERS": layer, "STYLES": "", "SRS": "EPSG:4326",
              "BBOX": ",".join(map(str, BBOX)), "WIDTH": "512", "HEIGHT": "640",
              "FORMAT": "image/png", "TRANSPARENT": "TRUE"}
    url = BASE + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "P136-educational-map-probe/1.0"})
    with urllib.request.urlopen(req, timeout=45) as response:
        body = response.read(4_000_001)
        mime = response.headers.get("Content-Type", "")
    if len(body) > 4_000_000:
        raise ValueError("Response exceeds 4 MB limit")
    if body[:8] != bytes.fromhex("89504e470d0a1a0a"):
        message = body[:200].decode("utf-8", errors="replace")
        raise ValueError("Expected PNG; response: " + message)
    width, height = struct.unpack(">II", body[16:24])
    return {"status": "PNG_RETURNED", "width": width, "height": height,
            "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest(),
            "mime": mime, "nonempty_river_pixels_verified": False,
            "taiwan_river_identity_verified": False}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    results = {}
    for layer in LAYERS:
        try:
            results[layer] = get_map(layer)
        except Exception as exc:
            results[layer] = {"status": "UNAVAILABLE", "error_type": type(exc).__name__,
                              "error": str(exc)[:220]}
    report = {"purpose": "WMS_TAIWAN_IMAGE_AVAILABILITY_ONLY", "bbox_epsg4326": BBOX,
              "service": BASE, "layers": results, "images_published": False,
              "vector_data_obtained": False, "river_geometry_verified": False}
    out = pathlib.Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
