"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus2,
  Kanban,
  Camera,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  LogIn,
  Home,
  User,
  Search,
  Bell,
  ChevronDown,
} from "lucide-react";
import { ROLE_LABELS, type UserRole } from "@/lib/types/auth";

interface NavItem {
  name: string;
  bnName: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function getGroupedNavItemsForRole(role: UserRole | undefined | null): NavSection[] {
  if (!role) {
    return [
      {
        title: "MAIN",
        items: [
          {
            name: "Login",
            bnName: "লগইন",
            href: "/login",
            icon: LogIn,
          },
        ],
      },
    ];
  }

  switch (role) {
    case "coordinator":
      return [
        {
          title: "MAIN",
          items: [
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
          ],
        },
      ];
    case "staff":
      return [
        {
          title: "MAIN",
          items: [
            {
              name: "My Tasks",
              bnName: "মাই টাস্ক",
              href: "/staff/tasks",
              icon: Kanban,
            },
            {
              name: "Daily Logs",
              bnName: "ডেইলি লগ",
              href: "/staff/daily-log",
              icon: Clock,
            },
          ],
        },
        {
          title: "OPERATIONS",
          items: [
            {
              name: "Intern Status",
              bnName: "ইন্টার্ন ট্র্যাকিং",
              href: "/staff/intern-status",
              icon: Users,
            },
          ],
        },
      ];
    case "intern":
      return [
        {
          title: "MAIN",
          items: [
            {
              name: "Schedule",
              bnName: "শুটিং শিডিউল",
              href: "/intern/schedule",
              icon: Calendar,
            },
            {
              name: "Daily Logs",
              bnName: "ডেইলি কাজের লগ",
              href: "/intern/daily-log",
              icon: Clock,
            },
            {
              name: "Tasks",
              bnName: "অ্যাসাইনমেন্ট",
              href: "/intern/tasks",
              icon: Kanban,
            },
          ],
        },
        {
          title: "OPERATIONS",
          items: [
            {
              name: "Profile",
              bnName: "প্রোফাইল",
              href: "/intern/profile",
              icon: User,
            },
          ],
        },
      ];
    case "admin":
    default:
      return [
        {
          title: "MAIN",
          items: [
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
              name: "Master Calendar",
              bnName: "ক্যালেন্ডার",
              href: "/admin/calendar",
              icon: Calendar,
            },
            {
              name: "Task Board",
              bnName: "টাস্ক বোর্ড",
              href: "/admin/tasks",
              icon: Kanban,
              badge: "6-Stage",
            },
          ],
        },
        {
          title: "OPERATIONS",
          items: [
            {
              name: "Gear Stock",
              bnName: "গিয়ার স্টক",
              href: "/admin/gear",
              icon: Camera,
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
          ],
        },
      ];
  }
}

function getNavItemsForRole(role: UserRole | undefined | null): NavItem[] {
  return getGroupedNavItemsForRole(role).flatMap((section) => section.items);
}

function getMobileNavItemsForRole(
  role: UserRole | undefined | null,
  pathname: string = ""
): (NavItem & { onClick?: () => void })[] {
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
          name: "New Request",
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
          name: "My Tasks",
          bnName: "টাস্ক",
          href: "/staff/tasks",
          icon: Kanban,
        },
        {
          name: "Daily Log",
          bnName: "ডেইলি লগ",
          href: "/staff/daily-log",
          icon: Clock,
        },
        {
          name: "Intern Logs",
          bnName: "ইন্টার্ন",
          href: "/staff/intern-status",
          icon: Users,
        },
      ];
    case "intern":
      return [
        {
          name: "Home",
          bnName: "হোম",
          href: "/intern/schedule",
          icon: Home,
        },
        {
          name: "Logs",
          bnName: "লগ",
          href: "/intern/daily-log",
          icon: Clock,
        },
        {
          name: "Tasks",
          bnName: "টাস্ক",
          href: "/intern/tasks",
          icon: Kanban,
        },
        {
          name: "Profile",
          bnName: "প্রোফাইল",
          href: "/intern/profile",
          icon: User,
        },
      ];
    case "admin":
    default:
      if (pathname.startsWith("/admin/gear")) {
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
            name: "More",
            bnName: "আরও",
            href: "#more",
            icon: Menu,
          },
        ];
      }
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
          name: "Calendar",
          bnName: "ক্যালেন্ডার",
          href: "/admin/calendar",
          icon: Calendar,
        },
        {
          name: "Tasks",
          bnName: "টাস্ক",
          href: "/admin/tasks",
          icon: Kanban,
        },
        {
          name: "More",
          bnName: "আরও",
          href: "#more",
          icon: Menu,
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

  const groupedNav = getGroupedNavItemsForRole(user?.role);
  const navItems = getNavItemsForRole(user?.role);
  const mobileNav = getMobileNavItemsForRole(user?.role, pathname);

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
    <div className="min-h-screen bg-transparent flex flex-col md:flex-row antialiased overflow-x-hidden">
      {/* Desktop Fixed Sidebar */}
      <aside
        id="desktop-sidebar"
        className="print:hidden hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-40 bg-white/75 backdrop-blur-md border-r border-white/80 shadow-sm"
      >
        <div className="flex flex-col h-full">
          {/* Brand Header: Text ONLY, No Logo Icon */}
          <div className="h-16 px-5 border-b border-slate-200/80 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-transparent">
            <div className="flex flex-col leading-tight">
              <span className="font-extrabold text-[#0F172A] text-lg tracking-tight">
                ASSDI Media
              </span>
              <span className="text-[10px] font-semibold text-[#0F766E] uppercase tracking-wider">
                {user ? `${ROLE_LABELS[user.role]?.en || user.role}` : "Central Portal"}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#0F766E] text-[10px] font-bold">
              HQ
            </span>
          </div>

          {/* Navigation Links Grouped by MAIN & OPERATIONS */}
          <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto no-scrollbar">
            {groupedNav.map((section) => (
              <div key={section.title} className="space-y-1">
                <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-[#0F766E] text-white shadow-sm font-semibold"
                          : "text-slate-700 hover:bg-emerald-50/70 hover:text-[#0F766E]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            isActive
                              ? "text-white"
                              : "text-slate-500 group-hover:text-[#0F766E]"
                          }`}
                        />
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-xs leading-snug">{item.name}</span>
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
              </div>
            ))}
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
          <div className="w-8 h-8 rounded-lg bg-white p-0.5 border border-emerald-100 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
            <Image
              src="/images/assdi-logo.png"
              alt="ASSDI Logo"
              width={28}
              height={28}
              className="w-full h-full object-contain"
              priority
            />
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
          {/* Executive Desktop Top Navigation Bar (Hidden on Login, Mobile & Print) */}
          {pathname !== "/login" && user && (
            <header className="hidden md:flex items-center justify-between gap-4 mb-6 print:hidden">
              {pathname !== "/admin/tasks" && pathname !== "/admin/gear" ? (
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={
                      user.role === "coordinator"
                        ? "Search my requests & courses..."
                        : user.role === "staff"
                        ? "Search my assigned tasks..."
                        : user.role === "intern"
                        ? "Search my shoots & tasks..."
                        : "Search requisitions, gear, staff, tasks..."
                    }
                    className="w-full pl-10 pr-4 py-2 text-xs rounded-xl glass-panel text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] transition-all"
                    readOnly
                  />
                </div>
              ) : (
                <div className="flex-1 max-w-md" />
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="w-9 h-9 rounded-xl glass-panel flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors relative"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#0F766E] text-white text-[9px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                    3
                  </span>
                </button>
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl glass-panel text-xs cursor-pointer hover:bg-white/90 transition-all">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-[#0F766E] flex items-center justify-center font-bold text-xs shrink-0">
                    {user.full_name?.[0] || "U"}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-slate-900 leading-tight">
                      {user.role === "admin"
                        ? "Media Head"
                        : user.role === "coordinator"
                        ? `Coordinator · ${user.course_name || "Art of Creation"}`
                        : user.role === "staff"
                        ? `${user.full_name?.split(" ")[0] || "Arif"} · Permanent Staff`
                        : user.role === "intern"
                        ? `${user.full_name?.split(" ")[0] || "Hasan"} · Trainee`
                        : "User"}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
                </div>
              </div>
            </header>
          )}
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
          if (item.href === "#more") {
            return (
              <button
                type="button"
                key="mobile-nav-more"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex flex-col items-center justify-center flex-1 py-1 min-w-[56px] text-[10px] font-medium text-slate-500 hover:text-[#0F766E] transition-colors"
              >
                <div className="w-9 h-7 rounded-full flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="truncate max-w-[64px]">{item.name}</span>
              </button>
            );
          }
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
