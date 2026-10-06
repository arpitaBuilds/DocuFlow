let API_BASE_URL = "http://127.0.0.1:8000";

async function getApiBaseUrl() {
  const ports = ["8000", "8001"];
  for (const port of ports) {
    const candidate = `http://127.0.0.1:${port}`;
    try {
      const res = await fetch(`${candidate}/api/health`, { signal: AbortSignal.timeout(800) });
      if (res.ok) {
        API_BASE_URL = candidate;
        return API_BASE_URL;
      }
    } catch (e) {}
  }
  return API_BASE_URL;
}

// Toast Notification System
function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  const bgColors = {
    success: "bg-emerald-600 text-white",
    error: "bg-rose-600 text-white",
    warning: "bg-amber-500 text-white",
    info: "bg-slate-800 text-white"
  };
  const icons = {
    success: "check_circle",
    error: "error",
    warning: "warning",
    info: "info"
  };

  toast.className = `pointer-events-auto px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium transition-all transform translate-y-2 opacity-0 ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `
    <span class="material-symbols-outlined text-base shrink-0">${icons[type] || "info"}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-2", "opacity-0");
  });

  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-2");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// API Functions
async function apiHealth() {
  const baseUrl = await getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/health`);
  return res.json();
}

async function uploadDocument(file) {
  const baseUrl = await getApiBaseUrl();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${baseUrl}/api/documents/upload`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    let msg = errorText;
    try {
      const parsed = JSON.parse(errorText);
      msg = parsed.detail || errorText;
    } catch(e) {}
    throw new Error(msg);
  }

  return response.json();
}

async function getDocuments() {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/documents`);
  if (!response.ok) throw new Error("Failed to load documents");
  return response.json();
}

async function getDocument(id) {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/documents/${id}`);
  if (!response.ok) throw new Error("Document not found");
  return response.json();
}

async function getReviewQueue() {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/review`);
  if (!response.ok) throw new Error("Failed to load review queue");
  return response.json();
}

async function reviewField(documentId, fieldId, newValue, verified = true) {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/review/${documentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      field_id: fieldId,
      new_value: newValue,
      verified: verified
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText);
  }
  return response.json();
}

async function retryDocument(documentId) {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/documents/${documentId}/retry`, {
    method: "POST"
  });

  if (!response.ok) throw new Error("Failed to retry document processing");
  return response.json();
}

async function getDashboardStats() {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/dashboard/stats`);
  if (!response.ok) throw new Error("Failed to load dashboard stats");
  return response.json();
}

function getExportCsvUrl() {
  return `${API_BASE_URL}/api/export/csv`;
}

function getExportJsonUrl() {
  return `${API_BASE_URL}/api/export/json`;
}
