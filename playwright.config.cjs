const {defineConfig,devices}=require('@playwright/test');
module.exports=defineConfig({
 testDir:'./tests/browser',
 timeout:30000,
 expect:{timeout:12000},
 retries:process.env.CI?1:0,
 reporter:process.env.CI?[['list'],['html',{open:'never'}]]:'list',
 use:{baseURL:'http://127.0.0.1:8765',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
 webServer:{command:'python3 -m http.server 8765 --bind 127.0.0.1',url:'http://127.0.0.1:8765',reuseExistingServer:!process.env.CI,timeout:20000}
});
