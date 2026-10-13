# P136 V0.001 Architecture
Project: P136 山河脈絡 / River Networks. Geographic scope starts Taiwan; schema has CountryCode for expansion.

Frontend: Leaflet, vanilla HTML/CSS/JS, GitHub Pages. Offline topology fixture tests selection logic. Future production: RPC returns GeoJSON; no `.from()` or direct table REST.

Data quality gate: authoritative river geometry; snap endpoints with documented tolerance; validate upstream direction, bifurcations, disconnected segments, river mouth and sources, names, license and provenance. Hydrologic graph is not identical to named-river hierarchy.

Security: PostGIS table RLS, no policies or direct grants, restricted EXECUTE, security-definer fixed search_path and project-only object. Note public RPC still needs operational query-size/time controls and adversarial testing before production deployment.
