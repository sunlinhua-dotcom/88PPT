/**
 * 创建后台任务 API
 * POST /api/task/create
 */

import { NextResponse } from "next/server";
import { createTask } from "@/lib/task-store";

export const maxDuration = 10; // 快速响应

export async function POST(request) {
    try {
        const body = await request.json();
        const { pages, brandInfo, aspectRatio, fileName } = body;

        // 验证必要参数
        if (!pages || !Array.isArray(pages) || pages.length === 0) {
            return NextResponse.json(
                { success: false, error: "缺少页面数据" },
                { status: 400 }
            );
        }

        if (!brandInfo) {
            return NextResponse.json(
                { success: false, error: "缺少品牌信息" },
                { status: 400 }
            );
        }

        // 创建任务
        const taskInfo = createTask({
            pages,
            brandInfo,
            aspectRatio: aspectRatio || "16:9",
            fileName: fileName || "untitled.pdf"
        });

        return NextResponse.json({
            success: true,
            task: taskInfo,
            message: `任务已创建，共 ${taskInfo.totalPages} 页待处理`
        });

    } catch (error) {
        console.error("创建任务错误:", error);
        return NextResponse.json(
            { success: false, error: error.message || "创建任务失败" },
            { status: 500 }
        );
    }
}
