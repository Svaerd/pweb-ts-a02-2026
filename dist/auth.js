import { KEYS, clearSessionFields, isRecord, loadSessionFields, saveSessionFields } from "./storage.js";
const API_BASE = "https://dummyjson.com";
const MSG_CREDENTIALS = "Username atau password salah.";
const MSG_NETWORK = "Koneksi ke server gagal. Periksa jaringan internet Anda lalu coba lagi.";
const MSG_INVALID = "Respons server tidak valid. Coba lagi beberapa saat lagi.";
const MSG_ROLE = "Gagal mengambil data role pengguna. Silakan coba masuk kembali.";
function isRole(v) {
    return v === "admin" || v === "moderator" || v === "user";
}
export function getSession() {
    const f = loadSessionFields();
    if (f.token === null || f.token === "" || f.name === null || !isRole(f.role)) {
        return null;
    }
    return { token: f.token, role: f.role, name: f.name };
}
export function saveSession(s) {
    saveSessionFields(s.token, s.role, s.name);
}
export function logout() {
    clearSessionFields();
    window.location.href = "login.html";
}
export const ALL_ROLES = ["admin", "moderator", "user"];
const ADMIN_ROLES = ["admin", "moderator"];
export const ROLE_ACCESS = {
    "index.html": ADMIN_ROLES, // Dashboard Admin: kelola jenis antrian, reset antrian
    "operator.html": ALL_ROLES, // Panel Operator: panggil / lewati / selesaikan tiket
    "layar.html": ALL_ROLES, // Layar monitor panggilan
    "ambil-antrian.html": ALL_ROLES, // Ambil tiket mandiri
};
export const PAGE_TITLES = {
    "index.html": "Dashboard Admin",
    "operator.html": "Panel Operator",
    "layar.html": "Layar Antrian",
    "ambil-antrian.html": "Ambil Antrian",
};
export function isProtectedPage(v) {
    return typeof v === "string" && Object.prototype.hasOwnProperty.call(ROLE_ACCESS, v);
}
export function canAccess(role, page) {
    return ROLE_ACCESS[page].includes(role);
}
// Landing page after login when no (allowed) `next` page was requested.
export function homeFor(role) {
    return role === "admin" || role === "moderator" ? "index.html" : "operator.html";
}
// Only known pages may be used as `next` (no open redirect), and only if the role may open them.
export function readNextPage(search) {
    const raw = new URLSearchParams(search).get("next");
    return isProtectedPage(raw) ? raw : null;
}
export function readDeniedPage(search) {
    const raw = new URLSearchParams(search).get("denied");
    return isProtectedPage(raw) ? raw : null;
}
function redirectTo(url) {
    window.location.replace(url);
    throw new Error(`Akses tidak diizinkan, mengalihkan ke ${url}`);
}
// Check the stored session against the policy for `page`.
//  - not logged in      -> login.html?next=<page>
//  - role not allowed   -> own home page + ?denied=<page> (that page shows "akses ditolak")
export function requireAccess(page) {
    const s = getSession();
    if (s === null)
        return redirectTo(`login.html?next=${encodeURIComponent(page)}`);
    if (!canAccess(s.role, page)) {
        return redirectTo(`${homeFor(s.role)}?denied=${encodeURIComponent(page)}`);
    }
    return s;
}
// Guard for a page module: runs the check now, and again whenever the session may have
// changed behind the page (logout/login in another tab, or Back button restoring a cached page).
export function protectPage(page) {
    const session = requireAccess(page);
    window.addEventListener("pageshow", (e) => {
        if (e.persisted)
            requireAccess(page);
    });
    window.addEventListener("storage", (e) => {
        if (e.key === null || e.key === KEYS.token || e.key === KEYS.role || e.key === KEYS.name) {
            requireAccess(page);
        }
    });
    return session;
}
// fetch wrapper: network failures become one readable message (try/catch on every network call).
async function request(url, init) {
    try {
        return await fetch(url, init);
    }
    catch {
        throw new Error(MSG_NETWORK);
    }
}
async function readJson(res) {
    try {
        const body = await res.json();
        return body;
    }
    catch {
        throw new Error(MSG_INVALID);
    }
}
// The login response normally has no role, GET /auth/me does.
async function fetchRole(token) {
    const res = await request(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok)
        throw new Error(MSG_ROLE);
    const me = await readJson(res);
    if (!isRecord(me) || !isRole(me["role"]))
        throw new Error(MSG_INVALID);
    return me["role"];
}
export async function loginRequest(username, password) {
    const res = await request(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });
    if (res.status === 400 || res.status === 401)
        throw new Error(MSG_CREDENTIALS);
    if (!res.ok) {
        throw new Error(`Server sedang bermasalah (kode ${res.status}). Coba lagi beberapa saat lagi.`);
    }
    const data = await readJson(res);
    if (!isRecord(data))
        throw new Error(MSG_INVALID);
    const token = data["accessToken"];
    const firstName = data["firstName"];
    if (typeof token !== "string" || token === "" || typeof firstName !== "string") {
        throw new Error(MSG_INVALID);
    }
    // Use the role from the login response if the server ever sends one, otherwise ask /auth/me.
    const loginRole = data["role"];
    const role = isRole(loginRole) ? loginRole : await fetchRole(token);
    const session = { token, role, name: firstName };
    saveSession(session);
    return session;
}
