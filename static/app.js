const stages = ["idea", "pre-production", "post-production", "published"];

const board = document.getElementById("board");
const modal = document.getElementById("modal");
const openModalBtn = document.getElementById("openModal");
const closeModalBtn = document.getElementById("closeModal");
const cancelModalBtn = document.getElementById("cancelModal");
const addForm = document.getElementById("addForm");
const toast = document.getElementById("toast");

let currentVideos = [];
let toastTimer = null;

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.style.borderColor = isError ? "#ff6b6b" : "#263241";
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function openModal() {
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  addForm.reset();
}

async function fetchVideos() {
  const response = await fetch("/api/videos");
  if (!response.ok) {
    throw new Error("Failed to load videos.");
  }
  return response.json();
}

function updateCounts(videos) {
  const counts = Object.fromEntries(stages.map((stage) => [stage, 0]));
  videos.forEach((video) => {
    if (counts[video.stage] !== undefined) {
      counts[video.stage] += 1;
    }
  });
  stages.forEach((stage) => {
    const countEl = document.querySelector(`[data-count='${stage}']`);
    if (countEl) {
      countEl.textContent = counts[stage];
    }
  });
}

function createCard(video) {
  const card = document.createElement("article");
  card.className = "card";
  card.draggable = true;
  card.dataset.title = video.title;

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = video.title;

  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.innerHTML = `<span>${video.stage.replace(/-/g, " ")}</span>`;

  const del = document.createElement("button");
  del.className = "delete-btn";
  del.type = "button";
  del.textContent = "Delete";
  del.addEventListener("click", async (event) => {
    event.stopPropagation();
    const confirmed = window.confirm(`Delete "${video.title}"?`);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(video.title)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Delete failed.");
      }
      await reloadBoard();
      showToast("Video deleted.");
    } catch (error) {
      showToast(error.message, true);
    }
  });

  actions.appendChild(del);
  card.appendChild(title);
  card.appendChild(actions);

  card.addEventListener("dragstart", (event) => {
    card.classList.add("dragging");
    event.dataTransfer.setData("text/plain", video.title);
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
  });

  return card;
}

function renderBoard(videos) {
  currentVideos = videos;
  stages.forEach((stage) => {
    const column = board.querySelector(`[data-dropzone='${stage}']`);
    if (!column) return;
    column.innerHTML = "";
    videos
      .filter((video) => video.stage === stage)
      .forEach((video) => column.appendChild(createCard(video)));
  });
  updateCounts(videos);
}

async function reloadBoard() {
  const videos = await fetchVideos();
  renderBoard(videos);
}

async function moveVideo(title, stage) {
  const res = await fetch(`/api/videos/${encodeURIComponent(title)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || "Update failed.");
  }
  await reloadBoard();
}

function setupDropzones() {
  const zones = document.querySelectorAll("[data-dropzone]");
  zones.forEach((zone) => {
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", async (event) => {
      event.preventDefault();
      zone.classList.remove("drag-over");
      const title = event.dataTransfer.getData("text/plain");
      const stage = zone.dataset.dropzone;
      if (!title || !stage) return;
      const video = currentVideos.find((item) => item.title === title);
      if (video && video.stage === stage) return;
      try {
        await moveVideo(title, stage);
        showToast("Stage updated.");
      } catch (error) {
        showToast(error.message, true);
      }
    });
  });
}

openModalBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
cancelModalBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(addForm);
  const title = String(formData.get("title") || "").trim();
  const stage = String(formData.get("stage") || "").trim();
  if (!title) {
    showToast("Title is required.", true);
    return;
  }
  try {
    const res = await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, stage }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error || "Add failed.");
    }
    closeModal();
    await reloadBoard();
    showToast("Video added.");
  } catch (error) {
    showToast(error.message, true);
  }
});

window.addEventListener("load", async () => {
  setupDropzones();
  try {
    await reloadBoard();
  } catch (error) {
    showToast(error.message, true);
  }
});
