import { KEYS, clearSessionFields, isRecord, loadSessionFields, saveSessionFields } from "./storage.js";
import type { Role } from "./types.js";

export interface Session {
  token: string;
  role: Role;
  name: string;
}

const API_BASE = "https://dummyjson.com";

const MSG_CREDENTIALS = "Username atau password salah.";
const MSG_NETWORK = "Koneksi ke server gagal. Periksa jaringan internet Anda lalu coba lagi.";
const MSG_INVALID = "Respons server tidak valid. Coba lagi beberapa saat lagi.";
const MSG_ROLE = "Gagal mengambil data role pengguna. Silakan coba masuk kembali.";

function isRole(v: unknown): v is Role {
  return v === "admin" || v === "moderator" || v === "user";
}

export function getSession(): Session | null {
  const f = loadSessionFields();
  if (f.token === null || f.token === "" || f.name === null || !isRole(f.role)) {
    return null;
  }
  return { token: f.token, role: f.role, name: f.name };
}

export function saveSession(s: Session): void {
  saveSessionFields(s.token, s.role, s.name);
}

export function logout(): void {
  clearSessionFields();
  window.location.href = "login.html";
}

// ---------------------------------------------------------------------------
// Role access policy (single source of truth for every guard and the login page).
// Semua halaman di bawah ini WAJIB login. Tidak ada lagi halaman publik.
// moderator = hak akses sama dengan admin.
// ---------------------------------------------------------------------------
export type ProtectedPage = "index.html" | "operator.html" | "layar.html" | "ambil-antrian.html";

export const ALL_ROLES: readonly Role[] = ["admin", "moderator", "user"];
const ADMIN_ROLES: readonly Role[] = ["admin", "moderator"];

export const ROLE_ACCESS: Record<ProtectedPage, readonly Role[]> = {
  "index.html": ADMIN_ROLES, // Dashboard Admin: kelola jenis antrian, reset antrian
  "operator.html": ALL_ROLES, // Panel Operator: panggil / lewati / selesaikan tiket
  "layar.html": ALL_ROLES, // Layar monitor panggilan
  "ambil-antrian.html": ALL_ROLES, // Ambil tiket mandiri
};

export const PAGE_TITLES: Record<ProtectedPage, string> = {
  "index.html": "Dashboard Admin",
  "operator.html": "Panel Operator",
  "layar.html": "Layar Antrian",
  "ambil-antrian.html": "Ambil Antrian",
};

export function isProtectedPage(v: unknown): v is ProtectedPage {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(ROLE_ACCESS, v);
}

export function canAccess(role: Role, page: ProtectedPage): boolean {
  return ROLE_ACCESS[page].includes(role);
}

// Landing page after login when no (allowed) `next` page was requested.
export function homeFor(role: Role): ProtectedPage {
  return role === "admin" || role === "moderator" ? "index.html" : "operator.html";
}

// Only known pages may be used as `next` (no open redirect), and only if the role may open them.
export function readNextPage(search: string): ProtectedPage | null {
  const raw = new URLSearchParams(search).get("next");
  return isProtectedPage(raw) ? raw : null;
}

export function readDeniedPage(search: string): ProtectedPage | null {
  const raw = new URLSearchParams(search).get("denied");
  return isProtectedPage(raw) ? raw : null;
}

function redirectTo(url: string): never {
  window.location.replace(url);
  throw new Error(`Akses tidak diizinkan, mengalihkan ke ${url}`);
}

// Check the stored session against the policy for `page`.
//  - not logged in      -> login.html?next=<page>
//  - role not allowed   -> own home page + ?denied=<page> (that page shows "akses ditolak")
export function requireAccess(page: ProtectedPage): Session {
  const s = getSession();
  if (s === null) return redirectTo(`login.html?next=${encodeURIComponent(page)}`);
  if (!canAccess(s.role, page)) {
    return redirectTo(`${homeFor(s.role)}?denied=${encodeURIComponent(page)}`);
  }
  return s;
}

// Guard for a page module: runs the check now, and again whenever the session may have
// changed behind the page (logout/login in another tab, or Back button restoring a cached page).
export function protectPage(page: ProtectedPage): Session {
  const session = requireAccess(page);
  window.addEventListener("pageshow", (e: PageTransitionEvent) => {
    if (e.persisted) requireAccess(page);
  });
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === null || e.key === KEYS.token || e.key === KEYS.role || e.key === KEYS.name) {
      requireAccess(page);
    }
  });
  return session;
}

export interface LoginResponse {
  accessToken: string;
  role?: string;
  firstName?: string;
}

// fetch wrapper: network failures become one readable message (try/catch on every network call).
async function request(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(MSG_NETWORK);
  }
}

async function readJson(res: Response): Promise<unknown> {
  try {
    const body: unknown = await res.json();
    return body;
  } catch {
    throw new Error(MSG_INVALID);
  }
}

// The login response normally has no role, GET /auth/me does.
async function fetchRole(token: string): Promise<Role> {
  const res = await request(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(MSG_ROLE);
  const me = await readJson(res);
  if (!isRecord(me) || !isRole(me["role"])) throw new Error(MSG_INVALID);
  return me["role"];
}

export async function loginRequest(username: string, password: string): Promise<Session> {
  const res = await request(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (res.status === 400 || res.status === 401) throw new Error(MSG_CREDENTIALS);
  if (!res.ok) {
    throw new Error(`Server sedang bermasalah (kode ${res.status}). Coba lagi beberapa saat lagi.`);
  }

  const data = await readJson(res);
  if (!isRecord(data)) throw new Error(MSG_INVALID);
  const token = data["accessToken"];
  const firstName = data["firstName"];
  if (typeof token !== "string" || token === "" || typeof firstName !== "string") {
    throw new Error(MSG_INVALID);
  }

  // Use the role from the login response if the server ever sends one, otherwise ask /auth/me.
  const loginRole = data["role"];
  const role: Role = isRole(loginRole) ? loginRole : await fetchRole(token);

  const session: Session = { token, role, name: firstName };
  saveSession(session);
  return session;
}