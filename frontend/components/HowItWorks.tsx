"use client";

import { motion } from "framer-motion";
import { Upload, Cpu, Code2 } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: Upload,
    title: "Upload ER Diagram",
    desc: "Upload any clear ER diagram image",
  },
  {
    number: 2,
    icon: Cpu,
    title: "AI Analysis",
    desc: "Our AI will analyze and extract information",
  },
  {
    number: 3,
    icon: Code2,
    title: "Generate Code",
    desc: "Get SQL code and other outputs",
  },
];

export default function HowItWorks() {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-[var(--text)] mb-4">How it works</h3>
      <div className="space-y-4">
        {steps.map(({ number, icon: Icon, title, desc }, i) => (
          <motion.div
            key={number}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-3"
          >
            <div className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-[var(--primary)]
              flex items-center justify-center">
              <Icon size={13} className="text-[var(--primary)]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold text-[var(--primary)]">{number}</span>
                <span className="text-sm font-semibold text-[var(--text)]">{title}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">{desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
