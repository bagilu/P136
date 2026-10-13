-- P136 V0.001. Run in Supabase SQL Editor. Requires PostGIS extension already enabled by administrator.
CREATE TABLE IF NOT EXISTS public."TblP136RiverReach" (
  "ReachID" text PRIMARY KEY, "CountryCode" text NOT NULL DEFAULT 'TW',
  "RiverName" text, "DownstreamReachID" text REFERENCES public."TblP136RiverReach"("ReachID") DEFERRABLE INITIALLY DEFERRED,
  "Geom" extensions.geometry(LineString,4326) NOT NULL, "SourceName" text NOT NULL,
  "SourceVersion" text, "Verified" boolean NOT NULL DEFAULT false
);
ALTER TABLE public."TblP136RiverReach" ENABLE ROW LEVEL SECURITY;
-- No public table policies. No anon/authenticated table grants.
REVOKE ALL ON TABLE public."TblP136RiverReach" FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS "IdxP136ReachGeom" ON public."TblP136RiverReach" USING gist ("Geom");
CREATE INDEX IF NOT EXISTS "IdxP136ReachDownstream" ON public."TblP136RiverReach" ("DownstreamReachID");
