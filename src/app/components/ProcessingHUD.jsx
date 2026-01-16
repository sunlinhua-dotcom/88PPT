import React from 'react';
import styles from './ProcessingHUD.module.css';

export default function ProcessingHUD({ current, total, progress, estimatedTime }) {
    if (total === 0) return null;

    return (
        <div className={styles.hudContainer}>
            <div className={styles.hudPill}>
                <div className={styles.statusSection}>
                    {current < total ? (
                        <div className={styles.spinner}></div>
                    ) : (
                        <span>✅</span>
                    )}
                    <span className={styles.statusText}>
                        {current < total ? "AI 正在重绘中..." : "重绘完成"}
                    </span>
                </div>

                <div className={styles.progressSection}>
                    <div className={styles.progressTrack}>
                        <div
                            className={styles.progressBar}
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <span className={styles.pageCount}>
                        {current} / {total}
                    </span>
                </div>
            </div>

            {current < total && estimatedTime && (
                <div className={styles.timePill}>
                    ⏱️ 预计剩余时间：{estimatedTime}
                </div>
            )}
        </div>
    );
}
