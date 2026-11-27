const state = {
  data: null,
  tab: "office",
  styleMode: "clay",
  motion: true,
  taskFilter: "active",
  selectedRoom: "chief",
  userMemos: JSON.parse(localStorage.getItem("seungkwon_hq_memos") || "[]"),
};

function switchTab(tabId) {
  state.tab = tabId;
  document.querySelectorAll(".tab-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-panel").forEach((p) => {
    p.classList.toggle("active", p.id === `tab-${tabId}`);
  });
}

function updateRoomQuickCard(roomKey) {
  state.selectedRoom = roomKey;
  const d = state.data;
  const titleEl = document.getElementById("quick-title");
  const badgeEl = document.getElementById("quick-badge");
  const descEl = document.getElementById("quick-desc");
  const goBtn = document.getElementById("quick-go");

  if (!d) return;

  if (roomKey === "chief") {
    titleEl.textContent = "🎯 지휘실 · 씨리얼 본부장";
    badgeEl.textContent = "지휘 중";
    badgeEl.className = "badge online";
    descEl.textContent = `활성 스케줄 ${d.stats.active_schedules}개, 오늘 완료 ${d.stats.today_completed}건을 총괄하고 있어요.`;
    goBtn.onclick = () => switchTab("agents");
  } else if (roomKey === "meeting") {
    const latest = d.briefings?.[0];
    titleEl.textContent = "🏛️ 대회의실 · 최근 보고";
    badgeEl.textContent = `${d.briefings?.length || 0}건`;
    badgeEl.className = "badge online";
    descEl.textContent = latest ? `${latest.title} (${latest.time})` : "최근 보고를 확인해 보세요.";
    goBtn.onclick = () => switchTab("meeting");
  } else if (roomKey === "tasks") {
    const nextRun = d.upcoming_runs?.[0];
    titleEl.textContent = "💻 작업실 · 자동 실행 루틴";
    badgeEl.textContent = `${d.stats.active_schedules}개 가동`;
    badgeEl.className = "badge online";
    descEl.textContent = nextRun ? `다음 실행: ${nextRun.title} (${nextRun.time})` : "가동 중인 스케줄을 확인해 보세요.";
    goBtn.onclick = () => switchTab("tasks");
  } else if (roomKey === "memo") {
    titleEl.textContent = "☕ 라운지 · 대기 메모 & 생활행정";
    badgeEl.textContent = "대기 중";
    badgeEl.className = "badge standby";
    descEl.textContent = `씨리얼 체크리스트 ${d.system_notes?.length || 0}건과 대장님 메모를 관리할 수 있어요.`;
    goBtn.onclick = () => switchTab("memo");
  }
}

function renderAll() {
  const d = state.data;
  if (!d) return;

  document.getElementById("hq-title").textContent = d.hq_name || "승권 대장 본부";
  document.getElementById("owner-label").textContent = d.owner_label || "승권 대장님 전용";
  document.getElementById("hero-headline").textContent = `대장님, 비서 ${d.stats.agents_online}명이 가동 중이에요`;
  document.getElementById("rooms-badge").textContent = `${d.stats.rooms_active}개 방 가동`;
  document.getElementById("agents-badge").textContent = `ON ${d.stats.agents_online}/${d.stats.agents_total}명`;
  document.getElementById("sync-time").textContent = (d.updated_at || "").slice(5, 16);

  updateRoomQuickCard(state.selectedRoom);

  // Briefings
  const bList = document.getElementById("briefing-list");
  document.getElementById("briefing-count").textContent = `${d.briefings.length}건`;
  bList.innerHTML = d.briefings
    .map(
      (b) => `
      <article class="item-card">
        <div class="item-top">
          <h3 class="item-title">${b.title}</h3>
          <span class="badge online">${b.tag}</span>
        </div>
        <div class="item-meta"><span>🕒 ${b.time}</span></div>
        <p class="item-desc">${b.detail}</p>
      </article>
    `
    )
    .join("");

  // Tasks
  renderTasks();

  // Agents
  const aList = document.getElementById("agent-list");
  aList.innerHTML = d.agents
    .map(
      (a) => `
      <article class="agent-card">
        <div class="agent-head">
          <div class="agent-id">
            <div class="agent-emoji">${a.emoji}</div>
            <div>
              <p class="agent-name">${a.name}</p>
              <p class="agent-role">${a.role}</p>
            </div>
          </div>
          <span class="badge ${a.status === "online" ? "online" : "standby"}">${a.status_label}</span>
        </div>
        <div class="item-meta"><span>📍 ${a.room}</span><span>📋 담당 ${a.tasks_count}건</span></div>
        <p class="agent-highlight">${a.highlight}</p>
      </article>
    `
    )
    .join("");

  // Schedule & Calendar
  document.getElementById("cal-sync-badge").textContent =
    d.calendar_sync === "live" ? "Apple Calendar 실시간" : "Apple Calendar 동기화됨";

  document.getElementById("upcoming-list").innerHTML = d.upcoming_runs
    .map(
      (u) => `
      <div class="tl-row">
        <span class="tl-time">${u.time.slice(5)}</span>
        <span class="tl-title">${u.title}</span>
        <span class="tl-tag">${u.type}</span>
      </div>
    `
    )
    .join("");

  const combinedCal = [
    ...d.calendar_events.map((e) => ({
      time: e.start.slice(0, 10),
      title: e.title,
      tag: e.calendar,
    })),
    ...d.milestones.map((m) => ({
      time: m.date,
      title: m.title,
      tag: m.category,
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  document.getElementById("calendar-list").innerHTML = combinedCal
    .map(
      (c) => `
      <div class="tl-row">
        <span class="tl-time">${c.time.slice(5)}</span>
        <span class="tl-title">${c.title}</span>
        <span class="tl-tag">${c.tag}</span>
      </div>
    `
    )
    .join("");

  document.getElementById("connection-list").innerHTML = d.connections
    .map(
      (c) => `
      <div class="conn-card">
        <span>${c.name}</span>
        <span class="badge online">${c.status}</span>
      </div>
    `
    )
    .join("");

  // Memos
  renderMemos();
}

function renderTasks() {
  const d = state.data;
  if (!d) return;
  const filtered = d.tasks.filter((t) => {
    if (state.taskFilter === "all") return true;
    return t.state === state.taskFilter;
  });
  document.getElementById("task-list").innerHTML = filtered
    .map(
      (t) => `
      <article class="item-card">
        <div class="item-top">
          <h3 class="item-title">${t.title}</h3>
          <span class="badge ${t.state === "active" ? "online" : "paused"}">${
        t.state === "active" ? "가동중" : "완료/정지"
      }</span>
        </div>
        <div class="item-meta">
          <span>⏱️ ${t.schedule}</span>
          ${t.last_run ? `<span>최근: ${t.last_run.slice(5)}</span>` : ""}
          ${t.next_run ? `<span>다음: ${t.next_run.slice(5)}</span>` : ""}
        </div>
        <p class="item-desc">${t.summary}</p>
      </article>
    `
    )
    .join("");
}

function renderMemos() {
  const uList = document.getElementById("user-memo-list");
  if (state.userMemos.length === 0) {
    uList.innerHTML = `<div class="memo-item"><span>아직 등록된 메모가 없어요. 위 입력창에 남겨보세요.</span></div>`;
  } else {
    uList.innerHTML = state.userMemos
      .map(
        (m, idx) => `
        <div class="memo-item ${m.done ? "done" : ""}">
          <label class="memo-left">
            <input type="checkbox" ${m.done ? "checked" : ""} data-idx="${idx}" class="memo-chk" />
            <span>${m.text}</span>
          </label>
          <button class="memo-del" data-idx="${idx}" title="삭제">✕</button>
        </div>
      `
      )
      .join("");
  }

  const sList = document.getElementById("system-memo-list");
  sList.innerHTML = (state.data?.system_notes || [])
    .map(
      (n) => `
      <div class="memo-item">
        <span>${n.text}</span>
        <span class="tl-tag">${n.tag}</span>
      </div>
    `
    )
    .join("");
}

async function loadStatus() {
  const liveText = document.getElementById("live-text");
  liveText.textContent = "동기화 중...";
  try {
    const res = await fetch(`data/status.json?t=${Date.now()}`);
    state.data = await res.json();
    renderAll();
    liveText.textContent = "실시간 연결";
  } catch (err) {
    liveText.textContent = "연결 확인 필요";
  }
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

document.querySelectorAll(".map-pin").forEach((pin) => {
  pin.addEventListener("click", () => updateRoomQuickCard(pin.dataset.room));
});

document.getElementById("style-basic").addEventListener("click", () => {
  state.styleMode = "basic";
  document.getElementById("style-basic").classList.add("active");
  document.getElementById("style-clay").classList.remove("active");
  document.getElementById("office-img").src = "assets/office-basic.png";
});

document.getElementById("style-clay").addEventListener("click", () => {
  state.styleMode = "clay";
  document.getElementById("style-clay").classList.add("active");
  document.getElementById("style-basic").classList.remove("active");
  document.getElementById("office-img").src = "assets/office-clay.png";
});

document.getElementById("motion-toggle").addEventListener("click", (e) => {
  state.motion = !state.motion;
  e.currentTarget.classList.toggle("active", state.motion);
  e.currentTarget.textContent = state.motion ? "✨ 움직임 ON" : "✨ 움직임 OFF";
  document.getElementById("office-stage").classList.toggle("motion-on", state.motion);
});

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.taskFilter = btn.dataset.filter;
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderTasks();
  });
});

document.getElementById("memo-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("memo-input");
  const text = input.value.trim();
  if (!text) return;
  state.userMemos.unshift({ text, done: false });
  localStorage.setItem("seungkwon_hq_memos", JSON.stringify(state.userMemos));
  input.value = "";
  renderMemos();
});

document.getElementById("user-memo-list").addEventListener("click", (e) => {
  if (e.target.classList.contains("memo-chk")) {
    const idx = Number(e.target.dataset.idx);
    state.userMemos[idx].done = !state.userMemos[idx].done;
    localStorage.setItem("seungkwon_hq_memos", JSON.stringify(state.userMemos));
    renderMemos();
  } else if (e.target.classList.contains("memo-del")) {
    const idx = Number(e.target.dataset.idx);
    state.userMemos.splice(idx, 1);
    localStorage.setItem("seungkwon_hq_memos", JSON.stringify(state.userMemos));
    renderMemos();
  }
});

document.getElementById("refresh-btn").addEventListener("click", loadStatus);

loadStatus();
