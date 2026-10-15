#!/usr/bin/env python3
"""P136 river system registry builder. No third-party dependencies."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / "data" / "rivers"
PATTERN = re.compile(r"P136-R([0-9]{3})\.geojson")
NODE = re.compile(r"P136-R[0-9]{3}-N[0-9]{4,}")
REACH = re.compile(r"P136-R[0-9]{3}-S[0-9]{4,}")
TRIBUTARY = re.compile(r"P136-R[0-9]{3}-T[0-9]{3,}")
INDEX = FOLDER / "index.json"

def check(path):
    d = json.loads(path.read_text(encoding="utf-8"))
    m = d.get("metadata") or {}
    sid = path.stem
    if d.get("type") != "FeatureCollection" or not isinstance(d.get("features"), list):
        raise ValueError("not a GeoJSON FeatureCollection")
    if m.get("schema_version") != "1.2" or m.get("system_id") != sid:
        raise ValueError("schema_version or system_id mismatch")
    if not isinstance(m.get("name_zh"), str) or not m["name_zh"].strip():
        raise ValueError("missing Chinese river system name")
    info = m.get("river_system") or {}
    branches = info.get("branches")
    if not isinstance(branches, list) or not branches or branches[0].get("id") != "main":
        raise ValueError("missing mainstream")
    nodes, reaches = {}, {}
    for f in d["features"]:
        props, geom = f.get("properties") or {}, f.get("geometry") or {}
        fid, typ = props.get("id"), props.get("feature_type")
        if typ == "node":
            c = geom.get("coordinates")
            if not isinstance(fid, str) or not NODE.fullmatch(fid) or not fid.startswith(sid+"-") or fid in nodes:
                raise ValueError("invalid or duplicate node ID")
            if geom.get("type") != "Point" or not isinstance(c, list) or len(c) != 2 or not all(isinstance(x,(int,float)) and not isinstance(x,bool) for x in c) or not 119<=c[0]<=123 or not 21<=c[1]<=26:
                raise ValueError("invalid node coordinate")
            nodes[fid] = c
        elif typ == "reach":
            if not isinstance(fid, str) or not REACH.fullmatch(fid) or not fid.startswith(sid+"-") or fid in reaches:
                raise ValueError("invalid or duplicate reach ID")
            reaches[fid] = (props, geom)
        else:
            raise ValueError("unexpected feature_type")
    branch_ids = set()
    for b in branches:
        bid = b.get("id")
        if not isinstance(bid,str) or (bid != "main" and (not TRIBUTARY.fullmatch(bid) or not bid.startswith(sid+"-"))) or bid in branch_ids:
            raise ValueError("invalid or duplicate branch ID")
        branch_ids.add(bid)
        ids = b.get("nodeIds")
        if not isinstance(ids,list) or len(ids)<2 or any(n not in nodes for n in ids) or len(ids)!=len(set(ids)):
            raise ValueError("branch has invalid or duplicate nodes")
    by_id = {b["id"]: b for b in branches}
    if len(reaches)!=sum(len(b["nodeIds"])-1 for b in branches):
        raise ValueError("reach count does not match branch topology")
    expected = {(b["id"],a,z) for b in branches for a,z in zip(b["nodeIds"],b["nodeIds"][1:])}
    actual = set()
    for props,geom in reaches.values():
        a,z,branch = props.get("from_node"),props.get("to_node"),props.get("branch_id")
        if a not in nodes or z not in nodes or a==z or branch not in by_id:
            raise ValueError("invalid reach endpoints")
        if geom.get("type")!="LineString" or geom.get("coordinates")!=[nodes[a],nodes[z]]:
            raise ValueError("reach geometry does not match node coordinates")
        actual.add((branch,a,z))
    if actual!=expected:
        raise ValueError("reach connectivity mismatch")
    for b in branches[1:]:
        if b.get("kind")!="tributary" or not b.get("connectedTo"):
            raise ValueError("unconnected tributary")
        target = by_id.get(b.get("connectedToBranch") or "main")
        if not target or b["connectedTo"] not in target["nodeIds"] or b["nodeIds"][-1]!=b["connectedTo"]:
            raise ValueError("invalid tributary junction")
        seen={b["id"]}
        current=b
        while current["id"]!="main":
            nxt=by_id.get(current.get("connectedToBranch") or "main")
            if not nxt or nxt["id"] in seen:
                raise ValueError("cyclic tributary network")
            seen.add(nxt["id"])
            current=nxt
    outlet=info.get("outlet_node_id")
    if outlet not in nodes:
        raise ValueError("missing outlet node")
    if m.get("validation_errors"):
        raise ValueError("exported validation_errors are not empty")
    return {"id":sid,"name_zh":m["name_zh"].strip(),"name_en":m.get("name_en") or "","file":path.name,"status":"published"}

def main():
    FOLDER.mkdir(parents=True,exist_ok=True)
    previous={}
    if INDEX.exists():
        old=json.loads(INDEX.read_text(encoding="utf-8"))
        previous={x["id"]:x for x in old.get("river_systems",[]) if isinstance(x,dict) and isinstance(x.get("id"),str)}
    items=[]
    for path in sorted(FOLDER.glob("*.geojson")):
        if not PATTERN.fullmatch(path.name):
            raise ValueError(f"{path.name}: filename must match P136-Rxxx.geojson")
        try:
            data=json.loads(path.read_text(encoding="utf-8"))
            status=(data.get("metadata") or {}).get("status")
            if status not in ("draft","published"):
                raise ValueError("status must be draft or published")
            if status=="draft":
                print(f"SKIP draft: {path.name}")
                continue
            item=check(path)
            item["sort_order"]=previous.get(item["id"],{}).get("sort_order",int(path.stem[-3:])*10)
            items.append(item)
        except Exception as e:
            raise ValueError(f"{path.name}: {e}") from e
    items.sort(key=lambda x:(x["sort_order"],x["id"]))
    payload={"schema_version":"1.2","river_systems":items}
    INDEX.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Generated {INDEX.relative_to(ROOT)} with {len(items)} published river systems")

if __name__=="__main__":
    try:main()
    except Exception as e:
        print("P136 river registry validation FAILED:",e,file=sys.stderr)
        sys.exit(1)
