# P136 花蓮溪候選河網 / Hualien River candidate

狀態 / Status: **RESEARCH_SEED_ONLY — NOT PUBLISHED**.

## 研究用河口種子 / Approximate mouth seed
花蓮縣政府「花蓮縣學生水域全地圖彙整表」第 7 項列出「花蓮溪出海口」：北緯 23.936261、東經 121.610423。這是搜尋候選河段的種子點，不等同於已驗證的 HydroRIVERS 河口節點。

Hualien County's water-area table identifies a location labeled Hualien River mouth at 23.936261 N, 121.610423 E. This is a search seed, **not** a verified HydroRIVERS outlet.

來源 / Source: https://ws.hl.gov.tw/Download.ashx?n=6Iqx6JOu57ij5a2455Sf5rC05Z%2Bf5YWo5Zyw5b2Z5pW06KGoLnBkZg%3D%3D&u=LzAwMS9VcGxvYWQvNDkzL3JlbGZpbGUvMTkxNjkvOTgyOTUvYWIxNTk2MmUtNDY3OS00YzYwLTk2NjAtOWJjMTM5YWNjZTY3LnBkZg%3D%3D

## 研究搜尋區 / Screening region
`--bbox 120.85 23.30 121.80 24.20` 為寬鬆的研究用篩選框，不代表花蓮溪流域邊界，也不應將框內所有河段歸入花蓮溪。

## 執行方式 / Execution
GitHub Actions → **P136 Hualien River candidate review** → Run workflow。

該工作流程下載 HydroRIVERS Asia v1，建立候選河網，檢查拓樸與 SHA-256，並產生供人工審核的 Artifact。**不會自動提交候選資料到 main，也不會更新 rivers.json 或公開地圖**。

## 人工審核項目 / Manual review
- 河口候選點與河流身分是否相符 / Candidate outlet and river identity
- 河系主識別碼、支流歸屬與上游完整性 / Main-river identity, tributaries and upstream coverage
- 河段方向與 NEXT_DOWN 連通性 / Reach direction and connectivity
- 流域邊界與集水面積資料仍屬初估 / Basin boundary and source-estimated area remain unverified
- HydroSHEDS 授權與署名 / HydroSHEDS attribution and redistribution terms

未通過審核，不新增第三個河口標記。 / Do not add a third outlet marker before review.
