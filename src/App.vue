<script setup>
import { onMounted, ref } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { dimID } from './definitions/index';

import markerList from './data/markers.js';
import icons from './data/icons.js';

import PositionOverlay from "./components/PositionOverlay.vue"
import DimensionToggle from "./components/DimensionToggle.vue";

const x = ref(0), z = ref(0), dim = ref("overworld");
const mouseX = ref(null), mouseZ = ref(null);

const markers = []

const icon = {}
for (let ico in icons) {
  icon[ico] = L.icon(icons[ico])
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
const position = (axis, pos, y, z) => {
  if (axis === 2) {
    if (z) return [pos, z]
    if (Array.isArray(pos)) {
      if (pos.length === 3) return [pos[0], pos[2]]
      return pos
    }
    return [pos, y]
  }
  if (axis === 3) {
    if (z) return [pos, y, z]
    if (Array.isArray(pos)) {
      if (pos.length === 2) return [pos[0], null, pos[1]]
      return pos
    }
    return [pos, null, y]
  }
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
      minNativeZoom: 1,
      maxNativeZoom: 5,
      attribution: "The Nether - ScJPMC World Map exported from Xaero's World Map mod"
    }),
    end: L.tileLayer("/map/{z}/end/{x}_{y}.png", {
      tileSize: 256,
      noWrap: true,
      minZoom: -1,
      maxZoom: 8,
      minNativeZoom: 1,
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

  markerList.forEach(item => {
    const pos = item.position;
    const posDevide = pos[2] === -1 ? 8 : 1;

    let title = item.name;
    if (item.url) {
      title = `<a
        href="${item.url}"
        target="_blank" 
        rel="noopener noreferrer" 
        style=" text-decoration: none; ">${item.name.replace(/\r?\n/g, "<br/>")}</a>`;
    }

    item.marker = L.marker(posMCToMap([
      pos[0] / posDevide + .5,
      pos[1] / posDevide + .5
    ]), {
      icon: icon[item.icon] ?? icon.marker
    }).bindPopup(`<center>${title}<br><small>${position(3, item.position).map(p => p ?? "(?)").join(' ')}</small></center>`)
      .openPopup()
      markers.push(item)
  });

  const filterMarkers = (dim) => {
    if (typeof dim === "string") dim = dimID[dim]
    markers.forEach(i => {
      if (Array.isArray(i.dimension) ?
        i.dimension.includes(dim) :
        i.dimension === dim
      ) {
        i.marker.addTo(map)
        if (dim === dimID.nether){
          i.marker.setLatLng(
            posMCToMap(position(2, i.position).map(n => n / 8))
          ) 
        } else {
          i.marker.setLatLng(posMCToMap(position(2, i.position)))
        }
      } else {
        i.marker.removeFrom(map)
      }
    })
  }

  filterMarkers(dim.value)

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
    
    const newDimName = Object.entries(dimID).find(i => i[1] === id)?.at(0);
    const newLayer = layers[newDimName];
    
    const newZoom = Math.min(Math.max(newLayer.options.minZoom, zoom), newLayer.options.maxZoom)

    if (currentDim === 0 && id === -1) {
      map.setView(posMCToMap(
        [x.value / 8, z.value / 8]
      ), newZoom, { animate: false })
    } else if (currentDim === -1 && id === 0) {
      map.setView(posMCToMap(
        [x.value * 8, z.value * 8]
      ), newZoom, { animate: false })
    } else {
      map.setView(posMCToMap([
        positions[id]?.at(0) ?? 0,
        positions[id]?.at(1) ?? 0,
      ]), newZoom, { animate: false })
    }

    map.removeLayer(layers[dim.value]);
    map.addLayer(newLayer);

    filterMarkers(id)

    dim.value = newDimName;
    const pos = updatePosition();
    zoom = map.getZoom();
    updateParams(pos, zoom, dim.value);

    mouseX.value = x.value;
    mouseZ.value = z.value;
  }

  map.on('move zoom', updatePosition)
  map.on('mousemove touchmove', updateMousePos)

  map.on('moveend zoomend', () => {
    const pos = updatePosition();
    zoom = map.getZoom();
    updateParams(pos, zoom, dim.value);
  })

  map.on('mouseout', () => {
    mouseX.value = x.value;
    mouseZ.value = z.value;
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