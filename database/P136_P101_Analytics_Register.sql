-- SBI-P-SDS v3.7 · P136 central analytics registration
-- Run ONLY by authorized P101 administrator in the CENTRAL Supabase SQL Editor.
-- Do not include in P136 migrations or execute as a website visitor.
INSERT INTO p101_analytics."TblP101AnalyticsProjects"
  (project_code, canonical_origin, enabled)
VALUES ('P136', 'https://bagilu.github.io', true)
ON CONFLICT (project_code)
DO UPDATE SET
  canonical_origin = EXCLUDED.canonical_origin,
  enabled = EXCLUDED.enabled;
