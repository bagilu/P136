const {test,expect}=require('@playwright/test');
test('educational Taiwan river map renders OSM named reaches, outlets and clickable selection',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.locator('#educationalRiverStatus')).toContainText('2867',{timeout:30000});
 await expect(page.locator('#educationalRiverSelection')).toBeEmpty();
 await expect(page.locator('#educationalRiversVisible')).toBeChecked();
 await expect(page.locator('#educationalOutletsVisible')).toBeChecked();
 const count=await page.evaluate(()=>Object.values(map._layers).filter(x=>x instanceof L.Polyline && x.options?.p136Default).length);
 expect(count).toBe(2867);
 const outlets=await page.evaluate(()=>Object.values(map._layers).filter(x=>x instanceof L.CircleMarker && x.options?.color==='#bc4a19').length);
 expect(outlets).toBe(15);
 const selection=await page.evaluate(()=>{
  const line=Object.values(map._layers).find(x=>x instanceof L.Polyline&&x.options?.p136Default);
  line.fire('click');
  return document.getElementById('educationalRiverSelection').textContent;
 });
 expect(selection).toContain('OSM way');
 await page.locator('#educationalRiversVisible').uncheck();
 await page.locator('#educationalOutletsVisible').uncheck();
 expect(errors).toEqual([]);
});
