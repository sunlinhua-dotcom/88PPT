/**
 * 品牌搜索 API
 * POST /api/search-brand
 */

import { NextResponse } from "next/server";
import { analyzeBrandTonality, isApiAvailable } from "@/lib/gemini-client";

export async function POST(request) {
    try {
        const { brandName } = await request.json();

        if (!brandName || brandName.trim() === "") {
            return NextResponse.json(
                { success: false, error: "请输入品牌名称" },
                { status: 400 }
            );
        }

        // 搜索 Logo（使用 Clearbit API）
        let logoUrl = null;
        let logoBase64 = null;

        const cleanBrandName = brandName.toLowerCase().replace(/\s+/g, "");
        const possibleDomains = [".com", ".cn", ".io", ".co", ".net", ".org"];

        for (const domain of possibleDomains) {
            const testUrl = `https://logo.clearbit.com/${cleanBrandName}${domain}`;
            try {
                const logoResponse = await fetch(testUrl, {
                    method: "HEAD",
                    signal: AbortSignal.timeout(5000) // 5秒超时
                });
                if (logoResponse.ok) {
                    logoUrl = testUrl;
                    // 获取 Logo base64
                    try {
                        const logoFetch = await fetch(testUrl, {
                            signal: AbortSignal.timeout(10000)
                        });
                        const logoBuffer = await logoFetch.arrayBuffer();
                        logoBase64 = `data:image/png;base64,${Buffer.from(logoBuffer).toString("base64")}`;
                    } catch (fetchError) {
                        console.warn("Logo 下载失败:", fetchError.message);
                    }
                    break;
                }
            } catch {
                continue;
            }
        }

        // 使用 AI 分析品牌调性
        let brandAnalysis;
        try {
            brandAnalysis = await analyzeBrandTonality(brandName);
        } catch (error) {
            console.error("品牌分析失败:", error);
            brandAnalysis = {
                name: brandName,
                tonality: "专业、现代、值得信赖",
                colorPalette: ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
                styleKeywords: ["简约", "专业", "现代"],
                designDescription: "现代化的商务风格设计",
            };
        }

        return NextResponse.json({
            success: true,
            apiAvailable: isApiAvailable(),
            brand: {
                name: brandName,
                logoUrl,
                logoBase64,
                ...brandAnalysis,
            },
        });
    } catch (error) {
        console.error("品牌搜索错误:", error);
        return NextResponse.json(
            { success: false, error: error.message || "品牌搜索失败" },
            { status: 500 }
        );
    }
}
