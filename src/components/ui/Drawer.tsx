"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

// ============================================================
// Drawer
// ============================================================

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

const EXIT_DURATION = 200;

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`drawer-title-${Math.random().toString(36).slice(2, 7)}`);

  // isMounted: DOM に残すか / isOpen: アニメーション状態
  const [isMounted, setIsMounted] = useState(open);
  const [isOpen, setIsOpen] = useState(open);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      // DOM マウント後に class を付与してアニメーション開始
      requestAnimationFrame(() => setIsOpen(true));
    } else {
      setIsOpen(false);
      const t = setTimeout(() => setIsMounted(false), EXIT_DURATION);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ESC キーで閉じる
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
    if (isOpen && panelRef.current) {
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        panelRef.current.focus();
      }
    }
  }, [isOpen]);

  // body スクロール防止
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

  if (!isMounted) return null;

  return (
    <div data-drawer-state={isOpen ? "open" : "close"}>
      {/* Overlay */}
      <div
        className="drawer-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Container */}
      <div className="drawer-container" role="presentation">
        <div
          ref={panelRef}
          className="drawer-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId.current}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="drawer-header">
            <h2
              id={titleId.current}
              className="text-xl font-bold"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="ml-4 shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="閉じる"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          {children && <div className="drawer-body">{children}</div>}

          {/* Footer */}
          {footer && <div className="drawer-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
