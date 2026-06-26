"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { toast } from "sonner";
import api from "@/lib/api";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Download, Expand, Trash2, Loader2 } from "lucide-react";

interface FavItem {
  id: string;
  generationId: string;
  imageIndex: number;
  url: string;
  scene?: string;
  createdAt?: string;
}

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const [fullscreen, setFullscreen] = useState<string | null>(null);
  const [fsError, setFsError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<FavItem[]>({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await api.get("/favorites");
      return res.data || [];
    },
    staleTime: 10000,
  });

  const handleUnfavorite = async (item: FavItem) => {
    if (deletingId) return;
    setDeletingId(`${item.generationId}-${item.imageIndex}`);
    try {
      await api.post("/favorites/toggle", {
        generationId: item.generationId,
        imageIndex: item.imageIndex,
        favorited: false,
      });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    } catch {
      toast.error("Thao tác thất bại");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = async (item: FavItem) => {
    if (deletingId) return;
    setDeletingId(`${item.generationId}-${item.imageIndex}`);
    try {
      await api.delete(`/generate/${item.generationId}/images/${item.imageIndex}`);
      await api.post("/favorites/toggle", {
        generationId: item.generationId,
        imageIndex: item.imageIndex,
        favorited: false,
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success("Xóa thành công");
    } catch {
      toast.error("Xóa thất bại");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (url: string, index: number) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `koc-fav-${index + 1}.png`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Tải thất bại");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#5B4DFF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Heart className="w-6 h-6 text-red-500 fill-red-500" />
        <h1 className="text-2xl font-bold text-foreground">Ảnh đã tym</h1>
        <span className="text-sm text-muted-foreground">{items.length} ảnh</span>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Chưa có ảnh nào được tym</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((item) => {
            const isDeleting = deletingId === `${item.generationId}-${item.imageIndex}`;
            return (
              <div
                key={`${item.generationId}-${item.imageIndex}`}
                className="relative group rounded-2xl overflow-hidden border border-border bg-white shadow-sm"
              >
                <div
                  className="aspect-[3/4] relative cursor-pointer"
                  onClick={() => { setFullscreen(item.url); setFsError(false); }}
                >
                  <Image
                    src={item.url}
                    alt={`#${item.imageIndex + 1}`}
                    fill
                    className="object-cover"
                    onError={() => setFsError(true)}
                  />
                </div>

                <div className="absolute top-2 left-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">
                    {item.scene || "KOC"}
                  </span>
                </div>

                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleDownload(item.url, item.imageIndex)}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 transition-colors"
                    title="Tải xuống"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnfavorite(item)}
                    disabled={isDeleting}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 transition-colors"
                    title="Bỏ tym"
                  >
                    <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={isDeleting}
                    className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 transition-colors"
                    title="Xóa"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    )}
                  </button>
                </div>

                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-[10px] truncate font-medium">
                    #{item.generationId.slice(0, 12)}
                  </p>
                  <p className="text-white/70 text-[9px]">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString("vi-VN")
                      : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreen(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full" onClick={(e) => e.stopPropagation()}>
            {!fsError ? (
              <Image src={fullscreen} alt="Fullscreen" fill className="object-contain" />
            ) : (
              <div className="flex items-center justify-center h-full text-white/50 text-sm">
                Không thể tải ảnh
              </div>
            )}
            <button
              type="button"
              onClick={() => setFullscreen(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
