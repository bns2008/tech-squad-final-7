"use client";
import { motion } from "framer-motion";
import { Zap, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { conversionsLeft, getPlan, maybeResetMonthly, PLANS } from "@/lib/subscription";
import { cn } from "@/lib/utils";

interface UsageBannerProps {
  onNavigatePricing: () => void;
}

export default function UsageBanner({ onNavigatePricing }: UsageBannerProps) {
  const { getSubscription } = useStore();
  const sub = getSubscription();
  const plan = getPlan(sub);
  const left = conversionsLeft(sub);
  const used = sub.conversionsUsedThisMonth;
  const total = plan.conversionsPerMonth;
  const pct = total > 0 ? (used / total) * 100 : 0;
  const isPro = sub.planId === "pro";

  if (isPro) return null; // don't show banner for pro users

  const color =
    pct >= 100 ? "bg-red-500"
    : pct >= 80 ? "bg-amber-500"
    : "bg-primary-500";

  const textColor =
    pct >= 100 ? "text-red-600 dark:text-red-400"
    : pct >= 80 ? "text-amber-600 dark:text-amber-400"
    : "text-[var(--text-muted)]";

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
            <Zap size={12} className="text-primary-600" />
          </div>
          <span className="text-sm font-semibold text-[var(--text)]">Free Plan</span>
          <span className="badge badge-gray text-[10px]">Monthly Usage</span>
        </div>
        <button
          onClick={onNavigatePricing}
          className="flex items-center gap-1 text-xs text-primary-600 font-semibold hover:underline"
        >
          Upgrade <ArrowRight size={11} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={cn("h-full rounded-full transition-colors", color)}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className={textColor}>
          {left === 0
            ? "No conversions remaining this month"
            : `${left} of ${total} conversions remaining`}
        </span>
        <span className="text-[var(--text-subtle)]">{used}/{total} used</span>
      </div>

      {/* Limit warning */}
      {left <= 1 && left > 0 && (
        <div className="mt-2.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2">
          ⚠️ Almost out! Upgrade to Pro for 50 conversions per month.
        </div>
      )}
      {left === 0 && (
        <div className="mt-2.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
          🚫 Limit reached. Upgrade to continue converting diagrams.
        </div>
      )}
    </div>
  );
}
