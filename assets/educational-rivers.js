'use strict';
/* P136 educational first edition: OSM named river ways and approximate outlet dots.
 * Each named OSM way is independently clickable; tributary membership not asserted.
 * Independent from existing HydroRIVERS network, which retains its own topology.
 */
(function(){
 const catalog=document.getElementById('riverRegistryPanel');
 if(!catalog||typeof map==='undefined'||typeof L==='undefined')return;
 const panel=document.createElement('section');
 panel.id='educationalRiverPanel';
 panel.style.cssText='margin-top:12px;padding:12px;border:2px solid #4387ad;border-radius:8px';
 panel.innerHTML='<h3>臺灣主要河川與支流 / Taiwan Rivers & Tributaries</h3>'+
 '<p style="font-size:12px;line-height:1.5">教學第一版：以 OpenStreetMap 具名河道線段展示臺灣河川。各線段可點選；其他具名河道不代表已確認隸屬某一主流。河口圓點僅為大致參考位置，非實測河口。 / Educational preview from OSM named river ways. Click any segment. Tributary membership and approximate outlet markers are unverified.</p>'+
 '<label><input type="checkbox" id="educationalRiversVisible" checked> 顯示河川及支流 / Show named river lines</label>'+
 '<label style="display:block"><input type="checkbox" id="educationalOutletsVisible" checked> 顯示出海口參考圓點 / Show approximate outlets</label>'+
 '<div id="educationalRiverStatus" role="status" style="font-size:12px;margin:8px 0">正在讀取河道 / Loading river ways…</div>'+
 '<div id="educationalRiverSelection" role="status" style="font-size:12px;line-height:1.6"></div>';
 catalog.parentNode.insertBefore(panel,catalog);
 const status=document.getElementById('educationalRiverStatus');
 const selection=document.getElementById('educationalRiverSelection');
 const lines=L.layerGroup().addTo(map),outlets=L.layerGroup().addTo(map);
 const lineToggle=document.getElementById('educationalRiversVisible');
 const outletToggle=document.getElementById('educationalOutletsVisible');
 let selected=null;
 function esc(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function draw(data){
  const features=data.features||[];
  for(const f of features){
   if(f.geometry?.type!=='LineString'||!Array.isArray(f.geometry.coordinates)||f.geometry.coordinates.length<2)continue;
   const p=f.properties||{},main=!!p.major_river;
   const line=L.polyline(f.geometry.coordinates.map(c=>[c[1],c[0]]),{
    color:main?'#1672b7':'#6e9bb4',weight:main?3.5:2,opacity:main?.86:.7,
    renderer:L.canvas({padding:.25})
   });
   line.on('click',event=>{
    if(event.originalEvent)L.DomEvent.stopPropagation(event.originalEvent);
    if(selected)selected.setStyle(selected.options.p136Default);
    selected=line;
    line.setStyle({color:'#e59a12',weight:6,opacity:1});
    line.bringToFront();
    selection.textContent='已選河段 / Selected: '+(p.name||'未命名')+' · OSM way '+p.osm_way_id+
      ' · '+(main?'主要河川名稱 / Main-river name':'具名河道／支流候選 / Named river or tributary candidate')+
      '；不代表已核定支流歸屬 / Basin membership unverified.';
   });
   line.options.p136Default={color:line.options.color,weight:line.options.weight,opacity:line.options.opacity};
   line.bindTooltip(esc(p.name||'具名河道')+' · OSM '+p.osm_way_id);
   lines.addLayer(line);
  }
  const points=data.metadata?.outlet_reference_points||{};
  for(const [name,coord] of Object.entries(points)){
   if(!Array.isArray(coord)||coord.length!==2)continue;
   const marker=L.circleMarker([coord[1],coord[0]],{radius:6,color:'#bc4a19',fillColor:'#f2ad45',fillOpacity:.75,weight:2});
   marker.bindTooltip(esc(name)+' · 近似出海口 / Approximate outlet');
   marker.on('click',()=>{selection.textContent=name+'：近似出海口參考點，非官方實測位置 / Approximate outlet, not surveyed.'});
   outlets.addLayer(marker);
  }
  status.textContent='已載入 / Loaded '+features.length+' 個可點選具名河段 / clickable named reaches · '+
   Object.keys(points).length+' 個近似出海口 / approximate outlets · © OpenStreetMap contributors (ODbL).';
 }
 lineToggle.addEventListener('change',()=>lineToggle.checked?lines.addTo(map):map.removeLayer(lines));
 outletToggle.addEventListener('change',()=>outletToggle.checked?outlets.addTo(map):map.removeLayer(outlets));
 fetch('data/educational/taiwan-named-rivers.geojson?v=0.001').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()})
 .then(data=>{if(data.type!=='FeatureCollection'||data.metadata?.source!=='OpenStreetMap contributors (ODbL)')throw Error('Source metadata mismatch');draw(data)})
 .catch(e=>{status.textContent='河川資料尚未部署 / River data not deployed: '+e.message;lineToggle.checked=false;outletToggle.checked=false;});
})();
