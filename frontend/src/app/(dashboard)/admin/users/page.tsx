"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  Search,
  Loader2,
  UserCheck,
  UserX,
} from "lucide-react";
import type { User } from "@/types";

interface UserFormData {
  name: string;
  email: string;
  username: string;
  password: string;
  role: "user" | "admin" | "super_admin";
  membershipLevel: 1 | 2;
}

const defaultFormData: UserFormData = {
  name: "",
  email: "",
  username: "",
  password: "",
  role: "user",
  membershipLevel: 1,
};

function FormFields({
  form,
  setForm,
  showPassword = false,
}: {
  form: UserFormData;
  setForm: (f: UserFormData) => void;
  showPassword?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Họ tên</label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nguyễn Văn A"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
        <Input
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="user@example.com"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Username</label>
        <Input
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          placeholder="username"
        />
      </div>
      {showPassword && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Mật khẩu</label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </div>
      )}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Vai trò</label>
        <Select
          value={form.role}
          onValueChange={(v: any) => setForm({ ...form, role: v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Cấp độ</label>
        <Select
          value={String(form.membershipLevel)}
          onValueChange={(v: any) => setForm({ ...form, membershipLevel: parseInt(v) as 1 | 2 })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Level 1</SelectItem>
            <SelectItem value="2">Level 2</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormData>(defaultFormData);
  const [resetPassword, setResetPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: users, error } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await api.get("/admin/users");
      return res.data;
    },
  });

  const filtered = users
    ? users.filter(
        (u) =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase()) ||
          u.username?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const resetForm = () => setForm(defaultFormData);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await api.post("/admin/users", form);
      setCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Tạo người dùng thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await api.put(`/admin/users/${selectedUser.id}`, {
        name: form.name,
        email: form.email,
        username: form.username,
        role: form.role,
        membershipLevel: form.membershipLevel,
      });
      setEditOpen(false);
      setSelectedUser(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await api.delete(`/admin/users/${selectedUser.id}`);
      setDeleteOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Xóa thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !resetPassword) return;
    setSubmitting(true);
    try {
      await api.post(
        `/admin/users/${selectedUser.id}/reset-password`,
        { password: resetPassword }
      );
      setResetPwdOpen(false);
      setSelectedUser(null);
      setResetPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Đặt lại mật khẩu thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      username: user.username || "",
      password: "",
      role: user.role,
      membershipLevel: user.membershipLevel,
    });
    setEditOpen(true);
  };

  const openDelete = (user: User) => {
    setSelectedUser(user);
    setDeleteOpen(true);
  };

  const openResetPwd = (user: User) => {
    setSelectedUser(user);
    setResetPassword("");
    setResetPwdOpen(true);
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: "bg-purple-100 text-purple-700 border-purple-200",
      admin: "bg-blue-100 text-blue-700 border-blue-200",
      user: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return colors[role] || colors.user;
  };

  const statusIcon = (status?: string) => {
    if (status === "locked") return <UserX className="w-4 h-4 text-red-500" />;
    return <UserCheck className="w-4 h-4 text-green-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-[#5B4DFF]" />
          <h1 className="text-2xl font-bold text-foreground">Người dùng</h1>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button><Plus className="w-4 h-4" />Thêm người dùng</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Thêm người dùng</DialogTitle>
              <DialogDescription>Nhập thông tin tài khoản mới</DialogDescription>
            </DialogHeader>
            <FormFields form={form} setForm={setForm} showPassword />
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
                Hủy
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Tạo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          Không thể tải danh sách người dùng.
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Tìm kiếm theo tên, email, username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

       <Card className="border-0 shadow-sm">
         {(!users && error) ? (
           <CardContent className="p-12 flex justify-center">
             <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
           </CardContent>
         ) : filtered.length === 0 ? (
          <CardContent className="p-12 text-center text-muted-foreground">
            {search ? "Không tìm thấy người dùng phù hợp." : "Chưa có người dùng nào."}
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tên</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Username</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vai trò</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cấp độ</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trạng thái</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{user.name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.username || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={roleBadge(user.role)} variant="outline">
                        {user.role === "super_admin" ? "Super Admin" : "User"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={user.membershipLevel === 2 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-gray-50 text-gray-600 border-gray-200"}>
                        Level {user.membershipLevel}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(user.status)}
                        <span className="text-xs text-muted-foreground">
                          {user.status === "locked" ? "Khóa" : "Hoạt động"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openResetPwd(user)}
                          title="Đặt lại mật khẩu"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(user)}
                          title="Chỉnh sửa"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDelete(user)}
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
            <DialogDescription>Cập nhật thông tin cho {selectedUser?.name || selectedUser?.email}</DialogDescription>
          </DialogHeader>
          <FormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setSelectedUser(null); }}>
              Hủy
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa người dùng</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa <strong>{selectedUser?.name || selectedUser?.email}</strong>?
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setSelectedUser(null); }}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPwdOpen} onOpenChange={setResetPwdOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Đặt lại mật khẩu</DialogTitle>
            <DialogDescription>
              Nhập mật khẩu mới cho <strong>{selectedUser?.name || selectedUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="Mật khẩu mới"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetPwdOpen(false); setSelectedUser(null); }}>
              Hủy
            </Button>
            <Button onClick={handleResetPassword} disabled={submitting || !resetPassword}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Đặt lại
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
