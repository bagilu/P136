# P136 V0.021 河流候選資料擴充 / River Candidate Expansion

## 目的 / Purpose
使用同一套 HydroRIVERS v1 流程產製新的候選河網，避免為每條河複製不同演算法。候選資料不等於已驗證的河系、流域或河口。 / Generate repeatable, provenance-aware candidate networks. A candidate is not a verified river system, basin, or outlet.

## 執行 / Run
需要 Python 3.12、pyshp==2.3.1 與網路連線。先根據可靠來源人工確定候選河口座標與涵蓋搜尋區域；下列為**參數格式範例，不提供虛構座標**。 / Requires Python 3.12, pyshp==2.3.1 and network access. Independently research the approximate mouth and screening bounding box first. No placeholder coordinates are claimed as facts.

```bash
python -m pip install pyshp==2.3.1
python scripts/build_river_candidate.py --slug RIVER_SLUG --mouth-lon LONGITUDE --mouth-lat LATITUDE --bbox WEST SOUTH EAST NORTH
```

程式會產出六個檔案至 `data/candidates/RIVER_SLUG/`：network.geojson、network-index.json、area-index.json、network-manifest.json、network-validation.json、area-validation.json。

## 產製與品質規則 / Processing and quality gates
1. 以研究用 BBOX 篩選 HydroRIVERS 線段；BBOX 不是流域邊界。 / Bounding box is a search region, not a basin.
2. 在候選河口附近尋找具有完整上游連通性的末端河段。 / Rank terminal reaches by upstream connectivity and proximity to the approximate mouth.
3. 若候選相近、拓樸循環、下游連結缺失、河系主識別碼混雜，停止。 / Fail on ambiguous outlets, cycles, dangling links, or mixed source main-river identifiers.
4. 保存來源 SHA-256、產物 SHA-256、河段拓樸索引與面積來源值。 / Record source and output hashes, reach topology and source area values.
5. `basin_boundary_verified=false`、`rainfall_simulation_authorized=false`。 / Basin boundary and rainfall simulation are not independently authorized.

## 上線前人工驗證 / Human review before activation
確認河流名稱與河口、幾何方向、上下游連通、主要支流及候選河段範圍；檢查來源授權及署名。只有在候選資料完成品質檢查與人工審閱後，才更新 `data/catalog/rivers.json`。目前 `assets/v0204.js` 的資料讀取路徑僅支援淡水河及蘭陽溪；新增河流須先將其改為依 catalog 提供的 manifest/validation 路徑讀取，不能只增加 catalog 條目。 / Validate river identity, outlet, geometry, topology, coverage and licensing before catalog activation. The current frontend still hardcodes two dataset validation paths and must be generalized before any third river can be enabled.

## 本階段界線 / Current boundary
此階段建立可重複產製能力；尚未產生第三條河流的可信候選成果，也不宣稱流域邊界驗證完成。 / This stage establishes a reusable builder; no third river is published or represented as validated.
