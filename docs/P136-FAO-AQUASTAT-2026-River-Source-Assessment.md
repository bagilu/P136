# P136 教學版河網替代資料來源評估：FAO AQUASTAT 2026

**目的：** 尋找具明確公開使用條件、可供臺灣河川教學展示的線狀資料，避免將研究用 HydroRIVERS 候選檔直接當成可任意再散布的公開檔案。

## 發現

FAO AQUASTAT 的「Rivers (Global - edition 2026)」資料集：
https://data.fao.org/catalog/dataset/e22667af-3977-4e9f-b58b-67fb91b0fa87

- FAO 目錄標示授權為 **Creative Commons Attribution 4.0 International (CC BY 4.0)**。
- FAO 目錄說明其 2026 版河川資料係衍生自 HydroRIVERS 線狀圖層。
- **仍需檢查：** 真正可下載的檔案、資料集實際附帶授權文字、臺灣地理涵蓋、欄位結構、河段連通資訊與可否保留上游下游關係。
- FAO CC BY 4.0 的標示**不應自動延伸**為 HydroRIVERS 原始版本及既有 P136 衍生 GeoJSON 的授權結論。
- 如果 FAO 資料不含 HydroRIVERS NEXT_DOWN 等網路關係欄位，可能只適合做**教學概覽底層**，而不能直接取代 P136 的上下游互動模型。

## 需要明確區分的 HydroSHEDS 授權

HydroRIVERS 官方產品頁：
https://www.hydrosheds.org/products/hydrorivers

HydroRIVERS 官方技術文件：
https://data.hydrosheds.org/file/technical-documentation/HydroRIVERS_TechDoc_v10.pdf

HydroSHEDS v1 官方授權全文（附錄 A）：
https://data.hydrosheds.org/file/technical-documentation/HydroSHEDS_TechDoc_v1_4.pdf

官方指出 HydroRIVERS 免費供教育、科學、商業使用，但**再散布及衍生資料發布**須遵循 HydroSHEDS v1 完整授權條款；「免費使用」不等於無條件重新發布。

## 教學版候選資料判斷順序

1. 來源明確且有**可驗證的公開發布授權**。
2. 下載檔案可取得，並具有可解析的河川線狀幾何。
3. 確認臺灣實際涵蓋範圍，不把全球資料名稱誤當臺灣完整覆蓋保證。
4. 確認是否具上下游網路欄位；若無，只顯示概覽，不假裝具備拓樸。
5. 保留來源、下載時間、版本、雜湊、授權與改作聲明。
6. 正式上線前，檢查與現有河網的河口／主流位置是否大致合理；未確認者標記為「教學示意」。

## 發布決策

**本文件僅列出替代來源，尚未下載 FAO 實際向量資料，也尚未核准發布新河網。** 目前公開網站不變。
