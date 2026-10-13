# P136 山河脈絡 / River Networks — V0.001

First deliverable is a **topology interaction prototype**, NOT a verified geographic dataset. Blue lines are intentionally synthetic, placed in northern Taiwan for demonstration; never use them for geographic analysis.

## Run
Upload contents of this directory to a GitHub Pages repository (root), or run `python -m http.server 8000` here and open http://localhost:8000. Requires internet for Leaflet and OpenStreetMap tiles.

## Production data
Obtain licensed official hydrography, clean segment endpoints and direction, validate topology, then populate `TblP136RiverReach` with `Verified=true` only after review. Do not import the demo graph into the database. SQL scripts are provided as a **starting migration**, not executed. PostGIS must already exist in `extensions` schema; adapt if your installation differs. The public RPC `P136_GetUpstream` is a future backend foundation; V0.001 demo intentionally uses no database and does not claim production RPC integration.

## Security
SBI-P-SDS v3.3: project-only SQL, RLS enabled, no table access, RPC-only for future database communication, no secrets. No login in V0.001. `config-sample.js` only.

## Limitations
Demo mode's full-network selection is a synthetic basin; actual named-river hierarchy is deferred. County boundaries, mountain peaks, verified river geometries and country selection are deferred.
