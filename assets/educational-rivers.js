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
 '<label for="educationalMajorRiver" style="display:block;margin-top:8px">主要河川快速定位 / Locate a major river</label>'+ 
 '<select id="educationalMajorRiver"><option value="">全臺灣具名河道 / All named rivers</option></select>'+ 
 '<button id="educationalRiverReset" type="button">返回全臺灣 / Show All Taiwan</button>'+ 
 '<div id="educationalRiverStatus" role="status" style="font-size:12px;margin:8px 0">正在讀取河道 / Loading river ways…</div>'+
 '<div id="educationalRiverSelection" role="status" style="font-size:12px;line-height:1.6"></div>';
 catalog.parentNode.insertBefore(panel,catalog);
 const status=document.getElementById('educationalRiverStatus');
 const selection=document.getElementById('educationalRiverSelection');
 const lines=L.layerGroup().addTo(map),outlets=L.layerGroup().addTo(map);
 const riverRenderer=L.canvas({padding:.25});
 const lineToggle=document.getElementById('educationalRiversVisible');
 const outletToggle=document.getElementById('educationalOutletsVisible');
 let selected=null;
 const majorSelect=document.getElementById('educationalMajorRiver');
 const majorReset=document.getElementById('educationalRiverReset');
 const byMajor=new Map();
 const baseStyle=new Map();
 function filterMajor(name){
  if(selected){selected.setStyle(baseStyle.get(selected));selected=null;}
  const visible=[];
  lines.eachLayer(line=>{
   const match=!name||line.p136Major===name;
   line.setStyle(match?baseStyle.get(line):{color:'#b7c9d3',weight:1,opacity:.13});
   if(match)visible.push(line);
  });
  if(name){
   const group=byMajor.get(name)||[];
   if(group.length){map.fitBounds(L.featureGroup(group).getBounds(),{padding:[25,25],maxZoom:11});}
   selection.textContent=name+' · '+group.length+' 個同名河段 / named segments. 此選取不包含未確認歸屬的支流 / Unverified tributaries are not included.';
  }else{selection.textContent='全臺灣具名河道 / All named river reaches';map.fitBounds([[21.85,120.0],[25.35,122.1]],{padding:[20,20]});}
 }
 majorSelect.addEventListener('change',()=>filterMajor(majorSelect.value));
 majorReset.addEventListener('click',()=>{majorSelect.value='';filterMajor('');});
 function esc(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function draw(data){
  const features=data.features||[];
  for(const f of features){
   if(f.geometry?.type!=='LineString'||!Array.isArray(f.geometry.coordinates)||f.geometry.coordinates.length<2)continue;
   const p=f.properties||{},main=!!p.major_river;
   const line=L.polyline(f.geometry.coordinates.map(c=>[c[1],c[0]]),{
    color:main?'#1672b7':'#6e9bb4',weight:main?3.5:2,opacity:main?.86:.7,
    renderer:riverRenderer
   });
   line.on('click',event=>{
    if(event.originalEvent)L.DomEvent.stopPropagation(event.originalEvent);
    if(selected)selected.setStyle(baseStyle.get(selected));
    selected=line;
    line.setStyle({color:'#e59a12',weight:6,opacity:1});
    line.bringToFront();
    selection.textContent='已選河段 / Selected: '+(p.name||'未命名')+' · OSM way '+p.osm_way_id+
      ' · '+(main?'主要河川名稱 / Main-river name':'具名河道／支流候選 / Named river or tributary candidate')+
      '；不代表已核定支流歸屬 / Basin membership unverified.';
   });
   line.options.p136Default={color:line.options.color,weight:line.options.weight,opacity:line.options.opacity};
   baseStyle.set(line,line.options.p136Default);
   line.p136Major=p.major_river||null;
   if(line.p136Major){if(!byMajor.has(line.p136Major))byMajor.set(line.p136Major,[]);byMajor.get(line.p136Major).push(line);}
   line.bindTooltip(esc(p.name||'具名河道')+' · OSM '+p.osm_way_id);
   lines.addLayer(line);
  }
  const points=data.metadata?.outlet_reference_points||{};
  for(const name of Object.keys(points)){
   const opt=document.createElement('option');opt.value=name;
   opt.textContent=name+' ('+(byMajor.get(name)?.length||0)+' 河段)';
   majorSelect.append(opt);
  }
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
