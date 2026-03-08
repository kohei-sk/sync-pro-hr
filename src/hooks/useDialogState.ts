import { useState, useEffect } from "react";

/**
 * Modal/Drawer 共通のアニメーション状態管理フック。
 * - isMounted: DOM にマウントされているか（アンマウントタイミング制御）
 * - isOpen: アニメーションのオープン状態
 *
 * @param open 親コンポーネントから渡される open フラグ
 * @param exitDuration 閉じるアニメーションの継続時間（ms）
 */
export function useDialogState(open: boolean, exitDuration = 200) {
  const [isMounted, setIsMounted] = useState(open);
  const [isOpen, setIsOpen] = useState(open);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      // DOM マウント後に class を付与してアニメーション開始
      requestAnimationFrame(() => setIsOpen(true));
    } else {
      setIsOpen(false);
      const t = setTimeout(() => setIsMounted(false), exitDuration);
      return () => clearTimeout(t);
    }
  }, [open, exitDuration]);

  return { isMounted, isOpen };
}
