#!/usr/bin/env python3
"""P136 V0.008 source-field audit: NO catchment polygons or hydrological claims."""
import collections, datetime, hashlib, io, json, pathlib, urllib.request, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
URL="https://data.hydrosheds.org/file/HydroRIVERS/HydroRIVERS_v10_as_shp.zip"
def main():
    import shapefile
    published=json.loads((ROOT/"data/published/tamsui-network.geojson").read_text(encoding="utf-8"))
    manifest=json.loads((ROOT/"data/published/tamsui-network-manifest.json").read_text(encoding="utf-8"))
    ids={int(f["properties"]["id"]) for f in published["features"]}
    if len(ids)!=443 or len(ids)!=manifest["feature_count"]:
        raise ValueError("Published network changed; review audit scope before running")
    req=urllib.request.Request(URL,headers={"User-Agent":"P136-hydrology-field-audit/0.008"})
    with urllib.request.urlopen(req,timeout=240) as response: data=response.read()
    sha=hashlib.sha256(data).hexdigest()
    if sha!=manifest["source_sha256"]:
        raise ValueError("Source ZIP SHA256 differs from published network source; stop for version review")
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        shp=next(n for n in z.namelist() if n.lower().endswith(".shp"))
        prefix=shp[:-4]
        def member(ext):return io.BytesIO(z.read(prefix+ext))
        reader=shapefile.Reader(shp=member(".shp"),shx=member(".shx"),dbf=member(".dbf"))
        fields=[f[0] for f in reader.fields[1:]]
        if "HYRIV_ID" not in fields:raise ValueError("Missing HYRIV_ID")
        area_fields=[x for x in fields if "AREA" in x.upper() or "UPLAND" in x.upper() or "DIST" in x.upper()]
        remaining=set(ids);values=collections.defaultdict(list);missing=collections.Counter()
        for record in reader.iterRecords():
            rid=int(record[fields.index("HYRIV_ID")])
            if rid not in remaining:continue
            remaining.remove(rid)
            for field in area_fields:
                v=record[fields.index(field)]
                try:
                    num=float(v)
                    if num>=0:values[field].append(num)
                    else:missing[field]+=1
                except (TypeError,ValueError):missing[field]+=1
            if not remaining:break
    if remaining:raise ValueError("Missing published IDs in source: "+str(len(remaining)))
    stats={}
    for field in area_fields:
        v=values[field]
        stats[field]={"valid_count":len(v),"missing_or_negative_count":missing[field],"min":min(v) if v else None,"max":max(v) if v else None,"zero_count":sum(x==0 for x in v)}
    result={
      "audit_version":"0.008","status":"SOURCE_FIELDS_AUDITED_NOT_CATCHMENT_VERIFIED",
      "source_url":URL,"source_sha256":sha,"published_reaches_checked":len(ids),
      "source_field_names":fields,"candidate_area_distance_field_stats":stats,
      "hydrological_interpretation_verified":False,"basin_boundary_verified":False,
      "catchment_polygons_available":False,"rainfall_simulation_authorized":False,
      "notes":["Field names and descriptive statistics only; interpretation requires official source documentation.",
               "Do not substitute cumulative upstream area for incremental local catchment area.",
               "No operational flood prediction is authorized by this audit."],
      "audited_utc":datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    path=ROOT/"data/published/tamsui-field-audit.json"
    path.write_text(json.dumps(result,ensure_ascii=False,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print("AUDIT_OK",len(ids),"reaches; fields:",area_fields)
if __name__=="__main__":main()
