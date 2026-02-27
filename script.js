// PostIQ Calendar - no-login, share-by-link weekly planner

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

let calendarState = {
  weekStart: getMonday(new Date()),
  items: [] // { id, dayIndex, title, platform, status, notes }
};

document.addEventListener("DOMContentLoaded", () => {
  const weekStartInput = document.getElementById("weekStartInput");
  const prevWeekBtn = document.getElementById("prevWeekBtn");
  const nextWeekBtn = document.getElementById("nextWeekBtn");
  const thisWeekBtn = document.getElementById("thisWeekBtn");
  const newWeekBtn = document.getElementById("newWeekBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const copyStatus = document.getElementById("copyStatus");

  const modalOverlay = document.getElementById("modalOverlay");
  const modalTitle = document.getElementById("modalTitle");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const itemForm = document.getElementById("itemForm");
  const cancelBtn = document.getElementById("cancelBtn");
  const deleteItemBtn = document.getElementById("deleteItemBtn");

  const itemIdInput = document.getElementById("itemId");
  const itemDayIndexInput = document.getElementById("itemDayIndex");
  const itemTitleInput = document.getElementById("itemTitle");
  const itemPlatformInput = document.getElementById("itemPlatform");
  const itemStatusInput = document.getElementById("itemStatus");
  const itemNotesInput = document.getElementById("itemNotes");

  // Try to load from URL first
  tryLoadFromUrl();

  // Initialize weekStart input
  weekStartInput.value = formatDateInput(calendarState.weekStart);

  renderCalendar();

  // Week navigation
  prevWeekBtn.addEventListener("click", () => {
    calendarState.weekStart = addDays(calendarState.weekStart, -7);
    weekStartInput.value = formatDateInput(calendarState.weekStart);
    renderCalendar();
  });

  nextWeekBtn.addEventListener("click", () => {
    calendarState.weekStart = addDays(calendarState.weekStart, 7);
    weekStartInput.value = formatDateInput(calendarState.weekStart);
    renderCalendar();
  });

  thisWeekBtn.addEventListener("click", () => {
    calendarState.weekStart = getMonday(new Date());
    weekStartInput.value = formatDateInput(calendarState.weekStart);
    renderCalendar();
  });

  weekStartInput.addEventListener("change", (e) => {
    const value = e.target.value;
    if (!value) return;
    const picked = new Date(value + "T00:00:00");
    calendarState.weekStart = getMonday(picked);
    // Normalize input back to Monday to avoid confusion
    weekStartInput.value = formatDateInput(calendarState.weekStart);
    renderCalendar();
  });

  // New blank week
  newWeekBtn.addEventListener("click", () => {
    if (
      calendarState.items.length > 0 &&
      !confirm("Start a new blank week? This view will clear, but any existing share links still work.")
    ) {
      return;
    }
    calendarState.items = [];
    renderCalendar();
  });

  // Copy shareable link
  copyLinkBtn.addEventListener("click", async () => {
    const url = buildShareableUrl();
    try {
      await navigator.clipboard.writeText(url);
      copyStatus.textContent = "Link copied ✔";
      setTimeout(() => {
        copyStatus.textContent = "";
      }, 2500);
    } catch (err) {
      console.error("Clipboard error:", err);
      copyStatus.textContent = "Copy failed. You can copy from the address bar.";
      setTimeout(() => {
        copyStatus.textContent = "";
      }, 3000);
    }
  });

  // Calendar click delegation for add/edit
  document.getElementById("calendar").addEventListener("click", (e) => {
    const addBtn = e.target.closest("[data-add-day-index]");
    const card = e.target.closest("[data-item-id]");

    if (addBtn) {
      const dayIndex = Number(addBtn.getAttribute("data-add-day-index"));
      openModalForNewItem(dayIndex);
      return;
    }

    if (card) {
      const id = card.getAttribute("data-item-id");
      const item = calendarState.items.find((it) => String(it.id) === String(id));
      if (item) {
        openModalForEditItem(item);
      }
    }
  });

  // Modal controls
  modalCloseBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", (e) => {
    e.preventDefault();
    closeModal();
  });

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  deleteItemBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const id = itemIdInput.value;
    if (!id) {
      closeModal();
      return;
    }
    calendarState.items = calendarState.items.filter(
      (it) => String(it.id) !== String(id)
    );
    closeModal();
    renderCalendar();
  });

  // Form submit
  itemForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = itemIdInput.value;
    const dayIndex = Number(itemDayIndexInput.value);
    const title = itemTitleInput.value.trim();
    const platform = itemPlatformInput.value.trim();
    const status = itemStatusInput.value.trim() || "Planned";
    const notes = itemNotesInput.value.trim();

    if (!title) {
      itemTitleInput.focus();
      return;
    }

    if (id) {
      // Update existing
      const idx = calendarState.items.findIndex(
        (it) => String(it.id) === String(id)
      );
      if (idx !== -1) {
        calendarState.items[idx] = {
          ...calendarState.items[idx],
          dayIndex,
          title,
          platform,
          status,
          notes
        };
      }
    } else {
      // New item
      const newItem = {
        id: Date.now().toString() + Math.random().toString(16).slice(2),
        dayIndex,
        title,
        platform,
        status,
        notes
      };
      calendarState.items.push(newItem);
    }

    closeModal();
    renderCalendar();
  });

  // Helpers for modal
  function openModalForNewItem(dayIndex) {
    modalTitle.textContent = `Add item for ${dayNames[dayIndex]}`;
    itemIdInput.value = "";
    itemDayIndexInput.value = String(dayIndex);
    itemTitleInput.value = "";
    itemPlatformInput.value = "";
    itemStatusInput.value = "Planned";
    itemNotesInput.value = "";
    deleteItemBtn.style.visibility = "hidden";
    modalOverlay.classList.remove("hidden");
    itemTitleInput.focus();
  }

  function openModalForEditItem(item) {
    modalTitle.textContent = `Edit item for ${dayNames[item.dayIndex]}`;
    itemIdInput.value = item.id;
    itemDayIndexInput.value = String(item.dayIndex);
    itemTitleInput.value = item.title || "";
    itemPlatformInput.value = item.platform || "";
    itemStatusInput.value = item.status || "Planned";
    itemNotesInput.value = item.notes || "";
    deleteItemBtn.style.visibility = "visible";
    modalOverlay.classList.remove("hidden");
    itemTitleInput.focus();
  }

  function closeModal() {
    modalOverlay.classList.add("hidden");
  }
});

// --- Rendering & state helpers ---

function renderCalendar() {
  const calendarEl = document.getElementById("calendar");
  const weekLabelEl = document.getElementById("weekLabel");

  const weekStart = calendarState.weekStart;
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(weekStart, i));
  }

  const labelText = `${formatHumanDate(
    days[0]
  )} – ${formatHumanDate(days[6])}`;
  weekLabelEl.textContent = `Showing week: ${labelText}`;

  calendarEl.innerHTML = "";

  days.forEach((date, index) => {
    const col = document.createElement("div");
    col.className = "day-column";

    const header = document.createElement("div");
    header.className = "day-header";

    const nameEl = document.createElement("div");
    nameEl.className = "day-name";
    nameEl.textContent = dayNames[index];

    const dateEl = document.createElement("div");
    dateEl.className = "day-date";
    dateEl.textContent = formatShortDate(date);

    header.appendChild(nameEl);
    header.appendChild(dateEl);

    const actions = document.createElement("div");
    actions.className = "day-actions";
    const addBtn = document.createElement("button");
    addBtn.className = "add-btn";
    addBtn.setAttribute("data-add-day-index", String(index));
    addBtn.innerHTML = `<span>＋</span> Add`;
    actions.appendChild(addBtn);

    const itemsWrapper = document.createElement("div");
    itemsWrapper.className = "day-items";

    const itemsForDay = calendarState.items.filter(
      (it) => it.dayIndex === index
    );

    if (itemsForDay.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No posts planned.";
      itemsWrapper.appendChild(empty);
    } else {
      itemsForDay.forEach((item) => {
        const card = document.createElement("div");
        card.className = "item-card";
        card.setAttribute("data-item-id", String(item.id));

        const main = document.createElement("div");
        main.className = "item-main";
        main.textContent = item.title;

        const meta = document.createElement("div");
        meta.className = "item-meta";

        const platform = document.createElement("span");
        platform.className = "item-badge platform";
        platform.textContent = item.platform || "Unspecified";

        const status = document.createElement("span");
        status.className = `status-pill status-${(item.status || "Planned")
          .replace(/\s+/g, "")
          .trim()}`;
        status.textContent = item.status || "Planned";

        meta.appendChild(platform);
        meta.appendChild(status);

        card.appendChild(main);
        card.appendChild(meta);
        itemsWrapper.appendChild(card);
      });
    }

    col.appendChild(header);
    col.appendChild(actions);
    col.appendChild(itemsWrapper);
    calendarEl.appendChild(col);
  });

  // Update URL in-place (so people can just copy from address bar if they want)
  const shareUrl = buildShareableUrl();
  window.history.replaceState(null, "", shareUrl);
}

// Construct shareable URL with encoded state
function buildShareableUrl() {
  const payload = {
    weekStart: formatDateInput(calendarState.weekStart),
    items: calendarState.items
  };

  const json = JSON.stringify(payload);
  const encoded = btoa(encodeURIComponent(json));

  const url = new URL(window.location.href);
  url.searchParams.set("data", encoded);
  return url.toString();
}

// Try loading calendar state from ?data=
function tryLoadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const dataParam = params.get("data");
  if (!dataParam) return;

  try {
    const decodedJson = decodeURIComponent(atob(dataParam));
    const parsed = JSON.parse(decodedJson);

    if (parsed.weekStart) {
      const d = new Date(parsed.weekStart + "T00:00:00");
      if (!isNaN(d.getTime())) {
        calendarState.weekStart = getMonday(d);
      }
    }

    if (Array.isArray(parsed.items)) {
      // Mild validation
      calendarState.items = parsed.items
        .filter((it) => typeof it.dayIndex === "number" && it.title)
        .map((it) => ({
          id:
            it.id ||
            Date.now().toString() + Math.random().toString(16).slice(2),
          dayIndex: it.dayIndex,
          title: it.title,
          platform: it.platform || "",
          status: it.status || "Planned",
          notes: it.notes || ""
        }));
    }
  } catch (e) {
    console.warn("Failed to parse calendar data from URL:", e);
  }
}

// Date helpers

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0-6, Sun-Sat
  const diff = (day === 0 ? -6 : 1) - day; // shift so Monday is 1
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateInput(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(date) {
  const d = new Date(date);
  const month = d.toLocaleString("default", { month: "short" });
  const day = d.getDate();
  return `${month} ${day}`;
}

function formatHumanDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}
