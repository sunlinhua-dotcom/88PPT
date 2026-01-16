"use client";

import { useState, useCallback } from "react";
import styles from "./PDFUploader.module.css";

export default function PDFUploader({ onPDFLoaded, disabled }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
    }, [disabled]);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;

        const file = e.dataTransfer.files[0];
        if (file) {
            await processFile(file);
        }
    }, [disabled]);

    const handleFileSelect = useCallback(async (e) => {
        const file = e.target.files[0];
        if (file) {
            await processFile(file);
        }
    }, []);

    const processFile = async (file) => {
        // 验证文件
        if (file.type !== "application/pdf") {
            setError("仅支持 PDF 格式文件");
            return;
        }

        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            setError("文件大小超出限制 (100MB)");
            return;
        }

        setError(null);
        setIsLoading(true);
        setProgress(0);

        try {
            // 动态导入 pdf.js
            const pdfjsLib = await import("pdfjs-dist");

            // 使用本地 worker 文件（复制到 public 目录）
            pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

            // 读取文件
            const arrayBuffer = await file.arrayBuffer();

            // 加载 PDF
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDoc = await loadingTask.promise;

            const maxPages = 120;
            const totalPages = Math.min(pdfDoc.numPages, maxPages);
            const pages = [];

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                const page = await pdfDoc.getPage(pageNum);
                const scale = 2.0;
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                }).promise;

                const imageBase64 = canvas.toDataURL("image/png");

                // 提取文本
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item) => item.str).join(" ");

                pages.push({
                    pageNumber: pageNum,
                    imageBase64,
                    textContent: pageText,
                });

                setProgress(Math.round((pageNum / totalPages) * 100));
            }

            onPDFLoaded({
                fileName: file.name,
                pages,
                totalPages,
                skippedPages: pdfDoc.numPages > maxPages ? pdfDoc.numPages - maxPages : 0,
            });
        } catch (err) {
            console.error("PDF 解析失败:", err);
            setError(`无法解析文件: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className={`${styles.uploader} ${isDragging ? styles.dragging : ""} ${disabled ? styles.disabled : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isLoading ? (
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p className={styles.loadingText}>正在解构演示文稿...</p>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            ) : (
                <>
                    <div className={styles.icon}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="12" y1="18" x2="12" y2="12"></line>
                            <line x1="9" y1="15" x2="12" y2="12"></line>
                            <line x1="15" y1="15" x2="12" y2="12"></line>
                        </svg>
                    </div>
                    <h3 className={styles.title}>轻触或拖拽上传 PDF</h3>
                    <p className={styles.subtitle}>单文件最大 100MB · 支持 120 页</p>
                    <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className={styles.input}
                        onChange={handleFileSelect}
                        disabled={disabled}
                    />
                    {error && <p className={styles.error}>{error}</p>}
                </>
            )}
        </div>
    );
}
