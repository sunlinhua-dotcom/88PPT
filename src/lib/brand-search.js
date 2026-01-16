/**
 * 品牌信息搜索模块
 * 通过网络搜索获取品牌调性和 Logo
 */

/**
 * 搜索品牌 Logo
 * 使用 Clearbit Logo API 或 Google 搜索
 * @param {string} brandName - 品牌名称
 * @returns {Promise<string|null>} - Logo URL
 */
export async function searchBrandLogo(brandName) {
    try {
        // 首先尝试 Clearbit Logo API（免费）
        const clearbitUrl = `https://logo.clearbit.com/${encodeURIComponent(brandName.toLowerCase().replace(/\s+/g, ""))}.com`;

        // 尝试验证 Logo 是否存在
        const response = await fetch(clearbitUrl, { method: "HEAD" });
        if (response.ok) {
            return clearbitUrl;
        }

        // 尝试常见域名后缀
        const domains = [".cn", ".io", ".co", ".net", ".org"];
        for (const domain of domains) {
            const altUrl = `https://logo.clearbit.com/${encodeURIComponent(brandName.toLowerCase().replace(/\s+/g, ""))}${domain}`;
            const altResponse = await fetch(altUrl, { method: "HEAD" });
            if (altResponse.ok) {
                return altUrl;
            }
        }

        return null;
    } catch (error) {
        console.error("Logo 搜索失败:", error);
        return null;
    }
}

/**
 * 获取 Logo 的 base64 编码
 * @param {string} logoUrl - Logo URL
 * @returns {Promise<string|null>} - Logo base64
 */
export async function fetchLogoAsBase64(logoUrl) {
    try {
        const response = await fetch(logoUrl);
        if (!response.ok) return null;

        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Logo 下载失败:", error);
        return null;
    }
}

/**
 * 搜索品牌信息（通过 SerpAPI 或其他搜索服务）
 * @param {string} brandName - 品牌名称
 * @returns {Promise<Object>} - 品牌信息
 */
export async function searchBrandInfo(brandName) {
    // 由于 SerpAPI 需要付费，这里使用 AI 分析作为主要方式
    // 如果用户配置了 SerpAPI，则可以使用真实搜索

    const serpApiKey = process.env.SERP_API_KEY;

    if (serpApiKey && serpApiKey !== "your_serp_api_key_here") {
        try {
            const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(brandName + " brand style design")}&api_key=${serpApiKey}`;
            const response = await fetch(searchUrl);
            const data = await response.json();

            // 提取搜索结果中的品牌描述
            const snippets = data.organic_results?.slice(0, 3).map(r => r.snippet).join(" ") || "";

            return {
                success: true,
                source: "search",
                description: snippets,
            };
        } catch (error) {
            console.error("SerpAPI 搜索失败:", error);
        }
    }

    // 返回空结果，使用 AI 分析作为后备
    return {
        success: false,
        source: "none",
        description: "",
    };
}

/**
 * 组合获取完整的品牌信息
 * @param {string} brandName - 品牌名称
 * @param {Function} aiAnalyzer - AI 分析函数
 * @returns {Promise<Object>} - 完整品牌信息
 */
export async function getBrandInfo(brandName, aiAnalyzer) {
    // 并行获取 Logo 和搜索信息
    const [logoUrl, searchResult, aiAnalysis] = await Promise.all([
        searchBrandLogo(brandName),
        searchBrandInfo(brandName),
        aiAnalyzer(brandName),
    ]);

    // 如果找到 Logo，获取 base64
    let logoBase64 = null;
    if (logoUrl) {
        logoBase64 = await fetchLogoAsBase64(logoUrl);
    }

    return {
        name: brandName,
        logoUrl,
        logoBase64,
        tonality: aiAnalysis.tonality,
        colorPalette: aiAnalysis.colorPalette,
        styleKeywords: aiAnalysis.styleKeywords,
        designDescription: aiAnalysis.designDescription,
        searchDescription: searchResult.description,
    };
}
