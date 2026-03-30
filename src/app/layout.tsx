import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Pitasuke ピタスケ｜採用チーム特化型の面接サポートツール。",
  description:
    "Pitasuke（ピタスケ）は、採用チーム特化型の面接フォローアップSaasサービスです。複数面接官のカレンダーを自動照会し、最適な面接スケジュールを候補者に提案します。日程調整から候補者対応まで、すべてがスムーズになります。",
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
