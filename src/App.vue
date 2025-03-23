<script setup>
import { onMounted } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import PositionOverlay from "./components/PositionOverlay.vue"

onMounted(() => {
  const posMapToMC = (position) => {
    return [
      position[1] * 8 - .5,
      position[0] * -8 + .5
    ];
  }
  const posMCToMap = (position) => {
    return [
      (position[1] - .5) / -8, 
      (position[0] + .5) / 8
    ];
  }
  
  const params = new URLSearchParams(location.search);
  const updateParams = (pos, zoom, dim) => {
    params.delete("s");
    params.set("x", pos[0].toFixed(5));
    params.set("z", pos[1].toFixed(5));
    params.set("zoom", zoom);
    params.set('dim', dim)
    history.replaceState(null, '', `?${params.toString()}`);
  }
  const pos = posMCToMap([
    parseFloat(params.get('x')) || 0,
    parseFloat(params.get('z')) || 0,
  ])
  let x = pos[0];
  let z = pos[1];
  let zoom = parseFloat(params.get('zoom')) ||
    Math.log2(parseFloat(params.get('s')) * 2) + 2 || 3;
  let dim = params.get('dim') || "overworld";

  updateParams(posMapToMC(pos), zoom, dim);

  const layers = {
    overworld: L.tileLayer("/map/{z}/overworld/{x}_{y}.png", {
      tileSize: 256,
      noWrap: true,
      maxZoom: 8,
      minNativeZoom: 2,
      maxNativeZoom: 5,
      attribution: "Overworld - ScJPMC World Map exported from Xaero's World Map mod"
    }),
    nether: L.tileLayer("/map/{z}/nether/{x}_{y}.png", {
      tileSize: 256,
      noWrap: true,
      maxZoom: 8,
      minNativeZoom: 2,
      maxNativeZoom: 5,
      attribution: "Nether - ScJPMC World Map exported from Xaero's World Map mod"
    }),
    end: L.tileLayer("/map/{z}/end/{x}_{y}.png", {
      tileSize: 256,
      noWrap: true,
      maxZoom: 8,
      minNativeZoom: 2,
      maxNativeZoom: 5,
      attribution: "The End - ScJPMC World Map exported from Xaero's World Map mod"
    }),
  }
  
  const map = L.map("map", {
    crs: L.CRS.Simple,
    center: [x, z],
    zoom: zoom,
    layers: [layers[dim]]
  });

  L.marker(posMCToMap([0, 0]))
    .bindPopup("0, 0")
    .openPopup()
    .addTo(map);
  L.marker(posMCToMap([-510, -190]))
    .bindPopup("阿斑市")
    .openPopup()
    .addTo(map);

  map.on('moveend zoomend', () => {
    const c = map.getCenter();
    const pos = posMapToMC([c.lat, c.lng]);
    x = pos[0];
    z = pos[1];
    zoom = map.getZoom();
    updateParams(pos, zoom, dim);
  })
});
</script>

<template>
  <div id="map"></div>
  <div class="map-overlay">
    <PositionOverlay></PositionOverlay>
  </div>
</template>

<style scoped>
#map {
  height: 100dvh;
  background: #000;
  image-rendering: pixelated;
  user-select: none;
}
.map-overlay {
  position: fixed;
}
</style>