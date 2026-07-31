"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen, FileCode, TrendingUp, Plus,
  ArrowRight, Database,
  Zap, Sparkles, GitMerge, Wand2, Info
} from "lucide-react";
import { useStore } from "@/lib/store";
import { timeAgo, cn } from "@/lib/utils";
import { conversionsLeft, getPlan } from "@/lib/subscription";
import UpgradeLimitDialog from "@/components/UpgradeLimitDialog";
import UsageBanner from "@/components/UsageBanner";

// ---------------------------------------------------------------------------
// StatCard — stat tile with hover tooltip explaining what the number means
// ---------------------------------------------------------------------------
function StatCard({
  label, value, Icon, color, bg, tooltip, delay,
}: {
  label: string;
  value: number;
  Icon: React.ElementType;
  color: string;
  bg: string;
  tooltip: string;
  delay: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      whileHover={{ y: -2 }}
      className="card p-4 relative"
    >
      <div className="flex items-start justify-between mb-2.5">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", bg)}>
          <Icon size={16} className={color} />
        </div>
        {/* info icon */}
        <button
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          onFocus={() => setShow(true)}
          onBlur={() => setShow(false)}
          aria-label={`About ${label}`}
          className="text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors"
        >
          <Info size={13} />
        </button>
      </div>
      <div className="text-2xl font-bold text-[var(--text)]">{value}</div>
      <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>

      {/* Tooltip */}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
              w-56 rounded-xl bg-[var(--card)] border border-[var(--border)]
              shadow-xl p-3 text-[11px] text-[var(--text-muted)] leading-relaxed pointer-events-none"
          >
            {tooltip}
            {/* arrow */}
            <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0
              border-l-4 border-r-4 border-t-4
              border-l-transparent border-r-transparent border-t-[var(--border)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DashboardPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const {
    user, projects: allProjects,
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
          {
            label: "Projects",
            value: myProjects.length,
            icon: FolderOpen,
            color: "text-violet-600",
            bg: "bg-violet-50 dark:bg-violet-500/10",
            tooltip: "Total project workspaces you've created. Each project holds ER diagram images and their generated SQL files.",
          },
          {
            label: "Converted",
            value: totalDone,
            icon: FileCode,
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-500/10",
            tooltip: "Number of ER diagram images successfully converted to SQL across all your projects.",
          },
          {
            label: "Quick Converts",
            value: quickHistory.length,
            icon: Sparkles,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-500/10",
            tooltip: "One-off conversions done via Quick Convert — instant ER-to-SQL without creating a project.",
          },
          {
            label: "This Month",
            value: sub.conversionsUsedThisMonth,
            icon: TrendingUp,
            color: "text-orange-600",
            bg: "bg-orange-50 dark:bg-orange-500/10",
            tooltip: "Total conversions (project + quick) used in the current billing month against your plan limit.",
          },
        ].map(({ label, value, icon: Icon, color, bg, tooltip }, i) => (
          <StatCard key={label} label={label} value={value} Icon={Icon} color={color} bg={bg} tooltip={tooltip} delay={i * 0.06} />
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

      {/* Feature shortcuts — Quick Convert · Generate · Migrate */}
      <div className="mb-4">
        <h2 className="text-base font-bold text-[var(--text)] mb-0.5">Tools</h2>
        <p className="text-xs text-[var(--text-muted)]">Pick a tool below to get started — no project required.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Quick Convert */}
        <motion.div
          whileHover={{ y: -3 }}
          className="card p-6 flex flex-col gap-5 cursor-pointer
            border-2 border-dashed border-primary-200 dark:border-primary-800/40
            hover:border-primary-400 transition-colors"
          onClick={() => onNavigate("quick-convert")}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <Sparkles size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="font-bold text-[var(--text)] text-sm leading-tight">Quick Convert</p>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-500 bg-primary-50 dark:bg-primary-900/40 px-2 py-0.5 rounded-full mt-0.5 inline-block">
                Image → SQL
              </span>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed flex-1">
            Upload a photo or screenshot of an ER diagram and get production-ready SQL instantly — no project needed.
          </p>
          <button className="btn-primary text-sm w-full justify-center">
            Open Quick Convert <ArrowRight size={13} />
          </button>
        </motion.div>

        {/* Generate */}
        <motion.div
          whileHover={{ y: -3 }}
          className="card p-6 flex flex-col gap-5 cursor-pointer
            border-2 border-dashed border-emerald-200 dark:border-emerald-800/40
            hover:border-emerald-400 transition-colors"
          onClick={() => onNavigate("generate")}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <Wand2 size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-[var(--text)] text-sm leading-tight">Generate</p>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full mt-0.5 inline-block">
                Text → SQL
              </span>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed flex-1">
            Describe your database requirements in plain English and let AI generate a complete SQL schema for you.
          </p>
          <button
            className="text-sm w-full justify-center flex items-center gap-1.5 px-4 py-2 rounded-xl
              font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            Open Generate <ArrowRight size={13} />
          </button>
        </motion.div>

        {/* Migrate */}
        <motion.div
          whileHover={{ y: -3 }}
          className="card p-6 flex flex-col gap-5 cursor-pointer
            border-2 border-dashed border-violet-200 dark:border-violet-800/40
            hover:border-violet-400 transition-colors"
          onClick={() => onNavigate("migrate")}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
              <GitMerge size={20} className="text-violet-600" />
            </div>
            <div>
              <p className="font-bold text-[var(--text)] text-sm leading-tight">Migrate</p>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 bg-violet-50 dark:bg-violet-900/40 px-2 py-0.5 rounded-full mt-0.5 inline-block">
                SQL → SQL
              </span>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed flex-1">
            Paste existing SQL written for one database and convert it to a different dialect — syntax differences handled automatically.
          </p>
          <button
            className="text-sm w-full justify-center flex items-center gap-1.5 px-4 py-2 rounded-xl
              font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
          >
            Open Migrate <ArrowRight size={13} />
          </button>
        </motion.div>

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
