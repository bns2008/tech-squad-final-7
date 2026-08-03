"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Wand2, Terminal, Bot,
  FolderOpen, FileCode, TrendingUp, Sparkles,
  ArrowRight, Search, Zap, GitMerge,
  Database, BarChart3, Download, Clock,
  ChevronRight, Star, Info, X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";
import { conversionsLeft, getPlan } from "@/lib/subscription";
import UpgradeLimitDialog from "@/components/UpgradeLimitDialog";
import UsageBanner from "@/components/UsageBanner";
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
  const { user, projects: allProjects, getSubscription, quickHistory, theme } = useStore();

  const sub        = getSubscription();
  const plan       = getPlan(sub);
  const isPro      = sub.planId === "pro";
  const ownerId    = user?.id ?? "";
  const myProjects = allProjects.filter((p) => p.ownerId === ownerId);

  const totalDone  = myProjects.reduce((s, p) => s + p.files.filter((f) => f.status === "completed").length, 0);
  const totalFiles = myProjects.reduce((s, p) => s + p.files.length, 0);
  const left       = conversionsLeft(sub);
  const firstName  = user?.name?.split(" ")[0] ?? "there";

  // Recent project
  const recentProject = [...myProjects].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;

  // Search
  const [search, setSearch] = useState("");
  const [limitOpen, setLimitOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: / focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // 3D tilt state
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = heroRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = ((e.clientX - left) / width  - 0.5) * 10;  // -5 to +5 deg
    const y = ((e.clientY - top)  / height - 0.5) * -10; // +5 to -5 deg
    setTilt({ x, y });
  };
  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  // Derive hour greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // 3D shadow stack
  const heroShadow = theme === "light"
    ? "0 2px 0 0 #e8d5d5, 0 4px 0 0 #ddc9c9, 0 6px 0 0 #d2bebe, 0 12px 32px -4px rgba(0,0,0,0.18), 0 40px 80px -20px rgba(0,0,0,0.14)"
    : "0 2px 0 0 rgba(255,255,255,0.05), 0 4px 0 0 rgba(255,255,255,0.03), 0 12px 32px -4px rgba(0,0,0,0.55), 0 40px 80px -20px rgba(0,0,0,0.4)";

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">

      {/* ── Usage banner (free only) ─────────────────────────────────────── */}
      {!isPro && <UsageBanner onNavigatePricing={() => onNavigate("pricing")} />}

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      {/* Perspective wrapper — gives the 3D space */}
      <div style={{ perspective: "1200px", perspectiveOrigin: "50% 40%" }}>
        <motion.section
          ref={heroRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          animate={{
            rotateX: tilt.y,
            rotateY: tilt.x,
            scale: tilt.x !== 0 || tilt.y !== 0 ? 1.018 : 1,
          }}
          transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.6 }}
          className="relative overflow-hidden rounded-2xl border cursor-default"
          style={{
            background: theme === "light" ? "#FCEFEF" : "var(--card)",
            borderColor: theme === "light" ? "rgba(220,180,180,0.6)" : "var(--border)",
            boxShadow: heroShadow,
            transformStyle: "preserve-3d",
            willChange: "transform",
          }}
        >
          {/* ── Floating orb top-right ── */}
          <motion.div
            animate={{ y: [0, -10, 0], x: [0, 6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
            style={{
              background: theme === "light"
                ? "radial-gradient(circle, rgba(255,180,180,0.35) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(var(--primary-rgb, 99,102,241),0.18) 0%, transparent 70%)",
              filter: "blur(28px)",
            }}
          />
          {/* ── Floating orb bottom-left ── */}
          <motion.div
            animate={{ y: [0, 8, 0], x: [0, -5, 0] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-14 -left-14 w-56 h-56 rounded-full pointer-events-none"
            style={{
              background: theme === "light"
                ? "radial-gradient(circle, rgba(200,160,200,0.25) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
              filter: "blur(24px)",
            }}
          />

          {/* ── Dot grid ── */}
          <div className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.10) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              opacity: theme === "light" ? 0.35 : 0.12,
            }}
          />

          {/* ── Shine layer — follows tilt ── */}
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            animate={{
              background: `radial-gradient(circle at ${50 + tilt.x * 3}% ${50 - tilt.y * 3}%, rgba(255,255,255,${theme === "light" ? "0.28" : "0.07"}) 0%, transparent 60%)`,
            }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
          />

          {/* ── Floating 3D "chip" elements ── */}
          <motion.div
            animate={{ y: [0, -6, 0], rotate: [0, 3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-6 right-8 hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border backdrop-blur-sm select-none"
            style={{
              background: theme === "light" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.06)",
              borderColor: theme === "light" ? "rgba(200,150,150,0.4)" : "rgba(255,255,255,0.1)",
              color: theme === "light" ? "#b06060" : "rgba(255,255,255,0.5)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
              transform: "translateZ(20px)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> AI Powered
          </motion.div>

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

          <motion.div
            animate={{ y: [0, -5, 0], rotate: [0, 2, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="absolute top-8 left-8 hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border backdrop-blur-sm select-none"
            style={{
              background: theme === "light" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.06)",
              borderColor: theme === "light" ? "rgba(200,150,150,0.4)" : "rgba(255,255,255,0.1)",
              color: theme === "light" ? "#b06060" : "rgba(255,255,255,0.5)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
              transform: "translateZ(24px)",
            }}
          >
            🗄 Multi-dialect
          </motion.div>

          {/* ── Content ── */}
          <div className="relative px-6 sm:px-10 py-10 sm:py-14 flex flex-col items-center text-center">

            {/* Greeting pill */}
            <motion.div {...fadeUp(0)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--border)] mb-6 text-xs font-medium text-[var(--text-muted)]"
              style={{ background: "var(--surface)" }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {greeting}, {firstName} 👋
            </motion.div>

            {/* Headline */}
            <motion.h1 {...fadeUp(0.07)}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--text)] leading-[1.15] tracking-tight max-w-2xl"
            >
              Build, Convert and{" "}
              <span style={{ color: "var(--primary)" }}>Optimize</span>{" "}
              Databases with AI
            </motion.h1>

            {/* Subtitle */}
            <motion.p {...fadeUp(0.12)}
              className="mt-4 text-sm sm:text-base text-[var(--text-muted)] max-w-xl leading-relaxed"
            >
              Upload ER diagrams, describe schemas in plain English, or migrate SQL between dialects —
              all powered by AI, delivered in seconds.
            </motion.p>

            {/* Search bar */}
            <motion.div {...fadeUp(0.17)} className="relative mt-7 w-full max-w-lg">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects, SQL, templates…"
                className="w-full pl-11 pr-12 py-3 rounded-xl border border-[var(--border)]
                  bg-[var(--surface)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]
                  transition-all duration-200 shadow-sm"
              />
              <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded
                border border-[var(--border)] text-[var(--text-subtle)] font-mono hidden sm:block">
                /
              </kbd>
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] hover:text-[var(--text)] sm:hidden">
                  <X size={14} />
                </button>
              )}
            </motion.div>

            {/* Plan badge */}
            <motion.div {...fadeUp(0.2)} className="mt-4 flex items-center gap-2">
              {isPro ? (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full
                  bg-amber-50 dark:bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-500/20">
                  <Star size={10} className="fill-amber-500 text-amber-500" /> Pro Plan
                </span>
              ) : (
                <button onClick={() => onNavigate("pricing")}
                  className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full
                    bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20
                    hover:border-[var(--primary)]/50 transition-colors">
                  <Zap size={10} /> Upgrade to Pro — {left} conversions left
                </button>
              )}
            </motion.div>
          </div>
        </motion.section>
      </div>

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
