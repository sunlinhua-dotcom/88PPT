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

    const [generatedImages, setGeneratedImages] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [currentProcessingPage, setCurrentProcessingPage] = useState(0);
    const [error, setError] = useState(null);

    // Calculate stats for HUD
    const totalPages = pdfData?.pages?.length || 0;
    const generatedCount = Object.keys(generatedImages).length;
    const estimatedTime = isProcessing
        ? `约 ${Math.ceil((totalPages - generatedCount) * 0.5)} 分钟`
        : null;

    // Redirect if no data
    useEffect(() => {
        if (!pdfData || !brandInfo) {
            router.push("/");
        }
    }, [pdfData, brandInfo, router]);

    // Start processing automatically
    useEffect(() => {
        if (!pdfData || !brandInfo || processedRef.current) return;

        const startProcessing = async () => {
            processedRef.current = true; // Prevent double firing
            setIsProcessing(true);
            setError(null);
            setGeneratedImages({});

            let failCount = 0;

            // Retry configuration
            const MAX_RETRIES = 3;
            const RETRY_DELAY = 1000; // Start with 1s

            for (let i = 0; i < totalPages; i++) {
                const page = pdfData.pages[i];

                // Skip if already successfully generated (breakpoint resume)
                if (generatedImages[page.pageNumber]) {
                    continue;
                }

                setCurrentProcessingPage(page.pageNumber);
                let success = false;
                let attempt = 0;

                while (!success && attempt < MAX_RETRIES) {
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
                                // Wait before retry
                                await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
                            } else {
                                // Final fail
                                setGeneratedImages((prev) => ({
                                    ...prev,
                                    [page.pageNumber]: null, // Mark as failed explicitly? Or keep undefined? User code used original.
                                    // Let's keep original image as fallback but maybe we want UI to show retry button.
                                    // For now, consistent with previous behavior: fallback to original isn't ideal for "resume". 
                                    // But user asked for "try again if fail".
                                }));
                                failCount++;
                            }
                        }
                    } catch (err) {
                        console.error(`Page ${page.pageNumber} attempt ${attempt} network error:`, err);
                        if (attempt < MAX_RETRIES) {
                            await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
                        } else {
                            failCount++;
                        }
                    }
                }

                // Update progress after each
                setProcessingProgress(Math.round(((i + 1) / totalPages) * 100));
            }

            setIsProcessing(false);
            setCurrentProcessingPage(0);

            if (failCount > 0) {
                setError(`处理完成，${failCount} 页生成失败（已保留原图）。`);
            }
        };

        startProcessing();
    }, [pdfData, brandInfo, aspectRatio]);

    if (!pdfData || !brandInfo) return null;

    return (
        <main className="main-container" style={{ maxWidth: '1200px', paddingTop: '80px' }}>
            <ProcessingHUD
                current={generatedCount + (isProcessing ? 0 : 0)}
                total={totalPages}
                progress={processingProgress}
                estimatedTime={estimatedTime}
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="4" width="20" height="16" rx="4" fill="url(#paint0_linear_redraw)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                        <circle cx="8" cy="12" r="3" fill="rgba(255,255,255,0.9)" />
                        <path d="M14 10H18" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M14 14H18" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" />
                        <defs>
                            <linearGradient id="paint0_linear_redraw" x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#2997FF" />
                                <stop offset="1" stopColor="#A259FF" />
                            </linearGradient>
                        </defs>
                    </svg>
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
