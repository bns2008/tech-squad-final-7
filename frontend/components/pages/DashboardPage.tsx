"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Wand2, Terminal, Bot,
  FolderOpen, FileCode, TrendingUp, Sparkles,
  ArrowRight, Zap, GitMerge,
  Database, BarChart3, Download, Clock,
  ChevronRight, Star, Info,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";
import { conversionsLeft, getPlan } from "@/lib/subscription";
import UpgradeLimitDialog from "@/components/UpgradeLimitDialog";
import type { LucideIcon } from "lucide-react";

// ── Fade-up animation variant ─────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
});

// ── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string; value: number | string;
  Icon: LucideIcon; color: string; bg: string;
  tooltip: string; delay: number;
}
function StatCard({ label, value, Icon, color, bg, tooltip, delay }: StatCardProps) {
  const [show, setShow] = useState(false);
  return (
    <motion.div {...fadeUp(delay)} whileHover={{ y: -2 }}
      className="card p-4 relative group cursor-default"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", bg)}>
          <Icon size={16} className={color} />
        </div>
        <button
          onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
          onFocus={() => setShow(true)} onBlur={() => setShow(false)}
          className="text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors"
        >
          <Info size={12} />
        </button>
      </div>
      <div className="text-2xl font-bold text-[var(--text)] tabular-nums">{value}</div>
      <div className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">{label}</div>
      <AnimatePresence>
        {show && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52
              rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-xl
              p-3 text-[11px] text-[var(--text-muted)] leading-relaxed pointer-events-none"
          >
            {tooltip}
            <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0
              border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent
              border-t-[var(--border)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Action Card ───────────────────────────────────────────────────────────────
interface ActionCardProps {
  icon: LucideIcon; title: string; desc: string;
  badge: string; badgeColor: string; btnLabel: string;
  accentBg: string; accentIcon: string; accentBorder: string; accentBtn: string;
  delay: number; onClick: () => void;
}
function ActionCard({
  icon: Icon, title, desc, badge, badgeColor, btnLabel,
  accentBg, accentIcon, accentBorder, accentBtn, delay, onClick,
}: ActionCardProps) {
  return (
    <motion.div {...fadeUp(delay)} whileHover={{ y: -3 }}
      onClick={onClick}
      className={cn(
        "card p-5 flex flex-col gap-3 cursor-pointer transition-all duration-200 group",
        "hover:shadow-lg border-2",
        accentBorder,
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", accentBg)}>
          <Icon size={19} className={accentIcon} />
        </div>
        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", badgeColor)}>
          {badge}
        </span>
      </div>
      <div>
        <h3 className="text-sm font-bold text-[var(--text)] leading-tight">{title}</h3>
        <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">{desc}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={cn(
          "mt-auto flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold text-white transition-all",
          accentBtn,
        )}
      >
        {btnLabel} <ArrowRight size={11} />
      </button>
    </motion.div>
  );
}

// ── Main Dashboard Page ───────────────────────────────────────────────────────
export default function DashboardPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { user, projects: allProjects, getSubscription, quickHistory } = useStore();

  const sub        = getSubscription();
  const plan       = getPlan(sub);
  const isPro      = sub.planId === "pro";
  const ownerId    = user?.id ?? "";
  const myProjects = allProjects.filter((p) => p.ownerId === ownerId);

  const totalDone  = myProjects.reduce((s, p) => s + p.files.filter((f) => f.status === "completed").length, 0);
  const totalFiles = myProjects.reduce((s, p) => s + p.files.length, 0);
  const left       = conversionsLeft(sub);

  // Recent project
  const recentProject = [...myProjects].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;

  const [limitOpen, setLimitOpen] = useState(false);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0)} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Left: greeting + plan info */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] flex items-center gap-2">
            Welcome back, {user?.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {isPro ? "Pro Plan" : "Free Plan"} · {left} of {plan.conversionsPerMonth} conversions remaining
          </p>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isPro && (
            <button
              onClick={() => onNavigate("pricing")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: "var(--primary)" }}
            >
              <Zap size={14} /> Upgrade to Pro
            </button>
          )}
          <button
            onClick={() => onNavigate("projects")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:border-[var(--primary)]/50 transition-all"
          >
            + New Project
          </button>
        </div>
      </motion.div>

      {/* ── Usage bar ────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.06)} className="card px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 text-xs font-semibold text-[var(--text-muted)]">
            <Zap size={13} className="text-[var(--primary)]" />
            <span>{isPro ? "Pro Plan" : "Free Plan"}</span>
            <span className="text-[var(--border)]">|</span>
            <span>Monthly Usage</span>
          </div>
          {!isPro && (
            <button onClick={() => onNavigate("pricing")} className="text-[11px] font-semibold text-[var(--primary)] hover:underline">
              Upgrade →
            </button>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1.5">
          <span>{left} of {plan.conversionsPerMonth} conversions remaining</span>
          <span>{sub.conversionsUsedThisMonth} / {plan.conversionsPerMonth} used</span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--surface)] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(2, Math.min(100, Math.round((sub.conversionsUsedThisMonth / plan.conversionsPerMonth) * 100)))}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="h-full rounded-full"
            style={{ background: "var(--primary)" }}
          />
        </div>
      </motion.div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section>
        <motion.h2 {...fadeUp(0.1)}
          className="text-xs font-bold uppercase tracking-widest text-[var(--text-subtle)] mb-3 px-1">
          Overview
        </motion.h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Projects"           value={myProjects.length}                  delay={0.10} Icon={FolderOpen}  color="text-[var(--primary)]"  bg="bg-[var(--primary-light)]"              tooltip="Total project workspaces you've created." />
          <StatCard label="Databases Generated" value={totalDone}                          delay={0.14} Icon={Database}    color="text-emerald-600"        bg="bg-emerald-50 dark:bg-emerald-500/10"   tooltip="ER diagrams successfully converted to SQL." />
          <StatCard label="AI Requests"         value={sub.conversionsUsedThisMonth}       delay={0.18} Icon={BarChart3}   color="text-violet-600"         bg="bg-violet-50 dark:bg-violet-500/10"    tooltip="Total AI conversions used this billing month." />
          <StatCard label="Exports"             value={totalFiles}                         delay={0.22} Icon={Download}    color="text-sky-600"            bg="bg-sky-50 dark:bg-sky-500/10"          tooltip="Total files processed and available for export." />
        </div>
      </section>

      {/* ── Action Cards ─────────────────────────────────────────────────── */}
      <section>
        <motion.h2 {...fadeUp(0.12)}
          className="text-xs font-bold uppercase tracking-widest text-[var(--text-subtle)] mb-3 px-1">
          Quick Actions
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <ActionCard
            delay={0.13} onClick={() => onNavigate("quick-convert")}
            icon={Upload} title="Upload ER Diagram" btnLabel="Open Quick Convert"
            desc="Convert any ER diagram image to production-ready SQL in seconds."
            badge="Image → SQL" badgeColor="bg-[var(--primary-light)] text-[var(--primary)]"
            accentBg="bg-[var(--primary-light)]" accentIcon="text-[var(--primary)]"
            accentBorder="border-[var(--border)] hover:border-[var(--primary)]/40"
            accentBtn="bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
          />
          <ActionCard
            delay={0.17} onClick={() => onNavigate("generate")}
            icon={Wand2} title="Generate Database" btnLabel="Open Generate"
            desc="Describe your schema in plain English and get full DDL instantly."
            badge="Text → SQL" badgeColor="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            accentBg="bg-emerald-50 dark:bg-emerald-500/10" accentIcon="text-emerald-600"
            accentBorder="border-[var(--border)] hover:border-emerald-300 dark:hover:border-emerald-700"
            accentBtn="bg-emerald-600 hover:bg-emerald-700"
          />
          <ActionCard
            delay={0.21} onClick={() => onNavigate("playground")}
            icon={Terminal} title="SQL Playground" btnLabel="Open Playground"
            desc="Write, format and visualize SQL with a Monaco editor and live diagrams."
            badge="DDL Editor" badgeColor="bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"
            accentBg="bg-violet-50 dark:bg-violet-500/10" accentIcon="text-violet-600"
            accentBorder="border-[var(--border)] hover:border-violet-300 dark:hover:border-violet-700"
            accentBtn="bg-violet-600 hover:bg-violet-700"
          />
          <ActionCard
            delay={0.25} onClick={() => onNavigate("migrate")}
            icon={Bot} title="AI Database Assistant" btnLabel="Open Migrator"
            desc="Migrate SQL schemas between PostgreSQL, MySQL, SQLite and more."
            badge="SQL → SQL" badgeColor="bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400"
            accentBg="bg-sky-50 dark:bg-sky-500/10" accentIcon="text-sky-600"
            accentBorder="border-[var(--border)] hover:border-sky-300 dark:hover:border-sky-700"
            accentBtn="bg-sky-600 hover:bg-sky-700"
          />
        </div>
      </section>

      {/* ── Continue Working + Usage ──────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

        {/* Continue Working */}
        <div>
          <motion.h2 {...fadeUp(0.14)}
            className="text-xs font-bold uppercase tracking-widest text-[var(--text-subtle)] mb-3 px-1">
            Continue Working
          </motion.h2>
          {recentProject ? (
            <motion.div {...fadeUp(0.18)} whileHover={{ y: -2 }}
              className="card p-5 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all group"
              onClick={() => { useStore.getState().setActiveProject(recentProject.id); onNavigate("project-detail"); }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--primary-light)" }}>
                <FolderOpen size={20} style={{ color: "var(--primary)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-bold text-[var(--text)] truncate">{recentProject.name}</p>
                  {recentProject.pinned && <Star size={11} className="fill-amber-400 text-amber-400 flex-shrink-0" />}
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {recentProject.files.length} file{recentProject.files.length !== 1 ? "s" : ""} ·{" "}
                  {recentProject.dbType.toUpperCase()} · Updated {timeAgo(recentProject.updatedAt)}
                </p>
                {recentProject.description && (
                  <p className="text-[11px] text-[var(--text-subtle)] mt-1 line-clamp-1">{recentProject.description}</p>
                )}
              </div>
              <ChevronRight size={16} className="text-[var(--text-subtle)] group-hover:text-[var(--primary)] transition-colors flex-shrink-0" />
            </motion.div>
          ) : (
            <motion.div {...fadeUp(0.18)}
              className="card p-8 flex flex-col items-center gap-3 text-center border-dashed">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--surface)" }}>
                <FolderOpen size={20} className="text-[var(--text-subtle)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-muted)]">No projects yet</p>
                <p className="text-xs text-[var(--text-subtle)] mt-0.5">Create your first project to get started</p>
              </div>
              <button onClick={() => onNavigate("projects")}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white transition-all"
                style={{ background: "var(--primary)" }}>
                New Project <ArrowRight size={11} />
              </button>
            </motion.div>
          )}

          {/* Recent projects list (up to 3 more) */}
          {myProjects.length > 1 && (
            <div className="mt-2 space-y-1.5">
              {[...myProjects]
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .slice(1, 4)
                .map((p, i) => (
                  <motion.button key={p.id} {...fadeUp(0.2 + i * 0.04)}
                    onClick={() => { useStore.getState().setActiveProject(p.id); onNavigate("project-detail"); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[var(--border)]
                      hover:bg-[var(--surface)] transition-colors text-left group"
                  >
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--primary-light)" }}>
                      <Database size={11} style={{ color: "var(--primary)" }} />
                    </div>
                    <span className="flex-1 text-xs font-medium text-[var(--text)] truncate">{p.name}</span>
                    <span className="text-[10px] text-[var(--text-subtle)]">{timeAgo(p.updatedAt)}</span>
                    <ChevronRight size={13} className="text-[var(--text-subtle)] group-hover:text-[var(--primary)] transition-colors" />
                  </motion.button>
                ))}
              {myProjects.length > 4 && (
                <button onClick={() => onNavigate("projects")}
                  className="w-full text-center text-xs text-[var(--primary)] font-semibold py-2 hover:underline">
                  View all {myProjects.length} projects →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Usage panel */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <motion.h2 {...fadeUp(0.14)}
              className="text-xs font-bold uppercase tracking-widest text-[var(--text-subtle)]">
              Plan Usage
            </motion.h2>
            <button onClick={() => onNavigate("usage")}
              className="text-[11px] font-semibold text-[var(--primary)] hover:underline flex items-center gap-0.5">
              Full details <ChevronRight size={11} />
            </button>
          </div>
          <motion.div {...fadeUp(0.2)} className="card p-5 space-y-4">
            {/* Plan badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPro
                  ? <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-500/20">
                      <Star size={10} className="fill-amber-500 text-amber-500" /> Pro Plan
                    </span>
                  : <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">Free Plan</span>
                }
              </div>
              {!isPro && (
                <button onClick={() => onNavigate("pricing")}
                  className="text-[11px] font-semibold text-[var(--primary)] hover:underline flex items-center gap-0.5">
                  Upgrade <Zap size={10} />
                </button>
              )}
            </div>

            {[
              {
                label: "AI Conversions",
                used: sub.conversionsUsedThisMonth,
                total: plan.conversionsPerMonth,
                color: "var(--primary)",
              },
              {
                label: "Projects",
                used: myProjects.length,
                total: plan.maxProjects,
                color: "#10b981",
              },
            ].map((item) => {
              const pct = Math.min(100, Math.round((item.used / item.total) * 100));
              const isHigh = pct >= 80;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-medium text-[var(--text-muted)]">{item.label}</span>
                    <span className={cn("text-[11px] font-bold tabular-nums", isHigh ? "text-red-500" : "text-[var(--text)]")}>
                      {item.used} / {item.total}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--surface)] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(4, pct)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                      className="h-full rounded-full"
                      style={{ background: isHigh ? "#ef4444" : item.color }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Quick stats */}
            <div className="pt-2 border-t border-[var(--border)] grid grid-cols-2 gap-3">
              {[
                { label: "Quick Converts", value: quickHistory.length, icon: Sparkles, color: "text-violet-500" },
                { label: "Files Total",    value: totalFiles,          icon: FileCode,  color: "text-sky-500"    },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon size={13} className={color} />
                  <div>
                    <p className="text-sm font-bold text-[var(--text)] tabular-nums leading-tight">{value}</p>
                    <p className="text-[9px] text-[var(--text-subtle)] leading-tight">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <UpgradeLimitDialog
        open={limitOpen}
        onClose={() => setLimitOpen(false)}
        reason="conversions"
        onNavigatePricing={() => onNavigate("pricing")}
      />
    </div>
  );
}
