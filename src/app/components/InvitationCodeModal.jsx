"use client";

import { useState } from "react";
import styles from "./InvitationCodeModal.module.css";

export default function InvitationCodeModal({ onUnlock }) {
    const [code, setCode] = useState("");
    const [shake, setShake] = useState(false);

    const handleNumberClick = (num) => {
        if (code.length < 3) {
            const newCode = code + num;
            setCode(newCode);

            // Auto check if length is 3
            if (newCode.length === 3) {
                if (newCode === "000") {
                    setTimeout(() => onUnlock(), 300);
                } else {
                    setShake(true);
                    setTimeout(() => {
                        setShake(false);
                        setCode("");
                    }, 500);
                }
            }
        }
    };

    const handleDelete = () => {
        setCode(prev => prev.slice(0, -1));
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
                <h2 className={styles.title}>请输入解锁码</h2>
                <p className={styles.subtitle}>输入数字直接进入系统</p>

                {/* Passcode Dots Area */}
                <div className={styles.passcodeDisplay}>
                    {[0, 1, 2].map(i => (
                        <div key={i} className={`${styles.dot} ${code.length > i ? styles.dotFilled : ""}`} />
                    ))}
                </div>

                {/* Keypad */}
                <div className={styles.keypad}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button key={num} className={styles.key} onClick={() => handleNumberClick(num.toString())}>
                            {num}
                        </button>
                    ))}
                    <button className={`${styles.key} ${styles.keyDelete}`} style={{ fontSize: '12px', opacity: 0.6 }} onClick={() => setCode("")}>重置</button>
                    <button className={styles.key} onClick={() => handleNumberClick("0")}>0</button>
                    <button className={`${styles.key} ${styles.keyDelete}`} onClick={handleDelete}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
                            <line x1="18" y1="9" x2="12" y2="15"></line>
                            <line x1="12" y1="9" x2="18" y2="15"></line>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
