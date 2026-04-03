/**
 * アプリのベースURLを返す。
 *
 * 優先順位:
 * 1. NEXT_PUBLIC_APP_URL（明示的に設定された値）
 * 2. VERCEL_URL（Vercelが自動注入、https:// を付加）
 * 3. http://localhost:3002（ローカル開発用フォールバック）
 */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3002";
}
