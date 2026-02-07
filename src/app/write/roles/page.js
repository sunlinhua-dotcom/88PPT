"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GlobalNav from "../../components/GlobalNav";
import { getAllRoles, deleteCustomRole, DEFAULT_ROLES, exportCustomRoles, importRoles } from "../../../lib/roles";
import styles from "./roles.module.css";

/**
 * 角色管理页面
 * 查看、创建、删除、导入、导出角色
 */
export default function RolesPage() {
    const router = useRouter();
    const [roles, setRoles] = useState(() => {
        if (typeof window === "undefined") return [];
        return getAllRoles();
    });
    const [importStatus, setImportStatus] = useState(null);
    const fileInputRef = useRef(null);

    const loadRoles = () => {
        setRoles(getAllRoles());
    };

    const handleDelete = (roleId) => {
        // 不允许删除预设角色
        if (DEFAULT_ROLES.find(r => r.id === roleId)) {
            alert("预设角色不能删除");
            return;
        }

        if (!confirm("确定要删除这个角色吗？")) return;

        deleteCustomRole(roleId);
        loadRoles();
    };

    // 导出角色
    const handleExport = () => {
        const data = exportCustomRoles();
        if (!data || data.roles?.length === 0) {
            alert("没有自定义角色可导出");
            return;
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ppt-ai-roles-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // 导入角色
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleImportFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                const result = importRoles(data);
                setImportStatus(result);
                if (result.success) {
                    loadRoles();
                }
                // 3 秒后清除状态
                setTimeout(() => setImportStatus(null), 3000);
            } catch (err) {
                setImportStatus({ success: false, error: "文件格式错误" });
                setTimeout(() => setImportStatus(null), 3000);
            }
        };
        reader.readAsText(file);
        e.target.value = ""; // 重置
    };

    return (
        <div className={styles.container}>
            <GlobalNav />

            <div className={styles.content}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <Link href="/write" className={styles.backBtn}>
                            ← 返回
                        </Link>
                        <h1>⚙️ 角色管理</h1>
                    </div>
                    <div className={styles.headerRight}>
                        <button className={styles.importBtn} onClick={handleImportClick}>
                            📥 导入
                        </button>
                        <button className={styles.exportBtn} onClick={handleExport}>
                            📤 导出
                        </button>
                        <Link href="/write/roles/new" className={styles.newBtn}>
                            ➕ 新建角色
                        </Link>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportFile}
                        accept=".json"
                        style={{ display: "none" }}
                    />
                </div>

                {importStatus && (
                    <div className={`${styles.statusBar} ${importStatus.success ? styles.success : styles.error}`}>
                        {importStatus.success ? importStatus.message : importStatus.error}
                    </div>
                )}

                <p className={styles.description}>
                    管理不同专业领域的 AI 角色。每个角色都有独特的工作方式和输出格式。
                </p>

                <div className={styles.roleGrid}>
                    {roles.map(role => (
                        <div
                            key={role.id}
                            className={`${styles.roleCard} ${role.isDefault ? styles.default : ""}`}
                        >
                            <div className={styles.cardHeader}>
                                <span className={styles.roleIcon}>{role.icon}</span>
                                <div className={styles.cardHeaderRight}>
                                    {role.isDefault && (
                                        <span className={styles.badge}>预设</span>
                                    )}
                                </div>
                            </div>
                            <h3 className={styles.roleName}>{role.name}</h3>
                            <p className={styles.roleDomain}>{role.domain}</p>
                            <p className={styles.roleTarget}>
                                📤 输出对象：<strong>{role.targetAudience}</strong>
                            </p>
                            <div className={styles.cardActions}>
                                <button
                                    className={styles.viewBtn}
                                    onClick={() => router.push(`/write/roles/${role.id}`)}
                                >
                                    查看详情
                                </button>
                                {!role.isDefault && (
                                    <button
                                        className={styles.deleteBtn}
                                        onClick={() => handleDelete(role.id)}
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
