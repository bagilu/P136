# P136 河網品質保證規範 / River Network Quality Assurance Protocol v1.0

**原則 / Principle:** 可重現的資料證據優先於河網數量。任何程式拓樸 PASS 都不能自動升級為地理身分 VERIFIED。

## 證據分層 / Evidence states

| State | 中文定義 | Required evidence | Public use |
|---|---|---|---|
| REGISTERED | 已登錄河川名稱 | official river name/source | registry only |
| SEED_SOURCED | 已取得可追溯參考點 | source URL, original coordinate system, station type | labeled reference marker, never mouth claim |
| CANDIDATE_EXTRACTED | 已擷取候選河網 | source version/hash, script, parameters, artifact | private review only |
| TOPOLOGY_PASS | 程式拓樸檢查通過 | repeatable validator, unique outlet, continuity, no cycles | review only |
| IDENTITY_REVIEWED | 獨立地理比對完成 | authoritative hydrographic map, trunk/tributary/neighbor review, reviewer, dated evidence | candidate preview only if license separately cleared |
| RELEASE_APPROVED | 發布審查完成 | identity review + legal redistribution check + regression tests + human approval | clearly labeled public candidate |
| BASIN_VERIFIED | 流域界線已驗證 | independent polygon/official delineation evidence | may show verified basin boundary |

**Do not equate IDENTITY_REVIEWED with BASIN_VERIFIED.** Public candidate previews must say 「候選河網／Candidate network」 until stronger verification exists.

## 不可省略的發布閘門 / Mandatory release gates

1. **Provenance:** source name/version/license/URL, SHA-256, extraction code revision, parameters, date, reproducibility instructions.
2. **Identity:** candidate outlet and upstream trunk checked against an independent official map; adjacent rivers (e.g., Daan and Wu for Dajia) excluded; named tributaries assessed. Reviewer and evidence links recorded.
3. **Topology:** `scripts/validate_river_candidate.py` PASS; manual inspection of suspicious gaps and artificial confluences. Note: this script tests graph consistency, not real-world identity.
4. **Legal:** independently document redistribution/derivative/attribution rights for public GitHub Pages distribution. Free educational *use* is not automatically permission to redistribute geometry.
5. **Release:** explicit human approval; no workflow may automatically activate candidate in `data/catalog/rivers.json`. Public UI must expose provenance, uncertainty, and limitations; browser regression tests must pass.
6. **Boundary:** catchment area estimates and network bounding boxes must never be labeled verified basin boundaries.

## Dajia review register / 大甲溪審查

- N4 official sampling seed: (120.5529, 24.3340833333); **sampling location, not independently surveyed outlet**.
- HydroRIVERS candidate: 162 reaches, outlet HYRIV_ID 41011626, topology PASS.
- Evidence: [seed record](P136-Dajia-mouth-seed-review.md), [extraction results](P136-Dajia-extraction-result.md), [Actions run](https://github.com/bagilu/P136/actions/runs/38649018993).
- Geographic identity: **OPEN**. Need authoritative map overlay, outlet/trunk and Daan/Wu exclusion.
- Redistribution license: **OPEN**. Need explicit clause review.
- Boundary: **OPEN**.
- Decision: **HOLD — do not publish the 162 reaches yet**.

## Review record template / 審查紀錄欄位

`river_id`, `candidate_sha256`, `source_sha256`, `review_date`, `reviewer`, `official_map_url`, `outlet_match_evidence`, `mainstem_match_evidence`, `tributary_match_evidence`, `adjacent_basin_exclusion`, `license_clause_and_url`, `attribution_text`, `topology_result`, `identity_verified`, `redistribution_cleared`, `basin_boundary_verified`, `release_approved`, `unresolved_issues`.

Unknown, blank, or not independently reviewed = **false**, never inferred true.
