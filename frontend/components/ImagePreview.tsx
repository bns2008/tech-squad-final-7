"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ZoomIn, ZoomOut, RefreshCw, ImageIcon } from "lucide-react";

interface ImagePreviewProps {
  src: string;
  filename: string;
  onReplace: () => void;
  onRemove: () => void;
}

export default function ImagePreview({ src, filename, onReplace, onRemove }: ImagePreviewProps) {
  const [zoom, setZoom] = useState(1);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <ImageIcon size={14} />
          <span className="text-sm font-medium truncate max-w-[160px]">{filename}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
            className="btn-ghost px-2 py-1.5 text-xs"
            title="Zoom in"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            className="btn-ghost px-2 py-1.5 text-xs"
            title="Zoom out"
          >
            <ZoomOut size={13} />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="btn-ghost px-2 py-1.5 text-xs"
            title="Reset zoom"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Image viewport */}
      <div className="flex-1 card overflow-auto flex items-center justify-center p-4
        min-h-[300px] bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.02)_10px,rgba(0,0,0,0.02)_20px)]">
        <motion.img
          src={src}
          alt={filename}
          style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="max-w-full max-h-full object-contain rounded-lg shadow-card"
          draggable={false}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onReplace}
          className="btn-ghost flex-1 justify-center text-sm"
        >
          Replace Image
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onRemove}
          className="btn-ghost flex-1 justify-center text-sm text-red-500
            hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
        >
          Remove
        </motion.button>
      </div>
    </div>
  );
}
