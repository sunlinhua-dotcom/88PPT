"use client";

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import styles from "./ImageGallery.module.css";

export default function ImageGallery({
    originalPages,
    generatedImages,
    processingProgress,
    isProcessing,
    currentProcessingPage
}) {
    const handleDownload = (imageBase64, pageNumber) => {
        if (!imageBase64 || !imageBase64.startsWith('data:image')) {
            alert('图片数据无效');
            return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            // Use FileSaver.js for cross-browser compatibility (fixes Safari)
            canvas.toBlob((blob) => {
                if (blob) {
                    const filename = `slide_${String(pageNumber).padStart(3, "0")}.jpg`;
                    saveAs(blob, filename);
                }
            }, "image/jpeg", 0.95);
        };

        img.onerror = () => {
            alert('图片加载失败');
        };

        img.src = imageBase64;
    };

    const handleDownloadAll = () => {
        // Filter out null/invalid entries first
        const validImages = Object.entries(generatedImages).filter(
            ([, imageBase64]) => imageBase64 && imageBase64.startsWith('data:image')
        );

        if (validImages.length === 0) {
            alert('没有可下载的图片');
            return;
        }

        // Sequentially download each valid image using FileSaver
        validImages.forEach(([pageNum, imageBase64], index) => {
            setTimeout(() => {
                try {
                    const img = new Image();
                    img.crossOrigin = "anonymous";

                    img.onload = () => {
                        const canvas = document.createElement("canvas");
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext("2d");
                        ctx.fillStyle = "#FFFFFF";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0);

                        // Use FileSaver.js for cross-browser compatibility
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const filename = `slide_${String(pageNum).padStart(3, "0")}.jpg`;
                                saveAs(blob, filename);
                            }
                        }, "image/jpeg", 0.95);
                    };

                    img.onerror = () => {
                        console.error(`Failed to load image for page ${pageNum}`);
                    };

                    img.src = imageBase64;
                } catch (err) {
                    console.error(`Download error for page ${pageNum}:`, err);
                }
            }, index * 1200); // 1.2s spacing for reliability
        });
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
                    const isWaiting = currentProcessingPage < pageNum && isProcessing && !generatedImage;

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
                                                ⬇️ 下载 JPEG
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
        </div>
    );
}
