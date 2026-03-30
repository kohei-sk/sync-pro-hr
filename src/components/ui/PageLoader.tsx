"use client";

interface PageLoaderProps {
  text?: string;
}

export function PageLoader({ text = "読み込み中..." }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
      <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-primary-600 animate-spin" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
