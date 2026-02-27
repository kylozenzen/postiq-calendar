
const params = new URLSearchParams(window.location.search);
const leadershipMode = params.get("view") === "leadership";

let weekStart = new Date();
weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday

let items = [];

const editorView = document.getElementById("editorView");
const leadershipView = document.getElementById("leadershipView");
const weekLabelEl = document.getElementById("weekLabel");

if (leadershipMode) {
  loadLeadershipView();
} else {
  initEditor();
}

function formatWeekLabel(start) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

function initEditor() {
  editorView.classList.remove("hidden");
  document.getElementById("weekStartInput").valueAsDate = weekStart;
  weekLabelEl.textContent = `Week of ${formatWeekLabel(weekStart)}`;
  renderEditorCalendar();
  document.getElementById("syncBufferBtn").onclick = importScheduled;
  document.getElementById("generateLeadershipBtn").onclick = generateLeadershipLink;
}

function renderEditorCalendar() {
  const calendarEl = document.getElementById("calendar");
  calendarEl.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);

    const col = document.createElement("div");
    col.className = "day";

    const header = document.createElement("div");
    header.className = "dayHeader";
    header.textContent = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    col.appendChild(header);

    const todaysItems = items.filter((x) => x.dayIndex === i);
    todaysItems.forEach((it) => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div class="itemTitle">${escapeHtml(it.title || "").slice(0, 160)}</div>
        <div class="itemMeta">Scheduled for ${it.time}</div>
        ${it.mediaUrl ? `<img src="${it.mediaUrl}" class="media" alt="Post media preview" />` : ""}
      `;
      col.appendChild(div);
    });

    calendarEl.appendChild(col);
  }
}

async function importScheduled() {
  const key = document.getElementById("apiKeyInput").value.trim();
  const error = document.getElementById("errorBanner");
  const loading = document.getElementById("loadingBanner");

  if (!key) {
    error.textContent = "Please enter your Buffer API key.";
    error.classList.remove("hidden");
    return;
  }

  loading.classList.remove("hidden");
  error.classList.add("hidden");

  const query = `
    query GetScheduled {
      posts(state: SCHEDULED) {
        edges {
          node {
            id
            text
            dueAt
            attachments {
              image
              thumbnail
              video
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch("https://api.buffer.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: \`Bearer \${key}\`,
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(\`HTTP \${res.status}: \${text.slice(0, 120)}\`);
    }

    const json = await res.json();
    if (json.errors && json.errors.length) {
      console.error("GraphQL errors", json.errors);
      throw new Error(json.errors[0].message || "GraphQL error");
    }

    const posts = json?.data?.posts?.edges || [];
    if (!Array.isArray(posts) || posts.length === 0) {
      error.textContent = "No scheduled posts were returned from Buffer. Double-check that you have scheduled content and that your key has access.";
      error.classList.remove("hidden");
      loading.classList.add("hidden");
      return;
    }

    items = [];
    posts.forEach((p) => {
      const n = p.node;
      if (!n?.dueAt) return;
      const dt = new Date(n.dueAt);
      const index = (dt.getDay() + 6) % 7;
      const time = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const attachments = n.attachments || {};
      const media = attachments.image || attachments.thumbnail || null;

      items.push({
        title: n.text || "",
        platform: "Buffer",
        status: "Scheduled",
        notes: "",
        time,
        mediaUrl: media,
        dayIndex: index,
      });
    });

    renderEditorCalendar();
  } catch (e) {
    console.error("Import error", e);
    error.textContent = "Unable to import scheduled posts. " + e.message;
    error.classList.remove("hidden");
  } finally {
    loading.classList.add("hidden");
  }
}

function generateLeadershipLink() {
  try {
    const payload = encodeURIComponent(btoa(JSON.stringify({ weekStart: weekStart.toISOString(), items })));
    const url = \`\${window.location.origin}\${window.location.pathname}?view=leadership&data=\${payload}\`;
    navigator.clipboard.writeText(url);
    alert("Leadership link copied to clipboard!");
  } catch (e) {
    alert("Unable to generate link: " + e.message);
  }
}

function loadLeadershipView() {
  editorView.classList.add("hidden");
  leadershipView.classList.remove("hidden");

  const data = params.get("data");
  if (!data) {
    document.getElementById("summaryBar").textContent = "No data provided in this link.";
    return;
  }

  try {
    const decoded = JSON.parse(atob(decodeURIComponent(data)));
    weekStart = new Date(decoded.weekStart);
    items = decoded.items || [];
  } catch (e) {
    console.error("Decode error", e);
  }

  const summaryBar = document.getElementById("summaryBar");
  summaryBar.textContent = \`This week at a glance: \${items.length} scheduled or planned posts.\`;

  const cal = document.getElementById("leadershipCalendar");
  cal.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const col = document.createElement("div");
    col.className = "day";

    const header = document.createElement("div");
    header.className = "dayHeader";
    header.textContent = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    col.appendChild(header);

    const todaysItems = items.filter((x) => x.dayIndex === i);
    todaysItems.forEach((it) => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = \`
        <div class="itemTitle">\${escapeHtml(it.title || "").slice(0, 180)}</div>
        <div class="itemMeta">Scheduled for \${it.time}</div>
        \${it.mediaUrl ? \`<img src="\${it.mediaUrl}" class="media" alt="Post media preview" />\` : ""}
      \`;
      col.appendChild(div);
    });

    cal.appendChild(col);
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
