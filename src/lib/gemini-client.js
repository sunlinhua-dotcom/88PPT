/**
 * Gemini API 客户端 - NANO BANANA PRO 图像生成
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// 检查 API 密钥是否有效
const API_KEY = process.env.GEMINI_API_KEY;
const isValidApiKey = API_KEY && API_KEY !== "your_gemini_api_key_here";

// 初始化 Gemini 客户端（仅在有效密钥时）
const genAI = isValidApiKey ? new GoogleGenerativeAI(API_KEY) : null;

/**
 * 大师级 PPT 重绘提示词模板
 */
const MASTER_DESIGN_PROMPT = `
You are NANO BANANA PRO, the world's most prestigious editorial art director.
Your goal is to redesign this slide into a magazine-quality masterpiece.

### CRITICAL INSTRUCTION: ASPECT RATIO & REFORMATTING
- **TARGET OUTPUT**: {resolutionInstruction} (STRICT ENFORCEMENT)
- **ACTION**: You MUST CROP, RESIZE, and RE-COMPOSE the layout to fit the target ratio exactly.
- **FORBIDDEN**: Do NOT simply preserve the original aspect ratio. If the input is 16:9 and target is 3:4, you must totally restructure the layout for vertical alignment.

### DESIGN STANDARDS (MAGAZINE LEVEL):
1.  **Layout & Composition**:
    -   Surpass PowerPoint. Think "Vogue" or "Monocle".
    -   Use **Swiss Grid Systems** and **Asymmetric Balance**.
    -   Embrace **Negative Space**.

2.  **Contextual Imagery (MANDATORY)**:
    -   **ADD NEW IMAGES**: Generate high-quality photos/illustrations that relate to the content.
    -   **You are an illustrator**: Do not just arrange text. Create visual impact.

3.  **Typography & Content**:
    -   **LEGIBILITY**: Text must be crisp and readable.
    -   **NO HALLUCINATIONS**: Copy text exactly from input.

4.  **Brand Alignment**:
    -   Tonality: {brandTonality}
    -   Colors: {brandColors}

### INPUT DATA:
-   **Text**: "{pageContent}"
-   **Brand**: {brandTonality}

### OUTPUT:
A single flattened JPEG. **STRICTLY FOLLOW THE TARGET ASPECT RATIO.**
`;

/**
 * 生成重绘后的 PPT 页面图像
 * @param {Object} options - 生成选项
 * @param {string} options.pageImageBase64 - 原始页面图像的 base64
 * @param {string} options.pageContent - 页面文本内容
 * @param {Object} options.brandInfo - 品牌信息
 * @param {number} options.pageNumber - 页码
 * @returns {Promise<string>} - 生成的图像 base64
 */
export async function generateMasterDesign({
  pageImageBase64,
  pageContent,
  brandInfo,
  pageNumber,
  aspectRatio = "16:9",
}) {
  // 检查 API 密钥
  if (!genAI) {
    throw new Error("请先在 .env.local 文件中配置有效的 GEMINI_API_KEY");
  }

  try {
    // Base URL configuration for proxy support
    const rawBaseUrl = process.env.GEMINI_BASE_URL;
    const baseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/v1\/?$/, "") : undefined;
    const requestOptions = baseUrl ? { baseUrl } : {};

    // 使用 Gemini 2.0 Flash 模型（支持图像生成）or Custom Model
    const model = genAI.getGenerativeModel({
      model: "gemini-3-pro-image-preview",
      generationConfig: {
        responseModalities: ["image", "text"],
      },
    }, requestOptions);

    // Define Aspect Ratio Instructions
    const ratioInstructions = {
      "16:9": "1920x1080 (Landscape Wide)",
      "4:3": "1440x1080 (Landscape Standard)",
      "9:16": "1080x1920 (Portrait/Mobile)",
      "3:4": "1080x1440 (Portrait Document)"
    };
    const resolutionInstruction = ratioInstructions[aspectRatio] || "1920x1080";

    // ULTRA-STRICT PROMPT CONSTRUCTION (PREPENDING INSTRUCTION)
    // Multimodal models often biases towards the input image aspect ratio.
    // We must forcefully override this BEFORE the image is seen in the context logic.
    const strictInstruction = `
### ⚠️ CRITICAL OVERRIDE: TARGET FORMAT ${aspectRatio} ⚠️
- **IGNORE INPUT IMAGE RATIO**. The input image is just for content reference.
- **OUTPUT MUST BE**: ${aspectRatio} (${resolutionInstruction}).
- **FORCE VERTICAL/PORTRAIT** if selecting 9:16 or 3:4.
- **FORCE HORIZONTAL/LANDSCAPE** if selecting 16:9 or 4:3.
- Do NOT output a square image.
    `.trim();

    // 构建提示词
    let prompt = strictInstruction + "\n\n" + MASTER_DESIGN_PROMPT
      .replace("{brandTonality}", brandInfo.tonality || "Professional, Modern, Premium")
      .replace("{brandColors}", JSON.stringify(brandInfo.colorPalette || ["#FFFFFF", "#000000"]))
      .replace("{pageContent}", pageContent || "(Extract from image)")
      .replace("1920x1080", resolutionInstruction); // Dynamic Resolution

    // 准备图像数据
    const imageParts = [];

    if (pageImageBase64) {
      // 移除 data URL 前缀
      const base64Data = pageImageBase64.replace(/^data:image\/\w+;base64,/, "");
      imageParts.push({
        inlineData: {
          data: base64Data,
          mimeType: "image/png",
        },
      });
    }

    // 如果有品牌 Logo，也添加进去
    if (brandInfo.logoBase64) {
      const logoBase64Data = brandInfo.logoBase64.replace(/^data:image\/\w+;base64,/, "");
      imageParts.push({
        inlineData: {
          data: logoBase64Data,
          mimeType: "image/png",
        },
      });
    }

    // 调用 Gemini API
    const result = await model.generateContent([
      prompt,
      ...imageParts,
    ]);

    const response = await result.response;

    // 提取生成的图像
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType}; base64, ${part.inlineData.data} `;
        }
      }
    }

    throw new Error("未能生成图像，API 响应中没有图像数据");
  } catch (error) {
    console.error(`页面 ${pageNumber} 生成失败: `, error);
    throw error;
  }
}

/**
 * 使用 AI 分析图像内容
 * @param {string} imageBase64 - 图像 base64
 * @returns {Promise<string>} - 图像内容描述
 */
export async function analyzeImageContent(imageBase64) {
  if (!genAI) {
    return "";
  }

  try {
    const requestOptions = process.env.GEMINI_BASE_URL ? { baseUrl: process.env.GEMINI_BASE_URL } : {};
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" }, requestOptions);

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const result = await model.generateContent([
      "请详细描述这张 PPT 页面的所有内容，包括：标题、正文文字、图表数据、图片描述等。用中文回复。",
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/png",
        },
      },
    ]);

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("图像分析失败:", error);
    return "";
  }
}

/**
 * 获取品牌调性描述
 * @param {string} brandName - 品牌名称
 * @returns {Promise<Object>} - 品牌信息
 */
export async function analyzeBrandTonality(brandName) {
  // 默认品牌信息
  const defaultBrandInfo = {
    name: brandName,
    tonality: "专业、现代、值得信赖",
    colorPalette: ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
    styleKeywords: ["简约", "专业", "现代"],
    designDescription: "现代化的商务风格设计",
  };

  if (!genAI) {
    console.warn("API 密钥未配置，使用默认品牌信息");
    return defaultBrandInfo;
  }

  try {
    // Base URL configuration - Strip trailing /v1 causing double versioning error
    const rawBaseUrl = process.env.GEMINI_BASE_URL;
    const baseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/v1\/?$/, "") : undefined;
    const requestOptions = baseUrl ? { baseUrl } : {};

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" }, requestOptions);

    const prompt = `作为一位品牌策略专家，请分析品牌 "${brandName}" 的视觉调性和设计风格。

请用 JSON 格式回复，包含以下字段：
{
  "name": "品牌名称",
    "tonality": "品牌调性描述（50-100字）",
      "colorPalette": ["#主色1", "#主色2", "#辅助色1", "#辅助色2"],
        "styleKeywords": ["关键词1", "关键词2", "关键词3"],
          "designDescription": "设计风格详细描述（100-200字）"
}

只返回 JSON，不要其他内容。`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 解析 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return defaultBrandInfo;
  } catch (error) {
    console.error("品牌分析失败:", error);
    return defaultBrandInfo;
  }
}

/**
 * 检查 API 是否可用
 */
export function isApiAvailable() {
  return isValidApiKey;
}
