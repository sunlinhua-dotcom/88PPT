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

            // 逐页处理
            for (const page of task.pages) {
                // 检查是否已处理
                if (task.results[page.pageNumber]) {
                    continue;
                }

                console.log(`处理任务 ${task.id} 第 ${page.pageNumber} 页`);

                // 更新当前正在处理的页码信息
                updateTask(task.id, {
                    statusMessage: `正在生成第 ${page.pageNumber} / ${task.totalPages} 页...`
                });

                try {
                    // 分析图片内容（如果没有文本）
                    let content = page.textContent;
                    if (!content || content.trim() === "") {
                        updateTask(task.id, {
                            statusMessage: `正在分析第 ${page.pageNumber} 页内容...`
                        });
                        try {
                            content = await analyzeImageContent(page.imageBase64);
                        } catch {
                            content = "";
                        }
                    }

                    // 生成图片
                    updateTask(task.id, {
                        statusMessage: `正在生成第 ${page.pageNumber} 页设计...`
                    });

                    const generatedImage = await generateMasterDesign({
                        pageImageBase64: page.imageBase64,
                        pageContent: content,
                        brandInfo: task.brandInfo,
                        pageNumber: page.pageNumber,
                        aspectRatio: task.aspectRatio
                    });

                    // 保存结果
                    addTaskResult(task.id, page.pageNumber, generatedImage);
                    totalProcessed++;

                } catch (error) {
                    console.error(`任务 ${task.id} 第 ${page.pageNumber} 页处理失败:`, error.message);
                    failedPages.push(page.pageNumber);
                    totalFailed++;

                    // 单页失败不中断整个任务，继续下一页
                }
            }

            // 更新任务最终状态
            const updatedTask = getFullTask(task.id);
            const completedCount = Object.keys(updatedTask.results).length;

            if (completedCount === task.totalPages) {
                updateTask(task.id, {
                    status: TaskStatus.COMPLETED,
                    progress: 100,
                    statusMessage: "处理完成"
                });
                console.log(`任务 ${task.id} 已完成`);
            } else if (failedPages.length > 0) {
                updateTask(task.id, {
                    status: TaskStatus.COMPLETED, // 部分完成也标记完成
                    error: `${failedPages.length} 页生成失败（第 ${failedPages.join(', ')} 页）`,
                    statusMessage: "处理完成（包含失败页）"
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: `处理完成`,
            tasksProcessed: tasks.length,
            pagesProcessed: totalProcessed,
            pagesFailed: totalFailed
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
