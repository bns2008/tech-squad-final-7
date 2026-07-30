"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Clock, CheckCircle, FileCode, FolderOpen, Database, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function HistoryPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { projects: allProjects, setActiveProject, user } = useStore();
  const projects = allProjects.filter(p => p.ownerId === (user?.id ?? ""));
  const [search, setSearch] = useState("");

  // Flatten all completed files with project info
  const allEntries = projects
    .flatMap(p => p.files
      .filter(f => f.status === "completed" && f.sql)
      .map(f => ({ ...f, projectName: p.name, projectId: p.id, dbType: p.dbType }))
    )
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  const filtered = allEntries.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.projectName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Generation History</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">{allEntries.length} total generations across all projects</p>
      </div>

      {allEntries.length > 0 && (
        <div className="relative mb-5 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input placeholder="Search by file or project name…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--surface)] flex items-center justify-center">
            <Clock size={24} className="text-[var(--text-subtle)]" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-[var(--text)]">{search ? "No results found" : "No history yet"}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {search ? `Nothing matches "${search}"` : "Upload and process ER diagrams in a project to see history here"}
            </p>
          </div>
          {!search && (
            <button onClick={() => onNavigate("projects")} className="btn-primary text-sm">
              <FolderOpen size={14} /> Go to Projects
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["File", "Project", "Database", "Tables", "Generated", "Action"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((entry, i) => (
                  <motion.tr key={`${entry.projectId}-${entry.id}`}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="border-b border-[var(--border)] last:border-none hover:bg-[var(--surface)] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                          <FileCode size={13} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[var(--text)]">{entry.name.replace(/\.[^.]+$/, "")}.sql</p>
                          <p className="text-[10px] text-[var(--text-subtle)]">
                            {entry.stats ? `${entry.stats.tables} tables` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Database size={11} className="text-[var(--text-subtle)]" />
                        <span className="text-xs text-[var(--text-muted)]">{entry.projectName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="badge badge-purple text-[10px] font-mono">{entry.dbType}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-[var(--text-muted)]">{entry.stats?.tables ?? "—"}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">{entry.completedAt ? timeAgo(entry.completedAt) : "—"}</p>
                        <p className="text-[10px] text-[var(--text-subtle)]">{entry.completedAt ? formatDateTime(entry.completedAt) : ""}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => { setActiveProject(entry.projectId); onNavigate("project-detail"); }}
                        className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1">
                        Open <ChevronRight size={11} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
