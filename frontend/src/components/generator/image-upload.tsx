"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Upload, Trash2 } from "lucide-react";
import Image from "next/image";
import type { ImageFile } from "@/types";

interface ImageUploadProps {
  value: ImageFile | null;
  onChange: (file: ImageFile | null) => void;
  label: string;
  required?: boolean;
  compact?: boolean;
  accept?: string;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  label,
  required,
  compact,
  accept = "image/*",
  className,
}: ImageUploadProps) {
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

  if (value?.preview) {
    return (
      <div
        className={cn(
          "relative rounded-2xl border border-border overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-shadow",
          compact && !className ? "aspect-[3/4]" : "",
          compact ? "" : "aspect-[4/3]",
          className
        )}
        onClick={() => inputRef.current?.click()}
      >
        <Image src={value.preview} alt={label} fill className="object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10"
          aria-label="Xóa ảnh"
        >
          <Trash2 className="w-3.5 h-3.5 text-white" />
        </button>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-white text-[10px] truncate">{value.name}</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFile}
        />
      </div>
    );
  }

  return (
    <label
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
        compact && !className ? "aspect-[3/4]" : "",
        compact ? "" : "aspect-[4/3] p-4",
        className,
        dragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/40 hover:bg-primary/[0.03]"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <Upload className={cn("text-muted-foreground", compact ? "w-5 h-5" : "w-6 h-6")} />
      <span className={cn("text-center text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFile}
      />
    </label>
  );
}
