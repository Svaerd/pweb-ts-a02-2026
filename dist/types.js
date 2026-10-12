export const PRIORITY_ORDER = {
    VIP: 0,
    Disabilitas: 1,
    Lansia: 2,
    Normal: 3,
};
export function compareTickets(a, b) {
    const pA = a.prioritas ?? a.priority ?? "Normal";
    const pB = b.prioritas ?? b.priority ?? "Normal";
    const p = PRIORITY_ORDER[pA] - PRIORITY_ORDER[pB];
    if (p !== 0)
        return p;
    return a.createdAt - b.createdAt;
}
export function formatLabel(kode, n) {
    return `${kode}-${String(n).padStart(3, "0")}`;
}
// Escape stored user text (queue names) before it goes into innerHTML.
export function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => {
        switch (c) {
            case "&": return "&amp;";
            case "<": return "&lt;";
            case ">": return "&gt;";
            case '"': return "&quot;";
            default: return "&#39;";
        }
    });
}
