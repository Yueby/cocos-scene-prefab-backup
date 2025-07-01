/**
 * 配置文件工具
 * 直接封装Cocos Creator编辑器的Profile API
 */

import { name as packageName } from '../../package.json' with { type: 'json' };
import { logger } from './logger';

/**
 * 获取配置
 * @param key 配置键名
 * @param type 配置类型，可选
 * @returns 配置值
 */
async function getConfig(
    key: string,
    type?: Editor.Profile.PreferencesProtocol
): Promise<any> {
    try {
        return await Editor.Profile.getConfig(packageName, key, type);
    } catch (error) {
        logger.warn(`获取配置 [${key}] 失败: ${error}`);
        return undefined;
    }
}

/**
 * 设置配置
 * @param key 配置键名
 * @param value 配置值
 * @param type 配置类型，可选
 * @returns 成功返回true，失败返回false
 */
async function setConfig(
    key: string,
    value: Editor.Profile.ProfileValueType,
    type?: Editor.Profile.PreferencesProtocol
): Promise<boolean> {
    try {
        await Editor.Profile.setConfig(packageName, key, value, type);
        return true;
    } catch (error) {
        logger.warn(`保存配置 [${key}] 失败: ${error}`);
        return false;
    }
}

/**
 * 删除配置
 * @param key 配置键名
 * @param type 配置类型，可选
 * @returns 成功返回true，失败返回false
 */
async function removeConfig(
    key: string,
    type?: Editor.Profile.PreferencesProtocol
): Promise<boolean> {
    try {
        await Editor.Profile.removeConfig(packageName, key, type);
        return true;
    } catch (error) {
        logger.warn(`删除配置 [${key}] 失败: ${error}`);
        return false;
    }
}

/**
 * 获取项目配置
 * @param key 配置键名
 * @param type 配置类型，可选
 * @returns 配置值
 */
async function getProject(key: string, type?: Editor.Profile.ProjectProtocol): Promise<any> {
    try {
        return await Editor.Profile.getProject(packageName, key, type);
    } catch (error) {
        logger.warn(`获取项目配置 [${key}] 失败: ${error}`);
        return undefined;
    }
}

/**
 * 设置项目配置
 * @param key 配置键名
 * @param value 配置值
 * @param type 配置类型，可选
 * @returns 成功返回true，失败返回false
 */
async function setProject(
    key: string,
    value: Editor.Profile.ProfileValueType,
    type?: Editor.Profile.ProjectProtocol
): Promise<boolean> {
    try {
        await Editor.Profile.setProject(packageName, key, value, type);
        return true;
    } catch (error) {
        logger.warn(`保存项目配置 [${key}] 失败: ${error}`);
        return false;
    }
}

/**
 * 删除项目配置
 * @param key 配置键名
 * @param type 配置类型，可选
 * @returns 成功返回true，失败返回false
 */
async function removeProject(
    key: string,
    type?: Editor.Profile.ProjectProtocol
): Promise<boolean> {
    try {
        await Editor.Profile.removeProject(packageName, key, type);
        return true;
    } catch (error) {
        logger.warn(`删除项目配置 [${key}] 失败: ${error}`);
        return false;
    }
}

/**
 * 获取临时配置
 * @param key 配置键名，可选
 * @returns 配置值
 */
async function getTemp(key?: string): Promise<any> {
    try {
        return await Editor.Profile.getTemp(packageName, key);
    } catch (error) {
        logger.warn(`获取临时配置 [${key}] 失败: ${error}`);
        return undefined;
    }
}

/**
 * 设置临时配置
 * @param key 配置键名
 * @param value 配置值
 * @returns 成功返回true，失败返回false
 */
async function setTemp(
    key: string,
    value: Editor.Profile.ProfileValueType
): Promise<boolean> {
    try {
        await Editor.Profile.setTemp(packageName, key, value);
        return true;
    } catch (error) {
        logger.warn(`保存临时配置 [${key}] 失败: ${error}`);
        return false;
    }
}

/**
 * 删除临时配置
 * @param key 配置键名
 * @returns 成功返回true，失败返回false
 */
async function removeTemp(key: string): Promise<boolean> {
    try {
        await Editor.Profile.removeTemp(packageName, key);
        return true;
    } catch (error) {
        logger.warn(`删除临时配置 [${key}] 失败: ${error}`);
        return false;
    }
}

/**
 * 配置文件工具集命名空间
 * 可以通过 profile.xxx 的方式调用上面的函数
 */
export const profile = {
    getConfig,
    setConfig,
    removeConfig,
    getProject,
    setProject,
    removeProject,
    getTemp,
    setTemp,
    removeTemp,
};
