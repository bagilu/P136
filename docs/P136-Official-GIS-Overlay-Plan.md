# P136 官方 GIS 幾何驗證計畫 / Independent Official GIS Overlay Plan

Status: **OFFICIAL SOURCES IDENTIFIED — DATA NOT YET INGESTED — GEOMETRIC OVERLAY NOT YET PERFORMED**

## Independent Taiwan WRA sources

1. **River channels / 河川河道** — https://data.gov.tw/dataset/25781 — WRA, linework inventory (metadata reports 13,262 records). Candidate comparison of mainstem alignment. Check whether downloadable resource is actually line geometry; the portal's record count does not prove this dataset covers all upper tributaries.
2. **River tributaries / 河川支流** — https://data.gov.tw/dataset/25780 — WRA, named tributary linework inventory (metadata reports 2,015 records). Compare Qijiawan, Nanhu, Hehuan, Zhile and Zhongke named branches where covered.
3. **River basin extent / 河川流域範圍圖** — https://data.gov.tw/dataset/9823 — WRA, KML catalog. Independently assess whether candidate reaches fall within the officially named Dajia basin; do not equate coverage with surveyed hydrological correctness.
4. **River basic data / 河川基本資料** — https://data.gov.tw/dataset/167895 — WRA, attributes include river code, estuary, governing start/end coordinates in EPSG:3826. **Management boundary points are not necessarily exact estuary locations.**
5. **Basin basic data / 流域基本資料** — https://data.gov.tw/dataset/167897 — WRA, basin code, area, length and source descriptions; cross-check metadata, not geometry.
6. **WRA Spatial Information Service / 水利空間資訊服務平台** — https://gic.wra.gov.tw/Gis/Page/MapServiceIntro — public SHP/KML downloads and WMS overlays.

All source metadata above is official and currently public. **No source geometry has yet been downloaded or overlaid.** Dataset pages and their record counts do not constitute independent geometric validation.

## Reproducible overlay protocol (planned)

1. Record downloaded official resource URL, retrieval time, format, revision, SHA-256, license and coordinate reference system.
2. Confirm the official dataset actually contains *named* Dajia features. Keep original geometries and attributes in an isolated review workspace, not the public site.
3. Reproject to WGS84 (EPSG:4326) with a documented GIS library; preserve source CRS and axis order. For WRA basic-data XY fields use EPSG:3826 only after checking metadata.
4. Compare HydroRIVERS candidate `41011626` to official Dajia channel linework. Quantify proximity of candidate line vertices to official lines using metric projection, not degree distances.
5. Report the fraction of the 162 reaches within 100 m, 250 m, 500 m and 1 km of the official river/tributary linework. Thresholds are **diagnostic bins**, not automatic acceptance criteria.
6. Check candidate upstream trunk, named tributary junctions, river mouth and neighbor exclusions (Daan and Wu). Mark missing official coverage as **NOT EVALUABLE**, not a failed match or a pass.
7. Independently inspect official basin polygon; flag any candidate geometry falling outside. Confirm polygon provenance and that it is the correct Dajia basin.
8. Produce a reviewer-signed report with figures, source hashes, disagreements and evidence for every exception.
9. Separate license clearance for public redistribution of HydroRIVERS derivative geometry from the WRA open-data license. Neither license may be inferred from the other.

## Dajia QA register

| Gate | Status |
|---|---|
| Official WRA dataset discovery | COMPLETE |
| Actual WRA linework retrieved and source hashed | OPEN |
| Candidate-to-official overlay statistics | OPEN |
| Daan/Wu basin exclusion | OPEN |
| Candidate identity independently reviewed | OPEN |
| HydroRIVERS redistribution cleared | OPEN |
| Public candidate preview | HOLD |

No P136 version increment or 162-reach activation is authorized by this plan alone.
