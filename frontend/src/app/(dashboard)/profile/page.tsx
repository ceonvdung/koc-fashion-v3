"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/providers/auth-provider";
import api from "@/lib/api";
import { User, Shield, Key, Copy, Check, ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Mật khẩu mới không khớp" });
      return;
    }

    setChanging(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      setMessage({ type: "success", text: "Đổi mật khẩu thành công" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Đổi mật khẩu thất bại";
      setMessage({ type: "error", text: msg });
    } finally {
      setChanging(false);
    }
  };

  const handleCopyCode = async () => {
    if (user?.affiliateCode) {
      await navigator.clipboard.writeText(user.affiliateCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại
      </button>
      <h1 className="text-2xl font-bold">Thông tin tài khoản</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-5 h-5 text-[#5B4DFF]" />
            Hồ sơ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Tên</Label>
              <p className="font-medium">{user?.name || "-"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="font-medium">{user?.email || "-"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Username</Label>
              <p className="font-medium">{user?.username || "-"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Vai trò</Label>
              <p className="font-medium flex items-center gap-1">
                <Shield className="w-4 h-4 text-[#5B4DFF]" />
                {user?.role === "super_admin" ? "Super Admin" : "User"}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Membership</Label>
              <p className="font-medium">{user?.membershipLevel === 2 ? "Level 2" : "Level 1"}</p>
            </div>
            {user?.affiliateCode && (
              <div>
                <Label className="text-xs text-muted-foreground">Mã Affiliate</Label>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">{user.affiliateCode}</code>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Sao chép"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="w-5 h-5 text-[#5B4DFF]" />
            Đổi mật khẩu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Mật khẩu hiện tại</Label>
              <Input
                id="current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">Mật khẩu mới</Label>
              <Input
                id="new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Xác nhận mật khẩu mới</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {message && (
              <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {message.text}
              </p>
            )}

            <Button
              type="submit"
              disabled={changing || !currentPassword || !newPassword || !confirmPassword}
              className="bg-[#5B4DFF] hover:bg-[#4A3FE0] text-white"
            >
              {changing ? "Đang xử lý..." : "Đổi mật khẩu"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
