/** @type {import('next').NextConfig} */
const nextConfig = {
  // 使用 Turbopack 配置
  turbopack: {},

  // 实验性功能
  experimental: {
    // 启用服务器操作
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;
