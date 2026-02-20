"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Plus,
  Copy,
  ExternalLink,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import { mockRoles, mockMembers } from "@/lib/mock-data";
import { getEventTypes, subscribe } from "@/lib/event-store";
import { cn } from "@/lib/utils";

function useEventTypes() {
  return useSyncExternalStore(subscribe, getEventTypes, getEventTypes);
}

export default function EventsPage() {
  const eventTypes = useEventTypes();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">イベント</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            面接や面談のイベントを管理します
          </p>
        </div>
        <Link href="/dashboard/events/new" className="btn-primary">
          <Plus className="mr-1.5 h-4 w-4" />
          新規イベント作成
        </Link>
      </div>

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
            <Plus className="mr-1.5 h-4 w-4" />
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
              <div key={event.id} className="card transition-shadow hover:shadow-card-hover">
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
                    <div>
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-primary-600"
                      >
                        {event.title}
                      </Link>
                      <span
                        className={cn(
                          "ml-2 rounded-md px-1.5 py-0.5 text-xs font-medium",
                          event.status === "active"
                            ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                            : event.status === "draft"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-red-50 text-red-700"
                        )}
                      >
                        {event.status === "active"
                          ? "公開中"
                          : event.status === "draft"
                          ? "下書き"
                          : "アーカイブ"}
                      </span>
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
                  <button className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50">
                    <Copy className="h-3 w-3" />
                    リンクをコピー
                  </button>
                  <Link
                    href={`/j/${event.slug}`}
                    className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary-600 ring-1 ring-inset ring-primary-200 hover:bg-primary-50"
                  >
                    <ExternalLink className="h-3 w-3" />
                    プレビュー
                  </Link>
                  <Link
                    href={`/dashboard/events/${event.id}`}
                    className="ml-auto flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
                  >
                    編集
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
