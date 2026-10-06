document.addEventListener("DOMContentLoaded", async () => {
  const statsElements = {
    total: document.querySelector("[data-stat='total']"),
    processing: document.querySelector("[data-stat='processing']"),
    needs_review: document.querySelector("[data-stat='needs_review']"),
    completed: document.querySelector("[data-stat='completed']"),
    failed: document.querySelector("[data-stat='failed']")
  };

  const documentsTableBody = document.querySelector("#documentsTable tbody");
  const filterButtons = document.querySelectorAll(".filter-btn");
  const searchInput = document.querySelector("#tableSearch");

  let allDocuments = [];
  let currentFilter = "all";
  let searchQuery = "";

  const urlParams = new URLSearchParams(window.location.search);
  const initialView = urlParams.get("view");
  if (initialView && ["all", "processing", "needs_review", "review", "completed", "failed"].includes(initialView)) {
    currentFilter = initialView === "review" ? "needs_review" : initialView;
    
    // Highlight corresponding filter button if present
    filterButtons.forEach(btn => {
      const st = btn.getAttribute("data-status");
      if (st === currentFilter || (currentFilter === "needs_review" && st === "review")) {
        btn.classList.add("bg-surface-container-lowest", "text-primary", "shadow-sm", "font-semibold");
        btn.classList.remove("text-on-surface-variant");
      } else {
        btn.classList.remove("bg-surface-container-lowest", "text-primary", "shadow-sm", "font-semibold");
        btn.classList.add("text-on-surface-variant");
      }
    });
  }

  async function loadStats() {
    try {
      const stats = await getDashboardStats();
      if (statsElements.total) statsElements.total.textContent = (stats.total_documents || 0).toLocaleString();
      if (statsElements.processing) statsElements.processing.textContent = (stats.processing || 0).toLocaleString();
      if (statsElements.needs_review) statsElements.needs_review.textContent = (stats.needs_review || 0).toLocaleString();
      if (statsElements.completed) statsElements.completed.textContent = (stats.completed || 0).toLocaleString();
      if (statsElements.failed) statsElements.failed.textContent = (stats.failed || 0).toLocaleString();

      const reviewBadges = document.querySelectorAll(".review-count-badge");
      reviewBadges.forEach(badge => {
        badge.textContent = stats.needs_review || 0;
        badge.style.display = (stats.needs_review || 0) > 0 ? "inline-flex" : "none";
      });
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    }
  }

  async function loadDocumentsTable() {
    if (!documentsTableBody) return;

    try {
      allDocuments = await getDocuments();
      renderTable();
    } catch (err) {
      console.error("Failed to load documents:", err);
      documentsTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 text-center text-outline font-body-md">
            Unable to load documents from backend API. Please verify the backend is running.
          </td>
        </tr>
      `;
    }
  }

  function renderTable() {
    if (!documentsTableBody) return;

    let filtered = allDocuments.filter(doc => {
      let matchesStatus = true;
      if (currentFilter !== "all") {
        if (currentFilter === "needs_review" || currentFilter === "review") {
          matchesStatus = doc.status === "needs_review";
        } else {
          matchesStatus = doc.status === currentFilter;
        }
      }

      let matchesSearch = true;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        matchesSearch = (
          (doc.filename && doc.filename.toLowerCase().includes(q)) ||
          (doc.document_type && doc.document_type.toLowerCase().includes(q)) ||
          (doc.file_hash && doc.file_hash.toLowerCase().includes(q)) ||
          (doc.status && doc.status.toLowerCase().includes(q))
        );
      }

      return matchesStatus && matchesSearch;
    });

    if (filtered.length === 0) {
      documentsTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-12 text-center text-outline font-body-md">
            <div class="flex flex-col items-center gap-2">
              <span class="material-symbols-outlined text-3xl text-outline-variant">folder_off</span>
              <span>No documents found matching the criteria.</span>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const rowsHtml = filtered.map(doc => {
      const isReview = doc.status === "needs_review";
      const isCompleted = doc.status === "completed";
      const isFailed = doc.status === "failed";
      const isProcessing = doc.status === "processing";

      const confidencePct = Math.round((doc.overall_confidence || 0) * 100);

      let statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm font-semibold">
          ${doc.status}
        </span>
      `;
      if (isCompleted) {
        statusBadge = `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-label-sm font-semibold">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>Completed
          </span>
        `;
      } else if (isReview) {
        statusBadge = `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-label-sm font-semibold">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>Needs Review
          </span>
        `;
      } else if (isFailed) {
        statusBadge = `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-label-sm font-semibold">
            <span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span>Failed
          </span>
        `;
      } else if (isProcessing) {
        statusBadge = `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-label-sm font-semibold">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>Processing
          </span>
        `;
      }

      const formattedDate = doc.created_at ? new Date(doc.created_at).toLocaleString() : "Just now";
      const shortHash = doc.file_hash ? doc.file_hash.substring(0, 8) + "..." : "";

      const pagePrefix = window.location.pathname.includes("/pages/") ? "" : "pages/";
      const detailsUrl = `${pagePrefix}document-details.html?id=${doc.id}`;

      return `
        <tr class="hover:bg-surface-container-low/40 transition-colors group">
          <td class="py-3 px-space-md">
            <div class="flex items-center gap-space-sm">
              <div class="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-lg">description</span>
              </div>
              <div class="flex flex-col min-w-0">
                <a href="${detailsUrl}" class="font-medium text-on-surface truncate group-hover:text-primary transition-colors hover:underline">
                  ${doc.filename}
                </a>
                <span class="font-mono-metric text-label-sm text-outline">hash: ${shortHash}</span>
              </div>
            </div>
          </td>
          <td class="py-3 px-space-md">
            <span class="px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-label-sm text-label-sm capitalize">
              ${doc.document_type || 'Invoice'}
            </span>
          </td>
          <td class="py-3 px-space-md">
            ${statusBadge}
          </td>
          <td class="py-3 px-space-md text-right font-mono-metric text-label-md">
            <span class="${confidencePct >= 85 ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}">${confidencePct}%</span>
          </td>
          <td class="py-3 px-space-md text-outline font-mono-metric text-label-sm">${formattedDate}</td>
          <td class="py-3 px-space-md font-mono-metric text-label-sm text-on-surface-variant">worker-01</td>
          <td class="py-3 px-space-md text-right">
            <div class="inline-flex items-center gap-1">
              <a href="${detailsUrl}" class="px-3 py-1 rounded-lg ${isReview ? 'bg-primary text-white hover:bg-primary/90 shadow-sm' : 'text-primary hover:bg-surface-container'} font-label-md text-label-sm font-medium transition-all">
                ${isReview ? 'Review Now' : 'Details'}
              </a>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    documentsTableBody.innerHTML = rowsHtml;
  }

  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      filterButtons.forEach(b => {
        b.classList.remove("bg-surface-container-lowest", "text-primary", "shadow-sm", "font-semibold");
        b.classList.add("text-on-surface-variant");
      });
      btn.classList.add("bg-surface-container-lowest", "text-primary", "shadow-sm", "font-semibold");
      btn.classList.remove("text-on-surface-variant");

      currentFilter = btn.getAttribute("data-status");
      renderTable();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim();
      renderTable();
    });
  }

  const headerSearchInput = document.querySelector("header input[type='text']");
  if (headerSearchInput) {
    headerSearchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim();
      renderTable();
    });
  }

  const exportBtn = document.querySelector("#exportDataBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      window.open(getExportCsvUrl(), "_blank");
      showToast("CSV export generated and downloading...", "success");
    });
  }

  const uploadTriggerBtn = document.querySelector("#uploadTrigger");
  if (uploadTriggerBtn) {
    uploadTriggerBtn.addEventListener("click", () => {
      const pagePrefix = window.location.pathname.includes("/pages/") ? "" : "pages/";
      window.location.href = `${pagePrefix}bulk-upload.html`;
    });
  }

  await loadStats();
  await loadDocumentsTable();
});
