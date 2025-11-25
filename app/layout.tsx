import './globals.css';
import type { Metadata } from 'next';

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
      <body>{children}</body>
    </html>
  );
}
