"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./BrandInput.module.css";

export default function BrandInput({ onBrandLoaded, disabled }) {
    // Tab state: 'search' or 'upload'
    const [activeTab, setActiveTab] = useState("search");

    // Search tab state
    const [brandName, setBrandName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [brandInfo, setBrandInfo] = useState(null);
    const [error, setError] = useState(null);
    const [timer, setTimer] = useState(0);

    // Upload tab state
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [styleProfile, setStyleProfile] = useState(null);
    const [analyzeTimer, setAnalyzeTimer] = useState(0);
    const fileInputRef = useRef(null);

    // Timer for search
    useEffect(() => {
        let interval;
        if (isLoading) {
            setTimer(0);
            interval = setInterval(() => setTimer(t => t + 1), 100);
        } else {
            setTimer(0);
        }
        return () => clearInterval(interval);
    }, [isLoading]);

    // Timer for style analysis
    useEffect(() => {
        let interval;
        if (isAnalyzing) {
            setAnalyzeTimer(0);
            interval = setInterval(() => setAnalyzeTimer(t => t + 1), 100);
        } else {
            setAnalyzeTimer(0);
        }
        return () => clearInterval(interval);
    }, [isAnalyzing]);

    // Brand search handler
    const handleSearch = async () => {
        if (!brandName.trim()) {
            setError("请输入品牌名称");
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            const response = await fetch("/api/search-brand", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ brandName: brandName.trim() }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "品牌搜索失败");
            }

            setBrandInfo(data.brand);
            onBrandLoaded(data.brand);
        } catch (err) {
            console.error("品牌搜索错误:", err);
            setError(err.message || "品牌搜索失败，请稍后重试");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !disabled && !isLoading) {
            handleSearch();
        }
    };

    // File upload handler
    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Filter valid files
        const validFiles = files.filter(f =>
            f.type === 'application/pdf' || f.type.startsWith('image/')
        );

        if (validFiles.length === 0) {
            setError("请上传 PDF 或图片文件");
            return;
        }

        setError(null);
        setUploadedFiles(validFiles);

        // Auto-analyze after upload
        await analyzeStyleReference(validFiles);
    };

    // Style reference analysis
    const analyzeStyleReference = async (files) => {
        setIsAnalyzing(true);
        setError(null);

        try {
            // Convert files to base64
            const fileDataList = await Promise.all(files.map(async (file) => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        resolve({
                            name: file.name,
                            type: file.type,
                            data: reader.result
                        });
                    };
                    reader.readAsDataURL(file);
                });
            }));

            // Call API to analyze style
            const response = await fetch("/api/analyze-style", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ files: fileDataList }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "风格分析失败");
            }

            setStyleProfile(data.styleProfile);

            // Pass style profile to parent as brand info
            onBrandLoaded({
                name: "自定义风格",
                tonality: data.styleProfile.tonality,
                colorPalette: data.styleProfile.colors,
                styleKeywords: data.styleProfile.keywords,
                styleProfile: data.styleProfile, // Include full profile
                isCustomStyle: true
            });
        } catch (err) {
            console.error("风格分析错误:", err);
            setError(err.message || "风格分析失败，请稍后重试");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    const clearUpload = () => {
        setUploadedFiles([]);
        setStyleProfile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className={styles.container}>
            {/* Tab Switcher */}
            <div className={styles.tabContainer}>
                <button
                    className={`${styles.tab} ${activeTab === 'search' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('search')}
                    disabled={disabled}
                >
                    🔍 品牌搜索
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'upload' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('upload')}
                    disabled={disabled}
                >
                    📁 风格参考
                </button>
            </div>

            {/* Tab Content */}
            <div className={styles.tabContent}>
                {activeTab === 'search' && (
                    <div className={styles.searchTab}>
                        <div className={styles.inputGroup}>
                            <div className={styles.inputWrapper}>
                                <span className={styles.inputIcon}>🏷️</span>
                                <input
                                    type="text"
                                    value={brandName}
                                    onChange={(e) => setBrandName(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="输入品牌名称（如：Apple、Nike、华为）"
                                    className={styles.input}
                                    disabled={disabled || isLoading}
                                />
                            </div>
                            <button
                                className={styles.searchButton}
                                onClick={handleSearch}
                                disabled={isLoading || !brandName.trim() || disabled}
                            >
                                {isLoading ? (
                                    <>
                                        <div className={styles.spinner}></div>
                                        <span>正在分析 {(timer / 10).toFixed(1)}s</span>
                                    </>
                                ) : (
                                    <>
                                        <span className={styles.searchIcon}>🔍</span>
                                        <span>搜索</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {brandInfo && (
                            <div className={styles.brandCard}>
                                <div className={styles.brandHeader}>
                                    {brandInfo.logoUrl ? (
                                        <img
                                            src={brandInfo.logoUrl}
                                            alt={brandInfo.name}
                                            className={styles.brandLogo}
                                        />
                                    ) : (
                                        <div className={styles.brandLogoPlaceholder}>
                                            {brandInfo.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className={styles.brandTitle}>
                                        <h4>{brandInfo.name}</h4>
                                        <p>{brandInfo.styleKeywords?.join(" · ") || "现代 · 专业"}</p>
                                    </div>
                                </div>
                                <div className={styles.brandColors}>
                                    {brandInfo.colorPalette?.map((color, index) => (
                                        <div
                                            key={index}
                                            className={styles.colorSwatch}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        ></div>
                                    ))}
                                </div>
                                <textarea
                                    className={styles.editableDescription}
                                    value={brandInfo.tonality || brandInfo.designDescription || ""}
                                    onChange={(e) => {
                                        const newInfo = { ...brandInfo, tonality: e.target.value };
                                        setBrandInfo(newInfo);
                                        onBrandLoaded(newInfo);
                                    }}
                                    placeholder="点击编辑品牌调性描述..."
                                />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'upload' && (
                    <div className={styles.uploadTab}>
                        <div className={styles.uploadHint}>
                            上传已有的设计作品（PDF 或图片），AI 将精准分析其风格、配色、排版，并应用于后续的重绘
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,image/*"
                            multiple
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />

                        {uploadedFiles.length === 0 ? (
                            <div
                                className={styles.uploadDropzone}
                                onClick={triggerFileSelect}
                            >
                                <div className={styles.uploadIcon}>📄</div>
                                <div className={styles.uploadText}>
                                    点击上传或拖拽文件到此处
                                </div>
                                <div className={styles.uploadFormats}>
                                    支持 PDF、JPG、PNG 格式
                                </div>
                            </div>
                        ) : (
                            <div className={styles.uploadedFilesContainer}>
                                <div className={styles.uploadedFilesList}>
                                    {uploadedFiles.map((file, idx) => (
                                        <div key={idx} className={styles.uploadedFileItem}>
                                            <span className={styles.fileIcon}>
                                                {file.type === 'application/pdf' ? '📕' : '🖼️'}
                                            </span>
                                            <span className={styles.fileName}>{file.name}</span>
                                        </div>
                                    ))}
                                </div>

                                {isAnalyzing && (
                                    <div className={styles.analyzingStatus}>
                                        <div className={styles.spinner}></div>
                                        <span>正在分析风格 {(analyzeTimer / 10).toFixed(1)}s</span>
                                    </div>
                                )}

                                {styleProfile && !isAnalyzing && (
                                    <div className={styles.styleProfileCard}>
                                        <div className={styles.styleProfileHeader}>
                                            <span className={styles.checkIcon}>✅</span>
                                            <span>风格识别完成</span>
                                        </div>

                                        <div className={styles.styleSection}>
                                            <div className={styles.styleSectionTitle}>配色方案</div>
                                            <div className={styles.brandColors}>
                                                {styleProfile.colors?.map((color, index) => (
                                                    <div
                                                        key={index}
                                                        className={styles.colorSwatch}
                                                        style={{ backgroundColor: color }}
                                                        title={color}
                                                    ></div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className={styles.styleSection}>
                                            <div className={styles.styleSectionTitle}>风格关键词</div>
                                            <div className={styles.styleKeywords}>
                                                {styleProfile.keywords?.map((kw, idx) => (
                                                    <span key={idx} className={styles.keywordTag}>{kw}</span>
                                                ))}
                                            </div>
                                        </div>

                                        {styleProfile.fixedElements && (
                                            <div className={styles.styleSection}>
                                                <div className={styles.styleSectionTitle}>固定元素</div>
                                                <div className={styles.fixedElements}>
                                                    {styleProfile.fixedElements.header && (
                                                        <div className={styles.fixedElementItem}>
                                                            📍 顶部: {styleProfile.fixedElements.header}
                                                        </div>
                                                    )}
                                                    {styleProfile.fixedElements.footer && (
                                                        <div className={styles.fixedElementItem}>
                                                            📍 底部: {styleProfile.fixedElements.footer}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <textarea
                                            className={styles.editableDescription}
                                            value={styleProfile.tonality || ""}
                                            onChange={(e) => {
                                                const newProfile = { ...styleProfile, tonality: e.target.value };
                                                setStyleProfile(newProfile);
                                                onBrandLoaded({
                                                    name: "自定义风格",
                                                    tonality: e.target.value,
                                                    colorPalette: newProfile.colors,
                                                    styleKeywords: newProfile.keywords,
                                                    styleProfile: newProfile,
                                                    isCustomStyle: true
                                                });
                                            }}
                                            placeholder="点击编辑风格描述..."
                                        />
                                    </div>
                                )}

                                <button
                                    className={styles.clearButton}
                                    onClick={clearUpload}
                                    disabled={isAnalyzing}
                                >
                                    🗑️ 清除并重新上传
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
}
