import {
  CalendarPlus,
  Users,
  Calendar,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { mockEventTypes, mockBookings } from "@/lib/mock-data";

export default function DashboardPage() {
  const activeEvents = mockEventTypes.filter((e) => e.status === "active");
  const confirmedBookings = mockBookings.filter(
    (b) => b.status === "confirmed"
  );
  const pendingBookings = mockBookings.filter((b) => b.status === "pending");

  const stats = [
    {
      name: "アクティブなイベント",
      value: activeEvents.length,
      icon: CalendarPlus,
      color: "bg-primary-50 text-primary-600",
    },
    {
      name: "今月の予約数",
      value: confirmedBookings.length,
      icon: Calendar,
      color: "bg-green-50 text-green-600",
    },
    {
      name: "保留中の予約",
      value: pendingBookings.length,
      icon: TrendingUp,
      color: "bg-amber-50 text-amber-600",
    },
    {
      name: "チームメンバー",
      value: 5,
      icon: Users,
      color: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-500">
          面接日程調整の概要を確認できます
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.color}`}
              >
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500">{stat.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Events */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            イベントタイプ
          </h2>
          <Link
            href="/dashboard/events"
            className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            すべて表示
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {mockEventTypes.slice(0, 4).map((event) => (
            <Link
              key={event.id}
              href={`/dashboard/events/${event.id}`}
              className="card flex items-center gap-4 transition-shadow hover:shadow-md"
            >
              <div
                className="h-12 w-12 rounded-2xl"
                style={{ backgroundColor: event.color + "20" }}
              >
                <div className="flex h-full items-center justify-center">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: event.color }}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900">{event.title}</h3>
                <p className="text-sm text-gray-500">
                  {event.duration}分 ·{" "}
                  {event.location_type === "online"
                    ? "オンライン"
                    : event.location_type === "in-person"
                    ? "対面"
                    : "電話"}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  event.status === "active"
                    ? "bg-green-50 text-green-700"
                    : event.status === "draft"
                    ? "bg-gray-100 text-gray-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {event.status === "active"
                  ? "公開中"
                  : event.status === "draft"
                  ? "下書き"
                  : "アーカイブ"}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">最近の予約</h2>
          <Link
            href="/dashboard/bookings"
            className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            すべて表示
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4">
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    候補者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    イベント
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    ステータス
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mockBookings.map((booking) => {
                  const event = mockEventTypes.find(
                    (e) => e.id === booking.event_id
                  );
                  const startDate = new Date(booking.start_time);
                  return (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {booking.candidate_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {booking.candidate_email}
                          </p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {event?.title || "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {startDate.toLocaleDateString("ja-JP", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        {startDate.toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            booking.status === "confirmed"
                              ? "bg-green-50 text-green-700"
                              : booking.status === "pending"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {booking.status === "confirmed"
                            ? "確定"
                            : booking.status === "pending"
                            ? "保留中"
                            : "キャンセル"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
