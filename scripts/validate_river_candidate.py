#!/usr/bin/env python3
"""P136: independent consistency checks for review-only HydroRIVERS candidate artifacts."""
import argparse,hashlib,json,math,pathlib
def load(p):return json.loads(p.read_bytes())
def check(folder):
 folder=pathlib.Path(folder)
 geo=load(folder/'network.geojson');idx=load(folder/'network-index.json')
 area=load(folder/'area-index.json');m=load(folder/'network-manifest.json')
 v=load(folder/'network-validation.json');av=load(folder/'area-validation.json')
 raw=(folder/'network.geojson').read_bytes()
 rawarea=(folder/'area-index.json').read_bytes()
 sha=hashlib.sha256(raw).hexdigest();areasha=hashlib.sha256(rawarea).hexdigest()
 assert sha==m['published_sha256']==v['output_sha256']==area['network_sha256']
 assert areasha==av['published_sha256']
 assert m['source_sha256']==v['source_sha256']==area['source_sha256']==av['source_sha256']
 assert m['validation_status']=='TOPOLOGY_PASS_BOUNDARY_PRELIMINARY'
 assert m['basin_boundary_verified'] is False and av['basin_boundary_verified'] is False
 assert av['rainfall_simulation_authorized'] is False
 features=geo['features'];byid={str(f['properties']['id']):f for f in features}
 assert len(byid)==len(features)==m['feature_count']==v['feature_count']==idx['source_feature_count']==area['feature_count']==av['feature_count']
 assert set(byid)==set(idx['reaches'])==set(area['reaches'])
 outlet=str(v['outlet_reach_id']);assert outlet in byid
 assert byid[outlet]['properties']['downstream_id'] is None
 assert sum(f['properties']['downstream_id'] is None for f in features)==1
 children={rid:[] for rid in byid}
 for rid,f in byid.items():
  coords=f['geometry']['coordinates']
  assert f['geometry']['type']=='LineString' and len(coords)>=2
  assert all(len(p)>=2 and all(math.isfinite(q) for q in p[:2]) for p in coords)
  dn=f['properties']['downstream_id']
  if dn is not None:
   dn=str(dn);assert dn in byid and dn!=rid
   children[dn].append(rid)
   endpoints=[coords[0],coords[-1]]
   target=byid[dn]['geometry']['coordinates']
   assert any(a[:2]==b[:2] for a in endpoints for b in [target[0],target[-1]]),('Disconnected geometry',rid,dn)
  length=idx['reaches'][rid]['length_km']
  assert math.isfinite(length) and length>0
  a=area['reaches'][rid]
  assert math.isfinite(a['local_area_km2']) and a['local_area_km2']>=0
  assert math.isfinite(a['upstream_area_km2']) and a['upstream_area_km2']>=0
 visited=set();active=set()
 def walk(rid):
  assert rid not in active,('Cycle',rid)
  if rid in visited:return
  active.add(rid)
  for child in children[rid]:walk(child)
  active.remove(rid);visited.add(rid)
 walk(outlet)
 assert len(visited)==len(byid),('Unreachable',len(byid)-len(visited))
 assert set(idx['reaches'][outlet]['upstream_ids'])==set(byid)-{outlet}
 assert v['cycles']==0 and v['dangling_downstream_links']==0
 return {'status':'PASS','reaches':len(byid),'outlet':outlet,'length_km':round(sum(idx['reaches'][x]['length_km'] for x in byid),2),'source_upstream_area_km2':area['reaches'][outlet]['upstream_area_km2'],'geojson_sha256':sha,'area_sha256':areasha}
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('folder');args=parser.parse_args()
 print(json.dumps(check(args.folder),ensure_ascii=False,indent=2))
