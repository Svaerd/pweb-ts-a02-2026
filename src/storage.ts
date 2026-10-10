import type { QueueType, Ticket, Priority, TicketStatus } from "./types.js";

export const KEYS = {
  token: "auth_token",
  role: "auth_role",
  name: "auth_name",
  queueTypes: "queue_types",
  tickets: "tickets",
} as const;

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
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
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
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  const id = typeof o["id"] === "string" ? o["id"] : null;
  const kode = typeof o["kode"] === "string" ? o["kode"] : typeof o["code"] === "string" ? o["code"] : null;
  const nomor = typeof o["nomor"] === "number" ? o["nomor"] : typeof o["number"] === "number" ? o["number"] : null;
  const prioritasRaw = typeof o["prioritas"] === "string" ? o["prioritas"] : typeof o["priority"] === "string" ? o["priority"] : null;
  const statusRaw = typeof o["status"] === "string" ? o["status"] : null;
  const createdAt = typeof o["createdAt"] === "number" ? o["createdAt"] : null;

  if (id === null || kode === null || nomor === null || prioritasRaw === null || statusRaw === null || createdAt === null) {
    return null;
  }
  const prioritas = prioritasRaw as Priority;
  const status = statusRaw as TicketStatus;
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
  if (valid.length > 0) return valid;
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

