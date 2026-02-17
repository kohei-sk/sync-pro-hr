import Link from "next/link";
import {
  Plus,
  Copy,
  ExternalLink,
  MoreVertical,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import { mockEventTypes, mockRoles, mockMembers } from "@/lib/mock-data";

export default function EventsPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            イベントタイプ
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            面接や面談のイベントタイプを管理します
          </p>
        </div>
        <Link href="/dashboard/events/new" className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          新規作成
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {mockEventTypes.map((event) => {
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
                    className="flex h-10 w-10 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: (event.color || "#3b82f6") + "20" }}
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: event.color || "#3b82f6" }}
                    />
                  </div>
                  <div>
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className="font-semibold text-gray-900 hover:text-primary-600"
                    >
                      {event.title}
                    </Link>
                    <span
                      className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        event.status === "active"
                          ? "bg-green-50 text-green-700"
                          : event.status === "draft"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {event.status === "active"
                        ? "公開中"
                        : event.status === "draft"
                        ? "下書き"
                        : "アーカイブ"}
                    </span>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>

              {event.description && (
                <p className="mt-2 text-sm text-gray-500">
                  {event.description}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {event.duration}分
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {event.location_type === "online"
                    ? "オンライン"
                    : event.location_type === "in-person"
                    ? "対面"
                    : "電話"}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {memberCount}人のメンバー
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {event.scheduling_mode === "fixed"
                    ? "固定モード"
                    : "プールモード"}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
                <button className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50">
                  <Copy className="h-3 w-3" />
                  リンクをコピー
                </button>
                <Link
                  href={`/j/${event.slug}`}
                  className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-primary-600 ring-1 ring-primary-200 hover:bg-primary-50"
                >
                  <ExternalLink className="h-3 w-3" />
                  プレビュー
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
