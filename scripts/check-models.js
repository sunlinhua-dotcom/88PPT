const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Manually read .env.local
try {
    const envConfig = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.error("Could not read .env.local", e);
}

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API KEY found in .env.local");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        console.log("Fetching available models...");
        // Check both v1beta and potentially alpha if possible, but standard SDK usually defaults to a version.
        // We will list what's available.
        // Note: The SDK method might just return what's available for the configured API version.

        // There isn't a direct listModels on genAI instance in some SDK versions, 
        // but usually it is available via the ModelManager or similar.
        // Let's try to access it if exposed, otherwise we might need a direct fetch.
        // Actually, checking the google-generative-ai package, it might not expose listModels easily in the high level client instantly.
        // Let's try a direct fetch to the endpoint which is more reliable for raw listing.

        // Falling back to raw fetch for certainty
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                console.log(`- ${m.name} (${m.displayName}) [Supported methods: ${m.supportedGenerationMethods?.join(', ')}]`);
            });
        } else {
            console.error("No models found or error:", data);
        }

    } catch (error) {
        console.error("Error fetching models:", error);
    }
}

listModels();
