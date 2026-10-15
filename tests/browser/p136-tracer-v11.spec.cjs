const {test,expect}=require('@playwright/test');
test('V1.1 independent tracing studio supports point editing, outlet and GeoJSON export',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/trace.html');
 await expect(page.locator('#map .leaflet-container, #map.leaflet-container')).toHaveCount(1);
 await page.locator('#river').fill('教學測試河川');
 await page.evaluate(()=>{
  map.fire('click',{latlng:L.latLng(23.7,121)});
  map.fire('click',{latlng:L.latLng(23.71,121.01)});
 });
 await expect(page.locator('#points')).toContainText('2 個節點');
 await page.locator('#mouth').click();
 await page.evaluate(()=>map.fire('click',{latlng:L.latLng(23.69,121.02)}));
 await expect(page.locator('#points')).toContainText('已標記近似出海口');
 await page.locator('#save').click();
 await expect(page.locator('#status')).toContainText('已儲存');
 await page.locator('#undo').click();
 await expect(page.locator('#points')).not.toContainText('已標記近似出海口');
 await page.locator('#load').click();
 await expect(page.locator('#points')).toContainText('已標記近似出海口');
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#export').click();
 const download=await downloadPromise;expect(download.suggestedFilename()).toBe('P136-river-draft.geojson');
 expect(errors).toEqual([]);
});
