"use client";

import { useMemo } from "react";
import {
  CalendarPlus,
  Users,
  Calendar,
  TrendingUp,
  ArrowRight,
  CalendarCheck,
  XCircle,
  PlusCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  mockEventTypes,
  mockBookings,
  mockActivities,
  mockDailyBookingStats,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

export default function DashboardPage() {
  const activeEvents = mockEventTypes.filter((e) => e.status === "active");
  const thisWeekBookings = mockBookings.filter((b) => {
    const d = new Date(b.start_time);
    const now = new Date("2026-02-18");
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return d >= weekStart && d < weekEnd && b.status !== "cancelled";
  });
  const confirmedBookings = mockBookings.filter((b) => b.status === "confirmed");
  const totalBookings = mockBookings.filter((b) => b.status !== "cancelled").length;
  const bookingRate = totalBookings > 0 ? Math.round((confirmedBookings.length / totalBookings) * 100) : 0;

  const stats = [
    {
      name: "公開中イベント",
      value: activeEvents.length,
      icon: CalendarPlus,
      color: "bg-primary-50 text-primary-600",
      trend: "+1 先週比",
      trendUp: true,
    },
    {
      name: "今週の予約数",
      value: thisWeekBookings.length,
      icon: Calendar,
      color: "bg-green-50 text-green-600",
      trend: "+2 先週比",
      trendUp: true,
    },
    {
      name: "予約率",
      value: `${bookingRate}%`,
      icon: TrendingUp,
      color: "bg-amber-50 text-amber-600",
      trend: "+5% 先週比",
      trendUp: true,
    },
    {
      name: "チームメンバー",
      value: 5,
      icon: Users,
      color: "bg-purple-50 text-purple-600",
      trend: "変更なし",
      trendUp: false,
    },
  ];

  const chartData = useMemo(
    () => ({
      labels: mockDailyBookingStats.map((d) => d.date),
      datasets: [
        {
          label: "予約数",
          data: mockDailyBookingStats.map((d) => d.count),
          borderColor: "#0071c1",
          backgroundColor: "rgba(0, 113, 193, 0.08)",
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "#0071c1",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    }),
    []
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 12 }, color: "#9ca3af" },
        },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { size: 12 }, color: "#9ca3af" },
          grid: { color: "rgba(0,0,0,0.04)" },
        },
      },
    }),
    []
  );

  const activityIcons: Record<string, typeof CalendarCheck> = {
    booking_created: CalendarCheck,
    booking_cancelled: XCircle,
    event_created: PlusCircle,
    member_added: Users,
  };

  const activityColors: Record<string, string> = {
    booking_created: "text-green-500",
    booking_cancelled: "text-red-400",
    event_created: "text-primary-500",
    member_added: "text-purple-500",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          面接日程調整の概要を確認できます
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  stat.color
                )}
              >
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.name}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1">
              {stat.trendUp && (
                <TrendingUp className="h-3 w-3 text-green-500" />
              )}
              <span
                className={cn(
                  "text-xs",
                  stat.trendUp ? "text-green-600" : "text-gray-400"
                )}
              >
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Activity */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Chart */}
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                予約推移（過去7日間）
              </h2>
              <p className="text-xs text-gray-500">日別の新規予約数</p>
            </div>
          </div>
          <div className="h-56">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              アクティビティ
            </h2>
            <Link
              href="/dashboard/bookings"
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              すべて表示
            </Link>
          </div>
          <div className="space-y-3">
            {mockActivities.slice(0, 5).map((activity) => {
              const Icon = activityIcons[activity.type] || Clock;
              const color = activityColors[activity.type] || "text-gray-400";
              const timeAgo = getRelativeTime(activity.timestamp);
              return (
                <div key={activity.id} className="flex gap-3">
                  <div className={cn("mt-0.5 shrink-0", color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {activity.description}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">{timeAgo}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">
            イベントタイプ
          </h2>
          <Link
            href="/dashboard/events"
            className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            すべて表示
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {mockEventTypes.slice(0, 4).map((event) => (
            <Link
              key={event.id}
              href={`/dashboard/events/${event.id}`}
              className="card flex items-center gap-3 transition-shadow hover:shadow-card-hover"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: (event.color || "#0071c1") + "14" }}
              >
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: event.color }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900">
                  {event.title}
                </h3>
                <p className="text-xs text-gray-500">
                  {event.duration}分 ·{" "}
                  {event.location_type === "online"
                    ? "オンライン"
                    : event.location_type === "in-person"
                    ? "対面"
                    : "電話"}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
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
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function getRelativeTime(timestamp: string): string {
  const now = new Date("2026-02-18T10:00:00Z");
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;
  return new Date(timestamp).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}
