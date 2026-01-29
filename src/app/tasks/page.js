"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./tasks.module.css";

export default function TasksPage() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchId, setSearchId] = useState("");

    // 加载任务列表
    const loadTasks = async () => {
        try {
            const userId = localStorage.getItem("ppt_user_id");
            if (!userId) return; // Should have one if came from home, or will be generated on home

            const response = await fetch(`/api/task/status?list=true&userId=${userId}`);
            const data = await response.json();
            if (data.success) {
                setTasks(data.tasks || []);
            }
        } catch (error) {
            console.error("加载任务列表失败:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTasks();
        // 每 10 秒刷新一次
        const interval = setInterval(loadTasks, 10000);
        return () => clearInterval(interval);
    }, []);

    // 状态显示
    const getStatusDisplay = (status) => {
        switch (status) {
            case "pending":
                return { text: "等待中", color: "#FFD60A" };
            case "processing":
                return { text: "处理中", color: "#0A84FF" };
            case "completed":
                return { text: "已完成", color: "#30D158" };
            case "failed":
                return { text: "失败", color: "#FF3B30" };
            default:
                return { text: "未知", color: "#8E8E93" };
        }
    };

    // 格式化时间
    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    // 搜索任务
    const handleSearch = (e) => {
        e.preventDefault();
        if (searchId.trim()) {
            window.location.href = `/tasks/${searchId.trim()}`;
        }
    };

    return (
        <main className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <Link href="/" className={styles.backLink}>
                    ← 返回首页
                </Link>
                <h1>任务列表</h1>
                <button onClick={loadTasks} className={styles.refreshBtn}>
                    🔄 刷新
                </button>
            </header>

            {/* 搜索框 */}
            <form onSubmit={handleSearch} className={styles.searchForm}>
                <input
                    type="text"
                    placeholder="输入任务 ID 查询..."
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    className={styles.searchInput}
                />
                <button type="submit" className={styles.searchBtn}>
                    查询
                </button>
            </form>

            {/* 任务列表 */}
            {loading ? (
                <div className={styles.loading}>加载中...</div>
            ) : tasks.length === 0 ? (
                <div className={styles.empty}>
                    <p>暂无任务</p>
                    <Link href="/" className={styles.startLink}>
                        开始新任务 →
                    </Link>
                </div>
            ) : (
                <div className={styles.taskList}>
                    {tasks.map((task) => {
                        const status = getStatusDisplay(task.status);
                        return (
                            <Link
                                key={task.id}
                                href={`/tasks/${task.id}`}
                                className={styles.taskCard}
                            >
                                <div className={styles.taskHeader}>
                                    <span className={styles.fileName}>
                                        📄 {task.fileName}
                                    </span>
                                    <span
                                        className={styles.status}
                                        style={{ backgroundColor: status.color }}
                                    >
                                        {status.text}
                                    </span>
                                </div>

                                <div className={styles.taskMeta}>
                                    <span>品牌: {task.brandName}</span>
                                    <span>页数: {task.totalPages}</span>
                                    <span>
                                        已完成: {task.completedCount}/{task.totalPages}
                                    </span>
                                </div>

                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: `${task.progress}%` }}
                                    />
                                </div>

                                <div className={styles.taskFooter}>
                                    <span className={styles.taskId}>
                                        ID: {task.id.slice(0, 8)}...
                                    </span>
                                    <span className={styles.time}>
                                        {formatTime(task.updatedAt)}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
