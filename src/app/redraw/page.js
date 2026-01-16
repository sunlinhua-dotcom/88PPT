"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppContext } from "../context/AppContext";
import ImageGallery from "../components/ImageGallery";
import ProcessingHUD from "../components/ProcessingHUD";

export default function RedrawPage() {
    const router = useRouter();
    const { state } = useAppContext();
    const { pdfData, brandInfo, aspectRatio } = state;
    const processedRef = useRef(false);
    const shouldStopRef = useRef(false); // Stop signal

    const [generatedImages, setGeneratedImages] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [currentProcessingPage, setCurrentProcessingPage] = useState(0);
    const [error, setError] = useState(null);
    const [isStopped, setIsStopped] = useState(false); // Track if user stopped

    // Calculate stats for HUD
    const totalPages = pdfData?.pages?.length || 0;
    const generatedCount = Object.keys(generatedImages).length;
    const estimatedTime = isProcessing
        ? `约 ${Math.ceil((totalPages - generatedCount) * 0.5)} 分钟`
        : null;

    // Stop processing handler
    const handleStopProcessing = () => {
        shouldStopRef.current = true;
        setIsStopped(true);
    };

    // Process pages function (reusable for initial and resume)
    const processPages = async (startFromBeginning = true) => {
        shouldStopRef.current = false;
        setIsStopped(false);
        setIsProcessing(true);
        setError(null);

        if (startFromBeginning) {
            setGeneratedImages({});
        }

        let failCount = 0;
        let skippedPages = [];
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000;

        for (let i = 0; i < pdfData.pages.length; i++) {
            // Check if user requested stop
            if (shouldStopRef.current) {
                break;
            }

            const page = pdfData.pages[i];

            // Skip already generated pages
            if (generatedImages[page.pageNumber]) {
                continue;
            }

            setCurrentProcessingPage(page.pageNumber);
            let success = false;
            let attempt = 0;

            while (!success && attempt < MAX_RETRIES && !shouldStopRef.current) {
                try {
                    attempt++;
                    const response = await fetch("/api/generate-image", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            pageImage: page.imageBase64,
                            pageContent: page.textContent,
                            brandInfo: brandInfo,
                            pageNumber: page.pageNumber,
                            aspectRatio: aspectRatio,
                        }),
                    });

                    const data = await response.json();

                    if (data.success && data.generatedImage) {
                        setGeneratedImages((prev) => ({
                            ...prev,
                            [page.pageNumber]: data.generatedImage,
                        }));
                        success = true;
                    } else {
                        console.error(`Page ${page.pageNumber} attempt ${attempt} failed:`, data.error);
                        if (attempt < MAX_RETRIES) {
                            await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
                        } else {
                            // Mark as failed but continue to next page
                            skippedPages.push(page.pageNumber);
                            failCount++;
                            console.warn(`Page ${page.pageNumber} skipped after ${MAX_RETRIES} attempts, continuing...`);
                        }
                    }
                } catch (err) {
                    console.error(`Page ${page.pageNumber} attempt ${attempt} network error:`, err);
                    if (attempt < MAX_RETRIES) {
                        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
                    } else {
                        skippedPages.push(page.pageNumber);
                        failCount++;
                        console.warn(`Page ${page.pageNumber} skipped due to network error, continuing...`);
                    }
                }
            }

            // Update progress
            const completedCount = Object.keys(generatedImages).length + (success ? 1 : 0);
            setProcessingProgress(Math.round(((i + 1) / pdfData.pages.length) * 100));
        }

        setIsProcessing(false);
        setCurrentProcessingPage(0);

        // Set appropriate message
        if (shouldStopRef.current) {
            const remaining = pdfData.pages.length - Object.keys(generatedImages).length;
            setError(`已暂停。剩余 ${remaining} 页未处理，点击"继续"按钮可继续生成。`);
        } else if (failCount > 0) {
            setError(`处理完成。${failCount} 页生成失败（第 ${skippedPages.join(', ')} 页），可点击单张重绘按钮重试。`);
        }
    };

    // Resume processing handler
    const handleResumeProcessing = () => {
        processPages(false); // false = don't clear existing images
    };

    // Redirect if no data
    useEffect(() => {
        if (!pdfData || !brandInfo) {
            router.push("/");
        }
    }, [pdfData, brandInfo, router]);

    // Start processing automatically
    useEffect(() => {
        if (!pdfData || !brandInfo || processedRef.current) return;
        processedRef.current = true;
        processPages(true);
    }, [pdfData, brandInfo, aspectRatio]);

    // Single page redraw handler
    const handleSingleRedraw = async (pageNumber, originalImage, additionalPrompt) => {
        try {
            const response = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pageImage: originalImage,
                    pageContent: additionalPrompt || "",
                    brandInfo: brandInfo,
                    pageNumber: pageNumber,
                    aspectRatio: aspectRatio,
                    additionalInstructions: additionalPrompt,
                }),
            });

            const data = await response.json();

            if (data.success && data.generatedImage) {
                setGeneratedImages((prev) => ({
                    ...prev,
                    [pageNumber]: data.generatedImage,
                }));
            } else {
                throw new Error(data.error || "重绘失败");
            }
        } catch (err) {
            console.error("Single redraw error:", err);
            throw err;
        }
    };

    if (!pdfData || !brandInfo) return null;

    return (
        <main className="main-container" style={{ maxWidth: '1200px', paddingTop: '80px' }}>
            <ProcessingHUD
                current={generatedCount}
                total={totalPages}
                progress={processingProgress}
                estimatedTime={estimatedTime}
                onStop={handleStopProcessing}
                onResume={handleResumeProcessing}
                isProcessing={isProcessing}
                isStopped={isStopped}
            />

            {/* Header with Back Button */}
            <header className="header">
                <div style={{ position: 'absolute', left: '24px' }}>
                    <Link href="/" style={{
                        color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                        返回首页
                    </Link>
                </div>
                <div className="logo">
                    {/* Consistent Red Logo */}
                    <div style={{
                        width: '48px', height: '48px', overflow: 'hidden', borderRadius: '10px',
                        boxShadow: '0 4px 12px rgba(255, 59, 48, 0.3)', marginRight: '12px'
                    }}>
                        <img src="/logo_red.png" alt="PPT AI Pro" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <span className="logo-text">PPT AI Pro Workspace</span>
                </div>
            </header>

            {/* Info Bar */}
            <div className="animate-fade-in" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px',
                background: 'rgba(255,255,255,0.02)', padding: '16px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div style={{ display: 'flex', gap: '32px' }}>
                    <div>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', display: 'block' }}>项目</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{pdfData.fileName}</span>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', display: 'block' }}>品牌</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{brandInfo.name}</span>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', display: 'block' }}>目标比例</span>
                        <span style={{ color: 'var(--accent-blue)', fontWeight: '500' }}>{aspectRatio}</span>
                    </div>
                </div>

                {/* Status text removed here, moved to HUD */}
            </div>

            {/* Gallery */}
            <section className="card animate-fade-in" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
                <ImageGallery
                    originalPages={pdfData.pages}
                    generatedImages={generatedImages}
                    processingProgress={processingProgress}
                    isProcessing={isProcessing}
                    currentProcessingPage={currentProcessingPage}
                    onSingleRedraw={handleSingleRedraw}
                    brandInfo={brandInfo}
                    aspectRatio={aspectRatio}
                />
            </section>

            {/* Error Toast */}
            {error && (
                <div style={{
                    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(28,28,30,0.9)', backdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)', padding: '12px 24px', borderRadius: '99px',
                    color: 'var(--accent-error)', fontSize: '14px', fontWeight: '500',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100
                }}>
                    {error}
                </div>
            )}
        </main>
    );
}
