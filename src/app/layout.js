import "./globals.css";
import { AppProvider } from "./context/AppContext";

export const metadata = {
  title: "PPT-AI | 智能演示文稿重绘系统",
  description: "使用 AI 将您的 PPT 转换为大师级设计作品",
  keywords: ["PPT", "AI", "演示文稿", "设计", "NANO BANANA PRO"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body suppressHydrationWarning>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
