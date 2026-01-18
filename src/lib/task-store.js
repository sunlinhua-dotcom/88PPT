/**
 * 后台任务存储管理
 * 使用本地文件系统存储任务数据
 */

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// 任务存储目录
const TASK_DIR = '/tmp/ppt-tasks';

// 确保目录存在
function ensureTaskDir() {
    if (!fs.existsSync(TASK_DIR)) {
        fs.mkdirSync(TASK_DIR, { recursive: true });
    }
}

// 任务状态枚举
export const TaskStatus = {
    PENDING: 'pending',       // 等待处理
    PROCESSING: 'processing', // 处理中
    COMPLETED: 'completed',   // 已完成
    FAILED: 'failed'          // 失败
};

/**
 * 创建新任务
 * @param {Object} data - 任务数据
 * @param {Array} data.pages - PDF 页面数据 [{pageNumber, imageBase64, textContent}]
 * @param {Object} data.brandInfo - 品牌信息
 * @param {string} data.aspectRatio - 目标比例
 * @param {string} data.fileName - 原始文件名
 * @returns {Object} 创建的任务信息
 */
export function createTask(data) {
    ensureTaskDir();

    const taskId = uuidv4();
    const now = new Date().toISOString();

    const task = {
        id: taskId,
        status: TaskStatus.PENDING,
        createdAt: now,
        updatedAt: now,
        progress: 0,
        currentPage: 0,
        totalPages: data.pages?.length || 0,
        fileName: data.fileName || 'untitled.pdf',
        brandInfo: data.brandInfo,
        aspectRatio: data.aspectRatio || '16:9',
        pages: data.pages || [],
        results: {},  // pageNumber -> generatedImageBase64
        error: null
    };

    // 写入任务文件
    const taskPath = path.join(TASK_DIR, `${taskId}.json`);
    fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));

    return {
        id: taskId,
        status: task.status,
        createdAt: task.createdAt,
        totalPages: task.totalPages,
        fileName: task.fileName
    };
}

/**
 * 获取任务状态
 * @param {string} taskId - 任务 ID
 * @returns {Object|null} 任务信息（不包含原始页面数据以减少传输量）
 */
export function getTaskStatus(taskId) {
    ensureTaskDir();

    const taskPath = path.join(TASK_DIR, `${taskId}.json`);

    if (!fs.existsSync(taskPath)) {
        return null;
    }

    try {
        const task = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));

        // 返回状态信息（不包含原始页面数据）
        return {
            id: task.id,
            status: task.status,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            progress: task.progress,
            currentPage: task.currentPage,
            totalPages: task.totalPages,
            fileName: task.fileName,
            brandName: task.brandInfo?.name || 'Unknown',
            aspectRatio: task.aspectRatio,
            completedCount: Object.keys(task.results).length,
            error: task.error
        };
    } catch (error) {
        console.error('Error reading task:', error);
        return null;
    }
}

/**
 * 获取完整任务数据（包含结果）
 * @param {string} taskId - 任务 ID
 * @returns {Object|null} 完整任务数据
 */
export function getFullTask(taskId) {
    ensureTaskDir();

    const taskPath = path.join(TASK_DIR, `${taskId}.json`);

    if (!fs.existsSync(taskPath)) {
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
    } catch (error) {
        console.error('Error reading full task:', error);
        return null;
    }
}

/**
 * 更新任务状态
 * @param {string} taskId - 任务 ID
 * @param {Object} updates - 要更新的字段
 */
export function updateTask(taskId, updates) {
    ensureTaskDir();

    const taskPath = path.join(TASK_DIR, `${taskId}.json`);

    if (!fs.existsSync(taskPath)) {
        throw new Error(`Task ${taskId} not found`);
    }

    const task = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));

    // 合并更新
    Object.assign(task, updates, { updatedAt: new Date().toISOString() });

    fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));

    return task;
}

/**
 * 添加生成结果到任务
 * @param {string} taskId - 任务 ID
 * @param {number} pageNumber - 页码
 * @param {string} imageBase64 - 生成的图片 Base64
 */
export function addTaskResult(taskId, pageNumber, imageBase64) {
    ensureTaskDir();

    const taskPath = path.join(TASK_DIR, `${taskId}.json`);

    if (!fs.existsSync(taskPath)) {
        throw new Error(`Task ${taskId} not found`);
    }

    const task = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));

    task.results[pageNumber] = imageBase64;
    task.currentPage = pageNumber;
    task.progress = Math.round((Object.keys(task.results).length / task.totalPages) * 100);
    task.updatedAt = new Date().toISOString();

    fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));

    return task;
}

/**
 * 获取所有待处理的任务
 * @returns {Array} 待处理任务列表
 */
export function getPendingTasks() {
    ensureTaskDir();

    const files = fs.readdirSync(TASK_DIR).filter(f => f.endsWith('.json'));
    const pendingTasks = [];

    for (const file of files) {
        try {
            const task = JSON.parse(fs.readFileSync(path.join(TASK_DIR, file), 'utf-8'));
            if (task.status === TaskStatus.PENDING || task.status === TaskStatus.PROCESSING) {
                pendingTasks.push(task);
            }
        } catch (error) {
            console.error(`Error reading task file ${file}:`, error);
        }
    }

    // 按创建时间排序
    return pendingTasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/**
 * 获取所有任务列表（用于任务列表页面）
 * @param {number} limit - 最大返回数量
 * @returns {Array} 任务列表（简要信息）
 */
export function listTasks(limit = 50) {
    ensureTaskDir();

    const files = fs.readdirSync(TASK_DIR).filter(f => f.endsWith('.json'));
    const tasks = [];

    for (const file of files) {
        try {
            const task = JSON.parse(fs.readFileSync(path.join(TASK_DIR, file), 'utf-8'));
            tasks.push({
                id: task.id,
                status: task.status,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt,
                progress: task.progress,
                totalPages: task.totalPages,
                fileName: task.fileName,
                brandName: task.brandInfo?.name || 'Unknown',
                completedCount: Object.keys(task.results).length
            });
        } catch (error) {
            console.error(`Error reading task file ${file}:`, error);
        }
    }

    // 按更新时间倒序排序
    return tasks
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, limit);
}

/**
 * 清理过期任务（超过24小时）
 */
export function cleanupExpiredTasks() {
    ensureTaskDir();

    const files = fs.readdirSync(TASK_DIR).filter(f => f.endsWith('.json'));
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleanedCount = 0;

    for (const file of files) {
        try {
            const taskPath = path.join(TASK_DIR, file);
            const task = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
            const age = now - new Date(task.createdAt).getTime();

            if (age > maxAge) {
                fs.unlinkSync(taskPath);
                cleanedCount++;
            }
        } catch (error) {
            console.error(`Error cleaning task file ${file}:`, error);
        }
    }

    return cleanedCount;
}
