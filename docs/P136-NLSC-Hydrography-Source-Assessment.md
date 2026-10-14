# P136 NLSC independent hydrography source assessment

Status: **OFFICIAL VECTOR HYDROGRAPHY CONFIRMED AS A PRODUCT; PUBLIC MACHINE-DOWNLOAD URL NOT YET VERIFIED; NO OVERLAY PERFORMED**

## Why switch sources
WRA RIVERLIN endpoint `https://gic.wra.gov.tw/gis/gic/API/Google/DownLoad.aspx?fname=RIVERLIN&filetype=SHP` returned `RemoteDisconnected` on three attempts in GitHub Actions run [38651652163](https://github.com/bagilu/P136/actions/runs/38651652163). Failure artifact ID: 11934498970. This is source-access failure, **not** evidence that Dajia candidate geometry is wrong.

## Alternative official source: NLSC
- Official Taiwan e-Map overview: https://www.nlsc.gov.tw/en/cp.aspx?n=2149 — NLSC explicitly lists a river thematic layer and SHP/GML vector formats.
- Official open-data distribution overview: https://www.nlsc.gov.tw/cp.aspx?n=16738 — NLSC publishes Taiwan e-Map thematic SHP, and topographic SHP/DWG data, but the correct hydrography package and direct download URL must be established.
- Official map service access terms: https://maps.nlsc.gov.tw/S09SOA/pro/intro.jsp — public WMS/WMTS are map portrayal services; WFS may require institutional application. A WMS image is **not** independent vector geometry.
- Government clarification: https://www.moi.gov.tw/News_toggle3.aspx?PageSize=30&n=174&page=65&sms=9015 — some NLSC WFS services require application by an academic institution.

## Evidence requirements before any comparison
1. Identify the **exact NLSC river thematic vector package**, dataset edition, geographic coverage and download/API access terms. Do not substitute raster tiles, WMS screenshots, or a metadata listing.
2. Download bytes from an official URL or via authorized institutional access; record SHA256, publication/revision date, URL, license, field definitions and CRS.
3. Inspect geometry types and feature names; demonstrate that named Dajia reaches are present. Determine whether this is river bank polygons, river centerlines or generalized cartographic strokes.
4. Convert independently identified Dajia **line** features to EPSG:4326, retaining the original unmodified file and projection metadata in the review workspace.
5. Run `scripts/compare_official_river_lines.py` with candidate and official linework. Only then may the 100/250/500/1000 m metrics be reported as *measured*.
6. Independently assess Da'an and Wu exclusions, upstream junctions, basin polygon, cartographic scale limitations and public redistribution licensing.

## QA gates
| Gate | Result |
|---|---|
| NLSC official river thematic product exists | SOURCE CONFIRMED |
| NLSC vector file downloaded | OPEN |
| Geometry type / named Dajia subset verified | OPEN |
| Independent metric overlay run | OPEN |
| Candidate river identity reviewed | OPEN |
| Redistribution approved | OPEN |

**Publication hold remains in force.** The 162-reach HydroRIVERS Dajia candidate is not activated on the public website.
