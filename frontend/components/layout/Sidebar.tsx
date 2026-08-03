﻿"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FolderOpen, History, Settings, Shield,
  ChevronLeft, ChevronRight, Database, LogOut, Plus, Sparkles, CreditCard, UserRound, X, Wand2, ArrowRightLeft, Wrench, ChevronDown, Terminal
} from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { cn, initials } from "@/lib/utils";

interface SidebarProps {
  page: string;
  onNavigate: (p: string) => void;
}

const toolsItems = [
  { id: "quick-convert", label: "Quick Convert", icon: Sparkles,      badge: "Image â†’ SQL", badgeColor: "text-indigo-400 bg-indigo-500/10" },
  { id: "generate",      label: "Generate",      icon: Wand2,          badge: "Text â†’ SQL",  badgeColor: "text-violet-400 bg-violet-500/10" },
  { id: "migrate",       label: "Migrator",      icon: ArrowRightLeft, badge: "SQL â†’ SQL",   badgeColor: "text-violet-400 bg-violet-500/10" },
  { id: "playground",    label: "Playground",    icon: Terminal,       badge: "SQL Editor",  badgeColor: "text-emerald-400 bg-emerald-500/10" },
];

const mainNav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects",  label: "Projects",  icon: FolderOpen },
  { id: "history",   label: "History",   icon: History },
  { id: "pricing",   label: "Pricing",   icon: CreditCard },
  { id: "profile",   label: "Profile",   icon: UserRound },
];

// â”€â”€ Shared classes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Inactive nav item: uses CSS vars so it works in both light and dark.
const inactiveNav =
  "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]";

// Active nav item â€” background applied via inline style using --primary so it
// resolves to indigo in light and coral in dark automatically.
const activeNav =
  "text-white shadow-[0_8px_24px_rgba(0,0,0,0.20)]";

// Bottom-section hover (Settings / Sign Out / Collapse)
const bottomHover =
  "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]";

// Active nav inline style â€” uses CSS variable so theme drives the color
const activeStyle: React.CSSProperties = { background: "var(--primary)" };

// â”€â”€ NavBtn â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function NavBtn({
  active, onClick, title, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  label: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "w-full flex items-center gap-3 px-[18px] py-[11px] rounded-[12px] text-sm font-medium transition-all duration-200",
        active ? activeNav : inactiveNav,
      )}
      style={active ? activeStyle : undefined}
    >
      {icon}
      {label && <span className="truncate">{label}</span>}
    </button>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Sidebar({ page, onNavigate }: SidebarProps) {
  const { user, sidebarCollapsed, setSidebarCollapsed, logout, projects: allProjects } = useStore();
  const [mobileOpen, setMobileOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(
    ["quick-convert", "generate", "migrate", "playground"].includes(page)
  );
  const projects = allProjects.filter(p => p.ownerId === (user?.id ?? ""));
  const isAdmin = user?.role === "admin";
  const width = sidebarCollapsed ? 64 : 220;
  const isToolPage = ["quick-convert", "generate", "migrate", "playground"].includes(page);

  const handleNavigate = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <motion.aside
      animate={{ width }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "sidebar fixed left-0 top-0 bottom-0 z-30 flex flex-col overflow-hidden",
        // â†“ semantic var: #FFFFFF in light, #0F172A in dark
        "bg-[var(--surface-sidebar)] border-r border-[var(--border)]",
        mobileOpen && "mobile-sidebar-open"
      )}
    >
      {/* â”€â”€ Logo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-center h-[57px] px-[14px] border-b border-[var(--border)] flex-shrink-0 gap-3">
        {/* Logo icon â€” gradient in light, solid coral in dark via --primary */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--primary)" }}
        >
          <Database size={15} className="text-white" />
        </div>

        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="min-w-0"
            >
              {/* App name: primary text color */}
              <p className="font-bold text-[14px] text-[var(--text)] whitespace-nowrap leading-tight">
                ER AI Studio
              </p>
              {/* Subtitle: muted text color */}
              <p className="text-[10px] text-[var(--text-subtle)] whitespace-nowrap leading-tight mt-0.5">
                Schema Intelligence
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setMobileOpen(false)}
          className="mobile-sidebar-close"
          aria-label="Close navigation"
        >
          <X size={17} />
        </button>
      </div>

      {/* â”€â”€ Nav â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <nav className="flex-1 px-[10px] py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">

        {/* New Project â€” uses --primary / --primary-hover so coral in dark, indigo in light */}
        <button
          onClick={() => handleNavigate("projects")}
          title="New Project"
          className={cn(
            "w-full flex items-center gap-3 px-[18px] py-[11px] rounded-[14px] mb-3 text-sm font-semibold",
            "text-white transition-all duration-200",
          )}
          style={{ background: "var(--primary)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--primary-hover)")}
          onMouseLeave={e => (e.currentTarget.style.background = "var(--primary)")}
        >
          <Plus size={15} className="flex-shrink-0" />
          {!sidebarCollapsed && <span>New Project</span>}
        </button>

        {/* Dashboard */}
        <NavBtn
          active={page === "dashboard"}
          onClick={() => handleNavigate("dashboard")}
          title="Dashboard"
          icon={<LayoutDashboard size={16} className="flex-shrink-0" />}
          label={!sidebarCollapsed ? "Dashboard" : null}
        />

        {/* â”€â”€ Tools accordion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div>
          <button
            onClick={() => {
              if (sidebarCollapsed) {
                setSidebarCollapsed(false);
                setToolsOpen(true);
              } else {
                setToolsOpen((o) => !o);
              }
            }}
            title="Tools"
            className={cn(
              "w-full flex items-center gap-3 px-[18px] py-[11px] rounded-[12px] text-sm font-medium transition-all duration-200",
              isToolPage ? activeNav : inactiveNav,
            )}
            style={isToolPage ? activeStyle : undefined}
          >
            <Wrench size={16} className="flex-shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 truncate text-left">Tools</span>
                <motion.span animate={{ rotate: toolsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
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
                {/* Sub-tree border uses --border so it's #E5E7EB light / rgba white dark */}
                <div className="mt-1 ml-3 pl-3 border-l border-[var(--border)] space-y-0.5 pb-1">
                  {toolsItems.map(({ id, label, icon: Icon, badge, badgeColor }) => (
                    <button
                      key={id}
                      onClick={() => handleNavigate(id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-[14px] py-[9px] rounded-[12px] text-xs font-medium transition-all duration-200 group",
                        page === id ? activeNav : inactiveNav,
                      )}
                      style={page === id ? activeStyle : undefined}
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

        {/* Rest of main nav */}
        {mainNav.filter(n => n.id !== "dashboard").map(({ id, label, icon: Icon }) => (
          <button
            key={`${id}-${label}`}
            onClick={() => handleNavigate(id)}
            title={label}
            className={cn(
              "w-full flex items-center gap-3 px-[18px] py-[11px] rounded-[12px] text-sm font-medium transition-all duration-200",
              page === id ? activeNav : inactiveNav,
            )}
            style={page === id ? activeStyle : undefined}
          >
            <Icon size={16} className="flex-shrink-0" />
            {!sidebarCollapsed && <span className="truncate">{label}</span>}
            {!sidebarCollapsed && id === "projects" && projects.length > 0 && (
              /* Project count pill â€” subtle in both themes */
              <span className="ml-auto text-[10px] font-bold bg-[var(--primary-light)] text-[var(--primary)] px-1.5 py-0.5 rounded-full">
                {projects.length}
              </span>
            )}
          </button>
        ))}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-1">
              {!sidebarCollapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] px-[18px] opacity-60">
                  Admin
                </p>
              )}
            </div>
            <button
              onClick={() => handleNavigate("admin")}
              title="Admin Panel"
              className={cn(
                "w-full flex items-center gap-3 px-[18px] py-[11px] rounded-[12px] text-sm font-medium transition-all duration-200",
                page === "admin"
                  ? "text-white shadow-[0_8px_24px_rgba(245,158,11,0.20)]"
                  : inactiveNav,
              )}
              style={page === "admin" ? { background: "linear-gradient(90deg,#F59E0B,#D97706)" } : undefined}
            >
              <Shield size={16} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>Admin Panel</span>}
            </button>
          </>
        )}

        {/* Recent projects */}
        {!sidebarCollapsed && projects.length > 0 && (
          <div className="pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)] px-[18px] mb-2 opacity-60">
              Recent
            </p>
            {projects.slice(0, 4).map((p) => (
              <button
                key={p.id}
                onClick={() => { useStore.getState().setActiveProject(p.id); handleNavigate("project-detail"); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-[18px] py-[9px] rounded-[12px] text-xs transition-all duration-200",
                  inactiveNav,
                )}
              >
                <div className="w-5 h-5 rounded-md bg-[var(--primary-light)] flex items-center justify-center flex-shrink-0">
                  <Database size={10} className="text-[var(--primary)]" />
                </div>
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* â”€â”€ Bottom: settings + sign out + collapse â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="border-t border-[var(--border)] px-[10px] py-3 space-y-0.5 flex-shrink-0">

        {/* Settings */}
        <button
          onClick={() => handleNavigate("settings")}
          title="Settings"
          className={cn(
            "w-full flex items-center gap-3 px-[18px] py-[11px] rounded-[12px] text-sm font-medium transition-all duration-200",
            page === "settings" ? activeNav : bottomHover,
          )}
          style={page === "settings" ? activeStyle : undefined}
        >
          <Settings size={15} className="flex-shrink-0" />
          {!sidebarCollapsed && <span className="text-xs">Settings</span>}
        </button>

        {/* Sign Out â€” never active, just hover */}
        <button
          onClick={() => { useStore.getState().logout(); }}
          title="Sign out"
          className={cn(
            "w-full flex items-center gap-3 px-[18px] py-[11px] rounded-[12px] text-sm font-medium transition-all duration-200",
            bottomHover,
          )}
        >
          <LogOut size={15} className="flex-shrink-0" />
          {!sidebarCollapsed && <span className="text-xs">Sign Out</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "w-full flex items-center justify-center py-[9px] rounded-[12px] transition-all duration-200",
            bottomHover,
          )}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <button
        onClick={() => setMobileOpen((open) => !open)}
        className="mobile-sidebar-toggle"
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
      >
        {mobileOpen ? <X size={20} /> : <Database size={20} />}
      </button>
    </motion.aside>
  );
}

