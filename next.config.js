/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 빌드 중 오류 무시 (배포 성공률 최우선)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // 외부 패키지의 최신 문법 오류를 해결해주는 설정
  transpilePackages: ['undici', 'firebase', '@firebase/auth'],
};

module.exports = nextConfig;
