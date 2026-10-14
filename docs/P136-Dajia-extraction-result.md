# P136 大甲溪候選河網擷取結果 / Dajia candidate extraction result

**狀態：TOPOLOGY PASS — GEOGRAPHIC IDENTITY UNVERIFIED — NOT PUBLISHED**

- GitHub Actions run: https://github.com/bagilu/P136/actions/runs/38649018993
- Review artifact: `p136-dajia-candidate-review` (artifact ID `11934305646`; GitHub retention 30 days).
- HydroRIVERS v1 source SHA-256: `29780b0a75f90024f22e7e2029e5e3045f7325cda0528db65c5cc4c864b98525`
- Candidate network GeoJSON SHA-256: `a633706de32180ee1eb30a929986d2eea30a54596ece8b824576c002988e1aef`
- Candidate reaches: **162**; candidate outlet HYRIV_ID: **41011626**.
- Candidate outlet distance from official N4 monitoring seed: **0.007048 degrees** (angular distance, not meters).
- Eight outlet candidates evaluated. Runner-up: HYRIV_ID **41008478**, **93** reaches, **0.08658 degrees** from seed. Selection algorithm prefers largest connected outlet near seed; selection is **not independent proof of Dajia identity**.
- Topology validator: **PASS**, no cycles or dangling downstream links reported.
- Bounding envelope of extracted feature coordinates (not a watershed polygon): lon **120.552083–121.425**, lat **24.127083–24.416667**.
- Basin boundary verified: **false**. Geographic identity independently verified: **false**. Publication authorized: **false**.

## 下一關 / Next gate

1. Compare the extracted outlet endpoint and upstream trunk against authoritative Dajia watershed map and neighboring Daan/Wu networks.
2. Review HydroRIVERS redistribution/attribution conditions.
3. Only after independent geographic review, decide whether to expose this candidate in the public P136 catalog with explicit preliminary labels.
4. Never infer a verified basin boundary from the network envelope or source-estimated catchment area.

This document records outputs from the actual GitHub Actions artifact, not a proposed or fabricated network.

## 2026-10-15 independent desk review / 官方水系與授權核對

**Official geographic context:** Water Resources Agency Central Region Water Resources Branch describes Dajia River as originating at Nanhudashan, with named tributaries Qijiawan Creek, Nanhu Creek, Hehuan Creek, Zhile Creek and Zhongke Creek, and entering the Taiwan Strait between Daan District and Qingshui District. It describes Daan River as a separate river entering the sea between Dajia and Daan districts. Source: https://www.wra.gov.tw/wracb/cp.aspx?n=41543

**What this verifies:** the official Dajia river name, its broad drainage geography, and the neighboring Daan distinction. **What it does not verify:** whether the 162 HydroRIVERS features actually follow those named tributaries, or whether the selected HydroRIVERS outlet `41011626` corresponds to the true Dajia mouth. The current artifact must be geometrically overlaid on an authoritative water-system map before identity can be marked verified.

**Source license checkpoint:** HydroRIVERS' own documentation states the product is free for scientific, educational and commercial use, but the full HydroSHEDS v1 license governs derivative works, redistribution, and attribution. It requests citation to Lehner & Grill (2013). Source: https://www.hydrosheds.org/products/hydrorivers and https://data.hydrosheds.org/file/technical-documentation/HydroSHEDS_TechDoc_v1_4.pdf. **Do not infer blanket permission for standalone public redistribution** of candidate GeoJSON solely from a free-use statement; inspect license clauses before committing raw/derived river geometry to a public repository.

**Decision:** **HOLD / NOT PUBLISHED.** Official text-based contextual cross-check completed; geometric identity and public redistribution review remain open.
