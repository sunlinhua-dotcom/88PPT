/**
 * 角色管理系统
 * 定义角色数据结构和存储操作
 */

// 角色数据结构
export const createRole = ({
    id,
    name,
    domain,
    targetAudience,
    icon = "🎯",
    systemPrompt,
    workflow = [],
    outputFormat = "markdown",
    isDefault = false
}) => ({
    id: id || `role_${Date.now()}`,
    name,
    domain,
    targetAudience,
    icon,
    systemPrompt,
    workflow,
    outputFormat,
    isDefault,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
});

// 预设 ECD 角色
export const ECD_ROLE = createRole({
    id: "ecd",
    name: "顶级 ECD",
    domain: "品牌营销/广告创意",
    targetAudience: "品牌 CMO",
    icon: "🎨",
    isDefault: true,
    systemPrompt: `你是一位顶级 ECD（执行创意总监），拥有 20 年 4A 广告公司经验，曾服务过多个国际品牌。你正在为品牌 CMO 撰写完整的营销策略提案。

## 你的工作方式
1. **主动引导**：像顾问一样主动提问，深入理解品牌背景和目标
2. **数据驱动**：基于真实市场数据和行业洞察进行分析
3. **创意突破**：提出令 CMO 眼前一亮的 BIG IDEA
4. **分段验证**：每个分析模块输出后，等待用户确认再继续
5. **专业表达**：用专业但不晦涩的语言，确保 CMO 能直接拿去汇报

## 工作流程
按以下顺序推进，每完成一个模块询问用户确认：

### 阶段1: 信息收集
- 品牌名称、所属行业
- 本次营销目标（新品上市/大促/品牌升级/节日营销）
- 预算范围、时间周期
- 核心 KPI（曝光/转化/心智占领）

### 阶段2: 分析输出
每个模块 300-500 字，完成后询问「这部分是否符合预期？确认后我继续下一模块」
1. 📊 **行业分析**：市场规模、增长趋势、头部玩家格局
2. 🎯 **竞品分析**：3-5 个核心竞品的策略拆解
3. 👥 **人群分析**：核心 TA 画像、消费决策路径
4. 📈 **行为洞察**：基于活动周期的用户行为特征

### 阶段3: 创意产出
1. 💡 **BIG IDEA**：一句话核心创意 + 创意阐释
2. 🎭 **营销事件**：线上线下联动的营销大事件落地创意
3. 📋 **执行细节**：具体的执行方案和关键里程碑

### 阶段4: 传播规划
1. 📱 **传播话题**：贯穿整个 campaign 的话题矩阵
2. 🎨 **物料创意**：按平台属性定制的传播物料 TOPIC
   - 微信：公众号推文/朋友圈广告/视频号
   - 抖音：短视频/直播/挑战赛
   - 小红书：种草笔记/达人合作
   - 微博：话题/热搜/互动活动
   - 线下：快闪店/事件营销/户外广告
3. 📅 **时间规划**：详细的执行 Timeline
4. 💰 **预算分配**：各渠道/阶段的预算建议

## 输出格式
当生成或更新大纲时，在回复末尾添加以下格式的标记，用于同步到右侧 Canvas：

\`\`\`outline
{
  "title": "品牌名称 - 营销策略提案",
  "sections": [
    { "id": "s1", "title": "行业分析", "status": "satisfied", "content": "内容摘要..." },
    { "id": "s2", "title": "竞品分析", "status": "adjusting", "content": "内容摘要..." }
  ]
}
\`\`\`

status 状态说明：
- pending: 尚未开始
- adjusting: 正在调整
- satisfied: 用户已确认

现在，请开始与用户对话，主动询问品牌信息和营销目标。`,
    workflow: [
        {
            phase: "info_gathering",
            name: "信息收集",
            questions: [
                "品牌名称和所属行业是？",
                "本次营销的核心目标是什么？（新品上市/大促/品牌升级/节日营销）",
                "预算范围和时间周期是？",
                "核心 KPI 是什么？（曝光/转化/心智占领）"
            ]
        },
        {
            phase: "analysis",
            name: "分析阶段",
            modules: ["行业分析", "竞品分析", "人群分析", "行为洞察"]
        },
        {
            phase: "creative",
            name: "创意阶段",
            modules: ["BIG IDEA", "营销事件", "执行细节"]
        },
        {
            phase: "execution",
            name: "传播规划",
            modules: ["传播话题", "物料创意", "时间规划", "预算分配"]
        }
    ]
});

// 预设角色库
export const DEFAULT_ROLES = [
    ECD_ROLE,
    createRole({
        id: "strategist",
        name: "战略顾问",
        domain: "商业战略/企业咨询",
        targetAudience: "CEO/董事会",
        icon: "📊",
        isDefault: true,
        systemPrompt: `你是一位资深战略顾问，拥有麦肯锡/BCG 15 年咨询经验。你正在为 CEO 撰写战略分析报告。

## 工作方式
1. 结构化思维，金字塔原理
2. 数据驱动，逻辑严密
3. 战略高度，全局视角
4. 可执行性，落地务实

## 分析框架
1. 宏观环境分析 (PESTEL)
2. 行业分析 (Porter's Five Forces)
3. 竞争格局分析
4. 企业能力评估 (SWOT)
5. 战略选项与建议
6. 实施路径与里程碑

每完成一个模块，询问用户确认后再继续。`,
        workflow: [
            { phase: "context", name: "背景调研", modules: ["行业背景", "企业现状"] },
            { phase: "analysis", name: "战略分析", modules: ["宏观环境", "行业格局", "竞争分析", "能力评估"] },
            { phase: "strategy", name: "战略建议", modules: ["战略选项", "推荐方案", "实施路径"] }
        ]
    }),
    createRole({
        id: "director",
        name: "创意导演",
        domain: "影视/短视频/内容创作",
        targetAudience: "制片人/品牌方",
        icon: "🎬",
        isDefault: true,
        systemPrompt: `你是一位资深创意导演，拥有 15 年影视广告制作经验，曾获戛纳/D&AD 等国际大奖。你正在为制片人撰写创意方案。

## 工作方式
1. 视觉思维，画面感强
2. 故事驱动，情感共鸣
3. 制作可行，预算意识
4. 细节把控，品质追求

## 创意框架
1. 核心洞察 (Insight)
2. 创意概念 (Concept)
3. 故事大纲 (Story)
4. 视觉风格 (Visual Style)
5. 分镜脚本 (Storyboard)
6. 制作预算 (Budget)

每完成一个模块，询问用户确认后再继续。`,
        workflow: [
            { phase: "brief", name: "需求理解", modules: ["项目背景", "核心诉求"] },
            { phase: "creative", name: "创意开发", modules: ["核心洞察", "创意概念", "故事大纲"] },
            { phase: "production", name: "制作方案", modules: ["视觉风格", "分镜脚本", "制作预算"] }
        ]
    }),
    createRole({
        id: "pm",
        name: "产品经理",
        domain: "互联网产品/用户增长",
        targetAudience: "CEO/投资人",
        icon: "💼",
        isDefault: true,
        systemPrompt: `你是一位资深产品经理，拥有 10 年互联网大厂经验，曾主导过多个千万级用户产品。你正在为 CEO 或投资人撰写产品方案。

## 工作方式
1. 用户导向，需求本质
2. 数据驱动，AB 测试
3. MVP 思维，快速迭代
4. 商业闭环，增长飞轮

## 产品框架
1. 需求分析：用户痛点、使用场景
2. 竞品分析：功能对比、差异化定位
3. 产品方案：核心功能、用户路径
4. 商业模式：变现方式、收入预测
5. 执行计划：里程碑、资源需求

每完成一个模块，询问用户确认后再继续。`,
        workflow: [
            { phase: "research", name: "需求研究", modules: ["用户痛点", "使用场景", "竞品分析"] },
            { phase: "design", name: "产品设计", modules: ["核心功能", "用户路径", "MVP 定义"] },
            { phase: "business", name: "商业规划", modules: ["商业模式", "增长策略", "执行计划"] }
        ]
    })
];

// 存储 Key
const STORAGE_KEY = "ppt_write_roles";
const ACTIVE_ROLE_KEY = "ppt_write_active_role";

// 获取所有角色（包括预设和自定义）
export function getAllRoles() {
    if (typeof window === "undefined") return DEFAULT_ROLES;

    try {
        const customRoles = localStorage.getItem(STORAGE_KEY);
        if (customRoles) {
            const parsed = JSON.parse(customRoles);
            // 合并预设角色和自定义角色，预设在前
            return [...DEFAULT_ROLES, ...parsed.filter(r => !r.isDefault)];
        }
    } catch (e) {
        console.error("获取角色失败:", e);
    }

    return DEFAULT_ROLES;
}

// 获取当前激活的角色
export function getActiveRole() {
    if (typeof window === "undefined") return ECD_ROLE;

    try {
        const activeId = localStorage.getItem(ACTIVE_ROLE_KEY);
        if (activeId) {
            const allRoles = getAllRoles();
            const found = allRoles.find(r => r.id === activeId);
            if (found) return found;
        }
    } catch (e) {
        console.error("获取激活角色失败:", e);
    }

    return ECD_ROLE;
}

// 设置激活的角色
export function setActiveRole(roleId) {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACTIVE_ROLE_KEY, roleId);
}

// 保存自定义角色
export function saveCustomRole(role) {
    if (typeof window === "undefined") return;

    try {
        const customRoles = localStorage.getItem(STORAGE_KEY);
        let roles = customRoles ? JSON.parse(customRoles) : [];

        // 检查是否已存在
        const existingIndex = roles.findIndex(r => r.id === role.id);
        if (existingIndex >= 0) {
            roles[existingIndex] = { ...role, updatedAt: new Date().toISOString() };
        } else {
            roles.push(role);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
        return true;
    } catch (e) {
        console.error("保存角色失败:", e);
        return false;
    }
}

// 删除自定义角色
export function deleteCustomRole(roleId) {
    if (typeof window === "undefined") return false;

    try {
        const customRoles = localStorage.getItem(STORAGE_KEY);
        if (!customRoles) return false;

        let roles = JSON.parse(customRoles);
        roles = roles.filter(r => r.id !== roleId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));

        // 如果删除的是当前激活的角色，切换到 ECD
        const activeId = localStorage.getItem(ACTIVE_ROLE_KEY);
        if (activeId === roleId) {
            setActiveRole("ecd");
        }

        return true;
    } catch (e) {
        console.error("删除角色失败:", e);
        return false;
    }
}

// 获取角色的 System Prompt
export function getRoleSystemPrompt(roleId) {
    const allRoles = getAllRoles();
    const role = allRoles.find(r => r.id === roleId);
    return role?.systemPrompt || ECD_ROLE.systemPrompt;
}

// 导出所有自定义角色（用于备份）
export function exportCustomRoles() {
    if (typeof window === "undefined") return null;

    try {
        const customRoles = localStorage.getItem(STORAGE_KEY);
        if (!customRoles) return [];

        const roles = JSON.parse(customRoles);
        return {
            version: "1.0",
            exportedAt: new Date().toISOString(),
            roles: roles
        };
    } catch (e) {
        console.error("导出角色失败:", e);
        return null;
    }
}

// 导入角色（从备份恢复）
export function importRoles(data) {
    if (typeof window === "undefined") return { success: false, error: "不支持的环境" };

    try {
        if (!data || !data.roles || !Array.isArray(data.roles)) {
            return { success: false, error: "无效的导入数据格式" };
        }

        const customRoles = localStorage.getItem(STORAGE_KEY);
        let existingRoles = customRoles ? JSON.parse(customRoles) : [];

        let imported = 0;
        let skipped = 0;

        data.roles.forEach(role => {
            // 跳过预设角色
            if (role.isDefault) {
                skipped++;
                return;
            }

            // 检查是否已存在
            const existingIndex = existingRoles.findIndex(r => r.id === role.id);
            if (existingIndex >= 0) {
                // 更新已存在的角色
                existingRoles[existingIndex] = {
                    ...role,
                    updatedAt: new Date().toISOString()
                };
            } else {
                // 添加新角色
                existingRoles.push({
                    ...role,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
            imported++;
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(existingRoles));

        return {
            success: true,
            imported,
            skipped,
            message: `成功导入 ${imported} 个角色${skipped > 0 ? `，跳过 ${skipped} 个预设角色` : ""}`
        };
    } catch (e) {
        console.error("导入角色失败:", e);
        return { success: false, error: e.message };
    }
}

// 清空所有自定义角色
export function clearCustomRoles() {
    if (typeof window === "undefined") return false;

    try {
        localStorage.removeItem(STORAGE_KEY);
        setActiveRole("ecd");
        return true;
    } catch (e) {
        console.error("清空角色失败:", e);
        return false;
    }
}
