const {test,expect}=require('@playwright/test');
test('V1.2 supports tributary joining another tributary and retains topology in GeoJSON',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let promptCount=0;page.on('dialog',async d=>{if(d.type()==='prompt'){promptCount++;await d.accept(promptCount===1?'902':promptCount===2?'支流 A':'支流 B')}else await d.accept()});
 await page.goto('/trace.html');await page.locator('#river').fill('拓樸測試河系');await page.locator('#newSystem').click();
 const map=page.locator('#map');
 await map.click({position:{x:180,y:160}});await map.click({position:{x:180,y:270}});await map.click({position:{x:180,y:380}});
 await page.locator('#newBranch').click();
 await map.click({position:{x:330,y:200}});await map.click({position:{x:270,y:240}});
 await page.locator('#connectBranch').click();await map.click({position:{x:180,y:270}});
 await expect(page.locator('#status')).toContainText('共同匯流節點');
 await page.locator('#newBranch').click();
 await map.click({position:{x:340,y:100}});await map.click({position:{x:300,y:145}});
 await page.locator('#connectBranch').click();await map.click({position:{x:300,y:220}});
 await expect(page.locator('#status')).toContainText('共同匯流節點');
 await page.locator('#mouth').click();await map.click({position:{x:180,y:390}});
 await page.locator('#validate').click();await expect(page.locator('#validation')).toContainText('基本拓樸檢查通過');
 expect(errors).toEqual([]);
});
