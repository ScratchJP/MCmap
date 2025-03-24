<script setup>
import { ref } from 'vue'

defineProps({
  x: Number,
  z: Number
})
</script>

<template>
  <div class="panel">
    <span>{{ x.toFixed(2) }}, {{ z.toFixed(2) }}</span>
  </div>
</template>

<style scoped>
.panel {
  text-align: center;
  padding: 8px;
  background: #000000e0;
  padding-top: 4px;
}
</style>
