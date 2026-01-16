"use client";

import { useState } from 'react';
import { saveAs } from 'file-saver';
import styles from "./ImageGallery.module.css";

export default function ImageGallery({
    originalPages,
    generatedImages,
    processingProgress,
    isProcessing,
    currentProcessingPage,
    onSingleRedraw, // New callback for single page redraw
    brandInfo,
    aspectRatio
}) {
    // Modal state for single redraw
    const [redrawModal, setRedrawModal] = useState({ open: false, pageNum: null, originalImage: null });
    const [redrawPrompt, setRedrawPrompt] = useState("");
    const [isRedrawing, setIsRedrawing] = useState(false);
    const [redrawTimer, setRedrawTimer] = useState(0);

    // Helper to convert base64 to Blob directly (no canvas)
    const base64ToBlob = (base64, mimeType = 'image/jpeg') => {
        const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    };

    // Detect iOS device
    const isIOS = () => {
        if (typeof navigator === 'undefined') return false;
        return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    };

    // Check if Web Share API with files is supported
    const canShareFiles = () => {
        return navigator.share && navigator.canShare;
    };

    const handleDownload = async (imageBase64, pageNumber) => {
        if (!imageBase64 || !imageBase64.startsWith('data:image')) {
            alert('图片数据无效');
            return;
        }

        try {
            const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            const extension = mimeType === 'image/png' ? 'png' : 'jpg';
            const blob = base64ToBlob(imageBase64, mimeType);
            const filename = `slide_${String(pageNumber).padStart(3, "0")}.${extension}`;

            // iOS: Use Web Share API to save to Photos
            if (isIOS() && canShareFiles()) {
                const file = new File([blob], filename, { type: mimeType });

                if (navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: filename,
                            text: 'PPT-AI 生成的图片'
                        });
                        return; // Success via share
                    } catch (shareErr) {
                        // User cancelled or share failed, fall through to saveAs
                        if (shareErr.name !== 'AbortError') {
                            console.warn('Share failed, falling back:', shareErr);
                        }
                    }
                }
            }

            // Fallback: Use FileSaver for other platforms
            saveAs(blob, filename);
        } catch (err) {
            console.error('Download error:', err);
            alert('下载失败: ' + err.message);
        }
    };

    const handleDownloadAll = async () => {
        const validImages = Object.entries(generatedImages).filter(
            ([, imageBase64]) => imageBase64 && imageBase64.startsWith('data:image')
        );

        if (validImages.length === 0) {
            alert('没有可下载的图片');
            return;
        }

        // iOS: Try to share all files at once
        if (isIOS() && canShareFiles()) {
            try {
                const files = validImages.map(([pageNum, imageBase64]) => {
                    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
                    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
                    const extension = mimeType === 'image/png' ? 'png' : 'jpg';
                    const blob = base64ToBlob(imageBase64, mimeType);
                    const filename = `slide_${String(pageNum).padStart(3, "0")}.${extension}`;
                    return new File([blob], filename, { type: mimeType });
                });

                if (navigator.canShare({ files })) {
                    await navigator.share({
                        files,
                        title: 'PPT-AI 生成的图片',
                        text: `共 ${files.length} 张图片`
                    });
                    return; // Success
                }
            } catch (shareErr) {
                if (shareErr.name !== 'AbortError') {
                    console.warn('Batch share failed, falling back to sequential:', shareErr);
                } else {
                    return; // User cancelled
                }
            }
        }

        // Fallback: Sequential download
        validImages.forEach(([pageNum, imageBase64], index) => {
            setTimeout(() => {
                try {
                    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
                    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
                    const extension = mimeType === 'image/png' ? 'png' : 'jpg';
                    const blob = base64ToBlob(imageBase64, mimeType);
                    const filename = `slide_${String(pageNum).padStart(3, "0")}.${extension}`;
                    saveAs(blob, filename);
                } catch (err) {
                    console.error(`Download error for page ${pageNum}:`, err);
                }
            }, index * 1200);
        });
    };

    // Open redraw modal
    const openRedrawModal = (pageNum, originalImage) => {
        setRedrawModal({ open: true, pageNum, originalImage });
        setRedrawPrompt("");
    };

    // Close modal
    const closeRedrawModal = () => {
        setRedrawModal({ open: false, pageNum: null, originalImage: null });
        setRedrawPrompt("");
        setIsRedrawing(false);
    };

    // Handle single redraw
    const handleSingleRedraw = async () => {
        if (!onSingleRedraw) return;

        setIsRedrawing(true);
        const startTime = Date.now();
        const timerInterval = setInterval(() => {
            setRedrawTimer(Math.floor((Date.now() - startTime) / 100));
        }, 100);

        try {
            await onSingleRedraw(redrawModal.pageNum, redrawModal.originalImage, redrawPrompt);
            closeRedrawModal();
        } catch (err) {
            console.error("Redraw error:", err);
            alert("重绘失败: " + err.message);
        } finally {
            clearInterval(timerInterval);
            setIsRedrawing(false);
            setRedrawTimer(0);
        }
    };

    const generatedCount = Object.keys(generatedImages).length;

    return (
        <div className={styles.container}>
            {/* Gallery Rows */}
            <div className={styles.gallery}>
                {originalPages.map((page) => {
                    const pageNum = page.pageNumber;
                    const generatedImage = generatedImages[pageNum];
                    const isRowProcessing = currentProcessingPage === pageNum && isProcessing;

                    return (
                        <div key={pageNum} className={styles.comparisonRow}>
                            {/* Left: Original */}
                            <div className={styles.originalSection}>
                                <div className={styles.originalLabel}>原图 P{pageNum}</div>
                                <img
                                    src={page.imageBase64}
                                    alt={`Original Page ${pageNum}`}
                                    className={styles.originalImage}
                                />
                            </div>

                            {/* Center: Connector */}
                            <div className={styles.dividerSection}>
                                {isRowProcessing ? (
                                    <div className={styles.spinner} style={{ width: 16, height: 16, borderTopColor: '#fff' }}></div>
                                ) : (
                                    <span className={styles.arrowIcon}>→</span>
                                )}
                            </div>

                            {/* Right: Generated */}
                            <div className={styles.generatedSection}>
                                {generatedImage ? (
                                    <>
                                        <div className={styles.originalLabel} style={{ background: 'rgba(41, 151, 255, 0.8)', color: 'white' }}>AI 重绘</div>
                                        <img
                                            src={generatedImage}
                                            alt={`Generated Page ${pageNum}`}
                                            className={styles.generatedImage}
                                        />
                                        <div className={styles.actionsOverlay}>
                                            <button
                                                className={styles.downloadBtn}
                                                onClick={() => handleDownload(generatedImage, pageNum)}
                                            >
                                                ⬇️ 下载
                                            </button>
                                            <button
                                                className={styles.redrawBtn}
                                                onClick={() => openRedrawModal(pageNum, page.imageBase64)}
                                            >
                                                🔄 重绘
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className={styles.processingPlaceholder}>
                                        {isRowProcessing ? (
                                            <>
                                                <div className={styles.spinner}></div>
                                                <span className={styles.processingText}>与 NANO BANANA PRO 连接中...</span>
                                            </>
                                        ) : (
                                            <span className={styles.processingText} style={{ opacity: 0.3 }}>
                                                等待生成...
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Floating Download All Button */}
            {generatedCount > 0 && (
                <div className={styles.downloadAllSection}>
                    <button
                        className={styles.downloadAllButton}
                        onClick={handleDownloadAll}
                    >
                        ⬇️ 一键下载所有图片 ({generatedCount})
                    </button>
                </div>
            )}

            {/* Redraw Modal */}
            {redrawModal.open && (
                <div className={styles.modalOverlay} onClick={closeRedrawModal}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>🔄 重绘第 {redrawModal.pageNum} 页</h3>
                            <button className={styles.modalClose} onClick={closeRedrawModal}>✕</button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.previewSection}>
                                <div className={styles.previewItem}>
                                    <span className={styles.previewLabel}>原图</span>
                                    <img src={redrawModal.originalImage} alt="Original" className={styles.previewImage} />
                                </div>
                                {generatedImages[redrawModal.pageNum] && (
                                    <div className={styles.previewItem}>
                                        <span className={styles.previewLabel}>当前</span>
                                        <img src={generatedImages[redrawModal.pageNum]} alt="Current" className={styles.previewImage} />
                                    </div>
                                )}
                            </div>

                            <div className={styles.promptSection}>
                                <label className={styles.promptLabel}>补充提示词（可选）</label>
                                <textarea
                                    className={styles.promptInput}
                                    value={redrawPrompt}
                                    onChange={(e) => setRedrawPrompt(e.target.value)}
                                    placeholder="例如：更简洁的布局、增加科技感、使用深色背景..."
                                    rows={3}
                                    disabled={isRedrawing}
                                />
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button
                                className={styles.cancelBtn}
                                onClick={closeRedrawModal}
                                disabled={isRedrawing}
                            >
                                取消
                            </button>
                            <button
                                className={styles.confirmBtn}
                                onClick={handleSingleRedraw}
                                disabled={isRedrawing}
                            >
                                {isRedrawing ? (
                                    <>
                                        <div className={styles.spinnerSmall}></div>
                                        重绘中 {(redrawTimer / 10).toFixed(1)}s
                                    </>
                                ) : (
                                    '开始重绘'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
