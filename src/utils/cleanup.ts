import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';

/**
 * 清理指定目录下超过指定天数的备份文件（递归）
 * @param rootDir 备份根目录
 * @param days 保留天数，默认7天
 */
export async function cleanupOldBackups(rootDir: string, days = 7) {
	const now = Date.now();
	const threshold = now - days * 24 * 60 * 60 * 1000;

	async function walk(dir: string) {
		let entries: any[];
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				await walk(fullPath);
				// 删除空目录
				try {
					const remain = await fs.readdir(fullPath);
					if (remain.length === 0) {
						await fs.rmdir(fullPath);
					}
				} catch {}
			} else {
				try {
					const stat = await fs.stat(fullPath);
					if (stat.mtime.getTime() < threshold) {
						await fs.unlink(fullPath);
						logger.info(`自动清理：已删除过期备份 ${fullPath}`);
					}
				} catch {}
			}
		}
	}
	await walk(rootDir);
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
