import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function downloadJSON(obj: unknown, filename: string) {
  downloadText(JSON.stringify(obj, null, 2), filename);
}

export function parseSQLStats(sql: string) {
  const tables = (sql.match(/^\s*CREATE TABLE/gim) || []).length;
  const fks = (sql.match(/FOREIGN KEY/gi) || []).length;
  const cols = (sql.match(/^\s+\w+\s+VARCHAR/gim) || []).length;
  return { tables, fks, cols };
}

export function getLanguageExtension(lang: string): string {
  const map: Record<string, string> = {
    postgresql: "sql", mysql: "sql", sqlite: "sql", mssql: "sql", oracle: "sql",
    mongodb: "js", prisma: "prisma", django: "py", laravel: "php",
    sequelize: "js", hibernate: "java",
  };
  return map[lang] ?? "sql";
}

export function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}
