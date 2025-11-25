// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Very Daily Log",
  description: "아주의 아주 간단하지만 집요한 매매 일지",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-rose-50">
        {children}
      </body>
    </html>
  );
}
