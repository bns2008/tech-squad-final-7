"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FolderOpen, History, Settings, Shield,
  ChevronLeft, ChevronRight, Database, LogOut, Plus, Zap, Sparkles, CreditCard, UserRound, X, Wand2, ArrowRightLeft
} from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { cn, initials } from "@/lib/utils";

interface SidebarProps {
  page: string;
  onNavigate: (p: string) => void;
}

const mainNav = [
  { id: "dashboard",     label: "Dashboard",    icon: LayoutDashboard },
  { id: "quick-convert", label: "Quick Convert", icon: Sparkles },
  { id: "generate",      label: "Generate",     icon: Wand2 },
  { id: "migrate",       label: "Migrator",     icon: ArrowRightLeft },
  { id: "projects",      label: "Projects",     icon: FolderOpen },
  { id: "history",       label: "History",      icon: History },
  { id: "pricing",       label: "Pricing",      icon: CreditCard },
  { id: "profile",       label: "Profile",      icon: UserRound },
  { id: "settings",      label: "Settings",     icon: Settings },
];

export default function Sidebar({ page, onNavigate }: SidebarProps) {
  const { user, sidebarCollapsed, setSidebarCollapsed, logout, projects: allProjects } = useStore();
  const [mobileOpen, setMobileOpen] = useState(true);
  const projects = allProjects.filter(p => p.ownerId === (user?.id ?? ""));
  const isAdmin = user?.role === "admin";
  const width = sidebarCollapsed ? 64 : 220;

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
          onClick={() => { onNavigate("projects"); setMobileOpen(false); }}
          title="New Project"
          className={cn(
            "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl mb-2 text-sm font-semibold transition-all",
            "bg-primary-600 text-white hover:bg-primary-700"
          )}
        >
          <Plus size={15} className="flex-shrink-0" />
          {!sidebarCollapsed && <span>New Project</span>}
        </button>

        {mainNav.map(({ id, label, icon: Icon }) => (
          <button key={`${id}-${label}`} onClick={() => { onNavigate(id); setMobileOpen(false); }} title={label}
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
            <button onClick={() => { onNavigate("admin"); setMobileOpen(false); }} title="Admin Panel"
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
                onClick={() => { useStore.getState().setActiveProject(p.id); onNavigate("project-detail"); setMobileOpen(false); }}
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

      {/* Upgrade banner (not admin) */}
      {!isAdmin && !sidebarCollapsed && (
        <div className="mx-3 mb-3 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 p-3.5 text-white">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={13} className="text-yellow-300" />
            <span className="font-bold text-xs">Upgrade to Pro</span>
          </div>
          <p className="text-[10px] text-white/70 mb-2.5">Unlimited projects & exports</p>
          <button onClick={() => onNavigate("pricing")} className="w-full bg-white text-primary-700 font-semibold text-xs py-1.5 rounded-lg hover:bg-white/90 transition-colors">
            Upgrade Now
          </button>
        </div>
      )}

      {/* Bottom: profile + collapse */}
      <div className="border-t border-[var(--border)] p-2 space-y-1 flex-shrink-0">
        {/* Profile */}
        <button onClick={() => onNavigate("profile")}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[var(--surface)] transition-all">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary-600">
            {user?.avatar
              ? <img src={user.avatar} alt={user?.name ?? ""} className="w-full h-full object-cover" />
              : (user ? initials(user.name) : "?")}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-semibold text-[var(--text)] truncate">{user?.name}</p>
              <p className="text-[10px] text-[var(--text-subtle)] truncate">{user?.email}</p>
            </div>
          )}
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
