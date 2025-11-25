/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Webpack이 해석하다 체하지 않도록, 문제의 패키지들을 빌드에서 제외하고
  // Node.js 런타임(v20)이 직접 실행하도록 넘겨버리는 설정입니다.
  experimental: {
    serverComponentsExternalPackages: ['undici', 'firebase', '@firebase/auth'],
  },
};

module.exports = nextConfig;
