/**
 * @file util.ts
 * @description 通用工具函数集合
 */

import { logger } from './logger';

/**
 * 防抖函数 - 在最后一次调用后等待指定时间才执行
 * @param fn 要执行的函数
 * @param wait 等待时间(毫秒)
 * @param immediate 是否立即执行
 * @returns 防抖处理后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    wait = 300,
    immediate = false
): (...args: Parameters<T>) => void {
    let timer: NodeJS.Timeout | null = null;

    return function (this: any, ...args: Parameters<T>) {
        const context = this;

        // 如果已有定时器则清除
        if (timer !== null) {
            clearTimeout(timer);
        }

        // 是否需要立即执行
        if (immediate && timer === null) {
            try {
                fn.apply(context, args);
            } catch (error) {
                logger.error(`执行防抖函数出错: ${error}`);
            }
        }

        // 设置新的定时器
        timer = setTimeout(() => {
            if (!immediate) {
                try {
                    fn.apply(context, args);
                } catch (error) {
                    logger.error(`执行防抖函数出错: ${error}`);
                }
            }
            timer = null;
        }, wait);
    };
}

/**
 * 节流函数 - 在指定时间内最多执行一次
 * @param fn 要执行的函数
 * @param wait 等待时间(毫秒)
 * @returns 节流处理后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
    fn: T,
    wait = 300
): (...args: Parameters<T>) => void {
    let lastCallTime = 0;
    let timer: NodeJS.Timeout | null = null;

    return function (this: any, ...args: Parameters<T>) {
        const context = this;
        const now = Date.now();
        const remaining = wait - (now - lastCallTime);

        // 如果已经过了节流时间，或者是第一次调用
        if (remaining <= 0 || remaining > wait) {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }

            lastCallTime = now;
            try {
                fn.apply(context, args);
            } catch (error) {
                logger.error(`执行节流函数出错: ${error}`);
            }
        } else if (!timer) {
            // 设置定时器，等待剩余时间后执行
            timer = setTimeout(() => {
                lastCallTime = Date.now();
                timer = null;
                try {
                    fn.apply(context, args);
                } catch (error) {
                    logger.error(`执行节流函数出错: ${error}`);
                }
            }, remaining);
        }
    };
}

/**
 * 延迟执行函数
 * @param ms 延迟时间(毫秒)
 * @returns Promise对象
 */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 简单的字符串哈希函数
 * @param str 要哈希的字符串
 * @returns 哈希值
 */
export function simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString(16);

    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // 转换为32位整数
    }

    return hash.toString(16);
}

/**
 * 安全地解析JSON
 * @param jsonString JSON字符串
 * @param fallback 解析失败时的返回值
 * @returns 解析结果
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
    try {
        return JSON.parse(jsonString) as T;
    } catch (error) {
        logger.error(`JSON解析失败: ${error}`);
        return fallback;
    }
}

/**
 * 重试函数 - 在失败后自动重试指定次数
 * @param fn 要执行的异步函数
 * @param retries 重试次数
 * @param delayMs 重试间隔(毫秒)
 * @returns Promise对象
 */
export async function retry<T>(fn: () => Promise<T>, retries = 3, delayMs = 300): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) {
            throw error;
        }

        await delay(delayMs);
        logger.info(`重试操作，剩余${retries - 1}次尝试`);
        return retry(fn, retries - 1, delayMs);
    }
}

/**
 * 格式化日期时间
 * @param date 日期对象，默认为当前时间
 * @param format 格式字符串，例如 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的字符串
 */
export function formatDateTime(date = new Date(), format = 'YYYY-MM-DD HH:mm:ss'): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    // 补零函数
    const pad = (num: number) => (num < 10 ? `0${num}` : num);

    return format
        .replace('YYYY', year.toString())
        .replace('MM', pad(month).toString())
        .replace('DD', pad(day).toString())
        .replace('HH', pad(hours).toString())
        .replace('mm', pad(minutes).toString())
        .replace('ss', pad(seconds).toString());
}

/**
 * 在控制台中记录执行时间
 * @param name 操作名称
 * @param fn 要执行的函数
 * @returns 函数的返回值
 */
export function timeIt<T>(name: string, fn: () => T): T {
    const startTime = Date.now();
    const result = fn();
    const endTime = Date.now();
    logger.info(`${name} 耗时: ${endTime - startTime}ms`);
    return result;
}

/**
 * 同步执行异步函数的装饰器
 * @param fn 要执行的异步函数
 * @returns 装饰后的函数，会自动捕获并处理错误
 */
export function asyncTryCatch<T extends (...args: any[]) => Promise<any>>(
    fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T> | null> {
    return async function (this: any, ...args: Parameters<T>): Promise<ReturnType<T> | null> {
        try {
            return await fn.apply(this, args);
        } catch (error) {
            logger.error(`执行异步函数出错: ${error}`);
            return null;
        }
    };
}

/**
 * 通用工具函数集命名空间
 * 可以通过 util.xxx 的方式调用上面的函数
 */
export const util = {
    debounce,
    throttle,
    delay,
    simpleHash,
    safeJsonParse,
    retry,
    formatDateTime,
    timeIt,
    asyncTryCatch,
};
