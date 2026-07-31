"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Clock, FileCode, Sparkles, Wand2, ArrowRightLeft,
  Copy, Download, Trash2, RefreshCw, Database, ChevronDown, ChevronUp,
  CheckCircle, AlertTriangle, X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { timeAgo, formatDateTime, downloadText, cn } from "@/lib/utils";
import { apiGetToolHistory, apiDeleteToolHistoryEntry, apiClearToolHistory, type BackendToolHistory } from "@/lib/api";
import toast from "react-hot-toast";

// ── Tool config ────────────────────────────────────────────────────────────────
const TOOL_CONFIG = {
  quick_convert: {
    label: "Quick Convert",
    icon: Sparkles,
    color: "text-primary-600",
    bg: "bg-primary-50 dark:bg-primary-900/30",
    badge: "badge-purple",
  },
  generate: {
    label: "Generate",
    icon: Wand2,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    badge: "badge-emerald",
  },
  migrate: {
    label: "Migrate",
    icon: ArrowRightLeft,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    badge: "bg-blue-50 dark:bg-blue-900/20 text-blue-600",
  },
} as const;

const FILTER_OPTIONS = [
  { value: "all",           label: "All Tools" },
  { value: "quick_convert", label: "Quick Convert" },
  { value: "generate",      label: "Generate" },
  { value: "migrate",       label: "Migrate" },
];

export default function HistoryPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { user } = useStore();

  const [entries, setEntries]       = useState<BackendToolHistory[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clearing, setClearing]     = useState(false);

  // ── Fetch history from DB ──────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    const numericId = parseInt(user?.id ?? "", 10);
    if (isNaN(numericId)) { setLoading(false); return; }
    try {
      const data = await apiGetToolHistory(numericId);
      setEntries(data);
    } catch {
      toast.error("Could not load history");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ── Delete one entry ───────────────────────────────────────────────────────
  const deleteEntry = async (entryId: string) => {
    const numericId = parseInt(user?.id ?? "", 10);
    if (isNaN(numericId)) return;
    try {
      await apiDeleteToolHistoryEntry(numericId, entryId);
      setEntries(prev => prev.filter(e => e.id !== entryId));
      toast.success("Entry deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  // ── Clear all ──────────────────────────────────────────────────────────────
  const clearAll = async () => {
    const numericId = parseInt(user?.id ?? "", 10);
    if (isNaN(numericId)) return;
    setClearing(true);
    try {
      await apiClearToolHistory(numericId);
      setEntries([]);
      toast.success("History cleared");
    } catch {
      toast.error("Failed to clear");
    } finally {
      setClearing(false);
    }
  };

  // ── Filter + search ────────────────────────────────────────────────────────
  const visible = entries.filter(e => {
    const matchFilter = filter === "all" || e.tool === filter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || e.action_label.toLowerCase().includes(q)
      || (e.dialect_from ?? "").includes(q)
      || (e.dialect_to ?? "").includes(q);
    return matchFilter && matchSearch;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total:    entries.length,
    convert:  entries.filter(e => e.tool === "quick_convert").length,
    generate: entries.filter(e => e.tool === "generate").length,
    migrate:  entries.filter(e => e.tool === "migrate").length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">History</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Everything you've done across all tools — stored and searchable
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchHistory} className="btn-ghost text-sm px-3 py-2" title="Refresh">
            <RefreshCw size={14} />
          </button>
          {entries.length > 0 && (
            <button
              onClick={clearAll}
              disabled={clearing}
              className="btn-ghost text-sm px-3 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              {clearing ? <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={14} />}
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total",        value: stats.total,    color: "text-[var(--text)]",    bg: "bg-[var(--surface)]" },
          { label: "Quick Convert",value: stats.convert,  color: "text-primary-600",       bg: "bg-primary-50 dark:bg-primary-900/20" },
          { label: "Generate",     value: stats.generate, color: "text-emerald-600",       bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Migrate",      value: stats.migrate,  color: "text-blue-600",          bg: "bg-blue-50 dark:bg-blue-900/20" },
        ].map(s => (
          <div key={s.label} className={cn("card p-4 flex items-center gap-3", s.bg)}>
            <div>
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by description or dialect…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-[var(--border)]
              bg-[var(--card)] text-[var(--text)] placeholder:text-[var(--text-subtle)]
              focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_OPTIONS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition-all",
                filter === f.value
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-primary-300 hover:text-primary-600"
              )}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card flex items-center justify-center py-20 gap-3">
          <span className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--text-muted)]">Loading history…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && visible.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--surface)] flex items-center justify-center">
            <Clock size={24} className="text-[var(--text-subtle)]" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-[var(--text)]">
              {search || filter !== "all" ? "No matching results" : "No history yet"}
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {search || filter !== "all"
                ? "Try a different search or filter"
                : "Use Quick Convert, Generate, or Migrate — every result is tracked here"}
            </p>
          </div>
          {(!search && filter === "all") && (
            <div className="flex items-center gap-2">
              <button onClick={() => onNavigate("quick-convert")} className="btn-ghost text-sm">
                <Sparkles size={13} /> Quick Convert
              </button>
              <button onClick={() => onNavigate("generate")} className="btn-ghost text-sm">
                <Wand2 size={13} /> Generate
              </button>
              <button onClick={() => onNavigate("migrate")} className="btn-ghost text-sm">
                <ArrowRightLeft size={13} /> Migrate
              </button>
            </div>
          )}
        </div>
      )}

      {/* History list */}
      {!loading && visible.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence>
            {visible.map((entry, i) => {
              const cfg = TOOL_CONFIG[entry.tool] ?? TOOL_CONFIG.generate;
              const Icon = cfg.icon;
              const isExpanded = expandedId === entry.id;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: i * 0.03 }}
                  className="card overflow-hidden"
                >
                  {/* Main row */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Tool icon */}
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", cfg.bg)}>
                      <Icon size={16} className={cfg.color} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", cfg.badge)}>
                          {cfg.label}
                        </span>
                        {entry.success
                          ? <CheckCircle size={12} className="text-emerald-500" />
                          : <AlertTriangle size={12} className="text-red-500" />}
                        {entry.tables_count > 0 && (
                          <span className="text-[10px] text-[var(--text-subtle)] flex items-center gap-1">
                            <Database size={10} /> {entry.tables_count} table{entry.tables_count !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-[var(--text)] mt-1 truncate">
                        {entry.action_label}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {timeAgo(entry.created_at)} · {formatDateTime(entry.created_at)}
                        {entry.processing_time_ms > 0 && ` · ${(entry.processing_time_ms / 1000).toFixed(1)}s`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {entry.result_sql && (
                        <>
                          <button
                            onClick={() => { navigator.clipboard.writeText(entry.result_sql); toast.success("SQL copied!"); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-all"
                            title="Copy SQL"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => downloadText(entry.result_sql, `${entry.action_label.replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.sql`)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-all"
                            title="Download SQL"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-all"
                            title={isExpanded ? "Collapse" : "View SQL"}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-subtle)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                        title="Delete"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded SQL preview */}
                  <AnimatePresence>
                    {isExpanded && entry.result_sql && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-[var(--border)]"
                      >
                        <pre className="px-5 py-4 text-xs font-mono text-[var(--text)] bg-[var(--surface)] overflow-x-auto max-h-60 overflow-y-auto leading-relaxed">
                          {entry.result_sql.slice(0, 3000)}{entry.result_sql.length > 3000 ? "\n\n-- ... (truncated, download for full SQL)" : ""}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
