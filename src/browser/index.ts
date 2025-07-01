
import fs from 'fs/promises';
import path from "path";
import { name } from '../../package.json' with { type: 'json' };
import type { CocosAsset } from '../types';
import { file } from "../utils/file";
import { logger } from "../utils/logger";
import { formatDateTime } from '../utils/util';

// @ts-ignore
const { shell } = require('electron');

export const methods = {
    async open() {
        Editor.Panel.open(name);
    },
    getVersion() {
        return Editor.App.version;
    },

    async assetChange(uuid: string, data: CocosAsset ) {
        // logger.log(`assetChange ${uuid}`, data);
        
        if (!supportTypes.includes(data.type)) {
            // logger.warn(`不支持的资源类型: ${data.type}`);
            return;
        }
        await backupAssetFile(data.file, data.type);
    },
    async openInExplorer(fullPath: string) {
        shell.showItemInFolder(fullPath);
    },
};

const supportTypes = ['cc.Prefab', 'cc.SceneAsset'];

export async function load() {
    logger.log(`load ${name}`);
}

export function unload() {
    logger.log(`unload ${name}`);
}

function getTypeDir(type: string, backupRootDir: string): string {
    let typeDir = '';
    if (type === 'cc.Prefab') typeDir = 'prefab';
    else if (type === 'cc.SceneAsset') typeDir = 'scene';
    else return '';
    const targetDir = path.join(backupRootDir, typeDir);
    file.ensureDir(targetDir);
    return targetDir;
}

function getBackupFilePath(srcFilePath: string, targetDir: string, date: Date): string {
    const ext = path.extname(srcFilePath);
    const base = path.basename(srcFilePath, ext);
    const timeStr = formatDateTime(date, 'YYYYMMDD_HHmmss');
    return path.join(targetDir, `${base}_${timeStr}${ext}`);
}

async function backupAssetFile(srcFilePath: string, type: string) {
    const backupRootDir = file.getPluginTempDir();
    const typeDir = getTypeDir(type, backupRootDir);
    if (!typeDir) {
        // logger.warn(`不支持的资源类型: ${type}`);
        return;
    }
    const now = new Date();
    const dateStr = formatDateTime(now, 'YYYY-MM-DD');
    const hourStr = formatDateTime(now, 'HH');
    const minute = now.getMinutes();
    const minuteGroup = Math.floor(minute / 10) * 10;
    const minuteStr = minuteGroup.toString().padStart(2, '0');
    const hourMinuteDir = `${hourStr}-${minuteStr}`;
    const targetDir = path.join(typeDir, dateStr, hourMinuteDir);
    file.ensureDir(targetDir);
    const backupPath = getBackupFilePath(srcFilePath, targetDir, now);
    try {
        await fs.copyFile(srcFilePath, backupPath);
        logger.log(`备份成功: ${backupPath}`);
    } catch (e) {
        logger.error(`备份失败: ${e}`);
    }
}
