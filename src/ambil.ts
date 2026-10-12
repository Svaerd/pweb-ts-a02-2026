import { loadQueueTypes, saveQueueTypes, loadTickets, saveTickets, isPriority } from "./storage.js";
import type { QueueType, Ticket } from "./types.js";
import { formatLabel } from "./types.js";

function initAmbil(): void {
  const formAmbil = document.getElementById("form-ambil-tiket") as HTMLFormElement | null;
  const selectQueue = document.getElementById("select-queue") as HTMLSelectElement | null;
  const selectPriority = document.getElementById("select-priority") as HTMLSelectElement | null;
  const btnSubmit = document.getElementById("btn-submit-ticket") as HTMLButtonElement | null;

  const alertBox = document.getElementById("alert-box");
  const alertText = document.getElementById("alert-text");

  const resultSection = document.getElementById("ticket-result-section");
  const resultLabel = document.getElementById("result-ticket-label");
  const resultService = document.getElementById("result-ticket-service");
  const resultPriorityChip = document.getElementById("result-ticket-priority-chip");
  const resultTime = document.getElementById("result-ticket-time");
  const btnPrint = document.getElementById("btn-print-ticket");
  const btnNew = document.getElementById("btn-new-ticket");

  let alertTimer: number | undefined;

  function showAlert(msg: string, type: "error" | "success" | "info" = "info"): void {
    if (alertBox !== null && alertText !== null) {
      alertBox.className = `alert alert-${type}`;
      alertText.textContent = msg;
      alertBox.style.display = "flex";
      window.clearTimeout(alertTimer);
      alertTimer = window.setTimeout(() => {
        alertBox.style.display = "none";
      }, 5000);
    }
  }

  function clearAlert(): void {
    if (alertBox !== null) {
      alertBox.style.display = "none";
    }
  }

  let lastQueuesSnapshot = "";

  function renderQueueOptions(): void {
    if (selectQueue === null) return;
    const allQueues = loadQueueTypes();
    const activeQueues = allQueues.filter((q) => q.aktif);

    const snapshot = JSON.stringify(activeQueues.map((q) => ({ kode: q.kode, nama: q.nama })));
    if (snapshot === lastQueuesSnapshot) return;
    lastQueuesSnapshot = snapshot;

    const previousSelected = selectQueue.value;
    selectQueue.innerHTML = "";

    if (activeQueues.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "-- Belum ada poli aktif yang tersedia --";
      selectQueue.appendChild(opt);
      selectQueue.disabled = true;
      if (btnSubmit !== null) btnSubmit.disabled = true;
      return;
    }

    selectQueue.disabled = false;
    if (btnSubmit !== null) btnSubmit.disabled = false;

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "-- Pilih Poli Pelayanan --";
    selectQueue.appendChild(defaultOpt);

    for (const q of activeQueues) {
      const opt = document.createElement("option");
      opt.value = q.kode;
      opt.textContent = `${q.kode} - ${q.nama}`;
      if (q.kode === previousSelected) opt.selected = true;
      selectQueue.appendChild(opt);
    }
  }

  if (btnPrint !== null) {
    btnPrint.addEventListener("click", () => {
      window.print();
    });
  }

  if (btnNew !== null) {
    btnNew.addEventListener("click", () => {
      if (resultSection !== null) resultSection.style.display = "none";
      if (formAmbil !== null) {
        formAmbil.reset();
        renderQueueOptions();
        if (selectQueue !== null) selectQueue.focus();
      }
    });
  }

  if (formAmbil !== null) {
    formAmbil.addEventListener("submit", (e: Event) => {
      e.preventDefault();
      clearAlert();

      if (selectQueue === null || selectPriority === null) return;

      const chosenCode = selectQueue.value.trim().toUpperCase();
      const chosenPriority = selectPriority.value.trim();

      if (chosenCode === "") {
        showAlert("Silakan pilih poli pelayanan terlebih dahulu.", "error");
        selectQueue.focus();
        return;
      }

      if (!isPriority(chosenPriority)) {
        showAlert("Tingkat prioritas tidak valid. Pilih salah satu dari pilihan yang ada.", "error");
        selectPriority.focus();
        return;
      }

      const queues = loadQueueTypes();
      const targetQueue = queues.find((q) => q.kode === chosenCode);

      if (targetQueue === undefined || !targetQueue.aktif) {
        showAlert("Jenis antrian tidak ditemukan atau berstatus nonaktif.", "error");
        renderQueueOptions();
        return;
      }

      // Increment counter
      targetQueue.counter += 1;
      const newNumber = targetQueue.counter;
      const label = formatLabel(targetQueue.kode, newNumber);

      const newTicket: Ticket = {
        id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `t_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        kode: targetQueue.kode,
        nomor: newNumber,
        label,
        prioritas: chosenPriority,
        status: "Menunggu",
        createdAt: Date.now(),
      };

      const tickets = loadTickets();
      tickets.push(newTicket);

      saveQueueTypes(queues);
      saveTickets(tickets);

      showAlert(`Nomor tiket ${label} berhasil dicetak!`, "success");

      // Display ticket result
      if (resultSection !== null && resultLabel !== null && resultService !== null && resultPriorityChip !== null && resultTime !== null) {
        resultLabel.textContent = newTicket.label;
        resultService.textContent = `${targetQueue.kode} - ${targetQueue.nama}`;

        let prioClass = "chip-priority-normal";
        if (newTicket.prioritas === "VIP") prioClass = "chip-priority-vip";
        else if (newTicket.prioritas === "Disabilitas") prioClass = "chip-priority-disabilitas";
        else if (newTicket.prioritas === "Lansia") prioClass = "chip-priority-lansia";

        resultPriorityChip.className = `chip ${prioClass}`;
        resultPriorityChip.textContent = `Prioritas: ${newTicket.prioritas}`;

        const d = new Date(newTicket.createdAt);
        resultTime.textContent = `Waktu Cetak: ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;

        resultSection.style.display = "block";
        resultSection.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  // Initial render
  renderQueueOptions();

  // Storage listener & Polling (2-3s)
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === "queue_types" || e.key === null) {
      renderQueueOptions();
    }
  });

  window.setInterval(() => {
    renderQueueOptions();
  }, 2500);
}

document.addEventListener("DOMContentLoaded", initAmbil);
