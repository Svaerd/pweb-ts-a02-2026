import { clearSessionFields, isRecord, loadSessionFields, saveSessionFields } from "./storage.js";
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
// Guards: call first in protected page modules, before any render.
// If the check fails the browser is sent to login.html and an Error is thrown,
// so the rest of the page module never runs with a missing session.
function redirectToLogin() {
    window.location.replace("login.html");
    throw new Error("Sesi tidak valid, mengalihkan ke login.html");
}
export function requireAuth() {
    const s = getSession();
    if (s === null)
        return redirectToLogin();
    return s;
}
export function requireAdmin() {
    const s = getSession();
    if (s === null || (s.role !== "admin" && s.role !== "moderator")) {
        return redirectToLogin();
    }
    return s;
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
