import "./globals.css";
import { AppProvider } from "./context/AppContext";

export const metadata = {
  title: "PPT-AI | 智能演示文稿重绘系统",
  description: "使用 AI 将您的 PPT 转换为大师级设计作品。输入邀请码，即刻体验 NANO BANANA PRO 的设计魔法。",
  keywords: ["PPT", "AI", "演示文稿", "设计", "NANO BANANA PRO", "PPT 杀手"],
  openGraph: {
    title: "PPT-AI | 智能演示文稿重绘系统",
    description: "使用 AI 将您的 PPT 转换为大师级设计作品",
    images: [{
      url: '/logo.png', // Uses the newly generated logo for sharing
      width: 1024,
      height: 1024,
      alt: 'PPT AI Pro Logo',
    }],
    type: 'website',
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png', // For iOS home screen
  },
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
