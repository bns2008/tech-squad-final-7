"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Wand2,
  Copy,
  Download,
  CheckCircle2,
  XCircle,
  Terminal,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Code2,
  Clock,
  Database,
  Zap,
  Table,
  History,
  X,
  RotateCcw,
  GitFork,
} from "lucide-react";
import { cn, downloadText } from "@/lib/utils";
import { useStore } from "@/lib/store";
import toast from "react-hot-toast";
import ERDiagramModal from "@/components/ERDiagramModal";

// ── Monaco editor (client-only) ──────────────────────────────────────────────
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 p-6 space-y-3 bg-[var(--card)]">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="skeleton skeleton-text"
            style={{ width: `${25 + Math.random() * 55}%` }}
          />
        ))}
      </div>
    ),
  }
);

// ── Default SQL ───────────────────────────────────────────────────────────────
const DEFAULT_SQL = `-- SQL Playground — ER AI Studio
-- Press Ctrl+Enter to run  |  Ctrl+S to download schema.sql

CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20)  NOT NULL DEFAULT 'user',
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  slug  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE products (
  id           SERIAL        PRIMARY KEY,
  category_id  INT           NOT NULL REFERENCES categories(id),
  name         VARCHAR(200)  NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock        INT           NOT NULL DEFAULT 0,
  created_at   TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id          SERIAL        PRIMARY KEY,
  user_id     INT           NOT NULL REFERENCES users(id),
  status      VARCHAR(30)   NOT NULL DEFAULT 'pending',
  total       NUMERIC(12,2) NOT NULL DEFAULT 0,
  ordered_at  TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id          SERIAL        PRIMARY KEY,
  order_id    INT           NOT NULL REFERENCES orders(id),
  product_id  INT           NOT NULL REFERENCES products(id),
  quantity    INT           NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL
);
`;

// ── Types ─────────────────────────────────────────────────────────────────────
type ResultStatus = "idle" | "success" | "error";

interface ExecutionResult {
  status: ResultStatus;
  message: string;
  detail?: string;
  executedAt?: Date;
  duration?: number;
  sql?: string;
}

interface HistoryEntry {
  id: string;
  sql: string;
  result: ExecutionResult;
  timestamp: Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function detectErrorLine(sql: string): number {
  const lines = sql.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("--")) continue;
    const opens = (line.match(/\(/g) || []).length;
    const closes = (line.match(/\)/g) || []).length;
    if (opens !== closes) return i + 1;
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith("--")) return i + 1;
  }
  return 1;
}

function mockExecute(sql: string): ExecutionResult {
  const trimmed = sql.trim();
  if (!trimmed) {
    return {
      status: "error",
      message: "Empty query",
      detail: "Please write a SQL statement before running.",
    };
  }

  const hasCreate = /CREATE\s+TABLE/i.test(trimmed);

  if (hasCreate) {
    const tableMatches =
      trimmed.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)["'`]?/gi) || [];
    const tableNames = tableMatches.map((m) => {
      const match = m.match(
        /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)["'`]?/i
      );
      return match?.[1] ?? "unknown";
    });
    return {
      status: "success",
      message: "Query executed successfully",
      detail:
        tableNames.length > 0
          ? `Created ${tableNames.length} table${tableNames.length > 1 ? "s" : ""}: ${tableNames.join(", ")}`
          : "DDL statement executed.",
      executedAt: new Date(),
      duration: Math.floor(Math.random() * 40) + 8,
    };
  }

  const errorLine = detectErrorLine(trimmed);
  return {
    status: "error",
    message: `Syntax Error near line ${errorLine}`,
    detail:
      "Expected CREATE TABLE statement. Only DDL (CREATE TABLE) is supported in this playground.",
    executedAt: new Date(),
    duration: Math.floor(Math.random() * 10) + 2,
  };
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PlaygroundPage() {
  const { theme, playgroundInitialSQL, setPlaygroundInitialSQL } = useStore();
  const [sql, setSql] = useState(playgroundInitialSQL || DEFAULT_SQL);
  const [result, setResult] = useState<ExecutionResult>({ status: "idle", message: "" });
  const [outputOpen, setOutputOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [tablesOpen, setTablesOpen] = useState(false);
  const [erDiagramOpen, setErDiagramOpen] = useState(false);
  const editorRef = useRef<unknown>(null);
  const monacoRef = useRef<unknown>(null);

  const monacoTheme = theme === "dark" ? "playground-dark" : "playground-light";

  // ── Register custom Monaco themes ─────────────────────────────────────────
  const handleEditorWillMount = useCallback((monaco: any) => {
    monacoRef.current = monaco;

    monaco.editor.defineTheme("playground-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword.sql",       foreground: "8BAA82", fontStyle: "bold" },
        { token: "string.sql",        foreground: "C89B5E" },
        { token: "number",            foreground: "9ECBFF" },
        { token: "comment.line.sql",  foreground: "6B7280", fontStyle: "italic" },
        { token: "comment.block.sql", foreground: "6B7280", fontStyle: "italic" },
        { token: "delimiter.sql",     foreground: "9D9488" },
        { token: "identifier.sql",    foreground: "F7F3E8" },
        { token: "operator.sql",      foreground: "D96C6C" },
      ],
      colors: {
        "editor.background":              "#1C1718",
        "editor.foreground":              "#F7F3E8",
        "editor.lineHighlightBackground": "#221C1D",
        "editor.selectionBackground":     "#8BAA8230",
        "editorCursor.foreground":        "#8BAA82",
        "editorLineNumber.foreground":    "#5A4A4B",
        "editorLineNumber.activeForeground": "#9D9488",
        "editorIndentGuide.background":   "#3A2F30",
        "editorIndentGuide.activeBackground": "#5A4A4B",
        "scrollbarSlider.background":     "#3A2F3080",
        "scrollbarSlider.hoverBackground":"#5A4A4B80",
        "scrollbarSlider.activeBackground":"#8BAA8280",
      },
    });

    monaco.editor.defineTheme("playground-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword.sql",       foreground: "2563EB", fontStyle: "bold" },
        { token: "string.sql",        foreground: "D97706" },
        { token: "number",            foreground: "0284C7" },
        { token: "comment.line.sql",  foreground: "94A3B8", fontStyle: "italic" },
        { token: "comment.block.sql", foreground: "94A3B8", fontStyle: "italic" },
        { token: "identifier.sql",    foreground: "1E1B18" },
        { token: "operator.sql",      foreground: "DC2626" },
      ],
      colors: {
        "editor.background":              "#F8FAFB",
        "editor.foreground":              "#1E1B18",
        "editor.lineHighlightBackground": "#F1F5F9",
        "editor.selectionBackground":     "#DBEAFE",
        "editorCursor.foreground":        "#2563EB",
        "editorLineNumber.foreground":    "#CBD5E1",
        "editorLineNumber.activeForeground": "#475569",
        "editorIndentGuide.background":   "#E8E3DC",
        "editorIndentGuide.activeBackground": "#CBD5E1",
        "scrollbarSlider.background":     "#D1D5DB80",
        "scrollbarSlider.hoverBackground":"#94A3B880",
      },
    });
  }, []);

  const handleEditorDidMount = useCallback(
    (editor: any, monaco: any) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      monaco.editor.setTheme(monacoTheme);

      // Ctrl+Enter → run SQL
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => {
          const currentSQL = editor.getValue();
          const res = mockExecute(currentSQL);
          setResult(res);
          setOutputOpen(true);
          if (res.status === "success") {
            toast.success("Query executed successfully", { id: "sql-run" });
          } else {
            toast.error(res.message, { id: "sql-run" });
          }
        }
      );
    },
    [monacoTheme]
  );

  // ── Sync theme when site theme changes ────────────────────────────────────
  useEffect(() => {
    const monaco = monacoRef.current as any;
    if (monaco?.editor) monaco.editor.setTheme(monacoTheme);
  }, [monacoTheme]);

  // ── Load initial SQL from store (when coming from Quick Convert) ─────────────
  useEffect(() => {
    if (playgroundInitialSQL) {
      const editor = editorRef.current as any;
      if (editor) {
        editor.setValue(playgroundInitialSQL);
        setSql(playgroundInitialSQL);
      } else {
        setSql(playgroundInitialSQL);
      }
      // Clear the initial SQL after loading so it doesn't persist on subsequent visits
      setPlaygroundInitialSQL(null);
    }
  }, [playgroundInitialSQL, setPlaygroundInitialSQL]);

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        const currentSQL = (editorRef.current as any)?.getValue?.() ?? sql;
        downloadText(currentSQL, "schema.sql");
        toast.success("Downloaded schema.sql");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sql]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const runSQL = useCallback(() => {
    const currentSQL = (editorRef.current as any)?.getValue?.() ?? sql;
    const res = mockExecute(currentSQL);
    res.sql = currentSQL;
    setResult(res);
    setOutputOpen(true);
    
    // Add to history
    if (currentSQL.trim()) {
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        sql: currentSQL,
        result: res,
        timestamp: new Date(),
      };
      setHistory(prev => [entry, ...prev].slice(0, 50)); // Keep last 50 entries
    }
    
    if (res.status === "success") {
      toast.success("Query executed successfully", { id: "sql-run" });
    } else {
      toast.error(res.message, { id: "sql-run" });
    }
  }, [sql]);

  const formatSQL = useCallback(async () => {
    try {
      const { format } = await import("sql-formatter");
      const currentSQL = (editorRef.current as any)?.getValue?.() ?? sql;
      const formatted = format(currentSQL, {
        language: "sql",
        tabWidth: 2,
        keywordCase: "upper",
        linesBetweenQueries: 2,
      });
      const editor = editorRef.current as any;
      if (editor) {
        editor.executeEdits("format", [
          { range: editor.getModel().getFullModelRange(), text: formatted },
        ]);
        editor.pushUndoStop();
      } else {
        setSql(formatted);
      }
      toast.success("SQL formatted");
    } catch {
      toast.error("Could not format SQL");
    }
  }, [sql]);

  const copySQL = useCallback(async () => {
    const currentSQL = (editorRef.current as any)?.getValue?.() ?? sql;
    try {
      await navigator.clipboard.writeText(currentSQL);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  }, [sql]);

  const downloadSQL = useCallback(() => {
    const currentSQL = (editorRef.current as any)?.getValue?.() ?? sql;
    downloadText(currentSQL, "schema.sql");
    toast.success("Downloaded schema.sql");
  }, [sql]);

  const loadFromHistory = useCallback((entry: HistoryEntry) => {
    const editor = editorRef.current as any;
    if (editor) {
      editor.setValue(entry.sql);
      setSql(entry.sql);
      setResult(entry.result);
      setOutputOpen(true);
      toast.success("Loaded from history");
    }
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    toast.success("History cleared");
  }, []);

  const extractTables = useCallback((sql: string): string[] => {
    const matches = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)["'`]?/gi) || [];
    return matches.map(m => {
      const match = m.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)["'`]?/i);
      return match?.[1] ?? "";
    }).filter(Boolean);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  const currentTables = extractTables(sql);

  return (
    <div
      className="flex flex-col"
      style={{
        height: "calc(100vh - 57px)",
        background: "var(--surface)",
        overflow: "hidden",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center justify-between gap-4 px-3 sm:px-5 py-3 flex-shrink-0
          border-b border-[var(--border)] bg-[var(--card)] flex-wrap"
      >
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--primary-light)", color: "var(--primary)" }}
          >
            <Terminal size={16} />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-[var(--text)] leading-tight">
              SQL Playground
            </h1>
            <p className="text-[11px] text-[var(--text-subtle)] leading-tight hidden sm:block">
              Write and test SQL · <kbd className="font-mono">Ctrl+Enter</kbd> run ·{" "}
              <kbd className="font-mono">Ctrl+S</kbd> download
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={runSQL}
            className="btn-primary btn-sm gap-1.5"
            title="Run SQL (Ctrl+Enter)"
          >
            <Play size={13} />
            <span className="hidden sm:inline">Run SQL</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={formatSQL}
            className="btn-ghost btn-sm gap-1.5"
            title="Format SQL"
          >
            <Wand2 size={13} />
            <span className="hidden sm:inline">Format SQL</span>
          </motion.button>

          {/* Diagram Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setErDiagramOpen(true)}
            className="btn-ghost btn-sm gap-1.5"
            title="Generate Diagram"
          >
            <GitFork size={13} />
            <span className="hidden sm:inline">Diagram</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={copySQL}
            className="btn-ghost btn-sm gap-1.5"
            title="Copy SQL"
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5 text-[var(--success)]"
                >
                  <CheckCircle2 size={13} />
                  <span className="hidden sm:inline">Copied!</span>
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5"
                >
                  <Copy size={13} />
                  <span className="hidden sm:inline">Copy</span>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={downloadSQL}
            className="btn-ghost btn-sm gap-1.5"
            title="Download schema.sql (Ctrl+S)"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Download</span>
          </motion.button>

          <div className="w-px h-6 bg-[var(--border)] mx-1 hidden sm:block" />

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setHistoryOpen(!historyOpen)}
            className={cn("btn-ghost btn-sm gap-1.5", historyOpen && "bg-[var(--surface)")}
            title="Toggle history panel"
          >
            <History size={13} />
            <span className="hidden sm:inline">History</span>
            {history.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--primary)] text-white">
                {history.length}
              </span>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setTablesOpen(!tablesOpen)}
            className={cn("btn-ghost btn-sm gap-1.5", tablesOpen && "bg-[var(--surface)")}
            title="Toggle table explorer"
          >
            <Table size={13} />
            <span className="hidden sm:inline">Tables</span>
            {currentTables.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--primary)] text-white">
                {currentTables.length}
              </span>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* ── Editor + Sidebars + Output ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        
        {/* ── Monaco Editor area ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="flex-1 flex flex-col overflow-hidden min-w-0"
        >
          {/* VS Code–style tab bar */}
          <div
            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 flex-shrink-0
              border-b border-[var(--border)]"
            style={{ background: "var(--card)" }}
          >
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5 mr-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
            </div>

            {/* Active file tab */}
            <div
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-md text-[10px] sm:text-[11px]
                font-mono text-[var(--text-muted)] border border-[var(--border)]"
              style={{ background: "var(--surface)" }}
            >
              <Code2 size={10} className="text-[var(--primary)]" />
              <span className="hidden sm:inline">schema.sql</span>
              <span className="sm:hidden">schema</span>
            </div>

            {/* Right meta */}
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="text-[10px] text-[var(--text-subtle)] items-center gap-1 hidden sm:inline-flex">
                <Database size={10} />
                DDL Mode
              </span>
              <span className="text-[10px] text-[var(--text-subtle)] items-center gap-1 hidden md:inline-flex">
                <Zap size={10} />
                Mock Engine
              </span>
            </div>
          </div>

          {/* Monaco */}
          <div className="flex-1" style={{ minHeight: 0 }}>
            <MonacoEditor
              height="100%"
              language="sql"
              value={sql}
              theme={monacoTheme}
              beforeMount={handleEditorWillMount}
              onMount={handleEditorDidMount}
              onChange={(v) => setSql(v ?? "")}
              options={{
                fontSize: 13.5,
                fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
                fontLigatures: true,
                lineNumbers: "on",
                lineNumbersMinChars: 3,
                minimap: { enabled: false },
                wordWrap: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                renderLineHighlight: "line",
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                smoothScrolling: true,
                padding: { top: 16, bottom: 16 },
                scrollbar: {
                  verticalScrollbarSize: 6,
                  horizontalScrollbarSize: 6,
                  vertical: "auto",
                  horizontal: "auto",
                },
                overviewRulerLanes: 0,
                folding: true,
                bracketPairColorization: { enabled: true },
                suggest: { showKeywords: true },
                quickSuggestions: true,
                contextmenu: true,
                renderWhitespace: "selection",
                guides: { indentation: true },
              }}
            />
          </div>

          {/* ── Output Panel ─────────────────────────────────────────────────── */}
          <OutputPanel
            result={result}
            outputOpen={outputOpen}
            onToggle={() => setOutputOpen((v) => !v)}
          />
        </motion.div>

      {/* ── History Panel ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {historyOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: historyOpen ? 320 : 0, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="border-l border-[var(--border)] flex flex-col overflow-hidden lg:flex-shrink-0 w-full lg:w-[320px] mobile-panel-responsive"
            style={{ background: "var(--card)" }}
          >
            <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <History size={14} className="text-[var(--text-muted)]" />
                <span className="text-xs font-bold text-[var(--text)]">Execution History</span>
              </div>
              <div className="flex items-center gap-1">
                {history.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={clearHistory}
                    className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    title="Clear history"
                  >
                    <RotateCcw size={12} />
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setHistoryOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
                >
                  <X size={14} />
                </motion.button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                  <Clock size={24} className="text-[var(--text-subtle)]" />
                  <p className="text-xs text-[var(--text-muted)]">No execution history yet</p>
                  <p className="text-[10px] text-[var(--text-subtle)]">Run queries to see them here</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {history.map((entry, idx) => (
                    <motion.button
                      key={entry.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.15 }}
                      whileHover={{ backgroundColor: "var(--surface)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => loadFromHistory(entry)}
                      className="w-full p-3 text-left transition-colors"
                    >
                      <div className="flex items-start gap-2 mb-1.5">
                        {entry.result.status === "success" ? (
                          <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle size={12} className="text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-[var(--text)] truncate">
                            {entry.result.status === "success" ? "Success" : "Error"}
                          </p>
                          <p className="text-[10px] text-[var(--text-subtle)] mt-0.5">
                            {entry.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] font-mono line-clamp-2 pl-5">
                        {entry.sql.split("\n")[0].substring(0, 60)}...
                      </p>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table Explorer Panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {tablesOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="border-l border-[var(--border)] flex flex-col overflow-hidden lg:flex-shrink-0 w-full lg:w-[280px] mobile-panel-responsive"
            style={{ background: "var(--card)" }}
          >
            <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Table size={14} className="text-[var(--text-muted)]" />
                <span className="text-xs font-bold text-[var(--text)]">Table Explorer</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setTablesOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
              >
                <X size={14} />
              </motion.button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3">
              {currentTables.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                  <Database size={24} className="text-[var(--text-subtle)]" />
                  <p className="text-xs text-[var(--text-muted)]">No tables detected</p>
                  <p className="text-[10px] text-[var(--text-subtle)]">Create tables to see them here</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                  {currentTables.map((table, idx) => (
                    <motion.div
                      key={table}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05, duration: 0.2 }}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                        <Table size={12} className="text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--text)] truncate">{table}</p>
                        <p className="text-[10px] text-[var(--text-subtle)]">Table</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* ER Diagram Modal */}
      <ERDiagramModal
        sql={sql}
        isOpen={erDiagramOpen}
        onClose={() => setErDiagramOpen(false)}
        theme={theme}
      />
    </div>
  );
}

// ── Output Panel Component ────────────────────────────────────────────────────
interface OutputPanelProps {
  result: ExecutionResult;
  outputOpen: boolean;
  onToggle: () => void;
}

function OutputPanel({ result, outputOpen, onToggle }: OutputPanelProps) {
  const collapsedH = "42px";
  const expandedH  = "180px";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      className="border-t border-[var(--border)] flex-shrink-0 flex flex-col overflow-hidden"
      style={{
        background: "var(--card)",
        height: outputOpen ? expandedH : collapsedH,
        transition: "height 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 flex-shrink-0
          text-left hover:bg-[var(--surface)] transition-colors duration-150 group"
        style={{ height: collapsedH }}
        aria-expanded={outputOpen}
        aria-controls="output-panel-body"
      >
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-[var(--text-subtle)]" />
          <span className="text-[11px] font-bold text-[var(--text-muted)] tracking-widest uppercase">
            Output
          </span>

          {/* Status badge */}
          {result.status !== "idle" && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                result.status === "success"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                  : "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
              )}
            >
              {result.status === "success" ? (
                <CheckCircle2 size={9} />
              ) : (
                <XCircle size={9} />
              )}
              {result.status === "success" ? "Success" : "Error"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {result.duration != null && result.status !== "idle" && (
            <span className="text-[10px] text-[var(--text-subtle)] flex items-center gap-1">
              <Clock size={9} />
              {result.duration}ms
            </span>
          )}
          <span className="text-[var(--text-subtle)] group-hover:text-[var(--text-muted)] transition-colors">
            {outputOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </span>
        </div>
      </button>

      {/* Body */}
      <div
        id="output-panel-body"
        className="flex-1 overflow-y-auto px-4 pb-3"
      >
        <AnimatePresence mode="wait">
          {outputOpen && (
            <motion.div
              key={result.status + (result.message ?? "")}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {result.status === "idle"    && <IdleOutput />}
              {result.status === "success" && <SuccessOutput result={result} />}
              {result.status === "error"   && <ErrorOutput result={result} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Output state components ───────────────────────────────────────────────────

function IdleOutput() {
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-subtle)] flex-shrink-0" />
      <p className="text-[12px] text-[var(--text-subtle)] font-mono">
        Run a query to see results here.
      </p>
    </div>
  );
}

function SuccessOutput({ result }: { result: ExecutionResult }) {
  return (
    <div
      className="rounded-xl p-3.5 border"
      style={{
        background: "rgba(16,185,129,0.06)",
        borderColor: "rgba(16,185,129,0.22)",
      }}
    >
      <div className="flex items-start gap-2.5">
        <CheckCircle2
          size={15}
          className="text-emerald-500 flex-shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400 leading-snug">
            ✓ {result.message}
          </p>
          {result.detail && (
            <p className="text-[12px] text-emerald-600 dark:text-emerald-500 mt-1 font-mono leading-relaxed">
              {result.detail}
            </p>
          )}
          {result.executedAt && (
            <p className="text-[10px] text-[var(--text-subtle)] mt-2 flex items-center gap-1.5">
              <Clock size={9} />
              {result.executedAt.toLocaleTimeString()} · {result.duration}ms
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorOutput({ result }: { result: ExecutionResult }) {
  return (
    <div
      className="rounded-xl p-3.5 border"
      style={{
        background: "rgba(220,38,38,0.06)",
        borderColor: "rgba(220,38,38,0.22)",
      }}
    >
      <div className="flex items-start gap-2.5">
        <XCircle
          size={15}
          className="text-red-500 flex-shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-red-600 dark:text-red-400 leading-snug">
            ❌ {result.message}
          </p>
          {result.detail && (
            <p className="text-[12px] text-red-500/85 dark:text-red-400/80 mt-1 font-mono leading-relaxed">
              {result.detail}
            </p>
          )}
          {result.executedAt && (
            <p className="text-[10px] text-[var(--text-subtle)] mt-2 flex items-center gap-1.5">
              <Clock size={9} />
              {result.executedAt.toLocaleTimeString()} · {result.duration}ms
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
