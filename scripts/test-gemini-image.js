// Native fetch is available in Node 18+

// Load env vars
const API_KEY = 'sk-g8JehwXjfoWKeHxvDdAe2277FeA24c0094B7E6Fe5566346b';
const BASE_URL = 'https://api.apiyi.com/v1beta';
const MODEL = 'gemini-3-pro-image-preview';

async function testGenerate() {
    console.log('Testing Gemini Image Generation...');
    console.log(`Endpoint: ${BASE_URL}/models/${MODEL}:generateContent`);

    try {
        const response = await fetch(`${BASE_URL}/models/${MODEL}:generateContent`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: "Generate a simple red square image, 100x100 pixels." }
                    ]
                }],
                generationConfig: {
                    responseModalities: ["IMAGE"],
                    imageConfig: {
                        aspectRatio: "1:1",
                        imageSize: "1K"
                    }
                }
            })
        });

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Response body:', text);
            return;
        }

        const data = await response.json();
        console.log('--- API Response ---');
        console.log(JSON.stringify(data, null, 2));
        console.log('--------------------');

        if (data.candidates && data.candidates[0]?.content?.parts) {
            console.log('✅ Image data found in response.');
        } else {
            console.error('❌ No image data found in response.');
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testGenerate();
