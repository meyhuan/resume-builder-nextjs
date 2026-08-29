"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Crown,
  Download,
  FileText,
  Menu,
  MessageSquareHeart,
  Sparkles,
  UserRoundPen,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { useState, useEffect } from "react";
import { VipExpirationReminder } from "@/components/vip/vip-expiration-reminder";

/** Navigation item definition. */
interface NavItem {
  readonly key: string;
  readonly label: string;
  readonly href: string;
  readonly icon: ReactElement;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "resume",
    label: "我的简历",
    href: "/dashboard",
    icon: <FileText className="w-[18px] h-[18px]" />,
  },
  {
    key: "application-profile",
    label: "网申资料",
    href: "/dashboard/application-profile",
    icon: <UserRoundPen className="w-[18px] h-[18px]" />,
  },
  {
    key: "applications",
    label: "投递管理",
    href: "/dashboard/applications",
    icon: <ClipboardList className="w-[18px] h-[18px]" />,
  },
  {
    key: "exports",
    label: "导出记录",
    href: "/dashboard/exports",
    icon: <Download className="w-[18px] h-[18px]" />,
  },
  {
    key: "membership",
    label: "会员中心",
    href: "/dashboard/membership",
    icon: <Sparkles className="w-[18px] h-[18px]" />,
  },
  {
    key: "feedback",
    label: "用户反馈",
    href: "/dashboard/feedback",
    icon: <MessageSquareHeart className="w-[18px] h-[18px]" />,
  },
];

const BRAND_COLOR = "#4F46E5";
const COPYRIGHT_YEAR = new Date().getFullYear();

/**
 * Dashboard sidebar — fixed left navigation panel.
 * Matches the UP resume dashboard style with logo, nav items, user info, and copyright.
 */
export default function DashboardSidebar(): ReactElement {
  const pathname = usePathname();
  const { userInfo } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  function getDisplayName(): string {
    if (userInfo?.id && /^\d+$/.test(userInfo.id)) return `用户_${userInfo.id}`;
    const name = userInfo?.name?.trim();
    if (name) return name;
    if (userInfo?.email) return userInfo.email;
    return "用户";
  }

  function getAvatarText(): string {
    if (userInfo?.id && /^\d+$/.test(userInfo.id)) return userInfo.id.slice(-2);
    return displayName.slice(0, 1);
  }

  const displayName = getDisplayName();
  const avatarText = getAvatarText();

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-100 bg-white px-4 print:hidden md:hidden">
        <Link href="/" className="block">
          <Image
            src="/logo-aijianli.png"
            alt="智简简历"
            width={120}
            height={40}
            className="h-8 w-auto object-contain"
          />
        </Link>

        <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="打开导航菜单"
            >
              <Menu className="h-5 w-5" />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[1px] md:hidden" />
            <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(86vw,320px)] flex-col bg-white p-4 shadow-2xl focus:outline-none md:hidden">
              <div className="flex h-12 items-center justify-between px-2">
                <Dialog.Title className="text-base font-semibold text-slate-900">
                  功能导航
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    aria-label="关闭导航菜单"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>
              <nav className="mt-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-indigo-50 text-indigo-600"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                    >
                      <span
                        className={
                          active ? "text-indigo-500" : "text-slate-400"
                        }
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <Link
                href="/dashboard/membership"
                className="mt-auto flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {avatarText}
                </span>
                <span className="min-w-0 flex-1 truncate">{displayName}</span>
              </Link>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </header>

      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-[200px] flex-col border-r border-slate-100 bg-white print:hidden md:flex">
        {/* Logo */}
        <div className="px-5 pt-6 pb-4">
          <Link href="/" className="block">
            <Image
              src="/logo-aijianli.png"
              alt="智简简历"
              width={120}
              height={40}
              className="h-9 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 pt-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`
                flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 text-[14px] font-medium transition-colors duration-150
                ${
                  active
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }
              `}
              >
                <span className={active ? "text-indigo-500" : "text-slate-400"}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: User Info + Copyright */}
        <div className="px-3 pb-4 mt-auto">
          {/* User Card with VIP upgrade for non-VIP */}
          {mounted && (
            <div className="rounded-xl bg-slate-50 mb-3 overflow-hidden">
              {/* User Info Row */}
              <Link
                href="/dashboard/membership"
                className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-slate-100/70"
                aria-label="查看账户与会员信息"
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND_COLOR}, #7C3AED)`,
                  }}
                >
                  {userInfo?.avatar ? (
                    <Image
                      src={userInfo.avatar}
                      alt={displayName}
                      width={36}
                      height={36}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold tabular-nums">
                      {avatarText}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {displayName}
                    </p>
                    {userInfo?.vip?.isVip && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] font-bold">
                        <Crown className="w-3 h-3" />
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {userInfo?.vip?.isVip
                      ? "VIP 会员"
                      : userInfo?.integral !== undefined
                        ? `积分 ${userInfo.integral}`
                        : "免费用户"}
                  </p>
                </div>
              </Link>
              {/* VIP Upgrade Row for non-VIP */}
              {!userInfo?.vip?.isVip && (
                <Link
                  href="/dashboard/membership"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 bg-rose-50/80 hover:bg-rose-50 border-t border-slate-100/50 transition-colors"
                >
                  <Crown className="w-3.5 h-3.5" />
                  升级 VIP · 解锁无限
                </Link>
              )}
            </div>
          )}

          {/* Copyright */}
          <p className="text-[11px] text-slate-300 px-4">
            @智简简历 {COPYRIGHT_YEAR}
          </p>
        </div>

        <VipExpirationReminder
          isVip={userInfo?.vip?.isVip ?? false}
          vipExpireTime={userInfo?.vip?.vipExpireTime ?? null}
        />
      </aside>
    </>
  );
}
