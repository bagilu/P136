# P136 · SBI-P-SDS v3.7 升級紀錄

- Web Version: V1.3（首頁與河系描繪工作臺）
- 將河系描繪工作臺連結從醒目展示區移至首頁左側工作列底部。**此為介面隱匿，並非授權機制**；知道 trace.html URL 者仍可開啟。
- 網站首頁頁首、頁尾、描繪工作臺及分析告知中的「好玩實驗室」識別連結至 https://tcubmdsbilab.github.io/P101/。
- 首頁頁尾按規範列示 Web Version V1.3 與 SBI-P-SDS v3.7。
- 首頁加入 P101 中央匿名網站使用分析標準程式，data-project=P136，使用規範指定中央接收端點。分析服務失敗不應影響原網站功能。
- 保留原本 GitHub Pages + GeoJSON 河系架構，不新增 Supabase 業務表、RPC 或帳號登入；DB-01～10 等對此純靜態業務資料層不適用。
- **中央登錄尚須人工執行**：請 P101 授權管理者在中央 Supabase SQL Editor 執行 `database/P136_P101_Analytics_Register.sql`，再執行 `database/P136_P101_Analytics_Verify.sql`，確認 project_code=P136、canonical_origin=https://bagilu.github.io、enabled=true。
- 尚須在 P101 後台完成首頁事件、停留時間、錯誤隔離及隱私治理驗收。未完成前不得宣稱 QA-26、QA-27、QA-28 已通過。
- **安全注意**：前端隱藏編輯入口不能替代正式授權。未來如支援直接寫入 GitHub，須經安全的伺服器端授權與審核流程，不得在前端儲存 GitHub token。

## 初步合規判讀

| 項目 | 結果 | 說明 |
|---|---|---|
| QA-15 | REVIEW | Web Version/cache-busting 已調整；待部署後 UI 驗證 |
| QA-16 | REVIEW | 頁尾已修正；待部署後檢查 |
| QA-24 | REVIEW | 識別連結已修正；待鍵盤/點擊實測 |
| QA-25 | REVIEW | 首頁已加入單一 P136 共用腳本；待瀏覽器測試 |
| QA-26 | REVIEW | 中央後台與錯誤隔離待驗收 |
| QA-27 | N/A（P136） | P101 中央平台管理者負責 |
| QA-28 | REVIEW | 已提供登錄/唯讀驗證 SQL；尚待授權管理者執行 |
| DB/Poster QA | N/A | 本次未新增業務資料庫或海報 |

SBI-P-SDS v3.7 文件自身載明 v3.5 原始全文尚未核對之歷史限制；本專案遵循所提供的 v3.7 條文，不代表已獨立完成歷史版本全文比對。
