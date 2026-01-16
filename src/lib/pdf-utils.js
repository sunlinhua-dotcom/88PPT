/**
 * PDF 处理工具模块
 * 使用 pdf.js 解析 PDF 并渲染为图像
 */

import * as pdfjsLib from "pdfjs-dist";

// 配置 PDF.js worker
if (typeof window !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

/**
 * 将 PDF 文件解析为页面图像数组
 * @param {ArrayBuffer} pdfBuffer - PDF 文件的 ArrayBuffer
 * @param {Object} options - 解析选项
 * @param {number} options.maxPages - 最大页数限制
 * @param {number} options.scale - 渲染比例 (默认 2.0)
 * @param {Function} options.onProgress - 进度回调
 * @returns {Promise<Array>} - 页面数据数组
 */
export async function parsePDFToImages(pdfBuffer, options = {}) {
    const { maxPages = 120, scale = 2.0, onProgress } = options;

    try {
        // 加载 PDF 文档
        const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
        const pdfDoc = await loadingTask.promise;

        const totalPages = Math.min(pdfDoc.numPages, maxPages);
        const pages = [];

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            // 获取页面
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            // 创建 canvas
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // 渲染页面到 canvas
            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            // 转换为 base64 图像
            const imageBase64 = canvas.toDataURL("image/png");

            // 提取文本内容
            const textContent = await page.getTextContent();
            const textItems = textContent.items.map((item) => item.str);
            const pageText = textItems.join(" ");

            pages.push({
                pageNumber: pageNum,
                imageBase64,
                textContent: pageText,
                width: viewport.width,
                height: viewport.height,
            });

            // 进度回调
            if (onProgress) {
                onProgress({
                    current: pageNum,
                    total: totalPages,
                    percentage: Math.round((pageNum / totalPages) * 100),
                });
            }
        }

        return {
            success: true,
            pages,
            totalPages,
            skippedPages: pdfDoc.numPages > maxPages ? pdfDoc.numPages - maxPages : 0,
        };
    } catch (error) {
        console.error("PDF 解析失败:", error);
        throw new Error(`PDF 解析失败: ${error.message}`);
    }
}

/**
 * 验证 PDF 文件
 * @param {File} file - PDF 文件
 * @returns {Object} - 验证结果
 */
export function validatePDFFile(file) {
    const errors = [];

    // 检查文件类型
    if (file.type !== "application/pdf") {
        errors.push("请上传 PDF 格式的文件");
    }

    // 检查文件大小（限制 100MB）
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
        errors.push("文件大小不能超过 100MB");
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * 读取 PDF 文件为 ArrayBuffer
 * @param {File} file - PDF 文件
 * @returns {Promise<ArrayBuffer>}
 */
export function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("文件读取失败"));
        reader.readAsArrayBuffer(file);
    });
}
