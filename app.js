const readerMenu = document.getElementById("readerMenu");

const imageInput = document.getElementById("imageInput");
const imageInputSecond = document.getElementById("imageInputSecond");
const pdfInput = document.getElementById("pdfInput");
const pdfInputSecond = document.getElementById("pdfInputSecond");

const pdfViewer = document.getElementById("pdfViewer");
const emptyState = document.getElementById("emptyState");
const dropZone = document.getElementById("dropZone");

const topUploadBtn = document.getElementById("topUploadBtn");
const topUploadText = document.getElementById("topUploadText");
const modeSubtitle = document.getElementById("modeSubtitle");

const imageModeBtn = document.getElementById("imageModeBtn");
const pdfModeBtn = document.getElementById("pdfModeBtn");
const chooseImagesBtn = document.getElementById("chooseImagesBtn");
const choosePdfBtn = document.getElementById("choosePdfBtn");
const emptyTitle = document.getElementById("emptyTitle");
const emptyDescription = document.getElementById("emptyDescription");
const dropHint = document.getElementById("dropHint");

const fitWidthBtn = document.getElementById("fitWidthBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const pageManagerBtn = document.getElementById("pageManagerBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");

const pageJumpInput = document.getElementById("pageJumpInput");
const goPageBtn = document.getElementById("goPageBtn");

const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const clearBtn = document.getElementById("clearBtn");

const fileInfo = document.getElementById("fileInfo");
const currentPageText = document.getElementById("currentPageText");
const progressFill = document.getElementById("progressFill");

const loadingOverlay = document.getElementById("loadingOverlay");
const loadingText = document.getElementById("loadingText");

const pagePanel = document.getElementById("pagePanel");
const panelBackdrop = document.getElementById("panelBackdrop");
const closePanelBtn = document.getElementById("closePanelBtn");
const pageList = document.getElementById("pageList");

let readerMode = "image"; // image | pdf
let currentZoom = 100;
let viewerObjectUrls = [];
let thumbObjectUrls = [];
let currentFiles = [];
let currentPdfFile = null;
let currentPdfDoc = null;

let lastScrollY = window.scrollY;
let hideMenuTimer = null;
let sortableInstance = null;
let badgeHideTimer = null;
let activePdfRenderToken = 0;


function isPdfFile(file) {
  return Boolean(
    file &&
    (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))
  );
}

function naturalSortFiles(files) {
  return [...files].sort((a, b) => {
    return a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base"
    });
  });
}

function clearViewerObjectUrls() {
  viewerObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  viewerObjectUrls = [];
}

function clearThumbObjectUrls() {
  thumbObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  thumbObjectUrls = [];
}

function clearAllObjectUrls() {
  clearViewerObjectUrls();
  clearThumbObjectUrls();
}

function showLoading(text = "Loading...") {
  loadingText.textContent = text;
  loadingOverlay.classList.add("show");
}

function hideLoading() {
  loadingOverlay.classList.remove("show");
}

function isReaderActive() {
  return currentFiles.length > 0;
}

function isPanelOpen() {
  return document.body.classList.contains("panel-open");
}

function updateFileInfo() {
  if (readerMode === "pdf") {
    if (currentPdfDoc) {
      fileInfo.textContent = `${currentPdfDoc.numPages} PDF page(s)`;
      return;
    }

    fileInfo.textContent = "No PDF";
    return;
  }

  if (!currentFiles.length) {
    fileInfo.textContent = "No images";
    return;
  }

  fileInfo.textContent = `${currentFiles.length} image(s) loaded`;
}

function updateJumpInputLimit() {
  pageJumpInput.max = currentFiles.length || 1;

  if (!currentFiles.length) {
    pageJumpInput.value = "";
    pageJumpInput.placeholder = "Page";
  }
}

function getActivePageIndex() {
  const pages = [...document.querySelectorAll(".page")];

  if (!pages.length) {
    return 0;
  }

  const viewportMiddle = window.scrollY + window.innerHeight / 2;
  let activePageIndex = 0;
  let closestDistance = Infinity;

  pages.forEach((page, index) => {
    const rect = page.getBoundingClientRect();
    const pageTop = rect.top + window.scrollY;
    const pageMiddle = pageTop + rect.height / 2;
    const distance = Math.abs(viewportMiddle - pageMiddle);

    if (distance < closestDistance) {
      closestDistance = distance;
      activePageIndex = index;
    }
  });

  return activePageIndex;
}

function updateReadingProgress() {
  if (!currentFiles.length) {
    currentPageText.textContent = "Page 0 / 0";
    progressFill.style.width = "0%";
    updateJumpInputLimit();
    return;
  }

  const activePageIndex = getActivePageIndex();
  currentPageText.textContent = `Page ${activePageIndex + 1} / ${currentFiles.length}`;

  if (document.activeElement !== pageJumpInput) {
    pageJumpInput.value = activePageIndex + 1;
  }

  updateJumpInputLimit();

  const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollPercent = documentHeight > 0
    ? (window.scrollY / documentHeight) * 100
    : 0;

  progressFill.style.width = `${Math.min(100, Math.max(0, scrollPercent))}%`;
}

function showPageBadgesForOneSecond() {
  const badges = document.querySelectorAll(".page-number-badge");

  badges.forEach((badge) => {
    badge.classList.add("show");
  });

  if (badgeHideTimer) {
    clearTimeout(badgeHideTimer);
  }

  badgeHideTimer = setTimeout(() => {
    badges.forEach((badge) => {
      badge.classList.remove("show");
    });
  }, 1000);
}

function showMenu(autoHide = true) {
  document.body.classList.remove("menu-hidden");

  if (hideMenuTimer) {
    clearTimeout(hideMenuTimer);
  }

  if (autoHide && isReaderActive() && !isPanelOpen()) {
    hideMenuTimer = setTimeout(() => {
      hideMenu();
    }, 2200);
  }
}

function hideMenu() {
  if (!isReaderActive()) return;
  if (isPanelOpen()) return;

  document.body.classList.add("menu-hidden");
}

function activateReaderMode() {
  document.body.classList.add("reader-active");
  showMenu(true);
}

function deactivateReaderMode() {
  document.body.classList.remove("reader-active");
  document.body.classList.remove("menu-hidden");
  document.body.classList.remove("panel-open");

  if (hideMenuTimer) {
    clearTimeout(hideMenuTimer);
  }
}

function syncModeUI() {
  const isImageMode = readerMode === "image";

  document.body.classList.toggle("image-mode", isImageMode);
  document.body.classList.toggle("pdf-mode", !isImageMode);

  imageModeBtn.classList.toggle("active", isImageMode);
  pdfModeBtn.classList.toggle("active", !isImageMode);

  topUploadText.textContent = isImageMode ? "Upload Images" : "Upload PDF";
  modeSubtitle.textContent = isImageMode
    ? "Image continuous PDF view"
    : "PDF file continuous reader";

  emptyTitle.textContent = isImageMode
    ? "ပုံတွေ Upload လုပ်ပါ"
    : "PDF File Upload လုပ်ပါ";

  emptyDescription.textContent = isImageMode
    ? "Image တွေကို upload လုပ်လိုက်တာနဲ့ filename အလိုက် natural sorting နဲ့စီပြီး PDF reader ပုံစံ continuous view ပြပါမယ်။"
    : "PDF file တစ်ခု upload လုပ်လိုက်တာနဲ့ page တွေကို continuous reader ပုံစံ render လုပ်ပြီး ဖတ်နိုင်ပါမယ်။";

  dropHint.textContent = isImageMode
    ? "Image files တွေကို Drag & Drop လုပ်လည်းရပါတယ်"
    : "PDF file ကို Drag & Drop လုပ်လည်းရပါတယ်";

  chooseImagesBtn.style.display = isImageMode ? "inline-flex" : "none";
  choosePdfBtn.style.display = isImageMode ? "none" : "inline-flex";

  pageManagerBtn.disabled = !isImageMode;
  updateFileInfo();
}

function setReaderMode(mode, shouldClear = true) {
  if (mode !== "image" && mode !== "pdf") return;

  readerMode = mode;

  if (shouldClear) {
    clearReaderOnly(false);
  }

  syncModeUI();
}

function clearReaderOnly(keepMode = true) {
  activePdfRenderToken++;

  pdfViewer.innerHTML = "";
  pageList.innerHTML = "";
  clearAllObjectUrls();

  currentFiles = [];
  currentPdfFile = null;
  currentPdfDoc = null;

  imageInput.value = "";
  imageInputSecond.value = "";
  pdfInput.value = "";
  pdfInputSecond.value = "";

  emptyState.style.display = "grid";
  resetFitWidth();
  updateFileInfo();
  updateReadingProgress();
  deactivateReaderMode();

  if (keepMode) {
    syncModeUI();
  }
}

function resetFitWidth() {
  currentZoom = 100;
  pdfViewer.style.width = "min(100%, 900px)";
  pdfViewer.style.maxWidth = "900px";
}

function applyCurrentZoom() {
  if (currentZoom === 100) {
    pdfViewer.style.width = "min(100%, 900px)";
    pdfViewer.style.maxWidth = "900px";
    return;
  }

  pdfViewer.style.width = `${currentZoom}%`;
  pdfViewer.style.maxWidth = currentZoom > 100 ? "none" : "900px";
}

function scrollToPage(pageNumber) {
  if (!currentFiles.length) return;

  const targetPage = Number(pageNumber);
  if (!Number.isFinite(targetPage)) return;

  const safePage = Math.min(currentFiles.length, Math.max(1, targetPage));
  const page = document.querySelector(`.page[data-index="${safePage - 1}"]`);
  if (!page) return;

  const pageTop = page.getBoundingClientRect().top + window.scrollY;
  const menuVisible = !document.body.classList.contains("menu-hidden");
  const menuHeight = menuVisible ? readerMenu.offsetHeight : 0;

  window.scrollTo({
    top: Math.max(0, pageTop - menuHeight),
    behavior: "smooth"
  });

  pageJumpInput.value = safePage;
  showMenu(true);

  setTimeout(() => {
    updateReadingProgress();
    showPageBadgesForOneSecond();
  }, 350);
}

function goToCurrentInputPage() {
  if (!currentFiles.length) {
    alert(readerMode === "pdf" ? "ပထမဆုံး PDF upload လုပ်ပါ။" : "ပထမဆုံး image upload လုပ်ပါ။");
    return;
  }

  scrollToPage(pageJumpInput.value);
}

function goNextPage() {
  if (!currentFiles.length) return;

  const activeIndex = getActivePageIndex();
  scrollToPage(activeIndex + 2);
}

function goPrevPage() {
  if (!currentFiles.length) return;

  const activeIndex = getActivePageIndex();
  scrollToPage(activeIndex);
}

function goFirstPage() {
  scrollToPage(1);
}

function goLastPage() {
  scrollToPage(currentFiles.length);
}

function renderViewer(keepZoom = false) {
  pdfViewer.innerHTML = "";
  clearViewerObjectUrls();

  currentFiles.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    viewerObjectUrls.push(url);

    const page = document.createElement("div");
    page.className = "page";
    page.dataset.index = index;

    const img = document.createElement("img");
    img.src = url;
    img.alt = `Page ${index + 1}`;
    img.loading = "lazy";
    img.draggable = false;

    const badge = document.createElement("div");
    badge.className = "page-number-badge";
    badge.textContent = `${index + 1} / ${currentFiles.length}`;

    page.appendChild(img);
    page.appendChild(badge);
    pdfViewer.appendChild(page);
  });

  if (keepZoom) {
    applyCurrentZoom();
  } else {
    resetFitWidth();
  }

  requestAnimationFrame(() => {
    updateReadingProgress();
    showPageBadgesForOneSecond();
  });
}

function renderPageList() {
  pageList.innerHTML = "";
  clearThumbObjectUrls();

  currentFiles.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    thumbObjectUrls.push(url);

    const item = document.createElement("div");
    item.className = "page-item";
    item.dataset.index = index;

    const thumb = document.createElement("div");
    thumb.className = "page-thumb";

    const img = document.createElement("img");
    img.src = url;
    img.alt = `Page ${index + 1}`;

    thumb.appendChild(img);

    const meta = document.createElement("div");
    meta.className = "page-meta";

    const strong = document.createElement("strong");
    strong.textContent = `Page ${index + 1}`;

    const name = document.createElement("span");
    name.textContent = file.name;

    meta.appendChild(strong);
    meta.appendChild(name);

    const handle = document.createElement("div");
    handle.className = "drag-handle";
    handle.textContent = "☰";

    item.appendChild(thumb);
    item.appendChild(meta);
    item.appendChild(handle);
    pageList.appendChild(item);
  });

  initSortable();
}

function initSortable() {
  if (sortableInstance) {
    sortableInstance.destroy();
  }

  if (!window.Sortable) {
    console.error("SortableJS is not loaded.");
    return;
  }

  sortableInstance = new Sortable(pageList, {
    animation: 180,
    handle: ".drag-handle",
    ghostClass: "sortable-ghost",

    onEnd: function (event) {
      const oldIndex = event.oldIndex;
      const newIndex = event.newIndex;

      if (oldIndex === newIndex) return;

      const movedFile = currentFiles.splice(oldIndex, 1)[0];
      currentFiles.splice(newIndex, 0, movedFile);

      renderViewer(true);
      renderPageList();
      updateFileInfo();
      updateReadingProgress();
      showMenu(false);
    }
  });
}

function renderAll(keepZoom = false) {
  if (!currentFiles.length) {
    clearReaderOnly();
    return;
  }

  emptyState.style.display = "none";

  if (readerMode === "image") {
    renderViewer(keepZoom);
    renderPageList();
  }

  updateFileInfo();
  updateReadingProgress();
  activateReaderMode();
}

function renderImages(files) {
  const imageFiles = [...files].filter((file) => file.type.startsWith("image/"));

  if (!imageFiles.length) {
    alert("Image file တွေပဲ upload လုပ်ပါ။");
    return;
  }

  setReaderMode("image", false);
  clearReaderOnly(false);
  readerMode = "image";
  syncModeUI();

  currentFiles = naturalSortFiles(imageFiles);
  renderAll(false);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function fileToArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Cannot read PDF file."));
    reader.readAsArrayBuffer(file);
  });
}

async function renderPdfFile(file) {
  if (!isPdfFile(file)) {
    alert("PDF file တစ်ခုပဲ upload လုပ်ပါ။");
    return;
  }

  if (!window.pdfjsLib) {
    alert("PDF.js မ load ဖြစ်ပါ။ Internet connection/CDN ကိုစစ်ပါ။");
    return;
  }

  try {
    showLoading("Loading PDF...");

    setReaderMode("pdf", false);
    clearReaderOnly(false);
    readerMode = "pdf";
    syncModeUI();

    // Important: create the render token AFTER clearReaderOnly(),
    // because clearReaderOnly() cancels previous PDF render jobs.
    const renderToken = ++activePdfRenderToken;

    currentPdfFile = file;

    const arrayBuffer = await fileToArrayBuffer(file);
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    currentPdfDoc = await loadingTask.promise;

    if (renderToken !== activePdfRenderToken) return;

    emptyState.style.display = "none";
    pdfViewer.innerHTML = "";
    pageList.innerHTML = "";
    clearAllObjectUrls();

    currentFiles = Array.from({ length: currentPdfDoc.numPages }, (_, index) => ({
      name: `PDF Page ${index + 1}`,
      pdfPageNumber: index + 1
    }));

    for (let pageNumber = 1; pageNumber <= currentPdfDoc.numPages; pageNumber++) {
      if (renderToken !== activePdfRenderToken) return;

      loadingText.textContent = `Rendering PDF... ${pageNumber}/${currentPdfDoc.numPages}`;

      const pdfPage = await currentPdfDoc.getPage(pageNumber);
      const viewport = pdfPage.getViewport({ scale: 1.6 });

      const pageWrap = document.createElement("div");
      pageWrap.className = "page";
      pageWrap.dataset.index = pageNumber - 1;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { alpha: false });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      await pdfPage.render({
        canvasContext: ctx,
        viewport
      }).promise;

      const badge = document.createElement("div");
      badge.className = "page-number-badge";
      badge.textContent = `${pageNumber} / ${currentPdfDoc.numPages}`;

      pageWrap.appendChild(canvas);
      pageWrap.appendChild(badge);
      pdfViewer.appendChild(pageWrap);

      updateFileInfo();
      updateReadingProgress();
    }

    resetFitWidth();
    updateFileInfo();
    updateReadingProgress();
    activateReaderMode();
    showPageBadgesForOneSecond();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  } catch (error) {
    console.error(error);
    alert(`PDF ဖတ်ရာမှာ error ဖြစ်သွားပါတယ်။\n${error.message || "PDF file ကိုစစ်ကြည့်ပါ။"}`);
    clearReaderOnly();
  } finally {
    hideLoading();
  }
}

function openModeInput() {
  if (readerMode === "image") {
    imageInput.click();
  } else {
    pdfInput.click();
  }
}

topUploadBtn.addEventListener("click", openModeInput);

imageModeBtn.addEventListener("click", () => {
  setReaderMode("image", true);
});

pdfModeBtn.addEventListener("click", () => {
  setReaderMode("pdf", true);
});

imageInput.addEventListener("change", (event) => {
  renderImages(event.target.files);
});

imageInputSecond.addEventListener("change", (event) => {
  renderImages(event.target.files);
});

pdfInput.addEventListener("change", (event) => {
  renderPdfFile(event.target.files[0]);
});

pdfInputSecond.addEventListener("change", (event) => {
  renderPdfFile(event.target.files[0]);
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("drag-over");
  showMenu(false);
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("drag-over");

  const files = [...event.dataTransfer.files];
  const pdfFile = files.find(isPdfFile);
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));

  if (readerMode === "pdf") {
    if (!pdfFile) {
      alert("PDF Mode မှာ PDF file ပဲ upload လုပ်ပါ။");
      return;
    }

    renderPdfFile(pdfFile);
    return;
  }

  if (readerMode === "image") {
    if (imageFiles.length) {
      renderImages(imageFiles);
      return;
    }

    if (pdfFile) {
      renderPdfFile(pdfFile);
      return;
    }
  }

  alert("Support လုပ်တဲ့ file မတွေ့ပါ။");
});

function openPagePanel() {
  if (readerMode === "pdf") {
    alert("PDF Mode မှာ page reorder မလုပ်ထားပါ။ Image Mode မှာပဲ Pages ကိုသုံးပါ။");
    return;
  }

  if (!currentFiles.length) {
    alert("ပထမဆုံး image upload လုပ်ပါ။");
    return;
  }

  document.body.classList.add("panel-open");
  showMenu(false);
  renderPageList();
}

function closePagePanel() {
  document.body.classList.remove("panel-open");
  showMenu(true);
}

pageManagerBtn.addEventListener("click", openPagePanel);
closePanelBtn.addEventListener("click", closePagePanel);
panelBackdrop.addEventListener("click", closePagePanel);

async function toggleFullscreen() {
  if (!isReaderActive()) {
    alert(readerMode === "pdf" ? "ပထမဆုံး PDF upload လုပ်ပါ။" : "ပထမဆုံး image upload လုပ်ပါ။");
    return;
  }

  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (error) {
    console.error(error);
    alert("ဒီ browser မှာ Full Screen mode မရနိုင်ပါ။");
  }
}

fullscreenBtn.addEventListener("click", toggleFullscreen);

document.addEventListener("fullscreenchange", () => {
  const isFullscreen = Boolean(document.fullscreenElement);

  document.body.classList.toggle("fullscreen-mode", isFullscreen);
  fullscreenBtn.textContent = isFullscreen ? "Exit Fullscreen" : "Full Screen";

  showMenu(true);
  updateReadingProgress();
});

goPageBtn.addEventListener("click", goToCurrentInputPage);

pageJumpInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    goToCurrentInputPage();
    pageJumpInput.blur();
  }

  if (event.key === "Escape") {
    pageJumpInput.blur();
  }
});

fitWidthBtn.addEventListener("click", () => {
  resetFitWidth();
  updateReadingProgress();
  showMenu(true);
});

zoomInBtn.addEventListener("click", () => {
  if (!currentFiles.length) return;

  currentZoom += 10;

  if (currentZoom > 180) {
    currentZoom = 180;
  }

  applyCurrentZoom();
  updateReadingProgress();
  showMenu(true);
});

zoomOutBtn.addEventListener("click", () => {
  if (!currentFiles.length) return;

  currentZoom -= 10;

  if (currentZoom < 50) {
    currentZoom = 50;
  }

  applyCurrentZoom();
  updateReadingProgress();
  showMenu(true);
});

clearBtn.addEventListener("click", () => {
  clearReaderOnly();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});

window.addEventListener("scroll", () => {
  if (!isReaderActive()) return;
  if (isPanelOpen()) return;

  updateReadingProgress();
  showPageBadgesForOneSecond();

  const currentScrollY = window.scrollY;

  if (currentScrollY > lastScrollY && currentScrollY > 80) {
    hideMenu();
  } else {
    showMenu(true);
  }

  lastScrollY = currentScrollY;
});

window.addEventListener("resize", () => {
  updateReadingProgress();
});

window.addEventListener("mousemove", () => {
  if (!isReaderActive()) return;
  if (isPanelOpen()) return;

  showMenu(true);
});

window.addEventListener("touchstart", () => {
  if (!isReaderActive()) return;
  if (isPanelOpen()) return;

  showMenu(true);
});

window.addEventListener("keydown", (event) => {
  if (!isReaderActive()) return;

  const activeTag = document.activeElement.tagName.toLowerCase();
  const isTyping = activeTag === "input" || activeTag === "textarea";

  if (isTyping && document.activeElement !== pageJumpInput) {
    return;
  }

  if (document.activeElement === pageJumpInput) {
    return;
  }

  if (event.key === "Escape") {
    if (isPanelOpen()) {
      closePagePanel();
    } else {
      hideMenu();
    }
  }

  if (event.key === "+") {
    zoomInBtn.click();
  }

  if (event.key === "-") {
    zoomOutBtn.click();
  }

  if (event.key.toLowerCase() === "f") {
    fitWidthBtn.click();
  }

  if (event.key.toLowerCase() === "p") {
    openPagePanel();
  }

  if (event.key.toLowerCase() === "g") {
    showMenu(false);
    pageJumpInput.focus();
    pageJumpInput.select();
  }

  if (event.key.toLowerCase() === "m") {
    showMenu(true);
  }

  if (event.key === "ArrowRight" || event.key === "PageDown") {
    event.preventDefault();
    goNextPage();
  }

  if (event.key === "ArrowLeft" || event.key === "PageUp") {
    event.preventDefault();
    goPrevPage();
  }

  if (event.key === "Home") {
    event.preventDefault();
    goFirstPage();
  }

  if (event.key === "End") {
    event.preventDefault();
    goLastPage();
  }

  if (event.code === "Space") {
    event.preventDefault();
    goNextPage();
  }
});

function loadImageForPdf(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      URL.revokeObjectURL(url);

      resolve({
        dataUrl,
        width: canvas.width,
        height: canvas.height
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Cannot load image: ${file.name}`));
    };

    img.src = url;
  });
}

function downloadOriginalPdf() {
  if (!currentPdfFile) {
    alert("ပထမဆုံး PDF upload လုပ်ပါ။");
    return;
  }

  const url = URL.createObjectURL(currentPdfFile);
  const a = document.createElement("a");

  a.href = url;
  a.download = currentPdfFile.name || "document.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

downloadPdfBtn.addEventListener("click", async () => {
  if (readerMode === "pdf") {
    downloadOriginalPdf();
    return;
  }

  if (!currentFiles.length) {
    alert("ပထမဆုံး image upload လုပ်ပါ။");
    return;
  }

  try {
    closePagePanel();
    showMenu(false);
    showLoading("Creating PDF...");

    const { jsPDF } = window.jspdf;
    let pdf = null;

    for (let i = 0; i < currentFiles.length; i++) {
      loadingText.textContent = `Creating PDF... ${i + 1}/${currentFiles.length}`;

      const image = await loadImageForPdf(currentFiles[i]);
      const orientation = image.width > image.height ? "landscape" : "portrait";

      if (i === 0) {
        pdf = new jsPDF({
          orientation,
          unit: "px",
          format: [image.width, image.height],
          compress: true
        });
      } else {
        pdf.addPage([image.width, image.height], orientation);
      }

      pdf.addImage(
        image.dataUrl,
        "JPEG",
        0,
        0,
        image.width,
        image.height
      );
    }

    pdf.save("image-reader.pdf");
  } catch (error) {
    console.error(error);
    alert("PDF ထုတ်ရာမှာ error ဖြစ်သွားပါတယ်။");
  } finally {
    hideLoading();
    updateReadingProgress();
    showMenu(true);
  }
});

syncModeUI();
