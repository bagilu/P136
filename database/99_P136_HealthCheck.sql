-- Read-only checks, review results before deployment.
SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname LIKE 'TblP136%';
SELECT p.proname,p.prosecdef,p.proacl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'P136%';
SELECT has_table_privilege('anon','public."TblP136RiverReach"','SELECT') AS anon_table_select,has_function_privilege('anon','public."P136_GetUpstream"(text,integer)','EXECUTE') AS anon_rpc_execute;
