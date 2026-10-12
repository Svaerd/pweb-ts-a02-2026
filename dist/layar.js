import { loadQueueTypes, loadTickets } from "./storage.js";
function initLayar() {
    const container = document.getElementById("layar-cards-container");
    const emptyState = document.getElementById("layar-empty-state");
    const clockEl = document.getElementById("display-clock");
    const btnFullscreen = document.getElementById("btn-fullscreen");
    const btnToggleVoice = document.getElementById("btn-toggle-voice");
    // 1. Live Clock update every 1s
    function updateClock() {
        if (clockEl !== null) {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });
        }
    }
    updateClock();
    window.setInterval(updateClock, 1000);
    // 2. Fullscreen Toggle API
    if (btnFullscreen !== null) {
        btnFullscreen.addEventListener("click", () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {
                    // Ignore error if fullscreen denied by browser security policy
                });
            }
            else {
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(() => { });
                }
            }
        });
        document.addEventListener("fullscreenchange", () => {
            if (document.fullscreenElement) {
                btnFullscreen.textContent = "Keluar Layar Penuh";
            }
            else {
                btnFullscreen.textContent = "Layar Penuh (Full Screen)";
            }
        });
    }
    // 3. Audio Announcement (Web Speech API) - Bonus Feature!
    let voiceEnabled = true;
    let lastAnnouncedTicket = {};
    if (btnToggleVoice !== null) {
        btnToggleVoice.addEventListener("click", () => {
            voiceEnabled = !voiceEnabled;
            btnToggleVoice.textContent = voiceEnabled ? "Suara: Nyala" : "Suara: Mati";
        });
    }
    function announceTicket(label, serviceName) {
        if (!voiceEnabled || typeof window.speechSynthesis === "undefined")
            return;
        try {
            // Split label (e.g., A-001 -> "Nomor antrian A, 0 0 1, ke Poli Umum")
            const parts = label.split("-");
            const code = parts[0] ?? "";
            const num = parts[1] ?? "";
            const text = `Nomor antrian ${code}, ${num}, menuju ke ${serviceName}`;
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = "id-ID";
            utter.rate = 0.9;
            window.speechSynthesis.speak(utter);
        }
        catch {
            // Audio speech synthesis not supported or blocked
        }
    }
    // 4. Render Layar Cards per Active Queue
    let lastSnapshot = "";
    function renderLayar() {
        if (container === null)
            return;
        const allQueues = loadQueueTypes();
        const activeQueues = allQueues.filter((q) => q.aktif);
        const tickets = loadTickets();
        const snapshot = JSON.stringify([activeQueues, tickets]);
        if (snapshot === lastSnapshot)
            return;
        lastSnapshot = snapshot;
        if (activeQueues.length === 0) {
            if (emptyState !== null)
                emptyState.style.display = "block";
            // Clear other children except emptyState
            const children = Array.from(container.children);
            for (const child of children) {
                if (child.id !== "layar-empty-state") {
                    container.removeChild(child);
                }
            }
            return;
        }
        if (emptyState !== null)
            emptyState.style.display = "none";
        // Clean cards
        const children = Array.from(container.children);
        for (const child of children) {
            if (child.id !== "layar-empty-state") {
                container.removeChild(child);
            }
        }
        for (const q of activeQueues) {
            // Find currently calling ticket for this queue
            const callingList = tickets.filter((t) => t.kode === q.kode && t.status === "Dipanggil");
            const currentCalling = callingList[callingList.length - 1];
            // Count waiting tickets for this queue
            const waitingCount = tickets.filter((t) => t.kode === q.kode && t.status === "Menunggu").length;
            // Announce if new call
            if (currentCalling !== undefined) {
                const prev = lastAnnouncedTicket[q.kode];
                if (prev !== currentCalling.id) {
                    lastAnnouncedTicket[q.kode] = currentCalling.id;
                    announceTicket(currentCalling.label, q.nama);
                }
            }
            // Card Element
            const card = document.createElement("article");
            card.className = "layar-card";
            const cardHeader = document.createElement("div");
            cardHeader.className = "layar-card-header";
            cardHeader.innerHTML = `
        <span style="font-size: 20px; font-weight: 700;">${q.kode} - ${q.nama}</span>
        <span class="chip" style="background: rgba(255,255,255,0.2); color: white; border: none; font-size: 13px;">Loket Aktif</span>
      `;
            const cardBody = document.createElement("div");
            cardBody.className = "layar-card-body";
            if (currentCalling !== undefined) {
                let prioChipClass = "chip-priority-normal";
                if (currentCalling.prioritas === "VIP")
                    prioChipClass = "chip-priority-vip";
                else if (currentCalling.prioritas === "Disabilitas")
                    prioChipClass = "chip-priority-disabilitas";
                else if (currentCalling.prioritas === "Lansia")
                    prioChipClass = "chip-priority-lansia";
                cardBody.innerHTML = `
          <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); font-weight: 600;">Nomor Antrian Dipanggil</div>
          <div class="layar-ticket-number">${currentCalling.label}</div>
          <div style="margin-top: 4px;">
            <span class="chip ${prioChipClass}" style="font-size: 14px;">${currentCalling.prioritas}</span>
          </div>
        `;
            }
            else {
                cardBody.innerHTML = `
          <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--muted); font-weight: 600;">Nomor Antrian Dipanggil</div>
          <div class="layar-ticket-number" style="color: var(--hairline); font-size: 56px;">---</div>
          <div style="color: var(--muted); font-size: 14px;">Menunggu Pemanggilan</div>
        `;
            }
            const cardFooter = document.createElement("div");
            cardFooter.className = "layar-card-footer";
            cardFooter.innerHTML = `
        <span style="color: var(--body);">Sisa Antrian:</span>
        <span style="font-weight: 700; color: ${waitingCount > 0 ? "var(--warning)" : "var(--muted)"};">
          ${waitingCount} Pasien Menunggu
        </span>
      `;
            card.appendChild(cardHeader);
            card.appendChild(cardBody);
            card.appendChild(cardFooter);
            container.appendChild(card);
        }
    }
    // Initial render
    renderLayar();
    // Storage listener & Polling (2.5s)
    window.addEventListener("storage", (e) => {
        if (e.key === "tickets" || e.key === "queue_types" || e.key === null) {
            renderLayar();
        }
    });
    window.setInterval(() => {
        renderLayar();
    }, 2500);
}
document.addEventListener("DOMContentLoaded", initLayar);
