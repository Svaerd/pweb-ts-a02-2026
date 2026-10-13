import { loginRequest, getSession, readNextPage, canAccess, homeFor, PAGE_TITLES } from "./auth.js";
import type { Role } from "./types.js";

// Back to the page that sent the user to login, but only if this role may open it; otherwise the role's home.
function targetFor(role: Role): string {
  const next = readNextPage(window.location.search);
  if (next !== null && canAccess(role, next)) return next;
  return homeFor(role);
}

function initLogin(): void {
  // If already authenticated, redirect immediately based on role
  const existingSession = getSession();
  if (existingSession !== null) {
    window.location.href = targetFor(existingSession.role);
    return;
  }

  // Sent here by a page guard: tell the user why.
  const notice = document.getElementById("login-notice");
  const noticeText = document.getElementById("login-notice-text");
  const nextPage = readNextPage(window.location.search);
  if (notice !== null && noticeText !== null && nextPage !== null) {
    noticeText.textContent = `Silakan masuk terlebih dahulu untuk membuka ${PAGE_TITLES[nextPage]}. Semua halaman wajib login.`;
    notice.style.display = "flex";
  }

  const form = document.getElementById("login-form") as HTMLFormElement | null;
  const usernameInput = document.getElementById("username") as HTMLInputElement | null;
  const passwordInput = document.getElementById("password") as HTMLInputElement | null;
  const submitBtn = document.getElementById("btn-submit") as HTMLButtonElement | null;
  const btnText = document.getElementById("btn-text") as HTMLSpanElement | null;
  const errorContainer = document.getElementById("error-message") as HTMLElement | null;
  const errorText = document.getElementById("error-text") as HTMLElement | null;

  const btnFillAdmin = document.getElementById("btn-fill-admin") as HTMLButtonElement | null;
  const btnFillUser = document.getElementById("btn-fill-user") as HTMLButtonElement | null;

  if (btnFillAdmin !== null && usernameInput !== null && passwordInput !== null) {
    btnFillAdmin.addEventListener("click", () => {
      usernameInput.value = "emilys";
      passwordInput.value = "emilyspass";
      clearError();
    });
  }

  if (btnFillUser !== null && usernameInput !== null && passwordInput !== null) {
    btnFillUser.addEventListener("click", () => {
      usernameInput.value = "michaelw";
      passwordInput.value = "michaelwpass";
      clearError();
    });
  }

  function showError(msg: string): void {
    if (errorContainer !== null && errorText !== null) {
      errorText.textContent = msg;
      errorContainer.style.display = "flex";
    }
  }

  function clearError(): void {
    if (errorContainer !== null) {
      errorContainer.style.display = "none";
    }
  }

  if (form === null || usernameInput === null || passwordInput === null || submitBtn === null || btnText === null) {
    return;
  }

  form.addEventListener("submit", async (e: Event) => {
    e.preventDefault();
    clearError();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (username === "" || password === "") {
      showError("Username dan password wajib diisi.");
      return;
    }

    // Set loading state
    submitBtn.disabled = true;
    btnText.textContent = "Memverifikasi...";

    try {
      const session = await loginRequest(username, password);

      // Auto redirect: back to the requested page, otherwise based on role
      window.location.href = targetFor(session.role);
    } catch (err: unknown) {
      submitBtn.disabled = false;
      btnText.textContent = "Masuk";

      const message = err instanceof Error ? err.message : "Terjadi kesalahan koneksi ke server.";
      showError(message);
    }
  });
}

document.addEventListener("DOMContentLoaded", initLogin);