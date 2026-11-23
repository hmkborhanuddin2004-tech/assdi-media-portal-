"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus2,
  Kanban,
  Camera,
  Calendar,
  Clock,
  BarChart3,
  Users,
  Video,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  name: string;
  bnName: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  {
    name: "Dashboard",
    bnName: "ড্যাশবোর্ড",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Requisitions",
    bnName: "রিকুইজিশন",
    href: "/coordinator/new",
    icon: FilePlus2,
  },
  {
    name: "Task Board",
    bnName: "টাস্ক বোর্ড",
    href: "/admin/tasks",
    icon: Kanban,
    badge: "6-Stage",
  },
  {
    name: "Gear Inventory",
    bnName: "গিয়ার স্টক",
    href: "/admin/gear",
    icon: Camera,
  },
  {
    name: "Master Calendar",
    bnName: "ক্যালেন্ডার",
    href: "/admin/calendar",
    icon: Calendar,
  },
  {
    name: "Daily Worklog",
    bnName: "ডেইলি লগ",
    href: "/staff/daily-log",
    icon: Clock,
  },
  {
    name: "Analytics & Reports",
    bnName: "রিপোর্ট ও হিস্ট্রি",
    href: "/admin/reports",
    icon: BarChart3,
  },
  {
    name: "User Management",
    bnName: "ইউজার কন্ট্রোল",
    href: "/admin/users",
    icon: Users,
  },
];

const mobileNavItems: NavItem[] = [
  {
    name: "Home",
    bnName: "হোম",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Request",
    bnName: "রিকুইজিশন",
    href: "/coordinator/new",
    icon: FilePlus2,
  },
  {
    name: "Tasks",
    bnName: "টাস্ক",
    href: "/admin/tasks",
    icon: Kanban,
  },
  {
    name: "Calendar",
    bnName: "ক্যালেন্ডার",
    href: "/admin/calendar",
    icon: Calendar,
  },
  {
    name: "Log",
    bnName: "লগ",
    href: "/staff/daily-log",
    icon: Clock,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col md:flex-row overflow-x-hidden">
      {/* Desktop Fixed Sidebar */}
      <aside
        id="desktop-sidebar"
        className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-40 bg-white/75 backdrop-blur-md border-r border-white/80 shadow-sm"
      >
        <div className="flex flex-col h-full">
          {/* Brand Header */}
          <div className="h-16 px-5 border-b border-slate-200/80 flex items-center gap-3 bg-gradient-to-r from-emerald-50/50 to-transparent">
            <div className="w-10 h-10 rounded-xl bg-[#0F766E] text-white flex items-center justify-center shadow-md shadow-emerald-900/10">
              <Video className="w-5 h-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-slate-900 text-sm tracking-tight">
                ASSDI Media Portal
              </span>
              <span className="text-[11px] font-medium text-[#0F766E]">
                আছ-সুন্নাহ স্কিল ইনস্টিটিউট
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
            <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              মেইন মেনু (Portal Navigation)
            </div>
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-[#0F766E] text-white shadow-sm font-semibold"
                      : "text-slate-700 hover:bg-emerald-50/70 hover:text-[#0F766E]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? "text-white"
                          : "text-slate-500 group-hover:text-[#0F766E]"
                      }`}
                    />
                    <span>{item.bnName}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? "bg-emerald-800/60 text-white"
                          : "bg-emerald-100 text-[#0F766E]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer Status Panel */}
          <div className="p-3 border-t border-slate-200 bg-slate-50/80">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white border border-slate-200/80">
              <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
              <div className="flex flex-col text-[11px] leading-tight">
                <span className="font-semibold text-slate-900">
                  Role: Central Admin
                </span>
                <span className="text-slate-500">Security Gate Active</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header (390px optimized) */}
      <header
        id="mobile-header"
        className="md:hidden sticky top-0 z-30 h-14 w-full bg-white/75 backdrop-blur-md border-b border-white/80 flex items-center justify-between px-4 shadow-xs"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0F766E] text-white flex items-center justify-center shadow-sm">
            <Video className="w-4 h-4" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-slate-900 text-xs">ASSDI Media</span>
            <span className="text-[10px] text-[#0F766E] font-medium">মিডিয়া পোর্টাল</span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer (When hamburger toggled) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-20 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border-b border-slate-200 p-4 space-y-2 max-h-[75vh] overflow-y-auto">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              সকল মেনু (All Sections)
            </div>
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm ${
                    isActive
                      ? "bg-[#0F766E] text-white font-semibold"
                      : "text-slate-700 hover:bg-emerald-50 hover:text-[#0F766E]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.bnName} ({item.name})</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main
        id="main-content"
        className="flex-1 md:pl-64 w-full max-w-full flex flex-col min-h-screen pb-20 md:pb-8 overflow-x-hidden"
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-8">
          {children}
        </div>
      </main>

      {/* Mobile 390px Fixed Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-nav"
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/75 backdrop-blur-md border-t border-white/80 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] px-1 flex items-center justify-around"
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 min-w-[56px] text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-[#0F766E] font-semibold"
                  : "text-slate-500 hover:text-[#0F766E]"
              }`}
            >
              <div
                className={`w-9 h-7 rounded-full flex items-center justify-center transition-all ${
                  isActive ? "bg-emerald-100 text-[#0F766E]" : ""
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="truncate max-w-[64px]">{item.bnName}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
