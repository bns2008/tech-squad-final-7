/**
 * lib/api.ts
 * ──────────
 * Central HTTP client that talks to the FastAPI backend at localhost:8000.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  let body: any;
  try { body = await res.json(); } catch { body = {}; }

  if (!res.ok) {
    const message =
      typeof body?.detail === "string" ? body.detail
      : Array.isArray(body?.detail)   ? body.detail.map((d: any) => d.msg).join(", ")
      : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BackendUser {
  id: number;
  full_name: string;
  email: string;
  role: string;
  plan: string;
  is_active: boolean;
  email_verified: boolean;
  avatar?: string | null;
  created_at?: string;
  last_login?: string | null;
  conversions_used_this_month: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function apiRegister(p: { full_name: string; email: string; password: string }) {
  return request<{ message: string; user: BackendUser }>("/register", {
    method: "POST", body: JSON.stringify(p),
  });
}

export async function apiLogin(p: { email: string; password: string }) {
  return request<{ message: string; user: BackendUser }>("/login", {
    method: "POST", body: JSON.stringify(p),
  });
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function apiGetUser(userId: number) {
  return request<BackendUser>(`/user/${userId}`);
}

export async function apiUpdateProfile(userId: number, p: { full_name?: string; avatar?: string }) {
  return request<{ message: string; user: BackendUser }>(`/user/${userId}/profile`, {
    method: "PUT", body: JSON.stringify(p),
  });
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface BackendProject {
  id: string;
  user_id: number;
  name: string;
  description: string;
  db_type: string;
  files: unknown[];
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export async function apiSaveProject(p: {
  user_id: number; id: string; name: string;
  description?: string; db_type: string; files: unknown[]; pinned?: boolean;
}) {
  return request<{ message: string; id: string }>("/projects", {
    method: "POST", body: JSON.stringify(p),
  });
}

export async function apiGetProjects(userId: number) {
  return request<BackendProject[]>(`/projects/${userId}`);
}

export async function apiDeleteProject(userId: number, projectUid: string) {
  return request<{ message: string }>(`/projects/${userId}/${projectUid}`, { method: "DELETE" });
}

// ─── Quick History ────────────────────────────────────────────────────────────

export interface BackendQuickEntry {
  id: string; filename: string; sql: string;
  stats: { tables: number; relationships: number; attributes: number };
  processingTime: number; timestamp: number; imageUrl: string;
}

export async function apiSaveQuickHistory(p: {
  user_id: number; id: string; filename: string;
  sql: string; stats: object; processingTime: number;
}) {
  return request<{ message: string }>("/quick-history", {
    method: "POST", body: JSON.stringify(p),
  });
}

export async function apiGetQuickHistory(userId: number) {
  return request<BackendQuickEntry[]>(`/quick-history/${userId}`);
}

export async function apiClearQuickHistory(userId: number) {
  return request<{ message: string }>(`/quick-history/${userId}`, { method: "DELETE" });
}

// ─── Conversions / exports ────────────────────────────────────────────────────

export async function apiSaveConversion(p: {
  user_id: number; image_id: number; generated_ddl: string; dialect: string;
  success: boolean; error_message?: string; execution_time_ms?: number;
  tables_count?: number; relationships_count?: number;
}) {
  return request<{ message: string; conversion_id: number }>("/save-conversion", {
    method: "POST", body: JSON.stringify(p),
  });
}

export async function apiLogExport(p: {
  user_id: number; conversion_id?: number; format: "sql" | "txt" | "json" | "copy";
}) {
  return request<{ message: string }>("/log-export", {
    method: "POST", body: JSON.stringify(p),
  });
}

export async function apiGetUsers() {
  return request<BackendUser[]>("/users");
}

export async function apiGetActivity(userId: number) {
  return request<{ id: number; activity_type: string; description: string; timestamp: string }[]>(
    `/activity/${userId}`
  );
}

/** POST /upload-image — multipart */
export async function apiUploadImage(userId: number, file: File) {
  const form = new FormData();
  form.append("user_id", String(userId));
  form.append("image", file);
  const res = await fetch(`${BASE_URL}/upload-image`, { method: "POST", body: form });
  let body: any;
  try { body = await res.json(); } catch { body = {}; }
  if (!res.ok) throw new Error(body?.detail ?? `Upload failed (${res.status})`);
  return body as { message: string; image_id: number; filename: string; status: string };
}
