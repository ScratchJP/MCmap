<script setup>
import { ref } from 'vue'

defineProps({
  icon: String,
  name: String
})
</script>

<template>
  <a class="button" :title="name">
    <img 
      :alt="name" 
      :src="icon" 
      class="button-icon">
  </a>
</template>

<style scoped>
.button {
  background: #fff;
  padding: 4px;
  line-height: 0;
  border-bottom: solid 1px #ccc;
  cursor: pointer;
}
.button:hover {
  background: #f4f4f4;
}
.button-icon {
  width:  28px;
  height: 28px;
  pointer-events: none;
}
</style>
