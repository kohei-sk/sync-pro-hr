"use client";

import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  Clock,
  MapPin,
  Users,
  Edit,
} from "lucide-react";
import { mockRoles, mockMembers } from "@/lib/mock-data";
import { getEventTypes, subscribe } from "@/lib/event-store";
import { cn } from "@/lib/utils";

function useEventTypes() {
  return useSyncExternalStore(subscribe, getEventTypes, getEventTypes);
}

export default function EventsPage() {
  const eventTypes = useEventTypes();
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);
  const [showCopyToast, setShowCopyToast] = useState(false);

  function handleCopyLink(id: string, slug: string) {
    const url = `${window.location.origin}/j/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedEventId(id);
      setShowCopyToast(true);
      setTimeout(() => {
        setCopiedEventId(null);
        setShowCopyToast(false);
      }, 2000);
    });
  }

  return (
    <div>
      <header className="header">
        <div className="header-col">
          <h1 className="header-title">イベント</h1>
          <p className="header-sub-title">
            面接や面談のイベントを管理します
          </p>
        </div>
        <Link href="/dashboard/events/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          新規イベント作成
        </Link>
      </header>

      {eventTypes.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 p-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <Plus className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-gray-900">
            イベントがありません
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            新しいイベントを作成して面接日程の調整を始めましょう
          </p>
          <Link href="/dashboard/events/new" className="btn-primary mt-4">
            <Plus className="h-4 w-4" />
            新規イベント作成
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {eventTypes.map((event) => {
            const eventRoles = mockRoles.filter(
              (r) => r.event_id === event.id
            );
            const roleIds = eventRoles.map((r) => r.id);
            const memberCount = mockMembers.filter((m) =>
              roleIds.includes(m.role_id)
            ).length;

            return (
              <div key={event.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: (event.color || "#0071c1") + "14",
                      }}
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: event.color || "#0071c1" }}
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="font-bold">
                        {event.title}
                      </div>
                      <div
                        className={cn(
                          "badge",
                          event.status === "active"
                            ? "badge-green"
                            : event.status === "draft"
                              ? "badge-gray"
                              : "badge-red"
                        )}
                      >
                        {event.status === "active"
                          ? "公開中"
                          : event.status === "draft"
                            ? "非公開"
                            : "アーカイブ"}
                      </div>
                    </div>
                  </div>
                </div>

                {event.description && (
                  <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                    {event.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {event.duration}分
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.location_type === "online"
                      ? "オンライン"
                      : event.location_type === "in-person"
                        ? "対面"
                        : "電話"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {memberCount}人
                  </span>
                  <span className="badge-neutral">
                    {event.scheduling_mode === "fixed"
                      ? "固定モード"
                      : "プールモード"}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => handleCopyLink(event.id, event.slug)}
                    className="btn-emphasis btn-size-s"
                  >
                    {copiedEventId === event.id ? (
                      <>
                        <Check className="h-3 w-3" />
                        コピーしました
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        リンクをコピー
                      </>
                    )}
                  </button>
                  <Link
                    href={`/j/${event.slug}`}
                    target="blank"
                    className="btn-secondary btn-size-s"
                  >
                    <ExternalLink className="h-3 w-3" />
                    プレビュー
                  </Link>
                  <Link
                    href={`/dashboard/events/${event.id}`}
                    className="btn-ghost btn-size-s ml-auto"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    編集
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCopyToast && (
        <div className="toast">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-gray-700">リンクをコピーしました</span>
        </div>
      )}
    </div>
  );
}
