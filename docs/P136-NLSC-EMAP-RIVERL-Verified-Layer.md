# P136 NLSC exact official river-centerline layer — source verification

Status: **OFFICIAL LAYER ID AND ATTRIBUTE SCHEMA VERIFIED; VECTOR BYTES NOT YET OBTAINED; NO GEOMETRIC OVERLAY**

## Official authoritative evidence

1. NLSC WFS layer list: https://maps.nlsc.gov.tw/S09SOA/pro/Wfs_ajax_list.jsp
   - **WFS:EMAP_RIVERL** = 臺灣通用電子地圖水系(河川中線) / Taiwan e-Map river centerline.
   - **WFS:EMAP_RIVERA** = 臺灣通用電子地圖水系(河川) / river area; this is **not** the river centerline.
   - WFS page says some layers require application; **do not assume anonymous WFS download is permitted**.
2. NLSC Taiwan e-Map data standard: https://www.nlsc.gov.tw/cp.aspx?n=15899
   - The official `TEMAP_河川_中線` complex type includes `河川類型代碼`, `河川等級`, `河川名稱`, `測製年月`, `資料建置代碼`, `來源定義代碼`.
   - These are **standard schema field names**, not proof that a specific downloaded SHP has the same DBF field names or that Dajia features are populated.
3. NLSC FAQ: https://www.nlsc.gov.tw/News_Toggle.aspx?_CSN=2033&n=1564&sms=9708
   - Taiwan e-Map result data contain SHP, SHX, PRJ, DBF and CPG components; application routes include e-commerce portal, in-person and postal/email application.
4. Taiwan government application instructions: https://www.gov.tw/News_Content_2_680879
   - Official application and delivery paths; fees/conditions depend on data category and must be confirmed.
5. NLSC open data page: https://www.nlsc.gov.tw/cp.aspx?n=16738
   - Open thematic SHP exists but does not establish that the full `EMAP_RIVERL` layer is an unrestricted direct-download dataset.

## Exact requested data

**Product:** 臺灣通用電子地圖 / Taiwan e-Map

**Layer:** 河川中線 / River centerline, `WFS:EMAP_RIVERL`

**Geographic extent:** 大甲溪流域，包含河口、主流、七家灣溪、南湖溪、合歡溪、志樂溪、中科溪及與大安溪／烏溪相鄰的邊界區域（如有收錄）。

**Format:** SHP + SHX + DBF + PRJ + CPG (or equivalent documented GML/GeoPackage); complete attributes and explicit CRS.

**Metadata:** production/revision dates, coordinate reference, river-name and type fields, coverage, license and permitted public redistribution.

**Research use:** independent validation of HydroRIVERS candidate river geometry; not publication of original NLSC dataset.

## Next procedure (no automatic acceptance)

1. Confirm institutional/academic access to `EMAP_RIVERL` with NLSC; do not attempt to bypass a gated WFS.
2. Obtain the official vector archive or authorized service output, retaining source URL, license, date and hash.
3. Run `python scripts/audit_official_vector_archive.py --archive official.zip --source-url https://<official-source> --output inventory.json`.
4. Review original CRS, feature geometry, named Dajia records, scale and actual coverage. **Do not infer Dajia identity from spatial proximity alone.**
5. Extract named Dajia centerline features and transform to EPSG:4326 with recorded methodology; then run `scripts/compare_official_river_lines.py` to quantify diagnostic distance bins.
6. Separately review Da'an/Wu river exclusions, basin membership, tributary identities and HydroRIVERS derivative redistribution rights.

## QA register

| Evidence gate | Status |
|---|---|
| Exact NLSC centerline layer ID | VERIFIED: WFS:EMAP_RIVERL |
| NLSC river-centerline schema | VERIFIED: official standard |
| Authorized vector access / downloadable bytes | OPEN |
| Dajia records and coordinate system inspected | OPEN |
| 162-reach independent overlay | OPEN |
| Basin/river identity reviewed | OPEN |
| Public redistribution cleared | OPEN |

**No public site change. Candidate remains HOLD.**
