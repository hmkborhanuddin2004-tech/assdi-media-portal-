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
  PAGE_TRANSITION,
  MODAL_TRANSITION,
} from "@/lib/motion";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
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
            name: "Sign In",
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
              href: "/coordinator/new",
              icon: FilePlus2,
            },
            {
              name: "My Requests",
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
              href: "/staff/tasks",
              icon: Kanban,
            },
            {
              name: "Daily Logs",
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
              href: "/intern/schedule",
              icon: Calendar,
            },
            {
              name: "Daily Logs",
              href: "/intern/daily-log",
              icon: Clock,
            },
            {
              name: "Tasks",
              href: "/intern/tasks",
              icon: Kanban,
            },
          ],
        },
        {
          title: "ACCOUNT",
          items: [
            {
              name: "Profile",
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
              href: "/admin/dashboard",
              icon: LayoutDashboard,
            },
            {
              name: "Requisitions",
              href: "/admin/requisitions",
              icon: FilePlus2,
            },
            {
              name: "Calendar",
              href: "/admin/calendar",
              icon: Calendar,
            },
            {
              name: "Task Board",
              href: "/admin/tasks",
              icon: Kanban,
            },
          ],
        },
        {
          title: "OPERATIONS",
          items: [
            {
              name: "Gear Stock",
              href: "/admin/gear",
              icon: Camera,
            },
            {
              name: "Daily Logs",
              href: "/admin/logs",
              icon: Clock,
            },
            {
              name: "Reports",
              href: "/admin/reports",
              icon: ShieldCheck,
            },
            {
              name: "Users",
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
): NavItem[] {
  if (!role) {
    return [
      { name: "Home", href: "/", icon: LayoutDashboard },
      { name: "Sign In", href: "/login", icon: LogIn },
    ];
  }

  switch (role) {
    case "coordinator":
      return [
        { name: "New Request", href: "/coordinator/new", icon: FilePlus2 },
        { name: "My Requests", href: "/coordinator/requests", icon: LayoutDashboard },
      ];
    case "staff":
      return [
        { name: "My Tasks", href: "/staff/tasks", icon: Kanban },
        { name: "Daily Log", href: "/staff/daily-log", icon: Clock },
        { name: "Interns", href: "/staff/intern-status", icon: Users },
      ];
    case "intern":
      return [
        { name: "Schedule", href: "/intern/schedule", icon: Home },
        { name: "Logs", href: "/intern/daily-log", icon: Clock },
        { name: "Tasks", href: "/intern/tasks", icon: Kanban },
        { name: "Profile", href: "/intern/profile", icon: User },
      ];
    case "admin":
    default:
      if (pathname.startsWith("/admin/gear")) {
        return [
          { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
          { name: "Requisitions", href: "/admin/requisitions", icon: FilePlus2 },
          { name: "Gear", href: "/admin/gear", icon: Camera },
          { name: "Tasks", href: "/admin/tasks", icon: Kanban },
          { name: "More", href: "#more", icon: Menu },
        ];
      }
      return [
        { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { name: "Requisitions", href: "/admin/requisitions", icon: FilePlus2 },
        { name: "Calendar", href: "/admin/calendar", icon: Calendar },
        { name: "Tasks", href: "/admin/tasks", icon: Kanban },
        { name: "More", href: "#more", icon: Menu },
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
    if (activePath === "/") return "Overview";
    return "Media Portal";
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
    setPendingPath(null);
    setNavigatingTo(null);
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);

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
      {/* Subtle 2px top progress bar during route transition */}
      {navigatingTo && (
        <div
          id="route-transition-progress"
          aria-hidden="true"
          className="fixed top-0 left-0 right-0 z-[70] h-[2px] bg-[#0F766E]/20 pointer-events-none overflow-hidden print:hidden"
        >
          <div className="h-full w-1/3 bg-[#0F766E] transition-transform duration-150" />
        </div>
      )}

      <div className="min-h-screen bg-[#FAFAFA] text-[#09090B] flex flex-col md:flex-row md:items-start antialiased">
        {/* Desktop Grounded Flat Sidebar (#F4F4F5 with 1px solid #E4E4E7 right border) */}
        <motion.aside
          id="desktop-sidebar"
          initial={false}
          animate={{ width: sidebarCollapsed ? 76 : 224 }}
          transition={PILL_TRANSITION}
          className="print:hidden hidden md:flex md:flex-col shrink-0 bg-[#F4F4F5] border-r border-[#E4E4E7] sticky top-0 h-screen z-40 relative"
        >
          {/* Collapse Toggle Button */}
          <button
            type="button"
            id="sidebar-collapse-toggle"
            onClick={toggleSidebarCollapsed}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute -right-3 top-4 z-50 w-6 h-6 rounded-full bg-white border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex items-center justify-center text-[#52525B] hover:text-[#09090B] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/30"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>

          <div className="flex flex-col h-full overflow-hidden">
            {/* Brand Header */}
            <div className="h-14 px-3.5 border-b border-[#E4E4E7] flex items-center shrink-0 overflow-hidden">
              {!sidebarCollapsed ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-white border border-[#E4E4E7] flex items-center justify-center shrink-0 overflow-hidden p-0.5">
                    <Image
                      src="/images/assdi-logo.png"
                      alt="ASSDI Logo"
                      width={20}
                      height={20}
                      className="w-full h-full object-contain"
                      priority
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-[#09090B] tracking-tight leading-none truncate">
                      ASSDI Media
                    </div>
                    <div className="text-[11px] text-[#71717A] leading-tight mt-0.5 truncate">
                      {user ? ROLE_LABELS[user.role]?.en || user.role : "Media Portal"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full flex items-center justify-center">
                  <div className="w-7 h-7 rounded-md bg-white border border-[#E4E4E7] flex items-center justify-center overflow-hidden p-0.5">
                    <Image
                      src="/images/assdi-logo.png"
                      alt="ASSDI Logo"
                      width={20}
                      height={20}
                      className="w-full h-full object-contain"
                      priority
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Single-line Navigation Links */}
            <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto no-scrollbar">
              <LayoutGroup id="assdi-sidebar">
                {groupedNav.map((section) => (
                  <div key={section.title} className="space-y-0.5">
                    {!sidebarCollapsed && (
                      <div className="px-2.5 pb-1 text-[11px] font-medium text-[#71717A] uppercase tracking-wider truncate">
                        {section.title}
                      </div>
                    )}
                    {sidebarCollapsed && <div className="my-1 border-t border-[#E4E4E7]" />}
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activePath === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={true}
                          data-active={isActive ? "true" : "false"}
                          onClick={() => handleNavigateStart(item.href)}
                          className={`group relative flex items-center h-8 px-2.5 rounded-md text-[13px] select-none transition-colors duration-150 ${
                            sidebarCollapsed ? "justify-center px-1" : "gap-2.5"
                          } ${
                            isActive
                              ? "text-[#09090B] font-medium"
                              : "text-[#52525B] hover:text-[#09090B] hover:bg-[#E4E4E7]/60"
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="sidebar-active-pill"
                              transition={PILL_TRANSITION}
                              className="absolute inset-0 rounded-md bg-white border border-[#E4E4E7] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                            >
                              <span
                                data-active-indicator="true"
                                className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#0F766E]"
                              />
                            </motion.div>
                          )}

                          <Icon
                            className={`relative z-10 w-4 h-4 shrink-0 ${
                              isActive
                                ? "text-[#0F766E]"
                                : "text-[#71717A] group-hover:text-[#09090B]"
                            }`}
                          />
                          {!sidebarCollapsed && (
                            <span className="relative z-10 truncate">{item.name}</span>
                          )}

                          {sidebarCollapsed && (
                            <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-md bg-[#09090B] text-white text-[11px] font-medium px-2 py-1 shadow-sm transition-opacity duration-150">
                              {item.name}
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </LayoutGroup>
            </nav>

            {/* Footer User Card */}
            <div className="mt-auto p-2.5 border-t border-[#E4E4E7]">
              {user ? (
                <div
                  className={`flex items-center rounded-md px-2 py-1.5 ${
                    sidebarCollapsed ? "justify-center" : "justify-between gap-2"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div
                      title={
                        sidebarCollapsed
                          ? `${user.full_name} (${ROLE_LABELS[user.role]?.en || user.role})`
                          : undefined
                      }
                      className="w-7 h-7 rounded-full bg-white border border-[#E4E4E7] text-[#09090B] flex items-center justify-center shrink-0 font-medium text-[11px]"
                    >
                      {user.full_name?.[0] || "U"}
                    </div>
                    {!sidebarCollapsed && (
                      <div className="flex flex-col text-[12px] leading-tight truncate">
                        <span className="font-medium text-[#09090B] truncate">
                          {user.full_name}
                        </span>
                        <span className="text-[#71717A] text-[11px] truncate">
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
                      title="Sign out"
                      className="p-1 rounded-md text-[#71717A] hover:text-[#DC2626] hover:bg-white disabled:opacity-50"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className={`flex items-center rounded-md px-2 py-1.5 ${
                    sidebarCollapsed ? "justify-center" : "justify-between gap-2"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="w-4 h-4 text-[#0F766E] shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="text-[12px] font-medium text-[#52525B] truncate">
                        Guest Session
                      </span>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <Link
                      href="/login"
                      prefetch={true}
                      onClick={() => handleNavigateStart("/login")}
                      className="text-[12px] font-medium text-[#0F766E] hover:underline shrink-0"
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.aside>

        {/* Mobile Header (390px) */}
        <header
          id="mobile-header"
          className="print:hidden md:hidden sticky top-0 z-30 h-14 w-full bg-white border-b border-[#E4E4E7] flex items-center justify-between px-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#FAFAFA] border border-[#E4E4E7] p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
              <Image
                src="/images/assdi-logo.png"
                alt="ASSDI Logo"
                width={24}
                height={24}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-semibold text-[#09090B] text-[13px]">ASSDI Media</span>
              <span className="text-[11px] text-[#71717A] mt-0.5">
                {user ? ROLE_LABELS[user.role]?.en : "Media Portal"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="p-2 rounded-md text-[#52525B] hover:text-[#DC2626] hover:bg-[#F4F4F5] disabled:opacity-50"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href="/login"
                prefetch={true}
                onClick={() => handleNavigateStart("/login")}
                className="px-2.5 py-1.5 rounded-md text-[#0F766E] hover:bg-[#F4F4F5] text-xs font-medium"
              >
                Sign In
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-[#09090B] hover:bg-[#F4F4F5]"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              key="mobile-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={MODAL_TRANSITION}
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 top-14 z-30 bg-[#09090B]/20"
            >
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={MODAL_TRANSITION}
                onClick={(e) => e.stopPropagation()}
                className="bg-white border border-[#E4E4E7] rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.08)] m-3 p-3 space-y-1 max-h-[75vh] overflow-y-auto"
              >
                <div className="px-2 pb-1.5 text-[11px] font-medium text-[#71717A] uppercase tracking-wider">
                  All Sections
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
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-[13px] ${
                        isActive
                          ? "bg-[#F4F4F5] text-[#09090B] font-medium border border-[#E4E4E7]"
                          : "text-[#52525B] hover:bg-[#F4F4F5] hover:text-[#09090B]"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-[#0F766E]" : "text-[#71717A]"}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}

                {user && (
                  <div className="pt-2 mt-2 border-t border-[#E4E4E7] flex items-center justify-between px-2">
                    <span className="text-xs font-medium text-[#09090B]">{user.full_name}</span>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="text-xs text-[#DC2626] hover:underline font-medium flex items-center gap-1 px-2 py-1 rounded-md"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Column */}
        <main
          id="main-content"
          className="print:p-0 print:m-0 flex-1 min-w-0 flex flex-col pb-20 md:pb-10 overflow-x-hidden"
        >
          {/* Flat Solid Topbar (Hidden on Login, Mobile & Print) */}
          {pathname !== "/login" && user && (
            <header className="relative z-30 hidden md:flex items-center justify-between gap-4 h-14 px-6 bg-white border-b border-[#E4E4E7] sticky top-0 print:hidden">
              <div className="flex items-center gap-2 text-[13px] min-w-0">
                <span className="text-[#71717A]">ASSDI Media</span>
                <span className="text-[#E4E4E7]">/</span>
                <span className="font-medium text-[#09090B] truncate">{pageTitle}</span>
              </div>

              <div className="flex items-center gap-3">
                {activePath !== "/admin/tasks" && activePath !== "/admin/gear" && (
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#71717A] pointer-events-none" />
                    <input
                      type="text"
                      placeholder={
                        user.role === "coordinator"
                          ? "Search requests..."
                          : user.role === "staff"
                          ? "Search tasks..."
                          : user.role === "intern"
                          ? "Search shoots..."
                          : "Search portal..."
                      }
                      className="w-full h-8 pl-8 pr-3 text-[12.5px] rounded-md border border-[#E4E4E7] bg-[#FAFAFA] text-[#09090B] placeholder-[#71717A] focus:outline-none focus:bg-white focus:border-[#0F766E]"
                      readOnly
                    />
                  </div>
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
                    className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]/30"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] text-[#09090B] flex items-center justify-center font-medium text-[11px] shrink-0">
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
                      <span className="font-medium text-[12.5px] text-[#09090B] leading-tight whitespace-nowrap">
                        {user.full_name}
                      </span>
                      <span className="text-[10.5px] text-[#71717A] whitespace-nowrap">
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
                      className={`w-3.5 h-3.5 text-[#71717A] transition-transform duration-150 ${
                        profileMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {profileMenuOpen && (
                      <motion.div
                        key="topbar-profile-menu-motion"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={MODAL_TRANSITION}
                        id="topbar-profile-menu"
                        role="menu"
                        aria-labelledby="topbar-profile-trigger"
                        className="bg-white border border-[#E4E4E7] rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] absolute right-0 top-[calc(100%+6px)] w-[260px] p-2 z-50 space-y-2"
                      >
                        <div className="px-2 py-1.5 space-y-1">
                          <div className="font-medium text-[13px] text-[#09090B] leading-tight truncate">
                            {user.full_name}
                          </div>
                          <div className="text-[11.5px] text-[#52525B] truncate">{user.email}</div>
                          <div className="pt-0.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F4F4F5] text-[#27272A] border border-[#E4E4E7]">
                              {ROLE_LABELS[user.role]?.en || user.role}
                            </span>
                          </div>
                          {user.role === "coordinator" && (
                            <div className="text-[11px] text-[#52525B] bg-[#FAFAFA] rounded-md px-2 py-1 border border-[#E4E4E7] truncate">
                              Course:{" "}
                              <span className="font-medium text-[#09090B]">
                                {user.course_name || "Assigned Course"}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-[#E4E4E7]" />

                        <div className="space-y-0.5">
                          <Link
                            id="topbar-profile-home-link"
                            href={homeHref}
                            prefetch={true}
                            role="menuitem"
                            onClick={() => {
                              handleNavigateStart(homeHref);
                              setProfileMenuOpen(false);
                            }}
                            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-[12.5px] font-medium text-[#09090B] hover:bg-[#F4F4F5]"
                          >
                            <LayoutDashboard className="w-3.5 h-3.5 text-[#52525B] shrink-0" />
                            <span>Dashboard</span>
                          </Link>

                          <button
                            id="topbar-profile-signout-btn"
                            type="button"
                            role="menuitem"
                            disabled={signingOut}
                            onClick={handleSignOut}
                            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-[12.5px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-50"
                          >
                            <LogOut className="w-3.5 h-3.5 shrink-0" />
                            <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </header>
          )}

          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={PAGE_TRANSITION}
            className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-5 sm:py-6 min-w-0 space-y-5 print:p-0 print:max-w-none"
          >
            {children}
          </motion.div>
        </main>

        {/* Mobile 390px Fixed Bottom Navigation Bar */}
        <nav
          id="mobile-bottom-nav"
          aria-label="Mobile Navigation"
          className="print:hidden md:hidden fixed bottom-0 left-0 right-0 z-40 h-15 bg-white border-t border-[#E4E4E7] px-1 py-1 flex items-center justify-around"
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
                    className="relative flex flex-col items-center justify-center flex-1 py-1 min-w-[56px] text-[10.5px] font-medium text-[#52525B] hover:text-[#09090B]"
                  >
                    <div
                      className={`w-8 h-6 rounded-md flex items-center justify-center ${
                        mobileMenuOpen ? "bg-[#F4F4F5] text-[#0F766E]" : ""
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="truncate max-w-[64px] mt-0.5">{item.name}</span>
                  </button>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  data-active={isActive ? "true" : "false"}
                  onClick={() => handleNavigateStart(item.href)}
                  className={`relative flex flex-col items-center justify-center flex-1 py-1 min-w-[56px] text-[10.5px] ${
                    isActive
                      ? "text-[#0F766E] font-medium"
                      : "text-[#52525B] hover:text-[#09090B]"
                  }`}
                >
                  <div className="relative w-8 h-6 flex items-center justify-center">
                    {isActive && (
                      <motion.div
                        layoutId="mobile-nav-active-pill"
                        transition={PILL_TRANSITION}
                        className="absolute inset-0 rounded-md bg-[#F4F4F5] border border-[#E4E4E7]"
                      />
                    )}
                    <Icon
                      className={`relative z-10 w-4 h-4 ${
                        isActive ? "text-[#0F766E]" : "text-[#71717A]"
                      }`}
                    />
                  </div>
                  <span className="relative z-10 truncate max-w-[64px] mt-0.5">
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
