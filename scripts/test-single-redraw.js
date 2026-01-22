// scripts/test-single-redraw.js
const { generateMasterDesign } = require('../src/lib/gemini-client');

// Mock environment variables since we are running locally with node
// BUT we can't easily mock process.env for imported modules if they use it at module level.
// However, gemini-client.js reads env vars inside the function, which is good.

// Set env vars for this process
process.env.GEMINI_API_KEY = 'sk-g8JehwXjfoWKeHxvDdAe2277FeA24c0094B7E6Fe5566346b';
process.env.GEMINI_BASE_URL = 'https://api.apiyi.com/v1beta';

// Mock fetch if needed (Node 18+ has native fetch)
// But wait, the module imports GoogleGenerativeAI? 
// My implementation of generateMasterDesign uses fetch directly now?
// Let's verify gemini-client.js imports. It might have `import ...`. Node cannot run ES modules directly without "type": "module" in package.json or .mjs extension.
// It's safer to use the API testing approach with curl or a standalone script that doesn't import app code, 
// OR rename this to .mjs and hoping imports work.

// Let's create a standalone script that mimics the API call structure exactly.

const API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = process.env.GEMINI_BASE_URL;
const MODEL = 'gemini-3-pro-image-preview';

async function testSingleRedraw() {
    console.log("Testing Single Redraw with Additional Instructions...");

    // Simulate what generateMasterDesign does
    const additionalInstructions = "Make it minimalistic and blue.";
    const brandInfo = { tonality: "Modern", colorPalette: ["#000"] };
    const spec = { w: 1920, h: 1080, orient: "LANDSCAPE", apiRatio: "16:9" };

    // Construct prompt manually to verify logic (or copy logic)
    // Actually, asking the server via fetch is better if the server is running.
    // User is running server at localhost:3005.

    try {
        const response = await fetch("http://localhost:3005/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pageImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", // 1x1 pixel
                pageContent: "Test content",
                brandInfo: brandInfo,
                pageNumber: 1,
                aspectRatio: "16:9",
                additionalInstructions: additionalInstructions
            })
        });

        const data = await response.json();
        console.log("Status:", response.status);
        if (data.success) {
            console.log("✅ Success! Generated Image received.");
        } else {
            console.error("❌ Failed:", data.error);
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

testSingleRedraw();
