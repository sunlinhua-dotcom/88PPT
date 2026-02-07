"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GlobalNav from "../../components/GlobalNav";
import styles from "./history.module.css";

/**
 * 历史记录页面
 * 显示所有保存的对话会话
 */
export default function HistoryPage() {
    const router = useRouter();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    const getFirstUserMessage = useCallback((messages) => {
        if (!messages) return null;
        const userMsg = messages.find(m => m.role === "user");
        if (!userMsg) return null;
        const content = userMsg.content || "";
        return content.slice(0, 30) + (content.length > 30 ? "..." : "");
    }, []);

    const loadSessions = useCallback(() => {
        // 从 localStorage 加载所有会话
        const allSessions = [];

        // 获取当前会话
        const currentSession = localStorage.getItem("ppt_write_session");
        if (currentSession) {
            try {
                const parsed = JSON.parse(currentSession);
                allSessions.push({
                    id: parsed.sessionId,
                    title: parsed.outline?.title || getFirstUserMessage(parsed.messages) || "当前对话",
                    updatedAt: parsed.updatedAt || new Date().toISOString(),
                    messageCount: parsed.messages?.length || 0,
                    isCurrent: true
                });
            } catch (e) {
                console.error("解析当前会话失败:", e);
            }
        }

        // 获取历史会话列表
        const historyList = localStorage.getItem("ppt_write_history");
        if (historyList) {
            try {
                const history = JSON.parse(historyList);
                history.forEach(session => {
                    if (!allSessions.find(s => s.id === session.id)) {
                        allSessions.push(session);
                    }
                });
            } catch (e) {
                console.error("解析历史记录失败:", e);
            }
        }

        // 按更新时间倒序排列
        allSessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        setSessions(allSessions);
        setLoading(false);
    }, [getFirstUserMessage]);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const handleSessionClick = (session) => {
        if (session.isCurrent) {
            router.push("/write");
        } else {
            // 加载历史会话
            const historyData = localStorage.getItem(`ppt_write_session_${session.id}`);
            if (historyData) {
                localStorage.setItem("ppt_write_session", historyData);
                router.push("/write");
            }
        }
    };

    const handleDeleteSession = (e, sessionId) => {
        e.stopPropagation();

        if (!confirm("确定要删除这个对话吗？")) return;

        // 从历史列表中删除
        const historyList = localStorage.getItem("ppt_write_history");
        if (historyList) {
            try {
                const history = JSON.parse(historyList);
                const updated = history.filter(s => s.id !== sessionId);
                localStorage.setItem("ppt_write_history", JSON.stringify(updated));
            } catch (e) {
                console.error("删除失败:", e);
            }
        }

        // 删除会话数据
        localStorage.removeItem(`ppt_write_session_${sessionId}`);

        // 刷新列表
        loadSessions();
    };

    const handleNewSession = () => {
        // 保存当前会话到历史
        const currentSession = localStorage.getItem("ppt_write_session");
        if (currentSession) {
            try {
                const parsed = JSON.parse(currentSession);
                if (parsed.messages && parsed.messages.length > 1) {
                    // 保存到历史
                    localStorage.setItem(`ppt_write_session_${parsed.sessionId}`, currentSession);

                    // 更新历史列表
                    const historyList = localStorage.getItem("ppt_write_history") || "[]";
                    const history = JSON.parse(historyList);
                    if (!history.find(s => s.id === parsed.sessionId)) {
                        history.push({
                            id: parsed.sessionId,
                            title: parsed.outline?.title || getFirstUserMessage(parsed.messages) || "未命名对话",
                            updatedAt: parsed.updatedAt || new Date().toISOString(),
                            messageCount: parsed.messages?.length || 0
                        });
                        localStorage.setItem("ppt_write_history", JSON.stringify(history));
                    }
                }
            } catch (e) {
                console.error("保存当前会话失败:", e);
            }
        }

        // 清除当前会话
        localStorage.removeItem("ppt_write_session");

        // 跳转到新对话
        router.push("/write");
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return "刚刚";
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;

        return date.toLocaleDateString("zh-CN", {
            month: "short",
            day: "numeric"
        });
    };

    return (
        <div className={styles.container}>
            <GlobalNav />

            <div className={styles.content}>
                <div className={styles.header}>
                    <h1>📜 对话历史</h1>
                    <button className={styles.newBtn} onClick={handleNewSession}>
                        ✨ 新建对话
                    </button>
                </div>

                {loading ? (
                    <div className={styles.loading}>
                        <span className={styles.spinner}>⏳</span>
                        加载中...
                    </div>
                ) : sessions.length === 0 ? (
                    <div className={styles.empty}>
                        <span className={styles.emptyIcon}>📭</span>
                        <p>还没有对话记录</p>
                        <Link href="/write" className={styles.startBtn}>
                            开始新对话
                        </Link>
                    </div>
                ) : (
                    <div className={styles.sessionList}>
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                className={`${styles.sessionCard} ${session.isCurrent ? styles.current : ""}`}
                                onClick={() => handleSessionClick(session)}
                            >
                                <div className={styles.sessionInfo}>
                                    <h3 className={styles.sessionTitle}>
                                        {session.isCurrent && <span className={styles.currentBadge}>当前</span>}
                                        {session.title}
                                    </h3>
                                    <div className={styles.sessionMeta}>
                                        <span>💬 {session.messageCount} 条消息</span>
                                        <span>•</span>
                                        <span>{formatDate(session.updatedAt)}</span>
                                    </div>
                                </div>
                                {!session.isCurrent && (
                                    <button
                                        className={styles.deleteBtn}
                                        onClick={(e) => handleDeleteSession(e, session.id)}
                                        title="删除"
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
