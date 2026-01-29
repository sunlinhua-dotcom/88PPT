import "./globals.css";
import { AppProvider } from "./context/AppContext";

// Set metadataBase for production - needed for WeChat sharing
export const metadata = {
  metadataBase: new URL('https://88ppt.digirepub.com'),
  title: "PPT-AI | 智能演示文稿重绘系统",
  description: "使用 AI 将您的 PPT 转换为大师级设计作品。输入邀请码，即刻体验 NANO BANANA PRO 的设计魔法。",
  keywords: ["PPT", "AI", "演示文稿", "设计", "NANO BANANA PRO", "PPT 杀手"],
  openGraph: {
    title: "PPT-AI | 智能演示文稿重绘系统",
    description: "使用 AI 将您的 PPT 转换为大师级设计作品",
    siteName: "PPT-AI Pro",
    images: [{
      url: '/logo_red.png', // Will be resolved to absolute URL via metadataBase
      width: 1024,
      height: 1024,
      alt: 'PPT AI Pro Logo',
    }],
    type: 'website',
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary_large_image',
    title: "PPT-AI | 智能演示文稿重绘系统",
    description: "使用 AI 将您的 PPT 转换为大师级设计作品",
    images: ['/logo_red.png'],
  },
  icons: {
    icon: '/logo_red.png',
    apple: '/logo_red.png',
    shortcut: '/logo_red.png',
  },
  other: {
    // WeChat specific meta tags
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@100;300;400;500;700;900&family=Noto+Serif+SC:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
