"use client";

import { useState } from "react";
import styles from "./InvitationCodeModal.module.css";

export default function InvitationCodeModal({ onUnlock }) {
    const [code, setCode] = useState("");
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);

    const handleUnlock = () => {
        if (code === "207301") {
            onUnlock();
        } else {
            setError(true);
            setShake(true);
            setTimeout(() => setShake(false), 500);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleUnlock();
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={`${styles.modal} ${shake ? styles.shake : ""}`}>
                <div className={styles.iconWrapper}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </div>
                <h2 className={styles.title}>请输入邀请码</h2>
                <p className={styles.subtitle}>PPT-AI Pro 仅限受邀用户使用</p>

                <div className={styles.inputWrapper}>
                    <input
                        type="password"
                        className={`${styles.input} ${error ? styles.errorInput : ""}`}
                        placeholder="6 位数字邀请码"
                        value={code}
                        onChange={(e) => {
                            setError(false);
                            setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                        }}
                        onKeyPress={handleKeyPress}
                        maxLength={6}
                        autoFocus
                    />
                </div>

                <button
                    className={styles.button}
                    onClick={handleUnlock}
                    disabled={code.length < 6}
                >
                    解锁系统
                </button>
            </div>
        </div>
    );
}
