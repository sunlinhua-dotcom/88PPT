"use client";

import { useState, useCallback } from "react";
import styles from "./PDFUploader.module.css";

export default function UniversalUploader({ onLoaded, disabled }) {
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

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await processFiles(files);
        }
    }, [disabled]);

    const handleFileSelect = useCallback(async (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            await processFiles(files);
        }
    }, []);

    const processFiles = async (files) => {
        setError(null);
        setIsLoading(true);
        setProgress(0);

        try {
            // Check if mixed content or single distinct type
            const isPDF = files.some(f => f.type === "application/pdf");

            if (isPDF) {
                // If PDF, we only handle the first one for now (or multiple PDFs? logic says one PDF usually)
                // User requirement says: "Upload single or multiple images" OR PDF.
                // We'll prioritize the first file if it is PDF, otherwise treat as image collection.
                if (files.length > 1 && files[0].type === "application/pdf") {
                    // Warn or just take the first one
                }
                if (files[0].type === "application/pdf") {
                    await processPDF(files[0]);
                } else {
                    setError("一次只能上传一个 PDF 文件，或者多张图片。");
                }
            } else {
                // Assume all are images
                await processImages(files);
            }

        } catch (err) {
            console.error("文件处理失败:", err);
            setError(`无法解析文件: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const processPDF = async (file) => {
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            throw new Error("PDF 文件大小超出限制 (100MB)");
        }

        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const arrayBuffer = await file.arrayBuffer();
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

            await page.render({ canvasContext: context, viewport }).promise;

            const imageBase64 = canvas.toDataURL("image/jpeg", 0.8);
            const textContent = await page.getTextContent();

            // Extract detailed text items for Hybrid Rendering
            const textItems = textContent.items.map(item => ({
                str: item.str,
                // transform: [scaleX, skewY, skewX, scaleY, tx, ty]
                // We need tx, ty for position, and scaleY for font size approx
                transform: item.transform,
                width: item.width,
                height: item.height,
                fontName: item.fontName,
                hasEOL: item.hasEOL
            }));

            // Also keep the full text for legacy uses if any
            const pageText = textItems.map((item) => item.str).join(" ");

            pages.push({
                pageNumber: pageNum,
                imageBase64,
                textContent: pageText,
                textItems, // Store the detailed text layout
                viewport: { width: viewport.width, height: viewport.height } // Start storing viewport for coordinate calc
            });

            setProgress(Math.round((pageNum / totalPages) * 100));
        }

        onLoaded({
            fileName: file.name,
            pages,
            totalPages,
            skippedPages: pdfDoc.numPages > maxPages ? pdfDoc.numPages - maxPages : 0,
        });
    };

    const processImages = async (files) => {
        const pages = [];
        let completed = 0;

        // Sort files by name to ensure order
        files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith("image/")) {
                continue; // Skip non-images
            }

            const pageNum = i + 1;
            const imageBase64 = await readFileAsDataURL(file);

            pages.push({
                pageNumber: pageNum,
                imageBase64, // Already base64
                textContent: "(Image Upload)", // No text extraction for pure images yet
            });

            completed++;
            setProgress(Math.round((completed / files.length) * 100));
        }

        if (pages.length === 0) {
            throw new Error("未找到有效的图片文件");
        }

        onLoaded({
            fileName: files.length === 1 ? files[0].name : `${files.length} 张图片`,
            pages,
            totalPages: pages.length,
            skippedPages: 0,
        });
    };

    const readFileAsDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
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
                    <p className={styles.loadingText}>正在处理文件...</p>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            ) : (
                <>
                    <div className={styles.icon}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                    </div>
                    <h3 className={styles.title}>上传 PDF 或 图片</h3>
                    <p className={styles.subtitle}>支持多图批量上传 (JPG, PNG) 或 PDF 文档</p>
                    <input
                        type="file"
                        accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
                        className={styles.input}
                        onChange={handleFileSelect}
                        disabled={disabled}
                        multiple
                    />
                    {error && <p className={styles.error}>{error}</p>}
                </>
            )}
        </div>
    );
}
