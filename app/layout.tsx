import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { InactivityLogout } from "@/components/inactivity-logout";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "시니어 재활 - 전문 트레이너와 함께하는 맞춤 재활 서비스",
  description: "시니어를 위한 전문 재활 PT 서비스. 방문형과 센터형 중 선택 가능. 1:1부터 1:3 그룹까지 다양한 프로그램 제공",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <InactivityLogout />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
