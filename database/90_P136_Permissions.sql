ALTER TABLE public."TblP136RiverReach" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."TblP136RiverReach" FROM anon,authenticated;
REVOKE ALL ON FUNCTION public."P136_GetUpstream"(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public."P136_GetUpstream"(text,integer) TO anon,authenticated;
