"use client";

import { motion } from "framer-motion";
import { Table2, GitBranch, Columns, ShieldCheck, Clock } from "lucide-react";
import { AnalysisResult } from "@/lib/store";
import { formatTime } from "@/lib/utils";

interface StatsCardsProps {
  result: AnalysisResult;
}

export default function StatsCards({ result }: StatsCardsProps) {
  const { stats } = result;

  const cards = [
    {
      label: "Entities",
      value: stats.tables,
      icon: Table2,
      color: "#7C3AED",
      bg: "#F5F0FF",
      darkBg: "rgba(124,58,237,0.12)",
    },
    {
      label: "Relationships",
      value: stats.relationships,
      icon: GitBranch,
      color: "#2563EB",
      bg: "#EFF6FF",
      darkBg: "rgba(37,99,235,0.12)",
    },
    {
      label: "Attributes",
      value: stats.attributes,
      icon: Columns,
      color: "#059669",
      bg: "#ECFDF5",
      darkBg: "rgba(5,150,105,0.12)",
    },
    {
      label: "Confidence",
      value: `${stats.confidence}%`,
      icon: ShieldCheck,
      color: "#D97706",
      bg: "#FFFBEB",
      darkBg: "rgba(217,119,6,0.12)",
    },
    {
      label: "Processing Time",
      value: formatTime(stats.processingTime),
      icon: Clock,
      color: "#DC2626",
      bg: "#FEF2F2",
      darkBg: "rgba(220,38,38,0.12)",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(({ label, value, icon: Icon, color, bg, darkBg }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.35 }}
          whileHover={{ y: -2 }}
          className="card p-4"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
            style={{ background: bg }}
          >
            <Icon size={17} style={{ color }} />
          </div>
          <div className="text-2xl font-bold text-[var(--text)] mb-0.5">{value}</div>
          <div className="text-xs text-[var(--text-muted)]">{label}</div>
        </motion.div>
      ))}
    </div>
  );
}
