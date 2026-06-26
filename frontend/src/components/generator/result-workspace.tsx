"use client";

import { motion } from "framer-motion";
import { ProgressStepper } from "./progress-stepper";
import { ResultCard } from "./result-card";
import { Camera, Download } from "lucide-react";
import type { ResultStatus } from "@/hooks/use-generation";
import type { GenerationProgress } from "@/types";
import JSZip from "jszip";

interface ResultWorkspaceProps {
  status: ResultStatus;
  imageUrls: string[];
  generationId: string | null;
  totalQuantity: number;
  ratio: string;
  progress: GenerationProgress | null;
  error: string | null;
  onDeleteImage?: (index: number, generationId: string) => void;
}

function dataURLtoBlob(dataUrl: string): Blob | null {
  if (!dataUrl.startsWith("data:")) return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const data = atob(match[2]);
  const arr = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) arr[i] = data.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function ResultWorkspace({
  status,
  imageUrls,
  generationId,
  totalQuantity,
  ratio,
  progress,
  error,
  onDeleteImage,
}: ResultWorkspaceProps) {
  const handleDownloadAll = async () => {
    if (imageUrls.length === 0) return;

    const zip = new JSZip();
    const date = new Date().toISOString().split('T')[0];

    for (let i = 0; i < imageUrls.length; i++) {
      const imgUrl = imageUrls[i];
      const blob = dataURLtoBlob(imgUrl);
      if (blob) {
        zip.file(`koc-image-${i + 1}.png`, blob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `koc-${date}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (status === "idle") {
    return (
      <div className="flex-1 bg-[#0B1220] rounded-2xl border border-white/5 shadow-sm flex flex-col">
        <div className="flex flex-col items-center justify-center flex-1 p-8">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#8B5CF6]/10 to-[#A855F7]/5 flex items-center justify-center mb-6 shadow-inner">
            <Camera className="w-12 h-12 text-[#8B5CF6]/30" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Chưa có ảnh nào được tạo</h3>
          <p className="text-sm text-[#94A3B8] text-center max-w-xs mb-8">
            Tải ảnh khuôn mặt và nhấn GEN ẢNH để bắt đầu
          </p>
        </div>
      </div>
    );
  }

  if (status === "pending" || status === "processing") {
    const skeletonCount = Math.max(0, totalQuantity - imageUrls.length);

    return (
      <div className="flex-1 bg-[#0B1220] rounded-2xl border border-white/5 shadow-sm p-6 flex flex-col">
        <ProgressStepper status={status === "pending" ? "pending" : "processing"} progress={progress} error={error} />

        {(imageUrls.length > 0 || skeletonCount > 0) && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 content-start">
            {imageUrls.map((url, i) => (
              <ResultCard
                key={i}
                src={url}
                index={i}
                generationId={generationId || ""}
                ratio={ratio}
              />
            ))}
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <ResultCard
                key={`skeleton-${i}`}
                skeleton
                index={imageUrls.length + i}
                generationId={generationId || ""}
                ratio={ratio}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="flex-1 bg-[#0B1220] rounded-2xl border border-white/5 shadow-sm p-6 flex flex-col">
        <ProgressStepper status="completed" progress={progress} />

        {imageUrls.length > 0 && (
          <div className="flex items-center justify-end mt-4">
            <button
              type="button"
              onClick={handleDownloadAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              <Download className="w-3.5 h-3.5" />
              Tải tất cả ({imageUrls.length})
            </button>
          </div>
        )}

        {imageUrls.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 content-start">
            {imageUrls.map((url, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <ResultCard
                  src={url}
                  index={i}
                  generationId={generationId || ""}
                  ratio={ratio}
                  onDelete={onDeleteImage}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium text-yellow-600 mb-1">Ảnh đã được tạo nhưng không có dữ liệu</p>
              <p className="text-xs text-[#94A3B8]">Vui lòng thử lại</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex-1 bg-[#0B1220] rounded-2xl border border-white/5 shadow-sm p-6 flex flex-col">
        <ProgressStepper status="failed" progress={null} error={error} />
        <div className="flex-1 flex items-center justify-center text-sm text-[#94A3B8]">
          Vui lòng kiểm tra lại thông tin và thử lại
        </div>
      </div>
    );
  }

  return null;
}
