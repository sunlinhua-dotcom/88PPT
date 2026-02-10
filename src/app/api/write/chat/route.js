import { NextResponse } from "next/server";
import { ECD_ROLE } from "../../../../lib/roles";
import { getSessionsCollection } from "../../../../lib/mongodb";

/**
 * PPT 撰写助手 - 流式对话 API
 * 使用 SSE (Server-Sent Events) 实现流式输出
 * 支持动态角色切换 + MongoDB 持久化对话历史
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
        let systemPrompt = clientPrompt || ECD_ROLE.systemPrompt;

        // 追加当前大纲状态
        systemPrompt += `\n\n当前大纲状态：\n${JSON.stringify(outline, null, 2)}\n\n请根据用户的反馈继续推进工作。`;

        // === 从 MongoDB 获取对话历史 ===
        let historyMessages = [];
        let sessions;
        try {
            sessions = await getSessionsCollection();
            const session = await sessions.findOne({ sessionId });
            if (session && session.messages) {
                // 滑动窗口：只取最近 40 条消息
                historyMessages = session.messages.slice(-40);
            }
        } catch (dbError) {
            console.warn("MongoDB 查询失败，使用无历史模式:", dbError.message);
        }

        // 构建 Gemini 多轮对话 contents
        const contents = [];

        // 1. 添加历史对话
        for (const msg of historyMessages) {
            const role = msg.role === "assistant" ? "model" : "user";
            contents.push({
                role,
                parts: [{ text: msg.content }]
            });
        }

        // 2. 添加当前用户消息（包含附件）
        const currentParts = [];
        if (message) {
            currentParts.push({ text: message });
        }

        if (attachments && attachments.length > 0) {
            for (const attachment of attachments) {
                if (attachment.data) {
                    const base64Data = attachment.data.replace(/^data:[^;]+;base64,/, "");
                    const mimeType = attachment.type || "image/png";
                    currentParts.push({
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data
                        }
                    });
                }
            }
        }

        if (currentParts.length > 0) {
            contents.push({ role: "user", parts: currentParts });
        }

        // 调用 Gemini API（多轮对话）
        const response = await fetch(`${BASE_URL}/models/${MODEL}:generateContent`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 65536
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

        // === 将用户消息和 AI 回复保存到 MongoDB ===
        try {
            if (sessions) {
                const now = new Date().toISOString();
                const userMsg = {
                    role: "user",
                    content: message || "",
                    timestamp: now
                };
                const aiMsg = {
                    role: "assistant",
                    content: cleanText,
                    timestamp: now
                };

                await sessions.updateOne(
                    { sessionId },
                    {
                        $push: { messages: { $each: [userMsg, aiMsg] } },
                        $set: {
                            outline: outlineUpdate || outline,
                            roleId: roleId || "ecd",
                            updatedAt: now
                        },
                        $setOnInsert: { createdAt: now }
                    },
                    { upsert: true }
                );
            }
        } catch (dbError) {
            console.error("MongoDB 保存失败:", dbError.message);
            // 不影响返回结果
        }

        // 创建 SSE 响应流
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const chars = cleanText.split("");
                let buffer = "";

                for (let i = 0; i < chars.length; i++) {
                    buffer += chars[i];

                    if (buffer.length >= 3 || /[。，！？\n]/.test(chars[i])) {
                        const chunk = `data: ${JSON.stringify({ content: buffer })}\n\n`;
                        controller.enqueue(encoder.encode(chunk));
                        buffer = "";
                        await new Promise(r => setTimeout(r, 20));
                    }
                }

                if (buffer) {
                    const chunk = `data: ${JSON.stringify({ content: buffer })}\n\n`;
                    controller.enqueue(encoder.encode(chunk));
                }

                if (outlineUpdate) {
                    const outlineChunk = `data: ${JSON.stringify({ outline: outlineUpdate })}\n\n`;
                    controller.enqueue(encoder.encode(outlineChunk));
                }

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
