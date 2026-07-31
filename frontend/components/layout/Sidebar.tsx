"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FolderOpen, History, Settings, Shield,
  ChevronLeft, ChevronRight, Database, LogOut, Plus, Sparkles, CreditCard, UserRound, X, Wand2, ArrowRightLeft, Wrench, ChevronDown
} from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { cn, initials } from "@/lib/utils";

interface SidebarProps {
  page: string;
  onNavigate: (p: string) => void;
}

const toolsItems = [
  { id: "quick-convert", label: "Quick Convert", icon: Sparkles,     badge: "Image → SQL",  badgeColor: "text-primary-500 bg-primary-50 dark:bg-primary-900/30" },
  { id: "generate",      label: "Generate",      icon: Wand2,         badge: "Text → SQL",   badgeColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30" },
  { id: "migrate",       label: "Migrator",      icon: ArrowRightLeft, badge: "SQL → SQL",   badgeColor: "text-violet-600 bg-violet-50 dark:bg-violet-900/30" },
];

const mainNav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects",  label: "Projects",  icon: FolderOpen },
  { id: "history",   label: "History",   icon: History },
  { id: "pricing",   label: "Pricing",   icon: CreditCard },
  { id: "profile",   label: "Profile",   icon: UserRound },
];

export default function Sidebar({ page, onNavigate }: SidebarProps) {
  const { user, sidebarCollapsed, setSidebarCollapsed, logout, projects: allProjects } = useStore();
  const [mobileOpen, setMobileOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(
    ["quick-convert", "generate", "migrate"].includes(page)
  );
  const projects = allProjects.filter(p => p.ownerId === (user?.id ?? ""));
  const isAdmin = user?.role === "admin";
  const width = sidebarCollapsed ? 64 : 220;

  const isToolPage = ["quick-convert", "generate", "migrate"].includes(page);

  const handleNavigate = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <motion.aside
      animate={{ width }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "sidebar fixed left-0 top-0 bottom-0 z-30 flex flex-col bg-[var(--card)] border-r border-[var(--border)] overflow-hidden",
        mobileOpen && "mobile-sidebar-open"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-[57px] px-3 border-b border-[var(--border)] flex-shrink-0 gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
          <Database size={15} className="text-white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-8}} transition={{duration:0.2}}>
              <p className="font-bold text-[14px] text-[var(--text)] whitespace-nowrap">ER AI Studio</p>
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={() => setMobileOpen(false)} className="mobile-sidebar-close" aria-label="Close navigation">
          <X size={17} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {/* New Project quick-action */}
        <button
          onClick={() => handleNavigate("projects")}
          title="New Project"
          className={cn(
            "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl mb-2 text-sm font-semibold transition-all",
            "bg-primary-600 text-white hover:bg-primary-700"
          )}
        >
          <Plus size={15} className="flex-shrink-0" />
          {!sidebarCollapsed && <span>New Project</span>}
        </button>

        {/* Dashboard */}
        <button
          onClick={() => handleNavigate("dashboard")}
          title="Dashboard"
          className={cn("w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all",
            page === "dashboard"
              ? "bg-[var(--primary-light)] text-primary-600"
              : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
          )}
        >
          <LayoutDashboard size={16} className="flex-shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Dashboard</span>}
        </button>

        {/* ── Tools accordion ── */}
        <div>
          <button
            onClick={() => {
              if (sidebarCollapsed) {
                // expand sidebar first, then open tools
                setSidebarCollapsed(false);
                setToolsOpen(true);
              } else {
                setToolsOpen((o) => !o);
              }
            }}
            title="Tools"
            className={cn(
              "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all",
              isToolPage
                ? "bg-[var(--primary-light)] text-primary-600"
                : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
            )}
          >
            <Wrench size={16} className="flex-shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 truncate text-left">Tools</span>
                <motion.span
                  animate={{ rotate: toolsOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={13} />
                </motion.span>
              </>
            )}
          </button>

          <AnimatePresence initial={false}>
            {toolsOpen && !sidebarCollapsed && (
              <motion.div
                key="tools-dropdown"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-1 ml-3 pl-3 border-l-2 border-[var(--border)] space-y-0.5 pb-1">
                  {toolsItems.map(({ id, label, icon: Icon, badge, badgeColor }) => (
                    <button
                      key={id}
                      onClick={() => handleNavigate(id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group",
                        page === id
                          ? "bg-[var(--primary-light)] text-primary-600"
                          : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
                      )}
                    >
                      <Icon size={14} className="flex-shrink-0" />
                      <span className="flex-1 truncate text-left">{label}</span>
                      <span className={cn(
                        "text-[9px] font-semibold px-1.5 py-0.5 rounded hidden group-hover:inline-block",
                        page === id ? "inline-block" : "",
                        badgeColor
                      )}>
                        {badge}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Rest of nav */}
        {mainNav.filter(n => n.id !== "dashboard").map(({ id, label, icon: Icon }) => (
          <button key={`${id}-${label}`} onClick={() => handleNavigate(id)} title={label}
            className={cn("w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all",
              page === id
                ? "bg-[var(--primary-light)] text-primary-600"
                : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
            )}
          >
            <Icon size={16} className="flex-shrink-0" />
            {!sidebarCollapsed && <span className="truncate">{label}</span>}
            {!sidebarCollapsed && id === "projects" && projects.length > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-[var(--border)] text-[var(--text-muted)] px-1.5 py-0.5 rounded-full">
                {projects.length}
              </span>
            )}
          </button>
        ))}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="pt-3 pb-1">
              {!sidebarCollapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)] px-2.5">Admin</p>
              )}
            </div>
            <button onClick={() => handleNavigate("admin")} title="Admin Panel"
              className={cn("w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all",
                page === "admin"
                  ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
              )}
            >
              <Shield size={16} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>Admin Panel</span>}
            </button>
          </>
        )}

        {/* Recent projects */}
        {!sidebarCollapsed && projects.length > 0 && (
          <div className="pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)] px-2.5 mb-1.5">Recent</p>
            {projects.slice(0, 4).map((p) => (
              <button key={p.id}
                onClick={() => { useStore.getState().setActiveProject(p.id); handleNavigate("project-detail"); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-all"
              >
                <div className="w-5 h-5 rounded bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <Database size={10} className="text-primary-600" />
                </div>
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom: profile + collapse */}
      <div className="border-t border-[var(--border)] p-2 space-y-1 flex-shrink-0">
        {/* Settings */}
        <button onClick={() => handleNavigate("settings")} title="Settings"
          className={cn("w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm transition-all",
            page === "settings"
              ? "bg-[var(--primary-light)] text-primary-600 font-semibold"
              : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] font-medium"
          )}>
          <Settings size={15} className="flex-shrink-0" />
          {!sidebarCollapsed && <span className="text-xs">Settings</span>}
        </button>

        {/* Logout */}
        <button onClick={() => { useStore.getState().logout(); }} title="Sign out"
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-[var(--text-muted)] hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-all text-sm">
          <LogOut size={15} className="flex-shrink-0" />
          {!sidebarCollapsed && <span className="text-xs font-medium">Sign Out</span>}
        </button>

        {/* Collapse toggle */}
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full flex items-center justify-center py-1.5 rounded-xl text-[var(--text-subtle)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-all">
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
      <button onClick={() => setMobileOpen((open) => !open)} className="mobile-sidebar-toggle" aria-label={mobileOpen ? "Close navigation" : "Open navigation"}>
        {mobileOpen ? <X size={20} /> : <Database size={20} />}
      </button>
    </motion.aside>
  );
}

