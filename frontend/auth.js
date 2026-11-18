
const $ = id => document.getElementById(id);

let selectedRole = "user";
let currentMode = "login";

function showMessage(text, type = "") {
  $("message").textContent = text;
  $("message").className = "message " + type;
}

function setMode(mode) {
  currentMode = mode;

  $("loginForm").classList.toggle("hidden", mode !== "login");
  $("registerForm").classList.toggle("hidden", mode !== "register");
  $("loginTab").classList.toggle("active", mode === "login");
  $("registerTab").classList.toggle("active", mode === "register");

  $("formTitle").textContent =
    mode === "login" ? "Welcome back" : `Register as ${selectedRole}`;

  $("formDescription").textContent =
    mode === "login"
      ? `Sign in to the ${selectedRole} portal.`
      : `Create your ${selectedRole} account.`;

  showMessage("");
}

function setRole(role) {
  selectedRole = role;

  document.querySelectorAll("[data-role]").forEach(button => {
    button.classList.toggle("active", button.dataset.role === role);
  });

  const isAdmin = role === "admin";

  $("phoneField").classList.toggle("hidden", isAdmin);
  $("phone").required = !isAdmin;
  $("phone").disabled = isAdmin;

  $("employeeField").classList.toggle("hidden", !isAdmin);
  $("employeeId").required = isAdmin;
  $("employeeId").disabled = !isAdmin;

  setMode(currentMode);
}

$("loginTab").addEventListener("click", () => setMode("login"));
$("registerTab").addEventListener("click", () => setMode("register"));

document.querySelectorAll("[data-role]").forEach(button => {
  button.addEventListener("click", () => setRole(button.dataset.role));
});

$("registerForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("fullName").value.trim();
  const email = $("registerEmail").value.trim().toLowerCase();
  const password = $("registerPassword").value;
  const confirm = $("confirmPassword").value;

  if (password !== confirm) {
    return showMessage("Passwords do not match.", "error");
  }

  if (password.length < 8) {
    return showMessage("Password must contain at least 8 characters.", "error");
  }

  const users = JSON.parse(
    localStorage.getItem("subscribeiqUsers") || "[]"
  );

  if (users.some(user => user.email === email && user.role === selectedRole)) {
    return showMessage("An account already exists for this email and role.", "error");
  }

  users.push({
    name,
    email,
    password,
    role: selectedRole,
    phone: selectedRole === "user" ? $("phone").value.trim() : "",
    employeeId: selectedRole === "admin" ? $("employeeId").value.trim() : ""
  });

  localStorage.setItem("subscribeiqUsers", JSON.stringify(users));

  $("registerForm").reset();
  setMode("login");
  showMessage("Registration successful. You can now log in.", "success");
});

$("loginForm").addEventListener("submit", event => {
  event.preventDefault();

  const email = $("loginEmail").value.trim().toLowerCase();
  const password = $("loginPassword").value;

  const users = JSON.parse(
    localStorage.getItem("subscribeiqUsers") || "[]"
  );

  const user = users.find(item =>
    item.email === email &&
    item.password === password &&
    item.role === selectedRole
  );

  if (!user) {
    return showMessage(
      "Account not found. Register first or check your selected portal.",
      "error"
    );
  }

  sessionStorage.setItem("subscribeiqCurrentUser", JSON.stringify({
    name: user.name,
    email: user.email,
    role: user.role
  }));

  window.location.href =
    selectedRole === "admin" ? "admin.html" : "user.html";
});

setRole("user");

if (new URLSearchParams(window.location.search).get("mode") === "register") {
  setMode("register");
}