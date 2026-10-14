const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
test.beforeEach(async({page})=>{
 const leaflet=path.resolve('node_modules/leaflet/dist');
 await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',route=>route.fulfill({path:path.join(leaflet,'leaflet.js'),contentType:'text/javascript'}));
 await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',route=>route.fulfill({path:path.join(leaflet,'leaflet.css'),contentType:'text/css'}));
 await page.route(/https:\/\/[abc]\.tile\.openstreetmap\.org\//,route=>route.abort());
});
test('loads published network and calculates rainfall volume',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 await expect(page.locator('#info')).toContainText('已載入 443 個河段',{timeout:20000});
 await expect(page.locator('#rainfallResult')).toContainText('26,991,000');
 await expect(page.locator('#massBalanceResult')).toContainText('PASS');
 await expect(page.locator('#hydrograph path')).toHaveCount(2);
 await page.locator('#rainfallMm').fill('20');
 await expect(page.locator('#rainfallResult')).toContainText('53,982,000');
 await expect(page.locator('#hydrographSummary')).toContainText('最高示意流量');
 expect(errors).toEqual([]);
});
test('updates hydrograph, animates and preserves conservation',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#info')).toContainText('已載入 443 個河段',{timeout:20000});
 await page.locator('#rainDuration').selectOption('1');
 await expect(page.locator('#hydrographSummary')).toContainText('目前 1 小時');
 await page.locator('#travelToggle').click();
 await expect(page.locator('#travelToggle')).toContainText('暫停');
 await expect(page.locator('#massBalanceResult')).toContainText('PASS');
 await page.locator('#travelToggle').click();
 await expect(page.locator('#travelToggle')).toContainText('播放');
 await page.locator('#travelRestart').click();
 await expect(page.locator('#travelInfo')).toContainText('已重設');
 await page.locator('#animationToggle').click();
 await expect(page.locator('#animationInfo')).toContainText('拓樸階段');
 await page.locator('#animationRestart').click();
 await expect(page.locator('#animationInfo')).toContainText('已重設');
});
test('switches to demonstration mode without falsely enabling hydrologic model',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#info')).toContainText('已載入 443 個河段',{timeout:20000});
 await page.locator('#source').selectOption('demo');
 await expect(page.locator('#info')).toContainText('虛構示範河網');
 await expect(page.locator('#hydrographSummary')).toContainText('請先載入候選河網');
 await page.locator('#travelToggle').click();
 await expect(page.locator('#travelInfo')).toContainText('請先載入候選河網');
});

test('explores bilingual candidate junctions on both river networks',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#info')).toContainText('443 個河段',{timeout:20000});
 await expect(page.locator('#nodeList button').first()).toBeVisible();
 await expect(page.locator('#nodeStatus')).toContainText('交會點候選');
 await page.locator('#nodeList button').nth(1).click();
 await expect(page.locator('#info')).toContainText('選取');
 await page.locator('#nodeFullNetwork').click();
 await expect(page.locator('#info')).toContainText('完整河網');
 await page.locator('#river').selectOption('P136-R-LANYANG');
 await expect(page.locator('#info')).toContainText('178 個河段',{timeout:20000});
 await expect(page.locator('#nodeList button').first()).toContainText('蘭陽溪');
 await page.locator('#nodeList button').first().click();
 await expect(page.locator('#info')).toContainText('選取');
 await page.locator('#river').selectOption('P136-R-TAMSUI');
 await expect(page.locator('#info')).toContainText('443 個河段',{timeout:20000});
});
