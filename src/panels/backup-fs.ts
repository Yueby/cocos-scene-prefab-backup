import fs from 'fs/promises';
import path from 'path';
import { cleanupOldBackups } from '../utils/cleanup';

export interface BackupTreeNode {
	label: string;
	isFile?: boolean;
	size?: number;
	time?: string;
	type?: string;
	children?: BackupTreeNode[];
	fullPath: string; // 相对 plugintempdir 的完整路径
	parentPath?: string; // 父目录的相对路径
	maxTime?: string; // 本节点及其子节点的最大时间
	date?: string; // 日期目录
	hour?: string; // 小时段目录
	minuteGroup?: string; // 分组目录
}

function parseDateFromPath(relPath: string): string | null {
	const parts = relPath.split(path.sep);
	for (const part of parts) {
		if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
	}
	return null;
}

function parseHourFromPath(relPath: string): string | null {
	const parts = relPath.split(path.sep);
	for (const part of parts) {
		if (/^\d{2}-\d{2}$/.test(part)) return part.split('-')[0];
	}
	return null;
}

function parseMinuteGroupFromPath(relPath: string): string | null {
	const parts = relPath.split(path.sep);
	for (const part of parts) {
		if (/^\d{2}-\d{2}$/.test(part)) return part.split('-')[1];
	}
	return null;
}

function parseTimeFromFileName(fileName: string): string | null {
	const match = fileName.match(/_(\d{8}_\d{6})/);
	if (match) {
		const t = match[1];
		return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)} ${t.slice(9, 11)}:${t.slice(11, 13)}:${t.slice(13, 15)}`;
	}
	return null;
}

// 递归读取目录，生成树结构
export async function getBackupTree(rootDir: string, keepDays = 7): Promise<BackupTreeNode[]> {
	// 初始化时先清理一次
	await cleanupOldBackups(rootDir, keepDays);
	async function walk(dir: string, relPath: string = '', parentPath: string = '', depth = 0): Promise<BackupTreeNode[]> {
		let entries: any[];
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			return [];
		}
		const nodes: BackupTreeNode[] = [];
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			const nodeRelPath = relPath ? path.join(relPath, entry.name) : entry.name;
			if (entry.isDirectory()) {
				const children = await walk(fullPath, nodeRelPath, nodeRelPath, depth + 1);
				// 递归获取最大时间
				let maxTime = '';
				for (const c of children) {
					if (c.maxTime && (!maxTime || c.maxTime > maxTime)) maxTime = c.maxTime;
					else if (c.time && (!maxTime || c.time > maxTime)) maxTime = c.time;
				}
				nodes.push({
					label: entry.name,
					isFile: false,
					fullPath: nodeRelPath,
					parentPath: parentPath,
					children,
					maxTime,
					date: parseDateFromPath(nodeRelPath) || undefined,
					hour: parseHourFromPath(nodeRelPath) || undefined,
					minuteGroup: parseMinuteGroupFromPath(nodeRelPath) || undefined
				});
			} else {
				const ext = path.extname(entry.name);
				const type = ext === '.scene' ? 'scene' : ext === '.prefab' ? 'prefab' : '';
				let stat;
				try {
					stat = await fs.stat(fullPath);
				} catch {
					stat = { size: 0 };
				}
				const timeStr = parseTimeFromFileName(entry.name);
				nodes.push({
					label: entry.name,
					isFile: true,
					size: Number(stat.size) || 0,
					time: timeStr || undefined,
					type,
					fullPath: nodeRelPath,
					parentPath: parentPath,
					maxTime: timeStr || undefined,
					date: parseDateFromPath(nodeRelPath) || undefined,
					hour: parseHourFromPath(nodeRelPath) || undefined,
					minuteGroup: parseMinuteGroupFromPath(nodeRelPath) || undefined
				});
			}
		}
		// 排序
		if (depth === 0) {
			// 第一层（类型分类）按名称
			nodes.sort((a, b) => a.label.localeCompare(b.label, 'zh'));
		} else {
			// 其余层按maxTime降序
			nodes.sort((a, b) => {
				const ta = a.maxTime || a.time || '';
				const tb = b.maxTime || b.time || '';
				return tb.localeCompare(ta);
			});
		}
		return nodes;
	}
	return walk(rootDir, '', '', 0);
}
