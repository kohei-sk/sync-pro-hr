import { createServiceClient } from "@/lib/supabase/service";

export type NotifyFlag =
  | "notify_booking_new"
  | "notify_booking_cancel"
  | "notify_reminder"
  | "notify_digest";

/** デフォルト値（user_settings 未作成ユーザー向け） */
const DEFAULTS: Record<NotifyFlag, boolean> = {
  notify_booking_new: true,
  notify_booking_cancel: true,
  notify_reminder: true,
  notify_digest: false,
};

/**
 * 指定ユーザー群のうち、通知フラグが ON のユーザーのメールアドレスを返す。
 * - user_settings 未作成のユーザーはデフォルト値を使用
 * - メールアドレスは auth.users から取得
 */
export async function getMemberEmailsForNotification(
  userIds: string[],
  flag: NotifyFlag
): Promise<{ userId: string; email: string }[]> {
  if (userIds.length === 0) return [];

  const supabase = createServiceClient();

  // 通知設定を一括取得
  const { data: settings } = await supabase
    .from("user_settings")
    .select(`user_id, ${flag}`)
    .in("user_id", userIds);

  const settingsMap = new Map(
    (settings ?? []).map((s: any) => [s.user_id, s[flag] as boolean])
  );

  // フラグ ON のユーザーを絞り込む（設定なし → デフォルト値）
  const enabledIds = userIds.filter((uid) => {
    if (settingsMap.has(uid)) return settingsMap.get(uid) === true;
    return DEFAULTS[flag];
  });

  if (enabledIds.length === 0) return [];

  // auth.users からメールアドレスを取得
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const emailMap = new Map(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );

  return enabledIds
    .filter((uid) => emailMap.get(uid))
    .map((uid) => ({ userId: uid, email: emailMap.get(uid)! }));
}
