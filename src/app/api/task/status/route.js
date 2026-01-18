/**
 * 查询任务状态 API
 * GET /api/task/status?id=xxx
 */

import { NextResponse } from "next/server";
import { getTaskStatus, getFullTask, listTasks } from "@/lib/task-store";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get("id");
        const includeResults = searchParams.get("results") === "true";
        const listAll = searchParams.get("list") === "true";

        // 列出所有任务
        if (listAll) {
            const tasks = listTasks(50);
            return NextResponse.json({
                success: true,
                tasks
            });
        }

        // 查询单个任务
        if (!taskId) {
            return NextResponse.json(
                { success: false, error: "缺少任务 ID" },
                { status: 400 }
            );
        }

        // 获取任务状态
        if (includeResults) {
            const task = getFullTask(taskId);
            if (!task) {
                return NextResponse.json(
                    { success: false, error: "任务不存在" },
                    { status: 404 }
                );
            }
            return NextResponse.json({
                success: true,
                task: {
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
                    error: task.error,
                    results: task.results // 包含生成结果
                }
            });
        }

        const status = getTaskStatus(taskId);
        if (!status) {
            return NextResponse.json(
                { success: false, error: "任务不存在" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            task: status
        });

    } catch (error) {
        console.error("查询任务状态错误:", error);
        return NextResponse.json(
            { success: false, error: error.message || "查询失败" },
            { status: 500 }
        );
    }
}
