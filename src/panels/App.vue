<script setup lang="ts">
import fs from 'fs/promises';
import path from 'path';
import { computed, onMounted, ref, watch } from 'vue';
import { name } from '../../package.json' with { type: 'json' };
import { file } from '../utils/file';
import { getBackupTree, type BackupTreeNode } from './backup-fs';
import { state } from './pina';

// import { ElMessageBox, ElMessage } from 'element-plus';

const treeData = ref<BackupTreeNode[]>([]);
const selectedFiles = ref<any[]>([]);
const currentDir = ref<string>('');
const selectedRows = ref<any[]>([]);
const treeRef = ref();

onMounted(async () => {
    await refreshTree();
});

watch(() => state.refreshFlag, () => {
    refreshTree();
});

async function refreshTree() {
    const rootDir = file.getPluginTempDir();
    treeData.value = await getBackupTree(rootDir);
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

function handleTreeDblClick() {
    const node = treeRef.value.getCurrentNode();
    if (node) {
        handleNodeDblClick(node);
    }
}
</script>

<template>
    <div class="backup-tool-root">
        <el-card class="tree-card">
            <div @dblclick="handleTreeDblClick">
                <el-tree ref="treeRef" :data="treeData" node-key="fullPath"
                    :props="{ label: 'label', children: 'children' }" @node-click="handleNodeClick" highlight-current
                    default-expand-all :expand-on-click-node="false" />
            </div>
        </el-card>
        <div class="main-panel">
            <el-card class="stats-card">
                <el-descriptions :column="4">
                    <el-descriptions-item label="总备份数">{{ stats.total }}</el-descriptions-item>
                    <el-descriptions-item label="场景文件">{{ stats.scene }}</el-descriptions-item>
                    <el-descriptions-item label="预制体">{{ stats.prefab }}</el-descriptions-item>
                    <el-descriptions-item label="总空间">{{ stats.totalSize }} B</el-descriptions-item>
                    <el-descriptions-item label="最近备份">{{ stats.lastTime || '-' }}</el-descriptions-item>
                </el-descriptions>
            </el-card>
            <el-card class="table-card">
                <div class="table-ops-wrap">
                    <el-button size="small" :disabled="!selectedRows.length" @click="batchImport">导入选中</el-button>
                    <el-button size="small" type="danger" :disabled="!selectedRows.length"
                        @click="batchDelete">删除选中</el-button>
                </div>
                <div class="table-scroll">
                    <el-table :data="selectedFiles" v-if="selectedFiles.length"
                        @selection-change="handleSelectionChange" style="margin-top: 8px;">
                        <el-table-column type="selection" width="40" />
                        <el-table-column label="类型" width="60">
                            <template #default="{ row }">
                                <ui-icon v-if="row.type === 'scene'" value="scene"
                                    style="font-size:20px;vertical-align:middle;" />
                                <ui-icon v-else-if="row.type === 'prefab'" value="prefab"
                                    style="font-size:20px;vertical-align:middle;" />
                            </template>
                        </el-table-column>
                        <el-table-column prop="label" label="文件名" />
                        <el-table-column prop="size" label="大小" />
                        <el-table-column prop="time" label="备份时间" />
                    </el-table>
                    <div v-else class="empty-tip">请选择目录或文件查看备份详情</div>
                </div>
            </el-card>
        </div>
    </div>
</template>

<style scoped>
.backup-tool-root {
    display: flex;
    height: 96vh;
    gap: 16px;
    padding: 6px;
    box-sizing: border-box;
}

.tree-card {
    width: 320px;
    min-width: 240px;
    max-width: 400px;
    height: 100%;
    display: flex;
    flex-direction: column;
    box-shadow: 0 2px 8px #0001;
    overflow-y: auto;
}

.main-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
    overflow-y: auto;
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
    margin-bottom: 8px;
}

.table-scroll {
    flex: 1;
    overflow-y: auto;
    min-height: 120px;
    max-height: 70vh;
}
</style>
