"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, MousePointerClick, UsersRound, DollarSign, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";

export default function AffiliatePage() {
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState("");
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["affiliate-stats"],
    queryFn: async () => {
      const res = await api.get("/affiliate/stats");
      return res.data as { clicks: number; conversions: number; commissions: number };
    },
  });

  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ["affiliate-commissions"],
    queryFn: async () => {
      const res = await api.get("/affiliate/commissions");
      return res.data as any[];
    },
  });

  const [affiliateCode, setAffiliateCode] = useState("");

  useEffect(() => {
    const code = user?.affiliateCode || "KOC" + (user?.id?.slice(0, 4) || "XXXX");
    setAffiliateCode(code);
    setReferralLink(`${window.location.origin}/login?ref=${code}`);
  }, [user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Gift className="w-6 h-6 text-[#5B4DFF]" />
        <h1 className="text-2xl font-bold text-foreground">Affiliate</h1>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Link giới thiệu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-muted rounded-lg text-sm break-all">{referralLink}</code>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Mã affiliate: <strong>{affiliateCode}</strong> &mdash; Chia sẻ link này để kiếm hoa hồng.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <MousePointerClick className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lượt click</p>
              <p className="text-xl font-bold text-foreground">
                {statsLoading ? "..." : stats?.clicks ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <UsersRound className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Chuyển đổi</p>
              <p className="text-xl font-bold text-foreground">
                {statsLoading ? "..." : stats?.conversions ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hoa hồng</p>
              <p className="text-xl font-bold text-foreground">
                {statsLoading ? "..." : `$${stats?.commissions ?? 0}`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Lịch sử hoa hồng</CardTitle>
        </CardHeader>
        <CardContent>
          {commissionsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !commissions || commissions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Chưa có hoa hồng nào. Chia sẻ link giới thiệu để bắt đầu.
            </p>
          ) : (
            <div className="space-y-2">
              {commissions.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{c.sourceName}</p>
                    <p className="text-xs text-muted-foreground">{c.createdAt ? new Date(c.createdAt).toLocaleDateString("vi-VN") : ""}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">+${c.amount || 0}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
