"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Loader2, Save, Gauge } from "lucide-react";

export default function AdminSettingsPage() {
  const [directPercent, setDirectPercent] = useState(10);
  const [indirectPercent, setIndirectPercent] = useState(2);
  const [level1Quota, setLevel1Quota] = useState(20);
  const [level2Quota, setLevel2Quota] = useState(100);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/admin/affiliate/settings"),
      api.get("/admin/settings/quota"),
    ])
      .then(([affRes, quotaRes]) => {
        setDirectPercent(affRes.data.directCommissionPercent ?? 10);
        setIndirectPercent(affRes.data.indirectCommissionPercent ?? 2);
        setLevel1Quota(quotaRes.data.level1DailyQuota ?? 20);
        setLevel2Quota(quotaRes.data.level2DailyQuota ?? 100);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await Promise.all([
        api.put("/admin/affiliate/settings", {
          directCommissionPercent: directPercent,
          indirectCommissionPercent: indirectPercent,
        }),
        api.put("/admin/settings/quota", {
          level1DailyQuota: level1Quota,
          level2DailyQuota: level2Quota,
        }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-[#5B4DFF]" />
        <h1 className="text-2xl font-bold text-foreground">Cài đặt</h1>
      </div>

      {loading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#5B4DFF]" />
                Giới hạn sử dụng hàng ngày
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Level 1 — Daily quota (số ảnh/ngày)</Label>
                <Input
                  type="number"
                  min={-1}
                  value={level1Quota}
                  onChange={(e) => setLevel1Quota(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Nhập -1 để không giới hạn. Mặc định: 20.
                </p>
              </div>
              <div>
                <Label>Level 2 — Daily quota (số ảnh/ngày)</Label>
                <Input
                  type="number"
                  min={-1}
                  value={level2Quota}
                  onChange={(e) => setLevel2Quota(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Nhập -1 để không giới hạn. Mặc định: 100.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Hoa hồng Affiliate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Hoa hồng trực tiếp (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={directPercent}
                  onChange={(e) => setDirectPercent(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  % hoa hồng cho affiliate khi người dùng họ giới thiệu mua gói.
                </p>
              </div>
              <div>
                <Label>Hoa hồng gián tiếp (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={indirectPercent}
                  onChange={(e) => setIndirectPercent(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  % hoa hồng cho cấp trên của affiliate (cấp 2).
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Lưu
                </Button>
                {saved && (
                  <span className="text-sm text-green-600">Đã lưu!</span>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
