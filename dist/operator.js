import { protectPage, readDeniedPage, PAGE_TITLES, logout } from "./auth.js";
import { loadQueueTypes, loadTickets, saveTickets } from "./storage.js";
import { compareTickets, escapeHtml } from "./types.js";
function initOperator() {
    // 1. Enforce Auth Guard (any logged-in role: admin, moderator, user)
    const session = protectPage("operator.html");
    // 2. Setup Navbar User Info & Logout
    const userDisplayName = document.getElementById("user-display-name");
    const userDisplayRole = document.getElementById("user-display-role");
    const btnLogout = document.getElementById("btn-logout");
    const linkAdmin = document.getElementById("link-admin-dashboard");
    if (userDisplayName !== null)
        userDisplayName.textContent = session.name;
    if (userDisplayRole !== null)
        userDisplayRole.textContent = session.role;
    // Hide admin link if role is user to keep UI clean and prevent 403 confusion
    if (linkAdmin !== null && session.role !== "admin" && session.role !== "moderator") {
        linkAdmin.style.display = "none";
    }
    if (btnLogout !== null) {
        btnLogout.addEventListener("click", () => {
            logout();
        });
    }
    // 3. Alerts
    const alertBox = document.getElementById("operator-alert");
    const alertText = document.getElementById("operator-alert-text");
    let alertTimer;
    function showAlert(msg, type = "info") {
        if (alertBox !== null && alertText !== null) {
            alertBox.className = `alert alert-${type}`;
            alertText.textContent = msg;
            alertBox.style.display = "flex";
            window.clearTimeout(alertTimer);
            alertTimer = window.setTimeout(() => {
                alertBox.style.display = "none";
            }, 4000);
        }
    }
    // Redirected here from a page this role may not open (e.g. user -> index.html).
    const denied = readDeniedPage(window.location.search);
    if (denied !== null) {
        showAlert(`Akses ditolak: halaman ${PAGE_TITLES[denied]} hanya untuk admin/moderator. Role Anda (${session.role}) dapat memakai Layar Antrian dan Ambil Antrian.`, "error");
        window.history.replaceState(null, "", "operator.html");
    }
    // 4. Elements
    const selectQueue = document.getElementById("select-operator-queue");
    const currentEmptyState = document.getElementById("current-empty-state");
    const currentTicketDetail = document.getElementById("current-ticket-detail");
    const currentTicketLabel = document.getElementById("current-ticket-label");
    const currentTicketService = document.getElementById("current-ticket-service");
    const currentTicketPriorityChip = document.getElementById("current-ticket-priority-chip");
    const currentTicketTime = document.getElementById("current-ticket-time");
    const btnCallNext = document.getElementById("btn-call-next");
    const btnSkipTicket = document.getElementById("btn-skip-ticket");
    const btnCompleteTicket = document.getElementById("btn-complete-ticket");
    const badgeWaiting = document.getElementById("badge-total-waiting");
    const nextEmptyState = document.getElementById("next-empty-state");
    const nextTableWrapper = document.getElementById("next-table-wrapper");
    const nextQueueTbody = document.getElementById("next-queue-tbody");
    const historyEmptyState = document.getElementById("history-empty-state");
    const historyTableWrapper = document.getElementById("history-table-wrapper");
    const historyTbody = document.getElementById("history-tbody");
    // Keep track of currently called ticket
    let activeTicketId = null;
    let lastSnapshot = "";
    function populateQueueFilter(queues) {
        if (selectQueue === null)
            return;
        const currentVal = selectQueue.value;
        const existingOptions = Array.from(selectQueue.options).map((o) => o.value);
        const expectedValues = ["ALL", ...queues.map((q) => q.kode)];
        // Check if options changed
        if (existingOptions.join(",") === expectedValues.join(","))
            return;
        selectQueue.innerHTML = "";
        const allOpt = document.createElement("option");
        allOpt.value = "ALL";
        allOpt.textContent = "Semua Poli Pelayanan";
        selectQueue.appendChild(allOpt);
        for (const q of queues) {
            const opt = document.createElement("option");
            opt.value = q.kode;
            opt.textContent = `${q.kode} - ${q.nama}${q.aktif ? "" : " (Nonaktif)"}`;
            selectQueue.appendChild(opt);
        }
        if (expectedValues.includes(currentVal)) {
            selectQueue.value = currentVal;
        }
    }
    function getPriorityClass(prio) {
        switch (prio) {
            case "VIP": return "chip-priority-vip";
            case "Disabilitas": return "chip-priority-disabilitas";
            case "Lansia": return "chip-priority-lansia";
            default: return "chip-priority-normal";
        }
    }
    function getStatusClass(status) {
        switch (status) {
            case "Dipanggil": return "chip-status-dipanggil";
            case "Menunggu": return "chip-status-menunggu";
            case "Selesai": return "chip-status-selesai";
            case "Dilewati": return "chip-status-dilewati";
            default: return "chip";
        }
    }
    function renderView() {
        const queues = loadQueueTypes();
        const tickets = loadTickets();
        const filter = selectQueue !== null ? selectQueue.value : "ALL";
        // Snapshot check so polling does not steal focus
        const snapshot = JSON.stringify([queues, tickets, filter]);
        if (snapshot === lastSnapshot)
            return;
        lastSnapshot = snapshot;
        populateQueueFilter(queues);
        // Filter tickets if specific queue is chosen
        const filteredTickets = filter === "ALL" ? tickets : tickets.filter((t) => t.kode === filter);
        // 1. Current Dipanggil
        // If activeTicketId exists and matches filtered status, prefer it; otherwise find latest Dipanggil
        let currentTicket;
        if (activeTicketId !== null) {
            currentTicket = filteredTickets.find((t) => t.id === activeTicketId && t.status === "Dipanggil");
        }
        if (currentTicket === undefined) {
            // Find the most recently called ticket
            const dipanggilList = filteredTickets.filter((t) => t.status === "Dipanggil");
            if (dipanggilList.length > 0) {
                currentTicket = dipanggilList[dipanggilList.length - 1];
            }
        }
        if (currentTicket !== undefined) {
            activeTicketId = currentTicket.id;
            if (currentEmptyState !== null)
                currentEmptyState.style.display = "none";
            if (currentTicketDetail !== null)
                currentTicketDetail.style.display = "block";
            if (currentTicketLabel !== null)
                currentTicketLabel.textContent = currentTicket.label;
            const qInfo = queues.find((q) => q.kode === currentTicket?.kode);
            if (currentTicketService !== null) {
                currentTicketService.textContent = qInfo !== undefined ? `${qInfo.kode} - ${qInfo.nama}` : currentTicket.kode;
            }
            if (currentTicketPriorityChip !== null) {
                currentTicketPriorityChip.className = `chip ${getPriorityClass(currentTicket.prioritas)}`;
                currentTicketPriorityChip.textContent = `Prioritas: ${currentTicket.prioritas}`;
            }
            if (currentTicketTime !== null) {
                const d = new Date(currentTicket.createdAt);
                currentTicketTime.textContent = `Waktu Ambil: ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
            }
            if (btnSkipTicket !== null)
                btnSkipTicket.disabled = false;
            if (btnCompleteTicket !== null)
                btnCompleteTicket.disabled = false;
        }
        else {
            activeTicketId = null;
            if (currentEmptyState !== null)
                currentEmptyState.style.display = "block";
            if (currentTicketDetail !== null)
                currentTicketDetail.style.display = "none";
            if (btnSkipTicket !== null)
                btnSkipTicket.disabled = true;
            if (btnCompleteTicket !== null)
                btnCompleteTicket.disabled = true;
        }
        // 2. Next Menunggu list sorted by compareTickets
        const waitingTickets = filteredTickets.filter((t) => t.status === "Menunggu");
        waitingTickets.sort(compareTickets);
        if (badgeWaiting !== null) {
            badgeWaiting.textContent = `${waitingTickets.length} Menunggu`;
        }
        if (waitingTickets.length === 0) {
            if (nextEmptyState !== null)
                nextEmptyState.style.display = "block";
            if (nextTableWrapper !== null)
                nextTableWrapper.style.display = "none";
        }
        else {
            if (nextEmptyState !== null)
                nextEmptyState.style.display = "none";
            if (nextTableWrapper !== null)
                nextTableWrapper.style.display = "block";
        }
        if (nextQueueTbody !== null) {
            nextQueueTbody.innerHTML = "";
            waitingTickets.forEach((t, idx) => {
                const tr = document.createElement("tr");
                const qInfo = queues.find((q) => q.kode === t.kode);
                const serviceName = qInfo !== undefined ? qInfo.nama : t.kode;
                const d = new Date(t.createdAt);
                const timeStr = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                tr.innerHTML = `
          <td style="font-weight: 600; color: var(--muted);">${idx + 1}</td>
          <td><strong>${escapeHtml(t.label)}</strong></td>
          <td>${escapeHtml(t.kode)} - ${escapeHtml(serviceName)}</td>
          <td><span class="chip ${getPriorityClass(t.prioritas)}">${t.prioritas}</span></td>
          <td class="text-muted" style="text-align: right;">${timeStr}</td>
        `;
                nextQueueTbody.appendChild(tr);
            });
        }
        // 3. History of non-waiting tickets (Dipanggil, Selesai, Dilewati), most recent first
        const historyTickets = filteredTickets
            .filter((t) => t.status !== "Menunggu")
            .sort((a, b) => b.createdAt - a.createdAt);
        if (historyTickets.length === 0) {
            if (historyEmptyState !== null)
                historyEmptyState.style.display = "block";
            if (historyTableWrapper !== null)
                historyTableWrapper.style.display = "none";
        }
        else {
            if (historyEmptyState !== null)
                historyEmptyState.style.display = "none";
            if (historyTableWrapper !== null)
                historyTableWrapper.style.display = "block";
        }
        if (historyTbody !== null) {
            historyTbody.innerHTML = "";
            historyTickets.slice(0, 20).forEach((t) => {
                const tr = document.createElement("tr");
                const qInfo = queues.find((q) => q.kode === t.kode);
                const serviceName = qInfo !== undefined ? qInfo.nama : t.kode;
                const d = new Date(t.createdAt);
                const timeStr = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                tr.innerHTML = `
          <td><strong>${escapeHtml(t.label)}</strong></td>
          <td>${escapeHtml(t.kode)} - ${escapeHtml(serviceName)}</td>
          <td><span class="chip ${getPriorityClass(t.prioritas)}">${t.prioritas}</span></td>
          <td><span class="chip ${getStatusClass(t.status)}">${t.status}</span></td>
          <td class="text-muted" style="text-align: right;">${timeStr}</td>
        `;
                historyTbody.appendChild(tr);
            });
        }
    }
    // 5. Button Actions: Panggil Berikutnya, Lewati, Selesai
    if (btnCallNext !== null) {
        btnCallNext.addEventListener("click", () => {
            const tickets = loadTickets();
            const filter = selectQueue !== null ? selectQueue.value : "ALL";
            // Mark current Dipanggil ticket as Selesai
            if (activeTicketId !== null) {
                const current = tickets.find((t) => t.id === activeTicketId);
                if (current !== undefined && current.status === "Dipanggil") {
                    current.status = "Selesai";
                }
            }
            // Find next Menunggu ticket sorted by compareTickets
            const waitingTickets = (filter === "ALL" ? tickets : tickets.filter((t) => t.kode === filter))
                .filter((t) => t.status === "Menunggu")
                .sort(compareTickets);
            const nextTicket = waitingTickets[0];
            if (nextTicket === undefined) {
                saveTickets(tickets);
                showAlert("Tidak ada antrian menunggu lagi dalam daftar.", "info");
                renderView();
                return;
            }
            // Call the next ticket
            nextTicket.status = "Dipanggil";
            activeTicketId = nextTicket.id;
            saveTickets(tickets);
            showAlert(`Memanggil nomor antrian ${nextTicket.label}!`, "success");
            renderView();
        });
    }
    if (btnSkipTicket !== null) {
        btnSkipTicket.addEventListener("click", () => {
            if (activeTicketId === null)
                return;
            const tickets = loadTickets();
            const current = tickets.find((t) => t.id === activeTicketId);
            if (current === undefined || current.status !== "Dipanggil") {
                showAlert("Tidak ada tiket aktif untuk dilewati.", "error");
                return;
            }
            current.status = "Dilewati";
            saveTickets(tickets);
            showAlert(`Nomor antrian ${current.label} ditandai Dilewati.`, "info");
            activeTicketId = null;
            renderView();
        });
    }
    if (btnCompleteTicket !== null) {
        btnCompleteTicket.addEventListener("click", () => {
            if (activeTicketId === null)
                return;
            const tickets = loadTickets();
            const current = tickets.find((t) => t.id === activeTicketId);
            if (current === undefined || current.status !== "Dipanggil") {
                showAlert("Tidak ada tiket aktif untuk diselesaikan.", "error");
                return;
            }
            current.status = "Selesai";
            saveTickets(tickets);
            showAlert(`Pelayanan nomor antrian ${current.label} telah selesai.`, "success");
            activeTicketId = null;
            renderView();
        });
    }
    if (selectQueue !== null) {
        selectQueue.addEventListener("change", () => {
            lastSnapshot = "";
            renderView();
        });
    }
    // Initial render
    renderView();
    // Storage listener & Polling (3s)
    window.addEventListener("storage", (e) => {
        if (e.key === "tickets" || e.key === "queue_types" || e.key === null) {
            renderView();
        }
    });
    window.setInterval(() => {
        renderView();
    }, 3000);
}
document.addEventListener("DOMContentLoaded", initOperator);
