"use client";

import { useState, useEffect, memo } from "react";
import Image from "next/image";
import { Heart, Download, Trash2, Expand, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";

interface ResultCardProps {
  src?: string;
  index: number;
  generationId: string;
  skeleton?: boolean;
  ratio?: string;
  onDelete?: (index: number, generationId: string) => void;
}

const RATIO_CLASS: Record<string, string> = {
  '1:1': 'aspect-square',
  '3:4': 'aspect-[3/4]',
  '4:5': 'aspect-[4/5]',
  '9:16': 'aspect-[9/16]',
  '16:9': 'aspect-[16/9]',
};

function CircularRing() {
  return (
    <svg className="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="text-[#1E1B2E]" />
      <circle
        cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
        strokeDasharray="31.4 31.4" strokeLinecap="round"
        className="text-[#8B5CF6]"
        style={{ transformOrigin: "center", rotate: "-90deg" }}
      />
    </svg>
  );
}

export const ResultCard = memo(function ResultCard({ src = '', index, generationId, skeleton, ratio = '3:4', onDelete }: ResultCardProps) {
  const [favorited, setFavorited] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [fsError, setFsError] = useState(false);
  const aspectClass = RATIO_CLASS[ratio] || 'aspect-[3/4]';
  const isErrorSlot = src.startsWith('ERROR_SLOT:');

  useEffect(() => {
    api.get('/favorites').then(res => {
      const favs: any[] = res.data || [];
      const isFav = favs.some((f: any) => f.generationId === generationId && f.imageIndex === index);
      setFavorited(isFav);
    }).catch(() => { /* non-critical */ });
  }, [generationId, index]);

  if (skeleton) {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-[#0B1220]">
        <div className={`${aspectClass} flex flex-col items-center justify-center gap-3`}>
          <CircularRing />
          <span className="text-xs text-[#4A5568]">Đang tạo...</span>
        </div>
        <div className="absolute top-0 left-0 p-1.5">
          <span className="px-1.5 py-0.5 bg-[#8B5CF6]/80 text-white text-[10px] rounded font-medium">
            #{index + 1}
          </span>
        </div>
      </div>
    );
  }

  if (isErrorSlot) {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-red-500/30 bg-[#0B1220]">
        <div className={`${aspectClass} flex flex-col items-center justify-center gap-3`}>
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <span className="text-sm text-red-400 font-medium">Ảnh lỗi</span>
          <span className="text-xs text-[#94A3B8]">Gen lại sau</span>
        </div>
        <div className="absolute top-0 left-0 p-1.5">
          <span className="px-1.5 py-0.5 bg-red-500/80 text-white text-[10px] rounded font-medium">
            #{index + 1}
          </span>
        </div>
        <div className="relative z-10 flex items-center justify-end px-2 py-1.5 border-t border-white/5">
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(index, generationId)}
              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
              aria-label="Xóa ảnh lỗi"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleDownload = async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `koc-image-${index + 1}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, "_blank");
    }
    api.post("/feedback", { generationId, imageIndex: index, action: "download" }).catch(() => { /* non-critical */ });
  };

  const handleFavorite = () => {
    const next = !favorited;
    setFavorited(next);
    api.post("/favorites/toggle", { generationId, imageIndex: index, favorited: next }).catch(() => {
      setFavorited(!next);
    });
    if (next) toast.success("Đã lưu vào album ảnh thành công");
  };

  const handleDelete = () => {
    if (onDelete) onDelete(index, generationId);
    api
      .post("/feedback", { generationId, imageIndex: index, action: "delete" })
      .catch(() => { /* non-critical */ });
  };

  const handleFullscreen = () => {
    setFullscreen(true);
    api
      .post("/feedback", { generationId, imageIndex: index, action: "fullscreen" })
      .catch(() => { /* non-critical */ });
  };

  return (
    <>
      <div className="relative group rounded-2xl overflow-hidden border border-white/5 bg-[#0B1220] shadow-sm">
        <div className={`${aspectClass} relative`}>
          {imgError ? (
            <div className="w-full h-full flex items-center justify-center bg-[#0B1220] text-[#4A5568] text-xs">
              Ảnh không tải được
            </div>
          ) : (
            <Image
              src={src}
              alt={`#${index + 1}`}
              fill
              className="object-cover cursor-pointer"
              onClick={handleFullscreen}
              onError={() => setImgError(true)}
            />
          )}
        </div>

        <div className="relative z-10 flex items-center justify-end px-2 py-1.5 border-t border-white/5">
          <button
            type="button"
            onClick={handleFavorite}
            aria-label={favorited ? "Bỏ yêu thích" : "Yêu thích"}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1E1B2E] hover:bg-[#2a2540] transition-colors",
              favorited ? "text-red-400" : "text-[#94A3B8]"
            )}
          >
            <Heart className={cn("w-5 h-5", favorited && "fill-current text-red-400")} />
          </button>
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-[#8B5CF6]/10 group-focus-within:bg-[#8B5CF6]/10 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={handleFullscreen}
            className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors"
            aria-label="Xem toàn màn hình"
          >
            <Expand className="w-4 h-4 text-[#0B1220]" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors"
            aria-label="Tải xuống"
          >
            <Download className="w-4 h-4 text-[#0B1220]" />
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="p-2 bg-red-500/90 rounded-lg hover:bg-red-500 transition-colors"
              aria-label="Xóa ảnh"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        <div className="absolute top-0 left-0 p-1.5">
          <span className="px-1.5 py-0.5 bg-[#8B5CF6]/80 text-white text-[10px] rounded font-medium">
            #{index + 1}
          </span>
        </div>
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full" onClick={(e) => e.stopPropagation()}>
            {fsError ? (
              <div className="w-full h-full flex items-center justify-center text-white text-sm">
                Ảnh không tải được
              </div>
            ) : (
              <Image
                src={src}
                alt={`#${index + 1}`}
                fill
                className="object-contain"
                onError={() => setFsError(true)}
              />
            )}
            <button
              type="button"
              onClick={handleDownload}
              className="absolute bottom-4 right-4 px-4 py-2 bg-white text-gray-900 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Tải xuống
            </button>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
});
