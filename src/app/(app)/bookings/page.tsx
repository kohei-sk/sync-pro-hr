import { Calendar } from "lucide-react";

export default function BookingsIndexPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Calendar className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">
          予約を選択してください
        </p>
        <p className="mt-1 text-xs text-gray-400">
          左のリストから予約を選択すると詳細が表示されます
        </p>
      </div>
    </div>
  );
}
