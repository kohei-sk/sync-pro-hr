import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "SyncPro HR - スマートな面接日程調整",
  description:
    "複数の面接官の空き時間を自動合成し、最適な面接スケジュールを提案するプロフェッショナルな日程調整SaaS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
