'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),performance=require('node:perf_hooks').performance;
const html=fs.readFileSync('index.html','utf8');
const match=html.match(/<script src="(assets\/v\d+\.js)\?v=[^"]+"><\/script>/);
assert(match,'HTML must reference a versioned application script');
const js=fs.readFileSync(match[1],'utf8');
new vm.Script(js,{filename:match[1]});
for(const id of ['map','source','load','mode','reset','rainfallMm','runoffCoefficient','rainDuration','assumedVelocity','travelToggle','travelRestart','hydrograph','hydrographSummary','massBalanceResult','animationToggle','animationRestart','animationSpeed','animationInfo','travelInfo','info','rainfallResult','region','showBase']){
 assert(html.includes('id="'+id+'"'),'Missing HTML element: '+id);
}
const names=['makeRouting','massBalance','validateModel','hydrographAt','makeTravelModel'];
for(const n of names)assert(new RegExp('function '+n+'\\(').test(js),'Missing model function '+n);
const begin=js.indexOf('function massBalance('),end=js.indexOf('function hydrographAt(',begin);
assert(begin>=0&&end>begin,'Unable to locate conservation functions');
const context=vm.createContext({Math,Number,Set,Map});
vm.runInContext(js.slice(begin,end),context);
const {massBalance,validateModel}=context;
const model={duration:2,maxHours:5,total:300,entries:[{id:'a',hours:1,volume:100},{id:'b',hours:3,volume:200}]};
assert.equal(validateModel(model).pass,true);
for(const [time,expected] of [[0,0],[1,0],[2,50],[3,100],[4,200],[5,300]]){
 const x=massBalance(model,time);
 assert(Math.abs(x.arrived-expected)<1e-8,'Arrival volume at '+time);
 assert(Math.abs(x.arrived+x.remaining-300)<1e-8,'Conservation at '+time);
}
const zero={duration:1,maxHours:1,total:0,entries:[{id:'z',hours:0,volume:0}]};
assert.equal(validateModel(zero).pass,true,'Zero-rainfall case');
const invalid={...model,total:310};
assert.equal(validateModel(invalid).pass,false,'Inconsistent totals must fail');
const timing=performance.now();
for(let i=0;i<1000;i++)validateModel(model);
const elapsed=performance.now()-timing;
console.log('PASS: JS syntax, HTML controls, model functions, conservation, edge cases.');
console.log('Microbenchmark: 1,000 synthetic validations in '+elapsed.toFixed(1)+' ms (informational, no hardware-dependent threshold).');
