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

  const pageTitle = (() => {
    const matched = navItems.find((n) => pathname.startsWith(n.href));
    if (matched) return matched.name;
    if (pathname === "/") return "ASSDI Media Portal";
    return "Production Suite";
  })();

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
    <>
      {/* Vivid Blurred 3D Ambient Backdrop (design-reference.html) */}
      <div className="bg print:hidden" aria-hidden="true">
        <div className="shape s-teal" />
        <div className="shape s-cyan" />
        <div className="shape s-peach" />
        <div className="shape s-teal2" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="relative z-[1] max-w-[1560px] mx-auto md:p-4 md:grid md:grid-cols-[224px_minmax(0,1fr)] md:gap-4 min-h-screen antialiased">
        {/* Desktop Floating Glass Sidebar */}
        <aside
          id="desktop-sidebar"
          className="print:hidden hidden md:flex md:flex-col glass sticky top-4 h-[calc(100vh-32px)] p-4 z-40 overflow-hidden"
        >
          <div className="flex flex-col h-full">
            {/* Brand Header: Text ONLY matching design-reference.html */}
            <div className="px-2 pt-0.5 pb-3.5 border-b border-white/60">
              <div className="text-[19px] font-extrabold text-[#0b1f3a] tracking-tight leading-tight">
                ASSDI <span className="text-[#0f766e]">Media</span>
              </div>
              <div className="text-[10px] font-semibold text-[#33475f] uppercase tracking-[0.14em] mt-0.5">
                {user ? `${ROLE_LABELS[user.role]?.en || user.role} Suite` : "Production Suite"}
              </div>
            </div>

            {/* Navigation Links Grouped by MAIN & OPERATIONS */}
            <nav className="flex-1 pt-2 pb-2 space-y-2 overflow-y-auto no-scrollbar">
              {groupedNav.map((section) => (
                <div key={section.title} className="space-y-1">
                  <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold text-[#33475f] uppercase tracking-[0.16em]">
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
                        className={`group flex items-center justify-between px-2.5 py-2 rounded-[11px] text-[12.5px] font-medium transition-all duration-150 ${
                          isActive
                            ? "bg-[#0F766E] text-white shadow-[0_8px_18px_rgba(15,118,110,0.35)] font-semibold"
                            : "text-[#33475f] hover:bg-white/45 hover:text-[#0b1f3a]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive
                                ? "text-white"
                                : "text-[#33475f] group-hover:text-[#0f766e]"
                            }`}
                          />
                          <div className="flex flex-col text-left min-w-0">
                            <span className="font-semibold text-[12.5px] leading-snug truncate">{item.name}</span>
                            <span className={`text-[10px] truncate ${isActive ? "text-emerald-100" : "text-[#33475f]/80"}`}>
                              {item.bnName}
                            </span>
                          </div>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                              isActive
                                ? "bg-white/25 text-white"
                                : "bg-[#0f766e]/15 text-[#0b5a54]"
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
            <div className="mt-auto pt-3 border-t border-white/60 space-y-2">
              {user ? (
                <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-white/45 border border-white/75">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-white flex items-center justify-center shrink-0 font-bold text-xs border border-white/80">
                      {user.full_name?.[0] || "U"}
                    </div>
                    <div className="flex flex-col text-[11px] leading-tight truncate">
                      <span className="font-semibold text-[#0b1f3a] truncate">
                        {user.full_name}
                      </span>
                      <span className="text-[#0f766e] text-[10px] font-semibold">
                        {ROLE_LABELS[user.role]?.en || user.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    title="লগআউট"
                    className="p-1.5 rounded-md text-[#33475f] hover:text-red-600 hover:bg-white/60 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-white/45 border border-white/75">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
                    <div className="flex flex-col text-[11px] leading-tight">
                      <span className="font-semibold text-[#0b1f3a]">গেস্ট ভিজিটর</span>
                      <span className="text-[#33475f]">Security Active</span>
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
          className="print:hidden md:hidden sticky top-0 z-30 h-14 w-full bg-white/55 backdrop-blur-xl border-b border-white/75 flex items-center justify-between px-4 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/70 p-0.5 border border-white/80 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
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
              <span className="font-extrabold text-[#0b1f3a] text-xs">
                ASSDI <span className="text-[#0f766e]">Media</span>
              </span>
              <span className="text-[10px] text-[#33475f] font-semibold">
                {user ? ROLE_LABELS[user.role]?.bn : "মিডিয়া পোর্টাল"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-md text-[#33475f] hover:text-red-600 hover:bg-white/60"
                aria-label="লগআউট"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href="/login"
                className="p-1.5 rounded-md text-[#0F766E] hover:bg-white/60 text-xs font-semibold"
              >
                লগইন
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-md text-[#0b1f3a] hover:bg-white/60"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Drawer (When hamburger or More toggled) */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-14 z-30 bg-[#0b1f3a]/30 backdrop-blur-sm">
            <div className="glass m-3 p-4 space-y-2 max-h-[75vh] overflow-y-auto">
              <div className="text-[10px] font-bold text-[#33475f] uppercase tracking-wider mb-2">
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
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm ${
                      isActive
                        ? "bg-[#0F766E] text-white font-semibold shadow-sm"
                        : "text-[#0b1f3a] hover:bg-white/50 hover:text-[#0F766E]"
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
                <div className="pt-3 border-t border-white/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#0b1f3a]">
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
          className="print:p-0 print:m-0 flex-1 min-w-0 flex flex-col gap-4 px-3 py-3 md:p-0 pb-24 md:pb-6 overflow-x-hidden"
        >
          {/* Floating Glass Topbar Card (Hidden on Login, Mobile & Print) */}
          {pathname !== "/login" && user && (
            <header className="hidden md:flex items-center gap-3.5 px-4 py-3 glass print:hidden">
              <div className="min-w-0">
                <div className="text-[17px] font-bold text-[#0b1f3a] tracking-tight leading-tight truncate">
                  {pageTitle}
                </div>
                <div className="text-[11.5px] font-medium text-[#33475f] truncate">
                  ASSDI Media Management Portal
                </div>
              </div>

              {pathname !== "/admin/tasks" && pathname !== "/admin/gear" ? (
                <div className="relative ml-auto flex-1 max-w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-[#33475f] pointer-events-none" />
                  <input
                    type="text"
                    placeholder={
                      user.role === "coordinator"
                        ? "Search my requests & courses..."
                        : user.role === "staff"
                        ? "Search my assigned tasks..."
                        : user.role === "intern"
                        ? "Search my shoots & tasks..."
                        : "Search courses, gear, tasks…"
                    }
                    className="w-full h-9 pl-9 pr-3 text-[12.5px] rounded-[11px] border border-white/80 bg-white/55 text-[#0b1f3a] placeholder-[#475569] focus:outline-none focus:bg-white/75 focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-all"
                    readOnly
                  />
                </div>
              ) : (
                <div className="ml-auto" />
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="w-[38px] h-[38px] rounded-[11px] border border-white/80 bg-white/55 hover:bg-white/80 flex items-center justify-center text-[#33475f] transition-colors relative"
                  aria-label="Notifications"
                >
                  <Bell className="w-[17px] h-[17px]" />
                  <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 bg-[#dc2626] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white/90">
                    3
                  </span>
                </button>
                <div className="flex items-center gap-2.5 pl-1 cursor-pointer">
                  <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-white flex items-center justify-center font-bold text-[12.5px] shrink-0 border-2 border-white/85 shadow-[0_6px_14px_rgba(15,118,110,0.3)]">
                    {user.full_name
                      ? user.full_name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "U"}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-[12.5px] text-[#0b1f3a] leading-tight whitespace-nowrap">
                      {user.full_name}
                    </span>
                    <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#33475f] whitespace-nowrap">
                      {user.role === "admin"
                        ? "Media Manager"
                        : user.role === "coordinator"
                        ? user.course_name || "Coordinator"
                        : user.role === "staff"
                        ? "Permanent Staff"
                        : "Trainee Intern"}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#33475f] ml-0.5" />
                </div>
              </div>
            </header>
          )}
          <div className="w-full min-w-0 space-y-4">{children}</div>
        </main>

        {/* Mobile 390px Fixed Bottom Navigation Bar */}
        <nav
          id="mobile-bottom-nav"
          aria-label="Mobile Navigation"
          className="print:hidden md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/60 backdrop-blur-xl border-t border-white/80 shadow-[0_-4px_20px_rgba(11,50,60,0.08)] px-1 flex items-center justify-around"
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
                  className="flex flex-col items-center justify-center flex-1 py-1 min-w-[56px] text-[10px] font-medium text-[#33475f] hover:text-[#0F766E] transition-colors"
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
                    : "text-[#33475f] hover:text-[#0F766E]"
                }`}
              >
                <div
                  className={`w-9 h-7 rounded-full flex items-center justify-center transition-all ${
                    isActive ? "bg-[#0f766e]/15 text-[#0F766E]" : ""
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
    </>
  );
}
