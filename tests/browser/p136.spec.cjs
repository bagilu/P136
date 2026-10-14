const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
test.beforeEach(async({page})=>{
 const leaflet=path.resolve('node_modules/leaflet/dist');
 await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',route=>route.fulfill({path:path.join(leaflet,'leaflet.js'),contentType:'text/javascript'}));
 await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',route=>route.fulfill({path:path.join(leaflet,'leaflet.css'),contentType:'text/css'}));
 await page.route(/https:\/\/[abc]\.tile\.openstreetmap\.org\//,route=>route.abort());
});
test('loads three candidate river networks in Taiwan overview',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.locator('#info')).toContainText('839 河段',{timeout:25000});
 await expect(page.locator('#riverCatalogStatus')).toContainText('蘭陽溪');
 await expect(page.locator('.p136-outlet-pulse')).toHaveCount(3);
 await expect(page.locator('#legacyRiverControls')).toBeHidden();
 await expect(page.locator('#riverRegistrySummary')).toContainText('15 條已登錄');
 await expect(page.locator('#riverRegistryList button')).toHaveCount(15);
 await expect(page.locator('#riverRegistryList button:disabled')).toHaveCount(12);
 expect(errors).toEqual([]);
});
test('selects three outlets without changing viewport and restores all rivers',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#info')).toContainText('839 河段',{timeout:25000});
 const before=await page.evaluate(()=>({center:map.getCenter(),zoom:map.getZoom()}));
 await page.locator('.p136-outlet-pulse').first().click();
 await expect(page.locator('#overviewSelection')).toContainText('淡水河');
 await expect(page.locator('#info')).toContainText('上游 442 河段');
 const after=await page.evaluate(()=>({center:map.getCenter(),zoom:map.getZoom()}));
 expect(after.zoom).toBe(before.zoom);
 expect(after.center.lat).toBeCloseTo(before.center.lat,7);
 expect(after.center.lng).toBeCloseTo(before.center.lng,7);
 await page.locator('.p136-outlet-pulse').nth(1).click();
 await expect(page.locator('#overviewSelection')).toContainText('蘭陽溪');
 await expect(page.locator('#info')).toContainText('上游 177 河段');
 await page.locator('.p136-outlet-pulse').nth(2).click();
 await expect(page.locator('#overviewSelection')).toContainText('花蓮溪');
 await page.locator('#reset').click();
 await expect(page.locator('#overviewSelection')).toContainText('尚未選取');
});

test('keeps viewport stable while navigating backward through reach selections',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#info')).toContainText('839 河段',{timeout:25000});
 await page.locator('.p136-outlet-pulse').first().click();
 await expect(page.locator('#overviewBack')).toBeDisabled();
 const before=await page.evaluate(()=>({lat:map.getCenter().lat,lng:map.getCenter().lng,zoom:map.getZoom()}));
 await page.evaluate(()=>{
  const d=overviewDatasets.get('P136-R-TAMSUI');
  const id=d.idx.reaches[d.entry.outlet_reach_id].upstream_ids.find(x=>d.idx.reaches[x]?.upstream_ids?.length>0);
  overviewHighlight(d.entry.river_id,id);
 });
 await expect(page.locator('#overviewBack')).toBeEnabled();
 await page.locator('#overviewBack').click();
 await expect(page.locator('#overviewBack')).toBeDisabled();
 await expect(page.locator('#overviewSelection')).toContainText('淡水河');
 const after=await page.evaluate(()=>({lat:map.getCenter().lat,lng:map.getCenter().lng,zoom:map.getZoom()}));
 expect(after).toEqual(before);
});

test('traces selected upstream and downstream while preserving map viewport',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#info')).toContainText('839 河段',{timeout:25000});
 const result=await page.evaluate(()=>{
  const d=overviewDatasets.get('P136-R-TAMSUI');
  const id=[...d.reaches.keys()].find(x=>d.idx.reaches[x].upstream_ids.length>0&&overviewDownstream(d,x).size>0);
  if(!id)throw Error('No internal reach with both upstream and downstream');
  const before={lat:map.getCenter().lat,lng:map.getCenter().lng,zoom:map.getZoom()};
  overviewHighlight(d.entry.river_id,id);
  const after={lat:map.getCenter().lat,lng:map.getCenter().lng,zoom:map.getZoom()};
  const downstream=[...overviewDownstream(d,id)];
  return {before,after,selected:d.reaches.get(id).layer.options.color,
   downstream:downstream.map(x=>d.reaches.get(x).layer.options.color),
   upstream:d.idx.reaches[id].upstream_ids.slice(0,3).map(x=>d.reaches.get(x).layer.options.color)};
 });
 expect(result.after).toEqual(result.before);
 expect(result.selected).toBe('#e0a01b');
 expect(result.downstream.length).toBeGreaterThan(0);
 expect(result.downstream.every(x=>x==='#d94848')).toBe(true);
 expect(result.upstream.every(x=>x==='#0476ba')).toBe(true);
 await expect(page.locator('#overviewLegend')).toContainText('Downstream');
});

test('shows provenance-aware upstream and downstream metrics without moving the map',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#info')).toContainText('839 河段',{timeout:25000});
 const before=await page.evaluate(()=>({lat:map.getCenter().lat,lng:map.getCenter().lng,zoom:map.getZoom()}));
 await page.locator('.p136-outlet-pulse').first().click();
 await expect(page.locator('#overviewMetrics')).toContainText('Total upstream network length');
 await expect(page.locator('#overviewMetrics')).toContainText('Downstream route length');
 await expect(page.locator('#overviewMetrics')).toContainText('Source-estimated upstream catchment area');
 const after=await page.evaluate(()=>({lat:map.getCenter().lat,lng:map.getCenter().lng,zoom:map.getZoom()}));
 expect(after).toEqual(before);
 await page.locator('#reset').click();
 await expect(page.locator('#overviewMetrics')).toContainText('Select an outlet or reach');
});

test('catalog-driven provenance paths load three networks',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#info')).toContainText('839 河段',{timeout:25000});
 const result=await page.evaluate(()=>({
  count:overviewDatasets.size,
  entries:[...overviewDatasets.values()].map(d=>({
   id:d.entry.river_id,manifest:d.entry.network_manifest,validation:d.entry.network_validation,
   areaValidation:d.entry.area_validation,count:d.geo.features.length
  }))
 }));
 expect(result.count).toBe(3);
 expect(result.entries.map(x=>x.count).sort((a,b)=>a-b)).toEqual([178,218,443]);
 for(const e of result.entries){
  expect(e.manifest).toMatch(/^data\//);
  expect(e.validation).toMatch(/^data\//);
  expect(e.areaValidation).toMatch(/^data\//);
 }
});

test('renders four reference stations separately from three candidate outlets',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.locator('#info')).toContainText('839 河段',{timeout:25000});
 await expect(page.locator('#riverRegistrySummary')).toContainText('4 處參考位置');
 await expect(page.locator('.p136-outlet-pulse')).toHaveCount(3);
 const reference=await page.evaluate(()=>({
  count:registryReferenceMarkers.getLayers().length,
  labels:registryReferenceMarkers.getLayers().map(layer=>layer.getTooltip()?.getContent()||''),
  outlets:overviewOutletMarkers.getLayers().length
 }));
 expect(reference.count).toBe(4);
 expect(reference.outlets).toBe(3);
 expect(reference.labels.some(x=>x.includes('大甲溪'))).toBe(true);
 expect(reference.labels.some(x=>x.includes('高屏溪'))).toBe(true);
 expect(errors).toEqual([]);
});
