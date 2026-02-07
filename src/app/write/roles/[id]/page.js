"use client";

import { useState, useEffect, use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GlobalNav from "../../../components/GlobalNav";
import WorkflowEditor from "../../../components/WorkflowEditor";
import { getAllRoles, setActiveRole, saveCustomRole, createRole, DEFAULT_ROLES } from "../../../../lib/roles";
import { generateSystemPrompt, validateWorkflow } from "../../../../lib/promptGenerator";
import styles from "./detail.module.css";

/**
 * 角色详情页面
 * 支持查看和编辑角色配置
 * 工作流程支持可视化增删改，自动生成 System Prompt
 */
export default function RoleDetailPage({ params }) {
    const router = useRouter();
    const unwrappedParams = use(params);
    const roleId = unwrappedParams.id;

    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [showPromptPreview, setShowPromptPreview] = useState(false);

    // 编辑状态
    const [editName, setEditName] = useState("");
    const [editDomain, setEditDomain] = useState("");
    const [editTarget, setEditTarget] = useState("");
    const [editIcon, setEditIcon] = useState("");
    const [editWorkflow, setEditWorkflow] = useState([]);
    const [saveError, setSaveError] = useState("");

    useEffect(() => {
        const allRoles = getAllRoles();
        const found = allRoles.find(r => r.id === roleId);
        if (found) {
            setRole(found);
            // 初始化编辑状态
            setEditName(found.name);
            setEditDomain(found.domain);
            setEditTarget(found.targetAudience);
            setEditIcon(found.icon);
            setEditWorkflow(found.workflow || []);
        }
        setLoading(false);
    }, [roleId]);

    // 实时预览生成的 System Prompt
    const previewPrompt = useMemo(() => {
        if (!isEditing) return role?.systemPrompt || "";

        return generateSystemPrompt({
            name: editName,
            domain: editDomain,
            targetAudience: editTarget,
            workflow: editWorkflow
        });
    }, [isEditing, editName, editDomain, editTarget, editWorkflow, role?.systemPrompt]);

    const handleUseRole = () => {
        if (role) {
            setActiveRole(role.id);
            router.push("/write");
        }
    };

    const handleStartEdit = () => {
        setIsEditing(true);
        setSaveError("");
    };

    const handleCancelEdit = () => {
        // 恢复原始值
        if (role) {
            setEditName(role.name);
            setEditDomain(role.domain);
            setEditTarget(role.targetAudience);
            setEditIcon(role.icon);
            setEditWorkflow(role.workflow || []);
        }
        setIsEditing(false);
        setSaveError("");
    };

    const handleSave = () => {
        // 验证
        if (!editName.trim()) {
            setSaveError("角色名称不能为空");
            return;
        }
        if (!editDomain.trim()) {
            setSaveError("专业领域不能为空");
            return;
        }
        if (!editTarget.trim()) {
            setSaveError("输出对象不能为空");
            return;
        }

        const workflowValidation = validateWorkflow(editWorkflow);
        if (!workflowValidation.valid) {
            setSaveError(workflowValidation.error);
            return;
        }

        // 生成新的 System Prompt
        const newPrompt = generateSystemPrompt({
            name: editName,
            domain: editDomain,
            targetAudience: editTarget,
            workflow: editWorkflow
        });

        // 检查是否是预设角色
        const isDefault = DEFAULT_ROLES.find(r => r.id === roleId);

        if (isDefault) {
            // 预设角色：创建一个新的自定义角色副本
            const newRole = createRole({
                name: editName,
                domain: editDomain,
                targetAudience: editTarget,
                icon: editIcon,
                systemPrompt: newPrompt,
                workflow: editWorkflow
            });
            saveCustomRole(newRole);
            setActiveRole(newRole.id);
            router.push(`/write/roles/${newRole.id}`);
        } else {
            // 自定义角色：直接更新
            const updatedRole = {
                ...role,
                name: editName,
                domain: editDomain,
                targetAudience: editTarget,
                icon: editIcon,
                systemPrompt: newPrompt,
                workflow: editWorkflow,
                updatedAt: new Date().toISOString()
            };
            saveCustomRole(updatedRole);
            setRole(updatedRole);
            setIsEditing(false);
            setSaveError("");
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <GlobalNav />
                <div className={styles.content}>
                    <div className={styles.loading}>加载中...</div>
                </div>
            </div>
        );
    }

    if (!role) {
        return (
            <div className={styles.container}>
                <GlobalNav />
                <div className={styles.content}>
                    <div className={styles.notFound}>
                        <h2>😕 角色不存在</h2>
                        <p>找不到 ID 为 &quot;{roleId}&quot; 的角色</p>
                        <Link href="/write/roles" className={styles.backLink}>
                            ← 返回角色管理
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <GlobalNav />

            <div className={styles.content}>
                <div className={styles.header}>
                    <Link href="/write/roles" className={styles.backBtn}>
                        ← 返回
                    </Link>
                    <div className={styles.headerActions}>
                        {isEditing ? (
                            <>
                                <button className={styles.cancelBtn} onClick={handleCancelEdit}>
                                    取消
                                </button>
                                <button className={styles.saveBtn} onClick={handleSave}>
                                    💾 保存{role.isDefault ? "为新角色" : ""}
                                </button>
                            </>
                        ) : (
                            <>
                                <button className={styles.editBtn} onClick={handleStartEdit}>
                                    ✏️ 编辑
                                </button>
                                <button className={styles.useBtn} onClick={handleUseRole}>
                                    🚀 使用此角色
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {saveError && (
                    <div className={styles.error}>{saveError}</div>
                )}

                {role.isDefault && isEditing && (
                    <div className={styles.warning}>
                        ⚠️ 预设角色不可直接修改，保存后将创建一个新的自定义角色副本
                    </div>
                )}

                {/* 角色概览 */}
                <div className={styles.overview}>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editIcon}
                            onChange={(e) => setEditIcon(e.target.value)}
                            className={styles.iconInput}
                            placeholder="🎯"
                        />
                    ) : (
                        <div className={styles.iconLarge}>{role.icon}</div>
                    )}
                    <div className={styles.overviewInfo}>
                        {isEditing ? (
                            <>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className={styles.nameInput}
                                    placeholder="角色名称"
                                />
                                <input
                                    type="text"
                                    value={editDomain}
                                    onChange={(e) => setEditDomain(e.target.value)}
                                    className={styles.domainInput}
                                    placeholder="专业领域"
                                />
                                <div className={styles.targetRow}>
                                    <span>📤 输出对象：</span>
                                    <input
                                        type="text"
                                        value={editTarget}
                                        onChange={(e) => setEditTarget(e.target.value)}
                                        className={styles.targetInput}
                                        placeholder="输出对象"
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <h1>{role.name}</h1>
                                <p className={styles.domain}>{role.domain}</p>
                                <p className={styles.target}>📤 输出对象：<strong>{role.targetAudience}</strong></p>
                                {role.isDefault && <span className={styles.badge}>预设角色</span>}
                            </>
                        )}
                    </div>
                </div>

                {/* 工作流程 */}
                <div className={styles.section}>
                    <h2>🔄 工作流程</h2>
                    {isEditing ? (
                        <WorkflowEditor
                            workflow={editWorkflow}
                            onChange={setEditWorkflow}
                        />
                    ) : (
                        <div className={styles.workflow}>
                            {(role.workflow || []).map((phase, i) => (
                                <div key={i} className={styles.phase}>
                                    <div className={styles.phaseHeader}>
                                        <span className={styles.phaseNum}>{i + 1}</span>
                                        <strong>{phase.name}</strong>
                                    </div>
                                    {phase.questions && phase.questions.length > 0 && (
                                        <ul className={styles.questions}>
                                            {phase.questions.map((q, j) => (
                                                <li key={j}>{q}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {phase.modules && phase.modules.length > 0 && (
                                        <ul className={styles.modules}>
                                            {phase.modules.map((mod, j) => (
                                                <li key={j}>{mod}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* System Prompt 预览 */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>📝 System Prompt</h2>
                        {isEditing && (
                            <button
                                className={styles.togglePreview}
                                onClick={() => setShowPromptPreview(!showPromptPreview)}
                            >
                                {showPromptPreview ? "收起预览" : "展开预览"}
                            </button>
                        )}
                    </div>
                    {(!isEditing || showPromptPreview) && (
                        <pre className={styles.promptContent}>
                            {previewPrompt}
                        </pre>
                    )}
                    {isEditing && !showPromptPreview && (
                        <p className={styles.promptHint}>
                            💡 修改工作流程后，System Prompt 将自动生成。点击「展开预览」查看效果。
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
