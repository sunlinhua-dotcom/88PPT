"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { saveAs } from "file-saver";
import styles from "./detail.module.css";

export default function TaskDetailPage({ params }) {
    const { id } = use(params);
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [elapsedTime, setElapsedTime] = useState({}); // Timer for each processing page

    // 加载任务详情
    const loadTask = async (includeResults = false) => {
        try {
            const url = `/api/task/status?id=${id}${includeResults ? "&results=true" : ""}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setTask(data.task);
                setError(null);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError("加载失败: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTask(true);
        // 如果任务未完成，轮询状态 (每 2 秒一次)
        const interval = setInterval(() => {
            if (task && (task.status === "pending" || task.status === "processing")) {
                loadTask(true);
            }
        }, 1000); // Polling every 1s for smoother updates

        return () => clearInterval(interval);
    }, [id, task?.status]);

    // Client-side timer for processing pages
    useEffect(() => {
        if (!task?.processingPages?.length) {
            setElapsedTime({});
            return;
        }

        const timer = setInterval(() => {
            setElapsedTime(prev => {
                const next = { ...prev };
                task.processingPages.forEach(pageNum => {
                    next[pageNum] = (next[pageNum] || 0) + 0.1;
                });
                return next;
            });
        }, 100); // Update every 100ms for smooth seconds display

        return () => clearInterval(timer);
    }, [task?.processingPages]);

    // 手动触发处理
    const handleProcess = async () => {
        setProcessing(true);
        try {
            // 不等待请求完成即可开始显示处理状态
            // The polling will pick up the 'processing' status and updates
            const response = await fetch("/api/task/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId: id })
            });
            const data = await response.json();

            // 请求结束后（即任务完成后），刷新一次
            if (data.success) {
                loadTask(true);
            } else {
                alert("处理失败: " + data.error);
            }
        } catch (err) {
            console.error(err);
            // Don't alert immediately as it might just be a timeout while task continues
        } finally {
            setProcessing(false);
        }
    };

    // ... (download handlers)

    // 状态显示
    const getStatusDisplay = (status) => {
        switch (status) {
            case "pending":
                return { text: "等待处理", color: "#FFD60A", icon: "⏳" };
            case "processing":
                return { text: "处理中", color: "#0A84FF", icon: "🔄" };
            case "completed":
                return { text: "已完成", color: "#30D158", icon: "✅" };
            case "failed":
                return { text: "失败", color: "#FF3B30", icon: "❌" };
            default:
                return { text: "未知", color: "#8E8E93", icon: "❓" };
        }
    };

    if (loading) {
        return (
            <main className={styles.container}>
                <div className={styles.loading}>加载中...</div>
            </main>
        );
    }

    if (error) {
        return (
            <main className={styles.container}>
                <div className={styles.error}>
                    <p>{error}</p>
                    <Link href="/tasks" className={styles.backLink}>
                        返回任务列表
                    </Link>
                </div>
            </main>
        );
    }

    const status = getStatusDisplay(task?.status);

    return (
        <main className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <Link href="/tasks" className={styles.backLink}>
                    ← 返回列表
                </Link>
                <h1>任务详情</h1>
                <button onClick={() => loadTask(true)} className={styles.refreshBtn}>
                    🔄 刷新
                </button>
            </header>

            {/* 任务信息卡片 */}
            <div className={styles.infoCard}>
                <div className={styles.infoRow}>
                    <span className={styles.label}>文件名</span>
                    <span className={styles.value}>📄 {task?.fileName}</span>
                </div>
                <div className={styles.infoRow}>
                    <span className={styles.label}>任务 ID</span>
                    <span className={styles.value} style={{ fontFamily: "monospace" }}>
                        {task?.id}
                    </span>
                </div>
                <div className={styles.infoRow}>
                    <span className={styles.label}>品牌</span>
                    <span className={styles.value}>{task?.brandName}</span>
                </div>
                <div className={styles.infoRow}>
                    <span className={styles.label}>比例</span>
                    <span className={styles.value}>{task?.aspectRatio}</span>
                </div>
                <div className={styles.infoRow}>
                    <span className={styles.label}>状态</span>
                    <div className={styles.statusGroup}>
                        <span
                            className={styles.statusBadge}
                            style={{ backgroundColor: status.color }}
                        >
                            {status.icon} {status.text}
                        </span>
                        {/* 实时状态消息显示 */}
                        {task?.statusMessage && (
                            <span className={styles.statusMessage}>
                                {task.statusMessage}
                            </span>
                        )}
                    </div>
                </div>
                <div className={styles.infoRow}>
                    <span className={styles.label}>进度</span>
                    <span className={styles.value}>
                        {task?.completedCount} / {task?.totalPages} 页 ({task?.progress}%)
                    </span>
                </div>

                {task?.error && (
                    <div className={styles.errorMessage}>
                        ⚠️ {task.error}
                    </div>
                )}

                {/* 进度条 */}
                <div className={styles.progressBar}>
                    <div
                        className={styles.progressFill}
                        style={{ width: `${task?.progress || 0}%` }}
                    />
                </div>
            </div>

            {/* 操作按钮 */}
            <div className={styles.actions}>
                {(task?.status === "pending" || task?.status === "processing") && (
                    <button
                        onClick={handleProcess}
                        disabled={processing}
                        className={styles.processBtn}
                    >
                        {processing ? "处理中..." : "▶️ 开始处理"}
                    </button>
                )}

                {task?.completedCount > 0 && (
                    <button onClick={handleDownloadAll} className={styles.downloadBtn}>
                        ⬇️ 下载所有图片 ({task?.completedCount})
                    </button>
                )}
            </div>

            {/* 结果预览网格 (显示所有页面状态) */}
            <div className={styles.resultsSection}>
                <h2>设计生成概览</h2>
                <div className={styles.resultsGrid}>
                    {task?.totalPages > 0 && Array.from({ length: task.totalPages }).map((_, index) => {
                        const pageNum = index + 1;
                        const imageBase64 = task.results?.[pageNum];
                        const isProcessingPage = task.processingPages?.includes(pageNum);
                        const isPending = !imageBase64 && !isProcessingPage;

                        return (
                            <div key={pageNum} className={styles.resultCard}>
                                <div className={styles.resultHeader}>
                                    <span>第 {pageNum} 页</span>
                                    {imageBase64 && (
                                        <button
                                            onClick={() => handleDownload(imageBase64, pageNum)}
                                            className={styles.downloadItemBtn}
                                            title="下载"
                                        >
                                            ⬇️
                                        </button>
                                    )}
                                </div>

                                <div className={styles.cardBody}>
                                    {imageBase64 ? (
                                        <img
                                            src={imageBase64}
                                            alt={`Page ${pageNum}`}
                                            className={styles.resultImage}
                                        />
                                    ) : (
                                        <div className={styles.placeholderState}>
                                            {isProcessingPage ? (
                                                <div className={styles.processingState}>
                                                    <div className={styles.spinner} style={{ width: 32, height: 32, borderWidth: 3 }}></div>
                                                    <span style={{ marginTop: 12, color: 'var(--accent-blue)', fontWeight: 500 }}>
                                                        {elapsedTime[pageNum] ? `${elapsedTime[pageNum].toFixed(1)}s` : '准备中...'}
                                                    </span>
                                                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
                                                        Gemini Pro 绘制中
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className={styles.pendingState}>
                                                    <span style={{ fontSize: 24, opacity: 0.3 }}>⏳</span>
                                                    <span style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 8 }}>等待处理</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
