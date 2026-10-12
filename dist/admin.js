import { requireAdmin, logout } from "./auth.js";
import { loadQueueTypes, saveQueueTypes, loadTickets, saveTickets, isPriority, nextTicketNumber } from "./storage.js";
import { formatLabel } from "./types.js";
function initAdmin() {
    // 1. Enforce Auth & Role Guard
    const session = requireAdmin();
    // 2. Setup Navbar User Information & Logout
    const userDisplayName = document.getElementById("user-display-name");
    const userDisplayRole = document.getElementById("user-display-role");
    const btnLogout = document.getElementById("btn-logout");
    if (userDisplayName !== null)
        userDisplayName.textContent = session.name;
    if (userDisplayRole !== null)
        userDisplayRole.textContent = session.role;
    if (btnLogout !== null) {
        btnLogout.addEventListener("click", () => {
            logout();
        });
    }
    // 3. Global Alert System
    const globalAlert = document.getElementById("global-alert");
    const globalAlertText = document.getElementById("global-alert-text");
    let alertTimer;
    function showAlert(msg, type = "info") {
        if (globalAlert !== null && globalAlertText !== null) {
            globalAlert.className = `alert alert-${type}`;
            globalAlertText.textContent = msg;
            globalAlert.style.display = "flex";
            window.scrollTo({ top: 0, behavior: "smooth" });
            // Restart the timer so an older alert cannot hide a newer one early.
            window.clearTimeout(alertTimer);
            alertTimer = window.setTimeout(() => {
                globalAlert.style.display = "none";
            }, 5000);
        }
    }
    // 4. Modal Elements
    const ticketModal = document.getElementById("ticket-modal");
    const btnCloseModal = document.getElementById("btn-close-modal");
    const btnModalDone = document.getElementById("btn-modal-done");
    const btnModalPrint = document.getElementById("btn-modal-print");
    const modalTicketLabel = document.getElementById("modal-ticket-label");
    const modalTicketService = document.getElementById("modal-ticket-service");
    const modalTicketPriorityChip = document.getElementById("modal-ticket-priority-chip");
    const modalTicketTime = document.getElementById("modal-ticket-time");
    let focusBeforeModal = null;
    function showModal() {
        if (ticketModal === null)
            return;
        focusBeforeModal = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        ticketModal.style.display = "flex";
        if (btnModalDone !== null)
            btnModalDone.focus();
    }
    function hideModal() {
        if (ticketModal === null || ticketModal.style.display === "none")
            return;
        ticketModal.style.display = "none";
        if (focusBeforeModal !== null) {
            focusBeforeModal.focus();
            focusBeforeModal = null;
        }
    }
    if (btnCloseModal !== null)
        btnCloseModal.addEventListener("click", hideModal);
    if (btnModalDone !== null)
        btnModalDone.addEventListener("click", hideModal);
    if (btnModalPrint !== null) {
        btnModalPrint.addEventListener("click", () => {
            window.print();
        });
    }
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            hideModal();
            return;
        }
        // Keep Tab inside the open dialog.
        if (e.key === "Tab" && ticketModal !== null && ticketModal.style.display !== "none") {
            const focusable = Array.from(ticketModal.querySelectorAll("button:not([disabled])"));
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (first === undefined || last === undefined)
                return;
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
            else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });
    // 5. Render Functions
    function updateDashboardStats(queues, tickets) {
        const elTotalQueues = document.getElementById("stat-total-queues");
        const elWaitingTickets = document.getElementById("stat-waiting-tickets");
        const elCallingTickets = document.getElementById("stat-calling-tickets");
        const elTotalTickets = document.getElementById("stat-total-tickets");
        const waitingCount = tickets.filter((t) => t.status === "Menunggu").length;
        const callingCount = tickets.filter((t) => t.status === "Dipanggil").length;
        if (elTotalQueues !== null)
            elTotalQueues.textContent = String(queues.length);
        if (elWaitingTickets !== null)
            elWaitingTickets.textContent = String(waitingCount);
        if (elCallingTickets !== null)
            elCallingTickets.textContent = String(callingCount);
        if (elTotalTickets !== null)
            elTotalTickets.textContent = String(tickets.length);
    }
    function renderQueueTypesTable(queues) {
        const tbody = document.getElementById("table-body-queues");
        if (tbody === null)
            return;
        tbody.innerHTML = "";
        if (queues.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="5" class="empty-state" style="padding: 24px;">Belum ada jenis antrian. Tambahkan jenis antrian baru di atas.</td>`;
            tbody.appendChild(tr);
            return;
        }
        for (const q of queues) {
            const tr = document.createElement("tr");
            const tdCode = document.createElement("td");
            tdCode.style.fontWeight = "700";
            tdCode.textContent = q.kode;
            tr.appendChild(tdCode);
            const tdName = document.createElement("td");
            tdName.textContent = q.nama;
            tr.appendChild(tdName);
            const tdStatus = document.createElement("td");
            const statusChip = document.createElement("span");
            statusChip.className = `chip ${q.aktif ? "chip-active" : "chip-inactive"}`;
            statusChip.textContent = q.aktif ? "Aktif" : "Nonaktif";
            tdStatus.appendChild(statusChip);
            tr.appendChild(tdStatus);
            const tdCounter = document.createElement("td");
            tdCounter.style.textAlign = "center";
            tdCounter.style.fontWeight = "600";
            tdCounter.textContent = String(q.counter);
            tr.appendChild(tdCounter);
            const tdAction = document.createElement("td");
            tdAction.className = "actions";
            // One list drives both the inline buttons and the mobile kebab menu.
            const rowActions = [
                {
                    label: q.aktif ? "Nonaktifkan" : "Aktifkan",
                    className: q.aktif ? "btn-secondary" : "btn-primary",
                    run: () => toggleQueueActive(q.kode),
                },
                { label: "Hapus", className: "btn-danger", run: () => deleteQueueType(q.kode) },
            ];
            const kebab = document.createElement("div");
            kebab.className = "kebab";
            const kebabBtn = document.createElement("button");
            kebabBtn.type = "button";
            kebabBtn.textContent = "⋮";
            kebabBtn.setAttribute("aria-label", "Aksi lain");
            const menu = document.createElement("ul");
            for (const action of rowActions) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = `btn btn-sm ${action.className}`;
                btn.textContent = action.label;
                btn.addEventListener("click", action.run);
                tdAction.appendChild(btn);
                const li = document.createElement("li");
                const menuBtn = document.createElement("button");
                menuBtn.type = "button";
                menuBtn.textContent = action.label;
                menuBtn.addEventListener("click", action.run);
                li.appendChild(menuBtn);
                menu.appendChild(li);
            }
            kebab.appendChild(kebabBtn);
            kebab.appendChild(menu);
            tdAction.appendChild(kebab);
            tr.appendChild(tdAction);
            tbody.appendChild(tr);
        }
    }
    function renderSelectQueueOptions(queues) {
        const select = document.getElementById("select-queue-type");
        const filterQueue = document.getElementById("filter-queue");
        if (select !== null) {
            const currentSelected = select.value;
            select.innerHTML = `<option value="">-- Pilih Jenis Antrian --</option>`;
            for (const q of queues) {
                if (q.aktif) {
                    const opt = document.createElement("option");
                    opt.value = q.kode;
                    opt.textContent = `${q.kode} - ${q.nama}`;
                    select.appendChild(opt);
                }
            }
            select.value = currentSelected;
        }
        if (filterQueue !== null) {
            const currentFilter = filterQueue.value;
            filterQueue.innerHTML = `<option value="ALL">Semua Poli</option>`;
            for (const q of queues) {
                const opt = document.createElement("option");
                opt.value = q.kode;
                opt.textContent = `${q.kode} - ${q.nama}`;
                filterQueue.appendChild(opt);
            }
            filterQueue.value = currentFilter;
        }
    }
    function renderTicketsTable(tickets, queues) {
        const tbody = document.getElementById("table-body-tickets");
        if (tbody === null)
            return;
        const filterStatus = document.getElementById("filter-status")?.value ?? "ALL";
        const filterQueue = document.getElementById("filter-queue")?.value ?? "ALL";
        const queueMap = new Map();
        for (const q of queues) {
            queueMap.set(q.kode, q.nama);
        }
        const filtered = tickets.filter((t) => {
            const matchStatus = filterStatus === "ALL" || t.status === filterStatus;
            const matchQueue = filterQueue === "ALL" || t.kode === filterQueue;
            return matchStatus && matchQueue;
        });
        tbody.innerHTML = "";
        if (filtered.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="5" class="empty-state">Tidak ada tiket antrian yang cocok dengan filter.</td>`;
            tbody.appendChild(tr);
            return;
        }
        // Newest tickets first
        const sorted = [...filtered].sort((a, b) => b.createdAt - a.createdAt);
        for (const t of sorted) {
            const tr = document.createElement("tr");
            const tdLabel = document.createElement("td");
            tdLabel.style.fontWeight = "700";
            tdLabel.style.fontSize = "15px";
            tdLabel.textContent = t.label;
            tr.appendChild(tdLabel);
            const tdService = document.createElement("td");
            const serviceName = queueMap.get(t.kode) ?? `Poli ${t.kode}`;
            tdService.textContent = serviceName;
            tr.appendChild(tdService);
            const tdPriority = document.createElement("td");
            const chipPriority = document.createElement("span");
            const pLower = t.prioritas.toLowerCase();
            chipPriority.className = `chip chip-priority-${pLower}`;
            chipPriority.textContent = t.prioritas;
            tdPriority.appendChild(chipPriority);
            tr.appendChild(tdPriority);
            const tdStatus = document.createElement("td");
            const chipStatus = document.createElement("span");
            const sLower = t.status.toLowerCase();
            chipStatus.className = `chip chip-status-${sLower}`;
            chipStatus.textContent = t.status;
            tdStatus.appendChild(chipStatus);
            tr.appendChild(tdStatus);
            const tdTime = document.createElement("td");
            tdTime.className = "text-muted";
            const date = new Date(t.createdAt);
            tdTime.textContent = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            tr.appendChild(tdTime);
            tbody.appendChild(tr);
        }
    }
    // Skip re-rendering when nothing changed, so the 3s polling does not steal keyboard focus.
    let lastSnapshot = "";
    function refreshAll() {
        const queues = loadQueueTypes();
        const tickets = loadTickets();
        const snapshot = JSON.stringify([queues, tickets]);
        if (snapshot === lastSnapshot)
            return;
        lastSnapshot = snapshot;
        updateDashboardStats(queues, tickets);
        renderQueueTypesTable(queues);
        renderSelectQueueOptions(queues);
        renderTicketsTable(tickets, queues);
    }
    // 6. Action Handlers: CRUD Queue Types
    function toggleQueueActive(code) {
        const queues = loadQueueTypes();
        const target = queues.find((q) => q.kode === code);
        if (target === undefined)
            return;
        target.aktif = !target.aktif;
        saveQueueTypes(queues);
        refreshAll();
        showAlert(`Layanan ${target.nama} berhasil di-${target.aktif ? "aktifkan" : "nonaktifkan"}.`, "success");
    }
    function deleteQueueType(code) {
        const queues = loadQueueTypes();
        const target = queues.find((q) => q.kode === code);
        if (target === undefined)
            return;
        const tickets = loadTickets();
        const remainingTickets = tickets.filter((t) => t.kode !== code);
        const removedTickets = tickets.length - remainingTickets.length;
        const extra = removedTickets > 0 ? ` ${removedTickets} tiket dengan kode ini juga akan ikut dihapus.` : "";
        const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus jenis antrian '${target.nama}' (${target.kode})?${extra}`);
        if (!confirmed)
            return;
        // Tickets go with their queue type, otherwise re-creating the same code would issue duplicate labels (A-001 twice).
        saveQueueTypes(queues.filter((q) => q.kode !== code));
        saveTickets(remainingTickets);
        refreshAll();
        showAlert(`Jenis antrian '${target.nama}' (${target.kode}) berhasil dihapus.`, "success");
    }
    // 7. Form Handlers
    const formAddQueue = document.getElementById("form-add-queue");
    const inputCode = document.getElementById("queue-code");
    const inputName = document.getElementById("queue-name");
    if (formAddQueue !== null && inputCode !== null && inputName !== null) {
        formAddQueue.addEventListener("submit", (e) => {
            e.preventDefault();
            const rawCode = inputCode.value.trim().toUpperCase();
            const rawName = inputName.value.trim();
            // Rule: exactly 1 uppercase letter
            if (!/^[A-Z]$/.test(rawCode)) {
                showAlert("Kode antrian harus tepat satu huruf kapital (A-Z).", "error");
                inputCode.focus();
                return;
            }
            if (rawName.length === 0) {
                showAlert("Nama layanan/poli tidak boleh kosong.", "error");
                inputName.focus();
                return;
            }
            const queues = loadQueueTypes();
            // Case-insensitive duplicate check
            const codeExists = queues.some((q) => q.kode.toUpperCase() === rawCode);
            if (codeExists) {
                showAlert(`Kode antrian '${rawCode}' sudah digunakan. Gunakan kode lain.`, "error");
                inputCode.focus();
                return;
            }
            const nameExists = queues.some((q) => q.nama.trim().toLowerCase() === rawName.toLowerCase());
            if (nameExists) {
                showAlert(`Nama layanan '${rawName}' sudah ada. Gunakan nama lain.`, "error");
                inputName.focus();
                return;
            }
            const newQueue = {
                kode: rawCode,
                nama: rawName,
                aktif: true,
                counter: 0,
            };
            queues.push(newQueue);
            saveQueueTypes(queues);
            inputCode.value = "";
            inputName.value = "";
            refreshAll();
            showAlert(`Layanan '${rawName}' (${rawCode}) berhasil ditambahkan!`, "success");
        });
    }
    // Reset Antrian Handler
    const btnResetQueues = document.getElementById("btn-reset-queues");
    if (btnResetQueues !== null) {
        btnResetQueues.addEventListener("click", () => {
            const confirmed = window.confirm("PERINGATAN: Apakah Anda yakin ingin me-reset seluruh antrian? Seluruh tiket antrian akan dihapus dan counter nomor tiket akan kembali ke awal.");
            if (!confirmed)
                return;
            const queues = loadQueueTypes();
            for (const q of queues) {
                q.counter = 0;
            }
            saveQueueTypes(queues);
            saveTickets([]);
            refreshAll();
            showAlert("Seluruh tiket antrian telah berhasil di-reset ke awal.", "success");
        });
    }
    // 8. Penerbitan Tiket Manual Handler
    const formIssueTicket = document.getElementById("form-issue-ticket");
    const selectQueueType = document.getElementById("select-queue-type");
    const selectPriority = document.getElementById("select-priority");
    if (formIssueTicket !== null && selectQueueType !== null && selectPriority !== null) {
        formIssueTicket.addEventListener("submit", (e) => {
            e.preventDefault();
            const chosenCode = selectQueueType.value;
            const chosenPriority = selectPriority.value;
            if (chosenCode === "") {
                showAlert("Silakan pilih jenis antrian terlebih dahulu.", "error");
                selectQueueType.focus();
                return;
            }
            if (!isPriority(chosenPriority)) {
                showAlert("Tingkat prioritas tidak valid. Pilih salah satu dari daftar.", "error");
                selectPriority.focus();
                return;
            }
            const queues = loadQueueTypes();
            const targetQueue = queues.find((q) => q.kode === chosenCode);
            if (targetQueue === undefined || !targetQueue.aktif) {
                showAlert("Jenis antrian tidak ditemukan atau berstatus nonaktif.", "error");
                return;
            }
            const tickets = loadTickets();
            const newNumber = nextTicketNumber(targetQueue, tickets);
            targetQueue.counter = newNumber;
            const label = formatLabel(targetQueue.kode, newNumber);
            const newTicket = {
                id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `t_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                kode: targetQueue.kode,
                nomor: newNumber,
                label,
                prioritas: chosenPriority,
                status: "Menunggu",
                createdAt: Date.now(),
            };
            tickets.push(newTicket);
            saveQueueTypes(queues);
            saveTickets(tickets);
            refreshAll();
            // Update Latest Ticket Card on page
            const latestCard = document.getElementById("latest-ticket-card");
            const latestNumber = document.getElementById("latest-ticket-number");
            const latestService = document.getElementById("latest-ticket-service");
            const latestPriority = document.getElementById("latest-ticket-priority");
            const latestTime = document.getElementById("latest-ticket-time");
            if (latestCard !== null && latestNumber !== null && latestService !== null && latestPriority !== null && latestTime !== null) {
                latestNumber.textContent = label;
                latestService.textContent = targetQueue.nama;
                latestPriority.className = `chip chip-priority-${chosenPriority.toLowerCase()}`;
                latestPriority.textContent = chosenPriority;
                latestTime.textContent = `Waktu Terbit: ${new Date(newTicket.createdAt).toLocaleTimeString("id-ID")}`;
                latestCard.style.display = "block";
            }
            // Show Popup Modal
            if (modalTicketLabel !== null && modalTicketService !== null && modalTicketPriorityChip !== null && modalTicketTime !== null && ticketModal !== null) {
                modalTicketLabel.textContent = label;
                modalTicketService.textContent = targetQueue.nama;
                modalTicketPriorityChip.className = `chip chip-priority-${chosenPriority.toLowerCase()}`;
                modalTicketPriorityChip.textContent = chosenPriority;
                modalTicketTime.textContent = `Waktu: ${new Date(newTicket.createdAt).toLocaleTimeString("id-ID")}`;
                showModal();
            }
            showAlert(`Tiket nomor ${label} (${targetQueue.nama}) berhasil diterbitkan!`, "success");
        });
    }
    // 9. Filter Listeners
    const filterStatusEl = document.getElementById("filter-status");
    const filterQueueEl = document.getElementById("filter-queue");
    if (filterStatusEl !== null) {
        filterStatusEl.addEventListener("change", () => {
            renderTicketsTable(loadTickets(), loadQueueTypes());
        });
    }
    if (filterQueueEl !== null) {
        filterQueueEl.addEventListener("change", () => {
            renderTicketsTable(loadTickets(), loadQueueTypes());
        });
    }
    // 10. Initial Render & Real-time Listeners
    refreshAll();
    // Storage event listener for multi-tab synchronization
    window.addEventListener("storage", (e) => {
        if (e.key === "queue_types" || e.key === "tickets") {
            refreshAll();
        }
    });
    // Polling fallback every 3 seconds
    setInterval(() => {
        refreshAll();
    }, 3000);
}
document.addEventListener("DOMContentLoaded", initAdmin);
