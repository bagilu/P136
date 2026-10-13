# P136 V0.017 — 多河流與河網節點資料模型 / Multi-River and Network-Node Data Model

本版是 Schema 與河流目錄第一階段；目前只有淡水河候選資料，尚未導入蘭陽溪或 Supabase。
This release establishes the schema and first catalog; only preliminary Tamsui data is available.

## 實體 / Entities
- River：河流知識實體與中英文名稱 / named river entity.
- RiverSystem：河系 / river system grouping.
- Basin：獨立的流域邊界及其驗證狀態 / independent watershed boundary.
- NetworkDataset：河網版本、來源、checksum、品質 / versioned topology dataset.
- Reach：河段、下游 ID、長度、局部與累積面積 / directed reaches.
- NetworkNode：出海口、交會點、座標、名稱、品質 / outlets and confluences.
- NodeReach：節點與上游／下游多條河段關係 / node-to-reach relationship.
- RiverReach：河流名稱與河段的核定對應 / verified named river reach association.
- SourceRecord：來源、授權、擷取時間與 SHA-256 / provenance.
- Publication：發布版本、驗證報告與品質聲明 / publication manifest.

## 資料品質規則 / Quality gates
1. 不得僅依距離或河段 ID 推定基隆河、新店溪、大漢溪等正式名稱。
2. 尚未驗證的河口／交會點名稱與座標，必須標示「待驗證 / Unverified」。
3. 上游追溯依 downstream_id 與 upstream_ids，不以地理距離取代拓樸。
4. 河流、河系、流域、河網、河段為不同實體。
5. 介面、提示與品質說明均採中文在前、英文在後的雙語並列。
6. V0.017 GitHub Pages 使用唯讀 JSON / GeoJSON；V0.020 才規劃 Supabase，遵守 SBI-P-SDS v3.3。

## 版本計畫 / Roadmap
V0.017 多河流 Schema 與雙語目錄；V0.018 蘭陽溪；V0.019 臺灣主要河流；V0.020 Supabase；V0.021 世界河流；V0.022 河流知識。

科學限制：淡水河 443 河段通過拓樸檢查，但流域邊界尚未獨立驗證；水文示意不是洪水預報。
Scientific limitation: topology checks do not verify basin boundaries or predictive hydrology.
