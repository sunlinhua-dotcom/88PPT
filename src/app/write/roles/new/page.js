"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GlobalNav from "../../../components/GlobalNav";
import WorkflowEditor from "../../../components/WorkflowEditor";
import { createRole, saveCustomRole, setActiveRole } from "../../../../lib/roles";
import { generateSystemPrompt, createEmptyPhase, validateWorkflow } from "../../../../lib/promptGenerator";
import styles from "./new.module.css";

/**
 * 新建角色页面
 * 支持 AI 自动生成或手动创建角色配置
 */
export default function NewRolePage() {
    const router = useRouter();

    // 模式切换：AI 生成 / 手动创建
    const [mode, setMode] = useState("ai"); // "ai" | "manual"

    // 表单状态
    const [roleName, setRoleName] = useState("");
    const [domain, setDomain] = useState("");
    const [targetAudience, setTargetAudience] = useState("");
    const [icon, setIcon] = useState("🎯");

    // 手动模式：工作流编辑
    const [workflow, setWorkflow] = useState([createEmptyPhase()]);

    // 生成状态
    const [isGenerating, setIsGenerating] = useState(false);
    const [generated, setGenerated] = useState(null);
    const [error, setError] = useState("");

    const handleGenerate = async () => {
        if (!roleName.trim() || !domain.trim() || !targetAudience.trim()) {
            setError("请填写所有字段");
            return;
        }

        setIsGenerating(true);
        setError("");
        setGenerated(null);

        try {
            const response = await fetch("/api/write/roles/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roleName: roleName.trim(),
                    domain: domain.trim(),
                    targetAudience: targetAudience.trim()
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "生成失败");
            }

            setGenerated(data.generated);
        } catch (e) {
            setError(e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveAI = () => {
        if (!generated) return;

        const newRole = createRole({
            name: generated.name,
            domain: generated.domain,
            targetAudience: generated.targetAudience,
            icon: generated.icon || "🎯",
            systemPrompt: generated.systemPrompt,
            workflow: generated.workflow || []
        });

        saveCustomRole(newRole);
        setActiveRole(newRole.id);
        router.push("/write");
    };

    const handleSaveManual = () => {
        if (!roleName.trim() || !domain.trim() || !targetAudience.trim()) {
            setError("请填写所有基础信息");
            return;
        }

        // P5 修复：使用 validateWorkflow 进行完整校验
        const workflowValidation = validateWorkflow(workflow);
        if (!workflowValidation.valid) {
            setError(workflowValidation.error);
            return;
        }

        // 使用模板生成器自动生成 System Prompt
        const systemPrompt = generateSystemPrompt({
            name: roleName.trim(),
            domain: domain.trim(),
            targetAudience: targetAudience.trim(),
            workflow: workflow
        });

        const newRole = createRole({
            name: roleName.trim(),
            domain: domain.trim(),
            targetAudience: targetAudience.trim(),
            icon: icon,
            systemPrompt: systemPrompt,
            workflow: workflow
        });

        saveCustomRole(newRole);
        setActiveRole(newRole.id);
        router.push("/write");
    };

    return (
        <div className={styles.container}>
            <GlobalNav />

            <div className={styles.content}>
                <div className={styles.header}>
                    <Link href="/write/roles" className={styles.backBtn}>
                        ← 返回
                    </Link>
                    <h1>✨ 新建 AI 角色</h1>
                </div>

                {/* 模式切换 */}
                <div className={styles.modeSwitch}>
                    <button
                        className={`${styles.modeBtn} ${mode === "ai" ? styles.active : ""}`}
                        onClick={() => setMode("ai")}
                    >
                        🤖 AI 自动生成
                    </button>
                    <button
                        className={`${styles.modeBtn} ${mode === "manual" ? styles.active : ""}`}
                        onClick={() => setMode("manual")}
                    >
                        ✏️ 手动创建
                    </button>
                </div>

                <p className={styles.description}>
                    {mode === "ai"
                        ? "填写基础信息，AI 将自动生成完善的角色配置。"
                        : "手动配置角色信息和工作流程，系统自动生成 System Prompt。"
                    }
                </p>

                {/* 基础信息表单 */}
                <div className={styles.form}>
                    {mode === "manual" && (
                        <div className={styles.field}>
                            <label>角色图标</label>
                            <input
                                type="text"
                                placeholder="🎯"
                                value={icon}
                                onChange={(e) => setIcon(e.target.value)}
                                className={styles.iconInput}
                            />
                        </div>
                    )}
                    <div className={styles.field}>
                        <label>角色名称</label>
                        <input
                            type="text"
                            placeholder="例如：资深产品经理"
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                        />
                    </div>
                    <div className={styles.field}>
                        <label>专业领域</label>
                        <input
                            type="text"
                            placeholder="例如：互联网产品/用户增长"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                        />
                    </div>
                    <div className={styles.field}>
                        <label>输出对象</label>
                        <input
                            type="text"
                            placeholder="例如：CEO/投资人"
                            value={targetAudience}
                            onChange={(e) => setTargetAudience(e.target.value)}
                        />
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    {/* AI 模式：生成按钮 */}
                    {mode === "ai" && (
                        <button
                            className={styles.generateBtn}
                            onClick={handleGenerate}
                            disabled={isGenerating}
                        >
                            {isGenerating ? "🤖 AI 生成中..." : "🤖 AI 自动生成"}
                        </button>
                    )}
                </div>

                {/* 手动模式：工作流编辑器 */}
                {mode === "manual" && (
                    <div className={styles.workflowSection}>
                        <h2>🔄 工作流程</h2>
                        <p className={styles.workflowHint}>
                            定义角色的工作阶段，每个阶段可以包含「收集问题」和「输出模块」
                        </p>
                        <WorkflowEditor
                            workflow={workflow}
                            onChange={setWorkflow}
                        />

                        <button className={styles.saveBtn} onClick={handleSaveManual}>
                            ✅ 保存并使用
                        </button>
                    </div>
                )}

                {/* AI 生成结果预览 */}
                {mode === "ai" && generated && (
                    <div className={styles.preview}>
                        <h2>📄 生成结果预览</h2>

                        <div className={styles.previewCard}>
                            <div className={styles.previewHeader}>
                                <span className={styles.previewIcon}>{generated.icon}</span>
                                <div>
                                    <h3>{generated.name}</h3>
                                    <p>{generated.domain}</p>
                                </div>
                            </div>

                            <div className={styles.previewSection}>
                                <h4>📤 输出对象</h4>
                                <p>{generated.targetAudience}</p>
                            </div>

                            <div className={styles.previewSection}>
                                <h4>📝 System Prompt</h4>
                                <pre className={styles.promptPreview}>
                                    {generated.systemPrompt?.substring(0, 500)}...
                                </pre>
                            </div>

                            {generated.workflow && (
                                <div className={styles.previewSection}>
                                    <h4>🔄 工作流程</h4>
                                    <div className={styles.workflow}>
                                        {generated.workflow.map((phase, i) => (
                                            <div key={i} className={styles.phase}>
                                                <span className={styles.phaseNum}>{i + 1}</span>
                                                <div>
                                                    <strong>{phase.name}</strong>
                                                    <p>
                                                        {phase.modules?.join(", ") || phase.questions?.join(", ")}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.actions}>
                            <button className={styles.regenerateBtn} onClick={handleGenerate}>
                                🔄 重新生成
                            </button>
                            <button className={styles.saveBtn} onClick={handleSaveAI}>
                                ✅ 保存并使用
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
