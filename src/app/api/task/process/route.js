/**
 * 后台任务处理 API
 * POST /api/task/process
 * 
 * 处理待处理的任务，逐个生成图片
 */

import { NextResponse } from "next/server";
import { getPendingTasks, getFullTask, updateTask, addTaskResult, TaskStatus, cleanupExpiredTasks } from "@/lib/task-store";
import { generateMasterDesign, analyzeImageContent, isApiAvailable } from "@/lib/gemini-client";

export const maxDuration = 300; // 5分钟超时

export async function POST(request) {
    try {
        // 检查 API 是否可用
        if (!isApiAvailable()) {
            return NextResponse.json(
                { success: false, error: "Gemini API 未配置" },
                { status: 400 }
            );
        }

        // 可选：处理特定任务
        const body = await request.json().catch(() => ({}));
        const targetTaskId = body.taskId;

        // 先清理过期任务
        const cleanedCount = cleanupExpiredTasks();
        if (cleanedCount > 0) {
            console.log(`已清理 ${cleanedCount} 个过期任务`);
        }

        // 获取待处理任务
        let tasks;
        if (targetTaskId) {
            const task = getFullTask(targetTaskId);
            if (!task) {
                return NextResponse.json(
                    { success: false, error: "任务不存在" },
                    { status: 404 }
                );
            }
            tasks = [task];
        } else {
            tasks = getPendingTasks();
        }

        if (tasks.length === 0) {
            return NextResponse.json({
                success: true,
                message: "没有待处理的任务",
                processed: 0
            });
        }

        // 🔥 FIRE-AND-FORGET PATTERN 🔥
        // Start processing in background without awaiting completion to avoid HTTP timeout
        (async () => {
            try {
                let totalProcessed = 0;
                let totalFailed = 0;

                // 处理每个任务
                for (const task of tasks) {
                    console.log(`开始处理任务 ${task.id}，共 ${task.totalPages} 页`);

                    // 更新状态为处理中
                    updateTask(task.id, {
                        status: TaskStatus.PROCESSING,
                        statusMessage: "准备开始处理..."
                    });

                    let failedPages = [];
                    const CONCURRENCY = 10; // 企业级并发：10 (大幅提速)

                    // 过滤出未处理的页面
                    const pendingPages = task.pages.filter(p => !task.results[p.pageNumber]);

                    // 分批处理
                    for (let i = 0; i < pendingPages.length; i += CONCURRENCY) {
                        const batch = pendingPages.slice(i, i + CONCURRENCY);
                        const batchPageNumbers = batch.map(p => p.pageNumber);

                        console.log(`正在并发处理第 ${batchPageNumbers.join(', ')} 页`);

                        // 更新正在处理的页面列表
                        updateTask(task.id, {
                            processingPages: batchPageNumbers,
                            statusMessage: `正在并行生成第 ${batchPageNumbers.join(', ')} 页...`
                        });

                        // 创建并发 Promise
                        const promises = batch.map(async (page) => {
                            try {
                                // 分析图片内容（如果没有文本）
                                let content = page.textContent;
                                if (!content || content.trim() === "") {
                                    try {
                                        content = await analyzeImageContent(page.imageBase64);
                                    } catch {
                                        content = "";
                                    }
                                }

                                const generatedImage = await generateMasterDesign({
                                    pageImageBase64: page.imageBase64,
                                    pageContent: content,
                                    brandInfo: task.brandInfo,
                                    pageNumber: page.pageNumber,
                                    aspectRatio: task.aspectRatio
                                });

                                // 保存结果 (addTaskResult 会自动移除 processingPages 中的对应页码)
                                addTaskResult(task.id, page.pageNumber, generatedImage);
                                totalProcessed++;
                            } catch (error) {
                                console.error(`任务 ${task.id} 第 ${page.pageNumber} 页处理失败:`, error.message);
                                failedPages.push(page.pageNumber);
                                totalFailed++;

                                // 失败也要移除处理状态
                                const currentTask = getFullTask(task.id);
                                const newProcessing = (currentTask.processingPages || []).filter(p => p !== page.pageNumber);
                                updateTask(task.id, { processingPages: newProcessing });
                            }
                        });

                        // 等待当前批次完成
                        await Promise.all(promises);
                    }

                    // 更新任务最终状态
                    const updatedTask = getFullTask(task.id);
                    const completedCount = Object.keys(updatedTask.results).length;

                    if (completedCount === task.totalPages) {
                        updateTask(task.id, {
                            status: TaskStatus.COMPLETED,
                            progress: 100,
                            statusMessage: "处理完成",
                            processingPages: []
                        });
                        console.log(`任务 ${task.id} 已完成`);
                    } else if (failedPages.length > 0) {
                        updateTask(task.id, {
                            status: TaskStatus.COMPLETED, // 部分完成也标记完成
                            error: `${failedPages.length} 页生成失败（第 ${failedPages.join(', ')} 页）`,
                            statusMessage: "处理完成（包含失败页）",
                            processingPages: []
                        });
                    }
                }
            } catch (err) {
                console.error("Critical Background Error:", err);
            }
        })();

        // Return immediately to client
        return NextResponse.json({
            success: true,
            message: `Background processing started for ${tasks.length} tasks`,
            taskId: targetTaskId
        });

    } catch (error) {
        console.error("任务处理错误:", error);
        return NextResponse.json(
            { success: false, error: error.message || "处理失败" },
            { status: 500 }
        );
    }
}

// GET 端点用于检查处理状态
export async function GET() {
    const pendingTasks = getPendingTasks();
    return NextResponse.json({
        pendingCount: pendingTasks.length,
        tasks: pendingTasks.map(t => ({
            id: t.id,
            status: t.status,
            progress: t.progress,
            totalPages: t.totalPages
        }))
    });
}
