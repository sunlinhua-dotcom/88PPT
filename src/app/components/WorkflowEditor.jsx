"use client";

import { useState } from "react";
import styles from "./WorkflowEditor.module.css";

/**
 * 工作流程可视化编辑器
 * 支持增删改阶段和模块
 */
export default function WorkflowEditor({ workflow, onChange }) {
    const [expandedPhase, setExpandedPhase] = useState(0);

    // 添加新阶段
    const addPhase = () => {
        const newPhase = {
            phase: `phase_${Date.now()}`,
            name: "新阶段",
            modules: [],
            questions: []
        };
        onChange([...workflow, newPhase]);
        setExpandedPhase(workflow.length);
    };

    // 删除阶段
    const deletePhase = (index) => {
        if (workflow.length <= 1) {
            alert("至少保留一个阶段");
            return;
        }
        const updated = workflow.filter((_, i) => i !== index);
        onChange(updated);
        if (expandedPhase >= updated.length) {
            setExpandedPhase(Math.max(0, updated.length - 1));
        }
    };

    // 更新阶段名称
    const updatePhaseName = (index, name) => {
        const updated = [...workflow];
        updated[index] = { ...updated[index], name };
        onChange(updated);
    };

    // 添加模块
    const addModule = (phaseIndex) => {
        const updated = [...workflow];
        const modules = updated[phaseIndex].modules || [];
        updated[phaseIndex] = {
            ...updated[phaseIndex],
            modules: [...modules, "新模块"]
        };
        onChange(updated);
    };

    // 更新模块
    const updateModule = (phaseIndex, moduleIndex, value) => {
        const updated = [...workflow];
        const modules = [...(updated[phaseIndex].modules || [])];
        modules[moduleIndex] = value;
        updated[phaseIndex] = { ...updated[phaseIndex], modules };
        onChange(updated);
    };

    // 删除模块
    const deleteModule = (phaseIndex, moduleIndex) => {
        const updated = [...workflow];
        const modules = (updated[phaseIndex].modules || []).filter((_, i) => i !== moduleIndex);
        updated[phaseIndex] = { ...updated[phaseIndex], modules };
        onChange(updated);
    };

    // 添加问题（用于信息收集阶段）
    const addQuestion = (phaseIndex) => {
        const updated = [...workflow];
        const questions = updated[phaseIndex].questions || [];
        updated[phaseIndex] = {
            ...updated[phaseIndex],
            questions: [...questions, "新问题？"]
        };
        onChange(updated);
    };

    // 更新问题
    const updateQuestion = (phaseIndex, qIndex, value) => {
        const updated = [...workflow];
        const questions = [...(updated[phaseIndex].questions || [])];
        questions[qIndex] = value;
        updated[phaseIndex] = { ...updated[phaseIndex], questions };
        onChange(updated);
    };

    // 删除问题
    const deleteQuestion = (phaseIndex, qIndex) => {
        const updated = [...workflow];
        const questions = (updated[phaseIndex].questions || []).filter((_, i) => i !== qIndex);
        updated[phaseIndex] = { ...updated[phaseIndex], questions };
        onChange(updated);
    };

    // 移动阶段顺序
    const movePhase = (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= workflow.length) return;

        const updated = [...workflow];
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
        onChange(updated);
        setExpandedPhase(newIndex);
    };

    return (
        <div className={styles.container}>
            <div className={styles.phases}>
                {workflow.map((phase, index) => (
                    <div
                        key={phase.phase || index}
                        className={`${styles.phase} ${expandedPhase === index ? styles.expanded : ""}`}
                    >
                        {/* 阶段头部 */}
                        <div
                            className={styles.phaseHeader}
                            onClick={() => setExpandedPhase(expandedPhase === index ? -1 : index)}
                        >
                            <div className={styles.phaseLeft}>
                                <span className={styles.phaseNum}>{index + 1}</span>
                                <input
                                    type="text"
                                    value={phase.name}
                                    onChange={(e) => updatePhaseName(index, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className={styles.phaseNameInput}
                                />
                            </div>
                            <div className={styles.phaseActions}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); movePhase(index, -1); }}
                                    disabled={index === 0}
                                    title="上移"
                                >↑</button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); movePhase(index, 1); }}
                                    disabled={index === workflow.length - 1}
                                    title="下移"
                                >↓</button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deletePhase(index); }}
                                    className={styles.deleteBtn}
                                    title="删除阶段"
                                >🗑️</button>
                                <span className={styles.expandIcon}>
                                    {expandedPhase === index ? "▼" : "▶"}
                                </span>
                            </div>
                        </div>

                        {/* 阶段内容 */}
                        {expandedPhase === index && (
                            <div className={styles.phaseContent}>
                                {/* 问题列表（信息收集） */}
                                <div className={styles.section}>
                                    <div className={styles.sectionHeader}>
                                        <span>❓ 收集问题</span>
                                        <button onClick={() => addQuestion(index)}>+ 添加</button>
                                    </div>
                                    {(phase.questions || []).map((q, qIndex) => (
                                        <div key={qIndex} className={styles.item}>
                                            <input
                                                type="text"
                                                value={q}
                                                onChange={(e) => updateQuestion(index, qIndex, e.target.value)}
                                                placeholder="输入问题..."
                                            />
                                            <button
                                                onClick={() => deleteQuestion(index, qIndex)}
                                                className={styles.itemDelete}
                                            >×</button>
                                        </div>
                                    ))}
                                </div>

                                {/* 模块列表 */}
                                <div className={styles.section}>
                                    <div className={styles.sectionHeader}>
                                        <span>📦 输出模块</span>
                                        <button onClick={() => addModule(index)}>+ 添加</button>
                                    </div>
                                    {(phase.modules || []).map((mod, mIndex) => (
                                        <div key={mIndex} className={styles.item}>
                                            <input
                                                type="text"
                                                value={mod}
                                                onChange={(e) => updateModule(index, mIndex, e.target.value)}
                                                placeholder="输入模块名..."
                                            />
                                            <button
                                                onClick={() => deleteModule(index, mIndex)}
                                                className={styles.itemDelete}
                                            >×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <button className={styles.addPhaseBtn} onClick={addPhase}>
                ➕ 添加新阶段
            </button>
        </div>
    );
}
