'use strict';
const $=id=>document.getElementById(id);
const map=L.map('map',{preferCanvas:true}).setView([25.10,121.48],10);
const base=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);
const group=L.featureGroup().addTo(map);
const styleOff={color:'#85c7e7',weight:3,opacity:.85},styleOn={color:'#0476ba',weight:5,opacity:1};
let reaches=new Map(), selected=null, source='', index=null, areaIndex=null, generation=0;
let routing=null,animationTimer=null,animationStep=-1,animationRunning=false;
function status(message){$('info').textContent=message}
async function json(path,timeout=12000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{const response=await fetch(path,{signal:controller.signal});if(!response.ok)throw Error(path+' HTTP '+response.status);return await response.json()}
 catch(e){throw Error(e.name==='AbortError'?'逾時：'+path:e.message)}
 finally{clearTimeout(timer)}
}
function resetLayers(){stopAnimation(true);routing=null;group.clearLayers();reaches.clear();selected=null;index=null;areaIndex=null;rainfallStatus('請先載入 HydroRIVERS 河網。')}
function select(id){
 stopAnimation(true);selected=id;const r=reaches.get(id);if(!r)return;
 const mode=$('mode').value,active=new Set([id]);
 if(mode==='name'){for(const [key,v] of reaches)if(v.name===r.name&&r.name!=='未命名')active.add(key)}
 if(mode==='upstream'&&index){for(const x of index.reaches[id].upstream_ids)active.add(x)}
 let km=0;
 for(const [key,v] of reaches){v.layer.setStyle(active.has(key)?styleOn:styleOff);if(active.has(key)&&index?.reaches[key])km+=index.reaches[key].length_km}
 const a=areaIndex?.reaches[id];const areaText=a?'；來源累積集水面積約 '+a.upstream_area_km2.toLocaleString('zh-TW')+' km²；本河段局部集水面積約 '+a.local_area_km2.toLocaleString('zh-TW')+' km²':'';
 updateRainfall();
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
 status('已載入 '+reaches.size+' 個河段及集水面積資料。可啟動匯流順序動畫；流域邊界尚未獨立驗證。');
 updateRainfall();animationMessage('準備就緒：動畫依拓樸層級展示匯流順序，不代表真實時間。');
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
 return {depth,max:Math.max(...depth.values())};
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
 if(source!=='network'||!routing||!areaIndex){animationMessage('請先成功載入 HydroRIVERS 河網及集水面積資料。');return}
 if(animationRunning){stopAnimation();animationMessage('已暫停於拓樸階段 '+(animationStep+1)+'。');return}
 if(animationStep>=routing.max)animationStep=-1;
 selected=null;
 animationRunning=true;$('animationToggle').textContent='暫停動畫 / Pause';
 tickAnimation();
 const speed=Number($('animationSpeed').value);
 animationTimer=setInterval(tickAnimation,Math.max(120,1200/speed));
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
$('reset').addEventListener('click',()=>{stopAnimation(true);selected=null;for(const r of reaches.values())r.layer.setStyle(styleOff);status('已清除選取。')});
$('showBase').addEventListener('change',e=>e.target.checked?base.addTo(map):map.removeLayer(base));
$('rainfallMm').addEventListener('input',()=>{updateRainfall();if(animationStep>=0)paintAnimation()});$('runoffCoefficient').addEventListener('input',()=>{updateRainfall();if(animationStep>=0)paintAnimation()});
$('animationToggle').addEventListener('click',toggleAnimation);
$('animationRestart').addEventListener('click',()=>{stopAnimation(true);animationMessage('已重設動畫；按播放開始。')});
$('animationSpeed').addEventListener('change',()=>{if(animationRunning){stopAnimation();toggleAnimation()}});
$('region').disabled=true;$('region').title='使用已發布的固定河網資料集';
load();
