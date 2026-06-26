"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Users, Image as ImageIcon, CheckCircle, UserPlus, Star } from "lucide-react";
import type { DashboardStats } from "@/types";

const statCards = [
  {
    label: "Tổng người dùng",
    key: "totalUsers" as const,
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Người dùng hoạt động",
    key: "activeUsers" as const,
    icon: UserPlus,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    label: "Tổng lượt tạo",
    key: "totalGenerations" as const,
    icon: ImageIcon,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    label: "Đã hoàn thành",
    key: "completedGenerations" as const,
    icon: CheckCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "Cấp độ 1",
    key: "level1Users" as const,
    icon: BarChart3,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    label: "Cấp độ 2",
    key: "level2Users" as const,
    icon: Star,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
];

function SkeletonCard() {
  return (
    <Card className="border-0 shadow-sm animate-pulse">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-200" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-6 w-16 bg-gray-200 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const res = await api.get("/admin/dashboard");
      return res.data;
    },
    refetchInterval: 300000,
    staleTime: 30000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          Không thể tải dữ liệu. Vui lòng thử lại sau.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((s) => {
              const Icon = s.icon;
              const value = data ? data[s.key] : 0;
              return (
                <Card key={s.label} className="border-0 shadow-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-xl font-bold text-foreground">{value}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>
    </div>
  );
}
