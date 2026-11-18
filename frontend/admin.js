const CURRENT_USER_KEY = "subscribeiqCurrentUser";
const RECORD_KEY = "subscribeiqRecords";

const adminUser = JSON.parse(sessionStorage.getItem(CURRENT_USER_KEY) || "null");

if (!adminUser || adminUser.role !== "admin") {
  window.location.replace("auth.html");
}

const categories = {
  customers: "Customers",
  subscriptions: "Subscriptions",
  invoices: "Invoices",
  payments: "Payments"
};

let currentSection = "dashboard";
let reconciliationResults = [];

const API_BASE_URL = "http://localhost:8080/api";

let apiCustomers = [];
let apiSubscriptions = [];

const $ = id => document.getElementById(id);

// --------------------------------------------------
// FORM DISPLAY
// --------------------------------------------------

function updateFormFields() {
  const type = $("recordType").value;
  const isCustomer = type === "customers";
  const isSubscription = type === "subscriptions";

  $("customerExtraFields").classList.toggle("hidden", !isCustomer);
  $("subscriptionExtraFields").classList.toggle("hidden", !isSubscription);
  $("recordAmountGroup").classList.toggle("hidden", isCustomer || isSubscription);

  $("recordAmount").required = !isCustomer && !isSubscription;
  $("recordName").required = !isSubscription;
}

function setCustomerFormValues(customer) {
  $("customerPhone").value = customer.phone || "";
  $("customerCity").value = customer.city || "";
  $("customerState").value = customer.state || "";
  $("customerRegistrationDate").value = customer.registrationDate || "";
}

function customerPayloadFromForm() {
  return {
    fullName: $("recordName").value.trim(),
    email: $("recordEmail").value.trim(),
    phone: $("customerPhone").value.trim(),
    city: $("customerCity").value.trim(),
    state: $("customerState").value.trim(),
    registrationDate: $("customerRegistrationDate").value || null,
    customerStatus: $("recordStatus").value.toUpperCase()
  };
}

function setFormMessage(message, isError = false) {
  $("adminMessage").textContent = message;
  $("adminMessage").style.color = isError ? "#dc2626" : "";
}

// --------------------------------------------------
// CUSTOMER API
// --------------------------------------------------

async function loadCustomersFromBackend() {
  try {
    const response = await fetch(`${API_BASE_URL}/customers`);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    apiCustomers = await response.json();

    renderStats();
    renderRecentRecords();

    if (currentSection === "customers") {
      renderRecords();
    }

    console.log("Customers loaded from MySQL:", apiCustomers);

  } catch (error) {
    console.error("Customer API error:", error);
    setFormMessage(
      "Unable to load customers. Check whether Spring Boot is running.",
      true
    );
  }
}

// --------------------------------------------------
// SUBSCRIPTION API
// --------------------------------------------------

async function loadSubscriptionsFromBackend() {
  try {
    const response = await fetch(`${API_BASE_URL}/subscriptions`);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    apiSubscriptions = await response.json();

    renderStats();
    renderRecentRecords();

    if (currentSection === "subscriptions") {
      renderRecords();
    }

    console.log("Subscriptions loaded from MySQL:", apiSubscriptions);

  } catch (error) {
    console.error("Subscription API error:", error);
    setFormMessage(
      "Unable to load subscriptions. Check Spring Boot and the API endpoint.",
      true
    );
  }
}

function getSubscriptionRecords() {
  return apiSubscriptions.map(subscription => ({
    id: subscription.subscriptionId,
    type: "subscriptions",
    name: `Subscription #${subscription.subscriptionId}`,
    email: `Customer #${subscription.customerId} / Plan #${subscription.planId}`,
    amount: 0,
    status: subscription.subscriptionStatus,
    customerId: subscription.customerId,
    planId: subscription.planId,
    startDate: subscription.startDate || "",
    currentPeriodStart: subscription.currentPeriodStart || "",
    currentPeriodEnd: subscription.currentPeriodEnd || "",
    nextBillingDate: subscription.nextBillingDate || "",
    cancelledAt: subscription.cancelledAt || ""
  }));
}

function subscriptionPayloadFromForm() {
  return {
    customerId: Number($("subscriptionCustomerId").value),
    planId: Number($("subscriptionPlanId").value),
    startDate: $("subscriptionStartDate").value,
    currentPeriodStart: $("subscriptionPeriodStart").value || null,
    currentPeriodEnd: $("subscriptionPeriodEnd").value || null,
    nextBillingDate: $("subscriptionNextBillingDate").value || null,
    subscriptionStatus: $("recordStatus").value
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_"),
    cancelledAt: null
  };
}

function setSubscriptionFormValues(subscription) {
  $("subscriptionCustomerId").value = subscription.customerId ?? "";
  $("subscriptionPlanId").value = subscription.planId ?? "";
  $("subscriptionStartDate").value = subscription.startDate || "";
  $("subscriptionPeriodStart").value = subscription.currentPeriodStart || "";
  $("subscriptionPeriodEnd").value = subscription.currentPeriodEnd || "";
  $("subscriptionNextBillingDate").value = subscription.nextBillingDate || "";
}

function displaySubscriptionStatus(status) {
  const normalized = String(status || "ACTIVE").toUpperCase();

  const labels = {
    ACTIVE: "Active",
    PAUSED: "Paused",
    CANCELLED: "Cancelled",
    PAST_DUE: "Past Due"
  };

  return labels[normalized] || normalized;
}

// --------------------------------------------------
// LOCAL STORAGE FOR INVOICES AND PAYMENTS
// --------------------------------------------------

function getRecords() {
  try {
    const data = JSON.parse(localStorage.getItem(RECORD_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(RECORD_KEY, JSON.stringify(records));
}

function seedRecords() {
  if (localStorage.getItem(RECORD_KEY) !== null) return;

  saveRecords([
    { id: 1, type: "customers", name: "Ananya Rao", email: "ananya@example.com", amount: 0, status: "Active" },
    { id: 2, type: "subscriptions", name: "Premium Plan", email: "ananya@example.com", amount: 999, status: "Active" },
    { id: 3, type: "invoices", name: "INV-1001", email: "ananya@example.com", amount: 999, status: "Paid" },
    { id: 4, type: "payments", name: "PAY-1001", email: "ananya@example.com", amount: 999, status: "Paid" },
    { id: 5, type: "invoices", name: "INV-1002", email: "demo@example.com", amount: 1499, status: "Unpaid" },
    { id: 6, type: "payments", name: "PAY-1002", email: "demo@example.com", amount: 1200, status: "Pending" }
  ]);
}

// --------------------------------------------------
// COMMON UTILITIES
// --------------------------------------------------

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatMoney(value) {
  return "₹" + Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function statusBadge(status) {
  const className = String(status || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");

  return `<span class="status-badge ${className}">${escapeHTML(status)}</span>`;
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadCSV(filename, rows) {
  const cell = value => {
    let text = String(value ?? "");

    if (/^[=+\-@]/.test(text)) text = "'" + text;

    return '"' + text.replace(/"/g, '""') + '"';
  };

  const csv = "\uFEFF" + rows
    .map(row => row.map(cell).join(","))
    .join("\r\n");

  downloadFile(filename, csv, "text/csv;charset=utf-8;");
}

function downloadInvoice(record) {
  const invoiceText = [
    "SUBSCRIBEIQ",
    "SUBSCRIPTION BILLING INVOICE",
    "--------------------------------",
    `Invoice ID: ${record.name}`,
    `Record ID: ${record.id}`,
    `Customer: ${record.email || "Not specified"}`,
    `Description: ${record.name}`,
    `Amount: ${formatMoney(record.amount)}`,
    `Status: ${record.status}`,
    "",
    "Demo invoice generated by the SubscribeIQ frontend."
  ].join("\r\n");

  downloadFile(
    `${String(record.name || "invoice").replace(/[^a-z0-9_-]/gi, "_")}.txt`,
    invoiceText,
    "text/plain;charset=utf-8;"
  );
}

// --------------------------------------------------
// GET VISIBLE RECORDS
// --------------------------------------------------

function getVisibleRecords() {
  let records;

  if (currentSection === "customers") {
    records = apiCustomers.map(customer => ({
      id: customer.customerId,
      type: "customers",
      name: customer.fullName,
      email: customer.email,
      amount: 0,
      status: customer.customerStatus,
      phone: customer.phone || "",
      city: customer.city || "",
      state: customer.state || "",
      registrationDate: customer.registrationDate || ""
    }));

  } else if (currentSection === "subscriptions") {
    records = getSubscriptionRecords();

  } else {
    records = getRecords();
  }

  const query = $("searchRecords").value.trim().toLowerCase();
  const statusFilter = $("filterStatus").value;

  return records.filter(record => {
    const inSection =
      currentSection === "dashboard" ||
      currentSection === "reconciliation" ||
      record.type === currentSection;

    const matchesStatus =
      statusFilter === "all" ||
      String(record.status).toLowerCase().replace(/_/g, " ") ===
        statusFilter.toLowerCase();

    const searchable = [
      record.id,
      record.type,
      record.name,
      record.email,
      record.amount,
      record.status,
      record.customerId,
      record.planId
    ].join(" ").toLowerCase();

    return inSection && matchesStatus && searchable.includes(query);
  });
}

// --------------------------------------------------
// DASHBOARD STATISTICS
// --------------------------------------------------

function renderStats() {
  const records = getRecords();

  $("customerCount").textContent = apiCustomers.length;
  $("subscriptionCount").textContent = apiSubscriptions.length;

  $("invoiceCount").textContent =
    records.filter(r => r.type === "invoices").length;

  $("paymentCount").textContent =
    records.filter(r => r.type === "payments").length;
}

function renderRecentRecords() {
  const otherRecords = getRecords().filter(
    record =>
      record.type !== "customers" &&
      record.type !== "subscriptions"
  );

  const customerRecords = apiCustomers.map(customer => ({
    id: customer.customerId,
    type: "customers",
    name: customer.fullName,
    email: customer.email,
    amount: 0,
    status: customer.customerStatus
  }));

  const subscriptionRecords = getSubscriptionRecords();

  const records = [
    ...otherRecords,
    ...customerRecords,
    ...subscriptionRecords
  ].slice().reverse().slice(0, 6);

  const tbody = $("recentRows");

  if (!records.length) {
    tbody.innerHTML =
      '<tr><td colspan="5">No records yet. Add a record to get started.</td></tr>';
    return;
  }

  tbody.innerHTML = records.map(record => `
    <tr>
      <td>${escapeHTML(record.id)}</td>
      <td>${escapeHTML(categories[record.type] || record.type)}</td>
      <td>${escapeHTML(record.name)}</td>
      <td>${formatMoney(record.amount)}</td>
      <td>${statusBadge(displaySubscriptionStatus(record.status))}</td>
    </tr>
  `).join("");
}

// --------------------------------------------------
// RECORD TABLE
// --------------------------------------------------

function renderRecords() {
  const records = getVisibleRecords();
  const tbody = $("recordRows");

  if (!records.length) {
    tbody.innerHTML =
      '<tr><td colspan="7">No matching records found.</td></tr>';

  } else {
    tbody.innerHTML = records.map(record => `
      <tr>
        <td>${escapeHTML(record.id)}</td>
        <td>${escapeHTML(categories[record.type] || record.type)}</td>
        <td>${escapeHTML(record.name)}</td>
        <td>${escapeHTML(record.email || "—")}</td>
        <td>${formatMoney(record.amount)}</td>
        <td>${statusBadge(displaySubscriptionStatus(record.status))}</td>
        <td>
          <div class="action-group">
            ${record.type === "customers"
              ? `
                <button type="button" class="btn btn-light btn-small"
                  data-edit-customer="${record.id}">Edit</button>
                <button type="button" class="btn btn-danger btn-small"
                  data-delete-customer="${record.id}">Delete</button>
              `
              : record.type === "subscriptions"
              ? `
                <button type="button" class="btn btn-light btn-small"
                  data-edit-subscription="${record.id}">Edit</button>
                <button type="button" class="btn btn-danger btn-small"
                  data-cancel-subscription="${record.id}">Cancel</button>
              `
              : `
                <button type="button" class="btn btn-light btn-small"
                  data-edit="${record.id}">Edit</button>
                <button type="button" class="btn btn-danger btn-small"
                  data-delete="${record.id}">Delete</button>
                ${record.type === "invoices"
                  ? `<button type="button" class="btn btn-primary btn-small"
                      data-invoice="${record.id}">Download</button>`
                  : ""}
              `}
          </div>
        </td>
      </tr>
    `).join("");
  }

  let totalRecords;

  if (currentSection === "customers") {
    totalRecords = apiCustomers.length;
  } else if (currentSection === "subscriptions") {
    totalRecords = apiSubscriptions.length;
  } else {
    totalRecords = getRecords().filter(
      record => record.type === currentSection
    ).length;
  }

  $("recordCountText").textContent =
    `Showing ${records.length} of ${totalRecords} total records.`;
}

function renderDashboard() {
  renderStats();
  renderRecentRecords();
}

function renderAll() {
  renderDashboard();

  if (
    currentSection !== "dashboard" &&
    currentSection !== "reconciliation"
  ) {
    renderRecords();
  }
}

// --------------------------------------------------
// SECTION NAVIGATION
// --------------------------------------------------

function showSection(section) {
  const allowed = [
    "dashboard",
    "customers",
    "subscriptions",
    "invoices",
    "payments",
    "reconciliation"
  ];

  if (!allowed.includes(section)) section = "dashboard";

  currentSection = section;

  $("dashboardSection").classList.toggle(
    "hidden",
    section !== "dashboard"
  );

  $("recordsSection").classList.toggle(
    "hidden",
    !["customers", "subscriptions", "invoices", "payments"].includes(section)
  );

  $("reconciliationSection").classList.toggle(
    "hidden",
    section !== "reconciliation"
  );

  document.querySelectorAll(".nav-link").forEach(link => {
    const active = link.dataset.section === section;

    link.classList.toggle("active", active);

    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  const titles = {
    dashboard: "Billing Dashboard",
    customers: "Customers",
    subscriptions: "Subscriptions",
    invoices: "Invoices",
    payments: "Payments",
    reconciliation: "Smart Reconciliation"
  };

  $("pageTitle").textContent = titles[section];

  if (categories[section]) {
    $("recordsTitle").textContent = categories[section];

    $("recordsDescription").textContent =
      `Manage, search, edit, delete and export ${section} records.`;

    $("searchRecords").value = "";
    $("filterStatus").value = "all";
    $("recordType").value = section;
    $("recordForm").classList.add("hidden");
    $("adminMessage").textContent = "";

    updateFormFields();
    renderRecords();

    if (section === "customers") {
      loadCustomersFromBackend();
    }

    if (section === "subscriptions") {
      loadSubscriptionsFromBackend();
    }
  }

  history.replaceState(null, "", `#${section}`);
}

// --------------------------------------------------
// ADD RECORD FORM
// --------------------------------------------------

$("showAddForm").addEventListener("click", () => {
  $("recordForm").reset();
  $("recordForm").classList.remove("hidden");

  $("formHeading").textContent = "Add a record";
  $("saveRecordBtn").textContent = "Save Record";
  $("editRecordId").value = "";
  $("recordAmount").value = "0";

  if (categories[currentSection]) {
    $("recordType").value = currentSection;
  }

  updateFormFields();
  $("recordName").focus();
  setFormMessage("");
});

function resetRecordForm() {
  $("recordForm").reset();
  $("editRecordId").value = "";
  $("recordAmount").value = "0";
  $("formHeading").textContent = "Add a record";
  $("saveRecordBtn").textContent = "Save Record";
  $("recordForm").classList.add("hidden");

  updateFormFields();
}

$("cancelForm").addEventListener("click", resetRecordForm);

$("recordType").addEventListener("change", updateFormFields);

// --------------------------------------------------
// SAVE CUSTOMER / SUBSCRIPTION / DEMO RECORD
// --------------------------------------------------

$("recordForm").addEventListener("submit", async event => {
  event.preventDefault();

  const editId = $("editRecordId").value;
  const recordType = $("recordType").value;
  const name = $("recordName").value.trim();
  const email = $("recordEmail").value.trim();

  if (!name && recordType !== "subscriptions") {
    setFormMessage("Please enter a name or description.", true);
    return;
  }

  // CUSTOMER CREATE / UPDATE
  if (recordType === "customers") {
    if (!email) {
      setFormMessage("Please enter the customer's email address.", true);
      return;
    }

    const payload = customerPayloadFromForm();
    const isEdit = Boolean(editId);

    const url = isEdit
      ? `${API_BASE_URL}/customers/${encodeURIComponent(editId)}`
      : `${API_BASE_URL}/customers`;

    $("saveRecordBtn").disabled = true;
    $("saveRecordBtn").textContent = isEdit ? "Updating..." : "Saving...";

    try {
      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      await loadCustomersFromBackend();
      resetRecordForm();

      setFormMessage(
        isEdit
          ? "Customer updated successfully in MySQL."
          : "Customer added successfully to MySQL."
      );

    } catch (error) {
      console.error("Customer save error:", error);
      setFormMessage(`Unable to save customer: ${error.message}`, true);

    } finally {
      $("saveRecordBtn").disabled = false;
      $("saveRecordBtn").textContent =
        editId ? "Save Changes" : "Save Record";
    }

    return;
  }

  // SUBSCRIPTION CREATE / UPDATE
  if (recordType === "subscriptions") {
    const payload = subscriptionPayloadFromForm();

    if (
      !payload.customerId ||
      !payload.planId ||
      !payload.startDate
    ) {
      setFormMessage(
        "Please enter Customer ID, Plan ID and Start Date.",
        true
      );
      return;
    }

    const isEdit = Boolean(editId);

    const url = isEdit
      ? `${API_BASE_URL}/subscriptions/${encodeURIComponent(editId)}`
      : `${API_BASE_URL}/subscriptions`;

    $("saveRecordBtn").disabled = true;
    $("saveRecordBtn").textContent = isEdit ? "Updating..." : "Saving...";

    try {
      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      await loadSubscriptionsFromBackend();
      resetRecordForm();

      setFormMessage(
        isEdit
          ? "Subscription updated successfully in MySQL."
          : "Subscription added successfully to MySQL."
      );

    } catch (error) {
      console.error("Subscription save error:", error);
      setFormMessage(
        `Unable to save subscription: ${error.message}`,
        true
      );

    } finally {
      $("saveRecordBtn").disabled = false;
      $("saveRecordBtn").textContent =
        editId ? "Save Changes" : "Save Record";
    }

    return;
  }

  // INVOICES AND PAYMENTS: EXISTING LOCAL STORAGE BEHAVIOUR
  const records = getRecords();
  const amount = Number($("recordAmount").value);

  if (!Number.isFinite(amount) || amount < 0) {
    setFormMessage("Please enter a valid non-negative amount.", true);
    return;
  }

  const newData = {
    type: recordType,
    name,
    email,
    amount,
    status: $("recordStatus").value
  };

  if (editId) {
    const index = records.findIndex(r => String(r.id) === editId);

    if (index === -1) {
      setFormMessage(
        "Record not found. Please refresh and try again.",
        true
      );
      return;
    }

    records[index] = { ...records[index], ...newData };
    saveRecords(records);
    setFormMessage("Record updated successfully.");

  } else {
    const nextId = records.reduce((max, record) => {
      const numericId = Number(record.id);
      return Number.isFinite(numericId)
        ? Math.max(max, numericId)
        : max;
    }, 0) + 1;

    records.push({ id: nextId, ...newData });
    saveRecords(records);
    setFormMessage("Record added successfully.");
  }

  const message = $("adminMessage").textContent;

  renderAll();
  resetRecordForm();
  setFormMessage(message);
});

// --------------------------------------------------
// EDIT / DELETE CUSTOMER
// EDIT / CANCEL SUBSCRIPTION
// EDIT / DELETE INVOICE OR PAYMENT
// --------------------------------------------------

$("recordRows").addEventListener("click", async event => {
  const button = event.target.closest("button");
  if (!button) return;

  // EDIT CUSTOMER
  if (button.dataset.editCustomer !== undefined) {
    const customer = apiCustomers.find(
      item => String(item.customerId) === button.dataset.editCustomer
    );

    if (!customer) {
      setFormMessage(
        "Customer not found. Refresh the list and try again.",
        true
      );
      return;
    }

    $("recordForm").classList.remove("hidden");
    $("formHeading").textContent =
      `Edit customer #${customer.customerId}`;

    $("saveRecordBtn").textContent = "Save Changes";
    $("editRecordId").value = customer.customerId;
    $("recordType").value = "customers";
    $("recordName").value = customer.fullName || "";
    $("recordEmail").value = customer.email || "";

    $("recordStatus").value =
      String(customer.customerStatus || "ACTIVE").toUpperCase() === "INACTIVE"
        ? "Inactive"
        : "Active";

    $("recordAmount").value = "0";

    setCustomerFormValues(customer);
    updateFormFields();
    setFormMessage("");

    $("recordForm").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    $("recordName").focus();
    return;
  }

  // DELETE / SOFT-DELETE CUSTOMER
  if (button.dataset.deleteCustomer !== undefined) {
    const customer = apiCustomers.find(
      item => String(item.customerId) === button.dataset.deleteCustomer
    );

    if (!customer) return;

    if (!confirm(
      `Mark "${customer.fullName}" as INACTIVE? Billing history will be preserved.`
    )) {
      return;
    }

    button.disabled = true;

    try {
      const response = await fetch(
        `${API_BASE_URL}/customers/${encodeURIComponent(customer.customerId)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      await loadCustomersFromBackend();

      setFormMessage(
        `Customer ${customer.fullName} marked as INACTIVE.`
      );

    } catch (error) {
      console.error("Customer delete error:", error);
      setFormMessage(
        `Unable to update customer status: ${error.message}`,
        true
      );

    } finally {
      button.disabled = false;
    }

    return;
  }

  // EDIT SUBSCRIPTION
  if (button.dataset.editSubscription !== undefined) {
    const subscription = apiSubscriptions.find(
      item => String(item.subscriptionId) === button.dataset.editSubscription
    );

    if (!subscription) {
      setFormMessage(
        "Subscription not found. Refresh and try again.",
        true
      );
      return;
    }

    $("recordForm").classList.remove("hidden");

    $("formHeading").textContent =
      `Edit subscription #${subscription.subscriptionId}`;

    $("saveRecordBtn").textContent = "Save Changes";
    $("editRecordId").value = subscription.subscriptionId;
    $("recordType").value = "subscriptions";
    $("recordName").value = "";
    $("recordEmail").value = "";
    $("recordAmount").value = "0";

    $("recordStatus").value = displaySubscriptionStatus(
      subscription.subscriptionStatus
    );

    setSubscriptionFormValues(subscription);
    updateFormFields();
    setFormMessage("");

    $("recordForm").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    return;
  }

  // CANCEL SUBSCRIPTION
  if (button.dataset.cancelSubscription !== undefined) {
    const subscription = apiSubscriptions.find(
      item => String(item.subscriptionId) === button.dataset.cancelSubscription
    );

    if (!subscription) return;

    if (!confirm(
      `Cancel subscription #${subscription.subscriptionId}?`
    )) {
      return;
    }

    button.disabled = true;

    try {
      const response = await fetch(
        `${API_BASE_URL}/subscriptions/${encodeURIComponent(subscription.subscriptionId)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      await loadSubscriptionsFromBackend();

      setFormMessage(
        `Subscription #${subscription.subscriptionId} cancelled successfully.`
      );

    } catch (error) {
      console.error("Subscription cancellation error:", error);
      setFormMessage(
        `Unable to cancel subscription: ${error.message}`,
        true
      );

    } finally {
      button.disabled = false;
    }

    return;
  }

  // EXISTING LOCAL STORAGE RECORDS
  const records = getRecords();

  if (button.dataset.edit !== undefined) {
    const record = records.find(
      r => String(r.id) === button.dataset.edit
    );

    if (!record) return;

    $("recordForm").classList.remove("hidden");
    $("formHeading").textContent = `Edit record #${record.id}`;
    $("saveRecordBtn").textContent = "Save Changes";
    $("editRecordId").value = record.id;
    $("recordType").value = record.type;
    $("recordName").value = record.name;
    $("recordEmail").value = record.email || "";
    $("recordAmount").value = Number(record.amount || 0);
    $("recordStatus").value = record.status;

    updateFormFields();
    setFormMessage("");

    $("recordForm").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    $("recordName").focus();
    return;
  }

  if (button.dataset.delete !== undefined) {
    const record = records.find(
      r => String(r.id) === button.dataset.delete
    );

    if (!record) return;

    if (!confirm(
      `Delete "${record.name}"? This action cannot be undone.`
    )) {
      return;
    }

    saveRecords(
      records.filter(r => String(r.id) !== button.dataset.delete)
    );

    setFormMessage("Record deleted.");
    renderAll();
    return;
  }

  if (button.dataset.invoice !== undefined) {
    const invoice = records.find(
      r => String(r.id) === button.dataset.invoice
    );

    if (invoice) downloadInvoice(invoice);
  }
});

// --------------------------------------------------
// EXPORT CURRENT SECTION
// --------------------------------------------------

$("exportBtn").addEventListener("click", () => {
  const records = getVisibleRecords();

  if (!records.length) {
    alert("There are no matching records to export.");
    return;
  }

  downloadCSV(`subscribeiq-${currentSection}.csv`, [
    ["ID", "Type", "Name", "Email", "Amount", "Status"],
    ...records.map(r => [
      r.id,
      r.type,
      r.name,
      r.email,
      r.amount,
      r.status
    ])
  ]);
});

$("searchRecords").addEventListener("input", renderRecords);
$("filterStatus").addEventListener("change", renderRecords);

// --------------------------------------------------
// SMART RECONCILIATION
// --------------------------------------------------

function runReconciliation() {
  const records = getRecords();

  const invoices = records.filter(
    r => r.type === "invoices"
  );

  const payments = records.filter(
    r =>
      r.type === "payments" &&
      String(r.status).toLowerCase() === "paid"
  );

  const usedPaymentIds = new Set();

  reconciliationResults = invoices.map(invoice => {
    const invoiceIsPaid =
      String(invoice.status).toLowerCase() === "paid";

    const matchingPayment = payments.find(payment => {
      const sameEmail =
        String(payment.email || "").trim().toLowerCase() ===
        String(invoice.email || "").trim().toLowerCase();

      const sameAmount =
        Number(payment.amount) === Number(invoice.amount);

      const unused =
        !usedPaymentIds.has(String(payment.id));

      return invoiceIsPaid && sameEmail && sameAmount && unused;
    });

    if (matchingPayment) {
      usedPaymentIds.add(String(matchingPayment.id));
    }

    return {
      invoice,
      payment: matchingPayment || null,
      result: matchingPayment ? "Matched" : "Needs review"
    };
  });

  const matched = reconciliationResults.filter(
    r => r.result === "Matched"
  ).length;

  const unmatched = reconciliationResults.length - matched;

  $("matchedCount").textContent = matched;
  $("unmatchedCount").textContent = unmatched;

  $("reconcileResult").textContent =
    `Reconciliation complete: ${matched} invoice(s) matched and ${unmatched} invoice(s) need review.`;

  if (!reconciliationResults.length) {
    $("reconcileRows").innerHTML =
      '<tr><td colspan="5">No invoices available to reconcile.</td></tr>';
    return;
  }

  $("reconcileRows").innerHTML = reconciliationResults.map(item => `
    <tr>
      <td>${escapeHTML(item.invoice.name)}</td>
      <td>${escapeHTML(item.invoice.email || "—")}</td>
      <td>${formatMoney(item.invoice.amount)}</td>
      <td>${item.payment
        ? `${escapeHTML(item.payment.name)} (${formatMoney(item.payment.amount)})`
        : "No matching paid payment"}</td>
      <td>${statusBadge(item.result)}</td>
    </tr>
  `).join("");
}

$("reconcileBtn").addEventListener("click", runReconciliation);

// EXPORT RECONCILIATION
$("exportReconBtn").addEventListener("click", () => {
  if (!reconciliationResults.length) {
    alert("Run reconciliation first, then export the results.");
    return;
  }

  downloadCSV("subscribeiq-reconciliation.csv", [
    [
      "Invoice",
      "Customer Email",
      "Invoice Amount",
      "Matching Payment",
      "Payment Amount",
      "Result"
    ],
    ...reconciliationResults.map(item => [
      item.invoice.name,
      item.invoice.email,
      item.invoice.amount,
      item.payment ? item.payment.name : "",
      item.payment ? item.payment.amount : "",
      item.result
    ])
  ]);
});

// --------------------------------------------------
// SIDEBAR NAVIGATION
// --------------------------------------------------

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    showSection(link.dataset.section);
  });
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    showSection(button.dataset.go);
  });
});

// --------------------------------------------------
// LOGOUT
// --------------------------------------------------

$("logoutBtn").addEventListener("click", () => {
  if (!confirm("Are you sure you want to log out?")) return;

  sessionStorage.removeItem(CURRENT_USER_KEY);
  sessionStorage.removeItem("subscribeiqDemoRole");
  sessionStorage.removeItem("subscribeiqUserEmail");
  sessionStorage.removeItem("subscribeiqUserName");

  window.location.replace("auth.html");
});

// --------------------------------------------------
// INITIALIZE DASHBOARD
// --------------------------------------------------

seedRecords();
updateFormFields();

if (adminUser) {
  $("welcomeText").textContent =
    `Welcome to SubscribeIQ, ${adminUser.name || "Admin"}`;
}

renderDashboard();
loadSubscriptionsFromBackend();

const requestedSection = window.location.hash.replace("#", "");
showSection(requestedSection || "dashboard");