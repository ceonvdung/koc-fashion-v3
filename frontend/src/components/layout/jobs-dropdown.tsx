"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Generation as Job } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function JobsDropdown() {
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: async () => {
      const res = await api.get("/generate/history");
      return (res.data.data || res.data || []).slice(0, 10);
    },
    refetchInterval: 10000,
  });

  const activeJobs = jobs.filter((j) => j.status === "processing" || j.status === "pending");
  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
      case "failed": return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case "processing": return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />;
      default: return <Clock className="w-3.5 h-3.5 text-yellow-500" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors hover:bg-muted/50 cursor-pointer relative">
        <Clock className="w-4 h-4" />
        Công việc
        {activeJobs.length > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-[#5B4DFF] text-white text-xs px-1.5 py-0 min-w-[18px] h-[18px]">
            {activeJobs.length}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Gần đây</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {jobs.length === 0 && (
          <p className="text-sm text-muted-foreground p-3 text-center">Chưa có công việc</p>
        )}
        {jobs.map((job) => (
          <div key={job.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer">
            {statusIcon(job.status)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">#{job.id}</p>
              <p className={cn(
                "text-xs",
                job.status === "completed" ? "text-green-600" :
                job.status === "failed" ? "text-red-500" :
                job.status === "processing" ? "text-blue-500" : "text-yellow-600"
              )}>
                {job.status === "completed" ? "Hoàn thành" :
                 job.status === "processing" ? "Đang tạo..." :
                 job.status === "failed" ? "Thất bại" : "Chờ xử lý"}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">{job.scene || "-"}</span>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
