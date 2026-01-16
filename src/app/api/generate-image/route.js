/**
 * 图像生成 API
 * POST /api/generate-image
 */

import { NextResponse } from "next/server";
import { generateMasterDesign, analyzeImageContent, isApiAvailable } from "@/lib/gemini-client";

export const maxDuration = 60; // 最大执行时间 60 秒

export async function POST(request) {
    try {
        // 检查 API 是否可用
        if (!isApiAvailable()) {
            return NextResponse.json(
                {
                    success: false,
                    error: "API 密钥未配置。请在 .env.local 文件中设置 GEMINI_API_KEY",
                    needsApiKey: true
                },
                { status: 400 }
            );
        }

        const { pageImage, pageContent, brandInfo, pageNumber, aspectRatio } = await request.json();

        if (!pageImage) {
            return NextResponse.json(
                { success: false, error: "缺少页面图像" },
                { status: 400 }
            );
        }

        // 如果没有页面内容，使用 AI 分析图像
        let content = pageContent;
        if (!content || content.trim() === "") {
            try {
                content = await analyzeImageContent(pageImage);
            } catch (error) {
                console.warn("图像分析失败，使用空内容:", error.message);
                content = "";
            }
        }

        // 生成大师级设计
        const generatedImage = await generateMasterDesign({
            pageImageBase64: pageImage,
            pageContent: content,
            brandInfo: brandInfo || {
                tonality: "专业、现代、高端",
                colorPalette: ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
            },
            pageNumber,
        });

        return NextResponse.json({
            success: true,
            generatedImage,
            pageNumber,
        });
    } catch (error) {
        console.error("图像生成错误:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "图像生成失败",
                pageNumber: null
            },
            { status: 500 }
        );
    }
}

// 添加一个检查 API 状态的端点
export async function GET() {
    return NextResponse.json({
        available: isApiAvailable(),
        message: isApiAvailable()
            ? "API 已配置"
            : "请在 .env.local 中配置 GEMINI_API_KEY"
    });
}
