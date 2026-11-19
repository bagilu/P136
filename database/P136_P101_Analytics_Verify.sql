-- P136 · P101 centralized analytics read-only verification
SELECT project_code, canonical_origin, enabled
FROM p101_analytics."TblP101AnalyticsProjects"
WHERE project_code = 'P136';
