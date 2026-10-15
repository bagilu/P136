'use strict';
(()=>{
const $=id=>document.getElementById(id),map=L.map('map',{preferCanvas:true}).setView([23.7,121],8);
const tiles={osm:L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors (ODbL)'}),esri:L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:18,attribution:'Tiles © Esri and imagery providers'})};
let tile=tiles.osm.addTo(map),system=null,active=null,mode='draw',history=[],serial=1,localKey='P136:river-system:v1.2:draft';
const layer=L.layerGroup().addTo(map),markers=L.layerGroup().addTo(map);
function msg(s){$('status').textContent=s}
function good(c){return Array.isArray(c)&&c.length===2&&c.every(Number.isFinite)&&c[0]>=119&&c[0]<=123&&c[1]>=21&&c[1]<=26}
function pt(ll){return [+ll.lng.toFixed(6),+ll.lat.toFixed(6)]}
function newid(kind){return system.id+'-'+kind+String(system.next[kind]++).padStart(kind==='T'?3:4,'0')}
function node(c,type='vertex'){const id=newid('N');system.nodes.push({id,coord:[...c],type});return id}
function findNode(id){return system.nodes.find(n=>n.id===id)}
function branch(){return system?.branches.find(b=>b.id===active)}
function push(){if(system){history.push(JSON.stringify({system,active}));if(history.length>80)history.shift()}}
function newSystem(){
 const name=$('river').value.trim();if(!name){msg('請先填寫河系中文名稱 / Enter river name');return}
 if(system&&!confirm('建立新河系會取代目前工作區，請先匯出備份。繼續？'))return;
 const raw=prompt('請輸入已在河系目錄保留的三位數編號（例如 004）。此版本無法從 GitHub 自動核發全域唯一編號。 / Enter a reserved 3-digit system number (e.g. 004).');
 if(raw===null)return;if(!/^\d{3}$/.test(raw)||raw==='000'){msg('河系編號須為 001–999 / Invalid system ID');return}
 system={id:'P136-R'+raw,name,english:$('englishName').value.trim(),schema_version:'1.2',status:'draft',nodes:[],reaches:[],branches:[{id:'main',name,kind:'mainstream',nodeIds:[]}],outlet:null,next:{N:1,S:1,T:1}};
 active='main';history=[];refresh();msg('河系已建立；請先確認編號未被其他河系使用 / River system created; verify ID reservation');
}
function makeBranch(){if(!system)return msg('請先建立或匯入河系');const name=prompt('支流名稱 / Tributary name');if(!name?.trim())return;
 push();const id=newid('T');system.branches.push({id,name:name.trim(),kind:'tributary',nodeIds:[],connectedTo:null});active=id;setMode('draw');refresh();msg('支流已建立，請由上游向匯流點描繪 / Trace downstream toward confluence')}
function coords(b){return b.nodeIds.map(id=>findNode(id)?.coord).filter(Boolean)}
function rebuild(){
 const prior=new Map(system.reaches.map(r=>[[r.branchId,r.from,r.to].join('|'),r.id]));
 const next=[];for(const b of system.branches){for(let i=1;i<b.nodeIds.length;i++){
 const from=b.nodeIds[i-1],to=b.nodeIds[i],key=[b.id,from,to].join('|');
 next.push({id:prior.get(key)||newid('S'),branchId:b.id,from,to});
 }}system.reaches=next;
}
function change(f){push();f();rebuild();refresh()}
function refresh(){
 $('systemId').value=system?.id||'';$('networkStatus').textContent=system?system.branches.length+' 條河道 / watercourses · '+system.reaches.length+' 河段 / reaches · '+system.nodes.length+' 節點 / nodes':'尚未建立河系 / No river system';
 const sel=$('riverBranch'),old=active;sel.replaceChildren();
 if(system)for(const b of system.branches){const o=document.createElement('option');o.value=b.id;o.textContent=b.kind==='mainstream'?'主流 / Mainstream — '+b.name:'支流 / Tributary — '+b.name;sel.append(o)}
 if(old)sel.value=old;layer.clearLayers();markers.clearLayers();
 if(!system){$('points').textContent='';return}
 for(const b of system.branches){
  const cs=coords(b),selected=b.id===active;
  if(cs.length>=2){const l=L.polyline(cs.map(c=>[c[1],c[0]]),{color:selected?'#e5a027':b.kind==='mainstream'?'#257cb5':'#278e86',weight:selected?5:3,opacity:selected?1:.8}).addTo(layer);
   l.bindTooltip(b.name);
   l.on('click',e=>{if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);if(mode==='connect'&&b.id==='main'){connectAt(e.latlng)}else if(mode==='insert'&&selected){insertAt(e.latlng)}});
  }
  if(selected)for(let i=0;i<b.nodeIds.length;i++){
   const n=findNode(b.nodeIds[i]);if(!n)continue;
   const m=L.circleMarker([n.coord[1],n.coord[0]],{radius:6,color:n.type==='confluence'?'#be5b14':'#175e8b',fillColor:'white',fillOpacity:1,weight:2}).addTo(markers);
   m.bindTooltip('Node '+n.id);
   m.on('click',e=>{if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);if(mode==='delete'){if(n.type==='confluence'||n.type==='outlet')return msg('共同匯流節點或河口不可直接刪除 / Shared node cannot be deleted');change(()=>{b.nodeIds.splice(i,1);if(!system.branches.some(x=>x.nodeIds.includes(n.id)))system.nodes=system.nodes.filter(x=>x.id!==n.id)});msg('節點已刪除')}});
   if(mode==='move'&&n.type!=='confluence'&&n.type!=='outlet'){
    m.on('mousedown',e=>{if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);push();map.dragging.disable();
     const move=ev=>{const c=pt(ev.latlng);if(good(c)){n.coord=c;m.setLatLng(ev.latlng)}};
     const stop=()=>{map.off('mousemove',move);map.off('mouseup',stop);map.dragging.enable();refresh();msg('節點已移動')};
     map.on('mousemove',move);map.on('mouseup',stop);
    });
   }
  }
 }
 if(system.outlet){const n=findNode(system.outlet);if(n)L.circleMarker([n.coord[1],n.coord[0]],{radius:9,color:'#a34516',fillColor:'#f3b452',fillOpacity:.8,weight:3}).bindTooltip('近似出海口 / Approximate outlet').addTo(markers)}
 $('points').textContent='目前河道 / Active: '+(branch()?.name||'')+' · '+(branch()?.nodeIds.length||0)+' 個節點 / nodes';
}
function segmentIndex(b,ll){
 const cs=coords(b),q=map.latLngToLayerPoint(ll);let best=-1,dist=Infinity,point=null;
 for(let i=0;i<cs.length-1;i++){const a=map.latLngToLayerPoint([cs[i][1],cs[i][0]]),z=map.latLngToLayerPoint([cs[i+1][1],cs[i+1][0]]),dx=z.x-a.x,dy=z.y-a.y,t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/(dx*dx+dy*dy||1))),x=a.x+t*dx,y=a.y+t*dy,d=Math.hypot(q.x-x,q.y-y);
 if(d<dist){dist=d;best=i+1;point=pt(map.layerPointToLatLng(L.point(x,y)))}
 }return {index:best,dist,point};
}
function insertAt(ll){const b=branch(),hit=segmentIndex(b,ll);if(hit.index<0||hit.dist>15)return msg('請點選距離河道 15px 以內的位置 / Click near the line');
 change(()=>b.nodeIds.splice(hit.index,0,node(hit.point)));msg('已插入節點 / Node inserted');
}
function connectAt(ll){
 const b=branch(),main=system.branches[0];if(!b||b.kind!=='tributary'||b.nodeIds.length<2)return msg('請先描繪至少兩個支流節點');
 if(b.connectedTo)return msg('此支流已連接；避免重複匯流 / Already connected');
 const hit=segmentIndex(main,ll);if(hit.index<0||hit.dist>15)return msg('請點選主流線條附近 15px 內的位置');
 if(!confirm('確認支流在此匯入主流？系統將建立共同節點。 / Connect tributary to mainstream here?'))return;
 change(()=>{
  const before=findNode(main.nodeIds[hit.index-1]),after=findNode(main.nodeIds[hit.index]);
  const close=n=>Math.hypot(map.latLngToLayerPoint([n.coord[1],n.coord[0]]).x-map.latLngToLayerPoint([hit.point[1],hit.point[0]]).x,map.latLngToLayerPoint([n.coord[1],n.coord[0]]).y-map.latLngToLayerPoint([hit.point[1],hit.point[0]]).y)<8;
  let junction;if(close(before))junction=before;else if(close(after))junction=after;else{junction=findNode(node(hit.point,'confluence'));main.nodeIds.splice(hit.index,0,junction.id)}
  junction.type='confluence';const last=findNode(b.nodeIds[b.nodeIds.length-1]);
  const distance=Math.hypot(map.latLngToLayerPoint([last.coord[1],last.coord[0]]).x-map.latLngToLayerPoint([junction.coord[1],junction.coord[0]]).x,map.latLngToLayerPoint([last.coord[1],last.coord[0]]).y-map.latLngToLayerPoint([junction.coord[1],junction.coord[0]]).y);
  if(distance<8){b.nodeIds[b.nodeIds.length-1]=junction.id;if(!system.branches.some(x=>x!==b&&x.nodeIds.includes(last.id)))system.nodes=system.nodes.filter(x=>x.id!==last.id)}
  else b.nodeIds.push(junction.id);
  b.connectedTo=junction.id;
 });msg('已建立共同匯流節點 / Shared confluence created');
}
function validate(){
 const errors=[];if(!system)return ['尚未建立河系'];
 const ids=new Set();for(const n of system.nodes){if(ids.has(n.id))errors.push('重複節點 ID '+n.id);ids.add(n.id);if(!good(n.coord))errors.push('無效座標 '+n.id)}
 for(const b of system.branches){if(b.nodeIds.length<2)errors.push('河道節點不足 '+b.name);
 for(const id of b.nodeIds)if(!ids.has(id))errors.push('不存在的節點 '+id);
 if(b.kind==='tributary'){if(!b.connectedTo)errors.push('支流尚未連接 '+b.name);else if(!system.branches[0].nodeIds.includes(b.connectedTo)||b.nodeIds.at(-1)!==b.connectedTo)errors.push('支流連接異常 '+b.name)}}
 for(const r of system.reaches)if(!ids.has(r.from)||!ids.has(r.to)||r.from===r.to)errors.push('河段端點異常 '+r.id);
 if(!system.outlet)errors.push('尚未標記河口');else if(!ids.has(system.outlet))errors.push('河口節點不存在');
 return errors;
}
function setMode(m){mode=m;for(const id of ['draw','move','insert','delete','mouth'])$(id).setAttribute('aria-pressed',String(id===m));$('connectBranch').setAttribute('aria-pressed',String(m==='connect'));refresh();msg('工具 / Tool: '+m)}
for(const id of ['draw','move','insert','delete','mouth'])$(id).onclick=()=>setMode(id);
$('newSystem').onclick=newSystem;$('newBranch').onclick=makeBranch;$('connectBranch').onclick=()=>{if(!system)return msg('請先建立河系');setMode('connect')};
$('riverBranch').onchange=e=>{active=e.target.value;setMode('draw')};
map.on('click',e=>{if(!system)return msg('請先建立或匯入河系');const c=pt(e.latlng);if(!good(c))return msg('僅支援臺灣周邊座標');
 if(mode==='draw')change(()=>branch().nodeIds.push(node(c)));
 if(mode==='mouth'){change(()=>{const n=node(c,'outlet');system.outlet=n});msg('已設定近似河口 / Approximate outlet set')}
});
$('undo').onclick=()=>{if(!history.length)return msg('沒有可復原的步驟');const x=JSON.parse(history.pop());system=x.system;active=x.active;refresh();msg('已復原 / Undone')};
$('clear').onclick=()=>{if(!system)return;if(!confirm('清空目前選取河道的節點？'))return;const b=branch();if(b.connectedTo)return msg('已連接支流不能直接清空，請先匯出備份');change(()=>{for(const id of b.nodeIds){if(!system.branches.some(x=>x!==b&&x.nodeIds.includes(id)))system.nodes=system.nodes.filter(n=>n.id!==id)}b.nodeIds=[]});msg('已清空選取河道')};
$('basemap').onchange=()=>{map.removeLayer(tile);tile=tiles[$('basemap').value].addTo(map);tile.bringToBack()};
function feature(){
 const errors=validate();const features=[];
 for(const n of system.nodes)features.push({type:'Feature',properties:{id:n.id,feature_type:'node',node_type:n.type},geometry:{type:'Point',coordinates:n.coord}});
 for(const r of system.reaches){const b=system.branches.find(x=>x.id===r.branchId);features.push({type:'Feature',properties:{id:r.id,feature_type:'reach',branch_id:b.id,river_name:b.name,river_type:b.kind,from_node:r.from,to_node:r.to,direction:'upstream_to_downstream'},geometry:{type:'LineString',coordinates:[findNode(r.from).coord,findNode(r.to).coord]}})}
 return {type:'FeatureCollection',metadata:{project:'P136',schema_version:'1.2',system_id:system.id,name_zh:system.name,name_en:system.english,status:'draft',validation_errors:errors,river_system:{branches:system.branches,outlet_node_id:system.outlet,next:system.next},source:'student_manual_tracing',note:'Unverified educational tracing; coordinates are not surveyed'},features};
}
$('validate').onclick=()=>{const errors=validate();$('validation').textContent=errors.length?'需修正 / Issues ('+errors.length+'): '+errors.join('；'):'基本拓樸檢查通過 / Basic topology checks passed';msg(errors.length?'尚有待修正項目':'拓樸檢查通過')};
$('save').onclick=()=>{if(!system)return msg('尚未建立河系');try{localStorage.setItem(localKey,JSON.stringify({system,active}));msg('完整河系草稿已儲存於本機 / River system draft saved')}catch(e){msg('儲存失敗 '+e.message)}};
$('load').onclick=()=>{const raw=localStorage.getItem(localKey);if(!raw)return msg('找不到本機草稿');try{const x=JSON.parse(raw);if(!x.system?.branches||!x.system?.nodes)throw Error('invalid');if(system)push();system=x.system;active=x.active;refresh();msg('已載入河系草稿')}catch(e){msg('草稿格式不正確')}};
$('export').onclick=()=>{if(!system)return msg('尚未建立河系');const errors=validate();if(errors.length&&!confirm('尚有 '+errors.length+' 項拓樸檢查問題。仍要匯出草稿？'))return;
 const blob=new Blob([JSON.stringify(feature(),null,2)],{type:'application/geo+json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=system.id+'.geojson';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);msg('已匯出 '+system.id+'.geojson（草稿）')};
$('importFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{
 if(file.size>8_000_000)throw Error('檔案超過 8 MB');
 const d=JSON.parse(await file.text());if(d.type!=='FeatureCollection'||!Array.isArray(d.features))throw Error('非 GeoJSON FeatureCollection');
 const m=d.metadata||{},info=m.river_system;if(m.schema_version!=='1.2'||!/^P136-R\d{3}$/.test(m.system_id)||!info?.branches?.length||!info?.next)throw Error('非 P136 V1.2 河系格式');
 const ns=d.features.filter(f=>f.properties?.feature_type==='node').map(f=>({id:f.properties.id,type:f.properties.node_type,coord:f.geometry?.coordinates}));
 if(ns.length>30000||!ns.every(n=>typeof n.id==='string'&&good(n.coord)))throw Error('節點資料錯誤');
 const rs=d.features.filter(f=>f.properties?.feature_type==='reach');
 if(rs.length>30000||!rs.every(r=>r.geometry?.type==='LineString'&&r.geometry.coordinates?.length===2))throw Error('河段資料錯誤');
 const incoming={id:m.system_id,name:m.name_zh||'',english:m.name_en||'',schema_version:'1.2',status:'draft',nodes:ns,reaches:rs.map(r=>({id:r.properties.id,branchId:r.properties.branch_id,from:r.properties.from_node,to:r.properties.to_node})),branches:info.branches,outlet:info.outlet_node_id||null,next:info.next};
 if(!incoming.branches.every(b=>Array.isArray(b.nodeIds)&&b.nodeIds.every(id=>ns.some(n=>n.id===id))))throw Error('河道參照不存在節點');
 if(!['N','S','T'].every(k=>Number.isSafeInteger(incoming.next[k])&&incoming.next[k]>0))throw Error('流水號錯誤');
 if(system&&!confirm('匯入會取代目前工作區。請先匯出備份。繼續？'))return;
 system=incoming;active=incoming.branches[0].id;history=[];$('river').value=system.name;$('englishName').value=system.english;refresh();const all=system.nodes;if(all.length)map.fitBounds(L.latLngBounds(all.map(n=>[n.coord[1],n.coord[0]])),{padding:[25,25]});msg('已匯入河系 '+system.id+'，請執行拓樸驗證');
 }catch(err){msg('匯入失敗 / Import failed: '+err.message)}finally{e.target.value=''}};
refresh();
})();
