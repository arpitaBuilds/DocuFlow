document.addEventListener("DOMContentLoaded", () => {
  const input = document.querySelector("#bulk-file-input");
  const dropZone = document.querySelector("#drop-zone");
  const stagedQueueList = document.querySelector("#staged-queue-list");

  async function triggerUpload(files) {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const rowId = "doc-row-" + Math.random().toString(36).substring(2, 9);
      if (stagedQueueList) {
        const itemHtml = `
          <div id="${rowId}" class="file-queue-row px-space-md py-space-sm flex flex-col md:flex-row md:items-center justify-between gap-space-sm hover:bg-surface-container-low/60 transition-colors">
            <div class="w-full md:w-5/12 flex items-center gap-space-sm min-w-0">
              <div class="w-10 h-10 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-xl">description</span>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-label-md text-label-md text-on-surface font-semibold truncate">${file.name}</span>
                <span class="font-mono-metric text-label-sm text-on-surface-variant flex items-center gap-1.5">
                  Size: ${(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
            <div class="w-full md:w-4/12 flex items-center status-col">
              <span class="px-space-xs py-0.5 rounded font-label-sm text-label-sm uppercase tracking-wider font-semibold bg-primary-container/20 text-primary flex items-center gap-1">
                <span class="material-symbols-outlined text-xs animate-spin">sync</span> Uploading & Processing...
              </span>
            </div>
            <div class="w-full md:w-3/12 text-right action-col">
              <span class="font-mono-metric text-label-sm text-outline">Processing...</span>
            </div>
          </div>
        `;
        stagedQueueList.insertAdjacentHTML("afterbegin", itemHtml);
      }

      try {
        const result = await uploadDocument(file);
        console.log("DocuFlow uploaded result:", result);

        const rowEl = document.getElementById(rowId);
        const detailsUrl = `document-details.html?id=${result.id}`;

        if (result.is_duplicate) {
          if (rowEl) {
            const statusCol = rowEl.querySelector(".status-col");
            if (statusCol) {
              statusCol.innerHTML = `
                <span class="px-space-xs py-0.5 rounded font-label-sm text-label-sm uppercase tracking-wider font-semibold bg-amber-100 text-amber-900 flex items-center gap-1">
                  <span class="material-symbols-outlined text-xs">content_copy</span> Duplicate Detected
                </span>
              `;
            }
            const actionCol = rowEl.querySelector(".action-col");
            if (actionCol) {
              actionCol.innerHTML = `
                <a href="${detailsUrl}" class="px-3 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 font-label-md text-label-sm font-semibold transition-all">
                  View Existing Document
                </a>
              `;
            }
          }

          showToast(`Duplicate document detected! '${file.name}' has already been processed.`, "warning");
        } else {
          if (rowEl) {
            const isComp = result.status === "completed";
            const statusBg = isComp ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900";
            const icon = isComp ? "check_circle" : "pending";

            const statusCol = rowEl.querySelector(".status-col");
            if (statusCol) {
              statusCol.innerHTML = `
                <span class="px-space-xs py-0.5 rounded font-label-sm text-label-sm uppercase tracking-wider font-semibold ${statusBg} flex items-center gap-1">
                  <span class="material-symbols-outlined text-xs">${icon}</span> ${result.status.replace("_", " ")}
                </span>
              `;
            }

            const actionCol = rowEl.querySelector(".action-col");
            if (actionCol) {
              actionCol.innerHTML = `
                <a href="${detailsUrl}" class="px-3 py-1 rounded-lg bg-primary text-white hover:bg-primary/90 font-label-md text-label-sm font-semibold transition-all">
                  View / Review Document
                </a>
              `;
            }
          }

          showToast(`File '${file.name}' processed successfully! Status: ${result.status.replace("_", " ")}`, "success");
        }
      } catch (error) {
        console.error("Upload error:", error);
        const rowEl = document.getElementById(rowId);
        if (rowEl) {
          const statusCol = rowEl.querySelector(".status-col");
          if (statusCol) {
            statusCol.innerHTML = `
              <span class="px-space-xs py-0.5 rounded font-label-sm text-label-sm uppercase tracking-wider font-semibold bg-red-100 text-red-600 flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">error</span> Failed
              </span>
            `;
          }
        }
        showToast(`Upload failed for ${file.name}: ${error.message || error}`, "error");
      }
    }
  }

  if (dropZone) {
    dropZone.addEventListener("click", (e) => {
      if (e.target.tagName !== "INPUT" && input) {
        input.click();
      }
    });

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("border-2", "border-primary");
    });

    dropZone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      dropZone.classList.remove("border-2", "border-primary");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("border-2", "border-primary");
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        triggerUpload(e.dataTransfer.files);
      }
    });
  }

  if (input) {
    input.addEventListener("change", (e) => {
      triggerUpload(e.target.files);
    });
  }
});
