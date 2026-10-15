'use strict';
// Educational image reference only. No FAO WMS pixels are stored or vectorized.
// map is the existing Leaflet instance initialized by assets/v024.js.
(function(){
  const toggle=document.getElementById('showFaoReference');
  if(!toggle||typeof L==='undefined'||typeof map==='undefined')return;
  const layer=L.tileLayer.wms('https://data.apps.fao.org/map/gsrv/gsrv1/aquamaps/wms',{
    layers:'rivers_asia_37331',styles:'',format:'image/png',transparent:true,
    version:'1.1.1',opacity:0.65,interactive:false,
    attribution:'FAO AQUASTAT · Rivers (Global, 2026), CC BY 4.0',
    zIndex:250
  });
  layer.on('tileerror',()=>{
    toggle.checked=false;
    if(map.hasLayer(layer))map.removeLayer(layer);
    const note=document.getElementById('faoLayerStatus');
    if(note)note.textContent='FAO 影像服務暫時無法載入 / FAO imagery unavailable.';
  });
  toggle.addEventListener('change',()=>{
    const note=document.getElementById('faoLayerStatus');
    if(toggle.checked){
      layer.addTo(map);
      if(note)note.textContent='FAO 河川影像參考（非可點選河段） / FAO image reference only.';
    }else{
      map.removeLayer(layer);
      if(note)note.textContent='';
    }
  });
})();
