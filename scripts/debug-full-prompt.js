// scripts/debug-full-prompt.js
// Run with: node scripts/debug-full-prompt.js

const API_KEY = 'sk-g8JehwXjfoWKeHxvDdAe2277FeA24c0094B7E6Fe5566346b';
const BASE_URL = 'https://api.apiyi.com/v1beta';
const MODEL = 'gemini-3-pro-image-preview';

/**
 * 模拟完整的 Prompt 和调用逻辑
 */
async function test() {
    const aspectRatio = "16:9";
    const spec = { w: 1920, h: 1080, orient: "LANDSCAPE", desc: "wider than tall", apiRatio: "16:9" };

    const strictInstruction = `
#####################################################################
# MANDATORY OUTPUT SPECIFICATION
#####################################################################
OUTPUT: ${spec.w}x${spec.h} pixels (${spec.orient})
ASPECT RATIO: ${aspectRatio}

⚠️ OUTPUT MUST BE ${spec.w} pixels wide and ${spec.h} pixels tall.
⚠️ OUTPUT MUST BE ${spec.orient} orientation (${spec.desc}).
⚠️ DO NOT simply preserve the original aspect ratio or layout if it doesn't fit the target.
#####################################################################
`.trim();

    const brandInfo = {
        tonality: "Professional, Modern, Tech",
        colorPalette: ["#000000", "#FFFFFF", "#007BFF"]
    };

    const MASTER_DESIGN_PROMPT = `
You are NANO BANANA PRO, the world's most prestigious editorial art director.
Your goal is to REDESIGN this slide into a magazine-quality masterpiece.

### 🎯 CRITICAL INSTRUCTION: REDESIGN & TRANSFORMATION
- **TRANSFORM**: Completely restructure the layout. Do not feel bound by the original composition.
- **ASPECT RATIO**: ${spec.w}x${spec.h} pixels (${spec.orient}) (STRICT ENFORCEMENT)
- **ACTION**: You MUST CROP, RESIZE, and RE-COMPOSE the layout to fit the target ratio exactly.
- **FORBIDDEN**: Do NOT simply preserve the original aspect ratio or layout if it doesn't fit the target.

### 🎨 DESIGN STANDARDS (MAGAZINE LEVEL):
1.  **Layout & Composition**:
    -   Surpass PowerPoint. Think "Vogue", "Monocle" or "Apple Keynote".
    -   Use **Swiss Grid Systems** and **Asymmetric Balance**.
    -   Embrace **Negative Space** for a premium feel.

2.  **Contextual Imagery (MANDATORY)**:
    -   **ADD NEW IMAGES**: Generate high-quality photos/illustrations that relate to the content.
    -   **You are an illustrator**: Do not just arrange text. Create visual impact.
    -   **Visuals over Text**: Prioritize visual storytelling over dense text blocks.

3.  **Typography & Content**:
    -   **LEGIBILITY**: Text must be crisp and readable.
    -   **NO HALLUCINATIONS**: Copy text exactly from input.
    -   **Hierarchy**: Create specific contrast between headlines and body text.

4.  **Brand Alignment**:
    -   Tonality: ${brandInfo.tonality}
    -   Colors: ${JSON.stringify(brandInfo.colorPalette)}

### 📊 INPUT DATA:
-   **Text Content**: "Hello World Test Slide"
-   **Brand Guidelines**: ${brandInfo.tonality}

### 🖼️ OUTPUT:
A single flattened JPEG. **STRICTLY FOLLOW THE TARGET ASPECT RATIO.**
`;

    const prompt = strictInstruction + "\n\n" + MASTER_DESIGN_PROMPT;

    console.log("SENDING REQUEST...");

    try {
        const response = await fetch(`${BASE_URL}/models/${MODEL}:generateContent`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
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
            console.log("HTTP ERROR:", response.status);
            console.log(await response.text());
            return;
        }

        const data = await response.json();
        console.log("--- RESPONSE START ---");
        console.log(JSON.stringify(data, null, 2));
        console.log("--- RESPONSE END ---");

    } catch (e) {
        console.error("FATAL ERROR:", e);
    }
}

test();
