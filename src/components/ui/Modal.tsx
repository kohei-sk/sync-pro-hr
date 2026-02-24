"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// Modal
// ============================================================

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 7)}`);

  // ESCキーで閉じる
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // 開いたときにフォーカスをパネルに移動
  useEffect(() => {
    if (open && panelRef.current) {
      // 最初のフォーカス可能な要素にフォーカス
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        panelRef.current.focus();
      }
    }
  }, [open]);

  // bodyスクロール防止
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const sizeClass = {
    sm: "modal-panel-sm",
    md: "modal-panel-md",
    lg: "modal-panel-lg",
  }[size];

  return (
    <>
      {/* Overlay */}
      <div
        className="modal-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Container */}
      <div className="modal-container" role="presentation">
        <div
          ref={panelRef}
          className={cn("modal-panel", sizeClass)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId.current}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <div>
              <h2
                id={titleId.current}
                className="text-xl font-semibold text-gray-900"
              >
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="閉じる"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          {children && <div className="modal-body">{children}</div>}

          {/* Footer */}
          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>
    </>
  );
}

// ============================================================
// ConfirmDialog (Modal の薄いラッパー)
// ============================================================

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "確認",
  confirmVariant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="btn btn-secondary"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              confirmVariant === "danger" ? "btn btn-ghost-danger" : "btn btn-primary"
            )}
          >
            {loading && <span className="spinner" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600">{description}</p>
    </Modal>
  );
}
