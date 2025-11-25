/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // 여기가 핵심입니다!
  webpack: (config, { isServer }) => {
    // 브라우저(Client) 환경 빌드일 때
    if (!isServer) {
      // undici 등 Node.js 전용 모듈을 아예 빈 껍데기(false)로 대체해버림
      config.resolve.fallback = {
        ...config.resolve.fallback,
        undici: false, 
        net: false,
        tls: false,
        fs: false,
        child_process: false,
      };
    }
    return config;
  },
  experimental: {
    // 서버 사이드에서는 얘네를 건드리지 말고 놔둘 것
    serverComponentsExternalPackages: ['undici', 'firebase', '@firebase/auth'],
  },
};

module.exports = nextConfig;
