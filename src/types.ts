export type Priority = "Normal" | "Lansia" | "Disabilitas" | "VIP";
export type TicketStatus = "Menunggu" | "Dipanggil" | "Selesai" | "Dilewati";
export type Role = "admin" | "moderator" | "user";

export interface QueueType {
  kode: string;
  nama: string;
  aktif: boolean;
  counter: number;
  code?: string;
  name?: string;
  active?: boolean;
}

export interface Ticket {
  id: string;
  kode: string;
  nomor: number;
  label: string;
  prioritas: Priority;
  status: TicketStatus;
  createdAt: number;
  code?: string;
  number?: number;
  priority?: Priority;
}

export const PRIORITY_ORDER: Record<Priority, number> = {
  VIP: 0,
  Disabilitas: 1,
  Lansia: 2,
  Normal: 3,
};

export function compareTickets(a: Ticket, b: Ticket): number {
  const pA = a.prioritas ?? a.priority ?? "Normal";
  const pB = b.prioritas ?? b.priority ?? "Normal";
  const p = PRIORITY_ORDER[pA] - PRIORITY_ORDER[pB];
  if (p !== 0) return p;
  return a.createdAt - b.createdAt;
}

export function formatLabel(kode: string, n: number): string {
  return `${kode}-${String(n).padStart(3, "0")}`;
}
