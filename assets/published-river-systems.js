'use strict';
/* P136 published student-traced river systems, isolated from legacy candidate layers. */
(()=>{
 const panel=document.getElementById('publishedRiverSystems');
 if(!panel||typeof map==='undefined'||typeof L==='undefined')return;
 const layer=L.featureGroup().addTo(map);
 const status=panel.querySelector('[data-role=status]');
 const list=panel.querySelector('[data-role=list]');
 const cache=new Map();
 const base='data/rivers/';
 const isValidId=id=>/^P136-R[0-9]{3}$/.test(id);
 const show=s=>{status.textContent=s};
 async function loadCatalog(){
  try{
   const response=await fetch(base+'index.json',{cache:'no-cache'});if(!response.ok)throw Error('HTTP '+response.status);
   const d=await response.json();if(d.schema_version!=='1.2'||!Array.isArray(d.river_systems))throw Error('invalid catalog');
   list.replaceChildren();
   const published=d.river_systems.filter(x=>x.status==='published'&&isValidId(x.id)&&x.file===x.id+'.geojson');
   show(published.length?'已發現 '+published.length+' 個已發布河系 / '+published.length+' published river systems':'尚無已發布的學生河系 / No published student river systems');
   for(const entry of published){
    const row=document.createElement('label');row.style.cssText='display:flex;align-items:center;gap:7px;margin:5px 0;font-size:13px';
    const input=document.createElement('input');input.type='checkbox';input.dataset.system=entry.id;
    const span=document.createElement('span');span.textContent=entry.name_zh+(entry.name_en?' / '+entry.name_en:'');
    row.append(input,span);list.append(row);
    input.addEventListener('change',async()=>{
     if(!input.checked){const existing=cache.get(entry.id);if(existing)layer.removeLayer(existing);return}
     input.disabled=true;
     try{
      let g=cache.get(entry.id);
      if(!g){
       const r=await fetch(base+entry.file);if(!r.ok)throw Error('HTTP '+r.status);
       const data=await r.json();
       if(data.type!=='FeatureCollection'||data.metadata?.system_id!==entry.id||data.metadata?.status!=='published')throw Error('invalid published river system');
       const features=data.features.filter(f=>f.properties?.feature_type==='reach'&&f.geometry?.type==='LineString');
       g=L.geoJSON({type:'FeatureCollection',features},{style:f=>({color:f.properties.river_type==='mainstream'?'#096db4':'#159a85',weight:4,opacity:.9}),onEachFeature:(f,l)=>l.bindPopup((f.properties.river_name||entry.name_zh)+' · '+(f.properties.id||''))});
       cache.set(entry.id,g);
      }
      layer.addLayer(g);show('已載入 '+entry.name_zh+' / Loaded '+entry.id);
     }catch(e){input.checked=false;show('載入失敗 / Failed: '+entry.id+' ('+e.message+')')}
     finally{input.disabled=false}
    });
   }
  }catch(e){show('河系目錄載入失敗 / Catalog unavailable: '+e.message)}
 }
 loadCatalog();
})();
