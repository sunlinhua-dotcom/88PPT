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
 * 大师级 PPT 图像融合提示词模板 (Image Fusion)
 */
const MASTER_DESIGN_PROMPT = `
You are NANO BANANA PRO, the world's most prestigious editorial art director.
Your mission is to FUSE the input image with magazine-quality design — NOT to completely redesign it.

### 🎯 CRITICAL INSTRUCTION: IMAGE FUSION (NOT REPLACEMENT)
- **PRESERVE CORE CONTENT**: Keep ALL text, data, charts, and key visual elements from the input image.
- **UPGRADE VISUALS**: Enhance typography, layout, colors, and add contextual imagery.
- **FUSION STRATEGY**: Think of it as "applying a premium design filter" rather than "starting from scratch".

### 📐 ASPECT RATIO & LAYOUT ADAPTATION
- **TARGET OUTPUT**: {resolutionInstruction} (STRICT ENFORCEMENT)
- **ACTION**: Adapt the layout to fit the target ratio while PRESERVING content hierarchy.
- **INTELLIGENT REFLOW**: If input is 16:9 and target is 3:4, intelligently reflow content for vertical orientation.
- **FORBIDDEN**: Do NOT crop out important content or change aspect ratio arbitrarily.

### 🎨 DESIGN STANDARDS (MAGAZINE LEVEL):
1.  **Visual Fusion Strategy**:
    -   **RETAIN**: Text (100% accuracy), data visualizations, key graphics
    -   **ENHANCE**: Typography (font pairing, hierarchy), colors (brand-aligned palette)
    -   **ADD**: Contextual imagery, decorative elements, background enhancements
    -   **TRANSFORM**: Layout from "PowerPoint-basic" to "Editorial-premium"

2.  **Layout & Composition**:
    -   Apply **Swiss Grid Systems** and **Asymmetric Balance**
    -   Use **Negative Space** strategically for visual breathing room
    -   Think "Vogue editorial" or "Apple keynote" level quality

3.  **Typography & Content Accuracy**:
    -   **CRITICAL**: Text must be PIXEL-PERFECT from the input image
    -   **NO HALLUCINATIONS**: Do not invent or modify text content
    -   **LEGIBILITY**: Use premium fonts with excellent readability
    -   **HIERARCHY**: Clear visual distinction between headings, body, and captions

4.  **Contextual Imagery (ADDITIVE)**:
    -   **ADD NEW IMAGES**: Generate high-quality photos/illustrations that complement the content
    -   **CONTEXTUAL**: Images must relate directly to the slide's topic
    -   **PLACEMENT**: Integrate seamlessly without obscuring original content

5.  **Brand Alignment**:
    -   **Tonality**: {brandTonality}
    -   **Color Palette**: {brandColors}
    -   **Consistency**: Maintain brand identity across all visual elements

### 📊 INPUT DATA:
-   **Original Image**: Use as the primary reference (preserve its content)
-   **Text Content**: "{pageContent}"
-   **Brand Guidelines**: {brandTonality}

### ✅ FUSION SUCCESS CRITERIA:
1. ✓ All text from input image appears in output (100% retention)
2. ✓ Data charts/graphs maintain accuracy
3. ✓ Visual quality elevated to magazine/editorial standards
4. ✓ Brand colors and tonality applied consistently
5. ✓ Aspect ratio matches target specification exactly

### 🖼️ OUTPUT:
A single flattened JPEG image that:
- **LOOKS**: Magazine-quality, visually stunning
- **CONTAINS**: 100% of original content, enhanced with premium design
- **FOLLOWS**: Target aspect ratio ({resolutionInstruction})
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
// Helper to resize/pad image to target aspect ratio using Canvas (Client-side only)
async function enforceAspectRatio(base64Str, targetRatio) {
  if (typeof window === 'undefined') return base64Str; // Skip if server-side

  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str.startsWith('data:') ? base64Str : `data:image/png;base64,${base64Str}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Determine target geometry
      let targetWidth, targetHeight;
      // Base dimension 1920px for high quality
      if (targetRatio === '9:16') { targetWidth = 1080; targetHeight = 1920; }
      else if (targetRatio === '3:4') { targetWidth = 1080; targetHeight = 1440; }
      else if (targetRatio === '4:3') { targetWidth = 1440; targetHeight = 1080; }
      else { targetWidth = 1920; targetHeight = 1080; } // 16:9 default

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Fill background (Black or Brand Color? White/Black usually safe)
      // Using dark dark grey to match "Vogue" style or just Black.
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Draw original image centered and "letterboxed" (contain)
      const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
      const drawInfo = {
        w: img.width * scale,
        h: img.height * scale,
        x: (targetWidth - (img.width * scale)) / 2,
        y: (targetHeight - (img.height * scale)) / 2
      };

      ctx.drawImage(img, drawInfo.x, drawInfo.y, drawInfo.w, drawInfo.h);

      // Return new base64
      resolve(canvas.toDataURL('image/jpeg', 0.95)); // Use JPEG for efficiency
    };
    img.onerror = () => resolve(base64Str); // Fallback on error
  });
}

/**
 * 生成重绘后的 PPT 页面图像
 * 使用 apiyi.com API 直接调用
 */
export async function generateMasterDesign({
  pageImageBase64,
  pageContent,
  brandInfo,
  pageNumber,
  aspectRatio = "16:9",
  additionalInstructions = "",
}) {
  // 获取 API 配置
  const API_KEY = process.env.GEMINI_API_KEY;
  const BASE_URL = process.env.GEMINI_BASE_URL || 'https://api.apiyi.com/v1beta';
  const MODEL = 'gemini-3-pro-image-preview';

  if (!API_KEY) {
    throw new Error("请先在 .env.local 文件中配置有效的 GEMINI_API_KEY");
  }

  try {
    // Define Aspect Ratio Instructions with EXPLICIT dimensions
    const ratioInstructions = {
      "16:9": { w: 1920, h: 1080, orient: "LANDSCAPE", desc: "wider than tall", apiRatio: "16:9" },
      "4:3": { w: 1440, h: 1080, orient: "LANDSCAPE", desc: "wider than tall", apiRatio: "4:3" },
      "9:16": { w: 1080, h: 1920, orient: "PORTRAIT", desc: "taller than wide", apiRatio: "9:16" },
      "3:4": { w: 1080, h: 1440, orient: "PORTRAIT", desc: "taller than wide", apiRatio: "3:4" },
      "1:1": { w: 1080, h: 1080, orient: "SQUARE", desc: "equal width and height", apiRatio: "1:1" }
    };
    const spec = ratioInstructions[aspectRatio] || ratioInstructions["16:9"];

    // EXTREMELY STRICT PROMPT
    const strictInstruction = `
#####################################################################
# MANDATORY OUTPUT SPECIFICATION
#####################################################################
OUTPUT: ${spec.w}x${spec.h} pixels (${spec.orient})
ASPECT RATIO: ${aspectRatio}

⚠️ OUTPUT MUST BE ${spec.w} pixels wide and ${spec.h} pixels tall.
⚠️ OUTPUT MUST BE ${spec.orient} orientation (${spec.desc}).
⚠️ DO NOT output a square image unless specified.
⚠️ IGNORE the input image dimensions - it is only for content reference.
⚠️ Redesign the content to fit ${aspectRatio} format.
#####################################################################
    `.trim();

    // 构建提示词
    let prompt = strictInstruction + "\n\n" + MASTER_DESIGN_PROMPT
      .replace("{brandTonality}", brandInfo.tonality || "Professional, Modern, Premium")
      .replace("{brandColors}", JSON.stringify(brandInfo.colorPalette || ["#FFFFFF", "#000000"]))
      .replace("{pageContent}", pageContent || "(Extract from image)")
      .replace("{resolutionInstruction}", `${spec.w}x${spec.h} pixels (${spec.orient})`)
      .replace("1920x1080", `${spec.w}x${spec.h}`);

    // Add custom style profile instructions if provided
    if (brandInfo.isCustomStyle && brandInfo.styleProfile) {
      const sp = brandInfo.styleProfile;
      prompt += `

### 🎨 CUSTOM STYLE REFERENCE (MUST FOLLOW EXACTLY):
- **Layout Style**: ${sp.layoutStyle || "Modern"}
- **Fixed Header**: ${sp.fixedElements?.header || "None"}
- **Fixed Footer**: ${sp.fixedElements?.footer || "None"}
- **Design Keywords**: ${sp.keywords?.join(", ") || "Professional"}
- **Color Palette**: ${sp.colors?.join(", ") || "Monochrome"}

⚠️ IMPORTANT: Maintain the EXACT visual style from the reference.
⚠️ If there's a header/footer pattern, REPLICATE it in the output.
⚠️ Use the SAME color palette and layout structure.
`;
    }

    // Add user's additional instructions if provided
    if (additionalInstructions && additionalInstructions.trim()) {
      prompt += `

### 🎯 USER'S ADDITIONAL INSTRUCTIONS (MUST FOLLOW):
${additionalInstructions}

⚠️ PRIORITIZE the above user instructions when redesigning.
`;
    }

    // 准备请求内容
    const parts = [{ text: prompt }];

    // 添加页面图像
    if (pageImageBase64) {
      const base64Data = pageImageBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inline_data: {
          mime_type: "image/png",
          data: base64Data
        }
      });
    }

    // 如果有品牌 Logo，也添加进去
    if (brandInfo.logoBase64) {
      const logoBase64Data = brandInfo.logoBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inline_data: {
          mime_type: "image/png",
          data: logoBase64Data
        }
      });
    }

    // 调用 API
    const response = await fetch(`${BASE_URL}/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: parts
        }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: spec.apiRatio,
            imageSize: "1K"
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 请求失败 [${response.status}]: ${errorText}`);
    }

    const data = await response.json();

    // 提取生成的图像
    if (data.candidates && data.candidates[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inline_data) {
          const mimeType = part.inline_data.mime_type || part.inline_data.mimeType || 'image/png';
          return `data:${mimeType};base64,${part.inline_data.data}`;
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
  const API_KEY = process.env.GEMINI_ANALYSIS_API_KEY || process.env.GEMINI_API_KEY;
  const BASE_URL = process.env.GEMINI_BASE_URL || 'https://api.apiyi.com/v1beta';
  const MODEL = 'gemini-3-pro-image-preview';

  if (!API_KEY) {
    return "";
  }

  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await fetch(`${BASE_URL}/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "请详细描述这张 PPT 页面的所有内容，包括：标题、正文文字、图表数据、图片描述等。用中文回复。" },
            {
              inline_data: {
                mime_type: "image/png",
                data: base64Data
              }
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
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
    const API_KEY = process.env.GEMINI_ANALYSIS_API_KEY || process.env.GEMINI_API_KEY;
    const BASE_URL = process.env.GEMINI_BASE_URL || 'https://api.apiyi.com/v1beta';
    const MODEL = 'gemini-3-pro-image-preview';

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

    const response = await fetch(`${BASE_URL}/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

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
