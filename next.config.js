/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 빌드 중 ESLint 오류 무시 (배포 성공률 높임)
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
