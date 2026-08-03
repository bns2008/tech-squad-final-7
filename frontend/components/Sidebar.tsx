"use client";

import { motion } from "framer-motion";
import { Home, History, FolderOpen, LayoutTemplate, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  page: string;
  onNavigate: (page: string) => void;
}

const nav = [
  { id: "home", label: "Home", icon: Home },
  { id: "history", label: "History", icon: History },
  { id: "projects", label: "My Projects", icon: FolderOpen },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ page, onNavigate }: SidebarProps) {
  return (
    <aside
      className="sidebar fixed left-0 top-0 bottom-0 w-[200px] z-30 flex flex-col
        border-r border-[var(--border)] bg-[var(--card)]"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-[57px] border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">ER</span>
        </div>
        <span className="font-bold text-[15px] text-[var(--text)]">ER to SQL</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ id, label, icon: Icon }) => (
          <motion.button
            key={id}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate(id)}
            className={cn("nav-item w-full", page === id && "active")}
          >
            <Icon size={16} />
            <span>{label}</span>
          </motion.button>
        ))}
      </nav>

      {/* Upgrade banner */}
      <div className="px-3 pb-4">
        <div
          className="rounded-xl p-4 text-white"
          style={{ background: "var(--primary)" }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Zap size={15} className="text-yellow-300" />
            <span className="font-bold text-sm">Upgrade to Pro</span>
          </div>
          <ul className="text-xs text-white/80 space-y-1 mb-3">
            <li>✓ Unlimited Conversions</li>
            <li>✓ Export in All Formats</li>
            <li>✓ Priority Support</li>
          </ul>
          <button
            className="w-full bg-white font-semibold text-xs py-2 rounded-lg hover:bg-white/90 transition-colors"
            style={{ color: "var(--primary)" }}
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </aside>
  );
}
