/**
 * System Prompt 模板生成器
 * 根据角色信息和工作流程，纯前端拼接生成完整的 System Prompt
 * 不调用 AI API
 */

/**
 * 根据角色配置生成 System Prompt
 * @param {Object} role - 角色配置
 * @returns {string} 生成的 System Prompt
 */
export function generateSystemPrompt(role) {
    const { name, domain, targetAudience, workflow } = role;

    // 基础身份描述
    let prompt = `你是一位${name}，在${domain}领域拥有丰富的专业经验。你正在为${targetAudience}撰写专业方案。

## 你的工作方式
1. **主动引导**：像顾问一样主动提问，深入理解需求和目标
2. **分段验证**：每个分析模块输出后，等待用户确认再继续
3. **专业表达**：用专业但不晦涩的语言，确保对方能直接使用
4. **一次一个**：每次只问一个问题，避免让用户困惑
5. **结构清晰**：按照明确的阶段和模块推进工作

## 工作流程
按以下顺序推进，每完成一个模块询问用户确认：

`;

    // 生成工作流程部分
    if (workflow && workflow.length > 0) {
        workflow.forEach((phase, index) => {
            prompt += `### 阶段${index + 1}: ${phase.name}\n`;

            if (phase.questions && phase.questions.length > 0) {
                prompt += `信息收集：\n`;
                phase.questions.forEach(q => {
                    prompt += `- ${q}\n`;
                });
            }

            if (phase.modules && phase.modules.length > 0) {
                prompt += `输出模块：\n`;
                phase.modules.forEach((mod, i) => {
                    prompt += `${i + 1}. **${mod}**\n`;
                });
            }

            prompt += `\n`;
        });
    }

    // 添加输出格式说明
    prompt += `## 输出格式
当你生成或更新大纲时，请在回复末尾添加以下格式的标记，用于同步到右侧 Canvas：

\`\`\`outline
{
  "title": "方案标题",
  "sections": [
    { "id": "s1", "title": "模块标题", "status": "pending|adjusting|satisfied", "content": "内容摘要..." }
  ]
}
\`\`\`

status 状态说明：
- pending: 尚未开始
- adjusting: 正在调整
- satisfied: 用户已确认

现在，请开始与用户对话，主动了解需求信息。`;

    return prompt;
}

/**
 * 创建空的工作流程阶段
 */
export function createEmptyPhase() {
    return {
        phase: `phase_${Date.now()}`,
        name: "新阶段",
        modules: [],
        questions: []
    };
}

/**
 * 验证工作流程是否有效
 */
export function validateWorkflow(workflow) {
    if (!Array.isArray(workflow)) return { valid: false, error: "工作流程数据无效" };
    if (workflow.length === 0) return { valid: false, error: "至少需要一个阶段" };

    for (let i = 0; i < workflow.length; i++) {
        const phase = workflow[i];
        if (!phase.name || phase.name.trim() === "") {
            return { valid: false, error: `阶段 ${i + 1} 缺少名称` };
        }
        if ((!phase.modules || phase.modules.length === 0) &&
            (!phase.questions || phase.questions.length === 0)) {
            return { valid: false, error: `阶段 "${phase.name}" 至少需要一个模块或问题` };
        }
    }

    return { valid: true };
}
