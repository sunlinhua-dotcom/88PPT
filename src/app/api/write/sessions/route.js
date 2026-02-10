import { NextResponse } from "next/server";
import { getSessionsCollection } from "../../../../lib/mongodb";

/**
 * 会话管理 API - MongoDB 版
 */

// GET: 获取会话列表
export async function GET() {
    try {
        const sessions = await getSessionsCollection();
        const list = await sessions
            .find({}, { projection: { messages: { $slice: -1 }, sessionId: 1, roleId: 1, createdAt: 1, updatedAt: 1 } })
            .sort({ updatedAt: -1 })
            .limit(50)
            .toArray();

        // 格式化返回
        const formatted = list.map(s => ({
            sessionId: s.sessionId,
            roleId: s.roleId || "ecd",
            lastMessage: s.messages?.[0]?.content?.substring(0, 80) || "",
            messageCount: 0, // 不查完整 messages 以节省流量
            createdAt: s.createdAt,
            updatedAt: s.updatedAt
        }));

        return NextResponse.json({ sessions: formatted });
    } catch (error) {
        console.error("获取会话列表失败:", error);
        return NextResponse.json({ sessions: [] });
    }
}

// POST: 创建新会话
export async function POST(request) {
    try {
        const { sessionId, roleId, systemPrompt, greeting } = await request.json();

        if (!sessionId) {
            return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });
        }

        const sessions = await getSessionsCollection();
        const now = new Date().toISOString();

        // 初始消息（AI 问候语）
        const initialMessages = greeting ? [{
            role: "assistant",
            content: greeting,
            timestamp: now
        }] : [];

        await sessions.updateOne(
            { sessionId },
            {
                $setOnInsert: {
                    sessionId,
                    roleId: roleId || "ecd",
                    messages: initialMessages,
                    outline: { title: "", sections: [] },
                    createdAt: now
                },
                $set: { updatedAt: now }
            },
            { upsert: true }
        );

        return NextResponse.json({ success: true, sessionId });
    } catch (error) {
        console.error("创建会话失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
