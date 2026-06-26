"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sparkles, Camera, Crown, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/generator/image-upload";
import { AssetCard } from "@/components/generator/asset-card";
import { ResultWorkspace } from "@/components/generator/result-workspace";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useGeneration } from "@/hooks/use-generation";
import { useAuth } from "@/providers/auth-provider";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  SCENE_LEVEL_1_OPTIONS,
  SCENE_LEVEL_2_MAP,
  PRODUCT_ACTION_PRESETS,
  INTERACTION_PRESETS,
  CAMERA_ANGLES,
  QUANTITIES,
  PRODUCT_INTERACTION_EXAMPLES,
  type ImageFile,
} from "@/types";

const TAB_OPTIONS = [
  { value: "1", label: "1 Nhân vật" },
  { value: "2", label: "2 Nhân vật" },
];

const RATIO_OPTIONS = [
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
];

export default function GeneratePage() {
  const [tab, setTab] = useState("1");
  const { user } = useAuth();
  const isLevel2 = user?.membershipLevel === 2;

  const [faceRef1, setFaceRef1] = useState<ImageFile | null>(null);
  const [outfitRef1, setOutfitRef1] = useState<ImageFile | null>(null);
  const [productRef1, setProductRef1] = useState<ImageFile | null>(null);

  const [faceRef2, setFaceRef2] = useState<ImageFile | null>(null);
  const [outfitRef2, setOutfitRef2] = useState<ImageFile | null>(null);
  const [productRef2, setProductRef2] = useState<ImageFile | null>(null);

  const [sceneCombo, setSceneCombo] = useState("");
  const [sceneLevel3, setSceneLevel3] = useState("");
  const [sceneRef, setSceneRef] = useState<ImageFile | null>(null);

  const [productAction1_1, setProductAction1_1] = useState("");
  const [productAction1_2, setProductAction1_2] = useState("");
  const [productAction2_1, setProductAction2_1] = useState("");
  const [productAction2_2, setProductAction2_2] = useState("");

  const [interaction_1, setInteraction_1] = useState("");
  const [interaction_2, setInteraction_2] = useState("");

  const [camera, setCamera] = useState("");
  const [ratio, setRatio] = useState("9:16");
  const [quantity, setQuantity] = useState(4);

  const endpoint = tab === "1" ? "/generate/single" : "/generate/two";
  const gen = useGeneration(endpoint);

  const canGenerate = tab === "1"
    ? !!faceRef1
    : !!faceRef1 && !!faceRef2;

  const handleGenerate = useCallback(() => {
    if (!canGenerate || gen.loading) return;

    const payload: Record<string, unknown> = {};

    if (faceRef1) payload.faceRef1 = faceRef1;
    if (outfitRef1) payload.outfitRef1 = outfitRef1;
    if (productRef1) payload.productRef1 = productRef1;

    if (tab === "2") {
      if (faceRef2) payload.faceRef2 = faceRef2;
      if (outfitRef2) payload.outfitRef2 = outfitRef2;
      if (productRef2) payload.productRef2 = productRef2;
    }

    if (sceneRef) payload.sceneRef = sceneRef;
    if (sceneCombo) {
      const parts = sceneCombo.split(" / ");
      payload.sceneLevel1 = parts[0];
      payload.sceneLevel2 = parts[1] || "";
    }
    if (sceneLevel3) payload.sceneLevel3 = sceneLevel3;

    if (productAction1_1) payload.productAction1_1 = productAction1_1;
    if (productAction1_2) payload.productAction1_2 = productAction1_2;
    if (tab === "2") {
      if (productAction2_1) payload.productAction2_1 = productAction2_1;
      if (productAction2_2) payload.productAction2_2 = productAction2_2;
    }

    if (tab === "1") {
      if (interaction_2) payload.interaction_2 = interaction_2;
    } else {
      if (interaction_1) payload.interaction_1 = interaction_1;
      if (interaction_2) payload.interaction_2 = interaction_2;
    }

    payload.camera = camera || "";
    payload.ratio = ratio;
    payload.quantity = quantity;

    gen.handleGenerate(payload);
  }, [
    canGenerate, gen, tab,
    faceRef1, outfitRef1, productRef1,
    faceRef2, outfitRef2, productRef2,
    sceneRef, sceneCombo, sceneLevel3,
    productAction1_1, productAction1_2,
    productAction2_1, productAction2_2,
    interaction_1, interaction_2,
    camera, ratio, quantity,
  ]);

  const handleDeleteImage = useCallback(
    async (index: number, _genId: string) => {
      if (!gen.generationId) return;
      gen.removeImage(index);
      api.delete(`/generate/${gen.generationId}/images/${index}`).catch(() => toast.error("Xóa ảnh thất bại"));
    },
    [gen.generationId, gen.removeImage]
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-7.5rem)]">
      <div className="w-full lg:w-[48%] shrink-0 overflow-y-auto">
        <Card className="border border-white/5 shadow-sm rounded-2xl bg-[#0B1220]">
          <CardContent className="p-2.5">
            <div className="space-y-2">
              <SegmentedControl
                options={TAB_OPTIONS}
                value={tab}
                onValueChange={(v) => { if (!(v === "2" && !isLevel2)) setTab(v); }}
              />

              {!isLevel2 && tab === "2" && (
                <Card className="border border-[rgba(139,92,246,0.3)] bg-[#1E1B2E]">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-[#8B5CF6]" />
                      <span className="font-semibold text-white text-sm">Nâng cấp lên Level 2</span>
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                      Tính năng <strong className="text-white">2 Nhân vật</strong> yêu cầu membership Level 2.
                    </p>
                    <ul className="text-xs text-[#94A3B8] space-y-1">
                      <li className="flex items-center gap-1.5"><span className="text-[#8B5CF6]">•</span> Tạo ảnh với 2 nhân vật trong cùng khung hình</li>
                      <li className="flex items-center gap-1.5"><span className="text-[#8B5CF6]">•</span> Tương tác giữa 2 nhân vật</li>
                      <li className="flex items-center gap-1.5"><span className="text-[#8B5CF6]">•</span> Mỗi nhân vật có face/outfit/product riêng</li>
                    </ul>
                    <div className="flex items-center gap-2 text-xs text-[#8B5CF6]">
                      <Mail className="w-3.5 h-3.5" />
                      <span>Liên hệ Admin để nâng cấp</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {tab === "1" && (
                <div className="space-y-2">
                  <CharacterSection
                    title="Nhân vật 1"
                    badgeColor="from-[#8B5CF6] to-[#A855F7]"
                    face={faceRef1} onFaceChange={setFaceRef1}
                    outfit={outfitRef1} onOutfitChange={setOutfitRef1}
                    product={productRef1} onProductChange={setProductRef1}
                    faceRequired
                    actionValue={productAction1_1}
                    onActionChange={setProductAction1_1}
                    actionOptions={PRODUCT_ACTION_PRESETS}
                    actionPlaceholder="Chọn kiểu hành động"
                    textValue={interaction_2}
                    onTextChange={setInteraction_2}
                    textPlaceholder={PRODUCT_INTERACTION_EXAMPLES[0]}
                  />

                  <SceneSection
                    combo={sceneCombo} onComboChange={setSceneCombo}
                    level3={sceneLevel3} onLevel3Change={setSceneLevel3}
                    sceneRef={sceneRef} onSceneRefChange={setSceneRef}
                  />

                  <CameraSection
                    camera={camera} onCameraChange={setCamera}
                    ratio={ratio} onRatioChange={setRatio}
                    quantity={quantity} onQuantityChange={setQuantity}
                  />

                  <Button
                    className="sticky bottom-0 w-full h-12 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:from-[#6D28D9] hover:to-[#9333EA] text-white gap-2 rounded-xl text-base font-semibold shadow-lg shadow-[#8B5CF6]/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#8B5CF6]/30"
                    disabled={!canGenerate || gen.loading}
                    onClick={handleGenerate}
                  >
                    {gen.loading ? (
                      <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang tạo...</>
                    ) : (
                      <><Sparkles className="w-5 h-5" /> GEN ẢNH</>
                    )}
                  </Button>
                </div>
              )}

              {tab === "2" && (
                <div className="space-y-1">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    <CharacterSection
                      title="Nhân vật 1"
                      badgeColor="from-[#8B5CF6] to-[#A855F7]"
                      face={faceRef1} onFaceChange={setFaceRef1}
                      outfit={outfitRef1} onOutfitChange={setOutfitRef1}
                      product={productRef1} onProductChange={setProductRef1}
                      faceRequired
                      faceSize="sm"
                      actionValue={productAction1_1}
                      onActionChange={setProductAction1_1}
                      actionOptions={PRODUCT_ACTION_PRESETS}
                      actionPlaceholder="NV1 - Hành động"
                      textValue={productAction1_2}
                      onTextChange={setProductAction1_2}
                      textPlaceholder="Mô tả chi tiết..."
                      isTextarea
                    >
                      <div className="flex items-center gap-2 mt-auto -mb-3">
                        <span className="text-xs font-semibold text-zinc-400">Tương tác giữa 2 NV</span>
                      </div>
                    </CharacterSection>

                    <CharacterSection
                      title="Nhân vật 2"
                      badgeColor="from-[#818CF8] to-[#A78BFA]"
                      face={faceRef2} onFaceChange={setFaceRef2}
                      outfit={outfitRef2} onOutfitChange={setOutfitRef2}
                      product={productRef2} onProductChange={setProductRef2}
                      faceRequired
                      faceSize="sm"
                      actionValue={productAction2_1}
                      onActionChange={setProductAction2_1}
                      actionOptions={PRODUCT_ACTION_PRESETS}
                      actionPlaceholder="NV2 - Hành động"
                      textValue={productAction2_2}
                      onTextChange={setProductAction2_2}
                      textPlaceholder="Mô tả chi tiết..."
                      isTextarea
                    />
                  </div>

                  <div className="flex gap-2">
                    <Select value={interaction_1} onValueChange={(v) => { if (v) setInteraction_1(v); }}>
                      <SelectTrigger className="w-[160px] shrink-0 bg-[#1E1B2E] border-white/5 text-white h-9">
                        <SelectValue placeholder="Chọn kiểu" />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERACTION_PRESETS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Mô tả chi tiết (tùy chọn)"
                      value={interaction_2}
                      onChange={(e) => setInteraction_2(e.target.value)}
                      className="flex-1 bg-[#1E1B2E] border-white/5 text-white placeholder:text-[#4A5568] h-9"
                    />
                  </div>

                  <SceneSection
                    combo={sceneCombo} onComboChange={setSceneCombo}
                    level3={sceneLevel3} onLevel3Change={setSceneLevel3}
                    sceneRef={sceneRef} onSceneRefChange={setSceneRef}
                  />

                  <CameraSection
                    camera={camera} onCameraChange={setCamera}
                    ratio={ratio} onRatioChange={setRatio}
                    quantity={quantity} onQuantityChange={setQuantity}
                  />

                  <Button
                    className="sticky bottom-0 w-full h-11 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:from-[#6D28D9] hover:to-[#9333EA] text-white gap-2 rounded-xl text-base font-semibold shadow-lg shadow-[#8B5CF6]/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#8B5CF6]/30"
                    disabled={!canGenerate || gen.loading}
                    onClick={handleGenerate}
                  >
                    {gen.loading ? (
                      <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang tạo...</>
                    ) : (
                      <><Sparkles className="w-5 h-5" /> GEN ẢNH</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ResultWorkspace
        status={gen.resultStatus}
        imageUrls={gen.imageUrls}
        generationId={gen.generationId}
        totalQuantity={gen.totalQuantity}
        ratio={ratio}
        progress={gen.progress}
        error={gen.error}
        onDeleteImage={handleDeleteImage}
      />
    </div>
  );
}

/* ─── Sub-components ─── */

function CharacterSection({
  title, badgeColor,
  face, onFaceChange,
  outfit, onOutfitChange,
  product, onProductChange,
  faceRequired, faceSize,
  actionValue, onActionChange,
  actionOptions, actionPlaceholder,
  textValue, onTextChange, textPlaceholder,
  isTextarea,
  children,
}: {
  title: string;
  badgeColor: string;
  face: ImageFile | null; onFaceChange: (v: ImageFile | null) => void;
  outfit: ImageFile | null; onOutfitChange: (v: ImageFile | null) => void;
  product: ImageFile | null; onProductChange: (v: ImageFile | null) => void;
  faceRequired?: boolean;
  faceSize?: "lg" | "sm";
  actionValue?: string;
  onActionChange?: (v: string) => void;
  actionOptions?: readonly { value: string; label: string }[];
  actionPlaceholder?: string;
  textValue?: string;
  onTextChange?: (v: string) => void;
  textPlaceholder?: string;
  isTextarea?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Card className="border border-white/5 rounded-2xl bg-[#0B1220]">
      <CardContent className="p-2.5 space-y-0.5 flex flex-col flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r", badgeColor)}>
            {title}
          </span>
        </div>
        <div className="flex gap-1.5 items-start">
          <AssetCard value={face} onChange={onFaceChange} label="Face" size={faceSize || "lg"} required={faceRequired} />
          <AssetCard value={outfit} onChange={onOutfitChange} label="Outfit" size="sm" />
          <AssetCard value={product} onChange={onProductChange} label="Product" size="sm" />
        </div>
        {onActionChange && (
          <div className="flex gap-1.5 pt-1">
            <Select value={actionValue} onValueChange={(v) => { if (v) onActionChange(v); }}>
              <SelectTrigger className="bg-[#1E1B2E] border-white/5 text-white h-9 w-[160px] shrink-0">
                <SelectValue placeholder={actionPlaceholder || "Chọn hành động"} />
              </SelectTrigger>
              <SelectContent>
                {actionOptions?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isTextarea ? (
            <Textarea
              value={textValue}
              onChange={(e) => onTextChange?.(e.target.value)}
              placeholder={textPlaceholder}
              rows={1}
              className="flex-1 bg-[#1E1B2E] border-white/5 text-white placeholder:text-[#4A5568] resize-none h-9"
            />
          ) : (
            <Input
              value={textValue}
              onChange={(e) => onTextChange?.(e.target.value)}
              placeholder={textPlaceholder}
              className="flex-1 bg-[#1E1B2E] border-white/5 text-white placeholder:text-[#4A5568] h-9"
            />
          )}
        </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

function SceneSection({
  combo, onComboChange,
  level3, onLevel3Change,
  sceneRef, onSceneRefChange,
}: {
  combo: string; onComboChange: (v: string) => void;
  level3: string; onLevel3Change: (v: string) => void;
  sceneRef: ImageFile | null; onSceneRefChange: (v: ImageFile | null) => void;
}) {
  const combinedOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (const cat of SCENE_LEVEL_1_OPTIONS) {
      const spaces = SCENE_LEVEL_2_MAP[cat.value];
      if (spaces) {
        for (const space of spaces) {
          options.push({ value: `${cat.value} / ${space}`, label: `${cat.label} / ${space}` });
        }
      }
    }
    return options;
  }, []);

  return (
    <Card className="border border-white/5 rounded-2xl bg-[#0B1220]">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-[#8B5CF6]" />
          <span className="text-sm font-semibold text-white">Bối cảnh</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <div className="w-full sm:w-[40%] shrink-0 flex justify-center">
                    <ImageUpload
                      value={sceneRef}
                      onChange={onSceneRefChange}
                      label="Ảnh tham khảo"
                      accept="image/jpeg,image/png,image/webp"
                      compact
                      className="w-[100px] aspect-square"
                    />
          </div>
          <div className="w-full sm:w-[60%] space-y-1">
            <Select value={combo} onValueChange={(v) => { if (v) onComboChange(v); }}>
              <SelectTrigger className="bg-[#1E1B2E] border-white/5 text-white">
                <SelectValue placeholder="Chọn bối cảnh" />
              </SelectTrigger>
              <SelectContent>
                {combinedOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Mô tả chi tiết bối cảnh (tùy chọn)..."
              value={level3}
              onChange={(e) => onLevel3Change(e.target.value)}
              rows={1}
              className="bg-[#1E1B2E] border-white/5 text-white placeholder:text-[#4A5568] resize-none"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CameraSection({
  camera, onCameraChange,
  ratio, onRatioChange,
  quantity, onQuantityChange,
}: {
  camera: string; onCameraChange: (v: string) => void;
  ratio: string; onRatioChange: (v: string) => void;
  quantity: number; onQuantityChange: (v: number) => void;
}) {
  return (
    <Card className="border border-white/5 rounded-2xl bg-[#0B1220]">
      <CardContent className="p-3 space-y-2">
        <Label className="text-sm font-semibold text-white">Camera</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] font-medium text-[#94A3B8]">Góc chụp</Label>
            <Select value={camera} onValueChange={(v) => { if (v) onCameraChange(v); }}>
              <SelectTrigger className="bg-[#1E1B2E] border-white/5 text-white">
                <SelectValue placeholder="Chọn góc chụp" />
              </SelectTrigger>
              <SelectContent>
                {CAMERA_ANGLES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] font-medium text-[#94A3B8]">Tỷ lệ ảnh</Label>
            <SegmentedControl options={RATIO_OPTIONS} value={ratio} onValueChange={onRatioChange} />
          </div>
          <div className="w-full sm:w-[120px] space-y-1">
            <Label className="text-[10px] font-medium text-[#94A3B8]">Số lượng</Label>
            <Select value={String(quantity)} onValueChange={(v) => { if (v) onQuantityChange(Number(v)); }}>
              <SelectTrigger className="bg-[#1E1B2E] border-white/5 text-white">
                <SelectValue placeholder="Chọn số lượng" />
              </SelectTrigger>
              <SelectContent>
                {QUANTITIES.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} ảnh</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
