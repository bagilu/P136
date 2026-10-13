"""Read-only consistency checks for the published preliminary P136 network."""
import json
from pathlib import Path
from hashlib import sha256

ROOT=Path(__file__).resolve().parents[1]/"data"/"published"
def load(name):
    raw=(ROOT/name).read_bytes()
    return json.loads(raw),sha256(raw).hexdigest()
geo,geo_sha=load("tamsui-network.geojson")
manifest,_=load("tamsui-network-manifest.json")
validation,_=load("tamsui-network-validation.json")
index,_=load("tamsui-network-index.json")
area,area_sha=load("tamsui-area-index.json")
area_validation,_=load("tamsui-area-validation.json")
features=geo["features"]
ids=[str(f["properties"]["id"]) for f in features]
idset=set(ids)
assert len(ids)==len(idset)==manifest["feature_count"]==validation["feature_count"]==area["feature_count"]==area_validation["feature_count"]
assert manifest["published_sha256"]==validation["output_sha256"]==geo_sha
assert manifest["validation_status"]=="TOPOLOGY_PASS_BOUNDARY_PRELIMINARY"
assert area["network_sha256"]==geo_sha
assert area["source_sha256"]==manifest["source_sha256"]
assert area_validation["published_sha256"]==area_sha
assert manifest["basin_boundary_verified"] is False
assert area["basin_boundary_verified"] is False
assert set(index["reaches"])==set(area["reaches"])==idset
for f in features:
    props=f["properties"]
    id=str(props["id"])
    dn=props.get("downstream_id")
    assert dn is None or str(dn) in idset,(id,dn)
    assert f["geometry"]["type"]=="LineString"
    assert len(f["geometry"]["coordinates"])>=2
    entry=area["reaches"][id]
    assert entry["local_area_km2"]>=0
    assert entry["upstream_area_km2"]>=0
    assert index["reaches"][id]["length_km"]>=0
    assert set(map(str,index["reaches"][id]["upstream_ids"])).issubset(idset-{id})
print(f"PASS: {len(ids)} preliminary reaches; published SHA-256, indexes, topology links and area records are consistent.")
print("NOTE: Basin boundary and hydrologic accuracy are NOT verified.")
