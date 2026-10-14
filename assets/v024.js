'use strict';
const $=id=>document.getElementById(id);
const map=L.map('map',{preferCanvas:true,zoomAnimation:false}).setView([25.10,121.48],10);
const base=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);
const group=L.featureGroup().addTo(map);
const styleOff={color:'#85c7e7',weight:3,opacity:.85},styleOn={color:'#0476ba',weight:5,opacity:1};
let reaches=new Map(), selected=null, source='', index=null, areaIndex=null, generation=0;
let routing=null,animationTimer=null,animationStep=-1,animationRunning=false;
let travelTimer=null,travelStep=0,travelRunning=false,travelModel=null;
const nodeMarkers=L.layerGroup().addTo(map);
let nodeItems=[];
let riverCatalog=null;
const currentRiver=()=>riverCatalog?.rivers?.find(r=>r.river_id===$('river').value);
const outletId=()=>currentRiver()?.outlet_reach_id||'40962896';
function status(message){$('info').textContent=message}
async function json(path,timeout=12000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{const response=await fetch(path,{signal:controller.signal});if(!response.ok)throw Error(path+' HTTP '+response.status);return await response.json()}
 catch(e){throw Error(e.name==='AbortError'?'逾時：'+path:e.message)}
 finally{clearTimeout(timer)}
}
function resetLayers(){nodeMarkers.clearLayers();nodeItems=[];const panel=$('nodeList');if(panel)panel.replaceChildren();const note=$('nodeStatus');if(note)note.textContent='請載入候選河網 / Load a candidate network.';stopTravel(true);stopAnimation(true);routing=null;group.clearLayers();reaches.clear();selected=null;index=null;areaIndex=null;rainfallStatus('請先載入 HydroRIVERS 河網。');drawHydrograph();showValidation(null,0)}
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
 const entry=currentRiver();
 if(!entry?.network_geojson)throw Error('河流資料尚未發布 / Dataset unavailable');
 const lanyang=entry.river_id==='P136-R-LANYANG';
 const dir=lanyang?'data/candidates/lanyang/':'data/published/';
 const name=lanyang?'蘭陽溪候選河網 / Lanyang candidate':'淡水河候選河網 / Tamsui candidate';
 status('正在讀取 / Loading '+name);
 const [g,m,v,idx,area,ar]=await Promise.all([
  json(entry.network_geojson+'?v=0.0181'),
  json(dir+(lanyang?'network-manifest.json':'tamsui-network-manifest.json')+'?v=0.0181'),
  json(dir+(lanyang?'network-validation.json':'tamsui-network-validation.json')+'?v=0.0181'),
  json(entry.network_index+'?v=0.0181'),
  json(entry.area_index+'?v=0.0181'),
  json(dir+(lanyang?'area-validation.json':'tamsui-area-validation.json')+'?v=0.0181')
 ]);
 if(token!==generation)return;
 if(g.type!=='FeatureCollection'||!Array.isArray(g.features)||g.features.length!==m.feature_count||v.feature_count!==m.feature_count||m.validation_status!=='TOPOLOGY_PASS_BOUNDARY_PRELIMINARY'||v.status!==m.validation_status||m.published_sha256!==v.output_sha256||m.dataset_id!==entry.dataset_id||m.basin_boundary_verified!==false)throw Error('河網與來源驗證不一致 / Network provenance mismatch');
 if(idx.source_feature_count!==g.features.length||idx.boundary_verified!==false||Object.keys(idx.reaches).length!==g.features.length)throw Error('上游索引版本不一致 / Index mismatch');
 if(area.feature_count!==g.features.length||ar.feature_count!==g.features.length||area.network_sha256!==m.published_sha256||area.source_sha256!==m.source_sha256||ar.status!=='AREA_SOURCE_EXTRACTED_BOUNDARY_UNVERIFIED'||area.basin_boundary_verified!==false||ar.basin_boundary_verified!==false||Object.keys(area.reaches).length!==g.features.length)throw Error('集水面積驗證不一致 / Area validation mismatch');
 for(const f of g.features){
  const id=String(f.properties.id);
  if(!idx.reaches[id]||!Array.isArray(idx.reaches[id].upstream_ids)||!area.reaches[id]||!Number.isFinite(area.reaches[id].local_area_km2)||!Number.isFinite(area.reaches[id].upstream_area_km2))throw Error('河段索引或面積缺失 / Missing reach '+id);
 }
 render(g.features,'network');index=idx;areaIndex=area;$('mode').value='upstream';
 routing=makeRouting(g.features);
 travelMessage('選擇河段後，可試算概念性流速。 / Select a reach for conceptual travel-time modeling.');
 status('已載入 '+reaches.size+' 個河段 / '+reaches.size+' reaches loaded — '+name+'。拓樸通過，流域邊界未驗證 / Topology passed; basin boundary unverified. '+(lanyang?'僅供候選預覽 / Candidate preview only.':''));
 addCandidateOutlet(g.features);updateRainfall();drawHydrograph();
 animationMessage('準備就緒 / Ready: topology animation, not real-time flow.');
}
async function real(token){
 if($('river').value!=='P136-R-TAMSUI')throw Error('蘭陽溪尚無獨立單線資料 / No single-line Lanyang dataset; choose network mode');
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
 const id=selected||outletId(),area=areaIndex.reaches[id];
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
 const target=selected||outletId();
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
 el.textContent=(v.pass?'PASS — 水量守恆檢查通過':'FAIL — '+v.reason)+'\n總產生逕流：'+fmt(model.total)+' m³\n已到達：'+fmt(b.arrived)+' m³\n尚未到達：'+fmt(b.remaining)+' m³\n守恆殘差：'+fmt(b.residual)+' m³\n流量積分殘差：'+fmt(b.integrationResidual)+' m³\n檢查點：'+(v.checked||0)+'；最大數值殘差：'+fmt(v.worst||0)+' m³\n僅驗證簡化模型的內部數值一致性，不代表水文或流域資料已通過實測驗證。';
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


function focusUpstreamNode(id){
 if(!index?.reaches[id]||!reaches.has(id))return;
 $('mode').value='upstream';select(id);
 const selectedLayers=[reaches.get(id).layer,...index.reaches[id].upstream_ids.map(x=>reaches.get(x)?.layer).filter(Boolean)];
 if(selectedLayers.length){const b=L.featureGroup(selectedLayers).getBounds();if(b.isValid())map.fitBounds(b.pad(.08),{maxZoom:11})}
}
function addCandidateOutlet(features){
 nodeMarkers.clearLayers();nodeItems=[];
 const list=$('nodeList');if(list)list.replaceChildren();
 const entry=currentRiver();
 if(!entry||source!=='network'||!index)return;
 const byId=new Map(features.map(f=>[String(f.properties.id),f]));
 const children=new Map([...byId.keys()].map(id=>[id,[]]));
 for(const f of features){
  const dn=f.properties.downstream_id;
  if(dn!==null&&children.has(String(dn)))children.get(String(dn)).push(String(f.properties.id));
 }
 const outlet=byId.get(entry.outlet_reach_id);
 if(!outlet)return;
 const candidates=[{id:entry.outlet_reach_id,type:'outlet',count:features.length}];
 // A confluence is a downstream reach with two or more direct upstream reaches.
 // Rank by transitive upstream reach count; this is a visual discovery heuristic,
 // not a claim that the node belongs to a named tributary.
 const junctions=[...children].filter(([id,up])=>up.length>=2&&id!==entry.outlet_reach_id)
  .map(([id,up])=>({id,type:'confluence',count:index.reaches[id]?.upstream_ids.length||0}))
  .sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id));
 for(const candidate of junctions){
  if(candidates.length>=7)break;
  if(candidate.count<5)continue;
  candidates.push(candidate);
 }
 const title=(node,i)=>node.type==='outlet'
  ?entry.name_zh+'河口候選節點 / '+entry.name_en+' outlet candidate'
  :'交會點候選 '+i+' / Confluence candidate '+i;
 const info=$('nodeStatus');
 if(info)info.textContent='依河網拓樸識別 '+(candidates.length-1)+' 個主要交會點候選；節點位置、河名與流域邊界未獨立驗證。 / '+(candidates.length-1)+' topology-derived junction candidates; positions, tributary names and basin boundaries are unverified.';
 candidates.forEach((node,i)=>{
  const f=byId.get(node.id);if(!f)return;
  // A reach endpoint is only an approximate marker location; flow-direction
  // orientation has not been independently verified.
  const coords=f.geometry?.coordinates;const p=coords?.[coords.length-1];
  if(!p||!Number.isFinite(p[0])||!Number.isFinite(p[1]))return;
  const label=title(node,i),marker=L.circleMarker([p[1],p[0]],{radius:node.type==='outlet'?10:8,color:'#006d9c',fillColor:'#0a9ad0',fillOpacity:.24,weight:2});
  marker.bindTooltip(label,{permanent:node.type==='outlet',direction:'top',offset:[0,-10]});
  const popup=document.createElement('div');
  const heading=document.createElement('strong');heading.textContent=label;popup.appendChild(heading);
  const p1=document.createElement('p');p1.textContent='拓樸候選節點，非經測繪確認的精確匯流位置。 / Topology-derived candidate; not a surveyed confluence.';popup.appendChild(p1);
  const btn=document.createElement('button');btn.type='button';btn.textContent='顯示上游支流 / Show Upstream Network';
  btn.addEventListener('click',()=>{focusUpstreamNode(node.id);marker.closePopup()});popup.appendChild(btn);
  marker.bindPopup(popup);marker.addTo(nodeMarkers);
  if(list){
   const button=document.createElement('button');button.type='button';button.textContent=label+' · '+node.count+' 河段 / reaches';
   button.addEventListener('click',()=>{focusUpstreamNode(node.id);marker.openPopup()});
   list.appendChild(button);
  }
  nodeItems.push({id:node.id,type:node.type,label});
 });
}
async function initRiverCatalog(){
 try{
  const catalog=await json('data/catalog/rivers.json?v=0.0181');
  if(catalog.schema_version!=='0.018.1'||!Array.isArray(catalog.rivers)||!catalog.rivers.length)throw Error('Invalid river catalog');
  riverCatalog=catalog;
  const control=$('river');control.replaceChildren();
  for(const river of catalog.rivers){
   const option=document.createElement('option');option.value=river.river_id;
   option.textContent=river.name_zh+' / '+river.name_en+(river.publication_status==='CANDIDATE_PREVIEW_TOPOLOGY_PASS_BOUNDARY_UNVERIFIED'?' — 候選預覽 / Candidate Preview':river.boundary_verified?'':' — 候選 / Preliminary');
   option.disabled=!river.network_geojson;
   control.appendChild(option);
  }
 }catch(e){$('riverCatalogStatus').textContent='目錄讀取失敗 / Catalog unavailable: '+e.message;return}
 $('riverCatalogStatus').textContent='蘭陽溪已提供 178 河段候選預覽，尚未驗證流域邊界與河流身分。 / Lanyang: 178-reach candidate preview; basin boundary and river identity are not independently verified.';
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
$('nodeFullNetwork').addEventListener('click',()=>{stopTravel(true);stopAnimation(true);selected=null;for(const r of reaches.values())r.layer.setStyle(styleOff);if(group.getLayers().length)map.fitBounds(group.getBounds(),{maxZoom:11});updateRainfall();drawHydrograph();status('已返回完整河網 / Full river network restored.')});
$('river').addEventListener('change',()=>{if($('river').value==='P136-R-LANYANG'&&$('source').value==='real')$('source').value='network';load()});
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
initOverview();


/* V0.023 Taiwan overview: three candidate networks coexist; only user gestures change the viewport after initial fit. */
const overviewDatasets=new Map(),overviewLayers=new Map();
const overviewOutletMarkers=L.layerGroup().addTo(map);
const registryReferenceMarkers=L.layerGroup().addTo(map);
// Outlet pulses must use SVG even though the river network uses Canvas for performance.
const overviewOutletSvgRenderer=L.svg({padding:.5});
const styleSelected={color:'#e0a01b',weight:7,opacity:1};
const styleDownstream={color:'#d94848',weight:5,opacity:1};
let overviewActive=null;
let overviewHistory=[];
function overviewStyle(active=false){return active?styleOn:styleOff}
function overviewClearHighlights(keepHistory=false){
 if(!keepHistory)overviewHistory=[];
 stopTravel(true);stopAnimation(true);
 overviewActive=null;selected=null;
 const metrics=$('overviewMetrics');if(metrics)metrics.textContent='請點選河口或河段 / Select an outlet or reach.';
 for(const v of overviewLayers.values())v.layer.setStyle(styleOff);
 for(const m of overviewOutletMarkers.getLayers())m.setStyle({color:'#087bb4',fillOpacity:.28});
 status('完整河網 / All available candidate river networks. 點選河口圓點探索上游 / Select a river-mouth marker.');
 const label=$('overviewSelection');if(label)label.textContent='尚未選取河流 / No river selected';
}
function overviewDownstream(data,target){
 const result=new Set(),seen=new Set([target]);
 let id=target;
 // NEXT_DOWN chain is directional. Stop on a missing link, a terminal reach,
 // or a cycle; never cross into another river dataset.
 while(true){
  const next=data.routing.downstream.get(id);
  if(next===null||next===undefined||!data.reaches.has(next)||seen.has(next))break;
  result.add(next);seen.add(next);id=next;
 }
 return result;
}
function overviewMetrics(data,target,upstream,downstream){
 const length=id=>Number(data.idx.reaches[id]?.length_km);
 const sum=ids=>{let n=0;for(const id of ids){const v=length(id);if(!Number.isFinite(v)||v<0)return null;n+=v}return n};
 const area=Number(data.area.reaches[target]?.upstream_area_km2);
 return {upstreamCount:upstream.size-1,downstreamCount:downstream.size,
  upstreamKm:sum([...upstream].filter(id=>id!==target)),
  selectedKm:sum([target]),downstreamKm:sum(downstream),
  upstreamAreaKm2:Number.isFinite(area)&&area>=0?area:null};
}
function overviewShowMetrics(data,target,upstream,downstream){
 const el=$('overviewMetrics');if(!el)return;
 const m=overviewMetrics(data,target,upstream,downstream);
 const km=n=>n===null?'資料不足 / unavailable':n.toLocaleString('zh-TW',{maximumFractionDigits:1})+' km';
 const area=n=>n===null?'資料不足 / unavailable':n.toLocaleString('zh-TW',{maximumFractionDigits:1})+' km²';
 el.textContent='上游河網總長 / Total upstream network length：'+km(m.upstreamKm)+' ('+m.upstreamCount+' 河段 / reaches)\n'
 +'選取河段長度 / Selected reach length：'+km(m.selectedKm)+'\n'
 +'下游路徑長度 / Downstream route length：'+km(m.downstreamKm)+' ('+m.downstreamCount+' 河段 / reaches)\n'
 +'上游累積集水面積（來源初估） / Source-estimated upstream catchment area：'+area(m.upstreamAreaKm2)+'\n'
 +'注意：上游總長為各分支加總，並非河口距離；面積與河口位置尚未獨立驗證。 / Upstream length sums branches, not distance to outlet; catchment area and outlet position remain unverified.';
}
function overviewHighlight(riverId,target,back=false){
 const data=overviewDatasets.get(riverId);if(!data||!data.idx.reaches[target])return;
 if(!back)overviewHistory.push({riverId,target});
 overviewClearHighlights(true);
 overviewActive=riverId;selected=target;index=data.idx;areaIndex=data.area;routing=data.routing;source='network';
 $('river').value=riverId;$('source').value='network';$('mode').value='upstream';
 reaches=data.reaches;
 const active=new Set([target,...data.idx.reaches[target].upstream_ids]);
 const downstream=overviewDownstream(data,target);
 overviewShowMetrics(data,target,active,downstream);
 for(const [key,v] of overviewLayers){
  const own=key.startsWith(riverId+':'),id=own?key.slice(riverId.length+1):null;
  v.layer.setStyle(own&&id===target?styleSelected:own&&downstream.has(id)?styleDownstream:own&&active.has(id)?styleOn:styleOff);
 }
 const entry=data.entry;
 const name=entry.name_zh+' / '+entry.name_en;
 status(name+' — 上游 '+(active.size-1)+' 河段 / upstream reaches; 選取河段 1 / selected reach; 下游 '+downstream.size+' 河段 / downstream reaches. 流域邊界尚未驗證 / Basin boundary unverified.');
 const label=$('overviewSelection');if(label)label.textContent=name+' · 上游 '+(active.size-1)+' / upstream · 下游 '+downstream.size+' / downstream';
 updateRainfall();drawHydrograph();
 for(const m of overviewOutletMarkers.getLayers())if(m.options.p136RiverId===riverId)m.setStyle({color:'#054b80',fillOpacity:.68});
 const note=$('overviewNodeNote');if(note)note.textContent='點選深藍色支流河道可繼續追溯上游 / Click a highlighted tributary reach to trace further upstream.';
 overviewUpdateHistory();
}
function overviewUpdateHistory(){const b=$('overviewBack');if(b)b.disabled=overviewHistory.length<2;const c=$('overviewPath');if(c)c.textContent=overviewHistory.map((x,i)=>i===0?(overviewDatasets.get(x.riverId)?.entry.name_zh||x.riverId):('河段 '+x.target)).join(' › ')}
function overviewGoBack(){if(overviewHistory.length<2)return;overviewHistory.pop();const x=overviewHistory[overviewHistory.length-1];overviewHighlight(x.riverId,x.target,true)}
async function overviewFetch(entry){
 const fields=['network_geojson','network_manifest','network_validation','network_index','area_index','area_validation'];
 for(const field of fields){
  const value=entry[field];
  if(typeof value!=='string'||!value.startsWith('data/')||value.includes('..')||!/^data\/[a-zA-Z0-9_./-]+\.(?:json|geojson)$/.test(value))throw Error(entry.name_en+' invalid catalog path: '+field);
 }
 const [geo,manifest,validation,idx,area,areaValidation]=await Promise.all(fields.map(field=>json(entry[field]+'?v=0.024.2')));
 if(!Array.isArray(geo.features)||geo.features.length!==manifest.feature_count||validation.feature_count!==geo.features.length||manifest.published_sha256!==validation.output_sha256||manifest.validation_status!=='TOPOLOGY_PASS_BOUNDARY_PRELIMINARY'||manifest.dataset_id!==entry.dataset_id||manifest.basin_boundary_verified!==false||idx.source_feature_count!==geo.features.length||area.feature_count!==geo.features.length||area.network_sha256!==manifest.published_sha256||area.source_sha256!==manifest.source_sha256||areaValidation.status!=='AREA_SOURCE_EXTRACTED_BOUNDARY_UNVERIFIED'||areaValidation.basin_boundary_verified!==false)throw Error(entry.name_en+' provenance mismatch');
 for(const f of geo.features){const id=String(f.properties.id);if(!idx.reaches[id]||!area.reaches[id])throw Error('Missing indexed reach '+id)}
 if(!idx.reaches[entry.outlet_reach_id])throw Error('Missing candidate outlet reach '+entry.outlet_reach_id);
 if(entry.river_id==='P136-R-HUALIEN'&&(geo.features.length!==218||entry.publication_status!=='CANDIDATE_PREVIEW_TOPOLOGY_PASS_GEOGRAPHIC_IDENTITY_UNVERIFIED'))throw Error('Hualien review gate mismatch');
 return {entry,geo,idx,area,routing:makeRouting(geo.features),reaches:new Map()};
}
function overviewOutletPosition(data){
 const feature=data.geo.features.find(f=>String(f.properties.id)===data.entry.outlet_reach_id);
 if(!feature)return null;
 const c=feature.geometry.coordinates;
 // Candidate geometry endpoint, not surveyed outlet. No claim of flow-direction precision.
 return c?.length?c[c.length-1]:null;
}
function overviewMarkers(){
 overviewOutletMarkers.clearLayers();
 for(const data of overviewDatasets.values()){
  const p=overviewOutletPosition(data);if(!p)continue;
  // At the national scale only the available major candidate river systems are labeled.
  // More rivers can be added only after quality-gated publication.
  const label=data.entry.name_zh+' / '+data.entry.name_en;
  const marker=L.circleMarker([p[1],p[0]],{renderer:overviewOutletSvgRenderer,radius:10,color:'#087bb4',fillColor:'#0c9dc9',fillOpacity:.28,weight:2,p136RiverId:data.entry.river_id,className:'p136-outlet-pulse'});
  marker.bindTooltip(label,{permanent:true,direction:'right',offset:[12,0],className:'p136-outlet-label'});
  marker.on('click',event=>{if(event.originalEvent){L.DomEvent.stopPropagation(event.originalEvent);L.DomEvent.preventDefault(event.originalEvent)}overviewHighlight(data.entry.river_id,data.entry.outlet_reach_id)});
  marker.addTo(overviewOutletMarkers);
  if(overviewActive===data.entry.river_id)marker.setStyle({color:'#054b80',fillOpacity:.68});
 }
 // Branch candidates appear only after choosing a system, regardless of zoom.
}
function renderRegistryReferenceMarkers(entries){
 registryReferenceMarkers.clearLayers();
 for(const entry of entries){
  const p=entry.reference_point;
  if(!p||entry.network_geojson||!Number.isFinite(p.lon)||!Number.isFinite(p.lat))continue;
  const marker=L.circleMarker([p.lat,p.lon],{renderer:overviewOutletSvgRenderer,radius:5,color:'#53687a',weight:1.5,fillColor:'#fff',fillOpacity:.9});
  marker.bindTooltip(entry.name_zh+' / '+entry.name_en+' · 參考位置 / Reference only',{direction:'top'});
  marker.bindPopup('<strong>'+entry.name_zh+' / '+entry.name_en+'</strong><p>參考位置，非實測河口；河網尚未建置。 / Reference location, not a surveyed outlet. Network pending.</p>');
  marker.addTo(registryReferenceMarkers);
 }
}
function renderRiverRegistry(entries){
 const list=$('riverRegistryList'),summary=$('riverRegistrySummary');if(!list||!summary)return;
 list.replaceChildren();
 const active=entries.filter(r=>r.network_geojson&&r.outlet_reach_id).length;
 const referenced=entries.filter(r=>r.reference_point&&!r.network_geojson).length;
 summary.textContent=entries.length+' 條已登錄 / registered · '+active+' 條候選河網 / candidate networks · '+(entries.length-active)+' 條待建置 / awaiting network · '+referenced+' 處參考位置 / reference points';
 for(const r of entries){
  const ready=!!(r.network_geojson&&r.outlet_reach_id),referenced=!!r.reference_point;
  const btn=document.createElement('button');
  btn.type='button';btn.style.cssText='text-align:left;margin:0;padding:7px 9px;font-size:12px;line-height:1.4;white-space:normal;background:'+(ready?'#e6f4fa':'#f4f5f6')+';color:#18344a;border:1px solid #c7d4dc;border-radius:6px;cursor:'+(ready?'pointer':'default');
  const title=document.createElement('strong');title.textContent=r.name_zh+' / '+r.name_en;
  const status=document.createElement('span');status.style.cssText='display:block;font-size:11px;color:#37596a';status.textContent=ready?'候選河網可探索 · 河口及流域未驗證 / Explore candidate · geography unverified':referenced?'已定位參考點（非實測河口）· 河網待建 / Reference only · network pending':'已登錄 · 河口未定位 · 河網待建 / Registered · outlet unlocated · network pending';
  btn.append(title,status);
  if(ready){btn.addEventListener('click',()=>overviewHighlight(r.river_id,r.outlet_reach_id))}
  else{btn.disabled=true;btn.style.opacity='.8'}
  list.append(btn);
 }
}
async function initOverview(){
 try{
  const catalog=await json('data/catalog/rivers.json?v=0.024.2');
  if(!Array.isArray(catalog.rivers))throw Error('Invalid catalog');
  riverCatalog=catalog;
  renderRiverRegistry(catalog.rivers);
  renderRegistryReferenceMarkers(catalog.rivers);
  const available=catalog.rivers.filter(x=>x.network_geojson&&x.outlet_reach_id);
  // Every candidate must pass the same provenance gate before any geometry is displayed.
  const datasets=await Promise.all(available.map(overviewFetch));
  for(const data of datasets){
   overviewDatasets.set(data.entry.river_id,data);
   for(const f of data.geo.features){
    const id=String(f.properties.id),key=data.entry.river_id+':'+id;
    const line=L.polyline(f.geometry.coordinates.map(p=>[p[1],p[0]]),styleOff);
    line.on('click',event=>{if(event.originalEvent){L.DomEvent.stopPropagation(event.originalEvent);L.DomEvent.preventDefault(event.originalEvent)}overviewHighlight(data.entry.river_id,id)});
    line.addTo(group);const record={layer:line,name:data.entry.name_zh};data.reaches.set(id,record);overviewLayers.set(key,record);
   }
  }
  // Fit the Taiwan overview exactly once on initial load, never on marker selection.
  map.fitBounds([[21.85,120.0],[25.35,122.1]],{padding:[20,20]});
  overviewMarkers();
  map.on('zoomend',overviewMarkers);
  $('reset').addEventListener('click',()=>{overviewClearHighlights();overviewUpdateHistory()});
  $('overviewBack').addEventListener('click',overviewGoBack);
  overviewClearHighlights();
  const total=[...overviewDatasets.values()].reduce((n,d)=>n+d.geo.features.length,0);
  status('臺灣河網總覽 / Taiwan River Overview — '+total+' 河段 / reaches，'+overviewDatasets.size+' 條候選河系 / candidate systems. 點選閃爍河口 / Select a pulsing outlet.');
  $('riverCatalogStatus').textContent='目前可探索 '+available.map(r=>r.name_zh+' / '+r.name_en).join('、')+'；河口與流域邊界未獨立驗證 / Candidate data, unverified outlet positions and basin boundaries.';
  rainfallStatus('請先點選地圖上的河口 / Select a river mouth first.');
 }catch(e){status('總覽載入失敗 / Overview failed: '+e.message);console.error(e)}
}
