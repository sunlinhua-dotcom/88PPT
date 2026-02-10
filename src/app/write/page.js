"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import GlobalNav from "../components/GlobalNav";
import RoleSwitcher from "../components/RoleSwitcher";
import { getActiveRole, getAllRoles } from "../../lib/roles";
import styles from "./write.module.css";

/**
 * PPT 内容共创助手主页面
 * 双栏布局：左侧对话区 + 右侧 Canvas
 */
export default function WritePage() {
    // 会话状态
    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [attachments, setAttachments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Canvas 大纲状态
    const [outline, setOutline] = useState({
        title: "",
        sections: []
    });

    // 移动端视图切换
    const [mobileView, setMobileView] = useState("chat"); // "chat" | "canvas"

    // 当前角色（使用初始化函数避免 SSR 问题）
    const [currentRole, setCurrentRole] = useState(() => {
        if (typeof window === "undefined") return null;
        return getActiveRole();
    });

    // 拖拽上传状态
    const [isDragging, setIsDragging] = useState(false);

    // Refs
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const dropZoneRef = useRef(null);

    // 初始化新会话
    const initNewSession = useCallback(() => {
        const newId = uuidv4();
        setSessionId(newId);
        const role = currentRole || getActiveRole();
        const greeting = role.id === "ecd"
            ? `您好！我是${role.name} ${role.icon}\n\n我将帮您撰写一份给品牌 CMO 看的完整营销策略提案。\n\n首先，请告诉我：\n• **品牌名称**和所属行业是什么？`
            : `您好！我是${role.name} ${role.icon}\n\n请告诉我您的需求，我将按照专业流程为您产出方案。`;
        setMessages([
            {
                id: uuidv4(),
                role: "assistant",
                content: greeting,
                timestamp: new Date().toISOString()
            }
        ]);
        setOutline({ title: "", sections: [] });
    }, [currentRole]);

    // 初始化会话（仅在首次加载执行）
    const hasInitialized = useRef(false);
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        // 尝试恢复上次会话
        const savedSession = localStorage.getItem("ppt_write_session");
        if (savedSession) {
            try {
                const parsed = JSON.parse(savedSession);
                setSessionId(parsed.sessionId);
                setMessages(parsed.messages || []);
                setOutline(parsed.outline || { title: "", sections: [] });

                // 恢复会话时加载对应角色
                if (parsed.roleId) {
                    const allRoles = getAllRoles();
                    const savedRole = allRoles.find(r => r.id === parsed.roleId);
                    if (savedRole) {
                        setCurrentRole(savedRole);
                    }
                }
            } catch (e) {
                console.error("恢复会话失败:", e);
                initNewSession();
            }
        } else {
            initNewSession();
        }
    }, [initNewSession]);

    // 自动保存会话（包含角色 ID）
    // P4 修复：保存时清除 isStreaming 标记，防止刷新后光标永久闪烁
    useEffect(() => {
        if (sessionId && messages.length > 0) {
            const cleanedMessages = messages.map(m => ({
                ...m,
                isStreaming: false
            }));
            const sessionData = {
                sessionId,
                roleId: currentRole?.id || "ecd",
                messages: cleanedMessages,
                outline,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem("ppt_write_session", JSON.stringify(sessionData));
        }
    }, [sessionId, messages, outline, currentRole]);

    // 滚动到底部
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // 处理文件上传
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = files.filter(f =>
            f.type === "application/pdf" || f.type.startsWith("image/")
        );

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                setAttachments(prev => [...prev, {
                    id: uuidv4(),
                    name: file.name,
                    type: file.type,
                    data: e.target.result
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    // 移除附件
    const removeAttachment = (id) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    };

    // 处理拖拽上传
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // 只有当离开 dropZone 时才取消高亮
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        const validFiles = files.filter(f =>
            f.type === "application/pdf" || f.type.startsWith("image/")
        );

        if (validFiles.length === 0) {
            alert("请上传 PDF 或图片文件");
            return;
        }

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                setAttachments(prev => [...prev, {
                    id: uuidv4(),
                    name: file.name,
                    type: file.type,
                    data: event.target.result
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    // 发送消息
    const handleSend = async () => {
        if (!inputValue.trim() && attachments.length === 0) return;
        if (isLoading) return;

        // P3 修复：提前保存当前值，避免 setState 后闭包时序问题
        const messageText = inputValue;
        const currentAttachments = attachments;

        const userMessage = {
            id: uuidv4(),
            role: "user",
            content: messageText,
            attachments: currentAttachments.map(a => ({ name: a.name, type: a.type })),
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);

        // 创建 AI 占位消息
        const aiMessageId = uuidv4();
        setMessages(prev => [...prev, {
            id: aiMessageId,
            role: "assistant",
            content: "",
            isStreaming: true,
            timestamp: new Date().toISOString()
        }]);

        try {
            const response = await fetch("/api/write/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId,
                    message: messageText,
                    // 传递完整对话历史（排除正在流式传输的占位消息和错误消息）
                    history: messages
                        .filter(m => !m.isStreaming && !m.isError && m.content)
                        .map(m => ({ role: m.role, content: m.content })),
                    attachments: currentAttachments,
                    outline,
                    roleId: currentRole?.id || "ecd",
                    systemPrompt: currentRole?.systemPrompt
                })
            });

            if (!response.ok) throw new Error("请求失败");

            // P2 修复：使用 buffer 处理 SSE 流跨 chunk 拼接
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = "";
            let sseBuffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                sseBuffer += decoder.decode(value, { stream: true });
                const lines = sseBuffer.split("\n");
                // 最后一个元素可能是不完整行，保留到下一轮
                sseBuffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const payload = line.slice(6);

                    // P1 修复：跳过 [DONE] 标记
                    if (payload === "[DONE]") continue;

                    try {
                        const data = JSON.parse(payload);
                        if (data.content) {
                            fullContent += data.content;
                            setMessages(prev => prev.map(m =>
                                m.id === aiMessageId
                                    ? { ...m, content: fullContent }
                                    : m
                            ));
                        }
                        if (data.outline) {
                            setOutline(data.outline);
                        }
                    } catch (e) {
                        // JSON 解析失败，可能是截断的行，忽略
                    }
                }
            }

            // 完成流式传输
            setMessages(prev => prev.map(m =>
                m.id === aiMessageId
                    ? { ...m, isStreaming: false }
                    : m
            ));

        } catch (error) {
            console.error("发送失败:", error);
            const errorMsg = error.message === "Failed to fetch"
                ? "⚠️ 网络连接失败，请检查网络后重试。"
                : `⚠️ 出现问题：${error.message || "未知错误"}，请稍后重试。`;
            setMessages(prev => prev.map(m =>
                m.id === aiMessageId
                    ? { ...m, content: errorMsg, isStreaming: false, isError: true }
                    : m
            ));
        } finally {
            setIsLoading(false);
            setAttachments([]);
        }
    };

    // 处理键盘事件
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // 更新章节状态
    const updateSectionStatus = (sectionId, status) => {
        setOutline(prev => ({
            ...prev,
            sections: prev.sections.map(s =>
                s.id === sectionId ? { ...s, status } : s
            )
        }));
    };

    // 导出 Markdown
    const exportMarkdown = () => {
        let md = `# ${outline.title || "PPT 内容"}\n\n`;
        outline.sections.forEach((section, i) => {
            md += `## ${i + 1}. ${section.title}\n\n`;
            md += `${section.content || "(待完善)"}\n\n`;
        });

        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${outline.title || "ppt-content"}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // 获取状态图标
    const getStatusIcon = (status) => {
        switch (status) {
            case "satisfied": return "✅";
            case "adjusting": return "🔄";
            default: return "⚪";
        }
    };

    // 轻量 Markdown 渲染（粗体、列表、换行、标题）
    const renderMarkdown = (text) => {
        if (!text) return null;
        const html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>')
            .replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>')
            .replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
            .replace(/<\/ul>\s*<ul>/g, '')
            .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
            .replace(/\n/g, "<br/>");
        return <span dangerouslySetInnerHTML={{ __html: html }} />;
    };

    return (
        <div className={styles.container}>
            <GlobalNav />

            {/* 角色切换器 + 新建对话 */}
            <div className={styles.roleBar}>
                <RoleSwitcher
                    hasUnsavedChanges={messages.length > 1}
                    onRoleChange={(role) => {
                        setCurrentRole(role);
                        // 直接使用新角色生成问候语，避免闭包竞态
                        const newId = uuidv4();
                        setSessionId(newId);
                        const greeting = role.id === "ecd"
                            ? `您好！我是${role.name} ${role.icon}\n\n我将帮您撰写一份给品牌 CMO 看的完整营销策略提案。\n\n首先，请告诉我：\n• **品牌名称**和所属行业是什么？`
                            : `您好！我是${role.name} ${role.icon}\n\n请告诉我您的需求，我将按照专业流程为您产出方案。`;
                        setMessages([{
                            id: uuidv4(),
                            role: "assistant",
                            content: greeting,
                            timestamp: new Date().toISOString()
                        }]);
                        setOutline({ title: "", sections: [] });
                    }}
                />
                <button
                    className={styles.newChatBtn}
                    onClick={(e) => {
                        e.preventDefault(); // 防止可能的默认行为
                        console.log("点击新建对话");
                        if (messages.length > 1) {
                            if (window.confirm("确定要开始新对话吗？当前对话将被清空。")) {
                                console.log("确认新建");
                                initNewSession();
                            }
                        } else {
                            console.log("直接新建");
                            initNewSession();
                        }
                    }}
                    title="新建对话"
                >
                    ➕ 新建对话
                </button>
            </div>

            {/* 移动端标签切换 */}
            <div className={styles.mobileTabBar}>
                <button
                    className={`${styles.mobileTab} ${mobileView === "chat" ? styles.active : ""}`}
                    onClick={() => setMobileView("chat")}
                >
                    💬 对话
                </button>
                <button
                    className={`${styles.mobileTab} ${mobileView === "canvas" ? styles.active : ""}`}
                    onClick={() => setMobileView("canvas")}
                >
                    📝 大纲
                </button>
            </div>

            <div className={styles.mainContent}>
                {/* 左侧：对话区 */}
                <div
                    ref={dropZoneRef}
                    className={`${styles.chatPanel} ${mobileView === "chat" ? styles.visible : ""} ${isDragging ? styles.dragging : ""}`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    {/* 拖拽提示覆盖层 */}
                    {isDragging && (
                        <div className={styles.dropOverlay}>
                            <div className={styles.dropHint}>
                                <span className={styles.dropIcon}>📎</span>
                                <p>释放以上传文件</p>
                                <small>支持 PDF 和图片</small>
                            </div>
                        </div>
                    )}

                    <div className={styles.messagesContainer}>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`${styles.message} ${styles[msg.role]}`}
                            >
                                <div className={styles.messageInner}>
                                    <div className={`${styles.avatar} ${styles[msg.role]}`}>
                                        {msg.role === 'user' ? '👤' : '✨'}
                                    </div>
                                    <div className={styles.messageBody}>
                                        <div className={styles.messageContent}>
                                            {/* AI 思考中状态 */}
                                            {msg.isStreaming && !msg.content && (
                                                <div className={styles.thinkingState}>
                                                    <div className={styles.thinkingDots}>
                                                        <span></span>
                                                        <span></span>
                                                        <span></span>
                                                    </div>
                                                    <span className={styles.thinkingText}>
                                                        {currentRole?.name || 'AI'} 正在思考中...
                                                    </span>
                                                </div>
                                            )}
                                            {/* 正常内容 */}
                                            <div className={styles.markdownContent}>
                                                {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                                            </div>
                                            {msg.isStreaming && msg.content && <span className={styles.cursor} />}
                                        </div>
                                        {msg.attachments?.length > 0 && (
                                            <div className={styles.messageAttachments}>
                                                {msg.attachments.map((a, i) => (
                                                    <span key={i} className={styles.attachmentBadge}>
                                                        📎 {a.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* 输入区 */}
                    <div className={styles.inputArea}>
                        {attachments.length > 0 && (
                            <div className={styles.attachmentsList}>
                                {attachments.map((a) => (
                                    <div key={a.id} className={styles.attachmentItem}>
                                        <span>📎 {a.name}</span>
                                        <button onClick={() => removeAttachment(a.id)}>×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className={styles.inputRow}>
                            <button
                                className={styles.attachBtn}
                                onClick={() => fileInputRef.current?.click()}
                                title="上传文件 (支持拖拽)"
                            >
                                <span className={styles.attachIcon}>+</span>
                                <span className={styles.attachLabel}>附件</span>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".pdf,image/*"
                                multiple
                                hidden
                            />
                            <textarea
                                className={styles.textInput}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="输入您的需求或建议..."
                                rows={1}
                            />
                            <button
                                className={styles.sendBtn}
                                onClick={handleSend}
                                disabled={isLoading || (!inputValue.trim() && attachments.length === 0)}
                            >
                                {isLoading ? "⏳" : "▶"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 右侧：Canvas 大纲 */}
                <div className={`${styles.canvasPanel} ${mobileView === "canvas" ? styles.visible : ""}`}>
                    <div className={styles.canvasHeader}>
                        <h2>📝 内容大纲</h2>
                        <button
                            className={styles.exportBtn}
                            onClick={exportMarkdown}
                            disabled={outline.sections.length === 0}
                        >
                            导出 ▼
                        </button>
                    </div>

                    <div className={styles.canvasContent}>
                        {outline.sections.length === 0 ? (
                            <div className={styles.emptyCanvas}>
                                <p>开始对话后，AI 将在这里生成 PPT 结构</p>
                            </div>
                        ) : (
                            <div className={styles.sectionsList}>
                                {outline.sections.map((section, index) => (
                                    <div
                                        key={section.id}
                                        className={`${styles.sectionCard} ${styles[section.status]}`}
                                    >
                                        <div className={styles.sectionHeader}>
                                            <span className={styles.sectionStatus}>
                                                {getStatusIcon(section.status)}
                                            </span>
                                            <span className={styles.sectionTitle}>
                                                {index + 1}. {section.title}
                                            </span>
                                            <div className={styles.sectionActions}>
                                                {section.status !== "satisfied" && (
                                                    <button
                                                        onClick={() => updateSectionStatus(section.id, "satisfied")}
                                                        title="标记为满意"
                                                    >
                                                        ✓
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles.sectionContent}>
                                            {section.content || "(等待生成...)"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
