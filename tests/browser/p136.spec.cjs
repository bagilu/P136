const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
test.beforeEach(async({page})=>{
 const leaflet=path.resolve('node_modules/leaflet/dist');
 await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',route=>route.fulfill({path:path.join(leaflet,'leaflet.js'),contentType:'text/javascript'}));
 await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',route=>route.fulfill({path:path.join(leaflet,'leaflet.css'),contentType:'text/css'}));
 await page.route(/https:\/\/[abc]\.tile\.openstreetmap\.org\//,route=>route.abort());
});
test('loads both candidate river networks in Taiwan overview',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.locator('#info')).toContainText('621 河段',{timeout:25000});
 await expect(page.locator('#riverCatalogStatus')).toContainText('蘭陽溪');
 await expect(page.locator('.p136-outlet-pulse')).toHaveCount(2);
 await expect(page.locator('#legacyRiverControls')).toBeHidden();
 expect(errors).toEqual([]);
});
test('selects two outlets without changing viewport and restores all rivers',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#info')).toContainText('621 河段',{timeout:25000});
 const before=await page.evaluate(()=>({center:map.getCenter(),zoom:map.getZoom()}));
 await page.locator('.p136-outlet-pulse').first().click();
 await expect(page.locator('#overviewSelection')).toContainText('淡水河');
 await expect(page.locator('#info')).toContainText('443 個上游河段');
 const after=await page.evaluate(()=>({center:map.getCenter(),zoom:map.getZoom()}));
 expect(after.zoom).toBe(before.zoom);
 expect(after.center.lat).toBeCloseTo(before.center.lat,7);
 expect(after.center.lng).toBeCloseTo(before.center.lng,7);
 await page.locator('.p136-outlet-pulse').nth(1).click();
 await expect(page.locator('#overviewSelection')).toContainText('蘭陽溪');
 await expect(page.locator('#info')).toContainText('178 個上游河段');
 await page.locator('#reset').click();
 await expect(page.locator('#overviewSelection')).toContainText('尚未選取');
});
