<template>
  <div class="custom-table-wrap">
    <table class="custom-table">
      <thead>
        <tr>
          <th v-if="selectable" class="custom-table-checkbox">
            <input type="checkbox" :checked="isAllSelected()" @change="toggleAll" :disabled="!data.length" />
          </th>
          <th v-for="col in columns" :key="col.key || col.prop">{{ col.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in data" :key="row[rowKey]"
            :class="{ selected: isSelected(row) }">
          <td v-if="selectable" class="custom-table-checkbox">
            <input type="checkbox" :checked="isSelected(row)" @change="toggleRow(row, $event)" />
          </td>
          <td v-for="col in columns" :key="col.key || col.prop">
            <slot :name="col.slot" v-bind="{ row, col }">
              {{ row[col.prop] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="!data.length" class="custom-table-empty">暂无数据</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
const props = defineProps<{
  data: any[];
  columns: { label: string; prop: string; key?: string; slot?: string }[];
  rowKey?: string;
  selectable?: boolean;
  selected?: any[];
}>();
const emits = defineEmits(['update:selected']);
const rowKey = props.rowKey || 'id';
const selectable = props.selectable ?? true;
const selectedRows = ref(props.selected ? [...props.selected] : []);

watch(() => props.selected, (val) => {
  if (val) selectedRows.value = [...val];
});

const isSelected = (row: any) => selectedRows.value.some(r => r[rowKey] === row[rowKey]);
const isAllSelected = () => props.data.length > 0 && props.data.every(row => isSelected(row));
function toggleAll(e: Event) {
  if ((e.target as HTMLInputElement).checked) {
    selectedRows.value = [...props.data];
  } else {
    selectedRows.value = [];
  }
  emits('update:selected', selectedRows.value);
}
function toggleRow(row: any, e: Event) {
  const idx = selectedRows.value.findIndex(r => r[rowKey] === row[rowKey]);
  if (idx === -1) {
    selectedRows.value.push(row);
  } else {
    selectedRows.value.splice(idx, 1);
  }
  emits('update:selected', selectedRows.value);
}
</script>

<style scoped>
.custom-table-wrap {
  background: #232323;
  border-radius: 4px;
  box-shadow: 0 2px 8px #0001;
  width: 100%;
}
.custom-table {
  width: 100%;
  border-collapse: collapse;
  background: transparent;
  color: #eee;
  font-size: 14px;
}
.custom-table th, .custom-table td {
  border-bottom: 1px solid #3336;
  padding: 6px 12px;
  text-align: left;
  white-space: nowrap;
}
.custom-table th {
  background: #232323;
  color: #bbb;
  font-weight: 500;
}
.custom-table-checkbox {
  width: 36px;
  text-align: center;
}
.custom-table tbody tr {
  transition: background 0.15s;
}
.custom-table tbody tr.selected {
  background: #2a2d32;
  color: #8ecfff;
}
.custom-table tbody tr:hover {
  background: #31343a;
}
.custom-table input[type="checkbox"] {
  accent-color: #409eff;
  width: 16px;
  height: 16px;
  margin: 0;
}
.custom-table-empty {
  text-align: center;
  color: #888;
  padding: 24px 0;
}
</style> 