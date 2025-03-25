<script setup>
import { onMounted, ref } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { dimID } from './definitions/index';

import markers from './data/markers.json';

import PositionOverlay from "./components/PositionOverlay.vue"

const x = ref(0), z = ref(0), dim = ref("overworld");
const mouseX = ref(null), mouseZ = ref(null);

const icon = {
  marker: L.icon({
    iconUrl: "./assets/icon/marker.png",
    iconSize: 32,
    iconAnchor: [16, 32],
    popupAnchor: [0, -24],
    tooltipAnchor: [0, -24],
  }),
}
const posMapToMC = (position) => {
  return [
    position[1] * 8,
    position[0] * -8
  ];
}
const posMCToMap = (position) => {
  return [
    position[1] / -8, 
    position[0] / 8
  ];
}

onMounted(() => {
  
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
    parseFloat(params.get('x')) || 0.5,
    parseFloat(params.get('z')) || 0.5,
  ])
  x.value = pos[0];
  z.value = pos[1];
  let zoom = parseFloat(params.get('zoom')) ||
    Math.log2(parseFloat(params.get('s')) * 2) + 2 || 3;
  dim.value = params.get('dim') || "overworld";

  updateParams(posMapToMC(pos), zoom, dim.value);

  const layers = {
    overworld: L.tileLayer("/map/{z}/overworld/{x}_{y}.png", {
      tileSize: 256,
      noWrap: true,
      maxZoom: 8,
      minNativeZoom: 1,
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
      minZoom: -1,
      maxZoom: 8,
      minNativeZoom: 2,
      maxNativeZoom: 5,
      attribution: "The End - ScJPMC World Map exported from Xaero's World Map mod"
    }),
  }
  
  const map = L.map("map", {
    crs: L.CRS.Simple,
    center: [x.value, z.value],
    zoom: zoom,
    layers: [layers[dim.value]]
  });

  markers.filter(i => i.dimension === dimID[dim.value])
    .forEach(item => {
      const pos = item.position;
      L.marker(posMCToMap([pos[0] + .5, pos[1] - .5]), {
        icon: icon.marker
      }).bindPopup(`<center>${item.name}<br><small>${item.position.join(' ')}</small></center>`)
        .openPopup()
        .addTo(map);
    });
  

  const updatePosition = () => {
    const c = map.getCenter();
    const pos = posMapToMC([c.lat, c.lng]);
    x.value = pos[0];
    z.value = pos[1];
    return pos;
  }

  const updateMousePos = event => {
    let mousePos;
    if (event.originalEvent.touches) {
      const touch = event.originalEvent.touches[0];
      mousePos = map.mouseEventToLatLng(touch);
    } else {
      mousePos = map.mouseEventToLatLng(event.originalEvent);
    }
    const pos = posMapToMC([mousePos.lat, mousePos.lng]);
    mouseX.value = pos[0], mouseZ.value = pos[1];
  }

  map.on('move zoom', updatePosition)
  map.on('mousemove touchmove', updateMousePos)

  map.on('moveend zoomend', () => {
    const pos = updatePosition();
    zoom = map.getZoom();
    updateParams(pos, zoom, dim.value);
  })
});
</script>

<template>
  <div id="map"></div>
  <div class="map-overlay">
    <div class="overlay-top">
      <PositionOverlay
        :x="mouseX ?? posMapToMC([0, z])[0]"
        :z="mouseZ ?? posMapToMC([x, 0])[1]"
      />
    </div>
  </div>
</template>

<style scoped>
#map {
  height: 100dvh;
  background: #000;
  image-rendering: pixelated;
  user-select: none;
  font-family: var(--f-default);
}
.map-overlay {
  position: fixed;
  z-index: 500;
  top: 0; left: 0;
  width: 100dvw;
  height: 100dvh;
  user-select: none;
  pointer-events: none;
}
.overlay-top {
  position: absolute;
  top: 0; left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
}
</style>