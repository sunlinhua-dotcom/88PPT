"use client";

import { useState, useEffect } from "react";
import styles from "./BrandInput.module.css";

export default function BrandInput({ onBrandLoaded, disabled }) {
    const [brandName, setBrandName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [brandInfo, setBrandInfo] = useState(null);
    const [error, setError] = useState(null);
    const [timer, setTimer] = useState(0); // 计时器状态

    useEffect(() => {
        let interval;
        if (isLoading) {
            setTimer(0);
            interval = setInterval(() => {
                setTimer(t => t + 1);
            }, 100); // 0.1s update
        } else {
            setTimer(0);
        }
        return () => clearInterval(interval);
    }, [isLoading]);

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

    return (
        <div className={styles.container}>
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

            {error && <p className={styles.error}>{error}</p>}

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
    );
}
