/**
 * 创建测试 PDF 文件
 */

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// 创建测试 PDF
const doc = new PDFDocument({
    size: [1920, 1080],
    margin: 100,
});

const outputPath = path.join(__dirname, "../public/test-presentation.pdf");
doc.pipe(fs.createWriteStream(outputPath));

// 第一页：封面
doc.fontSize(72).text("产品发布会", { align: "center" });
doc.moveDown(0.5);
doc.fontSize(36).text("2026 年度新品发布", { align: "center" });
doc.moveDown(2);
doc.fontSize(24).fillColor("#666").text("品牌名称: Apple", { align: "center" });

// 第二页：产品介绍
doc.addPage();
doc.fillColor("#000").fontSize(48).text("产品亮点", 100, 100);
doc.moveDown(1);
doc.fontSize(28).text("• 革命性的设计理念", 100);
doc.moveDown(0.5);
doc.fontSize(28).text("• 极致的用户体验", 100);
doc.moveDown(0.5);
doc.fontSize(28).text("• 强大的性能表现", 100);
doc.moveDown(0.5);
doc.fontSize(28).text("• 环保可持续发展", 100);

// 第三页：数据展示
doc.addPage();
doc.fontSize(48).text("市场数据", 100, 100);
doc.moveDown(1);
doc.fontSize(24).text("用户满意度: 98%", 100);
doc.moveDown(0.5);
doc.fontSize(24).text("市场份额: 35%", 100);
doc.moveDown(0.5);
doc.fontSize(24).text("年增长率: 25%", 100);

doc.end();

console.log("测试 PDF 已创建:", outputPath);
