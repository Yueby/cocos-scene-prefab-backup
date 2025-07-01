import * as fs from 'fs';
import * as path from 'path';
import type { Plugin } from 'vite';

/**
 * 构建Cocos Creator插件包的Vite插件配置选项
 */
export interface BuildCocosPluginOptions {
	/**
	 * 构建输出目录，默认为 './build'
	 * 可以是相对路径或绝对路径
	 */
	outputDir?: string;
}

/**
 * 构建Cocos Creator插件包的Vite插件
 * 清空目标包目录，并将构建文件按插件规范组织到 outputDir/packageName 目录下
 * @param options 插件配置选项
 */
export function buildCocosPluginPackage(options: BuildCocosPluginOptions = {}): Plugin {
	// 设置默认输出目录
	const outputDir = options.outputDir || './build';

	return {
		name: 'build-cocos-plugin-package',
		apply: 'build',
		closeBundle: async () => {
			try {
				// 处理输出目录路径（支持相对路径和绝对路径）
				const buildDir = path.isAbsolute(outputDir) ? outputDir : path.resolve(process.cwd(), outputDir);

				// 读取包名
				const packageName = getPackageName();
				const packageDir = path.join(buildDir, packageName);

				// 清空包目录（如果存在）
				if (fs.existsSync(packageDir)) {
					removeDirSync(packageDir);
				}

				// 创建目标目录
				fs.mkdirSync(packageDir, { recursive: true });

				// 复制文件夹
				['dist', 'i18n', 'assets'].forEach((dir) => {
					if (fs.existsSync(dir)) {
						copyDirSync(dir, path.join(packageDir, dir));
					}
				});

				// 处理package.json
				processPackageJson(path.join(packageDir, 'package.json'));

				console.log(`插件包已成功构建到 ${packageDir} 文件夹`);
			} catch (error) {
				console.error('构建插件包时出错:', error);
			}
		}
	};
}

/**
 * 递归删除文件夹
 */
function removeDirSync(dir: string): void {
	if (fs.existsSync(dir)) {
		fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				removeDirSync(fullPath);
			} else {
				fs.unlinkSync(fullPath);
			}
		});
		fs.rmdirSync(dir);
	}
}

/**
 * 获取package.json中的包名
 */
function getPackageName(): string {
	try {
		const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
		return packageJson.name || 'Plugin Name';
	} catch {
		return 'Plugin Name';
	}
}

/**
 * 处理package.json文件
 */
function processPackageJson(destPath: string): void {
	try {
		// 读取原始package.json
		const originalPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

		// 创建新的package.json对象，只包含指定字段
		const newPackageJson = {
			package_version: originalPackageJson.package_version,
			version: originalPackageJson.version,
			name: originalPackageJson.name,
			title: originalPackageJson.title,
			description: originalPackageJson.description,
			author: originalPackageJson.author,
			editor: originalPackageJson.editor,
			main: originalPackageJson.main,
			panels: originalPackageJson.panels,
			contributions: originalPackageJson.contributions
		};

		// 写入新的package.json
		fs.writeFileSync(destPath, JSON.stringify(newPackageJson, null, 2), 'utf8');
	} catch (error) {
		console.error('处理package.json时出错:', error);
	}
}

/**
 * 递归复制文件夹
 */
function copyDirSync(src: string, dest: string): void {
	fs.mkdirSync(dest, { recursive: true });

	for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		entry.isDirectory() ? copyDirSync(srcPath, destPath) : fs.copyFileSync(srcPath, destPath);
	}
}
