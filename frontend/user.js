
"use strict";

// ========================================
// 1. SAMPLE BILLING RECORDS FOR FRONTEND
// ========================================

const demoBillingRecords = [
  {
    id: "SUB-1001",
    type: "Subscription",
    description: "Premium Plan",
    amount: 999,
    status: "Active"
  },
  {
    id: "INV-1001",
    type: "Invoice",
    description: "October Subscription Invoice",
    amount: 999,
    status: "Paid"
  },
  {
    id: "PAY-1001",
    type: "Payment",
    description: "Payment for INV-1001",
    amount: 999,
    status: "Paid"
  },
  {
    id: "INV-1002",
    type: "Invoice",
    description: "Additional Services Invoice",
    amount: 499,
    status: "Pending"
  },
  {
    id: "PAY-1002",
    type: "Payment",
    description: "Additional Services Payment",
    amount: 499,
    status: "Pending"
  }
];

let currentSection = "overview";

// ========================================
// 2. HELPER FUNCTIONS
// ========================================

function getElement(id) {
  return document.getElementById(id);
}

function getUserName() {
  return (
    sessionStorage.getItem("subscribeiqUserName") ||
    localStorage.getItem("subscribeiqUserName") ||
    "User"
  );
}

function getUserRecords() {
  // Demo records only. Connect an authenticated backend later.
  return demoBillingRecords;
}

function formatMoney(amount) {
  return "₹" + Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function downloadCSV(filename, rows) {
  const escapeCell = value =>
    '"' + String(value ?? "").replace(/"/g, '""') + '"';

  const csvContent = "\uFEFF" + rows
    .map(row => row.map(escapeCell).join(","))
    .join("\r\n");

  const blob = new Blob([csvContent], {
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

function downloadRecord(record) {
  downloadCSV(record.id + ".csv", [
    ["Record ID", "Type", "Description", "Amount", "Status"],
    [
      record.id,
      record.type,
      record.description,
      record.amount,
      record.status
    ]
  ]);
}

function getStatusBadge(status) {
  const className = String(status)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");

  return (
    '<span class="status-badge ' + className + '">' +
    escapeHTML(status) +
    "</span>"
  );
}

// ========================================
// 3. RENDER TABLES
// ========================================

function renderTable(targetId, records) {
  const tbody = getElement(targetId);

  if (!tbody) {
    console.warn("Table body not found:", targetId);
    return;
  }

  if (records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">No billing records found.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = records.map(record => `
    <tr>
      <td>${escapeHTML(record.type)}</td>
      <td>${escapeHTML(record.description)}</td>
      <td>${formatMoney(record.amount)}</td>
      <td>${getStatusBadge(record.status)}</td>
      <td>
        <button
          type="button"
          class="text-button download-record"
          data-record-id="${escapeHTML(record.id)}">
          Download
        </button>
      </td>
    </tr>
  `).join("");
}

// ========================================
// 4. DASHBOARD SUMMARY
// ========================================

function setText(id, value) {
  const element = getElement(id);

  if (element) {
    element.textContent = value;
  }
}

function renderDashboard() {
  const records = getUserRecords();

  const subscriptions = records.filter(
    record => record.type === "Subscription"
  );

  const invoices = records.filter(
    record => record.type === "Invoice"
  );

  const payments = records.filter(
    record => record.type === "Payment"
  );

  const paidAmount = payments
    .filter(record => record.status.toLowerCase() === "paid")
    .reduce((total, record) => total + Number(record.amount || 0), 0);

  setText("welcomeName", getUserName());
  setText("subscriptionsCount", subscriptions.length);
  setText("invoicesCount", invoices.length);
  setText("paymentsCount", payments.length);
  setText("paidAmount", formatMoney(paidAmount));

  renderTable("billingRecords", records);
}

// ========================================
// 5. SIDEBAR NAVIGATION
// ========================================

function showSection(section) {
  const validSections = [
    "overview",
    "subscriptions",
    "invoices",
    "payments",
    "reports"
  ];

  if (!validSections.includes(section)) {
    section = "overview";
  }

  currentSection = section;

  const overview = getElement("overviewSection");
  const records = getElement("recordsSection");

  if (overview) {
    overview.classList.toggle("hidden", section !== "overview");
  }

  if (records) {
    records.classList.toggle("hidden", section === "overview");
  }

  document.querySelectorAll(".nav-link").forEach(link => {
    const active = link.dataset.section === section;

    link.classList.toggle("active", active);

    if (active) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  const titles = {
    overview: "My Billing Dashboard",
    subscriptions: "My Subscriptions",
    invoices: "My Invoices",
    payments: "My Payments",
    reports: "My Reports"
  };

  setText("pageTitle", titles[section]);

  if (section !== "overview") {
    setText("recordsTitle", titles[section]);

    setText(
      "recordsDescription",
      section === "reports"
        ? "Search and download your available billing records."
        : "View and download your " + section + " records."
    );

    const search = getElement("recordSearch");

    if (search) {
      search.value = "";
    }

    renderSectionRecords();
  }

  // Keep the URL hash synchronized with the selected section.
  if (window.location.hash !== "#" + section) {
    history.replaceState(null, "", "#" + section);
  }
}

function getSectionRecords() {
  const records = getUserRecords();

  if (currentSection === "subscriptions") {
    return records.filter(record => record.type === "Subscription");
  }

  if (currentSection === "invoices") {
    return records.filter(record => record.type === "Invoice");
  }

  if (currentSection === "payments") {
    return records.filter(record => record.type === "Payment");
  }

  // Reports shows all record types.
  return records;
}

// ========================================
// 6. SEARCH AND FILTER
// ========================================

function renderSectionRecords() {
  const searchInput = getElement("recordSearch");
  const query = searchInput
    ? searchInput.value.trim().toLowerCase()
    : "";

  const filteredRecords = getSectionRecords().filter(record => {
    const searchableText = [
      record.id,
      record.type,
      record.description,
      record.amount,
      record.status
    ].join(" ").toLowerCase();

    return searchableText.includes(query);
  });

  renderTable("recordsTableBody", filteredRecords);
}

// ========================================
// 7. REPORT DOWNLOADS
// ========================================

function downloadRecords(filename, records) {
  if (records.length === 0) {
    alert("There are no records available to download.");
    return;
  }

  downloadCSV(filename, [
    ["Record ID", "Type", "Description", "Amount", "Status"],
    ...records.map(record => [
      record.id,
      record.type,
      record.description,
      record.amount,
      record.status
    ])
  ]);
}

function downloadCurrentSection() {
  downloadRecords(
    "my-" + currentSection + ".csv",
    getSectionRecords()
  );
}

// ========================================
// 8. CONNECT ALL BUTTONS
// ========================================

function initializeButtons() {
  // Sidebar links
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      showSection(link.dataset.section);
    });
  });

  // Dashboard shortcut buttons
  document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
      showSection(button.dataset.go);
    });
  });

  // Search field
  const searchInput = getElement("recordSearch");

  if (searchInput) {
    searchInput.addEventListener("input", renderSectionRecords);
  }

  // Download the complete report
  const downloadReportButton = getElement("downloadReport");

  if (downloadReportButton) {
    downloadReportButton.addEventListener("click", () => {
      downloadRecords(
        "my-billing-report.csv",
        getUserRecords()
      );
    });
  }

  // Download the currently selected section
  const downloadSectionButton = getElement("downloadSection");

  if (downloadSectionButton) {
    downloadSectionButton.addEventListener(
      "click",
      downloadCurrentSection
    );
  }

  // Download individual records in either table
  document.addEventListener("click", event => {
    const button = event.target.closest(".download-record");

    if (!button) return;

    const record = getUserRecords().find(
      item => item.id === button.dataset.recordId
    );

    if (record) {
      downloadRecord(record);
    }
  });

  // Logout
  const logoutButton = getElement("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      const confirmed = confirm("Are you sure you want to log out?");

      if (!confirmed) return;

      sessionStorage.removeItem("subscribeiqDemoRole");
      sessionStorage.removeItem("subscribeiqUserEmail");
      sessionStorage.removeItem("subscribeiqUserName");

      window.location.href = "auth.html";
    });
  }
}

// ========================================
// 9. INITIALIZE THE USER PORTAL
// ========================================

function initializeUserPortal() {
  renderDashboard();
  initializeButtons();

  const initialSection = window.location.hash
    .replace("#", "")
    .trim();

  showSection(initialSection || "overview");
}

// Run after the HTML has loaded.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeUserPortal);
} else {
  initializeUserPortal();
}
