import React from 'react';
import styles from './ProcessingHUD.module.css';

export default function ProcessingHUD({ current, total, progress, estimatedTime, onStop, onResume, isProcessing, isStopped }) {
    if (total === 0) return null;

    const isComplete = current >= total && !isProcessing;

    return (
        <div className={styles.hudContainer}>
            <div className={styles.hudPill}>
                <div className={styles.statusSection}>
                    {isComplete ? (
                        <span>✅</span>
                    ) : (
                        <div className={styles.spinner}></div>
                    )}
                    <span className={styles.statusText}>
                        {isComplete ? "重绘完成" : "AI 正在重绘中..."}
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

                {/* Stop Button */}
                {/* Action Buttons */}
                {!isComplete && (
                    <>
                        {isStopped ? (
                            onResume && (
                                <button
                                    className={styles.resumeButton}
                                    onClick={onResume}
                                    title="继续处理"
                                >
                                    ▶️ 继续
                                </button>
                            )
                        ) : (
                            isProcessing && onStop && (
                                <button
                                    className={styles.stopButton}
                                    onClick={onStop}
                                    title="停止处理"
                                >
                                    ⏹️ 停止
                                </button>
                            )
                        )}
                    </>
                )}
            </div>

            {!isComplete && isProcessing && estimatedTime && (
                <div className={styles.timePill}>
                    ⏱️ 预计剩余时间：{estimatedTime}
                </div>
            )}
        </div>
    );
}
