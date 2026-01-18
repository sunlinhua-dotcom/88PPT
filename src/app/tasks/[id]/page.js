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
        // 如果任务未完成，轮询状态
        const interval = setInterval(() => {
            if (task && (task.status === "pending" || task.status === "processing")) {
                loadTask(true);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [id]);

    // 手动触发处理
    const handleProcess = async () => {
        setProcessing(true);
        try {
            const response = await fetch("/api/task/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId: id })
            });
            const data = await response.json();
            if (data.success) {
                loadTask(true);
            } else {
                alert("处理失败: " + data.error);
            }
        } catch (err) {
            alert("请求失败: " + err.message);
        } finally {
            setProcessing(false);
        }
    };

    // 下载单张图片
    const handleDownload = (imageBase64, pageNumber) => {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/jpeg" });
        saveAs(blob, `slide_${String(pageNumber).padStart(3, "0")}.jpg`);
    };

    // 下载所有图片
    const handleDownloadAll = () => {
        if (!task?.results) return;
        Object.entries(task.results).forEach(([pageNum, imageBase64], index) => {
            setTimeout(() => {
                handleDownload(imageBase64, pageNum);
            }, index * 500);
        });
    };

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
                    <span
                        className={styles.statusBadge}
                        style={{ backgroundColor: status.color }}
                    >
                        {status.icon} {status.text}
                    </span>
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

            {/* 结果预览 */}
            {task?.results && Object.keys(task.results).length > 0 && (
                <div className={styles.resultsSection}>
                    <h2>生成结果</h2>
                    <div className={styles.resultsGrid}>
                        {Object.entries(task.results)
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([pageNum, imageBase64]) => (
                                <div key={pageNum} className={styles.resultCard}>
                                    <div className={styles.resultHeader}>
                                        <span>第 {pageNum} 页</span>
                                        <button
                                            onClick={() => handleDownload(imageBase64, pageNum)}
                                            className={styles.downloadItemBtn}
                                        >
                                            ⬇️
                                        </button>
                                    </div>
                                    <img
                                        src={imageBase64}
                                        alt={`Page ${pageNum}`}
                                        className={styles.resultImage}
                                    />
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </main>
    );
}
