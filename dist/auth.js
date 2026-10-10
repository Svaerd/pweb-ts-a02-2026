import { KEYS } from "./storage.js";
function isRole(v) {
    return v === "admin" || v === "moderator" || v === "user";
}
export function getSession() {
    const token = localStorage.getItem(KEYS.token);
    const roleRaw = localStorage.getItem(KEYS.role);
    const name = localStorage.getItem(KEYS.name);
    if (token === null || typeof roleRaw !== "string" || !isRole(roleRaw) || name === null) {
        return null;
    }
    return { token, role: roleRaw, name };
}
export function saveSession(s) {
    localStorage.setItem(KEYS.token, s.token);
    localStorage.setItem(KEYS.role, s.role);
    localStorage.setItem(KEYS.name, s.name);
}
export function logout() {
    localStorage.removeItem(KEYS.token);
    localStorage.removeItem(KEYS.role);
    localStorage.removeItem(KEYS.name);
    window.location.href = "login.html";
}
// Guards: call first in protected page modules, before any render.
export function requireAuth() {
    const s = getSession();
    if (s === null)
        window.location.href = "login.html";
    return s;
}
export function requireAdmin() {
    const s = getSession();
    if (s === null || (s.role !== "admin" && s.role !== "moderator")) {
        window.location.href = "login.html";
    }
    return s;
}
export async function loginRequest(username, password) {
    const res = await fetch("https://dummyjson.com/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });
    if (!res.ok)
        throw new Error("Username atau password salah");
    const data = await res.json();
    if (typeof data !== "object" || data === null)
        throw new Error("Respons server tidak valid");
    const o = data;
    const token = o["accessToken"];
    const firstName = o["firstName"];
    // dummyjson nests role at top level in newer versions; default to user
    const roleRaw = o["role"] ?? "user";
    if (typeof token !== "string" || typeof firstName !== "string" || !isRole(roleRaw)) {
        throw new Error("Respons server tidak valid");
    }
    const session = { token, role: roleRaw, name: firstName };
    saveSession(session);
    return session;
}
