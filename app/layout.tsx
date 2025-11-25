import './globals.css';
import { Red_Hat_Display } from 'next/font/google';
import type { Metadata } from 'next';

// 폰트 설정 (구글 폰트 자동 최적화)
const redHat = Red_Hat_Display({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-redhat',
});

export const metadata: Metadata = {
  title: 'Very Daily Log',
  description: '나만의 트레이딩 일지',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      {/* body에 폰트 클래스 적용 */}
      <body className={redHat.className}>{children}</body>
    </html>
  );
}
