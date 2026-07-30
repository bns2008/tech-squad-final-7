"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  FolderOpen, FileCode, TrendingUp, Plus,
  ArrowRight, Database, ChevronRight,
  Zap, Sparkles
} from "lucide-react";
import { useStore } from "@/lib/store";
import { timeAgo, cn } from "@/lib/utils";
import { conversionsLeft, getPlan } from "@/lib/subscription";
import UpgradeLimitDialog from "@/components/UpgradeLimitDialog";
import UsageBanner from "@/components/UsageBanner";

export default function DashboardPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const {
    user, projects: allProjects, setActiveProject,
    getSubscription, quickHistory,
  } = useStore();

  const sub      = getSubscription();
  const plan     = getPlan(sub);
  const isPro    = sub.planId === "pro";
  const ownerId  = user?.id ?? "";
  const myProjects = allProjects.filter((p) => p.ownerId === ownerId);

  const totalDone   = myProjects.reduce((s, p) => s + p.files.filter((f) => f.status === "completed").length, 0);
  const totalFiles  = myProjects.reduce((s, p) => s + p.files.length, 0);
  const storageUsed = Math.min(100, totalFiles * 4);
  const recentProjects = [...myProjects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);
  const left = conversionsLeft(sub);

  const [limitOpen, setLimitOpen] = useState(false);

  return (
    <div>
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {isPro
              ? `Pro Plan · ${left} conversions remaining this month`
              : `Free Plan · ${left} of ${plan.conversionsPerMonth} conversions remaining`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isPro && (
            <button
              onClick={() => onNavigate("pricing")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold
                bg-gradient-to-r from-primary-600 to-primary-700 text-white
                hover:shadow-lg hover:shadow-primary-500/25 transition-all"
            >
              <Zap size={13} className="text-yellow-300" /> Upgrade to Pro
            </button>
          )}
          <button onClick={() => onNavigate("projects")} className="btn-ghost text-sm">
            <Plus size={14} /> New Project
          </button>
        </div>
      </div>

      {/* Usage banner (free users only) */}
      {!isPro && <UsageBanner onNavigatePricing={() => onNavigate("pricing")} />}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {[
          { label: "Projects",       value: myProjects.length,           icon: FolderOpen, color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-500/10" },
          { label: "Converted",      value: totalDone,                    icon: FileCode,   color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Quick Converts", value: quickHistory.length,          icon: Sparkles,   color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-500/10" },
          { label: "This Month",     value: sub.conversionsUsedThisMonth, icon: TrendingUp, color: "text-orange-600",  bg: "bg-orange-50 dark:bg-orange-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            whileHover={{ y: -2 }} className="card p-4"
          >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-2.5", bg)}>
              <Icon size={16} className={color} />
            </div>
            <div className="text-2xl font-bold text-[var(--text)]">{value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Usage overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-7">
        {[
          {
            label: "Monthly conversions",
            value: `${left} left`,
            detail: `${sub.conversionsUsedThisMonth} of ${plan.conversionsPerMonth} used`,
            progress: Math.min(100, (sub.conversionsUsedThisMonth / plan.conversionsPerMonth) * 100),
            color: "bg-primary-500",
          },
          {
            label: "Projects",
            value: `${myProjects.length} / ${plan.maxProjects}`,
            detail: "Active workspaces",
            progress: Math.min(100, (myProjects.length / plan.maxProjects) * 100),
            color: "bg-[var(--mint)]",
          },
          {
            label: "Storage usage",
            value: `${storageUsed}%`,
            detail: `${totalFiles} uploaded image${totalFiles === 1 ? "" : "s"}`,
            progress: storageUsed,
            color: "bg-[var(--coral)]",
          },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)]">{item.label}</p>
                <p className="text-lg font-bold text-[var(--text)] mt-1">{item.value}</p>
              </div>
              <span className="text-[10px] text-[var(--text-subtle)] whitespace-nowrap">{item.detail}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--surface)] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(4, item.progress)}%` }}
                className={cn("h-full rounded-full", item.color)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Projects + Quick Convert shortcut */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">

        {/* Recent Projects */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)]">
            <h3 className="text-sm font-bold text-[var(--text)]">Recent Projects</h3>
            <button
              onClick={() => onNavigate("projects")}
              className="flex items-center gap-1 text-xs text-primary-600 hover:underline font-medium"
            >
              All <ChevronRight size={12} />
            </button>
          </div>

          {recentProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <FolderOpen size={24} className="text-[var(--text-subtle)]" />
              <div className="text-center">
                <p className="text-sm text-[var(--text-muted)] font-medium">No projects yet</p>
                <p className="text-xs text-[var(--text-subtle)] mt-0.5">Create one to get started</p>
              </div>
              <button onClick={() => onNavigate("projects")} className="btn-primary text-xs px-4 py-2">
                <Plus size={12} /> Create
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {recentProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setActiveProject(p.id); onNavigate("project-detail"); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface)] transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                    <Database size={13} className="text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--text)] truncate">{p.name}</p>
                    <p className="text-[10px] text-[var(--text-subtle)]">
                      {p.files.length} files · {timeAgo(p.updatedAt)}
                    </p>
                  </div>
                  <span className="badge badge-purple text-[9px] font-mono flex-shrink-0">{p.dbType}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Convert shortcut + mini history */}
        <div className="space-y-4">
          <motion.div
            whileHover={{ y: -2 }}
            className="card p-6 flex flex-col items-center gap-4 text-center cursor-pointer
              border-2 border-dashed border-primary-200 dark:border-primary-800/40
              hover:border-primary-400 transition-colors"
            onClick={() => onNavigate("quick-convert")}
          >
            <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
              <Sparkles size={26} className="text-primary-600" />
            </div>
            <div>
              <p className="font-bold text-[var(--text)] text-base">Quick Convert</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Instantly convert an ER diagram to SQL — no project needed
              </p>
            </div>
            <button className="btn-primary text-sm w-full justify-center">
              Open Quick Convert <ArrowRight size={13} />
            </button>
          </motion.div>

          {/* Recent quick converts summary */}
          {quickHistory.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-[var(--text)]">Recent Quick Converts</p>
                <button
                  onClick={() => onNavigate("quick-convert")}
                  className="text-xs text-primary-600 hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="space-y-2">
                {quickHistory.slice(0, 4).map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <FileCode size={11} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--text)] truncate">
                        {r.filename.replace(/\.[^.]+$/, "")}.sql
                      </p>
                      <p className="text-[10px] text-[var(--text-subtle)]">{timeAgo(r.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <UpgradeLimitDialog
        open={limitOpen}
        onClose={() => setLimitOpen(false)}
        reason="conversions"
        onNavigatePricing={() => onNavigate("pricing")}
      />
    </div>
  );
}
