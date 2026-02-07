import { NextResponse } from "next/server";
import { ECD_ROLE } from "../../../../../lib/roles";

/**
 * AI 角色生成 API
 * 根据用户输入的角色名/领域/输出对象，自动生成完善的 System Prompt
 */
export async function POST(request) {
    // 角色生成：与 Chat 共用 WRITE 配置，但使用 Flash 模型以提升速度
    const API_KEY = process.env.GEMINI_WRITE_API_KEY || process.env.GEMINI_API_KEY;
    const BASE_URL = process.env.GEMINI_WRITE_BASE_URL || process.env.GEMINI_BASE_URL || "https://api.apiyi.com/v1beta";
    // 用户指定：为了提升效率，角色生成使用 gemini-3-flash-preview
    const MODEL = "gemini-3-flash-preview";

    if (!API_KEY) {
        return NextResponse.json({ error: "API Key 未配置" }, { status: 500 });
    }

    try {
        const { roleName, domain, targetAudience } = await request.json();

        if (!roleName || !domain || !targetAudience) {
            return NextResponse.json(
                { error: "缺少必要参数：roleName, domain, targetAudience" },
                { status: 400 }
            );
        }

        // Meta-Prompt：用 AI 生成 AI 的提示词
        const metaPrompt = `你是一个专业的 AI 提示词工程师。用户想创建一个新的专家角色。

## 参考模板（ECD 角色）
这是一个已验证有效的角色模板结构：

\`\`\`
${ECD_ROLE.systemPrompt.substring(0, 2000)}
\`\`\`

## 用户输入
- 角色名称: ${roleName}
- 专业领域: ${domain}
- 输出对象: ${targetAudience}

## 你的任务
基于参考模板的结构，为这个新角色生成完善的配置。请严格按照以下 JSON 格式输出：

\`\`\`json
{
  "systemPrompt": "完整的角色提示词（800-1200字），包含：角色身份、工作方式、工作流程、输出格式",
  "workflow": [
    {
      "phase": "阶段ID（英文）",
      "name": "阶段名称",
      "questions": ["信息收集阶段的问题"],
      "modules": ["分析/创意/执行阶段的模块名称"]
    }
  ],
  "icon": "一个最能代表该角色的 emoji"
}
\`\`\`

## 生成规则
1. systemPrompt 必须包含：
   - 清晰的角色身份描述
   - 5-6 条工作原则
   - 4-6 个分阶段的工作流程
   - 大纲输出格式说明（与参考模板相同的 outline JSON 格式）

2. workflow 必须包含 3-5 个阶段，每个阶段有 2-4 个模块

3. 内容必须符合该领域的专业标准

请直接输出 JSON，不要有其他文字。`;

        // 调用 Gemini API
        const response = await fetch(`${BASE_URL}/models/${MODEL}:generateContent`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: metaPrompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8192, // 增加 Token 上限以防截断
                    responseMimeType: "application/json" // 强制输出 JSON
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", errorText);
            throw new Error(`AI 生成失败: ${response.status}`);
        }

        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        let generated;
        try {
            // 1. 尝试直接解析（responseMimeType 生效时通常是纯 JSON）
            generated = JSON.parse(textContent);
        } catch (e1) {
            // 2. 如果包含 Markdown 标记，尝试提取
            const jsonMatch = textContent.match(/```json\n?([\s\S]*?)\n?```/) || textContent.match(/```\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
                try {
                    generated = JSON.parse(jsonMatch[1]);
                } catch (e2) {
                    console.error("解析 Markdown JSON 失败:", e2);
                }
            }

            // 3. 如果还是失败，尝试提取第一个 { 到最后一个 }
            if (!generated) {
                const firstBrace = textContent.indexOf('{');
                const lastBrace = textContent.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    try {
                        const jsonStr = textContent.substring(firstBrace, lastBrace + 1);
                        generated = JSON.parse(jsonStr);
                    } catch (e3) {
                        console.error("提取 JSON 子串失败:", e3);
                        throw new Error("AI 返回数据格式错误，请重试");
                    }
                } else {
                    throw new Error("AI 未返回有效的 JSON 数据");
                }
            }
        }

        return NextResponse.json({
            success: true,
            generated: {
                ...generated,
                name: roleName,
                domain,
                targetAudience
            }
        });

    } catch (error) {
        console.error("Generate Role API Error:", error);
        return NextResponse.json(
            { error: error.message || "生成失败" },
            { status: 500 }
        );
    }
}
