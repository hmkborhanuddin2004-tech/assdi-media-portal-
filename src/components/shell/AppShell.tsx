"use client";

import React, { useState, useEffect, useRef } from "react";
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup, MotionConfig } from "framer-motion";
import { ROLE_HOME_ROUTES, ROLE_LABELS, type UserRole } from "@/lib/types/auth";
import {
  PILL_TRANSITION,
  HOVER_PILL_TRANSITION,
  PAGE_TRANSITION,
  MODAL_TRANSITION,
} from "@/lib/motion";

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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUserSession | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);

  const activePath = pendingPath || pathname;
  const groupedNav = getGroupedNavItemsForRole(user?.role);
  const navItems = getNavItemsForRole(user?.role);
  const mobileNav = getMobileNavItemsForRole(user?.role, activePath);
  const homeHref = user ? ROLE_HOME_ROUTES[user.role] || "/" : "/";

  const pageTitle = (() => {
    const matched = navItems.find((n) => activePath.startsWith(n.href));
    if (matched) return matched.name;
    if (activePath === "/") return "ASSDI Media Portal";
    return "Production Suite";
  })();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("assdi_sidebar_collapsed");
      if (saved !== null) {
        setSidebarCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("assdi_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    // Reset transient overlays, optimistic active path, and progress bar when route completes
    setPendingPath(null);
    setNavigatingTo(null);
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);

    // Check current auth status without unnecessary state churn when unchanged
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser((prev) =>
            prev &&
            prev.id === data.user.id &&
            prev.role === data.user.role &&
            prev.full_name === data.user.full_name &&
            prev.course_name === data.user.course_name
              ? prev
              : data.user
          );
        } else {
          setUser(null);
        }
      } catch {
        setUser((prev) => prev);
      }
    };
    checkAuth();
  }, [pathname]);

  useEffect(() => {
    if (!navigatingTo && !pendingPath) return;
    const timer = setTimeout(() => {
      setNavigatingTo(null);
      setPendingPath(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigatingTo, pendingPath]);

  useEffect(() => {
    if (!profileMenuOpen && !mobileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        profileMenuOpen &&
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (profileMenuOpen) {
          setProfileMenuOpen(false);
          profileTriggerRef.current?.focus();
        }
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen, mobileMenuOpen]);

  const handleNavigateStart = (href: string) => {
    if (href && !href.startsWith("#") && href !== pathname) {
      setPendingPath(href);
      setNavigatingTo(href);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    try {
      const res = await fetch("/api/auth/signout", { method: "POST" });
      if (res.ok) {
        setUser(null);
        window.location.assign("/login");
        return;
      }
    } catch {
      // Fallback to GET signout endpoint
    }
    window.location.assign("/api/auth/signout");
  };

  return (
    <MotionConfig reducedMotion="user">
      {/* Subtle Top Route-Transition Progress Bar */}
      {navigatingTo && (
        <div
          id="route-transition-progress"
          aria-hidden="true"
          className="fixed top-0 left-0 right-0 z-[70] h-[3px] bg-transparent pointer-events-none overflow-hidden print:hidden"
        >
          <div className="h-full w-1/2 bg-gradient-to-r from-[#14b8a6] via-[#0f766e] to-[#22d3ee] rounded-r-full route-progress-bar shadow-[0_0_10px_rgba(15,118,110,0.45)]" />
        </div>
      )}

      {/* Soft Airy 3D Ambient Backdrop */}
      <div className="bg print:hidden" aria-hidden="true">
        <div className="shape s-teal" />
        <div className="shape s-cyan" />
        <div className="shape s-peach" />
        <div className="shape s-teal2" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div
        className="relative z-[1] max-w-[1560px] mx-auto md:p-4 flex flex-col md:flex-row md:items-start md:gap-4 min-h-screen antialiased"
      >
        {/* Desktop Floating Glass Sidebar */}
        <motion.aside
          id="desktop-sidebar"
          initial={false}
          animate={{ width: sidebarCollapsed ? 76 : 224 }}
          transition={PILL_TRANSITION}
          className="print:hidden hidden md:flex md:flex-col shrink-0 glass sticky top-4 h-[calc(100vh-32px)] p-3 z-40 relative"
        >
          {/* Floating Circular Collapse Toggle Button */}
          <button
            type="button"
            id="sidebar-collapse-toggle"
            onClick={toggleSidebarCollapsed}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute -right-3 top-5 z-50 w-6 h-6 rounded-full bg-white/95 border border-white/85 shadow-[0_2px_8px_rgba(15,35,50,0.14)] flex items-center justify-center text-[#33475f] hover:text-[#0f766e] hover:bg-white transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/40 cursor-pointer"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>

          <div className="flex flex-col h-full overflow-hidden">
            {/* Brand Header */}
            <div className="px-1 pt-0.5 pb-3 border-b border-white/60 overflow-hidden">
              <AnimatePresence initial={false} mode="wait">
                {!sidebarCollapsed ? (
                  <motion.div
                    key="brand-expanded"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="text-[19px] font-extrabold text-[#0b1f3a] tracking-tight leading-tight truncate">
                      ASSDI <span className="text-[#0f766e]">Media</span>
                    </div>
                    <div className="text-[10px] font-semibold text-[#33475f] uppercase tracking-[0.14em] mt-0.5 truncate">
                      {user ? `${ROLE_LABELS[user.role]?.en || user.role} Suite` : "Production Suite"}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="brand-collapsed"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center justify-center py-0.5"
                  >
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-white flex items-center justify-center font-extrabold text-xs shadow-xs border border-white/80">
                      AM
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation Links Grouped by MAIN & OPERATIONS with Zero-Bounce Gliding Active & Hover Pill */}
            <nav
              onMouseLeave={() => setHoveredNav(null)}
              className="flex-1 pt-2 pb-2 space-y-2 overflow-y-auto no-scrollbar"
            >
              <LayoutGroup id="assdi-sidebar">
                {groupedNav.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <AnimatePresence initial={false}>
                      {!sidebarCollapsed && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                          className="px-2.5 pt-2 pb-1 text-[10px] font-bold text-[#33475f] uppercase tracking-[0.16em] truncate"
                        >
                          {section.title}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {sidebarCollapsed && <div className="my-1.5 border-t border-white/40" />}
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activePath === item.href;
                      const isHovered = hoveredNav === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={true}
                          onMouseEnter={() => setHoveredNav(item.href)}
                          onClick={() => handleNavigateStart(item.href)}
                          className={`group relative flex items-center justify-between px-2.5 py-2 rounded-[11px] text-[12.5px] font-medium transition-colors select-none ${
                            isActive ? "bg-[#0F766E]/0" : ""
                          } ${
                            sidebarCollapsed ? "justify-center px-1" : ""
                          }`}
                        >
                          {/* Active Gliding Background Pill */}
                          {isActive && (
                            <motion.div
                              layoutId="sidebar-active-pill"
                              transition={PILL_TRANSITION}
                              className="absolute inset-0 rounded-[11px] bg-[#0F766E] shadow-[0_8px_18px_rgba(15,118,110,0.32)]"
                            />
                          )}

                          {/* Hover Gliding Highlight Pill */}
                          {!isActive && isHovered && (
                            <motion.div
                              layoutId="sidebar-hover-pill"
                              transition={HOVER_PILL_TRANSITION}
                              className="absolute inset-0 rounded-[11px] bg-white/55 border border-white/75"
                            />
                          )}

                          {/* Content */}
                          <div
                            className={`relative z-10 flex items-center gap-2.5 min-w-0 ${
                              sidebarCollapsed ? "justify-center" : ""
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 shrink-0 transition-colors ${
                                isActive
                                  ? "text-white"
                                  : "text-[#33475f] group-hover:text-[#0f766e]"
                              }`}
                            />
                            {!sidebarCollapsed && (
                              <div className="flex flex-col text-left min-w-0">
                                <span
                                  className={`font-semibold text-[12.5px] leading-snug truncate ${
                                    isActive ? "text-white" : "text-[#0b1f3a]"
                                  }`}
                                >
                                  {item.name}
                                </span>
                                <span
                                  className={`text-[10px] truncate ${
                                    isActive ? "text-emerald-100" : "text-[#33475f]/80"
                                  }`}
                                >
                                  {item.bnName}
                                </span>
                              </div>
                            )}
                          </div>

                          {!sidebarCollapsed && item.badge && (
                            <span
                              className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                                isActive
                                  ? "bg-white/25 text-white"
                                  : "bg-[#0f766e]/15 text-[#0b5a54]"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}

                          {/* Tooltip on hover when collapsed */}
                          {sidebarCollapsed && (
                            <div className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 pointer-events-none absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg bg-slate-900/95 text-white text-[11px] font-semibold px-2.5 py-1.5 shadow-xl backdrop-blur-md transition-all duration-150 border border-white/10">
                              {item.name} <span className="opacity-75">({item.bnName})</span>
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </LayoutGroup>
            </nav>

            {/* User Footer Panel */}
            <div className="mt-auto pt-3 border-t border-white/60">
              {user ? (
                <div
                  className={`flex items-center gap-2 rounded-xl bg-white/45 border border-white/75 ${
                    sidebarCollapsed ? "p-1.5 justify-center" : "px-2.5 py-2 justify-between"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div
                      title={
                        sidebarCollapsed
                          ? `${user.full_name} (${ROLE_LABELS[user.role]?.en || user.role})`
                          : undefined
                      }
                      className="w-7 h-7 rounded-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-white flex items-center justify-center shrink-0 font-bold text-xs border border-white/80 cursor-default"
                    >
                      {user.full_name?.[0] || "U"}
                    </div>
                    {!sidebarCollapsed && (
                      <div className="flex flex-col text-[11px] leading-tight truncate">
                        <span className="font-semibold text-[#0b1f3a] truncate">
                          {user.full_name}
                        </span>
                        <span className="text-[#0f766e] text-[10px] font-semibold">
                          {ROLE_LABELS[user.role]?.en || user.role}
                        </span>
                      </div>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={signingOut}
                      title="লগআউট"
                      className="p-1.5 rounded-md text-[#33475f] hover:text-red-600 hover:bg-white/65 disabled:opacity-60 transition-all duration-200 ease-out active:scale-[0.98]"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className={`flex items-center gap-2 rounded-xl bg-white/55 border border-white/80 ${
                    sidebarCollapsed ? "p-1.5 justify-center" : "px-2.5 py-2 justify-between"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
                    {!sidebarCollapsed && (
                      <div className="flex flex-col text-[11px] leading-tight">
                        <span className="font-semibold text-[#0b1f3a]">গেস্ট ভিজিটর</span>
                        <span className="text-[#33475f]">Security Active</span>
                      </div>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <Link
                      href="/login"
                      prefetch={true}
                      onClick={() => handleNavigateStart("/login")}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F766E] hover:underline transition-all duration-200 ease-out active:scale-[0.98]"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>লগইন</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.aside>

        {/* Mobile Top Header (390px optimized) */}
        <header
          id="mobile-header"
          className="print:hidden md:hidden sticky top-0 z-30 h-14 w-full bg-white/65 backdrop-blur-2xl border-b border-white/85 flex items-center justify-between px-4 shadow-[0_6px_20px_rgba(15,35,50,0.06)]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/75 p-0.5 border border-white/85 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
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
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="p-1.5 rounded-md text-[#33475f] hover:text-red-600 hover:bg-white/65 disabled:opacity-60 transition-all duration-200 ease-out active:scale-[0.98]"
                aria-label="লগআউট"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href="/login"
                prefetch={true}
                onClick={() => handleNavigateStart("/login")}
                className="p-1.5 rounded-md text-[#0F766E] hover:bg-white/65 text-xs font-semibold transition-all duration-200 ease-out active:scale-[0.98]"
              >
                লগইন
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-md text-[#0b1f3a] hover:bg-white/65 transition-all duration-200 ease-out active:scale-[0.98]"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Drawer (When hamburger or More toggled) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              key="mobile-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={MODAL_TRANSITION}
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 top-14 z-30 bg-[#0b1f3a]/25 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.985, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.985, y: 6 }}
                transition={MODAL_TRANSITION}
                onClick={(e) => e.stopPropagation()}
                className="glass-popover m-3 p-4 space-y-2 max-h-[75vh] overflow-y-auto"
              >
                <div className="text-[10px] font-bold text-[#33475f] uppercase tracking-wider mb-2">
                  সকল মেনু (All Sections)
                </div>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePath === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onClick={() => {
                        handleNavigateStart(item.href);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ease-out active:scale-[0.98] ${
                        isActive
                          ? "bg-[#0F766E] text-white font-semibold shadow-sm"
                          : "text-[#0b1f3a] hover:bg-white/60 hover:text-[#0F766E]"
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
                      type="button"
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="text-xs text-red-600 hover:underline font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all duration-200 ease-out active:scale-[0.98]"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>লগআউট</span>
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main
          id="main-content"
          className="print:p-0 print:m-0 flex-1 min-w-0 flex flex-col gap-4 px-3 py-3 md:p-0 pb-24 md:pb-6 overflow-x-hidden"
        >
          {/* Floating Glass Topbar Card (Hidden on Login, Mobile & Print) */}
          {pathname !== "/login" && user && (
            <header className="relative z-30 hidden md:flex items-center gap-3.5 px-4 py-3 glass print:hidden">
              <div className="min-w-0">
                <div className="text-[17px] font-bold text-[#0b1f3a] tracking-tight leading-tight truncate">
                  {pageTitle}
                </div>
                <div className="text-[11.5px] font-medium text-[#33475f] truncate">
                  ASSDI Media Management Portal
                </div>
              </div>

              {activePath !== "/admin/tasks" && activePath !== "/admin/gear" ? (
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
                    className="w-full h-9 pl-9 pr-3 text-[12.5px] rounded-[11px] border border-white/85 bg-white/60 text-[#0b1f3a] placeholder-[#475569] focus:outline-none focus:bg-white/80 focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20 transition-all duration-200 ease-out"
                    readOnly
                  />
                </div>
              ) : (
                <div className="ml-auto" />
              )}

              <div className="relative" ref={profileMenuRef}>
                <button
                  ref={profileTriggerRef}
                  id="topbar-profile-trigger"
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                  aria-controls="topbar-profile-menu"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2.5 px-2 py-1 rounded-xl hover:bg-white/60 transition-all duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/40"
                >
                  <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-white flex items-center justify-center font-bold text-[12.5px] shrink-0 border-2 border-white/85 shadow-[0_6px_14px_rgba(15,118,110,0.28)]">
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
                        ? "Media Head"
                        : user.role === "coordinator"
                        ? user.course_name || "Coordinator"
                        : user.role === "staff"
                        ? "Permanent Staff"
                        : "Trainee Intern"}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#33475f] ml-0.5 transition-transform duration-200 ease-out ${
                      profileMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {profileMenuOpen && (
                    <motion.div
                      key="topbar-profile-menu-motion"
                      initial={{ opacity: 0, scale: 0.985, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.985, y: -4 }}
                      transition={MODAL_TRANSITION}
                      id="topbar-profile-menu"
                      role="menu"
                      aria-labelledby="topbar-profile-trigger"
                      className="glass-popover absolute right-0 top-[calc(100%+10px)] w-[272px] p-3 z-50 space-y-2.5 shadow-[0_16px_36px_rgba(15,35,50,0.16)]"
                    >
                      <div className="px-2 py-1 space-y-1.5">
                        <div className="font-bold text-[13px] text-[#0b1f3a] leading-tight truncate">
                          {user.full_name}
                        </div>
                        <div className="text-[11.5px] font-medium text-[#33475f] truncate">
                          {user.email}
                        </div>
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#0f766e]/12 text-[#0b5a54] border border-[#0f766e]/20">
                            {ROLE_LABELS[user.role]?.en || user.role}
                          </span>
                        </div>
                        {user.role === "coordinator" && (
                          <div className="text-[11px] font-medium text-[#33475f] bg-slate-900/[0.04] rounded-lg px-2 py-1 border border-white/80 truncate">
                            Course:{" "}
                            <span className="font-semibold text-[#0b1f3a]">
                              {user.course_name || "Assigned Course"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-slate-200/75" />

                      <div className="space-y-1">
                        <Link
                          id="topbar-profile-home-link"
                          href={homeHref}
                          prefetch={true}
                          role="menuitem"
                          onClick={() => {
                            handleNavigateStart(homeHref);
                            setProfileMenuOpen(false);
                          }}
                          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-[12.5px] font-semibold text-[#0b1f3a] hover:bg-white/75 hover:text-[#0f766e] transition-all duration-200 ease-out active:scale-[0.98]"
                        >
                          <LayoutDashboard className="w-4 h-4 text-[#0f766e] shrink-0" />
                          <span>Dashboard / হোম</span>
                        </Link>

                        <button
                          id="topbar-profile-signout-btn"
                          type="button"
                          role="menuitem"
                          disabled={signingOut}
                          onClick={handleSignOut}
                          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-[12.5px] font-semibold text-red-700 hover:bg-red-500/10 hover:text-red-800 disabled:opacity-60 transition-all duration-200 ease-out active:scale-[0.98]"
                        >
                          <LogOut className="w-4 h-4 shrink-0" />
                          <span>{signingOut ? "Signing out..." : "Sign Out / লগআউট"}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </header>
          )}
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={PAGE_TRANSITION}
            className="w-full min-w-0 space-y-4"
          >
            {children}
          </motion.div>
        </main>

        {/* Mobile 390px Fixed Bottom Navigation Bar */}
        <nav
          id="mobile-bottom-nav"
          aria-label="Mobile Navigation"
          className="print:hidden md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/65 backdrop-blur-2xl border-t border-white/85 shadow-[0_-4px_20px_rgba(15,35,50,0.06)] px-1 flex items-center justify-around"
        >
          <LayoutGroup id="assdi-mobile-nav">
            {mobileNav.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.href;
              if (item.href === "#more") {
                return (
                  <button
                    type="button"
                    key="mobile-nav-more"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-expanded={mobileMenuOpen}
                    className="relative flex flex-col items-center justify-center flex-1 py-1 min-w-[56px] text-[10px] font-medium text-[#33475f] hover:text-[#0F766E] transition-all duration-200 ease-out active:scale-[0.98]"
                  >
                    <div
                      className={`relative w-9 h-7 rounded-full flex items-center justify-center transition-all duration-200 ease-out ${
                        mobileMenuOpen ? "bg-[#0f766e]/15 text-[#0F766E]" : ""
                      }`}
                    >
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
                  prefetch={true}
                  onClick={() => handleNavigateStart(item.href)}
                  className={`relative flex flex-col items-center justify-center flex-1 py-1 min-w-[56px] text-[10px] font-medium transition-all duration-200 ease-out active:scale-[0.98] ${
                    isActive
                      ? "text-[#0F766E] font-semibold"
                      : "text-[#33475f] hover:text-[#0F766E]"
                  }`}
                >
                  <div className="relative w-9 h-7 flex items-center justify-center">
                    {isActive && (
                      <motion.div
                        layoutId="mobile-nav-active-pill"
                        transition={PILL_TRANSITION}
                        className="absolute inset-0 rounded-full bg-[#0f766e]/15 border border-[#0f766e]/20"
                      />
                    )}
                    <Icon className={`relative z-10 w-4 h-4 transition-colors ${isActive ? "text-[#0F766E]" : "text-[#33475f]"}`} />
                  </div>
                  <span className={`relative z-10 truncate max-w-[64px] font-medium ${isActive ? "text-[#0F766E] font-semibold" : "text-[#33475f]"}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </LayoutGroup>
        </nav>
      </div>
    </MotionConfig>
  );
}
