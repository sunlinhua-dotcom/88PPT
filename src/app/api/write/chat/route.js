import { NextResponse } from "next/server";
import { ECD_ROLE } from "../../../../lib/roles";

/**
 * PPT 撰写助手 - 流式对话 API
 * 使用 SSE (Server-Sent Events) 实现流式输出
 * 支持动态角色切换
 */
export async function POST(request) {
    const API_KEY = process.env.GEMINI_WRITE_API_KEY || process.env.GEMINI_API_KEY;
    const BASE_URL = process.env.GEMINI_WRITE_BASE_URL || process.env.GEMINI_BASE_URL || "https://api.apiyi.com/v1beta";
    const MODEL = process.env.GEMINI_WRITE_MODEL || "gemini-3-pro-preview";

    if (!API_KEY) {
        return NextResponse.json({ error: "API Key 未配置" }, { status: 500 });
    }

    try {
        const { sessionId, message, attachments, outline, roleId, systemPrompt: clientPrompt } = await request.json();

        // 优先使用前端传来的 systemPrompt（支持自定义角色）
        // 服务端无法访问 localStorage，因此自定义角色的 Prompt 必须由前端传递
        let systemPrompt = clientPrompt || ECD_ROLE.systemPrompt;

        // 追加当前大纲状态
        systemPrompt += `\n\n当前大纲状态：\n${JSON.stringify(outline, null, 2)}\n\n请根据用户的反馈继续推进工作。`;

        // 构建消息内容
        const parts = [];

        // 添加文本消息
        if (message) {
            parts.push({ text: message });
        }

        // 添加附件（图片/PDF）
        if (attachments && attachments.length > 0) {
            for (const attachment of attachments) {
                if (attachment.data) {
                    const base64Data = attachment.data.replace(/^data:[^;]+;base64,/, "");
                    const mimeType = attachment.type || "image/png";
                    parts.push({
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data
                        }
                    });
                }
            }
        }

        // 调用 Gemini API
        const response = await fetch(`${BASE_URL}/models/${MODEL}:generateContent`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: [{ parts }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", errorText);
            throw new Error(`API 请求失败: ${response.status}`);
        }

        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // 解析大纲更新
        let outlineUpdate = null;
        const outlineMatch = textContent.match(/```outline\n([\s\S]*?)\n```/);
        if (outlineMatch) {
            try {
                outlineUpdate = JSON.parse(outlineMatch[1]);
            } catch (e) {
                console.error("解析大纲失败:", e);
            }
        }

        // 移除大纲标记后的纯文本
        const cleanText = textContent.replace(/```outline\n[\s\S]*?\n```/g, "").trim();

        // 创建 SSE 响应流
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                // 模拟流式输出（逐字符发送）
                const chars = cleanText.split("");
                let buffer = "";

                for (let i = 0; i < chars.length; i++) {
                    buffer += chars[i];

                    // 每 3 个字符或遇到标点时发送
                    if (buffer.length >= 3 || /[。，！？\n]/.test(chars[i])) {
                        const chunk = `data: ${JSON.stringify({ content: buffer })}\n\n`;
                        controller.enqueue(encoder.encode(chunk));
                        buffer = "";

                        // 小延迟模拟打字效果
                        await new Promise(r => setTimeout(r, 20));
                    }
                }

                // 发送剩余内容
                if (buffer) {
                    const chunk = `data: ${JSON.stringify({ content: buffer })}\n\n`;
                    controller.enqueue(encoder.encode(chunk));
                }

                // 发送大纲更新（如果有）
                if (outlineUpdate) {
                    const outlineChunk = `data: ${JSON.stringify({ outline: outlineUpdate })}\n\n`;
                    controller.enqueue(encoder.encode(outlineChunk));
                }

                // 结束标记
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        });

    } catch (error) {
        console.error("Chat API Error:", error);
        return NextResponse.json(
            { error: error.message || "服务器错误" },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        status: "ok",
        message: "PPT Write Chat API"
    });
}
