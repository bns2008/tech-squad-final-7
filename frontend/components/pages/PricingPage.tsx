"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Zap, Crown, X, ChevronDown, ChevronUp,
  CreditCard, Clock, Shield, Star, ArrowRight
} from "lucide-react";
import { useStore } from "@/lib/store";
import { PLANS } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Razorpay checkout helper ──────────────────────────────────────────────────
// Razorpay's SDK is loaded via a <script> tag at runtime; we declare the global.
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const FEATURE_ROWS = [
  { label: "Conversions / month",       free: "5",    pro: "50" },
  { label: "Max projects",              free: "3",    pro: "25" },
  { label: "Images per project",        free: "5",    pro: "25" },
  { label: "Quick Convert",             free: true,   pro: true },
  { label: "Monaco code editor",        free: true,   pro: true },
  { label: "SQL / TXT / JSON export",   free: true,   pro: true },
  { label: "ZIP project export",        free: false,  pro: true },
  { label: "Version history",           free: false,  pro: true },
  { label: "Priority queue",            free: false,  pro: true },
  { label: "Advanced export options",   free: false,  pro: true },
  { label: "Support",                   free: "Community", pro: "Priority" },
];

const FAQ = [
  { q: "Can I cancel my Pro subscription anytime?", a: "Yes. You can cancel at any time from your account settings. Your plan will remain active until the end of the billing period." },
  { q: "What counts as a conversion?", a: "Each ER diagram image you analyze (via Quick Convert or inside a Project) counts as one conversion." },
  { q: "Do unused conversions roll over?", a: "No. The conversion count resets to zero at the start of each calendar month." },
  { q: "What payment methods are accepted?", a: "We support Razorpay (UPI, cards, net banking) and Stripe (international cards). Payment integration coming soon." },
  { q: "Is my data safe?", a: "Yes. Your ER diagrams are processed securely and are never stored on our servers. Generated code is saved locally in your browser." },
];

export default function PricingPage() {
  const { subscription, upgradeToPro, user } = useStore();
  const isPro    = subscription.planId === "pro";
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      // 1. Load Razorpay checkout SDK
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        toast.error("Failed to load payment gateway. Please try again.");
        setLoading(false);
        return;
      }

      // 2. Create an order on our server
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: PLANS.pro.price }), // ₹199
      });

      if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => ({}));
        throw new Error(err?.error ?? "Could not create payment order.");
      }

      const { orderId, amount, currency, keyId } = await orderRes.json();

      // 3. Open Razorpay checkout popup
      await new Promise<void>((resolve, reject) => {
        const options = {
          key:          keyId,
          amount,                          // in paise
          currency,
          name:         "ER AI Studio",
          description:  "Pro Plan — Monthly",
          order_id:     orderId,
          prefill: {
            name:  user?.name  ?? "",
            email: user?.email ?? "",
          },
          theme: { color: "#6366f1" },

          handler: async (response: {
            razorpay_order_id:   string;
            razorpay_payment_id: string;
            razorpay_signature:  string;
          }) => {
            try {
              // 4. Verify signature on the server + persist plan upgrade in DB
              const numericUserId = parseInt(user?.id ?? "", 10);
              const verifyRes = await fetch("/api/razorpay/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id:   response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature:  response.razorpay_signature,
                  // Pass user_id so verify route can persist plan = "pro" in DB
                  user_id: isNaN(numericUserId) ? undefined : numericUserId,
                }),
              });

              const result = await verifyRes.json();

              if (verifyRes.ok && result.status === "success") {
                // Upgrade local Zustand state immediately
                upgradeToPro();
                toast.success("🎉 Upgraded to Pro! Enjoy 50 conversions per month.");
                resolve();
              } else {
                reject(new Error(result?.message ?? "Payment verification failed."));
              }
            } catch (err: any) {
              reject(err);
            }
          },

          modal: {
            ondismiss: () => reject(new Error("Payment cancelled.")),
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (resp: any) => {
          reject(new Error(resp?.error?.description ?? "Payment failed."));
        });
        rzp.open();
      });
    } catch (err: any) {
      if (err?.message !== "Payment cancelled.") {
        toast.error(err?.message ?? "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDowngrade = () => {
    toast("Contact support to downgrade your plan.", { icon: "ℹ️" });
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full
          bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800/50 mb-4">
          <Crown size={13} className="text-primary-600" />
          <span className="text-xs font-semibold text-primary-600">Simple, Transparent Pricing</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text)] mb-3">
          Choose your plan
        </h1>
        <p className="text-[var(--text-muted)] max-w-lg mx-auto text-sm sm:text-base">
          Start free and upgrade when you need more power.
          No hidden fees, no credit card required for the free plan.
        </p>
      </div>

      {/* Current plan badge */}
      {isPro && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-500/10
            border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
            <Check size={14} />
            You are on the Pro plan
          </div>
        </motion.div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
        {/* Free */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={cn(
            "card p-7 flex flex-col",
            !isPro && "ring-2 ring-primary-500/20"
          )}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-subtle)] mb-1">Free</p>
              <div className="flex items-end gap-1.5">
                <span className="text-4xl font-bold text-[var(--text)]">₹0</span>
                <span className="text-sm text-[var(--text-muted)] mb-1">/ month</span>
              </div>
            </div>
            {!isPro && (
              <span className="badge badge-purple text-[10px]">Current Plan</span>
            )}
          </div>

          <p className="text-sm text-[var(--text-muted)] mb-5">
            Perfect for exploring ER diagram conversion.
          </p>

          <ul className="space-y-2.5 mb-6 flex-1">
            {[
              "5 conversions / month",
              "3 projects",
              "5 images per project",
              "Quick Convert",
              "SQL · TXT · JSON export",
              "Community support",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-[var(--text-muted)]">
                <Check size={13} className="text-emerald-500 flex-shrink-0" />
                {f}
              </li>
            ))}
            {["ZIP export", "Version history", "Priority queue"].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-[var(--text-subtle)] opacity-50">
                <X size={12} className="text-[var(--border)] flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <button disabled className="btn-ghost w-full justify-center py-3 text-sm opacity-50 cursor-default">
            {isPro ? "Downgrade" : "Current Plan"}
          </button>
        </motion.div>

        {/* Pro */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className={cn(
            "card p-7 flex flex-col relative overflow-hidden",
            isPro && "ring-2 ring-primary-500/30"
          )}
        >
          {/* Gradient header accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 to-primary-400" />

          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Pro</p>
                <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full
                  bg-amber-50 dark:bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-500/20">
                  <Star size={9} fill="currentColor" /> Most Popular
                </span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-4xl font-bold text-[var(--text)]">₹199</span>
                <span className="text-sm text-[var(--text-muted)] mb-1">/ month</span>
              </div>
            </div>
            {isPro && (
              <span className="badge bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 text-[10px]">Active</span>
            )}
          </div>

          <p className="text-sm text-[var(--text-muted)] mb-5">
            For professionals and teams who need more power.
          </p>

          <ul className="space-y-2.5 mb-6 flex-1">
            {[
              "50 conversions / month",
              "25 projects",
              "25 images per project",
              "Quick Convert",
              "SQL · TXT · JSON export",
              "ZIP project export",
              "Version history",
              "Priority queue",
              "Advanced export options",
              "Priority support",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-[var(--text-muted)]">
                <Check size={13} className="text-emerald-500 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {isPro ? (
            <div className="space-y-2">
              <div className="text-center text-sm text-emerald-600 font-medium py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                ✓ Your plan is active
              </div>
              <button onClick={handleDowngrade} className="btn-ghost w-full justify-center text-xs py-2 text-[var(--text-subtle)]">
                Downgrade
              </button>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleUpgrade}
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-60
                bg-gradient-to-r from-primary-600 to-primary-700 hover:shadow-lg hover:shadow-primary-500/25"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing…
                </span>
              ) : (
                <>
                  <Zap size={14} className="text-yellow-300" />
                  Upgrade to Pro
                  <ArrowRight size={14} />
                </>
              )}
            </motion.button>
          )}
        </motion.div>
      </div>

      {/* Feature comparison table */}
      <div className="card overflow-hidden mb-12">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="font-bold text-[var(--text)]">Full Feature Comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide w-1/2">Feature</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Free</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-primary-600 uppercase tracking-wide">Pro</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map(({ label, free, pro }, i) => (
                <tr key={label} className={cn(
                  "border-b border-[var(--border)] last:border-none",
                  i % 2 === 0 ? "" : "bg-[var(--surface)]"
                )}>
                  <td className="px-6 py-3.5 text-sm text-[var(--text)]">{label}</td>
                  <td className="px-6 py-3.5 text-center">
                    {typeof free === "boolean" ? (
                      free ? <Check size={15} className="text-emerald-500 mx-auto" /> : <X size={14} className="text-[var(--border)] mx-auto" />
                    ) : (
                      <span className="text-sm text-[var(--text-muted)]">{free}</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {typeof pro === "boolean" ? (
                      pro ? <Check size={15} className="text-emerald-500 mx-auto" /> : <X size={14} className="text-[var(--border)] mx-auto" />
                    ) : (
                      <span className="text-sm font-semibold text-primary-600">{pro}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        {[
          { icon: Shield, title: "Secure Payments", desc: "Razorpay & Stripe coming soon" },
          { icon: Clock,  title: "Cancel Anytime",  desc: "No long-term commitments" },
          { icon: CreditCard, title: "No Hidden Fees", desc: "Price shown is all you pay" },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <Icon size={18} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
              <p className="text-xs text-[var(--text-muted)]">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-[var(--text)] mb-5 text-center">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="card overflow-hidden">
              <button
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--surface)] transition-colors"
              >
                <span className="text-sm font-semibold text-[var(--text)] pr-4">{item.q}</span>
                {faqOpen === i ? (
                  <ChevronUp size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                )}
              </button>
              <AnimatePresence>
                {faqOpen === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-4 text-sm text-[var(--text-muted)] leading-relaxed border-t border-[var(--border)]
                      pt-3">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
