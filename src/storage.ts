import type { QueueType, Ticket, Priority, TicketStatus } from "./types.js";

export const KEYS = {
  token: "auth_token",
  role: "auth_role",
  name: "auth_name",
  queueTypes: "queue_types",
  tickets: "tickets",
} as const;

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isPriority(v: unknown): v is Priority {
  return v === "Normal" || v === "Lansia" || v === "Disabilitas" || v === "VIP";
}

export function isTicketStatus(v: unknown): v is TicketStatus {
  return v === "Menunggu" || v === "Dipanggil" || v === "Selesai" || v === "Dilewati";
}

// Session fields (auth_*). auth.ts validates them; only this module touches localStorage.
export interface SessionFields {
  token: string | null;
  role: string | null;
  name: string | null;
}

export function loadSessionFields(): SessionFields {
  return {
    token: localStorage.getItem(KEYS.token),
    role: localStorage.getItem(KEYS.role),
    name: localStorage.getItem(KEYS.name),
  };
}

export function saveSessionFields(token: string, role: string, name: string): void {
  localStorage.setItem(KEYS.token, token);
  localStorage.setItem(KEYS.role, role);
  localStorage.setItem(KEYS.name, name);
}

export function clearSessionFields(): void {
  localStorage.removeItem(KEYS.token);
  localStorage.removeItem(KEYS.role);
  localStorage.removeItem(KEYS.name);
}

function parseJsonArray(raw: string | null): unknown[] {
  if (raw === null) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function toQueueType(v: unknown): QueueType | null {
  if (!isRecord(v)) return null;
  const o = v;
  const kode = typeof o["kode"] === "string" ? o["kode"] : typeof o["code"] === "string" ? o["code"] : null;
  const nama = typeof o["nama"] === "string" ? o["nama"] : typeof o["name"] === "string" ? o["name"] : null;
  const aktif = typeof o["aktif"] === "boolean" ? o["aktif"] : typeof o["active"] === "boolean" ? o["active"] : null;
  const counter = typeof o["counter"] === "number" ? o["counter"] : null;
  if (kode === null || nama === null || aktif === null || counter === null) return null;
  return {
    kode,
    nama,
    aktif,
    counter,
    code: kode,
    name: nama,
    active: aktif,
  };
}

function toTicket(v: unknown): Ticket | null {
  if (!isRecord(v)) return null;
  const o = v;
  const id = typeof o["id"] === "string" ? o["id"] : null;
  const kode = typeof o["kode"] === "string" ? o["kode"] : typeof o["code"] === "string" ? o["code"] : null;
  const nomor = typeof o["nomor"] === "number" ? o["nomor"] : typeof o["number"] === "number" ? o["number"] : null;
  const prioritasRaw = typeof o["prioritas"] === "string" ? o["prioritas"] : typeof o["priority"] === "string" ? o["priority"] : null;
  const statusRaw = typeof o["status"] === "string" ? o["status"] : null;
  const createdAt = typeof o["createdAt"] === "number" ? o["createdAt"] : null;

  if (id === null || kode === null || nomor === null || prioritasRaw === null || statusRaw === null || createdAt === null) {
    return null;
  }
  if (!isPriority(prioritasRaw) || !isTicketStatus(statusRaw)) return null;
  const prioritas = prioritasRaw;
  const status = statusRaw;
  const label = typeof o["label"] === "string" ? o["label"] : `${kode}-${String(nomor).padStart(3, "0")}`;

  return {
    id,
    kode,
    nomor,
    label,
    prioritas,
    status,
    createdAt,
    code: kode,
    number: nomor,
    priority: prioritas,
  };
}

export function loadQueueTypes(): QueueType[] {
  const raw = localStorage.getItem(KEYS.queueTypes);
  const arr = parseJsonArray(raw);
  const valid: QueueType[] = [];
  for (const item of arr) {
    const q = toQueueType(item);
    if (q !== null) valid.push(q);
  }
  // Seed only on first run (key absent). An empty or fully-deleted list must stay empty.
  if (raw !== null) return valid;
  const seed: QueueType[] = [
    { kode: "A", nama: "Poli Umum", aktif: true, counter: 0, code: "A", name: "Poli Umum", active: true },
    { kode: "B", nama: "Poli Gigi", aktif: true, counter: 0, code: "B", name: "Poli Gigi", active: true },
  ];
  saveQueueTypes(seed);
  return seed;
}

export function saveQueueTypes(q: QueueType[]): void {
  const normalized = q.map((item) => ({
    kode: item.kode ?? item.code ?? "",
    nama: item.nama ?? item.name ?? "",
    aktif: item.aktif ?? item.active ?? true,
    counter: item.counter ?? 0,
    code: item.kode ?? item.code ?? "",
    name: item.nama ?? item.name ?? "",
    active: item.aktif ?? item.active ?? true,
  }));
  localStorage.setItem(KEYS.queueTypes, JSON.stringify(normalized));
}

export function loadTickets(): Ticket[] {
  const raw = localStorage.getItem(KEYS.tickets);
  const arr = parseJsonArray(raw);
  const valid: Ticket[] = [];
  for (const item of arr) {
    const t = toTicket(item);
    if (t !== null) valid.push(t);
  }
  return valid;
}

export function saveTickets(t: Ticket[]): void {
  const normalized = t.map((item) => ({
    id: item.id,
    kode: item.kode ?? item.code ?? "",
    nomor: item.nomor ?? item.number ?? 0,
    label: item.label ?? `${item.kode ?? item.code ?? ""}-${String(item.nomor ?? item.number ?? 0).padStart(3, "0")}`,
    prioritas: item.prioritas ?? item.priority ?? "Normal",
    status: item.status,
    createdAt: item.createdAt,
    code: item.kode ?? item.code ?? "",
    number: item.nomor ?? item.number ?? 0,
    priority: item.prioritas ?? item.priority ?? "Normal",
  }));
  localStorage.setItem(KEYS.tickets, JSON.stringify(normalized));
}

// Next number for a queue, skipping numbers already used so two tabs cannot print the same label.
// shortcut: last-write-wins if two tabs save in the same millisecond; upgrade to a real backend if that matters.
export function nextTicketNumber(queue: QueueType, tickets: Ticket[]): number {
  const used = new Set(tickets.filter((t) => t.kode === queue.kode).map((t) => t.nomor));
  let n = queue.counter + 1;
  while (used.has(n)) n += 1;
  return n;
}
