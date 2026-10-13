'use strict';
const map=L.map('map').setView([25.10,121.48],10);
const base=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);
const layer=L.layerGroup().addTo(map),$=id=>document.getElementById(id);
let segments=[],selected=null,kind='real',parents=new Map(),networkVerified=false;
function status(s){$('info').textContent=s}
function lengthKm(coords){let total=0;for(let i=1;i<coords.length;i++){const a=coords[i-1],b=coords[i],r=Math.PI/180,dlat=(b[0]-a[0])*r,dlon=(b[1]-a[1])*r,h=Math.sin(dlat/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dlon/2)**2;total+=6371*2*Math.asin(Math.min(1,Math.sqrt(h)))}return total}
function draw(){layer.clearLayers();const current=segments.find(x=>x.id===selected),active=new Set();
if(current){active.add(current.id);if((kind==='demo'||(kind==='network'&&networkVerified))&&$('mode').value==='upstream'){let again=true;while(again){again=false;for(const [a,b] of parents)if(active.has(b)&&!active.has(a)){active.add(a);again=true}}}else if($('mode').value==='name'&&current.name!=='未命名'){for(const s of segments)if(s.name===current.name)active.add(s.id)}}
for(const s of segments){L.polyline(s.coords,{color:active.has(s.id)?'#0476ba':'#85c7e7',weight:active.has(s.id)?5:3,opacity:.9}).bindTooltip(s.name+' · '+s.id).on('click',()=>{selected=s.id;draw()}).addTo(layer)}
if(current){const km=segments.filter(x=>active.has(x.id)).reduce((n,x)=>n+lengthKm(x.coords),0);const metric=kind==='network'?'；所選河段總長約 '+km.toFixed(1)+' km（河道長度，非集水面積）':'';status(current.name+'：選取 '+active.size+' 段'+metric+'。'+(kind==='real'?'此資料未通過上下游拓樸驗證。':kind==='network'?'HydroRIVERS NEXT_DOWN 拓樸；流域邊界尚未獨立驗證。' :'此為虛構示範。'))}
function demo(){networkVerified=false;kind='demo';selected=null;const p={a:[25.17,121.44],b:[25.16,121.49],c:[25.13,121.53],d:[25.20,121.57],e:[25.09,121.59],f:[25.22,121.61]};segments=[{id:'A',name:'示範主流',coords:[p.a,p.b]},{id:'B',name:'示範主流',coords:[p.b,p.c]},{id:'C',name:'示範支流',coords:[p.b,p.d]},{id:'D',name:'示範主流',coords:[p.c,p.e]},{id:'E',name:'示範支流',coords:[p.d,p.f]}];parents=new Map([['B','A'],['C','A'],['D','B'],['E','B']]);$('mode').value='upstream';draw();map.fitBounds(L.latLngBounds(segments.flatMap(s=>s.coords)));status('虛構河網已載入，僅供拓樸功能測試。')}
async function real(){networkVerified=false;kind='real';selected=null;status('正在讀取 GitHub 靜態資料集…');$('load').disabled=true;
try{const [g,m,r]=await Promise.all(['data/published/tamsui.geojson','data/published/manifest.json','data/published/validation-report.json'].map(u=>fetch(u+'?v=0.004').then(x=>{if(!x.ok)throw Error('資料尚未發布：'+u+' (HTTP '+x.status+')');return x.json()})));
if(g.type!=='FeatureCollection'||!Array.isArray(g.features)||m.validation_status!=='geometry_pass_topology_unverified'||r.status!=='GEOMETRY_PASS_TOPOLOGY_UNVERIFIED'||m.feature_count!==g.features.length||!g.features.length)throw Error('資料清單或驗證報告不一致，拒絕載入');
segments=g.features.filter(f=>f.geometry?.type==='LineString'&&f.geometry.coordinates?.length>1).map(f=>({id:String(f.properties.id),name:f.properties.name||'未命名',coords:f.geometry.coordinates.map(p=>[p[1],p[0]])}));
if(segments.length!==g.features.length)throw Error('幾何資料筆數不一致');
$('mode').value='single';draw();map.fitBounds(L.latLngBounds(segments.flatMap(s=>s.coords)),{maxZoom:11});
status('已載入 '+segments.length+' 段靜態河道。幾何驗證通過；流向與上下游尚未驗證。來源 SHA-256：'+m.source_sha256.slice(0,16)+'…');
}catch(e){segments=[];draw();status('靜態資料尚不可用：'+e.message+'。資料管線完成發布後請重新載入；目前可使用示範模式。')}finally{$('load').disabled=false}}
async function network(){
 kind='network';networkVerified=false;selected=null;status('正在讀取預先驗證的 HydroRIVERS 河網…');$('load').disabled=true;
 try{
 const files=['tamsui-network.geojson','tamsui-network-manifest.json','tamsui-network-validation.json'];
 const [g,m,v]=await Promise.all(files.map(f=>fetch('data/published/'+f+'?v=0.005').then(r=>{if(!r.ok)throw Error('候選資料尚未發布：'+f);return r.json()})));
 if(g.type!=='FeatureCollection'||!Array.isArray(g.features)||g.features.length<10||g.features.length!==m.feature_count||v.feature_count!==m.feature_count||m.validation_status!=='TOPOLOGY_PASS_BOUNDARY_PRELIMINARY'||v.status!==m.validation_status||m.published_sha256!==v.output_sha256||!m.topology_verified)throw Error('驗證紀錄不一致');
 const ids=new Set(g.features.map(f=>String(f.properties.id)));
 if(ids.size!==g.features.length)throw Error('河段編號重複');
 for(const f of g.features){const dn=f.properties.downstream_id;if(dn!==null&&!ids.has(String(dn)))throw Error('存在缺失的下游河段');}
 segments=g.features.map(f=>({id:String(f.properties.id),name:'HydroRIVERS 河段 '+f.properties.id,coords:f.geometry.coordinates.map(p=>[p[1],p[0]])}));
 parents=new Map(g.features.filter(f=>f.properties.downstream_id!==null).map(f=>[String(f.properties.id),String(f.properties.downstream_id)]));
 networkVerified=true;$('mode').value='upstream';draw();map.fitBounds(L.latLngBounds(segments.flatMap(s=>s.coords)),{maxZoom:11});
 status('已載入 '+segments.length+' 段 HydroRIVERS 候選河網。可點選上游追溯；流域邊界尚未獨立驗證。');
 }catch(e){networkVerified=false;segments=[];draw();status('尚無可用的拓樸候選資料：'+e.message+'。請先執行 V0.005 GitHub Actions；V0.004 河道仍可使用。')}
 finally{$('load').disabled=false}
}
function load(){const source=$('source').value;if(source==='demo')demo();else if(source==='network')network();else real();}
$('source').addEventListener('change',load);$('load').addEventListener('click',load);$('mode').addEventListener('change',draw);$('reset').addEventListener('click',()=>{selected=null;draw();status('已清除選取。')});$('showBase').addEventListener('change',e=>e.target.checked?base.addTo(map):map.removeLayer(base));
$('region').disabled=true;$('region').title='V0.005 使用固定版本的北臺灣河網候選資料';load();