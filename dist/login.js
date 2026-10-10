import { loginRequest, getSession } from "./auth.js";
function initLogin() {
    // If already authenticated, redirect immediately based on role
    const existingSession = getSession();
    if (existingSession !== null) {
        if (existingSession.role === "admin" || existingSession.role === "moderator") {
            window.location.href = "index.html";
            return;
        }
        else {
            window.location.href = "operator.html";
            return;
        }
    }
    const form = document.getElementById("login-form");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const submitBtn = document.getElementById("btn-submit");
    const btnText = document.getElementById("btn-text");
    const errorContainer = document.getElementById("error-message");
    const errorText = document.getElementById("error-text");
    const btnFillAdmin = document.getElementById("btn-fill-admin");
    const btnFillUser = document.getElementById("btn-fill-user");
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
    function showError(msg) {
        if (errorContainer !== null && errorText !== null) {
            errorText.textContent = msg;
            errorContainer.style.display = "flex";
        }
    }
    function clearError() {
        if (errorContainer !== null) {
            errorContainer.style.display = "none";
        }
    }
    if (form === null || usernameInput === null || passwordInput === null || submitBtn === null || btnText === null) {
        return;
    }
    form.addEventListener("submit", async (e) => {
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
            // Auto redirect based on role
            if (session.role === "admin" || session.role === "moderator") {
                window.location.href = "index.html";
            }
            else {
                window.location.href = "operator.html";
            }
        }
        catch (err) {
            submitBtn.disabled = false;
            btnText.textContent = "Masuk";
            const message = err instanceof Error ? err.message : "Terjadi kesalahan koneksi ke server.";
            showError(message);
        }
    });
}
document.addEventListener("DOMContentLoaded", initLogin);
