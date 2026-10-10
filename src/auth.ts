import { KEYS } from "./storage.js";
import type { Role } from "./types.js";

export interface Session {
  token: string;
  role: Role;
  name: string;
}

function isRole(v: unknown): v is Role {
  return v === "admin" || v === "moderator" || v === "user";
}

export function getSession(): Session | null {
  const token = localStorage.getItem(KEYS.token);
  const roleRaw: unknown = localStorage.getItem(KEYS.role);
  const name = localStorage.getItem(KEYS.name);
  if (token === null || typeof roleRaw !== "string" || !isRole(roleRaw) || name === null) {
    return null;
  }
  return { token, role: roleRaw, name };
}

export function saveSession(s: Session): void {
  localStorage.setItem(KEYS.token, s.token);
  localStorage.setItem(KEYS.role, s.role);
  localStorage.setItem(KEYS.name, s.name);
}

export function logout(): void {
  localStorage.removeItem(KEYS.token);
  localStorage.removeItem(KEYS.role);
  localStorage.removeItem(KEYS.name);
  window.location.href = "login.html";
}

// Guards: call first in protected page modules, before any render.
export function requireAuth(): Session {
  const s = getSession();
  if (s === null) window.location.href = "login.html";
  return s as Session;
}

export function requireAdmin(): Session {
  const s = getSession();
  if (s === null || (s.role !== "admin" && s.role !== "moderator")) {
    window.location.href = "login.html";
  }
  return s as Session;
}

export interface LoginResponse {
  accessToken: string;
  role?: string;
  firstName?: string;
}

export async function loginRequest(username: string, password: string): Promise<Session> {
  const res = await fetch("https://dummyjson.com/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Username atau password salah");
  const data: unknown = await res.json();
  if (typeof data !== "object" || data === null) throw new Error("Respons server tidak valid");
  const o = data as Record<string, unknown>;
  const token = o["accessToken"];
  const firstName = o["firstName"];
  // dummyjson nests role at top level in newer versions; default to user
  const roleRaw: unknown = o["role"] ?? "user";
  if (typeof token !== "string" || typeof firstName !== "string" || !isRole(roleRaw)) {
    throw new Error("Respons server tidak valid");
  }
  const session: Session = { token, role: roleRaw, name: firstName };
  saveSession(session);
  return session;
}
