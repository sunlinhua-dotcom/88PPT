import { NextResponse } from "next/server";

/**
 * 会话列表 API
 * GET: 获取所有会话
 * POST: 创建新会话
 */

// 内存存储（生产环境应使用数据库）
let sessions = new Map();

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId") || "default";

        // 从内存获取会话列表
        const userSessions = [];
        sessions.forEach((session, id) => {
            if (session.userId === userId) {
                userSessions.push({
                    id: session.id,
                    title: session.title || "未命名对话",
                    createdAt: session.createdAt,
                    updatedAt: session.updatedAt,
                    messageCount: session.messages?.length || 0
                });
            }
        });

        // 按更新时间倒序排列
        userSessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        return NextResponse.json({
            success: true,
            sessions: userSessions
        });
    } catch (error) {
        console.error("获取会话列表失败:", error);
        return NextResponse.json(
            { success: false, error: "获取会话列表失败" },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { sessionId, title, messages, outline, userId = "default" } = body;

        if (!sessionId) {
            return NextResponse.json(
                { success: false, error: "sessionId 是必需的" },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();
        const existingSession = sessions.get(sessionId);

        const session = {
            id: sessionId,
            userId,
            title: title || generateTitle(messages) || "未命名对话",
            messages: messages || [],
            outline: outline || { title: "", sections: [] },
            createdAt: existingSession?.createdAt || now,
            updatedAt: now
        };

        sessions.set(sessionId, session);

        return NextResponse.json({
            success: true,
            session: {
                id: session.id,
                title: session.title,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt
            }
        });
    } catch (error) {
        console.error("保存会话失败:", error);
        return NextResponse.json(
            { success: false, error: "保存会话失败" },
            { status: 500 }
        );
    }
}

// 从消息中生成标题
function generateTitle(messages) {
    if (!messages || messages.length === 0) return null;

    // 找到第一条用户消息
    const firstUserMessage = messages.find(m => m.role === "user");
    if (!firstUserMessage) return null;

    // 截取前 30 个字符作为标题
    const content = firstUserMessage.content || "";
    return content.slice(0, 30) + (content.length > 30 ? "..." : "");
}
