"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { CloudUpload, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadAreaProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export default function UploadArea({ onFile, disabled }: UploadAreaProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[], rejected: any[]) => {
      setError(null);
      if (rejected.length) {
        setError(rejected[0]?.errors?.[0]?.message ?? "Invalid file");
        return;
      }
      if (accepted[0]) onFile(accepted[0]);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
      "image/svg+xml": [".svg"],
    },
    maxSize: 15 * 1024 * 1024,
    multiple: false,
    disabled,
  });

  return (
    <div className="w-full">
      <motion.div
        {...(getRootProps() as any)}
        whileHover={!disabled ? { scale: 1.005 } : {}}
        className={cn(
          "upload-zone flex flex-col items-center justify-center gap-4 px-8 py-16 text-center",
          isDragActive && "drag-over",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <input {...getInputProps()} />

        {/* Icon */}
        <motion.div
          animate={isDragActive ? { scale: 1.15, rotate: -3 } : { scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-14 h-14 rounded-2xl bg-[var(--primary-light)] flex items-center
            justify-center text-[var(--primary)]"
        >
          <CloudUpload size={26} strokeWidth={1.5} />
        </motion.div>

        {/* Text */}
        <div>
          <p className="text-lg font-semibold text-[var(--text)] mb-1">
            {isDragActive ? "Release to analyze" : "Drag & drop your ER diagram here"}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            or{" "}
            <span className="text-[var(--primary)] font-medium underline decoration-dotted cursor-pointer">
              click to browse
            </span>
          </p>
        </div>

        {/* Supported formats */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span className="text-xs text-[var(--text-subtle)]">Supported formats:</span>
          {["PNG", "JPG", "JPEG", "SVG"].map((fmt) => (
            <span
              key={fmt}
              className="badge badge-gray font-mono text-[11px]"
            >
              {fmt}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400
              bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20
              rounded-xl px-4 py-3"
          >
            <AlertCircle size={15} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
