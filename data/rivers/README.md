# P136 河系 GeoJSON 發布流程 / River System Publishing

## 儲存規則

- 每個河系一個 GeoJSON，檔名固定為 `P136-Rxxx.geojson`，例如 `P136-R004.geojson`。
- 永久河系 ID 依建立順序保留，**不等於地理排序**；地理顯示順序由 `data/rivers/index.json` 的 `sort_order` 管理。
- 河系檔案放在 `data/rivers/`。不使用 Supabase。
- 請勿直接修改自動生成的 `index.json` 河系清單；若需調整排序，可修改既有項目的 `sort_order`，下次重建時會沿用。

## 教師審核與發布

1. 在 [河系描繪工作臺](../../trace.html) 建立或匯入河系，完成主流、支流、匯流節點與河口。
2. 執行「檢查拓樸」；確認無錯誤後匯出 `P136-Rxxx.geojson`。
3. 教師核對河系編號、河道位置、名稱、上下游方向、影像/資料使用權及實際匯流關係。
4. 將 GeoJSON 的 `metadata.status` 從 `draft` 改成 `published`，並提交到 GitHub `data/rivers/`。
5. GitHub Actions `P136 River System Auto Discovery` 自動驗證已發布檔案、重建 `index.json` 並提交。檢查失敗則不更新目錄。
6. GitHub Pages 完成部署後，首頁「學生描繪河系」會自動出現新的河系選項，勾選即可顯示。

> 重要：`draft` 檔案即使上傳也**不會**加入正式目錄。將 `status` 設為 `published` 是教師明確的發布決定，並非系統對地理正確性的認證。

## 限制與注意事項

- GitHub Pages 不能直接列舉儲存庫目錄；網頁只讀取由 Actions 建立的 `index.json`。
- GitHub Actions 必須具有 Contents: write 權限，否則無法回寫目錄。可至 Repository Settings → Actions → General 檢查 Workflow permissions。
- 如果使用者直接在 GitHub 上編輯 `index.json`，下次重新產生時除了 `sort_order` 之外的內容將依 GeoJSON 重建。
- GitHub Pages 可能有部署與瀏覽器快取延遲；正式網站更新不代表即時同步。
- 驗證器只做格式與基本拓樸一致性檢查，不驗證河流真實地理位置，也不提供 GIS 級幾何交叉分析。
- 學生描繪的河系作為獨立展示圖層，不覆蓋既有 HydroRIVERS/OSM 教學候選圖層。
