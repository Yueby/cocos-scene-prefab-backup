import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';

function parseTimeFromFileName(fileName: string): Date | null {
	const match = fileName.match(/_(\d{8}_\d{6})/);
	if (match) {
		const t = match[1];
		const year = Number(t.slice(0, 4));
		const month = Number(t.slice(4, 6)) - 1;
		const day = Number(t.slice(6, 8));
		const hour = Number(t.slice(9, 11));
		const min = Number(t.slice(11, 13));
		const sec = Number(t.slice(13, 15));
		return new Date(year, month, day, hour, min, sec);
	}
	return null;
}

function parseDateFromPath(relPath: string): Date | null {
	const parts = relPath.split(path.sep);
	for (const part of parts) {
		if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return new Date(part);
	}
	return null;
}

/**
 * 清理指定目录下超过指定天数的备份文件（递归，按路径/文件名解析时间）
 * @param rootDir 备份根目录
 * @param days 保留天数，默认7天
 */
export async function cleanupOldBackups(rootDir: string, days = 7) {
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const threshold = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

	async function walk(dir: string, relPath: string = '') {
		let entries: any[];
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			const nodeRelPath = relPath ? path.join(relPath, entry.name) : entry.name;
			if (entry.isDirectory()) {
				await walk(fullPath, nodeRelPath);
				// 删除空目录
				try {
					const remain = await fs.readdir(fullPath);
					if (remain.length === 0) {
						await fs.rmdir(fullPath);
					}
				} catch {}
			} else {
				let fileDate = parseTimeFromFileName(entry.name);
				if (!fileDate) fileDate = parseDateFromPath(nodeRelPath);
				// logger.info(`[自动清理] 检查文件: ${fullPath}, 解析时间: ${fileDate ? fileDate.toLocaleString() : '无'}, 阈值: ${threshold.toLocaleString()}`);
				if (!fileDate) continue;
				if (fileDate < threshold) {
					try {
						await fs.unlink(fullPath);
						logger.info(`[自动清理] 已删除过期备份 ${fullPath}`);
					} catch {}
				}
			}
		}
	}
	await walk(rootDir, '');
}

/**
 * 全部清除指定目录下的所有备份文件和子目录
 * @param rootDir 备份根目录
 */
export async function clearAllBackups(rootDir: string) {
	async function rmrf(dir: string) {
		let entries: any[];
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				await rmrf(fullPath);
				try {
					await fs.rmdir(fullPath);
				} catch {}
			} else {
				try {
					await fs.unlink(fullPath);
				} catch {}
			}
		}
	}
	await rmrf(rootDir);
	logger.info(`全部清除：已清空 ${rootDir}`);
}
