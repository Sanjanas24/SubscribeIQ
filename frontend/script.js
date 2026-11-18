
const sampleRecords = [
  { id: 1, type: "customers", name: "Ananya Rao", email: "ananya@example.com", amount: 0, status: "Active" },
  { id: 2, type: "customers", name: "Rahul Kumar", email: "rahul@example.com", amount: 0, status: "Active" },
  { id: 3, type: "customers", name: "Priya Sharma", email: "priya@example.com", amount: 0, status: "Active" },

  { id: 4, type: "subscriptions", name: "Premium Plan", email: "ananya@example.com", amount: 999, status: "Active" },
  { id: 5, type: "subscriptions", name: "Basic Plan", email: "rahul@example.com", amount: 499, status: "Active" },
  { id: 6, type: "subscriptions", name: "Business Plan", email: "priya@example.com", amount: 1499, status: "Active" },

  { id: 7, type: "invoices", name: "INV-1001", email: "ananya@example.com", amount: 999, status: "Paid" },
  { id: 8, type: "invoices", name: "INV-1002", email: "rahul@example.com", amount: 499, status: "Unpaid" },
  { id: 9, type: "invoices", name: "INV-1003", email: "priya@example.com", amount: 1499, status: "Paid" },

  { id: 10, type: "payments", name: "PAY-1001", email: "ananya@example.com", amount: 999, status: "Paid" },
  { id: 11, type: "payments", name: "PAY-1002", email: "rahul@example.com", amount: 300, status: "Pending" },
  { id: 12, type: "payments", name: "PAY-1003", email: "priya@example.com", amount: 1499, status: "Paid" }
];

const storageKey = "subscribeiqDashboardRecords";

function getRecords() {
  const saved = localStorage.getItem(storageKey);

  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }

  localStorage.setItem(storageKey, JSON.stringify(sampleRecords));
  return [...sampleRecords];
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function money(value) {
  return "₹" + Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function statusBadge(status) {
  const safeStatus = escapeHTML(status);
  const className = String(status || "").toLowerCase()
    .replace(/[^a-z0-9-]/g, "");

  return `<span class="status-badge ${className}">${safeStatus}</span>`;
}

function renderDashboard() {
  const records = getRecords();

  const customers = records.filter(record => record.type === "customers");
  const subscriptions = records.filter(record => record.type === "subscriptions");
  const invoices = records.filter(record => record.type === "invoices");
  const payments = records.filter(record => record.type === "payments");

  document.getElementById("customerCount").textContent = customers.length;
  document.getElementById("subscriptionCount").textContent = subscriptions.length;
  document.getElementById("invoiceCount").textContent = invoices.length;
  document.getElementById("paymentCount").textContent = payments.length;

  const revenue = payments
    .filter(payment => payment.status.toLowerCase() === "paid")
    .reduce((total, payment) => total + Number(payment.amount || 0), 0);

  document.getElementById("revenueTotal").textContent = money(revenue);

  document.getElementById("unpaidCount").textContent = invoices.filter(
    invoice => invoice.status.toLowerCase() !== "paid"
  ).length;

  const recentInvoices = invoices.slice(-5).reverse();
  const tbody = document.getElementById("recentInvoiceRows");

  tbody.innerHTML = recentInvoices.length
    ? recentInvoices.map(invoice => `
      <tr>
        <td>${escapeHTML(invoice.name)}</td>
        <td>${escapeHTML(invoice.email)}</td>
        <td>${money(invoice.amount)}</td>
        <td>${statusBadge(invoice.status)}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="4">No invoices available.</td></tr>';
}

const pageDetails = {
  customers: {
    title: "Customers",
    description: "Customer records available in the sample dashboard.",
    type: "customers"
  },
  subscriptions: {
    title: "Subscriptions",
    description: "Subscription plan records available in the sample dashboard.",
    type: "subscriptions"
  },
  invoices: {
    title: "Invoices",
    description: "Browse invoice amounts and payment statuses.",
    type: "invoices"
  },
  payments: {
    title: "Payments",
    description: "Review sample payment transactions.",
    type: "payments"
  }
};

let activeRecordType = "customers";

function showPage(page) {
  document.getElementById("dashboardPage").classList.toggle(
    "hidden", page !== "dashboard"
  );

  document.getElementById("recordsPage").classList.toggle(
    "hidden", !pageDetails[page]
  );

  document.getElementById("reconciliationPage").classList.toggle(
    "hidden", page !== "reconciliation"
  );

  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.toggle("active", link.dataset.page === page);
  });

  const details = pageDetails[page];

  if (details) {
    activeRecordType = details.type;
    document.getElementById("pageTitle").textContent = details.title;
    document.getElementById("recordsTitle").textContent = details.title;
    document.getElementById("recordsDescription").textContent = details.description;
    document.getElementById("recordSearch").value = "";
    renderRecords();
  } else if (page === "reconciliation") {
    document.getElementById("pageTitle").textContent = "Reconciliation";
  } else {
    document.getElementById("pageTitle").textContent = "Billing Dashboard";
  }

  if (pageDetails[page] || page === "dashboard" || page === "reconciliation") {
    history.replaceState(null, "", "#" + page);
  }
}

function renderRecords() {
  const search = document.getElementById("recordSearch").value.toLowerCase();

  const records = getRecords().filter(record => {
    const matchesType = record.type === activeRecordType;
    const searchableText = `${record.id} ${record.name} ${record.email} ${record.status}`.toLowerCase();
    return matchesType && searchableText.includes(search);
  });

  const header = document.getElementById("recordsHeader");
  const tbody = document.getElementById("recordsRows");

  header.innerHTML = "<th>ID</th><th>Name</th><th>Email</th><th>Amount</th><th>Status</th>";

  tbody.innerHTML = records.length
    ? records.map(record => `
      <tr>
        <td>${record.id}</td>
        <td>${escapeHTML(record.name)}</td>
        <td>${escapeHTML(record.email)}</td>
        <td>${money(record.amount)}</td>
        <td>${statusBadge(record.status)}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="5">No matching records.</td></tr>';
}

function downloadCSV(filename, rows) {
  const csvCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map(row => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function runReconciliation() {
  const records = getRecords();
  const invoices = records.filter(record => record.type === "invoices");
  const payments = records.filter(record => record.type === "payments");

  let matched = 0;
  const issues = [];

  invoices.forEach(invoice => {
    const payment = payments.find(item =>
      item.email.toLowerCase() === invoice.email.toLowerCase() &&
      Number(item.amount) === Number(invoice.amount) &&
      item.status.toLowerCase() === "paid"
    );

    if (invoice.status.toLowerCase() === "paid" && payment) {
      matched++;
    } else {
      issues.push({
        invoice: invoice.name,
        email: invoice.email,
        invoiceAmount: Number(invoice.amount),
        status: invoice.status,
        reason: invoice.status.toLowerCase() !== "paid"
          ? "Invoice not marked paid"
          : "No matching successful payment"
      });
    }
  });

  document.getElementById("matchedCount").textContent = matched;
  document.getElementById("mismatchCount").textContent = issues.length;

  const result = document.getElementById("reconciliationResults");

  result.innerHTML = issues.length
    ? `<strong>Review required: ${issues.length} invoice(s)</strong><br>` +
      issues.map(issue =>
        `${escapeHTML(issue.invoice)} — ${escapeHTML(issue.email)} — ` +
        `${money(issue.invoiceAmount)} — ${escapeHTML(issue.reason)}`
      ).join("<br>")
    : "All sample invoices have matching successful payments.";
}

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    showPage(link.dataset.page);
  });
});

document.querySelectorAll("[data-open-page]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.openPage);
  });
});

document.getElementById("recordSearch").addEventListener("input", renderRecords);

document.getElementById("downloadRecords").addEventListener("click", () => {
  const records = getRecords().filter(record => record.type === activeRecordType);
  const rows = [
    ["ID", "Type", "Name", "Email", "Amount", "Status"],
    ...records.map(record => [
      record.id, record.type, record.name, record.email, record.amount, record.status
    ])
  ];

  downloadCSV(`${activeRecordType}-report.csv`, rows);
});

document.getElementById("runReconciliation").addEventListener(
  "click", runReconciliation
);

document.getElementById("loginButton").addEventListener("click", () => {
  window.location.href = "auth.html";
});

renderDashboard();

const initialPage = window.location.hash.slice(1);
showPage(pageDetails[initialPage] || (
  initialPage === "reconciliation" ? "reconciliation" : "dashboard"
));
