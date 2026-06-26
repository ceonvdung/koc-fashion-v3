"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import api from "@/lib/api";
import type { GenerationProgress } from "@/types";
import { deleteWithFeedback, type UserFeedback } from "@/server/services/input-learner";

export type ResultStatus = "idle" | "pending" | "processing" | "completed" | "failed";

export interface UseGenerationReturn {
  loading: boolean;
  resultStatus: ResultStatus;
  generationId: string | null;
  imageUrls: string[];
  totalQuantity: number;
  progress: GenerationProgress | null;
  error: string | null;
  handleGenerate: (payload: Record<string, unknown>) => Promise<void>;
  reset: () => void;
  removeImage: (index: number) => void;
  requestDeleteFeedback: (inputType: 'face' | 'outfit' | 'product' | 'scene', userId: string, feedback: UserFeedback) => void;
}

export function useGeneration(basePath: string): UseGenerationReturn {
  const [loading, setLoading] = useState(false);
  const [resultStatus, setResultStatus] = useState<ResultStatus>("idle");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [totalQuantity, setTotalQuantity] = useState<number>(0);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const abortRef = useRef(false);
  const mountedRef = useRef(true);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const clearPoll = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollGeneration = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await api.get(`/generate/${id}`);
      const gen = res.data.data || res.data;
      if (!mountedRef.current) return false;

      const imgs: string[] = Array.isArray(gen.images) ? gen.images : [];
      if (imgs.length > 0) {
        setImageUrls(imgs);
        const errorSlots = gen.metadata?.errorSlot ?? [];
        const errCount = Array.isArray(errorSlots) ? errorSlots.length : 0;
        const total = gen.quantity || imgs.length;
        const progressText = errCount > 0
          ? `Đã nhận ${imgs.filter((i: string) => !i.startsWith('ERROR_SLOT:')).length}/${total} ảnh (${errCount} slot lỗi)`
          : `Đã nhận ${imgs.length}/${total} ảnh`;
        setProgress({ progress: progressText } as any);
      }

      if (gen.status === "completed") {
        setResultStatus("completed");
        return true;
      } else if (gen.status === "failed") {
        setError(gen.metadata?.error || "Tạo ảnh thất bại");
        setResultStatus("failed");
        return true;
      }
      return false;
    } catch (err) {
      console.warn("pollGeneration failed:", err);
      const is404 = err && typeof err === 'object' && (err as any).response?.status === 404;
      return is404 ? true : false;
    }
  }, []);

  const handleGenerate = useCallback(
    async (payload: Record<string, unknown>) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      abortRef.current = false;
      setLoading(true);
      setResultStatus("pending");
      setGenerationId(null);
      setImageUrls([]);
      const total = (payload.quantity as number) ?? 2;
      setTotalQuantity(total);
      setProgress(null);
      setError(null);

      try {
        setProgress({ progress: "Đang tạo ảnh..." } as any);
        setResultStatus("processing");

        // Call /gen-batch — returns generationId immediately, generation runs in background
        const res = await api.post(`${basePath}/gen-batch`, payload);
        const data = res.data.data || res.data;

        const genId = data.generationId;
        setGenerationId(genId);

        // Poll for updates until completed or failed
        clearPoll();
        pollIntervalRef.current = setInterval(async () => {
          if (abortRef.current || !mountedRef.current) {
            clearPoll();
            return;
          }

          const done = await pollGeneration(genId);
          if (done) {
            clearPoll();
          }
        }, 1500);

      } catch (err: unknown) {
        clearPoll();
        if (!mountedRef.current) return;
        let msg = "Tạo ảnh thất bại";
        if (err && typeof err === "object" && "response" in err) {
          const axiosErr = err as { response?: { data?: { message?: string; errors?: string[] } } };
          const data = axiosErr.response?.data;
          if (data?.errors?.length) msg = data.errors.join("; ");
          else if (data?.message) msg = data.message;
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setError(msg);
        setResultStatus("failed");
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [basePath, pollGeneration, clearPoll]
  );

  const reset = useCallback(() => {
    abortRef.current = true;
    clearPoll();
    loadingRef.current = false;
    setLoading(false);
    setResultStatus("idle");
    setGenerationId(null);
    setImageUrls([]);
    setTotalQuantity(0);
    setProgress(null);
    setError(null);
  }, [clearPoll]);

  const removeImage = useCallback((index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  }, []);

  const requestDeleteFeedback = useCallback((inputType: 'face' | 'outfit' | 'product' | 'scene', userId: string, feedback: UserFeedback) => {
    deleteWithFeedback(userId, inputType, feedback);
  }, []);

  return {
    loading,
    resultStatus,
    generationId,
    imageUrls,
    totalQuantity,
    progress,
    error,
    handleGenerate,
    reset,
    removeImage,
    requestDeleteFeedback,
  };
}