# P136 V0.022 花蓮溪候選河網初審 / Hualien River candidate preliminary review

**狀態 / Status:** TOPOLOGY_PASS / GEOGRAPHIC_IDENTITY_UNVERIFIED / NOT IN PUBLIC CATALOG

## 可重現產製 / Reproducible build
- Workflow: https://github.com/bagilu/P136/actions/runs/38534188772
- Workflow conclusion: success
- Artifact: https://github.com/bagilu/P136/actions/runs/38534188772/artifacts/11878833092
- HydroRIVERS source SHA-256: `29780b0a75f90024f22e7e2029e5e3045f7325cda0528db65c5cc4c864b98525`
- Candidate GeoJSON SHA-256: `54db67d4150de1c423ed98e2e097c0518e27261623718be94a82873cc45007ac`
- Candidate area-index SHA-256: `d3616095310fe8fb0495ad139bdec81cd2a9b931b96dcff76698e7d6863a3cd1`

## 候選數據 / Candidate metrics
| 指標 / Metric | 結果 / Result |
|---|---|
| 河段數 / Reaches | 218 |
| 候選河口 ID / Candidate outlet | `41030681` |
| 上游河段 / Upstream reaches | 217 |
| 全河網線段加總 / Sum of reach lengths | 570.9 km (not main-stem length) |
| 來源估計累積集水面積 / Source-estimated upstream area at outlet | 1,517.1 km² (not verified basin polygon) |
| 候選河口與種子點距離 / Candidate outlet seed offset | 0.003322 degrees (not surveyed positional accuracy) |
| 搜尋候選河口數 / Candidate terminal outlets evaluated | 7 |
| 循環 / Cycles | 0 |
| 下游斷鏈 / Dangling downstream links | 0 |
| 候選線段經緯度範圍 / Geometry extent | 121.220833–121.610417 E, 23.600000–24.108333 N |

## 獨立資料檢查 / Independent artifact inspection
直接讀取本次 GitHub Actions Artifact 中的 GeoJSON、network-index.json、area-index.json、manifest、validation。確認：
1. 河口 `41030681` 的 `upstream_ids` 含 217 個河段，加上河口本身恰為 218 個，且 ID 不重複。
2. 非河口河段的 `downstream_id` 都存在於本候選資料集。
3. 所有河段 `length_km` 均大於 0；全河網加總約 570.9 km。
4. 河口 `upstream_area_km2` 為來源估計 1,517.1 km²。
5. Manifest 與 validation 的 SHA-256 相符，`basin_boundary_verified=false`，`rainfall_simulation_authorized=false`。

## 未通過的發布門檻 / Remaining publication gates
- 尚未由獨立地理來源驗證候選河口與花蓮溪河系身分。
- 尚未人工檢查支流歸屬、河系完整性、主流名稱及河口端點方向。
- 尚未取得經驗證的流域邊界 polygon。
- 仍須確認 HydroSHEDS 資料再散布條款與署名方式。
- **因此不修改 `data/catalog/rivers.json`，也不新增第三個公開河口標記。**

## 下一步 / Next
地理審核通過後，將 Artifact 六個資料檔納入 `data/candidates/hualien/`，補充 catalog 六個檔案路徑，執行前端與拓樸回歸測試，再開啟第三條候選河網的互動探索。所有發布標籤仍須清楚標示候選與未驗證。
