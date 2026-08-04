"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Sun, Globe, Bell, Shield, Trash2,
  Eye, EyeOff, AlertCircle, BarChart3
} from "lucide-react";
import { useStore } from "@/lib/store";
import { changePassword, deleteAccount } from "@/lib/auth";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import UsagePage from "@/components/pages/UsagePage";

const TABS = [
  { id: "usage",     label: "Usage",           icon: BarChart3 },
  { id: "password",  label: "Change Password", icon: Lock },
  { id: "theme",     label: "Appearance",       icon: Sun },
  { id: "language",  label: "Language",         icon: Globe },
  { id: "notify",    label: "Notifications",    icon: Bell },
  { id: "privacy",   label: "Privacy",          icon: Shield },
  { id: "danger",    label: "Delete Account",   icon: Trash2, danger: true },
];

export default function SettingsPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { user, theme, setTheme, selectedLanguage, setSelectedLanguage, logout } = useStore();
  const [tab, setTab]     = useState("usage");
  const [saving, setSaving] = useState(false);

  const [notifs,  setNotifs]  = useState({ email: true,  browser: false, weekly: true });
  const [privacy, setPrivacy] = useState({ publicProfile: false, analytics: true });
  const [pw,      setPw]      = useState({ current: "", next: "", confirm: "" });
  const [showPw,  setShowPw]  = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const inp =
    "w-full py-2.5 px-4 text-sm rounded-xl border border-[var(--border)] bg-[var(--card)] " +
    "text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none " +
    "focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 transition-all";

  const savePassword = async () => {
    if (!user) return;
    if (pw.next !== pw.confirm) { toast.error("Passwords don't match"); return; }
    if (pw.next.length < 8)     { toast.error("Password must be at least 8 characters"); return; }
    setSaving(true);
    try {
      await changePassword(user.id, pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      toast.success("Password changed!");
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!user || deleteConfirm !== "DELETE") { toast.error('Type "DELETE" to confirm'); return; }
    setSaving(true);
    try {
      await deleteAccount(user.id);
      logout();
      toast.success("Account deleted");
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      style={{ height: "22px", minWidth: "40px" }}
      className={cn(
        "relative rounded-full transition-colors flex-shrink-0",
        checked ? "bg-primary-600" : "bg-[var(--border)]"
      )}
    >
      <span className={cn(
        "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
        checked && "translate-x-[18px]"
      )} />
    </button>
  );

  const Row = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between py-4 border-b border-[var(--border)] last:border-none">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-[var(--text)]">{label}</p>
        {desc && <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">Settings</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage your account preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar tab list */}
        <div className="card p-2 h-fit">
          {TABS.map(({ id, label, icon: Icon, danger }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all",
                tab === id
                  ? danger
                    ? "bg-red-50 dark:bg-red-500/10 text-red-600"
                    : theme === "dark" ? "text-black" : "text-white"
                  : danger
                    ? "text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
              )}
              style={tab === id && !danger ? { background: "var(--primary)" } : undefined}
            >
              <Icon size={15} />{label}
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div className="card p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >

              {/* ── Usage ── */}
              {tab === "usage" && (
                <UsagePage onNavigate={onNavigate} />
              )}

              {/* ── Change Password ── */}
              {tab === "password" && (
                <div>
                  <h2 className="text-lg font-bold text-[var(--text)] mb-5">Change Password</h2>
                  <div className="space-y-4 max-w-sm">
                    {[
                      { label: "Current Password",     key: "current", val: pw.current },
                      { label: "New Password",          key: "next",    val: pw.next },
                      { label: "Confirm New Password",  key: "confirm", val: pw.confirm },
                    ].map(({ label, key, val }) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-[var(--text)] mb-1.5">{label}</label>
                        <div className="relative">
                          <input
                            type={showPw ? "text" : "password"}
                            className={`${inp} pr-10`}
                            placeholder="••••••••"
                            value={val}
                            onChange={(e) => setPw((p) => ({ ...p, [key]: e.target.value }))}
                          />
                          {key === "current" && (
                            <button
                              type="button"
                              onClick={() => setShowPw(!showPw)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
                            >
                              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <button onClick={savePassword} disabled={saving} className="btn-primary text-sm disabled:opacity-60">
                      {saving ? "Saving…" : "Update Password"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Appearance ── */}
              {tab === "theme" && (
                <div>
                  <h2 className="text-lg font-bold text-[var(--text)] mb-5">Appearance</h2>
                  <Row label="Theme" desc="Choose your interface color scheme">
                    <div className="flex items-center gap-2">
                      {(["light", "dark"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                            theme === t ? "bg-primary-600 text-white border-primary-600" : "btn-ghost"
                          )}
                        >
                          {t === "light" ? "☀️ Light" : "🌙 Dark"}
                        </button>
                      ))}
                    </div>
                  </Row>
                </div>
              )}

              {/* ── Language ── */}
              {tab === "language" && (
                <div>
                  <h2 className="text-lg font-bold text-[var(--text)] mb-5">Language</h2>
                  <Row label="Default SQL Output" desc="Default language shown in the code editor">
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="py-2.5 px-4 text-sm rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 cursor-pointer"
                    >
                      {["postgresql","mysql","sqlite","mssql","oracle"].map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </Row>
                </div>
              )}

              {/* ── Notifications ── */}
              {tab === "notify" && (
                <div>
                  <h2 className="text-lg font-bold text-[var(--text)] mb-5">Notifications</h2>
                  <Row label="Email Notifications" desc="Get notified about processing completions">
                    <Toggle checked={notifs.email}   onChange={() => setNotifs((n) => ({ ...n, email:   !n.email }))} />
                  </Row>
                  <Row label="Browser Notifications" desc="Show desktop alerts for long-running tasks">
                    <Toggle checked={notifs.browser} onChange={() => setNotifs((n) => ({ ...n, browser: !n.browser }))} />
                  </Row>
                  <Row label="Weekly Summary" desc="Get a weekly digest of your activity">
                    <Toggle checked={notifs.weekly}  onChange={() => setNotifs((n) => ({ ...n, weekly:  !n.weekly }))} />
                  </Row>
                </div>
              )}

              {/* ── Privacy ── */}
              {tab === "privacy" && (
                <div>
                  <h2 className="text-lg font-bold text-[var(--text)] mb-5">Privacy</h2>
                  <Row label="Public Profile" desc="Allow others to see your profile">
                    <Toggle checked={privacy.publicProfile} onChange={() => setPrivacy((p) => ({ ...p, publicProfile: !p.publicProfile }))} />
                  </Row>
                  <Row label="Usage Analytics" desc="Help improve Schemalens by sharing anonymous usage data">
                    <Toggle checked={privacy.analytics} onChange={() => setPrivacy((p) => ({ ...p, analytics: !p.analytics }))} />
                  </Row>
                  <div className="mt-6 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                    <p className="text-xs font-semibold text-[var(--text)] mb-1">Data Handling</p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Your ER diagrams and generated SQL are processed securely by our AI engine. Images are sent for analysis and are not stored on our servers. Generated code is stored locally in your browser.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Delete Account ── */}
              {tab === "danger" && (
                <div>
                  <h2 className="text-lg font-bold text-red-500 mb-2">Delete Account</h2>
                  <p className="text-sm text-[var(--text-muted)] mb-6">
                    This will permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <div className="p-4 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 mb-5">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-600 dark:text-red-400">
                        <strong>Warning:</strong> All projects, files, and generated SQL will be permanently deleted.
                      </p>
                    </div>
                  </div>
                  <div className="max-w-sm space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                        Type <span className="font-mono font-bold">DELETE</span> to confirm
                      </label>
                      <input
                        className={inp}
                        placeholder="DELETE"
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleDelete}
                      disabled={saving || deleteConfirm !== "DELETE"}
                      className="w-full py-2.5 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {saving ? "Deleting…" : "Permanently Delete Account"}
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
