
const params = new URLSearchParams(window.location.search);
const leadershipMode = params.get("view") === "leadership";

let weekStart = new Date();
weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

let items = [];

const editorView = document.getElementById("editorView");
const leadershipView = document.getElementById("leadershipView");

if (leadershipMode) loadLeadershipView();
else initEditor();

function initEditor() {
  editorView.classList.remove("hidden");
  render();
  document.getElementById("syncBufferBtn").onclick = importScheduled;
  document.getElementById("generateLeadershipBtn").onclick = generateLeadershipLink;
}

function render() {
  const calendarEl = document.getElementById("calendar");
  calendarEl.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart); 
    d.setDate(d.getDate() + i);
    const col = document.createElement("div");
    col.className = "day";
    col.innerHTML = `<strong>${d.toDateString().slice(0,10)}</strong>`;

    const todaysItems = items.filter(x => x.dayIndex === i);
    todaysItems.forEach(it => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div>${it.title}</div>
        <div><small>Scheduled for ${it.time}</small></div>
        ${it.mediaUrl ? `<img src="${it.mediaUrl}" class="media" />` : ""}
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
    error.textContent = "Please enter your API key.";
    error.classList.remove("hidden");
    return;
  }

  loading.classList.remove("hidden");
  error.classList.add("hidden");

  const query = `query {
    posts(state:SCHEDULED){
      edges{
        node{
          id text dueAt
          attachments { image video thumbnail }
        }
      }
    }
  }`;

  try {
    const res = await fetch("https://graphql.buffer.com", {
      method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${key}`},
      body:JSON.stringify({query})
    });

    if (!res.ok) throw new Error("Failed");

    const json = await res.json();
    const posts = json?.data?.posts?.edges || [];

    posts.forEach(p => {
      const n = p.node;
      const dt = new Date(n.dueAt);
      const index = (dt.getDay()+6)%7;
      const time = dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

      const media = n.attachments?.image || n.attachments?.thumbnail || null;

      items.push({
        title: n.text,
        platform: "Unknown",
        status: "Scheduled",
        notes: "",
        time,
        mediaUrl: media,
        dayIndex: index
      });
    });

    render();
  } catch (e) {
    error.textContent = "Unable to import scheduled posts. Deploy to Netlify first.";
    error.classList.remove("hidden");
  } finally {
    loading.classList.add("hidden");
  }
}

function generateLeadershipLink() {
  const payload = encodeURIComponent(btoa(JSON.stringify({weekStart, items})));
  const url = `${window.location.origin}${window.location.pathname}?view=leadership&data=${payload}`;
  navigator.clipboard.writeText(url);
  alert("Leadership link copied!");
}

function loadLeadershipView() {
  editorView.classList.add("hidden");
  leadershipView.classList.remove("hidden");

  const data = params.get("data");
  if (!data) return;

  const decoded = JSON.parse(atob(decodeURIComponent(data)));
  weekStart = new Date(decoded.weekStart);
  items = decoded.items || [];

  const cal = document.getElementById("leadershipCalendar");
  cal.innerHTML = "";

  document.getElementById("summaryBar").textContent =
    `This week at a glance: ${items.length} scheduled or planned posts`;

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart); 
    d.setDate(d.getDate() + i);
    const col = document.createElement("div");
    col.className = "day";
    col.innerHTML = `<strong>${d.toDateString().slice(0,10)}</strong>`;

    const todaysItems = items.filter(x => x.dayIndex === i);

    todaysItems.forEach(it => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div>${it.title}</div>
        <div><small>Scheduled for ${it.time}</small></div>
        ${it.mediaUrl ? `<img src="${it.mediaUrl}" class="media" />` : ""}
      `;
      col.appendChild(div);
    });

    cal.appendChild(col);
  }
}
