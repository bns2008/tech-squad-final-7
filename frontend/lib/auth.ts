// ─── Client-side auth service (localStorage-backed) ──────────────────────────
// All data is isolated per user. Super Admin is seeded once via env or fallback.
// Never expose API keys, model names, or provider info to the frontend.

import type { Subscription, User } from "./types";

const USERS_KEY  = "er_ai_users_v2";

// ── Super Admin config ────────────────────────────────────────────────────────
// Credentials come from environment or secure fallback — never shown in UI.
const SA_EMAIL    = process.env.NEXT_PUBLIC_ADMIN_EMAIL    ?? "superadmin@eraistudio.internal";
const SA_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "sa_X9#mP2!qL7vR";
const SA_ID       = "superadmin-fixed-id"; // stable, never regenerated

// ── Internal helpers ──────────────────────────────────────────────────────────
function getUsers(): User[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); }
  catch { return []; }
}

function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function genId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Seed Super Admin (idempotent — runs once, never creates duplicates) ───────
export function seedSuperAdmin() {
  if (typeof window === "undefined") return;
  const users = getUsers();

  // Remove any old admin entries with wrong IDs/emails to prevent duplicates
  const cleaned = users.filter(
    (u) => !(u.role === "admin" && u.id !== SA_ID)
  );

  const alreadyExists = cleaned.some((u) => u.id === SA_ID);
  if (!alreadyExists) {
    cleaned.push({
      id: SA_ID,
      name: "Super Admin",
      email: SA_EMAIL,
      role: "admin",
      createdAt: 1000000000000, // fixed past timestamp
      emailVerified: true,
      suspended: false,
    });
  }

  // Persist password only once
  if (!localStorage.getItem(`er_ai_pw_${SA_ID}`)) {
    localStorage.setItem(`er_ai_pw_${SA_ID}`, SA_PASSWORD);
  }

  // Only save if something changed
  if (JSON.stringify(cleaned) !== JSON.stringify(users)) {
    saveUsers(cleaned);
  }
}

// ── Register ──────────────────────────────────────────────────────────────────
export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  await delay(500);

  const trimEmail = email.trim().toLowerCase();

  // Block registering the super admin email
  if (trimEmail === SA_EMAIL.toLowerCase()) {
    throw new Error("This email address is not available for registration.");
  }

  const users = getUsers();
  if (users.find((u) => u.email.toLowerCase() === trimEmail)) {
    throw new Error("An account with this email already exists.");
  }

  // Basic input sanitation
  const safeName = sanitize(name).slice(0, 80);
  if (!safeName) throw new Error("Name is required.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  const userId = genId();
  const user: User = {
    id: userId,
    name: safeName,
    email: trimEmail,
    role: "user",
    createdAt: Date.now(),
    emailVerified: false,
  };

  localStorage.setItem(`er_ai_pw_${userId}`, password);
  users.push(user);
  saveUsers(users);

  const token = buildToken(user);
  return { user, token };
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  await delay(500);

  const trimEmail = email.trim().toLowerCase();
  const users = getUsers();

  let user: User | undefined;
  let storedPw: string | null;

  // Super Admin: look up by fixed ID
  if (trimEmail === SA_EMAIL.toLowerCase()) {
    user = users.find((u) => u.id === SA_ID);
    storedPw = localStorage.getItem(`er_ai_pw_${SA_ID}`);
  } else {
    user = users.find((u) => u.email.toLowerCase() === trimEmail);
    storedPw = user ? localStorage.getItem(`er_ai_pw_${user.id}`) : null;
  }

  if (!user) throw new Error("No account found with this email.");
  if (storedPw !== password) throw new Error("Incorrect password.");
  if (user.suspended) throw new Error("Your account has been suspended. Contact support.");

  const updated: User = { ...user, lastLogin: Date.now() };
  saveUsers(users.map((u) => (u.id === user!.id ? updated : u)));

  return { user: updated, token: buildToken(updated) };
}

// ── Google login (mock) ───────────────────────────────────────────────────────
export async function googleLogin(): Promise<{ user: User; token: string }> {
  await delay(700);
  const userId = genId();
  const user: User = {
    id: userId,
    name: "Google User",
    email: `google_${userId.slice(0, 8)}@example.com`,
    role: "user",
    createdAt: Date.now(),
    emailVerified: true,
    lastLogin: Date.now(),
  };
  const users = getUsers();
  users.push(user);
  saveUsers(users);
  return { user, token: buildToken(user) };
}

// ── Forgot password ───────────────────────────────────────────────────────────
export async function forgotPassword(email: string): Promise<void> {
  await delay(600);
  const trimEmail = email.trim().toLowerCase();
  const users = getUsers();
  if (!users.find((u) => u.email.toLowerCase() === trimEmail)) {
    // Don't reveal whether the email exists — return silently (security best practice)
    return;
  }
  // In production: trigger email with signed reset link
}

// ── Update profile ────────────────────────────────────────────────────────────
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<User, "name" | "avatar">>
): Promise<User> {
  await delay(300);
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("User not found.");
  if (updates.name) updates.name = sanitize(updates.name).slice(0, 80);
  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);
  return users[idx];
}

// ── Change password ───────────────────────────────────────────────────────────
export async function changePassword(
  userId: string,
  currentPw: string,
  newPw: string
): Promise<void> {
  await delay(400);
  const stored = localStorage.getItem(`er_ai_pw_${userId}`);
  if (stored !== currentPw) throw new Error("Current password is incorrect.");
  if (newPw.length < 8) throw new Error("New password must be at least 8 characters.");
  localStorage.setItem(`er_ai_pw_${userId}`, newPw);
}

// ── Delete account ────────────────────────────────────────────────────────────
export async function deleteAccount(userId: string): Promise<void> {
  await delay(500);
  if (userId === SA_ID) throw new Error("Super Admin account cannot be deleted.");
  const users = getUsers().filter((u) => u.id !== userId);
  saveUsers(users);
  // Clean up password
  localStorage.removeItem(`er_ai_pw_${userId}`);
}

// ── Super Admin: get all users (excluding super admin itself) ─────────────────
export function getAllUsers(): User[] {
  return getUsers().filter((u) => u.id !== SA_ID);
}

// ── Super Admin: suspend / unsuspend ─────────────────────────────────────────
export function toggleSuspend(userId: string): void {
  if (userId === SA_ID) return; // protect super admin
  const users = getUsers();
  saveUsers(users.map((u) => (u.id === userId ? { ...u, suspended: !u.suspended } : u)));
}

// ── Super Admin: delete user ──────────────────────────────────────────────────
export function adminDeleteUser(userId: string): void {
  if (userId === SA_ID) return; // protect super admin
  saveUsers(getUsers().filter((u) => u.id !== userId));
  localStorage.removeItem(`er_ai_pw_${userId}`);
}

export function adminUpdateUser(userId: string, updates: Partial<Pick<User, "name" | "avatar" | "suspended" | "subscription">>): User | null {
  if (userId === SA_ID) return null;
  const users = getUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return null;
  users[index] = { ...users[index], ...updates };
  saveUsers(users);
  return users[index];
}

export function adminUpdateSubscription(userId: string, subscription: Subscription): User | null {
  return adminUpdateUser(userId, { subscription });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildToken(user: User): string {
  // Opaque client token — in production replace with signed JWT from server
  return btoa(JSON.stringify({ id: user.id, role: user.role, ts: Date.now() }));
}

function sanitize(str: string): string {
  return str.replace(/[<>"'`\\]/g, "").trim();
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
