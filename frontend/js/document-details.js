document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const docId = urlParams.get("id");

  if (!docId) {
    showToast("No document ID specified", "warning");
    return;
  }

  let currentDocument = null;
  let currentZoom = 100;

  // Zoom handling
  const zoomLevelEl = document.getElementById("zoomLevel");
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const fitWidthBtn = document.getElementById("fitWidthBtn");
  const canvas = document.getElementById("invoiceCanvas");

  function applyZoom(zoom) {
    currentZoom = Math.min(Math.max(zoom, 50), 200);
    if (zoomLevelEl) zoomLevelEl.textContent = `${currentZoom}%`;
    if (canvas) {
      canvas.style.transform = `scale(${currentZoom / 100})`;
      canvas.style.transformOrigin = "top center";
    }
  }

  if (zoomInBtn) zoomInBtn.addEventListener("click", () => applyZoom(currentZoom + 15));
  if (zoomOutBtn) zoomOutBtn.addEventListener("click", () => applyZoom(currentZoom - 15));
  if (fitWidthBtn) fitWidthBtn.addEventListener("click", () => applyZoom(100));

  async function loadDocumentData() {
    try {
      currentDocument = await getDocument(docId);
      await renderDocumentDetails();
    } catch (err) {
      console.error("Failed to load document:", err);
      showToast("Document not found or backend API error", "error");
    }
  }

  async function renderDocumentDetails() {
    if (!currentDocument) return;

    const baseUrl = await getApiBaseUrl();
    let fileUrl = null;
    if (currentDocument.file_url) {
      fileUrl = currentDocument.file_url.startsWith("http") ? currentDocument.file_url : `${baseUrl}${currentDocument.file_url}`;
    } else if (currentDocument.file_path) {
      const fname = currentDocument.file_path.split(/[/\\]/).pop();
      fileUrl = `${baseUrl}/uploads/${fname}`;
    }

    // Render Document Canvas Preview (Dynamic Image/PDF)
    if (canvas && fileUrl) {
      const filename = (currentDocument.filename || currentDocument.file_path || "").toLowerCase();
      const ext = filename.split(".").pop();
      const isImage = ["png", "jpg", "jpeg", "webp", "tiff", "tif", "bmp"].includes(ext);
      const isPdf = ext === "pdf";

      if (isImage) {
        canvas.innerHTML = `
          <div class="relative w-full flex flex-col items-center justify-center p-2">
            <img src="${fileUrl}" alt="${currentDocument.filename}" class="max-w-full h-auto object-contain rounded-xl shadow-lg border border-outline-variant/30" id="docViewerImage" />
            <div class="mt-4 text-center text-xs font-mono-metric text-on-surface-variant flex items-center justify-center gap-2 bg-surface-container-low py-1.5 px-4 rounded-full border border-outline-variant/20 shadow-sm">
              <span class="material-symbols-outlined text-sm text-primary">image</span>
              <span>Document File: <strong>${currentDocument.filename}</strong> (${ext.toUpperCase()})</span>
            </div>
          </div>
        `;
      } else if (isPdf) {
        canvas.innerHTML = `
          <div class="relative w-full h-[960px] rounded-xl border border-outline-variant/30 overflow-hidden shadow-lg">
            <iframe src="${fileUrl}" class="w-full h-full border-0" id="docViewerIframe"></iframe>
          </div>
        `;
      } else {
        canvas.innerHTML = `
          <div class="p-12 text-center flex flex-col items-center gap-3">
            <span class="material-symbols-outlined text-4xl text-primary">description</span>
            <p class="text-sm font-semibold text-on-surface">${currentDocument.filename}</p>
            <a href="${fileUrl}" target="_blank" class="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm">open_in_new</span> Open Source File
            </a>
          </div>
        `;
      }
    } else if (canvas) {
      canvas.innerHTML = `
        <div class="p-12 text-center text-outline flex flex-col items-center gap-2">
          <span class="material-symbols-outlined text-4xl text-amber-500">warning</span>
          <p class="text-sm font-medium">Source document file not available on server.</p>
        </div>
      `;
    }

    // Update Download Source Button
    const downloadPdfBtn = document.querySelector("#downloadPdfBtn");
    if (downloadPdfBtn) {
      downloadPdfBtn.onclick = () => {
        if (fileUrl) {
          window.open(fileUrl, "_blank");
        } else {
          showToast("No source file available to download", "warning");
        }
      };
    }

    // Header Title & Meta
    const titleEls = document.querySelectorAll(".doc-filename-display");
    titleEls.forEach(el => el.textContent = currentDocument.filename || `Document #${currentDocument.id}`);

    const docIdEls = document.querySelectorAll(".doc-id-display");
    docIdEls.forEach(el => el.textContent = `DOC-${currentDocument.id}`);

    const docTypeEls = document.querySelectorAll(".doc-type-display");
    docTypeEls.forEach(el => el.textContent = (currentDocument.document_type || "Invoice").toUpperCase());

    const docConfidenceEls = document.querySelectorAll(".doc-confidence-display");
    const overallPct = Math.round((currentDocument.overall_confidence || 0) * 100);
    docConfidenceEls.forEach(el => el.textContent = `${overallPct}%`);

    const statusPill = document.querySelector(".doc-status-pill");
    if (statusPill) {
      const isComp = currentDocument.status === "completed";
      const isReview = currentDocument.status === "needs_review";
      const isFailed = currentDocument.status === "failed";

      let bgClass = "bg-blue-100 text-blue-800 border border-blue-200";
      let icon = "sync";
      let text = currentDocument.status;

      if (isComp) {
        bgClass = "bg-emerald-100 text-emerald-800 border border-emerald-200";
        icon = "check_circle";
        text = "Completed";
      } else if (isReview) {
        bgClass = "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse";
        icon = "priority_high";
        text = "Needs Review";
      } else if (isFailed) {
        bgClass = "bg-rose-100 text-rose-800 border border-rose-200";
        icon = "warning";
        text = "Failed";
      }

      statusPill.className = `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${bgClass}`;
      statusPill.innerHTML = `<span class="material-symbols-outlined text-sm">${icon}</span> ${text}`;
    }

    // Render Fields Container
    const fieldsContainer = document.querySelector("#extractedFieldsContainer");
    if (fieldsContainer && currentDocument.fields) {
      if (currentDocument.fields.length === 0) {
        fieldsContainer.innerHTML = `
          <div class="p-8 text-center text-outline flex flex-col items-center justify-center gap-2">
            <span class="material-symbols-outlined text-3xl text-slate-400">hourglass_empty</span>
            <span class="text-sm font-medium">No fields extracted yet. Click "Re-Extract OCR" above.</span>
          </div>
        `;
      } else {
        const fieldsHtml = currentDocument.fields.map(field => {
          const fieldNameFormatted = field.field_name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
          const confidencePct = Math.round((field.confidence || 0) * 100);
          const isVerified = field.is_verified;

          return `
            <div class="p-4 bg-surface-container-lowest border rounded-2xl flex flex-col gap-3 transition-all ${isVerified ? 'border-emerald-200 shadow-sm' : 'border-amber-300 shadow-md ring-1 ring-amber-200'}" data-field-id="${field.id}">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-base ${isVerified ? 'text-emerald-600' : 'text-amber-600'}">
                    ${isVerified ? 'verified' : 'help_outline'}
                  </span>
                  <span class="font-headline-md text-sm font-bold text-on-surface">${fieldNameFormatted}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-mono-metric text-xs ${confidencePct >= 85 ? 'text-emerald-700' : 'text-amber-700'} font-semibold">
                    ${confidencePct}% Conf
                  </span>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900 border border-amber-300'}">
                    ${isVerified ? '✓ Verified' : '⚠ Needs Review'}
                  </span>
                </div>
              </div>

              ${field.review_reason && !isVerified ? `
                <div class="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center gap-2">
                  <span class="material-symbols-outlined text-base text-amber-600 shrink-0">info</span>
                  <span>${field.review_reason}</span>
                </div>
              ` : ''}

              <div class="flex items-center gap-2 mt-0.5">
                <input type="text" class="field-value-input flex-1 px-3.5 py-2 bg-surface-container-low border border-outline-variant/40 rounded-xl font-mono-metric text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all" value="${field.field_value !== null ? field.field_value : ''}" placeholder="Enter ${fieldNameFormatted}">
                <button type="button" class="save-field-btn px-4 py-2 bg-primary text-white hover:bg-primary-container rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95">
                  <span class="material-symbols-outlined text-sm">check</span> Save & Verify
                </button>
              </div>
            </div>
          `;
        }).join("");

        fieldsContainer.innerHTML = fieldsHtml;

        // Attach Save Event Listeners
        fieldsContainer.querySelectorAll(".save-field-btn").forEach(btn => {
          btn.addEventListener("click", async (e) => {
            const card = e.target.closest("[data-field-id]");
            const fieldId = parseInt(card.getAttribute("data-field-id"));
            const input = card.querySelector(".field-value-input");
            const newValue = input.value;

            try {
              btn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span> Saving...`;
              btn.disabled = true;

              await reviewField(currentDocument.id, fieldId, newValue, true);
              showToast("Field updated and human-verified in SQLite DB!", "success");

              await loadDocumentData();
            } catch (err) {
              console.error("Failed to update field:", err);
              showToast("Failed to save field: " + err.message, "error");
              btn.innerHTML = `<span class="material-symbols-outlined text-sm">check</span> Save & Verify`;
              btn.disabled = false;
            }
          });
        });
      }
    }

    // Populate Raw JSON Modal
    const rawJsonPre = document.querySelector("#rawJsonPre");
    if (rawJsonPre) {
      rawJsonPre.textContent = JSON.stringify(currentDocument, null, 2);
    }
  }

  // Retry Document Button
  const retryBtn = document.querySelector("#retryDocBtn");
  if (retryBtn) {
    retryBtn.addEventListener("click", async () => {
      try {
        retryBtn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span> Reprocessing...`;
        retryBtn.disabled = true;

        await retryDocument(docId);
        showToast("Document reprocessed successfully with Groq/OCR!", "success");
        await loadDocumentData();
      } catch (err) {
        showToast("Retry failed: " + err.message, "error");
      } finally {
        retryBtn.innerHTML = `<span class="material-symbols-outlined text-sm">refresh</span> Re-Extract OCR`;
        retryBtn.disabled = false;
      }
    });
  }

  // Raw JSON Modal Triggers
  const viewRawJsonBtn = document.querySelector("#viewRawJsonBtn");
  const jsonModal = document.querySelector("#jsonModal");
  const closeJsonModal = document.querySelector("#closeJsonModal");

  if (viewRawJsonBtn && jsonModal) {
    viewRawJsonBtn.addEventListener("click", () => {
      jsonModal.classList.remove("hidden");
      jsonModal.classList.add("flex");
    });
  }

  if (closeJsonModal && jsonModal) {
    closeJsonModal.addEventListener("click", () => {
      jsonModal.classList.add("hidden");
      jsonModal.classList.remove("flex");
    });
  }

  if (jsonModal) {
    jsonModal.addEventListener("click", (e) => {
      if (e.target === jsonModal) {
        jsonModal.classList.add("hidden");
        jsonModal.classList.remove("flex");
      }
    });
  }

  await loadDocumentData();
});
