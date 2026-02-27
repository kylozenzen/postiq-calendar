
// Calendar state
const params = new URLSearchParams(window.location.search);
const leadershipMode = params.get("view") === "leadership";

let weekStart = new Date();
weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

let items = []; // {title, platform, status, notes, mediaUrl, dayIndex}

const editorView = document.getElementById("editorView");
const leadershipView = document.getElementById("leadershipView");

if (leadershipMode) {
  loadLeadershipView();
} else {
  initEditor();
}

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
    const d = new Date(weekStart); d.setDate(d.getDate() + i);
    const col = document.createElement("div");
    col.className = "day";
    col.innerHTML = `<strong>${d.toDateString().slice(0,10)}</strong>`;

    const todaysItems = items.filter(x => x.dayIndex === i);
    todaysItems.forEach(it => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div>${it.title}</div>
        ${it.mediaUrl ? `<img src="${it.mediaUrl}" class="media" />` : ""}
      `;
      col.appendChild(div);
    });

    calendarEl.appendChild(col);
  }
}

async function importScheduled() {
  const key = document.getElementById("apiKeyInput").value.trim();
  if (!key) return alert("Enter API key");

  const query = `query {
    posts(state:SCHEDULED){
      edges{
        node{
          id text dueAt
          attachments { image video }
        }
      }
    }
  }`;

  const res = await fetch("https://graphql.buffer.com", {
    method:"POST",
    headers:{ "Content-Type":"application/json", Authorization:`Bearer ${key}`},
    body:JSON.stringify({query})
  });

  const json = await res.json();
  const posts = json?.data?.posts?.edges || [];

  posts.forEach(p => {
    const n = p.node;
    const dt = new Date(n.dueAt);
    const index = (dt.getDay()+6)%7;

    items.push({
      title: n.text,
      platform: "Unknown",
      status: "Scheduled",
      notes: "",
      mediaUrl: n.attachments?.image || n.attachments?.video || null,
      dayIndex: index
    });
  });

  render();
}

// leadership link
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

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart); d.setDate(d.getDate() + i);
    const col = document.createElement("div");
    col.className = "day";
    col.innerHTML = `<strong>${d.toDateString().slice(0,10)}</strong>`;

    const todaysItems = items.filter(x => x.dayIndex === i);

    todaysItems.forEach(it => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div>${it.title}</div>
        ${it.mediaUrl ? `<img src="${it.mediaUrl}" class="media" />` : ""}
      `;
      col.appendChild(div);
    });

    cal.appendChild(col);
  }
}
