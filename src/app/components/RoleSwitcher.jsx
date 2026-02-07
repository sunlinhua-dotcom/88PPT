"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getAllRoles, getActiveRole, setActiveRole } from "../../lib/roles";
import styles from "./RoleSwitcher.module.css";

/**
 * 角色切换器组件
 * 显示在 /write 页面顶部，允许用户切换不同角色
 */
export default function RoleSwitcher({ onRoleChange, hasUnsavedChanges = false }) {
    // 初始状态设为 null/空，避免 SSR mismatch
    const [roles, setRoles] = useState([]);
    const [activeRole, setActiveRoleState] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [confirmRole, setConfirmRole] = useState(null);
    const dropdownRef = useRef(null);

    // 客户端挂载后加载角色数据
    useEffect(() => {
        // 使用微任务避免同步 setState 的 Lint 错误，同时解决 hydration mismatch
        Promise.resolve().then(() => {
            setRoles(getAllRoles());
            setActiveRoleState(getActiveRole());
        });
    }, []);

    // 点击外部关闭下拉
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
                setConfirmRole(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelectRole = (role) => {
        // 如果选择的是当前角色，直接关闭
        if (role.id === activeRole?.id) {
            setIsOpen(false);
            return;
        }

        // 如果有未保存的更改，先确认
        if (hasUnsavedChanges) {
            setConfirmRole(role);
            return;
        }

        doSwitchRole(role);
    };

    const doSwitchRole = (role) => {
        setActiveRole(role.id);
        setActiveRoleState(role);
        setIsOpen(false);
        setConfirmRole(null);

        // 通知父组件角色变更
        if (onRoleChange) {
            onRoleChange(role);
        }
    };

    const handleConfirmSwitch = () => {
        if (confirmRole) {
            doSwitchRole(confirmRole);
        }
    };

    const handleCancelSwitch = () => {
        setConfirmRole(null);
    };

    if (!activeRole) return null;

    return (
        <div className={styles.container} ref={dropdownRef}>
            <button
                className={styles.trigger}
                onClick={() => {
                    if (!isOpen) setRoles(getAllRoles());
                    setIsOpen(!isOpen);
                }}
            >
                <span className={styles.icon}>{activeRole.icon}</span>
                <span className={styles.name}>{activeRole.name}</span>
                <span className={styles.arrow}>{isOpen ? "▲" : "▼"}</span>
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    {/* 确认切换对话框 */}
                    {confirmRole && (
                        <div className={styles.confirmBox}>
                            <p>当前对话尚未保存，切换角色将开始新对话。</p>
                            <div className={styles.confirmActions}>
                                <button onClick={handleCancelSwitch} className={styles.cancelBtn}>
                                    取消
                                </button>
                                <button onClick={handleConfirmSwitch} className={styles.confirmBtn}>
                                    确认切换
                                </button>
                            </div>
                        </div>
                    )}

                    {!confirmRole && (
                        <>
                            <div className={styles.roleList}>
                                {roles.map((role) => (
                                    <button
                                        key={role.id}
                                        className={`${styles.roleItem} ${role.id === activeRole.id ? styles.active : ""}`}
                                        onClick={() => handleSelectRole(role)}
                                    >
                                        <span className={styles.roleIcon}>{role.icon}</span>
                                        <div className={styles.roleInfo}>
                                            <span className={styles.roleName}>{role.name}</span>
                                            <span className={styles.roleDomain}>{role.domain}</span>
                                        </div>
                                        {role.id === activeRole.id && (
                                            <span className={styles.checkmark}>✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.actions}>
                                <Link href="/write/roles" className={styles.manageBtn}>
                                    ⚙️ 管理角色
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
