<script setup lang="ts">
import { ElButton } from 'element-plus';
import fs from 'fs/promises';
import path from 'path';
import { computed, h, onMounted, ref, watch } from 'vue';
import { name } from '../../package.json' with { type: 'json' };
import { clearAllBackups } from '../utils/cleanup';
import { file } from '../utils/file';
import { profile } from '../utils/profile';
import { getBackupTree, type BackupTreeNode } from './backup-fs';
import CustomTable from './components/CustomTable.vue';
import CustomTree from './components/CustomTree.vue';
import TypeFilter from './components/TypeFilter.vue';
import { state } from './pina';

// import { ElMessageBox, ElMessage } from 'element-plus';

const treeData = ref<BackupTreeNode[]>([]);
const selectedFiles = ref<any[]>([]);
const currentDir = ref<string>('');
const selectedRows = ref<any[]>([]);
const treeRef = ref();
const selectedNode = ref<any>(null);

// 拖拽分割线相关
const leftWidth = ref(320); // 初始宽度
const dragging = ref(false);

// 自动清理设置
const CLEAN_KEY = 'keepDays';
const cleanDays = ref(7);
const showCleanDialog = ref(false);

const typeFilter = ref('all'); // 新增：类型筛选

const typeOptions = [
    { value: 'all', label: '全部' },
    { value: 'scene', label: '场景' },
    { value: 'prefab', label: '预制体' },
];

onMounted(async () => {
    await refreshTree();
    const val = await profile.getConfig(CLEAN_KEY);
    if (typeof val === 'number' && !isNaN(val)) {
        cleanDays.value = val;
    }
});

watch(() => state.refreshFlag, () => {
    refreshTree();
});

async function refreshTree() {
    const rootDir = file.getPluginTempDir();
    let keepDays = await profile.getConfig('keepDays');
    if (typeof keepDays !== 'number' || isNaN(keepDays)) keepDays = 7;
    treeData.value = await getBackupTree(rootDir, keepDays);
    if (currentDir.value) {
        const node = findNodeByPath(treeData.value, currentDir.value.split(path.sep));
        if (node) handleNodeClick(node);
        else selectedFiles.value = [];
    }
    if (!selectedFiles.value.length) {
        selectedRows.value = [];
    }
}

function findNodeByPath(nodes: any[], pathArr: string[]): any {
    if (!pathArr.length) return null;
    const [head, ...rest] = pathArr;
    const node = nodes.find(n => n.label === head);
    if (!node) return null;
    if (rest.length === 0) return node;
    if (node.children) return findNodeByPath(node.children, rest);
    return null;
}

const stats = computed(() => {
    let total = 0, scene = 0, prefab = 0, totalSize = 0, lastTime = '';
    function walk(nodes: any[]) {
        for (const n of nodes) {
            if (n.isFile) {
                total++;
                totalSize += n.size || 0;
                if (n.type === 'scene') scene++;
                if (n.type === 'prefab') prefab++;
                if (!lastTime || n.time > lastTime) lastTime = n.time;
            } else if (n.children) {
                walk(n.children);
            }
        }
    }
    walk(treeData.value);
    return { total, scene, prefab, totalSize, lastTime };
});

function handleNodeClick(data: any) {
    if (!data.isFile && data.children) {
        const files: any[] = [];
        function collectFiles(nodes: any[]) {
            for (const n of nodes) {
                if (n.isFile) files.push(n);
                else if (n.children) collectFiles(n.children);
            }
        }
        collectFiles(data.children);
        selectedFiles.value = files;
        currentDir.value = data.fullPath;
        if (!files.length) {
            selectedRows.value = [];
        }
    } else if (data.isFile) {
        selectedFiles.value = [data];
    }
}

function handleSelectionChange(val: any[]) {
    selectedRows.value = val;
}

async function batchImport() {
    for (const row of selectedRows.value) {
        await importFile(row);
    }
}

async function batchDelete() {
    if (!selectedRows.value.length) return;
    const result = await Editor.Dialog.warn(`确定要删除选中的 ${selectedRows.value.length} 个文件吗？`, {
        title: '批量删除确认',
        buttons: ['删除', '取消']
    });
    if (result.response === 0) {
        for (const row of selectedRows.value) {
            await deleteFile(row, false);
        }
        await Editor.Dialog.info('批量删除完成', { title: '提示' });
        await refreshTree();
    }
}

async function importFile(row: any) {
    // 弹出选择文件夹对话框
    const result = await Editor.Dialog.select({
        title: '选择导入目标文件夹',
        type: 'directory',
        multi: false
    });
    if (result.canceled || !result.filePaths || !result.filePaths[0]) {
        return;
    }
    const targetDir = result.filePaths[0];
    const srcPath = getFileFullPath(row);
    // 计算目标 url 路径
    // 假设用户选择的 targetDir 是 assets 目录下的某个文件夹
    // 需要将其转为 asset-db url，如 'db://assets/xxx/yyy/'
    let assetUrl = '';
    const assetsRoot = path.join(Editor.Project.path, 'assets');
    if (targetDir.startsWith(assetsRoot)) {
        const rel = path.relative(assetsRoot, targetDir).replace(/\\/g, '/');
        assetUrl = 'db://assets' + (rel ? '/' + rel : '');
    } else {
        await Editor.Dialog.error('请选择 assets 目录下的文件夹', { title: '错误' });
        return;
    }
    assetUrl = assetUrl + '/' + row.label;
    try {
        await Editor.Message.request('asset-db', 'import-asset', srcPath, assetUrl, { overwrite: true, rename: true });
        await Editor.Dialog.info('导入成功', { title: '提示' });
    } catch (e) {
        await Editor.Dialog.error('导入失败: ' + e, { title: '错误' });
    }
}

function getFileFullPath(row: any) {
    const rootDir = file.getPluginTempDir();
    return path.join(rootDir, row.fullPath);
}

async function deleteFile(row: any, confirm = true) {
    const rootDir = file.getPluginTempDir();
    const filePath = getFileFullPath(row);
    // logger.log('deleteFile', filePath);
    if (confirm) {
        const result = await Editor.Dialog.warn(`确定要删除文件：${row.label} 吗？`, {
            title: '删除确认',
            buttons: ['删除', '取消']
        });
        if (result.response !== 0) return;
    }
    try {
        await fs.unlink(filePath);
        // 递归删除空目录
        let dir = path.dirname(filePath);
        while (dir !== rootDir) {
            const files = await fs.readdir(dir);
            if (files.length === 0) {
                await fs.rmdir(dir);
                dir = path.dirname(dir);
            } else {
                break;
            }
        }
        if (confirm) {
            await Editor.Dialog.info('删除成功', { title: '提示' });
            await refreshTree();
        }
    } catch (e) {
        await Editor.Dialog.error('删除失败: ' + e, { title: '错误' });
    }
}

async function handleNodeDblClick(data: any) {
    const rootDir = file.getPluginTempDir();
    const fullPath = path.join(rootDir, data.fullPath);
    Editor.Message.send(name, 'open-in-explorer', fullPath);
}

function handleTreeNodeClick(node: any) {
    selectedNode.value = node;
    handleNodeClick(node);
}

function handleTreeNodeDblClick(node: any) {
    handleNodeDblClick(node);
}

async function clearAll() {
    const rootDir = file.getPluginTempDir();
    const result = await Editor.Dialog.warn('确定要清空所有备份吗？此操作不可恢复！', {
        title: '全部清除确认',
        buttons: ['清空', '取消']
    });
    if (result.response === 0) {
        await clearAllBackups(rootDir);
        await Editor.Dialog.info('已全部清除', { title: '提示' });
        await refreshTree();
    }
}

function onSplitterMouseDown(e: MouseEvent) {
    dragging.value = true;
    document.body.style.cursor = 'col-resize';
    const startX = e.clientX;
    const startWidth = leftWidth.value;
    function onMouseMove(ev: MouseEvent) {
        const delta = ev.clientX - startX;
        let newWidth = startWidth + delta;
        newWidth = Math.max(200, Math.min(newWidth, 600)); // 限制宽度
        leftWidth.value = newWidth;
    }
    function onMouseUp() {
        dragging.value = false;
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}

function openCleanDialog() {
    showCleanDialog.value = true;
}

async function saveCleanDays() {
    await profile.setConfig(CLEAN_KEY, cleanDays.value);
    showCleanDialog.value = false;
}

// 新增：递归过滤树节点
function filterTreeByType(nodes: BackupTreeNode[], type: string): BackupTreeNode[] {
    if (type === 'all') return nodes;
    return nodes
        .map(node => {
            if (node.isFile) {
                return node.type === type ? node : null;
            } else if (node.children) {
                const filteredChildren = filterTreeByType(node.children, type);
                if (filteredChildren.length > 0) {
                    return { ...node, children: filteredChildren };
                }
            }
            return null;
        })
        .filter(Boolean) as BackupTreeNode[];
}

const filteredTreeData = computed(() => filterTreeByType(treeData.value, typeFilter.value));

// 渲染函数
const renderIcon = (node: any) => {
    if (node.type === 'scene') return h('ui-icon', { value: 'scene', style: 'font-size:16px;' });
    if (node.type === 'prefab') return h('ui-icon', { value: 'prefab', style: 'font-size:16px;' });
    if (!node.isFile) return h('ui-icon', { value: 'folder', style: 'font-size:16px;' });
    return null;
};
const renderLabel = (node: any) => h('span', [node.label, node.isFile ? h('span', { style: 'color: #888;' }, ` (${node.size}B)`) : null]);
const renderActions = (node: any) => null;
</script>

<template>
    <div class="split-container">
        <div class="tree-card" :style="{ width: leftWidth + 'px', height: '100%' }">
            <el-card class="filter-card">
                <TypeFilter v-model="typeFilter" :types="typeOptions" />
            </el-card>
            <el-card
                class="tree-el-card"
                style="flex: 1; min-height: 0; display: flex; flex-direction: column; overflow-y: auto;">
                <CustomTree :data="filteredTreeData" :selected-node="selectedNode" :render-icon="renderIcon"
                    :render-label="renderLabel" :render-actions="renderActions" @click="handleTreeNodeClick"
                    @dblclick="handleTreeNodeDblClick" />
            </el-card>
        </div>
        <div class="splitter" :class="{ dragging }" @mousedown="onSplitterMouseDown"></div>
        <div class="main-panel">
            <el-card class="toolbar-card">
                <div class="toolbar">
                    <el-button size="small" type="warning" @click="clearAll" icon="el-icon-delete" plain>
                        全部清除
                    </el-button>
                    <el-button size="small" icon="el-icon-setting" @click="openCleanDialog" plain>
                        自动清理设置
                    </el-button>
                    <span class="clean-desc">自动保留 <b>{{ cleanDays }}</b> 天</span>
                </div>
            </el-card>
            <el-dialog v-model="showCleanDialog" title="自动清理设置" width="320px">
                <div style="margin: 16px 0;">
                    仅保留最近
                    <el-input-number v-model="cleanDays" :min="1" :max="90" />
                    天的备份，超期自动删除。
                </div>
                <template #footer>
                    <el-button @click="showCleanDialog = false">取消</el-button>
                    <el-button type="primary" @click="saveCleanDays">确定</el-button>
                </template>
            </el-dialog>
            <el-card class="stats-card">
                <el-descriptions :column="4" class="stats-desc" border>
                    <el-descriptions-item label="总备份数">{{ stats.total }}</el-descriptions-item>
                    <el-descriptions-item label="场景文件">{{ stats.scene }}</el-descriptions-item>
                    <el-descriptions-item label="预制体">{{ stats.prefab }}</el-descriptions-item>
                    <el-descriptions-item label="总空间">{{ stats.totalSize }} B</el-descriptions-item>
                    <el-descriptions-item label="最近备份">{{ stats.lastTime || '-' }}</el-descriptions-item>
                </el-descriptions>
            </el-card>
            <el-card>
                <div class="table-ops-wrap">
                    <el-button size="small" :disabled="!selectedRows.length" @click="batchImport">导入选中</el-button>
                    <el-button size="small" type="danger" :disabled="!selectedRows.length"
                        @click="batchDelete">删除选中</el-button>
                </div>
            </el-card>

            <el-card class="table-card">

                <CustomTable :data="selectedFiles" :columns="[
                    { label: '类型', prop: 'type', slot: 'type' },
                    { label: '文件名', prop: 'label' },
                    { label: '大小', prop: 'size' },
                    { label: '备份时间', prop: 'time' }
                ]" rowKey="fullPath" height="100%" v-model:selected="selectedRows" :selectable="true">
                    <template #type="{ row }">
                        <ui-icon v-if="row.type === 'scene'" value="scene"
                            style="font-size:20px;vertical-align:middle;" />
                        <ui-icon v-else-if="row.type === 'prefab'" value="prefab"
                            style="font-size:20px;vertical-align:middle;" />
                    </template>
                </CustomTable>

            </el-card>
        </div>
    </div>
</template>

<style scoped>
.split-container {
    display: flex;
    height: 96vh;
    gap: 0;
    padding: 6px;
    box-sizing: border-box;
    position: relative;
}

.splitter {
    width: 3px;
    cursor: col-resize;
    background: linear-gradient(to right, #4446, #8884, #4446);
    height: 100%;
    z-index: 10;
    position: relative;
    transition: background 0.2s;
    margin: 0 2px;
}

.splitter:hover,
.splitter.dragging {
    background: linear-gradient(to right, #ffd966, #ff9900, #ffd966);
    box-shadow: 0 0 6px 2px #ff990055;
    border-radius: 2px;
}

.main-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-left: 6px;
}

.toolbar-card {
    margin-bottom: 0;
    box-shadow: 0 2px 8px #0001;
}

.stats-card {
    margin-bottom: 0;
    box-shadow: 0 2px 8px #0001;
}

.table-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    box-shadow: 0 2px 8px #0001;
    margin-bottom: 0;
    min-height: 0;
    overflow-y: auto;
}

.empty-tip {
    text-align: center;
    margin-top: 40px;
    font-size: 15px;
    letter-spacing: 1px;
}

.table-ops-wrap {
    display: flex;
    gap: 8px;
}

.el-table {
    flex: 1;
    min-height: 0;
}

.toolbar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 0;
    gap: 8px;
}

.clean-desc {
    margin-left: 12px;
    color: #888;
    font-size: 13px;
}

.tree-card {
    min-width: 200px;
    max-width: 600px;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    transition: width 0.1s;
    margin-right: 6px;
    gap: 2px;
    min-height: 0;
}
.tree-el-card {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
}
.stats-desc {
    --el-descriptions-item-padding: 6px 12px;
    --el-descriptions-border-color: #3336;
    --el-descriptions-label-color: #8ecfff;
    --el-descriptions-content-color: #eee;
    background: #232323;
    border-radius: 4px;
    font-size: 14px;
}
.stats-desc .el-descriptions__cell {
    background: transparent;
}
.stats-desc .el-descriptions__label {
    color: #8ecfff;
    font-weight: 500;
}
.stats-desc .el-descriptions__content {
    color: #eee;
}
</style>

<style>
.el-card__body {
    padding: 4px !important;

}
</style>
