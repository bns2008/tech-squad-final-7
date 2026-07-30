"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { forgotPassword } from "@/lib/auth";

export default function ForgotPasswordPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (sent) return (
    <div className="text-center py-12">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-5">
        <CheckCircle size={38} className="text-primary-600" />
      </motion.div>
      <h2 className="text-3xl font-bold text-[var(--text)] mb-3">Check your email</h2>
      <p className="text-base text-[var(--text-muted)] mb-8 max-w-sm mx-auto">
        We sent a password reset link to <strong className="text-[var(--text)]">{email}</strong>
      </p>
      <button onClick={() => onNavigate("login")}
        className="flex items-center gap-2 mx-auto text-base text-[var(--text-muted)] hover:text-[var(--text)] transition-colors font-medium">
        <ArrowLeft size={16} /> Back to login
      </button>
    </div>
  );

  return (
    <div>
      <button onClick={() => onNavigate("login")}
        className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-8 transition-colors font-medium">
        <ArrowLeft size={15} /> Back to login
      </button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[var(--text)] mb-2">Reset your password</h1>
        <p className="text-base text-[var(--text-muted)]">Enter your email and we'll send you a reset link.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 text-sm text-red-600 bg-red-50 dark:bg-red-500/10
          border border-red-200 dark:border-red-500/20 rounded-2xl px-5 py-4 mb-6">
          <AlertCircle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handle} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-[var(--text)] mb-2">Email address</label>
          <div className="relative">
            <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="you@example.com"
              className="w-full pl-11 pr-5 py-3.5 text-base rounded-2xl border border-[var(--border)]
                bg-[var(--card)] text-[var(--text)] placeholder:text-[var(--text-subtle)]
                focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 transition-all" />
          </div>
        </div>

        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          type="submit" disabled={loading}
          className="w-full flex items-center justify-center py-4 rounded-2xl text-base font-semibold
            bg-gradient-to-r from-primary-600 to-primary-700 text-white
            hover:shadow-xl hover:shadow-primary-500/30 transition-all disabled:opacity-60">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending…
            </span>
          ) : "Send Reset Link"}
        </motion.button>
      </form>
    </div>
  );
}
