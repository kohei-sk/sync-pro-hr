"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: string) => void;
}

// ============================================================
// Context
// ============================================================

const ToastContext = createContext<ToastContextValue | null>(null);

// ============================================================
// Provider
// ============================================================

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => {
        // 最大3件まで表示（古いものを削除）
        const next = [...prev, { id, type, message }];
        return next.length > 3 ? next.slice(next.length - 3) : next;
      });
      const timer = setTimeout(() => dismiss(id), 3000);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  const value: ToastContextValue = {
    success: (msg) => addToast("success", msg),
    error: (msg) => addToast("error", msg),
    warning: (msg) => addToast("warning", msg),
    info: (msg) => addToast("info", msg),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

// ============================================================
// UI Components
// ============================================================

const toastConfig: Record<
  ToastType,
  { icon: typeof CheckCircle2; iconClass: string }
> = {
  success: { icon: CheckCircle2, iconClass: "text-green-500" },
  error: { icon: AlertCircle, iconClass: "text-red-500" },
  warning: { icon: AlertTriangle, iconClass: "text-amber-500" },
  info: { icon: Info, iconClass: "text-primary-500" },
};

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="region" aria-label="通知">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const { icon: Icon, iconClass } = toastConfig[toast.type];

  return (
    <div
      className={cn("toast")}
      role="alert"
      aria-live="polite"
    >
      <Icon className={cn("h-4 w-4 shrink-0", iconClass)} />
      <span className="text-sm font-medium text-gray-700 flex-1">
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-1 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        aria-label="閉じる"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
