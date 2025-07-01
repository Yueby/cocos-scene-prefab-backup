/**
 * 日志工具
 * 封装日志输出，便于统一管理和格式化
 */

import { name as packageName } from '../../package.json' with { type: 'json' };

/**
 * 获取日志前缀
 * @returns 格式化的日志前缀
 */
function getPrefix(): string {
    return `[${packageName}]`;
}

/**
 * 输出调试信息
 * @param message 日志信息
 * @param optionalParams 额外参数
 */
const debug =  console.debug.bind(console,`${getPrefix()}`);

/**
 * 输出普通信息
 * @param message 日志信息
 * @param optionalParams 额外参数
 */
const info =  console.info.bind(console,`${getPrefix()}`);

const log =  console.log.bind(console,`${getPrefix()}`);

/**
 * 输出警告信息
 * @param message 日志信息
 * @param optionalParams 额外参数
 */
const warn =  console.warn.bind(console,`${getPrefix()}`);

/**
 * 输出错误信息
 * @param message 日志信息
 * @param optionalParams 额外参数
 */
const error =  console.error.bind(console,`${getPrefix()}`);

// 导出logger对象的命名版本，这样既能保持兼容也能统一风格
export const logger = {
    debug,
    info,
    log,
    warn,
    error
};
