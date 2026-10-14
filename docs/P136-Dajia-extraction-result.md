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
