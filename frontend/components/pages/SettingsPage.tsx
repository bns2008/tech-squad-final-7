"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Sun, Globe, Trash2,
  Eye, EyeOff, AlertCircle, BarChart3, Plus, X, Settings
} from "lucide-react";
import { useStore } from "@/lib/store";
import { changePassword, deleteAccount } from "@/lib/auth";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import UsagePage from "@/components/pages/UsagePage";

const TABS = [
  { id: "usage",         label: "Usage",           icon: BarChart3 },
  { id: "password",      label: "Change Password", icon: Lock },
  { id: "theme",         label: "Appearance",      icon: Sun },
  { id: "language",      label: "Language",        icon: Globe },
  { id: "customization", label: "Customization",   icon: Settings },
  { id: "danger",        label: "Delete Account",  icon: Trash2, danger: true },
];

export default function SettingsPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { user, theme, setTheme, selectedLanguage, setSelectedLanguage, logout, defaultColumnsEnabled, setDefaultColumnsEnabled, defaultColumns, setDefaultColumns } = useStore();
  const [tab, setTab]     = useState("usage");
  const [saving, setSaving] = useState(false);


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


  const Row = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between py-4 border-b border-[var(--border)] last:border-none">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-base font-medium text-[var(--text)]">{label}</p>
        {desc && <p className="text-sm text-[var(--text-muted)] mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text)]">Settings</h1>
        <p className="text-base text-[var(--text-muted)] mt-1">Manage your account preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar tab list */}
        <div className="card p-2 h-fit">
          {TABS.map(({ id, label, icon: Icon, danger }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-base font-medium transition-all",
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
              <Icon size={17} />{label}
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
                    <label className="block text-base font-medium text-[var(--text)] mb-1.5">{label}</label>
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
                    <button onClick={savePassword} disabled={saving} className="btn-primary text-base disabled:opacity-60">
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
                            "px-4 py-2.5 rounded-xl text-base font-medium border transition-all",
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

              {/* ── Customization ── */}
              {tab === "customization" && (
                <div>
                  <h2 className="text-lg font-bold text-[var(--text)] mb-5">Default Columns</h2>
                  <p className="text-sm text-[var(--text-muted)] mb-6">
                    Configure default columns that will be automatically added to every table generated from ER diagrams.
                    This feature works with all tools: analyze, generate, and migrate.
                  </p>

                  <Row label="Enable Default Columns" desc="Automatically add default columns to all generated tables">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={defaultColumnsEnabled}
                        onChange={(e) => setDefaultColumnsEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/25 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                  </Row>

                  {defaultColumnsEnabled && (
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold text-[var(--text)]">Default Columns Configuration</h3>
                        <button
                          onClick={() => {
                            const newCol = {
                              id: Date.now().toString(),
                              name: "",
                              type: "VARCHAR(255)",
                              constraints: "",
                              defaultValue: "",
                              description: ""
                            };
                            setDefaultColumns([...defaultColumns, newCol]);
                          }}
                          className="btn-ghost text-sm flex items-center gap-1.5"
                        >
                          <Plus size={16} /> Add Column
                        </button>
                      </div>

                      {defaultColumns.length === 0 ? (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                          <p>No default columns configured.</p>
                          <p className="text-sm mt-1">Click "Add Column" to create your first default column.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {defaultColumns.map((col, idx) => (
                            <div key={col.id} className="card p-4 border border-[var(--border)]">
                              <div className="flex items-start justify-between mb-3">
                                <span className="text-sm font-medium text-[var(--text-muted)]">Column {idx + 1}</span>
                                <button
                                  onClick={() => {
                                    setDefaultColumns(defaultColumns.filter(c => c.id !== col.id));
                                  }}
                                  className="text-red-500 hover:text-red-600 transition-colors"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                                    Column Name *
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g., created_at"
                                    value={col.name}
                                    onChange={(e) => {
                                      const updated = defaultColumns.map(c =>
                                        c.id === col.id ? { ...c, name: e.target.value } : c
                                      );
                                      setDefaultColumns(updated);
                                    }}
                                    className={inp}
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                                    Data Type *
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g., TIMESTAMP, UUID, VARCHAR(255)"
                                    value={col.type}
                                    onChange={(e) => {
                                      const updated = defaultColumns.map(c =>
                                        c.id === col.id ? { ...c, type: e.target.value } : c
                                      );
                                      setDefaultColumns(updated);
                                    }}
                                    className={inp}
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                                    Constraints
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g., NOT NULL, UNIQUE"
                                    value={col.constraints}
                                    onChange={(e) => {
                                      const updated = defaultColumns.map(c =>
                                        c.id === col.id ? { ...c, constraints: e.target.value } : c
                                      );
                                      setDefaultColumns(updated);
                                    }}
                                    className={inp}
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                                    Default Value
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g., CURRENT_TIMESTAMP, NULL"
                                    value={col.defaultValue}
                                    onChange={(e) => {
                                      const updated = defaultColumns.map(c =>
                                        c.id === col.id ? { ...c, defaultValue: e.target.value } : c
                                      );
                                      setDefaultColumns(updated);
                                    }}
                                    className={inp}
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                                    Description / Relation
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g., Tracks when record was created, Foreign key to users table"
                                    value={col.description}
                                    onChange={(e) => {
                                      const updated = defaultColumns.map(c =>
                                        c.id === col.id ? { ...c, description: e.target.value } : c
                                      );
                                      setDefaultColumns(updated);
                                    }}
                                    className={inp}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Tip:</strong> Common default columns include <code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30">created_at</code>, 
                          <code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 ml-1">updated_at</code>, 
                          <code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 ml-1">created_by</code>, and 
                          <code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 ml-1">is_active</code>.
                        </p>
                      </div>
                    </div>
                  )}
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
