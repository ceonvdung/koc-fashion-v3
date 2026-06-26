"use client";

import {
  Sparkles, Menu, X, Heart, User, LayoutDashboard,
  Users, ImageIcon, ScrollText, Settings, Gift,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/providers/auth-provider";

const mainNav = [
  { href: "/generate", label: "Tạo ảnh", icon: Sparkles },
  { href: "/history", label: "Ảnh đã tym", icon: Heart },
  { href: "/affiliate", label: "Affiliate", icon: Gift },
];

const profileNav = [
  { href: "/profile", label: "Tài khoản", icon: User },
];

const adminNav = [
  { href: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/generations", label: "Ảnh đã tạo", icon: ImageIcon },
  { href: "/admin/logs", label: "Nhật ký", icon: ScrollText },
  { href: "/admin/settings", label: "Cài đặt", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin";

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-[#0B1220] border border-white/10 text-white flex items-center justify-center"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-[#0B1220]/90 backdrop-blur-xl border-r border-white/5 flex flex-col transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-white/5">
          <Link href="/generate" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#A855F7] flex items-center justify-center shadow-lg shadow-[#8B5CF6]/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white">KOC Fashion</p>
              <p className="text-xs text-[#94A3B8]">by CEONVDUNG</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-1 text-[10px] font-semibold text-[#4A5568] uppercase tracking-widest">Main</p>
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive ? "bg-[#8B5CF6]/15 text-[#8B5CF6]" : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" /> {item.label}
              </Link>
            );
          })}

          <p className="px-3 pt-5 pb-1 text-[10px] font-semibold text-[#4A5568] uppercase tracking-widest">Tài khoản</p>
          {profileNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive ? "bg-[#8B5CF6]/15 text-[#8B5CF6]" : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" /> {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <p className="px-3 pt-5 pb-1 text-[10px] font-semibold text-[#4A5568] uppercase tracking-widest">Admin</p>
              {adminNav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href} href={item.href} onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
                      isActive ? "bg-[#8B5CF6]/15 text-[#8B5CF6]" : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className="w-5 h-5" /> {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-5 border-t border-white/5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#A855F7] flex items-center justify-center">
              <span className="text-xs font-bold text-white">{user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || "User"}</p>
              <p className="text-[10px] text-[#4A5568] truncate">{user?.email || ""}</p>
            </div>
          </div>
          <p className="text-[10px] text-[#4A5568]">v1.0.0</p>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}
    </>
  );
}
