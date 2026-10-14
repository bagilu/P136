#!/usr/bin/env python3
"""Independent, *diagnostic* P136 candidate-to-official GeoJSON overlay.

Input official GeoJSON MUST already be transformed to EPSG:4326 and independently
filtered to the named river. Never interprets a geometric match as verified identity.
Requires shapely>=2 and pyproj>=3.
"""
import argparse,hashlib,json,math,pathlib
from shapely.geometry import shape
from shapely.ops import transform,unary_union
from pyproj import Transformer

BINS=(100,250,500,1000)
def read(path):
    p=pathlib.Path(path)
    raw=p.read_bytes()
    obj=json.loads(raw)
    if obj.get('type')!='FeatureCollection' or not isinstance(obj.get('features'),list):
        raise ValueError(f'{p}: expected GeoJSON FeatureCollection')
    if not obj['features']:
        raise ValueError(f'{p}: empty geometry collection')
    crs=obj.get('crs')
    if crs and crs.get('properties',{}).get('name') not in ('EPSG:4326','urn:ogc:def:crs:OGC:1.3:CRS84'):
        raise ValueError(f'{p}: explicit non-WGS84 CRS; transform before use')
    return obj,hashlib.sha256(raw).hexdigest()
def review(candidate,official,official_name,official_url):
    if not official_name.strip() or not official_url.startswith('https://'):
        raise ValueError('Independent official river name and HTTPS source URL required')
    c,chs=read(candidate);o,ohs=read(official)
    # Taiwan metric CRS, TWD97 / TM2 zone 121; always_xy preserves lon/lat order.
    project=Transformer.from_crs('EPSG:4326','EPSG:3826',always_xy=True).transform
    lines=[]
    for f in o['features']:
        g=shape(f['geometry'])
        if g.geom_type not in ('LineString','MultiLineString') or g.is_empty:
            raise ValueError('Official input must contain only named river line geometries')
        lines.append(transform(project,g))
    reference=unary_union(lines)
    results=[]
    for f in c['features']:
        g=shape(f['geometry'])
        if g.geom_type!='LineString' or g.is_empty:
            raise ValueError('Candidate requires nonempty LineString reaches')
        metric=transform(project,g)
        # Densify at 100 m intervals, including endpoints, so long segments
        # cannot falsely pass from vertex-only checks.
        n=max(1,math.ceil(metric.length/100))
        from shapely.geometry import Point
        distances=[reference.distance(metric.interpolate(i/n,normalized=True)) for i in range(n+1)]
        results.append({'reach_id':str(f['properties']['id']),
                        'sample_count':len(distances),
                        'max_distance_m':round(max(distances),2),
                        'mean_distance_m':round(sum(distances)/len(distances),2),
                        'fraction_within_m':{str(b):round(sum(d<=b for d in distances)/len(distances),4) for b in BINS}})
    return {'status':'DIAGNOSTIC_ONLY_NOT_IDENTITY_VERIFICATION',
            'official_name_claim':official_name,'official_source_url':official_url,
            'candidate_sha256':chs,'official_sha256':ohs,
            'projection':'EPSG:3826','sample_spacing_max_m':100,
            'candidate_reaches':len(results),'official_features':len(lines),
            'overall_fraction_within_m':{str(b):round(sum(r['sample_count']*r['fraction_within_m'][str(b)] for r in results)/sum(r['sample_count'] for r in results),4) for b in BINS},
            'identity_verified':False,'basin_boundary_verified':False,
            'redistribution_cleared':False,'publication_approved':False,
            'reaches':results}
if __name__=='__main__':
    a=argparse.ArgumentParser()
    a.add_argument('--candidate',required=True);a.add_argument('--official',required=True)
    a.add_argument('--official-name',required=True);a.add_argument('--official-url',required=True)
    a.add_argument('--output',required=True)
    v=a.parse_args()
    result=review(v.candidate,v.official,v.official_name,v.official_url)
    pathlib.Path(v.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k!='reaches'},ensure_ascii=False,indent=2))
