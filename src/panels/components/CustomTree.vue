<template>
    <ul class="custom-tree">
        <TreeNode v-for="node in data" :key="node.fullPath" :node="node" :selected-node="selectedNode"
            :render-icon="renderIcon" :render-label="renderLabel" :render-actions="renderActions"
            @click="$emit('click', $event)" @dblclick="$emit('dblclick', $event)" />
    </ul>
</template>

<script setup lang="ts">
import TreeNode from './TreeNode.vue';
const props = defineProps<{
    data: any[];
    selectedNode?: any;
    renderIcon?: (node: any) => any;
    renderLabel?: (node: any) => any;
    renderActions?: (node: any) => any;
}>();
</script>

<style scoped>
.custom-tree {
    list-style: none;
    margin: 0;
    padding: 0;
    width: 100%;
    box-sizing: border-box;

}

.custom-tree>li {
    width: 100%;
    box-sizing: border-box;
}
</style>