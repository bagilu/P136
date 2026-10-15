'use strict';
(()=>{
const $=id=>document.getElementById(id);
const map=L.map('map',{preferCanvas:true}).setView([23.7,121],8);
const tiles={
 osm:L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors (ODbL)'}),
 esri:L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:18,attribution:'Tiles © Esri and imagery providers; reference use subject to terms'})
};
let activeTile=tiles.osm.addTo(map);
const line=L.polyline([],{color:'#e4a027',weight:4}).addTo(map);
const nodes=L.layerGroup().addTo(map),outletLayer=L.layerGroup().addTo(map);
let coords=[],outlet=null,mode='draw',history=[],markers=[];
const storageKey='P136:tracer:v1.1:draft';
function msg(t){$('status').textContent=t}
function valid(c){return Array.isArray(c)&&c.length===2&&c.every(Number.isFinite)&&c[0]>=119&&c[0]<=123&&c[1]>=21&&c[1]<=26}
function snapshot(){return JSON.stringify({coords,outlet,river:$('river').value})}
function record(){history.push(snapshot());if(history.length>100)history.shift()}
function restore(s){const x=JSON.parse(s);coords=x.coords;outlet=x.outlet;$('river').value=x.river||'';render()}
function nearestSegment(latlng){let best=0,dist=Infinity;for(let i=0;i<coords.length-1;i++){
 const a=map.latLngToLayerPoint([coords[i][1],coords[i][0]]),b=map.latLngToLayerPoint([coords[i+1][1],coords[i+1][0]]);
 const q=map.latLngToLayerPoint(latlng),dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/(dx*dx+dy*dy||1)));
 const d=(q.x-a.x-t*dx)**2+(q.y-a.y-t*dy)**2;if(d<dist){dist=d;best=i+1}
 }return best}
function render(){
 line.setLatLngs(coords.map(c=>[c[1],c[0]]));nodes.clearLayers();outletLayer.clearLayers();markers=[];
 coords.forEach((c,i)=>{
  const m=L.circleMarker([c[1],c[0]],{radius:6,color:'#0b5c89',fillColor:'white',fillOpacity:1,weight:2}).addTo(nodes);
  m.bindTooltip('節點 '+(i+1)+' / Node '+(i+1));
  m.on('click',e=>{if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);if(mode==='delete'){record();coords.splice(i,1);render();msg('已刪除節點 / Node removed')}});
  if(mode==='move'){
   // Leaflet CircleMarker does not support drag natively; drag using mouse events.
   m.on('mousedown',e=>{if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);record();map.dragging.disable();
    const move=ev=>{const ll=ev.latlng;if(!ll)return;const next=[+ll.lng.toFixed(6),+ll.lat.toFixed(6)];if(valid(next)){coords[i]=next;line.setLatLngs(coords.map(c=>[c[1],c[0]]));m.setLatLng(ll)}};
    const stop=()=>{map.off('mousemove',move);map.off('mouseup',stop);map.dragging.enable();render();msg('節點已移動 / Node moved')};
    map.on('mousemove',move);map.on('mouseup',stop);
   });
  }
  markers.push(m);
 });
 if(outlet){L.circleMarker([outlet[1],outlet[0]],{radius:9,color:'#a34012',fillColor:'#f6b35b',fillOpacity:.8,weight:3}).bindTooltip('近似出海口 / Approximate outlet').addTo(outletLayer)}
 $('points').textContent=coords.length+' 個節點 / nodes'+(outlet?' · 已標記近似出海口 / outlet set':'');
}
function setMode(m){mode=m;for(const id of ['draw','move','insert','delete','mouth'])$(id).setAttribute('aria-pressed',String(id===m));render();msg('工具 / Tool: '+m)}
for(const id of ['draw','move','insert','delete','mouth'])$(id).addEventListener('click',()=>setMode(id));
map.on('click',e=>{const c=[+e.latlng.lng.toFixed(6),+e.latlng.lat.toFixed(6)];if(!valid(c)){msg('僅支援臺灣周邊座標 / Taiwan region only');return}
 if(mode==='draw'){record();coords.push(c);render();msg('已新增節點 / Node added')}
 else if(mode==='mouth'){record();outlet=c;render();msg('已設定近似出海口 / Approximate outlet set')}
});
line.on('click',e=>{if(mode!=='insert')return;if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);if(coords.length<2)return;
 const c=[+e.latlng.lng.toFixed(6),+e.latlng.lat.toFixed(6)];if(!valid(c))return;
 record();coords.splice(nearestSegment(e.latlng),0,c);render();msg('已插入節點 / Node inserted');
});
$('undo').addEventListener('click',()=>{if(!history.length){msg('沒有可復原的步驟 / Nothing to undo');return}restore(history.pop());msg('已復原 / Undone')});
$('clear').addEventListener('click',()=>{if(!confirm('確定清空目前河道與河口？ / Clear current tracing?'))return;record();coords=[];outlet=null;render();msg('已清空 / Cleared')});
$('basemap').addEventListener('change',()=>{map.removeLayer(activeTile);activeTile=tiles[$('basemap').value].addTo(map);activeTile.bringToBack();msg('底圖已切換 / Basemap changed')});
function feature(){return {type:'FeatureCollection',metadata:{project:'P136',version:'1.1',status:'STUDENT_DRAFT_UNVERIFIED',basemap:$('basemap').value,created_by:'manual_tracing',outlet_accuracy:'approximate'},features:[
 ...(coords.length>=2?[{type:'Feature',properties:{name:$('river').value.trim()||'未命名河川',kind:'river_centerline',direction_verified:false,topology_verified:false},geometry:{type:'LineString',coordinates:coords}}]:[]),
 ...(outlet?[{type:'Feature',properties:{name:$('river').value.trim()||'未命名河川',kind:'approximate_outlet',surveyed:false},geometry:{type:'Point',coordinates:outlet}}]:[])
 ]}}
$('save').addEventListener('click',()=>{try{localStorage.setItem(storageKey,snapshot());msg('已儲存至此瀏覽器 / Saved to this browser')}catch(e){msg('儲存失敗 / Save failed: '+e.message)}});
$('load').addEventListener('click',()=>{const s=localStorage.getItem(storageKey);if(!s){msg('找不到本機草稿 / No local draft');return}try{record();restore(s);msg('已讀取本機草稿 / Draft loaded')}catch(e){msg('草稿格式錯誤 / Invalid draft')}});
$('export').addEventListener('click',()=>{if(coords.length<2){msg('至少需要兩個河道節點 / At least two nodes required');return}
 const blob=new Blob([JSON.stringify(feature(),null,2)],{type:'application/geo+json'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='P136-river-draft.geojson';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);msg('已匯出 GeoJSON 草稿 / GeoJSON exported')});
$('importFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;
 try{if(file.size>5_000_000)throw Error('檔案超過 5MB / File too large');
 const data=JSON.parse(await file.text());if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('Invalid FeatureCollection');
 const river=data.features.find(f=>f.geometry?.type==='LineString'),mouth=data.features.find(f=>f.geometry?.type==='Point'&&f.properties?.kind==='approximate_outlet');
 if(!river||!Array.isArray(river.geometry.coordinates)||river.geometry.coordinates.length<2||river.geometry.coordinates.length>10000||!river.geometry.coordinates.every(valid))throw Error('Invalid river coordinates');
 if(mouth&&!valid(mouth.geometry.coordinates))throw Error('Invalid outlet');
 record();coords=river.geometry.coordinates.map(c=>[...c]);outlet=mouth?[...mouth.geometry.coordinates]:null;$('river').value=String(river.properties?.name||'').slice(0,100);render();map.fitBounds(line.getBounds(),{padding:[30,30]});msg('已匯入草稿（尚未驗證） / Draft imported (unverified)');
 }catch(err){msg('匯入失敗 / Import failed: '+err.message)}finally{e.target.value=''}
});
render();
})();
