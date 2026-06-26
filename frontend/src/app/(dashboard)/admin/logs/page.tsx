"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollText, Loader2, Shield, User, Trash2, Plus, KeyRound, ImageIcon } from "lucide-react";
import type { ActivityLog } from "@/types";

const actionIcon = (action: string) => {
  const map: Record<string, any> = {
    generate_single: ImageIcon,
    generate_two: ImageIcon,
    create_user: Plus,
    update_user: User,
    delete_user: Trash2,
    reset_password: KeyRound,
    delete_generation: ImageIcon,
    login: Shield,
  };
  const Icon = map[action] || Shield;
  return <Icon className="w-4 h-4" />;
};

const actionColor = (action: string) => {
  if (action.includes("delete")) return "text-red-500";
  if (action.includes("create") || action.includes("generate")) return "text-green-500";
  if (action.includes("update") || action.includes("reset")) return "text-blue-500";
  return "text-gray-500";
};

const actionLabel = (action: string) => {
  const map: Record<string, string> = {
    generate_single: "Tạo ảnh (1 nhân vật)",
    generate_two: "Tạo ảnh (2 nhân vật)",
    create_user: "Tạo người dùng",
    update_user: "Cập nhật người dùng",
    delete_user: "Xóa người dùng",
    reset_password: "Đặt lại mật khẩu",
    delete_generation: "Xóa generation",
    login: "Đăng nhập",
  };
  return map[action] || action;
};

export default function AdminLogsPage() {
  const { data, isLoading, error } = useQuery<ActivityLog[]>({
    queryKey: ["admin-logs"],
    queryFn: async () => {
      const res = await api.get("/admin/logs?limit=200");
      return res.data;
    },
    refetchInterval: 300000,
    staleTime: 30000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText className="w-6 h-6 text-[#5B4DFF]" />
        <h1 className="text-2xl font-bold text-foreground">Lịch sử hoạt động</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          Không thể tải lịch sử hoạt động.
        </div>
      )}

      <Card className="border-0 shadow-sm">
        {isLoading ? (
          <CardContent className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        ) : !data || data.length === 0 ? (
          <CardContent className="p-12 text-center text-muted-foreground">
            Chưa có hoạt động nào.
          </CardContent>
        ) : (
          <div className="divide-y divide-border">
            {data.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50">
                <div className={`mt-0.5 ${actionColor(log.action)}`}>
                  {actionIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{actionLabel(log.action)}</span>
                    <span className="text-xs text-muted-foreground">
                      bởi {log.userName || log.userEmail || log.userId?.slice(0, 8)}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.details}</p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {log.timestamp ? new Date(log.timestamp).toLocaleString("vi-VN") : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
