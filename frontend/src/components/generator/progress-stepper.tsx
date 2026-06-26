"use client";

import { Check, XCircle } from "lucide-react";
import type { ResultStatus } from "@/hooks/use-generation";
import type { GenerationProgress } from "@/types";

interface ProgressStepperProps {
  status: ResultStatus;
  progress: GenerationProgress | null;
  error?: string | null;
}

const STEPS = [
  { id: 1, label: "Phân tích dữ liệu" },
  { id: 2, label: "Đang tạo ảnh" },
  { id: 3, label: "Kiểm tra chất lượng" },
  { id: 4, label: "Hoàn tất" },
];

function getActiveStep(status: ResultStatus, progress: GenerationProgress | null): number {
  if (status === "completed") return 4;
  if (status === "processing" && progress && (progress.generatedImages > 0 || progress.completedBatches > 0)) return 3;
  if (status === "processing" || status === "pending") return 2;
  return 0;
}

export function ProgressStepper({ status, progress, error }: ProgressStepperProps) {
  if (status === "idle") return null;

  const activeStep = getActiveStep(status, progress);

  if (status === "failed") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
        <XCircle className="w-5 h-5 text-red-400 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-300">Tạo ảnh thất bại</p>
          <p className="text-xs text-red-400/80">{error || "Vui lòng thử lại sau"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const isActive = step.id === activeStep;
          const isCompleted = step.id < activeStep;
          const isPending = step.id > activeStep;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300
                    ${isCompleted ? "bg-[#22C55E] text-white" : ""}
                    ${isActive ? "bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/30" : ""}
                    ${isPending ? "bg-[#1E1B2E] text-[#4A5568]" : ""}
                  `}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                </div>
                <span
                  className={`
                    text-[10px] text-center leading-tight max-w-[80px]
                    ${isCompleted || isActive ? "text-white" : ""}
                    ${isPending ? "text-[#4A5568]" : ""}
                  `}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`
                    flex-1 h-[2px] mx-2 mt-[-20px]
                    ${isCompleted ? "bg-[#22C55E]" : ""}
                    ${isActive || isPending ? "bg-[#1E1B2E]" : ""}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      {status === "processing" && progress && (
        <div className="text-center">
          <p className="text-xs text-[#94A3B8]">
            {progress.generatedImages > 0
              ? `Đã nhận ${progress.generatedImages}/${progress.totalImages} ảnh`
              : "Đang xử lý yêu cầu..."}
          </p>
        </div>
      )}

      {status === "completed" && (
        <div className="text-center">
          <p className="text-xs text-[#22C55E]">
            Hoàn thành {progress?.totalImages || ""} ảnh
          </p>
        </div>
      )}
    </div>
  );
}
