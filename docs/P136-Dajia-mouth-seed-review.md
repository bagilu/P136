# P136 大甲溪候選河網：河口種子查證 / Dajia River candidate mouth-seed review

Status: **RESEARCH SEED ONLY — NOT A VERIFIED HYDROGRAPHIC OUTLET; NETWORK NOT EXTRACTED**

## 官方證據 / Official evidence

1. 交通部運輸研究所《臺中港鄰港水質環境採樣點位座標》，表 3-1，測點 **N4「大甲溪出海口」**，WGS-84：北緯 **24°20.045′**、東經 **120°33.174′**。換算十進位：**latitude 24.3340833333, longitude 120.5529**。此為官方採樣測點，**不代表經獨立測繪認證的水文出口節點**。來源：https://www.iot.gov.tw/uploads/asset/data/6619bd49367376304acd5200/B0993870.pdf
2. 臺中市政府《110–111年度高美重要濕地（國家級）基礎生態調查及分析計畫》，表十：W1「大甲溪出海口北側」(120.56048, 24.33599)；W2「大甲溪出海口南側」(120.55866, 24.32826)。這兩個是兩側採樣點，**不得直接當作河口中心**。來源：https://www.agriculture.taichung.gov.tw/media/860080/110-111%E5%B9%B4%E5%BA%A6%E9%AB%98%E7%BE%8E%E6%BF%95%E5%9C%B0%E5%9F%BA%E7%A4%8E%E7%94%9F%E6%85%8B%E8%AA%BF%E6%9F%A5%E5%8F%8A%E8%A8%88%E7%95%AB%E5%88%86%E6%9E%90_%E6%88%90%E6%9E%9C%E5%A0%B1%E5%91%8A%E6%9B%B8.pdf
3. 經濟部水利署大甲溪水系介紹，指出河流於清水附近入海；此資訊僅用於河流身分與流域方位的交叉查證。來源：https://www.wra.gov.tw/wra03/cp.aspx?n=10468

## 候選擷取參數 / Proposed extraction inputs

- River: `dajia`
- Approximate mouth seed: **lon 120.5529, lat 24.3340833333** (N4 monitoring location, WGS-84)
- Bounding box **provisional broad Taiwan-central search envelope**: west 120.45, south 24.00, east 121.65, north 24.65
- Reference URL: https://www.iot.gov.tw/uploads/asset/data/6619bd49367376304acd5200/B0993870.pdf

These bbox values are **analyst search parameters**, not official watershed boundaries. The candidate extraction algorithm ranks connected HydroRIVERS outlets by size near the seed; the resulting river identity and mouth position must be independently checked before any catalog activation. A valid topology is not sufficient to prove the river identity.

## Review gate

- [ ] Download HydroRIVERS and independently inspect candidate outlet against N4/W1/W2.
- [ ] Confirm extracted upstream network follows the Dajia River, not adjacent Daan or Wu River.
- [ ] Validate topology and endpoint continuity using `scripts/validate_river_candidate.py`.
- [ ] Check source license and attribution before publication.
- [ ] Keep `geographic_identity_verified=false` and `boundary_verified=false` until independent evidence supports otherwise.

Do **not** activate in `data/catalog/rivers.json` or update public reach counts from this research note alone.
