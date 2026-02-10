import { NextResponse } from "next/server";
import { getSessionsCollection } from "../../../../../lib/mongodb";

/**
 * 单个会话管理 API - MongoDB 版
 */

// GET: 获取单个会话（含完整消息）
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const sessions = await getSessionsCollection();
        const session = await sessions.findOne({ sessionId: id });

        if (!session) {
            return NextResponse.json({ error: "会话不存在" }, { status: 404 });
        }

        return NextResponse.json({
            sessionId: session.sessionId,
            roleId: session.roleId,
            messages: session.messages || [],
            outline: session.outline || { title: "", sections: [] },
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
        });
    } catch (error) {
        console.error("获取会话详情失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: 删除会话
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const sessions = await getSessionsCollection();
        await sessions.deleteOne({ sessionId: id });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("删除会话失败:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
