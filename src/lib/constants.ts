import type { ExclusionRule, CustomField } from "@/types";

// ============================================================
// SyncPro HR - Shared Constants
// ============================================================

/** タブ切替時のスクロールリセット位置（sticky ヘッダーの高さに合わせた値） */
export const TAB_SCROLL_OFFSET = 114;

/** 曜日名（日本語、0=日曜日） */
export const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** 除外ルールのタイプ表示名 */
export const EXCLUSION_TYPE_LABELS: Record<ExclusionRule["type"], string> = {
  "all-day": "終日",
  "time-range": "時間帯",
};

/** カスタムフィールドのタイプ表示名 */
export const FIELD_TYPE_LABELS: Record<CustomField["type"], string> = {
  text: "テキスト",
  email: "メール",
  tel: "電話番号",
  multiline: "複数行テキスト",
  url: "URL",
  file: "ファイル",
};
