"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, ArrowLeft, Ban, Check, CheckCircle, ChevronRight, Clock, Database,
  Download, Eye, FileCode, FileJson, FileText, FolderOpen, HardDrive, Mail,
  MoreHorizontal, RefreshCw, Search, Shield, Trash2, TrendingUp, UserRound, Users,
  X, Zap,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { adminDeleteUser, adminUpdateSubscription, adminUpdateUser, getAllUsers } from "@/lib/auth";
import { currentMonthKey, defaultSubscription, effectiveLimits, getPlan, PLANS } from "@/lib/subscription";
import { downloadJSON, downloadText, formatBytes, formatDateTime, initials, timeAgo } from "@/lib/utils";
import type { AdminUser, ProjectFile, Subscription, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type AdminTab = "overview" | "users" | "projects";
type UserFilter = "all" | "free" | "pro" | "active" | "suspended";

const tabs: Array<{ id: AdminTab; label: string; icon: typeof Activity }> = [
  { id: "overview", label: "Overview", icon: TrendingUp },
  { id: "users", label: "Users", icon: Users },
  { id: "projects", label: "Projects", icon: Database },
];

function getSubscription(user: User): Subscription {
  return user.subscription ?? defaultSubscription();
}

function userStats(user: User, projects: ReturnType<typeof useStore.getState>["projects"]) {
  const owned = projects.filter((project) => project.ownerId === user.id);
  const files = owned.flatMap((project) => project.files);
  const completed = files.filter((file) => file.status === "completed");
  const storage = files.reduce((total, file) => total + (file.imageUrl ? file.imageUrl.length : 0) + (file.sql?.length ?? 0), 0);
  return { projects: owned, files, completed, storage };
}

function StatCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string | number; detail?: string; icon: typeof Users; tone: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", tone)}><Icon size={16} /></div>
        <Activity size={13} className="text-[var(--text-subtle)]" />
      </div>
      <p className="text-2xl font-bold text-[var(--text)] mt-4 truncate">{value}</p>
      <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">{label}</p>
      {detail && <p className="text-[10px] text-[var(--text-subtle)] mt-1 truncate">{detail}</p>}
    </motion.div>
  );
}

export default function AdminPage() {
  const { user: admin, projects, setProjects } = useStore();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectSearch, setProjectSearch] = useState("");

  const reload = () => setUsers(getAllUsers());
  useEffect(() => { reload(); }, []);

  const enriched = useMemo<AdminUser[]>(() => users.map((candidate) => {
    const stats = userStats(candidate, projects);
    return { ...candidate, totalProjects: stats.projects.length, totalFiles: stats.files.length, storageUsed: stats.storage, status: candidate.suspended ? "suspended" : "active" };
  }), [users, projects]);

  const visibleUsers = enriched.filter((candidate) => {
    const matchesSearch = `${candidate.name} ${candidate.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || (filter === "suspended" ? candidate.suspended : filter === "active" ? !candidate.suspended : getSubscription(candidate).planId === filter);
    return matchesSearch && matchesFilter;
  });

  const totalFiles = projects.flatMap((project) => project.files);
  const totalConversions = totalFiles.filter((file) => file.status === "completed").length;
  const storage = totalFiles.reduce((total, file) => total + (file.sql?.length ?? 0) + (file.imageUrl?.length ?? 0), 0);
  const activeUsers = users.filter((candidate) => !candidate.suspended && candidate.lastLogin && Date.now() - candidate.lastLogin < 30 * 86400000).length;
  const selected = users.find((candidate) => candidate.id === selectedId) ?? null;

  const updateSelected = (next: User) => setUsers((current) => current.map((candidate) => candidate.id === next.id ? next : candidate));
  const toggleSuspend = (candidate: User) => {
    const updated = adminUpdateUser(candidate.id, { suspended: !candidate.suspended });
    if (updated) { updateSelected(updated); toast.success(updated.suspended ? "Account suspended" : "Account reactivated"); }
  };
  const deleteUser = (candidate: User) => {
    if (!confirm(`Delete ${candidate.name} and all of their local workspace data?`)) return;
    adminDeleteUser(candidate.id);
    setProjects(projects.filter((project) => project.ownerId !== candidate.id));
    setUsers((current) => current.filter((item) => item.id !== candidate.id));
    setSelectedId(null);
    toast.success("User and projects deleted");
  };

  if (selected) {
    return <UserDetail user={selected} projects={projects} adminId={admin?.id ?? ""} onBack={() => setSelectedId(null)} onUpdate={updateSelected} onDelete={() => deleteUser(selected)} onProjectsChange={setProjects} />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center"><Shield size={21} className="text-amber-600" /></div>
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-600">Super Admin</p><h1 className="text-2xl font-bold text-[var(--text)]">Control center</h1><p className="text-sm text-[var(--text-muted)] mt-1">Manage accounts, plans, usage, projects, and platform activity.</p></div>
        </div>
        <button onClick={reload} className="btn-ghost self-start lg:self-auto"><RefreshCw size={14} /> Refresh data</button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatCard label="Total Users" value={users.length} icon={Users} tone="bg-blue-50 text-blue-600" />
        <StatCard label="Free Plan" value={users.filter((candidate) => getSubscription(candidate).planId === "free").length} icon={UserRound} tone="bg-slate-100 text-slate-600" />
        <StatCard label="Pro Plan" value={users.filter((candidate) => getSubscription(candidate).planId === "pro").length} icon={Zap} tone="bg-amber-50 text-amber-600" />
        <StatCard label="Total Projects" value={projects.length} icon={FolderOpen} tone="bg-emerald-50 text-emerald-600" />
        <StatCard label="Conversions" value={totalConversions} icon={FileCode} tone="bg-emerald-50 text-emerald-600" />
        <StatCard label="Active Users" value={activeUsers} icon={Activity} tone="bg-cyan-50 text-cyan-600" detail="Last 30 days" />
        <StatCard label="Storage" value={formatBytes(storage)} icon={HardDrive} tone="bg-rose-50 text-rose-600" detail="Generated workspace data" />
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--border)]">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={cn("flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap", tab === id ? "border-primary-600 text-primary-600" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]")}><Icon size={14} />{label}</button>)}
      </div>

      {tab === "overview" && <Overview users={enriched} projects={projects} totalFiles={totalFiles.length} totalConversions={totalConversions} />}
      {tab === "users" && <UserTable users={visibleUsers} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} onSelect={setSelectedId} onSuspend={toggleSuspend} onDelete={deleteUser} adminId={admin?.id ?? ""} />}
      {tab === "projects" && <ProjectTable projects={projects} users={users} search={projectSearch} setSearch={setProjectSearch} onDelete={(id) => { setProjects(projects.filter((project) => project.id !== id)); toast.success("Project deleted"); }} />}
    </div>
  );
}

function Overview({ users, projects, totalFiles, totalConversions }: { users: AdminUser[]; projects: ReturnType<typeof useStore.getState>["projects"]; totalFiles: number; totalConversions: number }) {
  const completed = projects.flatMap((project) => project.files).filter((file) => file.status === "completed").length;
  const failed = projects.flatMap((project) => project.files).filter((file) => file.status === "failed").length;
  const plans = users.reduce((map, candidate) => { const key = getSubscription(candidate).planId; map[key] = (map[key] ?? 0) + 1; return map; }, {} as Record<string, number>);
  return <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_.8fr] gap-4">
    <div className="card p-5"><div className="flex items-center justify-between mb-5"><div><h2 className="font-bold text-[var(--text)]">Workspace activity</h2><p className="text-xs text-[var(--text-muted)] mt-1">Live totals from user-owned workspaces</p></div><Activity size={18} className="text-primary-600" /></div>{[{ label: "Completed conversions", value: completed, pct: totalFiles ? completed / totalFiles * 100 : 0, color: "bg-emerald-500" }, { label: "Failed conversions", value: failed, pct: totalFiles ? failed / totalFiles * 100 : 0, color: "bg-rose-500" }, { label: "Projects with files", value: projects.filter((project) => project.files.length > 0).length, pct: projects.length ? projects.filter((project) => project.files.length > 0).length / projects.length * 100 : 0, color: "bg-primary-500" }].map((item) => <div key={item.label} className="mb-5 last:mb-0"><div className="flex justify-between text-xs mb-2"><span className="text-[var(--text-muted)]">{item.label}</span><strong className="text-[var(--text)]">{item.value}</strong></div><div className="h-2 rounded-full bg-[var(--surface)] overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${item.pct}%` }} className={cn("h-full rounded-full", item.color)} /></div></div>)}</div>
    <div className="card p-5"><h2 className="font-bold text-[var(--text)] mb-4">Plan distribution</h2><div className="space-y-4">{[{ id: "free", label: "Free", color: "bg-slate-400" }, { id: "pro", label: "Pro", color: "bg-amber-500" }].map((item) => <div key={item.id} className="flex items-center gap-3"><span className={cn("w-2.5 h-2.5 rounded-full", item.color)} /><div className="flex-1"><div className="flex justify-between text-sm"><span className="text-[var(--text-muted)]">{item.label}</span><strong className="text-[var(--text)]">{plans[item.id] ?? 0}</strong></div><div className="h-1.5 bg-[var(--surface)] rounded-full mt-2 overflow-hidden"><div className={cn("h-full rounded-full", item.color)} style={{ width: `${users.length ? ((plans[item.id] ?? 0) / users.length) * 100 : 0}%` }} /></div></div></div>)}</div><div className="divider my-5" /><div className="flex justify-between text-sm"><span className="text-[var(--text-muted)]">Total conversions</span><strong className="text-[var(--text)]">{totalConversions}</strong></div></div>
  </div>;
}

function UserTable({ users, search, setSearch, filter, setFilter, onSelect, onSuspend, onDelete, adminId }: { users: AdminUser[]; search: string; setSearch: (value: string) => void; filter: UserFilter; setFilter: (value: UserFilter) => void; onSelect: (id: string) => void; onSuspend: (user: User) => void; onDelete: (user: User) => void; adminId: string }) {
  return <div className="space-y-4"><div className="flex flex-col md:flex-row gap-3 md:items-center justify-between"><div className="relative w-full md:max-w-sm"><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or email" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--text)] outline-none focus:border-primary-500" /></div><div className="flex items-center gap-2 overflow-x-auto">{(["all", "free", "pro", "active", "suspended"] as UserFilter[]).map((value) => <button key={value} onClick={() => setFilter(value)} className={cn("px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap", filter === value ? "bg-primary-600 text-white" : "bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)]")}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div></div><div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[980px]"><thead><tr className="border-b border-[var(--border)]">{["User", "Plan", "Status", "Projects", "Conversions", "Last login", "Registered", "Action"].map((heading) => <th key={heading} className="px-5 py-3 text-left text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">{heading}</th>)}</tr></thead><tbody>{users.length === 0 ? <tr><td colSpan={8} className="py-16 text-center text-sm text-[var(--text-muted)]">No users match this filter.</td></tr> : users.map((candidate, index) => { const sub = getSubscription(candidate); const stats = userStats(candidate, useStore.getState().projects); return <motion.tr key={candidate.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * .025 }} className="border-b border-[var(--border)] last:border-none hover:bg-[var(--surface)]"><td className="px-5 py-3.5"><button onClick={() => onSelect(candidate.id)} className="flex items-center gap-3 text-left"><span className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-600">{initials(candidate.name)}</span><span><strong className="block text-sm text-[var(--text)]">{candidate.name}</strong><small className="block text-[10px] text-[var(--text-muted)]">{candidate.email}</small></span></button></td><td className="px-5"><span className={cn("badge text-[10px]", sub.planId === "pro" ? "bg-amber-50 text-amber-600" : "badge-gray")}>{sub.planId === "pro" ? "Pro" : "Free"}</span></td><td className="px-5"><span className={cn("badge text-[10px]", candidate.suspended ? "badge-danger" : "badge-success")}>{candidate.suspended ? "Suspended" : "Active"}</span></td><td className="px-5 text-sm text-[var(--text-muted)]">{stats.projects.length}</td><td className="px-5 text-sm text-[var(--text-muted)]">{stats.completed.length} / {effectiveLimits(sub).conversions}</td><td className="px-5 text-xs text-[var(--text-muted)]">{candidate.lastLogin ? formatDateTime(candidate.lastLogin) : "Never"}</td><td className="px-5 text-xs text-[var(--text-muted)]">{formatDateTime(candidate.createdAt)}</td><td className="px-5"><div className="flex gap-1"><button title="View profile" onClick={() => onSelect(candidate.id)} className="icon-button"><Eye size={14} /></button><button title={candidate.suspended ? "Reactivate" : "Suspend"} onClick={() => onSuspend(candidate)} className="icon-button">{candidate.suspended ? <CheckCircle size={14} className="text-emerald-500" /> : <Ban size={14} className="text-amber-500" />}</button>{candidate.id !== adminId && <button title="Delete user" onClick={() => onDelete(candidate)} className="icon-button text-rose-500"><Trash2 size={14} /></button>}</div></td></motion.tr>; })}</tbody></table></div></div></div>;
}

function ProjectTable({ projects, users, search, setSearch, onDelete }: { projects: ReturnType<typeof useStore.getState>["projects"]; users: User[]; search: string; setSearch: (value: string) => void; onDelete: (id: string) => void }) {
  const filtered = projects.filter((project) => `${project.name} ${users.find((candidate) => candidate.id === project.ownerId)?.name ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-4"><div className="relative max-w-sm"><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects or owners" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--text)] outline-none focus:border-primary-500" /></div><div className="card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[700px]"><thead><tr className="border-b border-[var(--border)]">{["Project", "Owner", "Files", "Completed", "Updated", "Action"].map((heading) => <th key={heading} className="px-5 py-3 text-left text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">{heading}</th>)}</tr></thead><tbody>{filtered.map((project) => <tr key={project.id} className="border-b border-[var(--border)] last:border-none"><td className="px-5 py-4"><p className="font-semibold text-sm text-[var(--text)]">{project.name}</p><p className="text-[10px] text-[var(--text-muted)]">{project.dbType}</p></td><td className="px-5 text-sm text-[var(--text-muted)]">{users.find((candidate) => candidate.id === project.ownerId)?.email ?? "Unknown"}</td><td className="px-5 text-sm text-[var(--text-muted)]">{project.files.length}</td><td className="px-5 text-sm text-[var(--text-muted)]">{project.files.filter((file) => file.status === "completed").length}</td><td className="px-5 text-xs text-[var(--text-muted)]">{formatDateTime(project.updatedAt)}</td><td className="px-5"><button onClick={() => onDelete(project.id)} className="icon-button text-rose-500"><Trash2 size={14} /></button></td></tr>)}</tbody></table></div></div></div>;
}

function UserDetail({ user, projects, adminId, onBack, onUpdate, onDelete, onProjectsChange }: { user: User; projects: ReturnType<typeof useStore.getState>["projects"]; adminId: string; onBack: () => void; onUpdate: (user: User) => void; onDelete: () => void; onProjectsChange: (projects: ReturnType<typeof useStore.getState>["projects"]) => void }) {
  const [subscription, setSubscription] = useState(getSubscription(user));
  const [activeSection, setActiveSection] = useState<"profile" | "projects" | "files">("profile");
  const ownedProjects = projects.filter((project) => project.ownerId === user.id);
  const files = ownedProjects.flatMap((project) => project.files);
  const completed = files.filter((file) => file.status === "completed");
  const limits = effectiveLimits(subscription);
  const setSub = (updates: Partial<Subscription>) => {
    const next = { ...subscription, ...updates, lastResetMonth: subscription.lastResetMonth || currentMonthKey() };
    setSubscription(next);
    const updated = adminUpdateSubscription(user.id, next);
    if (updated) onUpdate(updated);
    toast.success("Subscription updated");
  };
  const changeNumber = (key: "conversionLimitOverride" | "projectLimitOverride" | "imageLimitOverride", value: string) => setSub({ [key]: Math.max(0, Number(value) || 0) });
  const resetUsage = () => setSub({ conversionsUsedThisMonth: 0, lastResetMonth: currentMonthKey() });
  const deleteProject = (id: string) => { onProjectsChange(projects.filter((project) => project.id !== id)); toast.success("Project deleted"); };

  return <div className="space-y-5"><button onClick={onBack} className="btn-ghost"><ArrowLeft size={14} /> Back to users</button><header className="card p-5 flex flex-col lg:flex-row lg:items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-lg font-bold text-primary-600">{initials(user.name)}</div><div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold text-[var(--text)]">{user.name}</h1><span className={cn("badge text-[10px]", subscription.planId === "pro" ? "bg-amber-50 text-amber-600" : "badge-gray")}>{getPlan(subscription).name} plan</span><span className={cn("badge text-[10px]", user.suspended ? "badge-danger" : "badge-success")}>{user.suspended ? "Suspended" : "Active"}</span></div><p className="text-sm text-[var(--text-muted)] mt-1 flex items-center gap-1"><Mail size={13} />{user.email}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => { const updated = adminUpdateUser(user.id, { suspended: !user.suspended }); if (updated) onUpdate(updated); toast.success(updated?.suspended ? "Account suspended" : "Account reactivated"); }} className="btn-ghost">{user.suspended ? <CheckCircle size={14} /> : <Ban size={14} />}{user.suspended ? "Reactivate" : "Suspend"}</button>{user.id !== adminId && <button onClick={onDelete} className="btn-ghost text-rose-500"><Trash2 size={14} /> Delete</button>}</div></header><div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[{ label: "Projects", value: ownedProjects.length, icon: FolderOpen }, { label: "Images", value: files.length, icon: Database }, { label: "Conversions", value: completed.length, icon: FileCode }, { label: "Remaining", value: Math.max(0, limits.conversions - subscription.conversionsUsedThisMonth), icon: TrendingUp }, { label: "Storage", value: formatBytes(files.reduce((sum, file) => sum + (file.sql?.length ?? 0) + (file.imageUrl?.length ?? 0), 0)), icon: HardDrive }].map((item) => <div key={item.label} className="card p-4"><item.icon size={15} className="text-primary-600 mb-3" /><p className="text-lg font-bold text-[var(--text)]">{item.value}</p><p className="text-xs text-[var(--text-muted)]">{item.label}</p></div>)}</div><div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--border)]">{[{ id: "profile", label: "Profile & controls" }, { id: "projects", label: "Project history" }, { id: "files", label: "Generated files" }].map((item) => <button key={item.id} onClick={() => setActiveSection(item.id as typeof activeSection)} className={cn("px-4 py-3 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap", activeSection === item.id ? "border-primary-600 text-primary-600" : "border-transparent text-[var(--text-muted)]")}>{item.label}</button>)}</div>{activeSection === "profile" && <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4"><div className="card p-5"><h2 className="font-bold text-[var(--text)] mb-4">Account details</h2><div className="space-y-3 text-sm"><Info label="Registration date" value={formatDateTime(user.createdAt)} /><Info label="Last login" value={user.lastLogin ? formatDateTime(user.lastLogin) : "Never"} /><Info label="Email verification" value={user.emailVerified ? "Verified" : "Unverified"} /><Info label="Recent activity" value={user.lastLogin ? timeAgo(user.lastLogin) : "No activity recorded"} /></div></div><div className="card p-5"><div className="flex items-center justify-between mb-4"><div><h2 className="font-bold text-[var(--text)]">Subscription controls</h2><p className="text-xs text-[var(--text-muted)] mt-1">Changes apply immediately to this account.</p></div><Zap size={17} className="text-amber-500" /></div><div className="space-y-3"><label className="text-xs font-semibold text-[var(--text-muted)]">Plan<select value={subscription.planId} onChange={(event) => setSub({ planId: event.target.value as "free" | "pro" })} className="admin-select"><option value="free">Free</option><option value="pro">Pro</option></select></label><Control label="Monthly conversions" value={limits.conversions} onChange={(value) => changeNumber("conversionLimitOverride", value)} placeholder={String(getPlan(subscription).conversionsPerMonth)} /><Control label="Maximum projects" value={limits.projects} onChange={(value) => changeNumber("projectLimitOverride", value)} placeholder={String(getPlan(subscription).maxProjects)} /><Control label="Images per project" value={limits.images} onChange={(value) => changeNumber("imageLimitOverride", value)} placeholder={String(getPlan(subscription).maxImagesPerProject)} /><div className="flex gap-2 pt-1"><button onClick={resetUsage} className="btn-ghost text-xs"><RefreshCw size={13} /> Reset monthly usage</button><span className="text-xs text-[var(--text-muted)] self-center">{subscription.conversionsUsedThisMonth} used</span></div></div></div></div>}{activeSection === "projects" && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{ownedProjects.length === 0 ? <Empty label="No projects created" /> : ownedProjects.map((project) => <div key={project.id} className="card p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-[var(--text)]">{project.name}</h3><p className="text-xs text-[var(--text-muted)] mt-1">{project.dbType} · {project.files.length} images</p></div><button onClick={() => deleteProject(project.id)} className="icon-button text-rose-500"><Trash2 size={14} /></button></div><div className="divider my-4" /><div className="flex justify-between text-xs text-[var(--text-muted)]"><span>{project.files.filter((file) => file.status === "completed").length} completed</span><span>{formatDateTime(project.updatedAt)}</span></div></div>)}</div>}{activeSection === "files" && <FileList files={files} />}</div>;
}

function FileList({ files }: { files: ProjectFile[] }) {
  const [inspecting, setInspecting] = useState<ProjectFile | null>(null);
  return <div className="card overflow-hidden"><div className="px-5 py-4 border-b border-[var(--border)]"><h2 className="font-bold text-[var(--text)]">Generated SQL, TXT, and JSON</h2><p className="text-xs text-[var(--text-muted)] mt-1">Inspect or download files belonging to this user.</p></div><div className="divide-y divide-[var(--border)]">{files.length === 0 ? <Empty label="No generated files" /> : files.map((file) => <div key={file.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4"><div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center"><FileCode size={15} className="text-emerald-600" /></div><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-[var(--text)] truncate">{file.name}</p><p className="text-xs text-[var(--text-muted)]">{file.status} · {file.completedAt ? formatDateTime(file.completedAt) : "Not completed"}</p></div><div className="flex gap-1"><button disabled={!file.sql} onClick={() => setInspecting(file)} className="icon-button" title="Inspect file"><Eye size={14} /></button><button disabled={!file.sql} onClick={() => downloadText(file.sql ?? "", `${file.name}.sql`)} className="icon-button" title="Download SQL"><FileCode size={14} /></button><button disabled={!file.sql} onClick={() => downloadText(file.sql ?? "", `${file.name}.txt`)} className="icon-button" title="Download TXT"><FileText size={14} /></button><button disabled={!file.sql} onClick={() => downloadJSON({ filename: file.name, sql: file.sql, stats: file.stats }, `${file.name}.json`)} className="icon-button" title="Download JSON"><FileJson size={14} /></button></div></div>)}</div><AnimatePresence>{inspecting && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setInspecting(null)} /><motion.div initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .98 }} className="relative z-10 w-full max-w-3xl card overflow-hidden"><div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border)]"><div><h3 className="font-bold text-[var(--text)]">{inspecting.name}.sql</h3><p className="text-xs text-[var(--text-muted)]">Read-only generated output</p></div><button onClick={() => setInspecting(null)} className="icon-button"><X size={15} /></button></div><pre className="max-h-[60vh] overflow-auto p-5 code-font text-xs leading-6 text-[var(--text)] bg-[var(--surface)] whitespace-pre-wrap">{inspecting.sql}</pre></motion.div></div>}</AnimatePresence></div>;
}
function Control({ label, value, onChange, placeholder }: { label: string; value: number; onChange: (value: string) => void; placeholder: string }) { return <label className="block text-xs font-semibold text-[var(--text-muted)]">{label}<input type="number" min="0" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="admin-input" /></label>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4"><span className="text-[var(--text-muted)]">{label}</span><strong className="text-right text-[var(--text)]">{value}</strong></div>; }
function Empty({ label }: { label: string }) { return <div className="py-14 text-center text-sm text-[var(--text-muted)]">{label}</div>; }
