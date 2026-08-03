"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen, FileCode, TrendingUp, Plus,
  ArrowRight,
  Zap, Sparkles, GitMerge, Wand2, Info
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { conversionsLeft, getPlan } from "@/lib/subscription";
import UpgradeLimitDialog from "@/components/UpgradeLimitDialog";
import UsageBanner from "@/components/UsageBanner";

// ---------------------------------------------------------------------------
// StatCard — stat tile with hover tooltip explaining what the number means
// ---------------------------------------------------------------------------
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  Icon: LucideIcon;
  color: string;
  bg: string;
  tooltip: string;
  delay: number;
}

function StatCard({ label, value, Icon, color, bg, tooltip, delay }: StatCardProps) {
  const [show, setShow] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -2 }}
      className="card p-4 relative"
    >
      <div className="flex items-start justify-between mb-2.5">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", bg)}>
          <Icon size={16} className={color} />
        </div>
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

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
              w-56 rounded-xl bg-[var(--card)] border border-[var(--border)]
              shadow-xl p-3 text-[11px] text-[var(--text-muted)] leading-relaxed pointer-events-none"
          >
            {tooltip}
            <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0
              border-l-4 border-r-4 border-t-4
              border-l-transparent border-r-transparent border-t-[var(--border)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// DashboardPage
// ---------------------------------------------------------------------------
export default function DashboardPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { user, projects: allProjects, getSubscription, quickHistory } = useStore();

  const sub         = getSubscription();
  const plan        = getPlan(sub);
  const isPro       = sub.planId === "pro";
  const ownerId     = user?.id ?? "";
  const myProjects  = allProjects.filter((p) => p.ownerId === ownerId);

  const totalDone   = myProjects.reduce((s, p) => s + p.files.filter((f) => f.status === "completed").length, 0);
  const totalFiles  = myProjects.reduce((s, p) => s + p.files.length, 0);
  const storageUsed = Math.min(100, totalFiles * 4);
  const left        = conversionsLeft(sub);

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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200"
              style={{ background: "var(--primary)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--primary-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--primary)")}
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
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-500/10",
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
          <StatCard
            key={label}
            label={label}
            value={value}
            Icon={Icon}
            color={color}
            bg={bg}
            tooltip={tooltip}
            delay={i * 0.06}
          />
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

      {/* Tools container */}
      <div
        className="rounded-2xl bg-[var(--surface)] p-5
          border border-primary-200/70 dark:border-primary-700/30
          shadow-[0_2px_4px_rgba(16,24,40,0.04),0_8px_24px_-6px_rgba(34,197,94,0.14),0_16px_48px_-12px_rgba(34,197,94,0.10),inset_0_1px_0_rgba(255,255,255,0.6)]
          dark:shadow-[0_2px_4px_rgba(0,0,0,0.2),0_8px_24px_-6px_rgba(34,197,94,0.25),0_16px_48px_-12px_rgba(34,197,94,0.18),inset_0_1px_0_rgba(255,255,255,0.04)]"
      >
        <div className="mb-4">
          <h2 className="text-sm font-bold text-[var(--text)]">Tools</h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Pick a tool below to get started — no project required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* Quick Convert */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            whileHover={{ y: -2, boxShadow: "0 8px 24px -4px rgba(34,197,94,0.18), 0 2px 8px -2px rgba(16,24,40,0.08)" }}
            className="card p-5 flex flex-col gap-4 cursor-pointer
              hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
            onClick={() => onNavigate("quick-convert")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800/40 flex items-center justify-center flex-shrink-0">
                <Sparkles size={18} className="text-primary-600" />
              </div>
              <p className="font-bold text-[var(--text)] text-sm">Quick Convert</p>
            </div>
            <span className="self-start text-[10px] font-semibold px-2 py-0.5 rounded-md
              bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400
              border border-primary-100 dark:border-primary-800/40">
              image → sql
            </span>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed flex-1">
              Upload a photo of an ER diagram and get production-ready SQL.
            </p>
            <button className="btn-primary text-xs w-full justify-center py-2">
              Open quick convert <ArrowRight size={12} />
            </button>
          </motion.div>

          {/* Generate */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -2, boxShadow: "0 8px 24px -4px rgba(5,150,105,0.18), 0 2px 8px -2px rgba(16,24,40,0.08)" }}
            className="card p-5 flex flex-col gap-4 cursor-pointer
              hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
            onClick={() => onNavigate("generate")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center flex-shrink-0">
                <Wand2 size={18} className="text-emerald-600" />
              </div>
              <p className="font-bold text-[var(--text)] text-sm">Generate</p>
            </div>
            <span className="self-start text-[10px] font-semibold px-2 py-0.5 rounded-md
              bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400
              border border-emerald-100 dark:border-emerald-800/40">
              text → sql
            </span>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed flex-1">
              Describe your database in plain English and get a full schema.
            </p>
            <button
              className="text-xs w-full justify-center flex items-center gap-1.5 px-4 py-2 rounded-lg
                font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              Open generate <ArrowRight size={12} />
            </button>
          </motion.div>

          {/* Migrate */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            whileHover={{ y: -2, boxShadow: "0 8px 24px -4px rgba(34,197,94,0.18), 0 2px 8px -2px rgba(16,24,40,0.08)" }}
            className="card p-5 flex flex-col gap-4 cursor-pointer
              hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
            onClick={() => onNavigate("migrate")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center flex-shrink-0">
                <GitMerge size={18} className="text-emerald-600" />
              </div>
              <p className="font-bold text-[var(--text)] text-sm">Migrate</p>
            </div>
            <span className="self-start text-[10px] font-semibold px-2 py-0.5 rounded-md
              bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400
              border border-emerald-100 dark:border-emerald-800/40">
              sql → sql
            </span>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed flex-1">
              Paste SQL written for one database and convert it to another dialect.
            </p>
            <button
              className="text-xs w-full justify-center flex items-center gap-1.5 px-4 py-2 rounded-lg
                font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              Open migrate <ArrowRight size={12} />
            </button>
          </motion.div>

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
