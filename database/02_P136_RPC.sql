-- Public read of VERIFIED geometry only; uses fixed search_path and project-local table.
CREATE OR REPLACE FUNCTION public."P136_GetUpstream"(p_reach_id text, p_limit integer DEFAULT 3000)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb; BEGIN
 IF p_reach_id IS NULL OR length(p_reach_id)>128 OR p_limit NOT BETWEEN 1 AND 3000 THEN RAISE EXCEPTION 'Invalid request'; END IF;
 WITH RECURSIVE upstream AS (
 SELECT r."ReachID",r."DownstreamReachID",r."RiverName",r."Geom",ARRAY[r."ReachID"] AS visited
 FROM public."TblP136RiverReach" r WHERE r."ReachID"=p_reach_id AND r."Verified"
 UNION ALL
 SELECT r."ReachID",r."DownstreamReachID",r."RiverName",r."Geom",u.visited||r."ReachID"
 FROM public."TblP136RiverReach" r JOIN upstream u ON r."DownstreamReachID"=u."ReachID"
 WHERE r."Verified" AND NOT r."ReachID"=ANY(u.visited) AND cardinality(u.visited)<1000
 ), bounded AS (SELECT * FROM upstream LIMIT p_limit)
 SELECT coalesce(jsonb_build_object('type','FeatureCollection','features',jsonb_agg(jsonb_build_object('type','Feature','id',"ReachID",'properties',jsonb_build_object('name',"RiverName"),'geometry',extensions.ST_AsGeoJSON("Geom")::jsonb))),jsonb_build_object('type','FeatureCollection','features','[]'::jsonb)) INTO result FROM bounded;
 RETURN result; END; $$;
REVOKE ALL ON FUNCTION public."P136_GetUpstream"(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public."P136_GetUpstream"(text,integer) TO anon,authenticated;
