#!/usr/bin/env python3
"""P136 candidate outlet geometry review. This does NOT verify river identity."""
import argparse,json,math,pathlib
def haversine_km(a,b):
 lon1,lat1=map(math.radians,a);lon2,lat2=map(math.radians,b)
 h=math.sin((lat2-lat1)/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
 return 2*6371.0088*math.asin(min(1,math.sqrt(h)))
def inspect(folder,seed):
 folder=pathlib.Path(folder)
 geo=json.loads((folder/'network.geojson').read_text())
 val=json.loads((folder/'network-validation.json').read_text())
 outlet=next(f for f in geo['features'] if str(f['properties']['id'])==str(val['outlet_reach_id']))
 coords=outlet['geometry']['coordinates']
 distances=[haversine_km(point[:2],seed) for point in (coords[0],coords[-1])]
 end=coords[0] if distances[0]<distances[1] else coords[-1]
 return {'candidate_outlet_reach_id':str(val['outlet_reach_id']),
         'candidate_outlet_endpoint_lonlat':end[:2],
         'official_station_seed_lonlat':seed,
         'distance_km':round(min(distances),3),
         'method':'WGS84 approximate haversine, closest of two outlet-reach endpoints',
         'independent_identity_verified':False,
         'official_geometry_overlay_completed':False,
         'publication_approved':False}
if __name__=='__main__':
 parser=argparse.ArgumentParser()
 parser.add_argument('folder')
 parser.add_argument('--seed-lon',type=float,required=True)
 parser.add_argument('--seed-lat',type=float,required=True)
 a=parser.parse_args()
 print(json.dumps(inspect(a.folder,[a.seed_lon,a.seed_lat]),indent=2,ensure_ascii=False))
