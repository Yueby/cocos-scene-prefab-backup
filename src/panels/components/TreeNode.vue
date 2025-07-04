<template>
    <li>
        <div class="tree-node-content" :class="{ selected, clickable: true }" @click="onClick" @dblclick="onDblClick"
            @mouseenter="hovered = true" @mouseleave="hovered = false">
            <span v-if="hasChildren" class="tree-toggle" @click.stop="toggle">
                <svg v-if="!collapsed" width="12" height="12" viewBox="0 0 12 12">
                    <path d="M3 5l3 3 3-3" stroke="#888" stroke-width="1.5" fill="none" />
                </svg>
                <svg v-else width="12" height="12" viewBox="0 0 12 12">
                    <path d="M5 3l3 3-3 3" stroke="#888" stroke-width="1.5" fill="none" />
                </svg>
            </span>
            <span v-if="renderIcon" class="tree-node-icon">
                <component :is="renderIcon(node)" />
            </span>
            <span class="tree-node-label">
                <component v-if="renderLabel" :is="renderLabel(node)" />
                <span v-else>{{ node.label }}</span>
            </span>
            <span v-if="renderActions" class="tree-node-actions">
                <component :is="renderActions(node)" />
            </span>
        </div>
        <ul v-if="hasChildren && !collapsed">
            <TreeNode v-for="child in node.children" :key="child.fullPath" :node="child" :selected-node="selectedNode"
                :render-icon="renderIcon" :render-label="renderLabel" :render-actions="renderActions"
                @click="emitClick" @dblclick="emitDblClick" />
        </ul>
    </li>
</template>

<script setup lang="ts">
import { computed, defineEmits, ref } from 'vue';
const props = defineProps<{
    node: any;
    selectedNode?: any;
    renderIcon?: (node: any) => any;
    renderLabel?: (node: any) => any;
    renderActions?: (node: any) => any;
}>();
const emits = defineEmits(['click', 'dblclick']);
const collapsed = ref(false);
const hasChildren = computed(() => props.node.children && props.node.children.length > 0);
const hovered = ref(false);
const selected = computed(() => props.selectedNode && props.selectedNode.fullPath === props.node.fullPath);

function toggle() {
    collapsed.value = !collapsed.value;
}
function onClick(e: MouseEvent) {
    emits('click', props.node);
}
function onDblClick(e: MouseEvent) {
    emits('dblclick', props.node);
}
function emitClick(node: any) {
    emits('click', node);
}
function emitDblClick(node: any) {
    emits('dblclick', node);
}
</script>

<style scoped>
.tree-node-content {
    display: flex;
    align-items: center;
    gap: 1px;
    padding: 2px 4px;
    border-radius: 4px;
    min-height: 28px;
    transition: background 0.15s;
    width: 100%;
    box-sizing: border-box;
    border-bottom: 1px solid #8883;
    background: rgba(255,255,255,0.04);
}

.tree-node-content.clickable {
    cursor: pointer;
}

.tree-node-content:hover {
    background: #f5f7fa22;
}

.tree-node-content.selected {
    background: #409eff22;
    color: #409eff;
}

.tree-toggle {
    display: flex;
    align-items: center;
    cursor: pointer;
    margin-right: 0;
    width: 16px;
    height: 16px;
    user-select: none;
}

.tree-node-icon {
    display: flex;
    align-items: center;
    justify-content: center;
}

.tree-node-actions {
    display: flex;
    gap: 2px;
}

ul {
    list-style: none;
    margin: 0;
    padding-left: 18px;
}

li {
    padding: 0;
    margin: 0 0 1px 0;
}

.tree-node-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 180px;
    display: inline-block;
    vertical-align: middle;
}
</style>