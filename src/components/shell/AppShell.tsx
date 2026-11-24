"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus2,
  Kanban,
  Camera,
  Calendar,
  Clock,
  Users,
  Video,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  LogIn,
} from "lucide-react";
import { ROLE_LABELS, type UserRole } from "@/lib/types/auth";

interface NavItem {
  name: string;
  bnName: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

function getNavItemsForRole(role: UserRole | undefined | null): NavItem[] {
  if (!role) {
    return [
      {
        name: "Login",
        bnName: "লগইন",
        href: "/login",
        icon: LogIn,
      },
    ];
  }

  switch (role) {
    case "coordinator":
      return [
        {
          name: "New Requisition",
          bnName: "নতুন রিকুইজিশন",
          href: "/coordinator/new",
          icon: FilePlus2,
        },
        {
          name: "My Requests",
          bnName: "আমার রিকুইজিশন",
          href: "/coordinator/requests",
          icon: LayoutDashboard,
        },
      ];
    case "staff":
      return [
        {
          name: "Tasks",
          bnName: "টাস্ক তালিকা",
          href: "/staff/tasks",
          icon: Kanban,
        },
        {
          name: "Intern Status",
          bnName: "ইন্টার্ন ট্র্যাকিং",
          href: "/staff/intern-status",
          icon: Users,
        },
        {
          name: "Daily Worklog",
          bnName: "ডেইলি কাজের লগ",
          href: "/staff/daily-log",
          icon: Clock,
        },
      ];
    case "intern":
      return [
        {
          name: "Daily Log",
          bnName: "ডেইলি কাজের লগ",
          href: "/intern/daily-log",
          icon: Clock,
        },
        {
          name: "Schedule",
          bnName: "শুটিং শিডিউল",
          href: "/intern/schedule",
          icon: Calendar,
        },
        {
          name: "Tasks",
          bnName: "অ্যাসাইনমেন্ট",
          href: "/intern/tasks",
          icon: Kanban,
        },
      ];
    case "admin":
    default:
      return [
        {
          name: "Dashboard",
          bnName: "ড্যাশবোর্ড",
          href: "/admin/dashboard",
          icon: LayoutDashboard,
        },
        {
          name: "Requisitions",
          bnName: "রিকুইজিশন",
          href: "/admin/requisitions",
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
          name: "Gear Stock",
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
          name: "Daily Logs",
          bnName: "ডেইলি লগ",
          href: "/admin/logs",
          icon: Clock,
        },
        {
          name: "Reports",
          bnName: "রিপোর্ট",
          href: "/admin/reports",
          icon: ShieldCheck,
        },
        {
          name: "User Management",
          bnName: "ইউজার কন্ট্রোল",
          href: "/admin/users",
          icon: Users,
        },
      ];
  }
}

function getMobileNavItemsForRole(role: UserRole | undefined | null): NavItem[] {
  if (!role) {
    return [
      {
        name: "Home",
        bnName: "হোম",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        name: "Login",
        bnName: "লগইন",
        href: "/login",
        icon: LogIn,
      },
    ];
  }

  switch (role) {
    case "coordinator":
      return [
        {
          name: "New Requisition",
          bnName: "নতুন রিকুইজিশন",
          href: "/coordinator/new",
          icon: FilePlus2,
        },
        {
          name: "My Requests",
          bnName: "আমার রিকুইজিশন",
          href: "/coordinator/requests",
          icon: LayoutDashboard,
        },
      ];
    case "staff":
      return [
        {
          name: "Tasks",
          bnName: "টাস্ক",
          href: "/staff/tasks",
          icon: Kanban,
        },
        {
          name: "Interns",
          bnName: "ইন্টার্ন",
          href: "/staff/intern-status",
          icon: Users,
        },
        {
          name: "Worklog",
          bnName: "ডেইলি লগ",
          href: "/staff/daily-log",
          icon: Clock,
        },
      ];
    case "intern":
      return [
        {
          name: "Daily Log",
          bnName: "ডেইলি লগ",
          href: "/intern/daily-log",
          icon: Clock,
        },
        {
          name: "Schedule",
          bnName: "শিডিউল",
          href: "/intern/schedule",
          icon: Calendar,
        },
        {
          name: "Tasks",
          bnName: "টাস্ক",
          href: "/intern/tasks",
          icon: Kanban,
        },
      ];
    case "admin":
    default:
      return [
        {
          name: "Dashboard",
          bnName: "ড্যাশবোর্ড",
          href: "/admin/dashboard",
          icon: LayoutDashboard,
        },
        {
          name: "Request",
          bnName: "রিকুইজিশন",
          href: "/admin/requisitions",
          icon: FilePlus2,
        },
        {
          name: "Gear",
          bnName: "গিয়ার",
          href: "/admin/gear",
          icon: Camera,
        },
        {
          name: "Tasks",
          bnName: "টাস্ক",
          href: "/admin/tasks",
          icon: Kanban,
        },
        {
          name: "Users",
          bnName: "ইউজার",
          href: "/admin/users",
          icon: Users,
        },
      ];
  }
}

interface CurrentUserSession {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  course_id?: string | null;
  course_name?: string | null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<CurrentUserSession | null>(null);

  const navItems = getNavItemsForRole(user?.role);
  const mobileNav = getMobileNavItemsForRole(user?.role);

  useEffect(() => {
    // Check current auth status
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };
    checkAuth();
  }, [pathname]);

  const handleSignOut = () => {
    window.location.href = "/api/auth/signout";
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row antialiased overflow-x-hidden">
      {/* Desktop Fixed Sidebar */}
      <aside
        id="desktop-sidebar"
        className="print:hidden hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-40 bg-white/75 backdrop-blur-md border-r border-white/80 shadow-sm"
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
              {user ? `${ROLE_LABELS[user.role]?.en} Menu` : "Portal Navigation"}
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
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
                    <div className="flex flex-col text-left">
                      <span className="font-semibold">{item.name}</span>
                      <span className={`text-[10px] ${isActive ? "text-emerald-100" : "text-slate-400"}`}>
                        {item.bnName}
                      </span>
                    </div>
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

          {/* User Footer Panel */}
          <div className="p-3 border-t border-slate-200 bg-slate-50/80 space-y-2">
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-white border border-slate-200/80">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-[#0F766E] flex items-center justify-center shrink-0 font-bold text-xs">
                      {user.full_name?.[0] || "U"}
                    </div>
                    <div className="flex flex-col text-[11px] leading-tight truncate">
                      <span className="font-semibold text-slate-900 truncate">
                        {user.full_name}
                      </span>
                      <span className="text-[#0F766E] text-[10px] font-medium">
                        {ROLE_LABELS[user.role]?.en || user.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    title="লগআউট"
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-white border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
                  <div className="flex flex-col text-[11px] leading-tight">
                    <span className="font-semibold text-slate-900">গেস্ট ভিজিটর</span>
                    <span className="text-slate-500">Security Active</span>
                  </div>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F766E] hover:underline"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>লগইন</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Top Header (390px optimized) */}
      <header
        id="mobile-header"
        className="print:hidden md:hidden sticky top-0 z-30 h-14 w-full bg-white/75 backdrop-blur-md border-b border-white/80 flex items-center justify-between px-4 shadow-xs"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0F766E] text-white flex items-center justify-center shadow-sm">
            <Video className="w-4 h-4" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-slate-900 text-xs">ASSDI Media</span>
            <span className="text-[10px] text-[#0F766E] font-medium">
              {user ? ROLE_LABELS[user.role]?.bn : "মিডিয়া পোর্টাল"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-slate-100"
              aria-label="লগআউট"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href="/login"
              className="p-1.5 rounded-md text-[#0F766E] hover:bg-emerald-50 text-xs font-semibold"
            >
              লগইন
            </Link>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer (When hamburger toggled) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-20 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border-b border-slate-200 p-4 space-y-2 max-h-[75vh] overflow-y-auto">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              সকল মেনু (All Sections)
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
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

            {user && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                  লগইন: {user.full_name}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-xs text-red-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>লগআউট</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main
        id="main-content"
        className="flex-1 md:pl-64 print:pl-0 print:pb-0 w-full max-w-full flex flex-col min-h-screen pb-20 md:pb-8 overflow-x-hidden"
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-8 print:p-0 print:m-0 print:max-w-full">
          {children}
        </div>
      </main>

      {/* Mobile 390px Fixed Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-nav"
        aria-label="Mobile Navigation"
        className="print:hidden md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/75 backdrop-blur-md border-t border-white/80 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] px-1 flex items-center justify-around"
      >
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
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
              <span className="truncate max-w-[64px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
