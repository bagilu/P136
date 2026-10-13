'use strict';
const $=id=>document.getElementById(id);
const map=L.map('map',{preferCanvas:true}).setView([25.10,121.48],10);
const base=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);
const group=L.featureGroup().addTo(map);
const styleOff={color:'#85c7e7',weight:3,opacity:.85},styleOn={color:'#0476ba',weight:5,opacity:1};
let reaches=new Map(), selected=null, source='', index=null, generation=0;
function status(message){$('info').textContent=message}
async function json(path,timeout=12000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{const response=await fetch(path,{signal:controller.signal});if(!response.ok)throw Error(path+' HTTP '+response.status);return await response.json()}
 catch(e){throw Error(e.name==='AbortError'?'逾時：'+path:e.message)}
 finally{clearTimeout(timer)}
}
function resetLayers(){group.clearLayers();reaches.clear();selected=null;index=null}
function select(id){
 selected=id;const r=reaches.get(id);if(!r)return;
 const mode=$('mode').value,active=new Set([id]);
 if(mode==='name'){for(const [key,v] of reaches)if(v.name===r.name&&r.name!=='未命名')active.add(key)}
 if(mode==='upstream'&&index){for(const x of index.reaches[id].upstream_ids)active.add(x)}
 let km=0;
 for(const [key,v] of reaches){v.layer.setStyle(active.has(key)?styleOn:styleOff);if(active.has(key)&&index?.reaches[key])km+=index.reaches[key].length_km}
 status('選取 '+active.size+' 個河段'+(index?'；河道總長約 '+km.toFixed(1)+' km':'')+'。'+(source==='network'?'上游拓樸為候選資料；流域邊界與集水面積尚未驗證。':'目前不是已驗證的河網拓樸。'));
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
 status('步驟 3/3：繪製河網…');
 render(g.features,'network');index=idx;$('mode').value='upstream';
 status('已載入 '+reaches.size+' 個河段，預先計算的上游索引已就緒。點選河道開始探索；流域邊界尚未驗證。');
}
async function real(token){
 status('正在讀取已發布的靜態河道…');
 const [g,m,v]=await Promise.all([json('data/published/tamsui.geojson?v=0.004'),json('data/published/manifest.json?v=0.004'),json('data/published/validation-report.json?v=0.004')]);
 if(token!==generation)return;
 if(g.features?.length!==m.feature_count||v.status!=='GEOMETRY_PASS_TOPOLOGY_UNVERIFIED')throw Error('靜態資料驗證失敗');
 render(g.features,'real');$('mode').value='single';status('已載入 '+reaches.size+' 段河道；未驗證上下游拓樸。');
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
$('reset').addEventListener('click',()=>{selected=null;for(const r of reaches.values())r.layer.setStyle(styleOff);status('已清除選取。')});
$('showBase').addEventListener('change',e=>e.target.checked?base.addTo(map):map.removeLayer(base));
$('region').disabled=true;$('region').title='使用已發布的固定河網資料集';
load();
