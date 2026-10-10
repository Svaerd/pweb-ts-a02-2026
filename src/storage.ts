import type { QueueType, Ticket } from "./types.js";

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

function isQueueType(v: unknown): v is QueueType {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o["code"] === "string" &&
    typeof o["name"] === "string" &&
    typeof o["active"] === "boolean" &&
    typeof o["counter"] === "number"
  );
}

function isTicket(v: unknown): v is Ticket {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o["id"] === "string" &&
    typeof o["code"] === "string" &&
    typeof o["number"] === "number" &&
    typeof o["label"] === "string" &&
    typeof o["priority"] === "string" &&
    typeof o["status"] === "string" &&
    typeof o["createdAt"] === "number"
  );
}

export function loadQueueTypes(): QueueType[] {
  const raw = localStorage.getItem(KEYS.queueTypes);
  const arr = parseJsonArray(raw);
  const valid = arr.filter(isQueueType);
  if (valid.length > 0) return valid;
  const seed: QueueType[] = [
    { code: "A", name: "Poli Umum", active: true, counter: 0 },
    { code: "B", name: "Poli Gigi", active: true, counter: 0 },
  ];
  saveQueueTypes(seed);
  return seed;
}

export function saveQueueTypes(q: QueueType[]): void {
  localStorage.setItem(KEYS.queueTypes, JSON.stringify(q));
}

export function loadTickets(): Ticket[] {
  const raw = localStorage.getItem(KEYS.tickets);
  return parseJsonArray(raw).filter(isTicket);
}

export function saveTickets(t: Ticket[]): void {
  localStorage.setItem(KEYS.tickets, JSON.stringify(t));
}
