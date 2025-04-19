<script setup>
import { ref } from 'vue'

defineProps({
  x: Number,
  z: Number,
  debug: Boolean,
})
</script>

<template>
  <div class="panel">
    <div>
      {{ x.toFixed(2) }}, {{ z.toFixed(2) }}
    </div>
    <div
      class="detail"
      :style="{
        fontSize: `${debug * 75}%`, 
        opacity: debug * 1
      }"
    >
      Debug Mode Enabled
    </div>
  </div>
</template>

<style scoped>
.panel {
  text-align: center;
  padding: 4px 8px;
  background: #000000e0;
  line-height: 1.5;
}
.detail {
  color: #00ffffbe;
  font-size: 75%;
  transition: .5s var(--ease-out-expo);
}
</style>
