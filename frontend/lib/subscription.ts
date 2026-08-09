// ── Plan definitions ──────────────────────────────────────────────────────────
import type { Plan, PlanId, Subscription } from "./types";

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    conversionsPerMonth: 5,
    maxProjects: 3,
    maxImagesPerProject: 5,
    aiGenerationsPerMonth: 70, // 70 AI SQL generation credits for free users
    zipExport: false,
    priorityQueue: false,
    versionHistory: false,
    advancedExport: false,
    support: "community",
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 199,
    conversionsPerMonth: 50,
    maxProjects: 25,
    maxImagesPerProject: 25,
    aiGenerationsPerMonth: 1000, // Unlimited essentially for Pro users
    zipExport: true,
    priorityQueue: true,
    versionHistory: true,
    advancedExport: true,
    support: "priority",
  },
};

// ── Get current month key ─────────────────────────────────────────────────────
export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Build default subscription ────────────────────────────────────────────────
export function defaultSubscription(): Subscription {
  const now = Date.now();
  return {
    planId: "free",
    startedAt: now,
    renewsAt: now + 30 * 24 * 60 * 60 * 1000,
    conversionsUsedThisMonth: 0,
    aiGenerationsUsedThisMonth: 0,
    lastResetMonth: currentMonthKey(),
  };
}

// ── Reset monthly counter if month changed ────────────────────────────────────
export function maybeResetMonthly(sub: Subscription): Subscription {
  const now = currentMonthKey();
  if (sub.lastResetMonth !== now) {
    return { ...sub, conversionsUsedThisMonth: 0, aiGenerationsUsedThisMonth: 0, lastResetMonth: now };
  }
  return sub;
}

// ── Usage check helpers ───────────────────────────────────────────────────────
export function canConvert(sub: Subscription): boolean {
  const s = maybeResetMonthly(sub);
  const plan = PLANS[s.planId];
  return s.conversionsUsedThisMonth < (s.conversionLimitOverride ?? plan.conversionsPerMonth);
}

export function canCreateProject(sub: Subscription, currentCount: number): boolean {
  const plan = PLANS[sub.planId];
  return currentCount < (sub.projectLimitOverride ?? plan.maxProjects);
}

export function canAddImage(sub: Subscription, currentCount: number): boolean {
  const plan = PLANS[sub.planId];
  return currentCount < (sub.imageLimitOverride ?? plan.maxImagesPerProject);
}

export function conversionsLeft(sub: Subscription): number {
  const s = maybeResetMonthly(sub);
  const plan = PLANS[s.planId];
  return Math.max(0, (s.conversionLimitOverride ?? plan.conversionsPerMonth) - s.conversionsUsedThisMonth);
}

export function effectiveLimits(sub: Subscription) {
  const plan = PLANS[sub.planId];
  return {
    conversions: sub.conversionLimitOverride ?? plan.conversionsPerMonth,
    projects: sub.projectLimitOverride ?? plan.maxProjects,
    images: sub.imageLimitOverride ?? plan.maxImagesPerProject,
  };
}

export function getPlan(sub: Subscription): Plan {
  return PLANS[sub.planId];
}

export function canUsePlayground(sub: Subscription): boolean {
  return sub.planId === "pro";
}

// ── AI Generation credits helpers ───────────────────────────────────────────────
export function canGenerateAI(sub: Subscription): boolean {
  const s = maybeResetMonthly(sub);
  const plan = PLANS[s.planId];
  return s.aiGenerationsUsedThisMonth < (s.aiGenerationsLimitOverride ?? plan.aiGenerationsPerMonth);
}

export function aiGenerationsLeft(sub: Subscription): number {
  const s = maybeResetMonthly(sub);
  const plan = PLANS[s.planId];
  return Math.max(0, (s.aiGenerationsLimitOverride ?? plan.aiGenerationsPerMonth) - s.aiGenerationsUsedThisMonth);
}

export function incrementAIGenerations(sub: Subscription): Subscription {
  const s = maybeResetMonthly(sub);
  return { ...s, aiGenerationsUsedThisMonth: s.aiGenerationsUsedThisMonth + 1 };
}
