"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, Trash2, Loader2, Expand, Download } from "lucide-react";
import type { Generation } from "@/types";

const RATIO_CLASS: Record<string, string> = {
  '1:1': 'aspect-square',
  '3:4': 'aspect-[3/4]',
  '4:5': 'aspect-[4/5]',
  '9:16': 'aspect-[9/16]',
  '16:9': 'aspect-[16/9]',
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    completed: "bg-green-100 text-green-700 border-green-200",
    processing: "bg-blue-100 text-blue-700 border-blue-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    failed: "bg-red-100 text-red-700 border-red-200",
  };
  return map[status] || "bg-gray-100 text-gray-700 border-gray-200";
};

function handleDownloadAll(urls: string[]) {
  urls.forEach((url, i) => {
    setTimeout(() => {
      const a = document.createElement("a");
      a.href = url;
      a.download = `koc-image-${i + 1}.png`;
      a.click();
    }, i * 300);
  });
}

const statusLabel: Record<string, string> = {
  completed: "Hoàn thành",
  processing: "Đang xử lý",
  pending: "Chờ xử lý",
  failed: "Thất bại",
};

interface ImageItem {
  url: string;
  genId: string;
  scene: string | null;
  status: string;
  ratio: string;
  createdAt: string;
  imgIdx: number;
  gen: Generation;
}

function ImageCard({ item, onDelete }: { item: ImageItem; onDelete: (genId: string, imgIdx: number) => void }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const aspectClass = RATIO_CLASS[item.ratio] || 'aspect-[3/4]';
  const isBase64 = item.url.startsWith('data:');
  const imageSrc = isBase64 ? item.url : item.url;

  return (
    <>
      <div
        className="relative group rounded-2xl overflow-hidden border border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        onMouseEnter={() => setShowDelete(true)}
        onMouseLeave={() => setShowDelete(false)}
      >
        <div className={`${aspectClass} relative cursor-pointer`} onClick={() => setFullscreen(true)}>
          {isBase64 ? (
            <img src={imageSrc} alt={`Gen ${item.genId} #${item.imgIdx + 1}`} className="object-cover w-full h-full" />
          ) : (
            <Image src={imageSrc} alt={`Gen ${item.genId} #${item.imgIdx + 1}`} fill className="object-cover" />
          )}
        </div>

        <div className="absolute top-0 inset-x-0 p-2 flex items-start justify-between">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusBadge(item.status)}`}>
            {statusLabel[item.status] || item.status}
          </Badge>
          {showDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 bg-red-500/90 hover:bg-red-500 rounded-lg"
              onClick={(e) => { e.stopPropagation(); onDelete(item.genId, item.imgIdx); }}
            >
              <Trash2 className="w-3 h-3 text-white" />
            </Button>
          )}
        </div>

        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <p className="text-white text-[10px] truncate font-medium">#{item.genId.slice(0, 12)}</p>
          <p className="text-white/70 text-[9px] truncate">{item.scene || "Không rõ"} · {new Date(item.createdAt).toLocaleDateString("vi-VN")}</p>
        </div>

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors pointer-events-auto"
            title="Xem toàn màn hình"
          >
            <Expand className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const a = document.createElement("a");
              a.href = item.url;
              a.download = `koc-${item.genId}-${item.imgIdx + 1}.png`;
              a.click();
            }}
            className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors pointer-events-auto"
            title="Tải xuống"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setFullscreen(false)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full" onClick={(e) => e.stopPropagation()}>
            {isBase64 ? (
              <img src={item.url} alt={`Gen ${item.genId} #${item.imgIdx + 1}`} className="object-contain w-full h-full" />
            ) : (
              <Image src={item.url} alt={`Gen ${item.genId} #${item.imgIdx + 1}`} fill className="object-contain" />
            )}
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
}

export default function AdminGenerationsPage() {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-generations"],
    queryFn: async () => {
      const res = await api.get("/admin/generations?page=1&limit=50");
      const body = res.data as { data: Generation[]; total: number };
      return body.data || [];
    },
  });

  const getImages = (gen: Generation): string[] => {
    if (Array.isArray(gen.images)) return gen.images;
    if (typeof gen.images === "string") {
      try {
        const parsed = JSON.parse(gen.images);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const allImages = useMemo(() => {
    if (!data) return [];
    return data
      .flatMap((gen) =>
        getImages(gen).map((url, imgIdx) => ({
          url,
          genId: gen.id,
          scene: gen.scene,
          status: gen.status,
          ratio: gen.ratio || "3:4",
          createdAt: gen.createdAt,
          imgIdx,
          gen,
        }))
      );
  }, [data]);

  const handleDelete = async () => {
    if (!selectedId || selectedImageIndex === null) return;
    setDeleteOpen(false);
    setDeleting(true);
    try {
      await api.delete(`/admin/generations/${selectedId}/images/${selectedImageIndex}`);
      setSelectedId(null);
      setSelectedImageIndex(null);
      queryClient.invalidateQueries({ queryKey: ["admin-generations"] });
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Xóa thất bại");
      setSelectedId(null);
      setSelectedImageIndex(null);
    } finally {
      setDeleting(false);
    }
  };

  const openDelete = (genId: string, imgIdx: number) => {
    setSelectedId(genId);
    setSelectedImageIndex(imgIdx);
    setDeleteOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ImageIcon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Ảnh đã tạo</h1>
        <span className="text-sm text-muted-foreground">
          {allImages.length} ảnh
        </span>
        {allImages.length > 0 && (
          <button
            type="button"
            onClick={() => handleDownloadAll(allImages.map(i => i.url))}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Tải tất cả ({allImages.length})
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          Không thể tải danh sách.
        </div>
      )}

      {isLoading ? (
        <div className="p-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Chưa có generation nào.
          </CardContent>
        </Card>
      ) : allImages.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Các generation chưa có ảnh.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {allImages.map((item) => (
            <ImageCard key={`${item.genId}-${item.imgIdx}`} item={item} onDelete={openDelete} />
          ))}
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa ảnh</DialogTitle>
            <DialogDescription>
              Ảnh này sẽ bị xóa. Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setSelectedId(null); setSelectedImageIndex(null); }}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
