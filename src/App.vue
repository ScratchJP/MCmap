<script setup>
import { onMounted, ref } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { dimID } from './definitions/index';

import markers from './data/markers.js';

import PositionOverlay from "./components/PositionOverlay.vue"
import DimensionToggle from "./components/DimensionToggle.vue";

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
let dimToggle = () => {};
const dimensions = [
  {
    icon: "/assets/block/grass_block.png",
    name: "Overworld",
    id: 0,
  },
  {
    icon: "/assets/block/netherrack.png",
    name: "The Nether",
    id: -1,
  },
  {
    icon: "/assets/block/end_stone.png",
    name: "The End",
    id: 1,
  },
];


onMounted(() => {
  const positions = {};

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
      attribution: "The Nether - ScJPMC World Map exported from Xaero's World Map mod"
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

  markers.filter(i => {
    if (Array.isArray(i)) {
      return i.dimension.includes(dimID[dim.value])
    }
    return i.dimension === dimID[dim.value]
  }).forEach(item => {
    const pos = item.position;
    const posDevide = pos[2] === -1 ? 8 : 1;
    L.marker(posMCToMap([
      pos[0] / posDevide + .5,
      pos[1] / posDevide + .5
    ]), {
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

  dimToggle = (id) => {
    const currentDim = dimID[dim.value]
    if (currentDim === id) return;
    positions[currentDim] = [x.value, z.value];
    console.log(JSON.stringify(positions,null,2))

    if (currentDim === 0 && id === -1) {
      map.setView(posMCToMap(
        [x.value / 8, z.value / 8]
      ))
    } else if (currentDim === -1 && id === 0) {
      map.setView(posMCToMap(
        [x.value * 8, z.value * 8]
      ))
    } else {
      map.setView(posMCToMap([
        positions[id]?.at(0) ?? 0,
        positions[id]?.at(1) ?? 0,
      ]))
    }
    const newDimName = Object.entries(dimID).find(i => i[1] === id)?.at(0);

    map.removeLayer(layers[dim.value]);
    map.addLayer(layers[newDimName]);

    dim.value = newDimName;
    const pos = updatePosition();
    zoom = map.getZoom();
    updateParams(pos, zoom, dim.value);
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
    <div class="overlay-top overlay-right">
      <div class="dimension-toggler overlay-interactable">
        <DimensionToggle v-for="dim in dimensions"
          :icon="dim.icon"
          :name="dim.name"
          @click="dimToggle(dim.id)"
        />
      </div>
    </div>
  </div>
</template>
<style>
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
  align-items: center;
  user-select: none;
  pointer-events: none;
}
.overlay-interactable {
  pointer-events: auto;
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
.overlay-right {
  position: absolute;
  top: 0; right: 0;
  display: flex;
  width: 100%;
  height: 100%;
  flex-wrap: wrap;
  justify-content: end;
}
.dimension-toggler {
  display: flex;
  flex-direction: column;
  margin: 10px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}
.dimension-toggler a:first-child {
  border-top-left-radius:  2px; 
  border-top-right-radius: 2px;
}
.dimension-toggler a:last-child {
  border-bottom: none;
  border-bottom-left-radius:  2px; 
  border-bottom-right-radius: 2px;
}
</style>