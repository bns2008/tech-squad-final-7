"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, FolderOpen, Upload, Wand2, Terminal,
  Bot, Settings, Clock, ArrowRight, CornerDownLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import type { Project } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  page: string;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
  recentProjects: Project[];
}

// ── Static data ───────────────────────────────────────────────────────────────
const QUICK_ACTIONS: QuickAction[] = [
  { id: "new-project",   label: "New Project",       icon: FolderOpen, shortcut: "N", page: "projects"      },
  { id: "upload-er",     label: "Upload ER Diagram",  icon: Upload,     shortcut: "U", page: "quick-convert"  },
  { id: "generate-db",   label: "Generate Database",  icon: Wand2,      shortcut: "G", page: "generate"       },
  { id: "playground",    label: "SQL Playground",     icon: Terminal,   shortcut: "P", page: "playground"     },
  { id: "ai-assistant",  label: "AI Assistant",       icon: Bot,        shortcut: "A", page: "migrate"        },
  { id: "settings",      label: "Settings",           icon: Settings,   shortcut: "S", page: "settings"       },
];

const MOCK_RECENT_SEARCHES = [
  "PostgreSQL user schema",
  "ER diagram to MySQL",
  "invoice tables",
];

// ── Kbd badge ─────────────────────────────────────────────────────────────────
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1
      rounded border border-[var(--border)] bg-[var(--surface)]
      text-[10px] font-mono font-medium text-[var(--text-subtle)]">
      {children}
    </span>
  );
}

// ── Result row ────────────────────────────────────────────────────────────────
function ResultRow({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-100",
        active
          ? "bg-[var(--primary)] text-white"
          : "hover:bg-[var(--surface)] text-[var(--text)]",
      )}
    >
      {children}
    </button>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-subtle)]">
      {children}
    </p>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GlobalSearch({ open, onClose, onNavigate, recentProjects }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  // Filter quick actions by query
  const filteredActions = query.trim()
    ? QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : QUICK_ACTIONS;

  // Filter recent projects (last 5) by query
  const filteredProjects = (query.trim()
    ? recentProjects.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.dbType.toLowerCase().includes(query.toLowerCase()),
      )
    : [...recentProjects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)
  );

  // Flat list of all navigable items for arrow-key navigation
  const allItems: Array<{ type: "action" | "project" | "recent"; id: string; page?: string }> = [
    ...(query.trim() ? [] : MOCK_RECENT_SEARCHES.map((s) => ({ type: "recent" as const, id: s }))),
    ...filteredActions.map((a) => ({ type: "action" as const, id: a.id, page: a.page })),
    ...filteredProjects.map((p) => ({ type: "project" as const, id: p.id, page: "project-detail" })),
  ];

  const clampCursor = useCallback((n: number) => Math.max(0, Math.min(n, allItems.length - 1)), [allItems.length]);

  // Reset state on open/close
  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard handler
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => clampCursor(c + 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setCursor((c) => clampCursor(c - 1)); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = allItems[cursor];
        if (item?.page) { onNavigate(item.page); onClose(); }
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, cursor, allItems, clampCursor, onClose, onNavigate]);

  // Scroll active row into view
  useEffect(() => {
    const el = listRef.current?.querySelector("[data-active='true']") as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const handleAction = (page: string) => { onNavigate(page); onClose(); };

  // offset index helpers
  const recentSearchCount  = query.trim() ? 0 : MOCK_RECENT_SEARCHES.length;
  const actionStartIdx     = recentSearchCount;
  const projectStartIdx    = recentSearchCount + filteredActions.length;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* ── Modal ── */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 top-[10vh] z-[201] mx-auto
              w-full max-w-[640px] sm:w-[90%] md:w-[640px]
              max-sm:top-0 max-sm:max-w-none max-sm:h-full max-sm:rounded-none
              rounded-2xl shadow-2xl border border-[var(--border)]
              bg-[var(--card)] overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Global search"
          >
            {/* ── Search input row ── */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)] flex-shrink-0">
              <Search size={17} className="text-[var(--text-subtle)] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
                placeholder="Search projects, SQL, templates or ask AI..."
                className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)]
                  outline-none caret-[var(--primary)]"
              />
              {query && (
                <button onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                  className="flex-shrink-0 text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors">
                  <X size={15} />
                </button>
              )}
              <button onClick={onClose}
                className="flex-shrink-0 flex items-center gap-1 text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors sm:hidden">
                Cancel
              </button>
              <Kbd>Esc</Kbd>
            </div>

            {/* ── Results ── */}
            <div ref={listRef} className="overflow-y-auto flex-1 pb-3 max-h-[60vh] max-sm:max-h-none">

              {/* Recent searches (only when no query) */}
              {!query.trim() && (
                <div>
                  <SectionLabel>Recent Searches</SectionLabel>
                  {MOCK_RECENT_SEARCHES.map((s, i) => {
                    const active = cursor === i;
                    return (
                      <div key={s} data-active={String(active)} className="px-2">
                        <ResultRow active={active} onClick={() => { setQuery(s); setCursor(0); inputRef.current?.focus(); }}>
                          <Clock size={14} className={active ? "text-white/70" : "text-[var(--text-subtle)]"} />
                          <span className="flex-1 text-sm">{s}</span>
                          <ArrowRight size={12} className={active ? "text-white/50" : "text-[var(--text-subtle)]"} />
                        </ResultRow>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Actions */}
              {filteredActions.length > 0 && (
                <div>
                  <SectionLabel>Quick Actions</SectionLabel>
                  {filteredActions.map((action, i) => {
                    const idx    = actionStartIdx + i;
                    const active = cursor === idx;
                    const Icon   = action.icon;
                    return (
                      <div key={action.id} data-active={String(active)} className="px-2">
                        <ResultRow active={active} onClick={() => handleAction(action.page)}>
                          <span className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                            active ? "bg-white/20" : "bg-[var(--surface)]",
                          )}>
                            <Icon size={14} className={active ? "text-white" : "text-[var(--primary)]"} />
                          </span>
                          <span className="flex-1 text-sm font-medium">{action.label}</span>
                          {action.shortcut && <Kbd>{action.shortcut}</Kbd>}
                          <CornerDownLeft size={12} className={active ? "text-white/50" : "text-[var(--text-subtle)]"} />
                        </ResultRow>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Recent Projects */}
              {filteredProjects.length > 0 && (
                <div>
                  <SectionLabel>Recent Projects</SectionLabel>
                  {filteredProjects.map((project, i) => {
                    const idx    = projectStartIdx + i;
                    const active = cursor === idx;
                    return (
                      <div key={project.id} data-active={String(active)} className="px-2">
                        <ResultRow active={active} onClick={() => handleAction("project-detail")}>
                          <span className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                            active ? "bg-white/20" : "bg-[var(--surface)]",
                          )}>
                            <FolderOpen size={14} className={active ? "text-white" : "text-[var(--text-subtle)]"} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium truncate">{project.name}</span>
                            <span className={cn("block text-[11px]", active ? "text-white/60" : "text-[var(--text-subtle)]")}>
                              {project.dbType.toUpperCase()} · {timeAgo(project.updatedAt)}
                            </span>
                          </span>
                          <CornerDownLeft size={12} className={active ? "text-white/50" : "text-[var(--text-subtle)]"} />
                        </ResultRow>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty state */}
              {query.trim() && filteredActions.length === 0 && filteredProjects.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <Search size={28} className="text-[var(--text-subtle)] opacity-40" />
                  <p className="text-sm text-[var(--text-muted)]">No results for <strong>"{query}"</strong></p>
                  <p className="text-xs text-[var(--text-subtle)]">Try a different keyword</p>
                </div>
              )}
            </div>

            {/* ── Footer hint ── */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[var(--border)]
              flex-shrink-0 bg-[var(--surface)] text-[10px] text-[var(--text-subtle)]">
              <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
              <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
              <span className="flex items-center gap-1"><Kbd>Esc</Kbd> close</span>
              <span className="ml-auto flex items-center gap-1 text-[var(--text-subtle)/60]">
                Powered by <span className="font-semibold text-[var(--primary)]">AI</span>
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
