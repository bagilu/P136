const {test,expect}=require('@playwright/test');
test('FAO WMS reference is opt-in and does not change river viewport',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(/data\.apps\.fao\.org\/map\/gsrv\/gsrv1\/aquamaps\/wms/i,route=>route.fulfill({
  status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64')
 }));
 await page.goto('/');
 await expect(page.locator('#showFaoReference')).not.toBeChecked();
 const before=await page.evaluate(()=>({center:map.getCenter(),zoom:map.getZoom()}));
 await page.locator('#showFaoReference').check();
 await expect(page.locator('#faoLayerStatus')).toContainText('FAO');
 const active=await page.evaluate(()=>Array.from(map._layers ? Object.values(map._layers):[]).some(x=>x.wmsParams?.layers==='rivers_asia_37331'));
 expect(active).toBe(true);
 await page.locator('#showFaoReference').uncheck();
 const removed=await page.evaluate(()=>!Object.values(map._layers).some(x=>x.wmsParams?.layers==='rivers_asia_37331'));
 expect(removed).toBe(true);
 const after=await page.evaluate(()=>({center:map.getCenter(),zoom:map.getZoom()}));
 expect(after.zoom).toBe(before.zoom);
 expect(after.center.lat).toBeCloseTo(before.center.lat,6);
 expect(after.center.lng).toBeCloseTo(before.center.lng,6);
 expect(errors).toEqual([]);
});
