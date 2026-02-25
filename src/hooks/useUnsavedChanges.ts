"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useUnsavedChanges(isDirty: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // ブラウザを閉じる・更新時の警告
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function navigate(href: string) {
    if (!isDirty) {
      router.push(href);
    } else {
      setPendingHref(href);
    }
  }

  function confirmLeave() {
    if (pendingHref) {
      router.push(pendingHref);
      setPendingHref(null);
    }
  }

  function cancelLeave() {
    setPendingHref(null);
  }

  return { navigate, pendingHref, confirmLeave, cancelLeave };
}
