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
        const img = new Image();
        img.src = imageBase64;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            // Fill white background for transparency
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            // Convert to true JPEG
            const jpgDataUrl = canvas.toDataURL("image/jpeg", 0.95);

            const link = document.createElement("a");
            link.href = jpgDataUrl;
            link.download = `slide_${String(pageNumber).padStart(3, "0")}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
    };

    const handleDownloadAll = async () => {
        const zip = new JSZip();
        // Create a folder for the slides
        const folder = zip.folder("ppt-ai-slides");

        const promises = Object.entries(generatedImages).map(async ([pageNum, imageBase64]) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = imageBase64;
                img.crossOrigin = "anonymous"; // Handle potentil CORS if images are external
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext("2d");
                    ctx.fillStyle = "#FFFFFF";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);

                    // Get blob data
                    canvas.toBlob((blob) => {
                        const filename = `slide_${String(pageNum).padStart(3, "0")}.jpg`;
                        folder.file(filename, blob);
                        resolve();
                    }, "image/jpeg", 0.95);
                };
            });
        });

        if (promises.length === 0) return;

        await Promise.all(promises);
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "ppt-ai-pro-export.zip");
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
                        📦 打包下载 ZIP ({generatedCount})
                    </button>
                </div>
            )}
        </div>
    );
}
