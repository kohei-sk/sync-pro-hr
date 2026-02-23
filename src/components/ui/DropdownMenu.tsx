"use client";

import { useEffect, useRef, useState } from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

export interface DropdownItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  separator?: never;
}

export interface DropdownSeparator {
  separator: true;
  label?: never;
  icon?: never;
  onClick?: never;
  variant?: never;
  disabled?: never;
}

export type DropdownEntry = DropdownItem | DropdownSeparator;

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownEntry[];
  align?: "left" | "right";
}

// ============================================================
// Component
// ============================================================

export function DropdownMenu({
  trigger,
  items,
  align = "right",
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="dropdown-wrapper">
      {/* Trigger */}
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>

      {/* Panel */}
      {open && (
        <div
          className={cn(
            "dropdown-panel",
            align === "right" ? "right-0" : "left-0"
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {items.map((item, i) => {
            if ("separator" in item && item.separator) {
              return <div key={i} className="dropdown-separator" role="separator" />;
            }
            const entry = item as DropdownItem;
            const Icon = entry.icon;
            return (
              <button
                key={i}
                role="menuitem"
                disabled={entry.disabled}
                onClick={() => {
                  setOpen(false);
                  entry.onClick();
                }}
                className={cn(
                  "dropdown-item",
                  entry.variant === "danger" && "dropdown-item-danger",
                  entry.disabled && "opacity-40 cursor-not-allowed"
                )}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0" />}
                {entry.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
