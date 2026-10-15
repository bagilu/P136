# P136 教學探索版與精密校正版 — 發布決策

## 目前版本：教學探索版 / Educational Preview

**教學目標：** 讓學生利用現有可查資訊，初步認識臺灣主要河川、水系及支流大致分布，探索上游與下游的關係；不宣稱河段位置、河口、流域邊界均已達精密測繪標準。

**固定公告（繁體中文）：**

> 教學探索版：本圖依現有資料呈現河流及支流的大致分布。部分河段、河川歸屬與河口位置尚待確認，不代表官方河川資料或精確流域界線，請勿作為工程、防災或精密定位依據。

**English:**

> Educational preview: This map illustrates approximate river and tributary networks based on available sources. Some reaches, river identities and outlet locations remain unverified. It is not an official hydrographic dataset or precise watershed boundary map, and must not be used for engineering, hazard assessment or precise positioning.

### Release principles

1. Display existing **lawfully publishable** network data as preliminary, with provenance and limitations visible.
2. Distinguish **river network lines** from **watershed polygons**. Lines alone cannot establish a full basin boundary.
3. Never invent or infer named river identity from nearest-outlet geometry without corroboration; preliminary uncertain segments must remain labeled as such.
4. Do not equate **topology PASS** with river identity validation.
5. **Data licensing is a separate release gate**: the educational aim and relaxed positional precision do not waive HydroRIVERS derivative redistribution conditions or third-party basemap licenses. Pending clearance, do not automatically publish new candidate GeoJSON.
6. No public display of artificially located rivers. A registered river may have no drawable network.
7. The current first-stage disclaimer may be updated without changing validated technical provenance fields or releasing previously held candidate data.

## 下一版本：精密校正版 / Precision Review

- Use appropriately licensed imagery or official centerline vectors, and supervised human point editing.
- Independently review tributary identities, confluences, directions, outlet coordinates, and geometry.
- Require reviewer sign-off, version history, audit logs and separate license checks.
- Only after appropriate review should the system describe individual features as geographically verified.

## Current publication state

The website currently offers three provisional river networks, with other registered rivers not yet drawn. **This decision does not itself authorize publication of additional networks.** Expanding the map requires checking each candidate's source license and reasonable evidence that the proposed river network corresponds to its named river.
