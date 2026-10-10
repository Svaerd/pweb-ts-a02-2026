export type Priority = "Normal" | "Lansia" | "Disabilitas" | "VIP";
export type TicketStatus = "Menunggu" | "Dipanggil" | "Selesai" | "Dilewati";
export type Role = "admin" | "moderator" | "user";

export interface QueueType {
  code: string;
  name: string;
  active: boolean;
  counter: number;
}

export interface Ticket {
  id: string;
  code: string;
  number: number;
  label: string;
  priority: Priority;
  status: TicketStatus;
  createdAt: number;
}

export const PRIORITY_ORDER: Record<Priority, number> = {
  VIP: 0,
  Disabilitas: 1,
  Lansia: 2,
  Normal: 3,
};

export function compareTickets(a: Ticket, b: Ticket): number {
  const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  if (p !== 0) return p;
  return a.createdAt - b.createdAt;
}

export function formatLabel(code: string, n: number): string {
  return `${code}-${String(n).padStart(3, "0")}`;
}
