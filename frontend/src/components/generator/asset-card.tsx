"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Upload, Trash2 } from "lucide-react";
import Image from "next/image";
import type { ImageFile } from "@/types";

interface AssetCardProps {
  value: ImageFile | null;
  onChange: (file: ImageFile | null) => void;
  label: string;
  size?: "lg" | "sm";
  required?: boolean;
  accept?: string;
}

export function AssetCard({ value, onChange, label, size = "sm", required, accept = "image/*" }: AssetCardProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (value?.preview) URL.revokeObjectURL(value.preview);
    };
  }, [value?.preview]);

  const processFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        const preview = URL.createObjectURL(file);
        onChange({ data: base64, name: file.name, type: file.type, preview });
      };
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleRemove = useCallback(() => {
    if (value?.preview) URL.revokeObjectURL(value.preview);
    onChange(null);
  }, [value, onChange]);

  const sizeClass = size === "lg" ? "w-[120px] sm:w-[120px]" : "w-[94px] sm:w-[94px]";

  if (value?.preview) {
    return (
      <div className="space-y-0.5">
        <div
          className={cn(
            "relative rounded-2xl overflow-hidden bg-[#0B1220] border border-[rgba(139,92,246,0.2)] group",
            sizeClass, "aspect-square"
          )}
          onClick={() => inputRef.current?.click()}
        >
          <Image src={value.preview} alt={label} fill className="object-cover" />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleRemove(); }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors z-10"
            aria-label="Xóa ảnh"
          >
            <Trash2 className="w-3 h-3 text-[#0B1220]" />
          </button>
        </div>
        <p className="text-[10px] text-[#94A3B8] truncate max-w-[120px]">{value.name}</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <label
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border border-solid border-[rgba(139,92,246,0.2)] cursor-pointer transition-all",
          sizeClass, "aspect-square",
          dragOver ? "border-[#8B5CF6] bg-[#8B5CF6]/5" : "hover:border-[rgba(139,92,246,0.4)] hover:bg-white/[0.02]"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-0.5">
          <Upload className="w-5 h-5 text-[#94A3B8]" />
          <span className="text-[10px] text-[#94A3B8] text-center leading-tight">
            {label}
            {required && <span className="text-red-400 ml-0.5">*</span>}
          </span>
        </div>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      </label>
    </div>
  );
}
