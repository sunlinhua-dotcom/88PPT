import { NextResponse } from "next/server";

// 从 sessions/route.js 引用同一个存储
// 注意：实际项目中应使用数据库
let sessions = new Map();

export async function GET(request, { params }) {
    try {
        const { id } = params;
        const session = sessions.get(id);

        if (!session) {
            return NextResponse.json(
                { success: false, error: "会话不存在" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            session
        });
    } catch (error) {
        console.error("获取会话失败:", error);
        return NextResponse.json(
            { success: false, error: "获取会话失败" },
            { status: 500 }
        );
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const body = await request.json();
        const { title, messages, outline } = body;

        const existingSession = sessions.get(id);
        if (!existingSession) {
            return NextResponse.json(
                { success: false, error: "会话不存在" },
                { status: 404 }
            );
        }

        const updatedSession = {
            ...existingSession,
            title: title ?? existingSession.title,
            messages: messages ?? existingSession.messages,
            outline: outline ?? existingSession.outline,
            updatedAt: new Date().toISOString()
        };

        sessions.set(id, updatedSession);

        return NextResponse.json({
            success: true,
            session: updatedSession
        });
    } catch (error) {
        console.error("更新会话失败:", error);
        return NextResponse.json(
            { success: false, error: "更新会话失败" },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = params;

        if (!sessions.has(id)) {
            return NextResponse.json(
                { success: false, error: "会话不存在" },
                { status: 404 }
            );
        }

        sessions.delete(id);

        return NextResponse.json({
            success: true,
            message: "会话已删除"
        });
    } catch (error) {
        console.error("删除会话失败:", error);
        return NextResponse.json(
            { success: false, error: "删除会话失败" },
            { status: 500 }
        );
    }
}
