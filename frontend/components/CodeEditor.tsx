"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Copy, Download, Maximize2, Minimize2, ChevronDown, Check
} from "lucide-react";
import { cn, downloadText, getLanguageExtension } from "@/lib/utils";
import { useStore } from "@/lib/store";
import toast from "react-hot-toast";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  { ssr: false, loading: () => <EditorSkeleton /> }
);

const LANGUAGES = [
  { id: "postgresql", label: "PostgreSQL" },
  { id: "mysql",      label: "MySQL" },
  { id: "sqlite",     label: "SQLite" },
  { id: "mssql",      label: "SQL Server" },
  { id: "oracle",     label: "Oracle" },
];

function getMonacoLang(_id: string) {
  // All five are SQL-family dialects — use "sql" for Monaco syntax highlighting
  return "sql";
}

// Each dialect now returns native DDL — display the SQL as-is.
function getDisplayCode(sql: string, _lang: string) {
  return sql;
}

interface CodeEditorProps {
  sql: string;
  onRegenerate: () => void;
  isProcessing: boolean;
}

export default function CodeEditor({ sql, onRegenerate, isProcessing }: CodeEditorProps) {
  const { selectedLanguage, setSelectedLanguage, theme } = useStore();
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const displayCode = getDisplayCode(sql, selectedLanguage);
  const currentLang = LANGUAGES.find((l) => l.id === selectedLanguage)!;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(displayCode);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }, [displayCode]);

  const handleDownload = useCallback(() => {
    const ext = getLanguageExtension(selectedLanguage);
    downloadText(displayCode, `schema_${selectedLanguage}.${ext}`);
    toast.success(`Downloaded schema_${selectedLanguage}.${ext}`);
  }, [displayCode, selectedLanguage]);

  return (
    <div className={cn(
      "flex flex-col h-full",
      fullscreen && "fixed inset-0 z-50 bg-[var(--card)] p-4"
    )}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="btn-ghost text-sm gap-2 min-w-[140px] justify-between"
          >
            <span>{currentLang.label}</span>
            <ChevronDown size={13} className={cn("transition-transform", langOpen && "rotate-180")} />
          </button>

          {langOpen && (
            <div className="absolute top-full mt-1.5 left-0 z-50 card shadow-card-lg
              py-1.5 w-48 max-h-64 overflow-y-auto">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => { setSelectedLanguage(lang.id); setLangOpen(false); }}
                  className={cn(
                    "w-full text-left px-3.5 py-2 text-sm hover:bg-[var(--primary-light)]",
                    "hover:text-[var(--primary)] transition-colors",
                    selectedLanguage === lang.id && "text-[var(--primary)] font-semibold bg-[var(--primary-light)]"
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Copy */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={handleCopy}
          className={cn(
            "btn-ghost text-sm",
            copied && "border-green-400 text-green-600 bg-green-50 dark:bg-green-500/10"
          )}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied!" : "Copy"}
        </motion.button>

        {/* Download */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={handleDownload}
          className="btn-ghost text-sm"
        >
          <Download size={13} />
          Download
        </motion.button>

        {/* Fullscreen */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setFullscreen(!fullscreen)}
          className="btn-ghost text-sm px-2"
          title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </motion.button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 card overflow-hidden min-h-[360px]">
        <MonacoEditor
          height="100%"
          language={getMonacoLang(selectedLanguage)}
          value={displayCode}
          theme={theme === "dark" ? "vs-dark" : "light"}
          options={{
            readOnly: true,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: "none",
            smoothScrolling: true,
            scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5 },
            overviewRulerLanes: 0,
            contextmenu: false,
          }}
        />
      </div>

      {/* Regenerate button */}
      <div className="mt-3 flex justify-end">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onRegenerate}
          disabled={isProcessing}
          className="btn-ghost text-sm px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Again
        </motion.button>
      </div>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="p-5 space-y-3">
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-4"
          style={{ width: `${30 + Math.random() * 60}%`, marginLeft: i % 4 !== 0 ? "24px" : "0" }}
        />
      ))}
    </div>
  );
}
