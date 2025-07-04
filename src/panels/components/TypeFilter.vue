<template>
  <div class="type-filter-custom">
    <button
      v-for="item in types"
      :key="item.value"
      :class="['type-btn', { active: modelValue === item.value }]"
      @click="$emit('update:modelValue', item.value)"
      type="button"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
  types: { value: string; label: string }[];
}>();
</script>

<style>
.type-filter-custom {
  display: flex;
  gap: 8px;
  /* margin-bottom: 8px; */
}
.type-btn {
  background: #232323;
  color: #bbb;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 3px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, border-color 0.18s;
  outline: none;
}
.type-btn.active,
.type-btn:hover {
  background: #409eff22;
  color: #409eff;
  border-color: #409eff;
}
.type-btn:active {
  background: #409eff33;
}
</style> 