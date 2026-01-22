/**
 * 风格分析 API
 * POST /api/analyze-style
 * 分析用户上传的参考文件，提取设计风格
 */

import { NextResponse } from "next/server";

export const maxDuration = 120; // 最大执行时间 120 秒

const STYLE_ANALYSIS_PROMPT = `
你是一位顶级设计分析专家。分析用户上传的设计参考图片，精准提取以下信息：

## 分析要求

1. **配色方案** (colors)
   - 提取 4-6 个主要颜色的 HEX 值
   - 按重要性排序（主色、辅色、强调色）

2. **风格关键词** (keywords)
   - 提取 3-5 个描述设计风格的关键词
   - 如：极简、科技感、商务、扁平化、渐变、拟物、暗色系等

3. **整体调性描述** (tonality)
   - 用 2-3 句话描述整体设计风格
   - 包括字体风格、布局特点、视觉氛围

4. **固定元素识别** (fixedElements)
   - header: 顶部固定元素（如品牌 Logo、标题栏、日期等）
   - footer: 底部固定元素（如页码、版权信息、联系方式等）
   - 如果没有明显的固定元素，返回 null

5. **内容类型识别** (contentTypes)
   - 识别这是什么类型的页面（封面、目录、内容页、图表页、结束页等）

## 输出格式
必须返回有效的 JSON 格式：
{
    "colors": ["#HEX1", "#HEX2", "#HEX3", "#HEX4"],
    "keywords": ["关键词1", "关键词2", "关键词3"],
    "tonality": "整体调性描述...",
    "fixedElements": {
        "header": "顶部元素描述或null",
        "footer": "底部元素描述或null"
    },
    "contentTypes": ["封面", "内容页"],
    "layoutStyle": "左右分栏/居中/卡片式/全屏图片等"
}

只返回 JSON，不要其他文字。
`;

export async function POST(request) {
    try {
        const API_KEY = process.env.GEMINI_ANALYSIS_API_KEY || process.env.GEMINI_API_KEY;
        const BASE_URL = process.env.GEMINI_BASE_URL || 'https://api.apiyi.com/v1beta';
        const MODEL = 'gemini-3-pro-image-preview';

        if (!API_KEY) {
            return NextResponse.json(
                { success: false, error: "API 密钥未配置" },
                { status: 400 }
            );
        }

        const { files } = await request.json();

        if (!files || files.length === 0) {
            return NextResponse.json(
                { success: false, error: "请上传参考文件" },
                { status: 400 }
            );
        }

        // Prepare parts for API call
        const parts = [{ text: STYLE_ANALYSIS_PROMPT }];

        // Add images (only process first 3 for efficiency)
        files.slice(0, 3).forEach(file => {
            const base64Data = file.data.replace(/^data:[^;]+;base64,/, "");
            const mimeType = file.type || "image/png";

            parts.push({
                inline_data: {
                    mime_type: mimeType.includes("pdf") ? "application/pdf" : mimeType,
                    data: base64Data
                }
            });
        });

        // Call API
        const response = await fetch(`${BASE_URL}/models/${MODEL}:generateContent`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: parts
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API 请求失败 [${response.status}]: ${errorText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Parse JSON response
        let styleProfile;
        try {
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
            styleProfile = JSON.parse(jsonStr.trim());
        } catch (parseError) {
            console.error("JSON 解析错误:", parseError, "原始响应:", text);
            // Fallback profile
            styleProfile = {
                colors: ["#000000", "#FFFFFF", "#333333", "#666666"],
                keywords: ["现代", "简约", "专业"],
                tonality: "无法完全解析风格，请查看原始参考并手动调整描述。",
                fixedElements: null,
                contentTypes: ["通用"],
                layoutStyle: "标准布局"
            };
        }

        return NextResponse.json({
            success: true,
            styleProfile,
        });
    } catch (error) {
        console.error("风格分析错误:", error);
        return NextResponse.json(
            { success: false, error: error.message || "风格分析失败" },
            { status: 500 }
        );
    }
}
