/* Hallmark · pre-emit critique: P4 H5 E4 S5 R5 V4
 * component: dashboard sidebar · genre: modern-minimal · theme: existing violet system
 * states: default · hover · focus · active · current · mobile-open
 * contrast: pass (40–41) · responsive: pass (34, 49–57) · icons: pass (30)
 */
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
import { track } from "@/lib/analytics";

/** Navigation item definition. */
interface NavItem {
  readonly key: string;
  readonly label: string;
  readonly href: string;
  readonly icon: ReactElement;
}

const JOB_NAV_ITEMS: NavItem[] = [
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
];

const OTHER_NAV_ITEMS: NavItem[] = [
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
];

const FEEDBACK_NAV_ITEM: NavItem = {
  key: "feedback",
  label: "用户反馈",
  href: "/dashboard/feedback",
  icon: <MessageSquareHeart className="h-[18px] w-[18px]" />,
};

const COPYRIGHT_YEAR = new Date().getFullYear();

function isPathActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function NavigationGroup({
  label,
  items,
  pathname,
  onNavigate,
  surface,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  surface: "desktop_sidebar" | "mobile_drawer";
}): ReactElement {
  return (
    <section aria-label={label} className="space-y-1">
      <p className="px-3 pb-1 text-[11px] font-medium text-slate-400">
        {label}
      </p>
      {items.map((item) => {
        const active = isPathActive(pathname, item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={() => {
              track("sidebar_nav_click", {
                itemKey: item.key,
                destination: item.href,
                group: label,
                surface,
              });
              onNavigate?.();
            }}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-11 items-center gap-3 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 active:bg-slate-100 ${
              active
                ? "bg-violet-50/80 text-violet-700 before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-violet-600"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span
              aria-hidden="true"
              className={active ? "text-violet-600" : "text-slate-400"}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </section>
  );
}

function FeedbackLink({
  pathname,
  onNavigate,
  surface,
}: {
  pathname: string;
  onNavigate?: () => void;
  surface: "desktop_sidebar" | "mobile_drawer";
}): ReactElement {
  const active = isPathActive(pathname, FEEDBACK_NAV_ITEM.href);
  return (
    <Link
      href={FEEDBACK_NAV_ITEM.href}
      onClick={() => {
        track("sidebar_nav_click", {
          itemKey: FEEDBACK_NAV_ITEM.key,
          destination: FEEDBACK_NAV_ITEM.href,
          group: "帮助与反馈",
          surface,
        });
        onNavigate?.();
      }}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-11 items-center gap-3 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 active:bg-slate-100 ${
        active
          ? "bg-violet-50/80 text-violet-700 before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-violet-600"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      }`}
    >
      <span
        aria-hidden="true"
        className={active ? "text-violet-600" : "text-slate-400"}
      >
        {FEEDBACK_NAV_ITEM.icon}
      </span>
      <span>{FEEDBACK_NAV_ITEM.label}</span>
    </Link>
  );
}

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

  function getDisplayName(): string {
    if (userInfo?.id && /^\d+$/.test(userInfo.id)) return `用户 ${userInfo.id}`;
    const name = userInfo?.name?.trim();
    if (name) return name;
    if (userInfo?.email) return userInfo.email;
    return "用户";
  }

  function getAvatarText(): string {
    if (userInfo?.id && /^\d+$/.test(userInfo.id)) return "用";
    return displayName.slice(0, 1);
  }

  const displayName = getDisplayName();
  const avatarText = getAvatarText();

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-100 bg-white px-4 print:hidden md:hidden">
        <Link
          href="/"
          className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
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
              <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-1">
                <NavigationGroup
                  label="求职工具"
                  items={JOB_NAV_ITEMS}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                  surface="mobile_drawer"
                />
                <NavigationGroup
                  label="其他功能"
                  items={OTHER_NAV_ITEMS}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                  surface="mobile_drawer"
                />
              </nav>
              <div className="mt-4 space-y-3 border-t border-slate-100 px-1 pt-3">
                <FeedbackLink
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                  surface="mobile_drawer"
                />
                <Link
                  href="/dashboard/membership"
                  onClick={() => {
                    track("sidebar_nav_click", {
                      itemKey: "account_card",
                      destination: "/dashboard/membership",
                      group: "账户",
                      surface: "mobile_drawer",
                    });
                    setMobileOpen(false);
                  }}
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition-colors duration-150 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 active:bg-slate-200"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                    {avatarText}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{displayName}</span>
                </Link>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </header>

      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-[200px] flex-col border-r border-slate-100 bg-white print:hidden md:flex">
        {/* Logo */}
        <div className="px-4 pb-3 pt-5">
          <Link
            href="/"
            className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            <Image
              src="/logo-aijianli.png"
              alt="智简简历"
              width={120}
              height={40}
              className="h-8 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Nav Items */}
        <nav className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 pt-3">
          <NavigationGroup
            label="求职工具"
            items={JOB_NAV_ITEMS}
            pathname={pathname}
            surface="desktop_sidebar"
          />
          <NavigationGroup
            label="其他功能"
            items={OTHER_NAV_ITEMS}
            pathname={pathname}
            surface="desktop_sidebar"
          />
        </nav>

        {/* Bottom: User Info + Copyright */}
        <div className="mt-auto px-3 pb-4 pt-3">
          <div className="mb-3 border-t border-slate-100 pt-3">
            <FeedbackLink pathname={pathname} surface="desktop_sidebar" />
          </div>

          {/* User Card with VIP upgrade for non-VIP */}
          {mounted && (
            <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70">
              {/* User Info Row */}
              <Link
                href="/dashboard/membership"
                onClick={() =>
                  track("sidebar_nav_click", {
                    itemKey: "account_card",
                    destination: "/dashboard/membership",
                    group: "账户",
                    surface: "desktop_sidebar",
                  })
                }
                className="flex min-h-14 items-center gap-2.5 px-3 py-2.5 outline-none transition-colors duration-150 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 active:bg-slate-200"
                aria-label="查看账户与会员信息"
              >
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white">
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
                  onClick={() =>
                    track("sidebar_nav_click", {
                      itemKey: "upgrade_membership",
                      destination: "/dashboard/membership",
                      group: "账户",
                      surface: "desktop_sidebar",
                    })
                  }
                  className="flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap border-t border-slate-200 bg-white px-3 py-2 text-xs font-medium text-violet-700 outline-none transition-colors duration-150 hover:bg-violet-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 active:bg-violet-100"
                >
                  <Crown className="w-3.5 h-3.5" />
                  升级会员
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
