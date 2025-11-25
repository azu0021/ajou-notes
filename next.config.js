/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // 브라우저(Client) 환경 빌드일 때
    if (!isServer) {
      // 핵심 해결책: undici를 아예 빈 값(false)으로 매핑해서 파싱 자체를 막음
      config.resolve.alias['undici'] = false;

      // Node.js 전용 모듈 무시 설정
      config.resolve.fallback = {
        ...config.resolve.fallback,
        undici: false, // 혹시 몰라 여기도 추가
        net: false,
        tls: false,
        fs: false,
        child_process: false,
      };
    }
    return config;
  },
  experimental: {
    // 서버 사이드 설정
    serverComponentsExternalPackages: ['undici', 'firebase', '@firebase/auth'],
  },
};

module.exports = nextConfig;
