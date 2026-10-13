'use strict';
const $=id=>document.getElementById(id);
const map=L.map('map',{preferCanvas:true}).setView([25.10,121.48],10);
const base=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);
const group=L.featureGroup().addTo(map);
const styleOff={color:'#85c7e7',weight:3,opacity:.85},styleOn={color:'#0476ba',weight:5,opacity:1};
let reaches=new Map(), selected=null, source='', index=null, areaIndex=null, generation=0;
let routing=null,animationTimer=null,animationStep=-1,animationRunning=false;
let travelTimer=null,travelStep=0,travelRunning=false,travelModel=null;
function status(message){$('info').textContent=message}
async function json(path,timeout=12000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{const response=await fetch(path,{signal:controller.signal});if(!response.ok)throw Error(path+' HTTP '+response.status);return await response.json()}
 catch(e){throw Error(e.name==='AbortError'?'逾時：'+path:e.message)}
 finally{clearTimeout(timer)}
}
function resetLayers(){stopTravel(true);stopAnimation(true);routing=null;group.clearLayers();reaches.clear();selected=null;index=null;areaIndex=null;rainfallStatus('請先載入 HydroRIVERS 河網。');drawHydrograph();showValidation(null,0)}
function select(id){
 stopTravel(true);stopAnimation(true);selected=id;const r=reaches.get(id);if(!r)return;
 const mode=$('mode').value,active=new Set([id]);
 if(mode==='name'){for(const [key,v] of reaches)if(v.name===r.name&&r.name!=='未命名')active.add(key)}
 if(mode==='upstream'&&index){for(const x of index.reaches[id].upstream_ids)active.add(x)}
 let km=0;
 for(const [key,v] of reaches){v.layer.setStyle(active.has(key)?styleOn:styleOff);if(active.has(key)&&index?.reaches[key])km+=index.reaches[key].length_km}
 const a=areaIndex?.reaches[id];const areaText=a?'；來源累積集水面積約 '+a.upstream_area_km2.toLocaleString('zh-TW')+' km²；本河段局部集水面積約 '+a.local_area_km2.toLocaleString('zh-TW')+' km²':'';
 updateRainfall();drawHydrograph();
 status('選取 '+active.size+' 個河段'+(index?'；河道總長約 '+km.toFixed(1)+' km':'')+areaText+'。'+(source==='network'?'面積為 HydroRIVERS 初步估計，流域邊界尚未獨立驗證。':'目前不是已驗證的河網拓樸。'));
}
function render(features,sourceType){
 resetLayers();source=sourceType;status('資料已下載，正在繪製 '+features.length+' 個河段…');
 const bounds=[];
 for(const f of features){
  if(f.geometry?.type!=='LineString'||!Array.isArray(f.geometry.coordinates)||f.geometry.coordinates.length<2)throw Error('無效河道幾何');
  const id=String(f.properties.id),coords=f.geometry.coordinates.map(p=>[p[1],p[0]]);
  if(reaches.has(id))throw Error('重複河段 ID：'+id);
  const name=source==='network'?'HydroRIVERS 河段 '+id:(f.properties.name||'未命名');
  const line=L.polyline(coords,styleOff).bindTooltip(name+' · '+id).on('click',()=>select(id));
  line.addTo(group);reaches.set(id,{layer:line,name});bounds.push(line.getBounds());
 }
 if(bounds.length)map.fitBounds(group.getBounds(),{maxZoom:11});
}
async function network(token){
 status('步驟 1/3：讀取 GitHub 靜態河網…');
 const [g,m,v]=await Promise.all([
 json('data/published/tamsui-network.geojson?v=0.005'),
 json('data/published/tamsui-network-manifest.json?v=0.005'),
 json('data/published/tamsui-network-validation.json?v=0.005')
 ]);
 if(token!==generation)return;
 if(g.type!=='FeatureCollection'||!Array.isArray(g.features)||g.features.length!==m.feature_count||v.feature_count!==m.feature_count||m.validation_status!=='TOPOLOGY_PASS_BOUNDARY_PRELIMINARY'||v.status!==m.validation_status||m.published_sha256!==v.output_sha256)throw Error('河網與驗證報告不一致');
 status('步驟 2/3：讀取預先計算的上游索引…');
 const idx=await json('data/published/tamsui-network-index.json?v=0.007');
 if(token!==generation)return;
 if(idx.source_feature_count!==g.features.length||idx.boundary_verified!==false||Object.keys(idx.reaches).length!==g.features.length)throw Error('上游索引版本不一致');
 for(const f of g.features){const id=String(f.properties.id);if(!idx.reaches[id]||!Array.isArray(idx.reaches[id].upstream_ids))throw Error('缺少上游索引 '+id)}
 status('步驟 3/4：讀取預先計算的集水面積…');
 const [a,ar]=await Promise.all([json('data/published/tamsui-area-index.json?v=0.008'),json('data/published/tamsui-area-validation.json?v=0.008')]);
 if(token!==generation)return;
 if(a.feature_count!==g.features.length||ar.feature_count!==g.features.length||a.network_sha256!==m.published_sha256||a.source_sha256!==m.source_sha256||ar.published_sha256!== 'af8a839bee5a2b299d077d537b10ec3af0f9ca91b2c749197aca7b5a019e31bf'||ar.status!=='AREA_SOURCE_EXTRACTED_BOUNDARY_UNVERIFIED'||a.basin_boundary_verified!==false||ar.basin_boundary_verified!==false||Object.keys(a.reaches).length!==g.features.length)throw Error('集水面積資料或驗證報告版本不一致');
 for(const f of g.features){const id=String(f.properties.id);if(!a.reaches[id]||!Number.isFinite(a.reaches[id].local_area_km2)||!Number.isFinite(a.reaches[id].upstream_area_km2))throw Error('集水面積缺失 '+id)}
 status('步驟 4/4：繪製河網…');
 render(g.features,'network');index=idx;areaIndex=a;$('mode').value='upstream';
 routing=makeRouting(g.features);
 travelMessage('選擇河段後，可用假設的固定流速試算逕流體積到達該河段下游端的時間。');
 status('已載入 '+reaches.size+' 個河段及集水面積資料。可啟動匯流順序動畫；流域邊界尚未獨立驗證。');
 updateRainfall();drawHydrograph();animationMessage('準備就緒：動畫依拓樸層級展示匯流順序，不代表真實時間。');
}
async function real(token){
 status('正在讀取已發布的靜態河道…');
 const [g,m,v]=await Promise.all([json('data/published/tamsui.geojson?v=0.004'),json('data/published/manifest.json?v=0.004'),json('data/published/validation-report.json?v=0.004')]);
 if(token!==generation)return;
 if(g.features?.length!==m.feature_count||v.status!=='GEOMETRY_PASS_TOPOLOGY_UNVERIFIED')throw Error('靜態資料驗證失敗');
 render(g.features,'real');$('mode').value='single';status('已載入 '+reaches.size+' 段河道；未驗證上下游拓樸。');
}
function rainfallStatus(message){$('rainfallResult').textContent=message}
function updateRainfall(){
 if(!areaIndex||source!=='network'){rainfallStatus('此功能僅適用已載入的 HydroRIVERS 候選河網。');return}
 const p=Number($('rainfallMm').value),c=Number($('runoffCoefficient').value);
 if(!Number.isFinite(p)||p<0||p>1000||!Number.isFinite(c)||c<0||c>1){rainfallStatus('請輸入 0–1000 mm 降雨量及 0–1 的逕流係數。');return}
 const id=selected||'40962896',area=areaIndex.reaches[id];
 if(!area){rainfallStatus('所選河段沒有集水面積資料。');return}
 const volume=area.upstream_area_km2*p*1000*c;
 const local=area.local_area_km2*p*1000*c;
 const fmt=n=>n.toLocaleString('zh-TW',{maximumFractionDigits:0});
 rainfallStatus((selected?'所選河段 '+id:'預設河口河段 '+id)+'\n累積集水面積（來源初估）：'+fmt(area.upstream_area_km2)+' km²\n本次降雨產生的上游逕流體積：約 '+fmt(volume)+' m³\n本河段局部集水區逕流體積：約 '+fmt(local)+' m³\n計算：降雨 mm × 面積 km² × 1,000 × 逕流係數\n注意：假設整個上游集水區均勻降雨，僅估算總體積；不代表流量、洪峰、到達時間或淹水預測。流域邊界尚未獨立驗證。');
}

function animationMessage(s){$('animationInfo').textContent=s}
function makeRouting(features){
 const downstream=new Map(),children=new Map(),depth=new Map();
 for(const f of features){const id=String(f.properties.id);downstream.set(id,f.properties.downstream_id===null?null:String(f.properties.downstream_id));children.set(id,[])}
 for(const [id,dn] of downstream)if(dn!==null){if(!children.has(dn))throw Error('動畫拓樸有缺失下游河段 '+id);children.get(dn).push(id)}
 function visit(id,stack){
  if(depth.has(id))return depth.get(id);
  if(stack.has(id))throw Error('動畫拓樸出現循環');
  const next=new Set(stack);next.add(id);
  const level=children.get(id).length?1+Math.max(...children.get(id).map(child=>visit(child,next))):0;
  depth.set(id,level);return level;
 }
 for(const id of children.keys())visit(id,new Set());
 return {depth,max:Math.max(...depth.values()),downstream};
}
function stopAnimation(clear=false){
 if(animationTimer!==null){clearInterval(animationTimer);animationTimer=null}
 animationRunning=false;
 const b=$('animationToggle');if(b)b.textContent='播放匯流動畫 / Play';
 if(clear){animationStep=-1;if(routing&&reaches.size){for(const v of reaches.values())v.layer.setStyle(styleOff)}}
}
function paintAnimation(){
 if(!routing||!areaIndex)return;
 const p=Number($('rainfallMm').value),c=Number($('runoffCoefficient').value);
 const valid=Number.isFinite(p)&&p>=0&&p<=1000&&Number.isFinite(c)&&c>=0&&c<=1;
 if(!valid){stopAnimation();animationMessage('請先輸入有效的降雨深度與逕流係數。');return}
 let count=0,localVolume=0;
 for(const [id,r] of reaches){
  const on=routing.depth.get(id)<=animationStep;
  r.layer.setStyle(on?{color:'#0879b6',weight:4,opacity:1}:styleOff);
  if(on){count++;localVolume+=areaIndex.reaches[id].local_area_km2*p*1000*c}
 }
 animationMessage('拓樸階段 '+(animationStep+1)+' / '+(routing.max+1)+'；已顯示 '+count+' / '+reaches.size+' 河段。\n已顯示河段所對應的局部集水區逕流總體積：約 '+Math.round(localVolume).toLocaleString('zh-TW')+' m³。\n這是依上游至下游的概念性匯流順序，並非水流位置、累積入流量或實際經過時間。');
}
function tickAnimation(){
 if(!routing)return;
 if(animationStep>=routing.max){stopAnimation();animationMessage('動畫結束：全部 '+reaches.size+' 河段已顯示。\n這是拓樸匯流順序示範，不代表洪峰到達時間。');return}
 animationStep++;paintAnimation();
}
function toggleAnimation(){
 stopTravel(true);
 if(source!=='network'||!routing||!areaIndex){animationMessage('請先成功載入 HydroRIVERS 河網及集水面積資料。');return}
 if(animationRunning){stopAnimation();animationMessage('已暫停於拓樸階段 '+(animationStep+1)+'。');return}
 if(animationStep>=routing.max)animationStep=-1;
 selected=null;
 animationRunning=true;$('animationToggle').textContent='暫停動畫 / Pause';
 tickAnimation();
 const speed=Number($('animationSpeed').value);
 animationTimer=setInterval(tickAnimation,Math.max(120,1200/speed));
}


function travelMessage(message){$('travelInfo').textContent=message}
function stopTravel(clear=false){
 if(travelTimer!==null){clearInterval(travelTimer);travelTimer=null}
 travelRunning=false;
 if($('travelToggle'))$('travelToggle').textContent='播放傳遞示意 / Play';
 if(clear){travelStep=0;travelModel=null}
}
function makeTravelModel(){
 if(source!=='network'||!routing||!areaIndex||!index)return null;
 const target=selected||'40962896';
 const speed=Number($('assumedVelocity').value),rain=Number($('rainfallMm').value),coefficient=Number($('runoffCoefficient').value),duration=Number($('rainDuration').value);
 if(!Number.isFinite(duration)||duration<=0||duration>168||!Number.isFinite(speed)||speed<=0||speed>10||!Number.isFinite(rain)||rain<0||rain>1000||!Number.isFinite(coefficient)||coefficient<0||coefficient>1)return null;
 const ids=[target,...index.reaches[target].upstream_ids];
 const downstream=routing.downstream;
 const lengths=index.reaches;
 const entries=[];
 for(const id of ids){
  let cursor=id,km=0,guard=0;
  while(cursor!==null){
   if(!lengths[cursor]||!Number.isFinite(lengths[cursor].length_km))throw Error('缺少河道長度 '+cursor);
   km+=lengths[cursor].length_km;
   if(cursor===target)break;
   cursor=downstream.get(cursor)??null;
   if(++guard>reaches.size)throw Error('傳遞路徑無法到達所選河段');
  }
  if(cursor!==target)throw Error('來源河段不在所選河段上游 '+id);
  entries.push({id,hours:km*1000/speed/3600,volume:areaIndex.reaches[id].local_area_km2*rain*1000*coefficient});
 }
 return {target,speed,duration,entries,maxHours:Math.max(...entries.map(x=>x.hours))+duration,total:entries.reduce((a,x)=>a+x.volume,0)};
}


function massBalance(model,t){
 let arrived=0,remaining=0,integrated=0;
 for(const e of model.entries){
  const elapsed=Math.max(0,Math.min(model.duration,t-e.hours));
  const portion=e.volume*elapsed/model.duration;
  arrived+=portion;remaining+=e.volume-portion;
  integrated+=e.volume/model.duration*elapsed;
 }
 const residual=model.total-arrived-remaining;
 const integrationResidual=arrived-integrated;
 const tolerance=Math.max(0.01,model.total*1e-9);
 return {arrived,remaining,residual,integrationResidual,tolerance,pass:Math.abs(residual)<=tolerance&&Math.abs(integrationResidual)<=tolerance};
}
function validateModel(model){
 if(!model||!model.entries.length||model.maxHours<=0)return {pass:false,reason:'模型無有效河段'};
 const times=new Set([0,model.maxHours]);
 for(const e of model.entries){times.add(e.hours);times.add(e.hours+model.duration);times.add(e.hours+model.duration/2)}
 let worst=0;
 for(const t of times){
  const r=massBalance(model,t);
  worst=Math.max(worst,Math.abs(r.residual),Math.abs(r.integrationResidual));
  if(!r.pass)return {pass:false,reason:'在 '+t.toFixed(3)+' 小時發生水量不平衡',worst};
 }
 const end=massBalance(model,model.maxHours);
 if(Math.abs(end.arrived-model.total)>end.tolerance)return {pass:false,reason:'結束時仍有未到達水量',worst};
 return {pass:true,worst,checked:times.size};
}
function showValidation(model,t){
 const el=$('massBalanceResult');if(!el)return;
 if(!model){el.textContent='尚未載入有效的水量傳遞模型。';return}
 const v=validateModel(model),b=massBalance(model,t);
 const fmt=n=>n.toLocaleString('zh-TW',{maximumFractionDigits:2});
 el.textContent=(v.pass?'PASS — 水量守恆檢查通過':'FAIL — '+v.reason)+'\\n總產生逕流：'+fmt(model.total)+' m³\\n已到達：'+fmt(b.arrived)+' m³\\n尚未到達：'+fmt(b.remaining)+' m³\\n守恆殘差：'+fmt(b.residual)+' m³\\n流量積分殘差：'+fmt(b.integrationResidual)+' m³\\n檢查點：'+(v.checked||0)+'；最大數值殘差：'+fmt(v.worst||0)+' m³\\n僅驗證簡化模型的內部數值一致性，不代表水文或流域資料已通過實測驗證。';
}

function hydrographAt(model,t){
 let q=0;
 for(const e of model.entries)if(t>=e.hours&&t<e.hours+model.duration)q+=e.volume/(model.duration*3600);
 return q;
}
function drawHydrograph(){
 const svg=$('hydrograph'),summary=$('hydrographSummary');
 if(!svg||!summary)return;
 if(source!=='network'||!areaIndex||!routing||!index){svg.replaceChildren();summary.textContent='請先載入候選河網。';return}
 let m;
 try{m=makeTravelModel()}catch(e){summary.textContent='計算失敗：'+e.message;svg.replaceChildren();return}
 if(!m){summary.textContent='請檢查降雨量、逕流係數、流速與降雨歷時。';svg.replaceChildren();showValidation(null,0);return}
 showValidation(m,travelModel?m.maxHours*travelStep/100:0);
 const altDuration=m.duration===1?24:1;
 const other={...m,duration:altDuration,maxHours:Math.max(...m.entries.map(e=>e.hours))+altDuration};
 const xmax=Math.max(m.maxHours,other.maxHours);
 const events=new Set([0,xmax]);
 for(const model of [m,other])for(const e of model.entries){events.add(e.hours);events.add(e.hours+model.duration)}
 const sorted=[...events].filter(t=>t>=0&&t<=xmax).sort((a,b)=>a-b);
 const series=model=>{
  const pts=[[0,hydrographAt(model,0)]];
  for(let i=0;i<sorted.length-1;i++){
   const t=sorted[i],next=sorted[i+1],q=hydrographAt(model,(t+next)/2);
   pts.push([t,q],[next,q]);
  }
  return pts;
 };
 const a=series(m),b=series(other), ymax=Math.max(1,...a.map(p=>p[1]),...b.map(p=>p[1]));
 const W=620,H=240,left=64,right=16,top=16,bottom=42;
 const X=t=>left+t/xmax*(W-left-right),Y=q=>H-bottom-q/ymax*(H-top-bottom);
 const path=pts=>pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(2)+' '+Y(p[1]).toFixed(2)).join(' ');
 const ns='http://www.w3.org/2000/svg';
 svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('role','img');
 svg.setAttribute('aria-label','降雨歷時 '+m.duration+' 小時與 '+altDuration+' 小時的理想化流量歷線比較');
 const element=(tag,attrs,parent=svg)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));parent.appendChild(e);return e};
 const label=(x,y,value,anchor='middle')=>{const e=element('text',{x,y,'text-anchor':anchor,fill:'#273849','font-size':12});e.textContent=value};
 for(let i=0;i<=4;i++){const q=ymax*i/4,y=Y(q);element('line',{x1:left,y1:y,x2:W-right,y2:y,stroke:'#dbe3e8'});label(left-7,y+4,q.toLocaleString('zh-TW',{maximumFractionDigits:1}),'end')}
 for(let i=0;i<=4;i++){const t=xmax*i/4,x=X(t);label(x,H-20,t.toFixed(1))}
 element('path',{d:path(b),fill:'none',stroke:'#d97706','stroke-width':2,'stroke-dasharray':'6 4'});
 element('path',{d:path(a),fill:'none',stroke:'#0869a3','stroke-width':3});
 const cursor=m.maxHours*travelStep/100;
 if(travelModel){element('line',{x1:X(cursor),x2:X(cursor),y1:top,y2:H-bottom,stroke:'#a32047','stroke-width':2})}
 label(W/2,H-4,'模擬時間（小時）');
 label(left,12,'流量（m³/s）','start');
 const peak=model=>Math.max(0,...series(model).map(p=>p[1]));
 summary.textContent='藍線：目前 '+m.duration+' 小時（最高示意流量 '+peak(m).toFixed(2)+' m³/s）；橘色虛線：對照 '+altDuration+' 小時（'+peak(other).toFixed(2)+' m³/s）。同一總雨量、同一流速及集水區，僅改變降雨歷時。曲線為理想化矩形脈衝疊加，不是實際洪水歷線。';
}

function paintTravel(){
 if(!travelModel)return;
 const m=travelModel,elapsed=m.maxHours*travelStep/100;
 let arrived=0,discharge=0,started=0,completed=0;
 const active=new Set();
 for(const e of m.entries){
  const fraction=Math.max(0,Math.min(1,(elapsed-e.hours)/m.duration));
  arrived+=e.volume*fraction;
  if(elapsed>=e.hours&&elapsed<e.hours+m.duration){discharge+=e.volume/(m.duration*3600);active.add(e.id)}
  if(fraction>0)started++;
  if(fraction>=1)completed++;
 }
 for(const [id,r] of reaches)r.layer.setStyle(active.has(id)?{color:'#008b83',weight:5,opacity:1}:id===m.target?{color:'#f59e0b',weight:6,opacity:1}:styleOff);
 const fmt=n=>Math.round(n).toLocaleString('zh-TW');
 showValidation(m,elapsed);drawHydrograph();
 travelMessage('目標河段：'+m.target+'（下游端）\n均勻降雨歷時：'+m.duration+' 小時；固定流速：'+m.speed+' m/s\n模擬時間：'+elapsed.toFixed(2)+' 小時 / '+m.maxHours.toFixed(2)+' 小時\n開始到達：'+started+'；完全到達：'+completed+' / '+m.entries.length+' 個局部集水區\n累積到達體積：約 '+fmt(arrived)+' / '+fmt(m.total)+' m³\n目標端瞬時示意流量：約 '+discharge.toLocaleString('zh-TW',{maximumFractionDigits:2})+' m³/s\n假設降雨均勻且逕流同步等速入河，形成持續 '+m.duration+' 小時的矩形入流；沿河固定流速平移。忽略地表延遲、河道蓄水、擴散、坡度及水力回饋。流量曲線僅供概念教學，不是實測、洪峰或洪水預報。');
}
function travelTick(){
 if(!travelModel)return;
 if(travelStep>=100){stopTravel();paintTravel();return}
 travelStep=Math.min(100,travelStep+2);paintTravel();
}
function toggleTravel(){
 if(travelRunning){stopTravel();return}
 if(!travelModel||travelStep>=100){
  try{travelModel=makeTravelModel()}catch(e){travelMessage('模型資料錯誤：'+e.message);return}
  travelStep=0;
 }
 if(!travelModel){travelMessage('請先載入候選河網，並確認流速、降雨與逕流係數設定有效。');return}
 const check=validateModel(travelModel);
 if(!check.pass){travelMessage('水量守恆檢查失敗：'+check.reason);showValidation(travelModel,0);return}
 stopAnimation(true);
 travelRunning=true;$('travelToggle').textContent='暫停傳遞示意 / Pause';
 paintTravel();
 travelTimer=setInterval(travelTick,120);
}

function demo(){
 const p={a:[25.17,121.44],b:[25.16,121.49],c:[25.13,121.53],d:[25.20,121.57],e:[25.09,121.59],f:[25.22,121.61]};
 const lines=[['A','示範主流',[p.a,p.b]],['B','示範主流',[p.b,p.c]],['C','示範支流',[p.b,p.d]],['D','示範主流',[p.c,p.e]],['E','示範支流',[p.d,p.f]]];
 resetLayers();source='demo';for(const [id,name,coords] of lines){const line=L.polyline(coords,styleOff).bindTooltip(name).on('click',()=>select(id)).addTo(group);reaches.set(id,{layer:line,name})}
 index={reaches:{A:{upstream_ids:['B','C','D','E'],length_km:0},B:{upstream_ids:['D','E'],length_km:0},C:{upstream_ids:[],length_km:0},D:{upstream_ids:[],length_km:0},E:{upstream_ids:[],length_km:0}}};
 $('mode').value='upstream';map.fitBounds(group.getBounds());status('已載入虛構示範河網。');
}
async function load(){
 const token=++generation;$('load').disabled=true;resetLayers();
 try{const mode=$('source').value;if(mode==='demo')demo();else if(mode==='network')await network(token);else await real(token)}
 catch(e){if(token===generation){resetLayers();status('載入失敗：'+e.message+'。可改選虛構示範模式。');console.error('P136 load error',e)}}
 finally{if(token===generation)$('load').disabled=false}
}
$('source').addEventListener('change',load);$('load').addEventListener('click',load);
$('mode').addEventListener('change',()=>{if(selected)select(selected)});
$('reset').addEventListener('click',()=>{stopTravel(true);stopAnimation(true);selected=null;for(const r of reaches.values())r.layer.setStyle(styleOff);status('已清除選取。')});
$('showBase').addEventListener('change',e=>e.target.checked?base.addTo(map):map.removeLayer(base));
$('rainfallMm').addEventListener('input',()=>{stopTravel(true);updateRainfall();drawHydrograph();if(animationStep>=0)paintAnimation()});$('runoffCoefficient').addEventListener('input',()=>{stopTravel(true);updateRainfall();drawHydrograph();if(animationStep>=0)paintAnimation()});
$('animationToggle').addEventListener('click',toggleAnimation);
$('travelToggle').addEventListener('click',toggleTravel);
$('travelRestart').addEventListener('click',()=>{stopTravel(true);for(const v of reaches.values())v.layer.setStyle(styleOff);travelMessage('已重設，請按播放。')});
$('assumedVelocity').addEventListener('change',()=>{stopTravel(true);travelMessage('流速已變更，請重新播放。');drawHydrograph()});
$('rainDuration').addEventListener('change',()=>{stopTravel(true);travelMessage('降雨歷時已變更，請重新播放。');drawHydrograph()});
$('animationRestart').addEventListener('click',()=>{stopAnimation(true);animationMessage('已重設動畫；按播放開始。')});
$('animationSpeed').addEventListener('change',()=>{if(animationRunning){stopAnimation();toggleAnimation()}});
$('region').disabled=true;$('region').title='使用已發布的固定河網資料集';
load();
