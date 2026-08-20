/* ==========================================================================
   PELICAN-01 COMMAND DECK // CLIENT-SIDE MASTER CONTROLLER v19.0
   ========================================================================== */

const STORAGE_KEYS = {
  GEMINI_KEY: "pelican_gemini_api_key",
  THEME: "pelican_theme",
  TASKS: "pelican_tasks",
  LINKS: "pelican_links",
  STUDY_HOURS: "pelican_study_hours",
  STUDY_TARGET: "pelican_study_target",
  DAILY_VERSE: "pelican_daily_verse",
  STORED_PLAYLISTS: "pelican_custom_playlists",
  CURRENT_PLAYLIST_ID: "pelican_curr_active_playlist",
  FOCUS_DEFAULT_MINS: "pelican_focus_default_mins",
  SELECTED_VOICE: "pelican_selected_voice",
  STUDY_LOG: "pelican_study_log",
  CALLSIGN: "pelican_callsign",
  CRT_ENABLED: "pelican_crt_enabled",
  STARFIELD_ENABLED: "pelican_starfield_enabled"
};

// Keys included in BACKUP / RESTORE. Deliberately excludes GEMINI_KEY (a
// secret you don't want sitting in a shareable JSON file) and DAILY_VERSE
// (a cache that regenerates itself, not worth persisting).
const BACKUP_KEYS = [
  STORAGE_KEYS.THEME,
  STORAGE_KEYS.TASKS,
  STORAGE_KEYS.LINKS,
  STORAGE_KEYS.STUDY_HOURS,
  STORAGE_KEYS.STUDY_TARGET,
  STORAGE_KEYS.STORED_PLAYLISTS,
  STORAGE_KEYS.CURRENT_PLAYLIST_ID,
  STORAGE_KEYS.FOCUS_DEFAULT_MINS,
  STORAGE_KEYS.SELECTED_VOICE,
  STORAGE_KEYS.STUDY_LOG,
  STORAGE_KEYS.CALLSIGN,
  STORAGE_KEYS.CRT_ENABLED,
  STORAGE_KEYS.STARFIELD_ENABLED
];

// --- DEFAULT STATE ---
const defaultLinks = [
  { name: "Canvas LMS", url: "https://canvas.instructure.com" },
  { name: "GitHub", url: "https://github.com" },
  { name: "LeetCode", url: "https://leetcode.com" },
  { name: "Google Scholar", url: "https://scholar.google.com" }
];

const fallbackVerses = [
  { text: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.", ref: "2 Timothy 1:7" },
  { text: "I can do all things through Christ which strengtheneth me.", ref: "Philippians 4:13" },
  { text: "The LORD is my shepherd; I shall not want.", ref: "Psalm 23:1" },
  { text: "Commit thy works unto the LORD, and thy thoughts shall be established.", ref: "Proverbs 16:3" }
];

/* --- SHARED DATE HELPERS (Central Time, matches the HUD clock) --- */
function getCentralDateStr(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const map = {};
  parts.forEach(p => { map[p.type] = p.value; });
  return `${map.year}-${map.month}-${map.day}`;
}

function formatDueLabel(dueStr) {
  const d = new Date(dueStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

function getCallsign() {
  return (localStorage.getItem(STORAGE_KEYS.CALLSIGN) || "COMMANDER").trim().toUpperCase() || "COMMANDER";
}

function applyCallsignToUI() {
  const cs = getCallsign();
  const tag = document.getElementById("hud-callsign-tag");
  if (tag) tag.textContent = `CALLSIGN: ${cs} // LOUISIANA CS FLIGHT DECK`;
  const titleEl = document.querySelector(".hud-title");
  if (titleEl) titleEl.textContent = `PELICAN OS // ${cs}`;
}

/* --- MODAL CONTROLLER --- */
let confirmCallback = null;

function showConfirmModal(title, text, onConfirm) {
  const modal = document.getElementById("confirm-modal");
  document.getElementById("confirm-modal-title").textContent = title;
  document.getElementById("confirm-modal-text").textContent = text;
  confirmCallback = onConfirm;
  modal.classList.add("open");
}

function initModalInfrastructure() {
  const confirmModal = document.getElementById("confirm-modal");
  const confirmCloseBtn = document.getElementById("confirm-modal-close-btn");
  const confirmCancelBtn = document.getElementById("confirm-modal-cancel-btn");
  const confirmOkBtn = document.getElementById("confirm-modal-ok-btn");

  function closeConfirm() {
    confirmModal.classList.remove("open");
    confirmCallback = null;
  }

  confirmCloseBtn.addEventListener("click", closeConfirm);
  confirmCancelBtn.addEventListener("click", closeConfirm);
  confirmOkBtn.addEventListener("click", () => {
    if (confirmCallback) confirmCallback();
    closeConfirm();
  });

  // Timer Set Mins Modal
  const timerModal = document.getElementById("timer-modal");
  const timerCloseBtn = document.getElementById("timer-modal-close-btn");
  const timerSaveBtn = document.getElementById("timer-modal-save-btn");
  const timerInput = document.getElementById("timer-minutes-input");

  document.getElementById("timer-set-btn").addEventListener("click", () => {
    timerInput.value = localStorage.getItem(STORAGE_KEYS.FOCUS_DEFAULT_MINS) || "25";
    timerModal.classList.add("open");
    timerInput.focus();
  });

  timerCloseBtn.addEventListener("click", () => timerModal.classList.remove("open"));
  timerSaveBtn.addEventListener("click", () => {
    const parsed = parseInt(timerInput.value, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setReactorDuration(parsed);
    }
    timerModal.classList.remove("open");
  });

  // API Key Modal
  const apiModal = document.getElementById("api-modal");
  const apiCloseBtn = document.getElementById("api-modal-close-btn");
  const apiSaveBtn = document.getElementById("api-modal-save-btn");
  const apiKeyInput = document.getElementById("api-key-input");

  document.getElementById("api-btn").addEventListener("click", () => {
    apiKeyInput.value = localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || "";
    apiModal.classList.add("open");
    apiKeyInput.focus();
  });

  apiCloseBtn.addEventListener("click", () => apiModal.classList.remove("open"));
  apiSaveBtn.addEventListener("click", () => {
    const keyVal = apiKeyInput.value.trim();
    localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, keyVal);
    apiModal.classList.remove("open");
  });

  // Pilot Config / Personalization Modal
  const pilotModal = document.getElementById("pilot-modal");
  const pilotCloseBtn = document.getElementById("pilot-modal-close-btn");
  const pilotSaveBtn = document.getElementById("pilot-modal-save-btn");
  const callsignInput = document.getElementById("pilot-callsign-input");
  const crtToggle = document.getElementById("crt-toggle");
  const starfieldToggle = document.getElementById("starfield-toggle");

  document.getElementById("pilot-btn").addEventListener("click", () => {
    callsignInput.value = localStorage.getItem(STORAGE_KEYS.CALLSIGN) || "COMMANDER";
    crtToggle.checked = (localStorage.getItem(STORAGE_KEYS.CRT_ENABLED) ?? "true") === "true";
    starfieldToggle.checked = (localStorage.getItem(STORAGE_KEYS.STARFIELD_ENABLED) ?? "true") === "true";
    pilotModal.classList.add("open");
    callsignInput.focus();
  });

  pilotCloseBtn.addEventListener("click", () => pilotModal.classList.remove("open"));
  pilotSaveBtn.addEventListener("click", () => {
    const cs = callsignInput.value.trim() || "COMMANDER";
    localStorage.setItem(STORAGE_KEYS.CALLSIGN, cs);
    localStorage.setItem(STORAGE_KEYS.CRT_ENABLED, crtToggle.checked ? "true" : "false");
    localStorage.setItem(STORAGE_KEYS.STARFIELD_ENABLED, starfieldToggle.checked ? "true" : "false");
    applyCallsignToUI();
    applyVisualToggles();
    pilotModal.classList.remove("open");
  });
}

/* --- STARFIELD ANIMATION CANVAS --- */
let starfieldRunning = true;
let starfieldRaf = null;
let starfieldStartLoop = null; // set by initStarfield so toggles can restart it

function initStarfield() {
  const canvas = document.getElementById("starfield");
  const ctx = canvas.getContext("2d");
  let stars = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.5,
      speed: Math.random() * 0.4 + 0.1
    }));
  }

  function render() {
    if (!starfieldRunning) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    stars.forEach(s => {
      ctx.fillRect(s.x, s.y, s.size, s.size);
      s.y += s.speed;
      if (s.y > canvas.height) s.y = 0;
    });
    starfieldRaf = requestAnimationFrame(render);
  }

  starfieldStartLoop = () => {
    if (starfieldRaf) cancelAnimationFrame(starfieldRaf);
    starfieldRunning = true;
    canvas.style.display = "";
    resize();
    render();
  };

  window.addEventListener("resize", resize);
  resize();
  const enabled = (localStorage.getItem(STORAGE_KEYS.STARFIELD_ENABLED) ?? "true") === "true";
  starfieldRunning = enabled;
  if (enabled) render();
  else canvas.style.display = "none";
}

function applyVisualToggles() {
  const crtOn = (localStorage.getItem(STORAGE_KEYS.CRT_ENABLED) ?? "true") === "true";
  const starOn = (localStorage.getItem(STORAGE_KEYS.STARFIELD_ENABLED) ?? "true") === "true";
  const overlay = document.querySelector(".crt-overlay");
  if (overlay) overlay.style.display = crtOn ? "" : "none";

  const canvas = document.getElementById("starfield");
  if (!canvas) return;

  if (starOn) {
    if (typeof starfieldStartLoop === "function") starfieldStartLoop();
  } else {
    starfieldRunning = false;
    if (starfieldRaf) cancelAnimationFrame(starfieldRaf);
    canvas.style.display = "none";
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/* --- CLOCK & CALENDAR (12-HOUR CENTRAL TIME) --- */
function initClock() {
  const clockEl = document.getElementById("clock");
  const dateEl = document.getElementById("date");

  function update() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString("en-US", {
      timeZone: "America/Chicago",
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    dateEl.textContent = now.toLocaleDateString("en-US", {
      timeZone: "America/Chicago",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    }).toUpperCase() + " // CST";
  }
  setInterval(update, 1000);
  update();
}

/* --- KJV SCRIPTURE ENGINE --- */
async function initVerse() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const cached = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_VERSE) || "{}");
  if (cached.date === todayStr && cached.verse) {
    displayVerse(cached.verse);
    return;
  }
  fetchNewVerse();
}

async function fetchNewVerse() {
  const todayStr = new Date().toISOString().slice(0, 10);
  try {
    const res = await fetch("https://bible-api.com/?random=verse&translation=kjv");
    const data = await res.json();
    const verseObj = { text: data.text.trim().replace(/\n/g, " "), ref: data.reference };
    localStorage.setItem(STORAGE_KEYS.DAILY_VERSE, JSON.stringify({ date: todayStr, verse: verseObj }));
    displayVerse(verseObj);
  } catch (err) {
    const randomFallback = fallbackVerses[Math.floor(Math.random() * fallbackVerses.length)];
    displayVerse(randomFallback);
  }
}

function displayVerse(v) {
  document.getElementById("kjv-text").textContent = `"${v.text}"`;
  document.getElementById("kjv-ref").textContent = `— ${v.ref}`;
}

/* --- STUDY LOG (7-DAY TREND) --- */
function logStudyLogEntry(hoursToAdd) {
  if (!hoursToAdd || hoursToAdd <= 0) return;
  const log = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDY_LOG) || "{}");
  const today = getCentralDateStr();
  log[today] = parseFloat(((log[today] || 0) + hoursToAdd).toFixed(2));
  localStorage.setItem(STORAGE_KEYS.STUDY_LOG, JSON.stringify(log));
  renderTrendChart();
}

function renderTrendChart() {
  const container = document.getElementById("trend-chart");
  if (!container) return;
  const log = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDY_LOG) || "{}");
  const todayKey = getCentralDateStr();

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = getCentralDateStr(d);
    const label = d.toLocaleDateString("en-US", { timeZone: "America/Chicago", weekday: "narrow" });
    days.push({ key, label, hours: log[key] || 0 });
  }

  const maxHours = Math.max(2, ...days.map(d => d.hours));

  container.innerHTML = days.map(d => {
    const pct = Math.min(100, Math.round((d.hours / maxHours) * 100));
    const isToday = d.key === todayKey;
    return `
      <div class="trend-col ${isToday ? "trend-today" : ""}" title="${d.hours.toFixed(1)} hrs">
        <div class="trend-bar-track"><div class="trend-bar-fill" style="height:${pct}%;"></div></div>
        <span class="trend-day-label">${d.label}</span>
      </div>
    `;
  }).join("");
}

/* --- CORE REACTOR (POMODORO & FOCUS TIME) --- */
let timerInterval = null;
let defaultMinutes = parseInt(localStorage.getItem(STORAGE_KEYS.FOCUS_DEFAULT_MINS) || "25", 10);
let timerSeconds = defaultMinutes * 60;
let isTimerRunning = false;

function setReactorDuration(mins) {
  defaultMinutes = mins;
  localStorage.setItem(STORAGE_KEYS.FOCUS_DEFAULT_MINS, defaultMinutes.toString());
  if (!isTimerRunning) {
    timerSeconds = defaultMinutes * 60;
    const m = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
    const s = String(timerSeconds % 60).padStart(2, "0");
    document.getElementById("timer-readout").textContent = `${m}:${s}`;
  }
}

function toggleReactorTimer() {
  const readout = document.getElementById("timer-readout");
  const toggleBtn = document.getElementById("timer-toggle-btn");
  const modeBadge = document.getElementById("reactor-mode");

  if (isTimerRunning) {
    clearInterval(timerInterval);
    isTimerRunning = false;
    toggleBtn.textContent = "RESUME";
    modeBadge.textContent = "PAUSED";
  } else {
    isTimerRunning = true;
    toggleBtn.textContent = "HOLD";
    modeBadge.textContent = "ACTIVE FOCUS";
    timerInterval = setInterval(() => {
      if (timerSeconds > 0) {
        timerSeconds--;
        const m = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
        const s = String(timerSeconds % 60).padStart(2, "0");
        readout.textContent = `${m}:${s}`;
      } else {
        clearInterval(timerInterval);
        isTimerRunning = false;

        const sessionHours = parseFloat((defaultMinutes / 60).toFixed(2));
        let hours = parseFloat(localStorage.getItem(STORAGE_KEYS.STUDY_HOURS) || "0.0");
        hours += sessionHours;
        localStorage.setItem(STORAGE_KEYS.STUDY_HOURS, hours.toString());
        logStudyLogEntry(sessionHours);

        let target = parseInt(localStorage.getItem(STORAGE_KEYS.STUDY_TARGET) || "40", 10);
        document.getElementById("hours-label").textContent = `${hours.toFixed(1)} / ${target}.0 HRS`;
        document.getElementById("study-progress-bar").style.width = `${Math.min(100, (hours / target) * 100)}%`;

        timerSeconds = defaultMinutes * 60;
        readout.textContent = `${String(defaultMinutes).padStart(2, "0")}:00`;
        toggleBtn.textContent = "ENGAGE FOCUS";
        modeBadge.textContent = "IDLE";
      }
    }, 1000);
  }
}

function initReactor() {
  const readout = document.getElementById("timer-readout");
  const toggleBtn = document.getElementById("timer-toggle-btn");
  const resetBtn = document.getElementById("timer-reset-btn");
  const logHourBtn = document.getElementById("log-hour-btn");
  const targetToggleBtn = document.getElementById("target-toggle-btn");
  const resetWeekBtn = document.getElementById("reset-week-btn");

  let hours = parseFloat(localStorage.getItem(STORAGE_KEYS.STUDY_HOURS) || "0.0");
  let target = parseInt(localStorage.getItem(STORAGE_KEYS.STUDY_TARGET) || "40", 10);

  function updateOdometer() {
    document.getElementById("hours-label").textContent = `${hours.toFixed(1)} / ${target}.0 HRS`;
    const pct = Math.min(100, (hours / target) * 100);
    document.getElementById("study-progress-bar").style.width = `${pct}%`;
    targetToggleBtn.textContent = `TARGET: ${target}H`;
  }

  readout.textContent = `${String(defaultMinutes).padStart(2, "0")}:00`;

  logHourBtn.addEventListener("click", () => {
    hours += 1.0;
    localStorage.setItem(STORAGE_KEYS.STUDY_HOURS, hours.toString());
    logStudyLogEntry(1.0);
    updateOdometer();
  });

  targetToggleBtn.addEventListener("click", () => {
    target = target === 40 ? 60 : 40;
    localStorage.setItem(STORAGE_KEYS.STUDY_TARGET, target.toString());
    updateOdometer();
  });

  resetWeekBtn.addEventListener("click", () => {
    showConfirmModal("RESET WEEK LOAD", "Confirm resetting weekly study log back to 0.0 HRS? (Your 7-day trend history is kept.)", () => {
      hours = 0.0;
      localStorage.setItem(STORAGE_KEYS.STUDY_HOURS, "0.0");
      updateOdometer();
    });
  });

  toggleBtn.addEventListener("click", toggleReactorTimer);

  resetBtn.addEventListener("click", () => {
    clearInterval(timerInterval);
    isTimerRunning = false;
    timerSeconds = defaultMinutes * 60;
    readout.textContent = `${String(defaultMinutes).padStart(2, "0")}:00`;
    toggleBtn.textContent = "ENGAGE FOCUS";
    document.getElementById("reactor-mode").textContent = "IDLE";
  });

  updateOdometer();
  renderTrendChart();
}

/* --- NAV COMPUTER --- */
function initLinks() {
  const container = document.getElementById("links-container");
  const addBtn = document.getElementById("add-link-btn");
  const editModeBtn = document.getElementById("toggle-edit-mode-btn");

  const modal = document.getElementById("link-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const modalSaveBtn = document.getElementById("modal-save-btn");
  const nameInput = document.getElementById("modal-link-name");
  const urlInput = document.getElementById("modal-link-url");
  const idxInput = document.getElementById("modal-link-index");

  let links = JSON.parse(localStorage.getItem(STORAGE_KEYS.LINKS) || "null") || defaultLinks;
  let isEditMode = false;

  function render() {
    container.innerHTML = "";
    links.forEach((l, idx) => {
      let domain = "google.com";
      try { domain = new URL(l.url).hostname; } catch(e) {}

      const card = document.createElement("a");
      card.className = "nav-card-compact";
      card.href = isEditMode ? "javascript:void(0);" : l.url;
      if (!isEditMode) card.target = "_blank";

      card.innerHTML = `
        <img class="nav-icon-sm" src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" alt="">
        <span class="nav-name-compact" title="${l.name}">${l.name}</span>
        <div class="nav-actions-edit">
          <button class="hud-btn-sm" onclick="openEditModal(${idx}); event.stopPropagation();">EDIT</button>
          <button class="hud-btn-sm hud-btn-accent" onclick="deleteLink(${idx}); event.stopPropagation();">X</button>
        </div>
      `;
      container.appendChild(card);
    });

    if (isEditMode) {
      container.classList.add("edit-mode-active");
    } else {
      container.classList.remove("edit-mode-active");
    }

    localStorage.setItem(STORAGE_KEYS.LINKS, JSON.stringify(links));
  }

  editModeBtn.addEventListener("click", () => {
    isEditMode = !isEditMode;
    editModeBtn.classList.toggle("hud-btn-active", isEditMode);
    editModeBtn.textContent = isEditMode ? "DONE" : "EDIT";
    render();
  });

  function openModal(idx = -1) {
    idxInput.value = idx;
    if (idx >= 0) {
      modalTitle.textContent = `CONFIG // ${links[idx].name.toUpperCase()}`;
      nameInput.value = links[idx].name;
      urlInput.value = links[idx].url;
    } else {
      modalTitle.textContent = "REGISTER NEW PORTAL";
      nameInput.value = "";
      urlInput.value = "";
    }
    modal.classList.add("open");
    nameInput.focus();
  }

  function closeModal() {
    modal.classList.remove("open");
  }

  window.openEditModal = (idx) => openModal(idx);

  window.deleteLink = (idx) => {
    showConfirmModal("DELETE PORTAL", `Remove portal '${links[idx].name}' from Nav Computer?`, () => {
      links.splice(idx, 1);
      render();
    });
  };

  addBtn.addEventListener("click", () => openModal(-1));
  modalCloseBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  modalSaveBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    let url = urlInput.value.trim();
    const idx = parseInt(idxInput.value, 10);

    if (!name || !url) return;

    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    if (idx >= 0) {
      links[idx] = { name, url };
    } else {
      links.push({ name, url });
    }

    closeModal();
    render();
  });

  render();
}

/* --- MISSION LOG (TASKS) --- */
function logNewTask(text, priority = "NORMAL", due = "", course = "") {
  let tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
  tasks.push({
    text: text.trim(),
    priority,
    done: false,
    due: due || null,
    course: course.trim() || null
  });
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById("task-list");
  const countEl = document.getElementById("task-count");
  const overdueEl = document.getElementById("overdue-count");
  let tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
  const todayStr = getCentralDateStr();

  const sorted = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const ad = a.due || "9999-99-99";
    const bd = b.due || "9999-99-99";
    return ad.localeCompare(bd);
  });

  list.innerHTML = "";
  sorted.forEach((t) => {
    const i = tasks.indexOf(t);
    const isOverdue = !!(t.due && !t.done && t.due < todayStr);
    const isDueToday = !!(t.due && !t.done && t.due === todayStr);

    const li = document.createElement("li");
    li.className = `task-item ${t.priority} ${t.done ? "done" : ""} ${isOverdue ? "overdue" : ""}`;

    const courseTag = t.course ? `<span class="task-course-tag">${t.course}</span>` : "";
    let dueTag = "";
    if (t.due) {
      const dueClass = isOverdue ? "overdue" : isDueToday ? "due-today" : "";
      const dueText = isOverdue ? "OVERDUE" : isDueToday ? "DUE TODAY" : formatDueLabel(t.due);
      dueTag = `<span class="task-due-tag ${dueClass}">${dueText}</span>`;
    }

    li.innerHTML = `
      <div class="task-main">
        <span class="task-text">[${t.priority}] ${t.text}</span>
        <div class="task-tags">${courseTag}${dueTag}</div>
      </div>
      <div class="task-actions">
        <button class="hud-btn-sm" onclick="toggleTask(${i})">${t.done ? 'UNDO' : 'DONE'}</button>
        <button class="hud-btn-sm" onclick="removeTask(${i})">X</button>
      </div>
    `;
    list.appendChild(li);
  });

  const active = tasks.filter(t => !t.done).length;
  const overdue = tasks.filter(t => !t.done && t.due && t.due < todayStr).length;
  countEl.textContent = `${active} ACTIVE`;
  if (overdueEl) {
    overdueEl.textContent = `${overdue} OVERDUE`;
    overdueEl.style.display = overdue > 0 ? "inline-block" : "none";
  }
}

function initTasks() {
  const input = document.getElementById("task-input");
  const courseInput = document.getElementById("task-course");
  const dueInput = document.getElementById("task-due");
  const prio = document.getElementById("task-priority");
  const addBtn = document.getElementById("add-task-btn");

  window.toggleTask = (i) => {
    let tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
    tasks[i].done = !tasks[i].done;
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    renderTasks();
  };

  window.removeTask = (i) => {
    let tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
    tasks.splice(i, 1);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    renderTasks();
  };

  function handleAdd() {
    if (input.value.trim()) {
      logNewTask(input.value.trim(), prio.value, dueInput.value, courseInput.value);
      input.value = "";
      courseInput.value = "";
      dueInput.value = "";
      input.focus();
    }
  }

  addBtn.addEventListener("click", handleAdd);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleAdd();
  });

  renderTasks();
}

/* --- PLAYLIST DECK CONTROLLER --- */
let customPlaylists = JSON.parse(localStorage.getItem(STORAGE_KEYS.STORED_PLAYLISTS) || "[]");

function sanitizePlaylistId(input) {
  let val = input.trim();
  if (val.includes("list=")) {
    try {
      val = val.split("list=")[1].split("&")[0];
    } catch (e) {}
  }
  return val;
}

function loadPlaylistIframe(playlistId) {
  const iframe = document.getElementById("playlist-iframe");
  const statusBadge = document.getElementById("audio-status");
  if (!playlistId) return;

  const cleanId = sanitizePlaylistId(playlistId);
  iframe.src = `https://www.youtube.com/embed/videoseries?list=${cleanId}&autoplay=1`;
  statusBadge.textContent = "BROADCASTING";
}

function initAudioDeck() {
  const openModalBtn = document.getElementById("open-playlist-modal-btn");
  const trackTitle = document.getElementById("track-title");
  const cardsGrid = document.getElementById("playlist-cards-grid");

  const modal = document.getElementById("playlist-modal");
  const modalTitle = document.getElementById("pl-modal-title");
  const modalCloseBtn = document.getElementById("pl-modal-close-btn");
  const modalSaveBtn = document.getElementById("pl-modal-save-btn");
  const labelInput = document.getElementById("modal-playlist-label");
  const urlInput = document.getElementById("modal-playlist-url");
  const idxInput = document.getElementById("modal-playlist-index");

  function renderPlaylistCards() {
    cardsGrid.innerHTML = "";
    const activeId = localStorage.getItem(STORAGE_KEYS.CURRENT_PLAYLIST_ID);

    if (customPlaylists.length === 0) {
      cardsGrid.innerHTML = `<div style="font-size: 0.72rem; color: var(--text-muted); padding: 0.5rem;">NO PLAYLISTS STORED. CLICK '+ ADD PLAYLIST' TO CONFIGURE.</div>`;
      return;
    }

    customPlaylists.forEach((item, idx) => {
      const card = document.createElement("div");
      card.className = `playlist-card ${item.id === activeId ? 'active-pl' : ''}`;

      card.innerHTML = `
        <div class="playlist-info">
          <span class="playlist-name">${item.label}</span>
          <span class="playlist-id-text">ID: ${item.id}</span>
        </div>
        <div class="playlist-actions">
          <button class="hud-btn-sm" onclick="tunePlaylist('${item.id}', '${item.label}')">LOAD</button>
          <button class="hud-btn-sm" onclick="openPlaylistEditModal(${idx})">EDIT</button>
          <button class="hud-btn-sm hud-btn-accent" onclick="deletePlaylist(${idx})">X</button>
        </div>
      `;
      cardsGrid.appendChild(card);
    });

    localStorage.setItem(STORAGE_KEYS.STORED_PLAYLISTS, JSON.stringify(customPlaylists));
  }

  window.tunePlaylist = (id, label) => {
    const cleanId = sanitizePlaylistId(id);
    localStorage.setItem(STORAGE_KEYS.CURRENT_PLAYLIST_ID, cleanId);
    loadPlaylistIframe(cleanId);
    trackTitle.textContent = `${label.toUpperCase()}`;
    renderPlaylistCards();
  };

  window.deletePlaylist = (idx) => {
    showConfirmModal("REMOVE PLAYLIST", `Delete '${customPlaylists[idx].label}' from Deck?`, () => {
      const deletedId = customPlaylists[idx].id;
      customPlaylists.splice(idx, 1);
      if (localStorage.getItem(STORAGE_KEYS.CURRENT_PLAYLIST_ID) === deletedId) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_PLAYLIST_ID);
        document.getElementById("playlist-iframe").src = "";
        trackTitle.textContent = "NO PLAYLIST LOADED";
        document.getElementById("audio-status").textContent = "STANDBY";
      }
      renderPlaylistCards();
    });
  };

  function openPlModal(idx = -1) {
    idxInput.value = idx;
    if (idx >= 0) {
      modalTitle.textContent = `CONFIG // ${customPlaylists[idx].label.toUpperCase()}`;
      labelInput.value = customPlaylists[idx].label;
      urlInput.value = customPlaylists[idx].id;
    } else {
      modalTitle.textContent = "REGISTER NEW PLAYLIST";
      labelInput.value = "";
      urlInput.value = "";
    }
    modal.classList.add("open");
    labelInput.focus();
  }

  function closePlModal() {
    modal.classList.remove("open");
  }

  window.openPlaylistEditModal = (idx) => openPlModal(idx);

  openModalBtn.addEventListener("click", () => openPlModal(-1));
  modalCloseBtn.addEventListener("click", closePlModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closePlModal(); });

  modalSaveBtn.addEventListener("click", () => {
    const label = labelInput.value.trim();
    const rawUrl = urlInput.value.trim();
    const idx = parseInt(idxInput.value, 10);

    if (!label || !rawUrl) return;

    const cleanId = sanitizePlaylistId(rawUrl);

    if (idx >= 0) {
      customPlaylists[idx] = { label, id: cleanId };
    } else {
      customPlaylists.push({ label, id: cleanId });
    }

    localStorage.setItem(STORAGE_KEYS.STORED_PLAYLISTS, JSON.stringify(customPlaylists));
    tunePlaylist(cleanId, label);
    closePlModal();
  });

  // Starts clean — no default playlist. Add your own via "+ ADD PLAYLIST".
  renderPlaylistCards();

  const activeId = localStorage.getItem(STORAGE_KEYS.CURRENT_PLAYLIST_ID);
  if (activeId) {
    const match = customPlaylists.find(p => p.id === activeId);
    tunePlaylist(activeId, match ? match.label : "ACTIVE PLAYLIST");
  } else if (customPlaylists.length > 0) {
    tunePlaylist(customPlaylists[0].id, customPlaylists[0].label);
  }
}

/* --- BACKUP / RESTORE --- */
function exportBackup() {
  const data = {};
  BACKUP_KEYS.forEach(key => {
    const val = localStorage.getItem(key);
    if (val !== null) data[key] = val;
  });

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = getCentralDateStr();
  a.href = url;
  a.download = `pelican-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  showBackupStatus("Backup downloaded.", false);
}

function applyRestore(data) {
  let restoredCount = 0;
  BACKUP_KEYS.forEach(key => {
    if (typeof data[key] === "string") {
      localStorage.setItem(key, data[key]);
      restoredCount++;
    }
  });
  if (restoredCount === 0) {
    showBackupStatus("No recognized data in that file.", true);
    return;
  }
  location.reload();
}

function showBackupStatus(msg, isError) {
  const el = document.getElementById("backup-status");
  if (!el) return;
  el.textContent = msg;
  el.className = `backup-status ${isError ? "backup-status-error" : ""}`;
  clearTimeout(showBackupStatus._t);
  showBackupStatus._t = setTimeout(() => { el.textContent = ""; }, 5000);
}

function initBackupRestore() {
  const backupBtn = document.getElementById("backup-btn");
  const restoreBtn = document.getElementById("restore-btn");
  const fileInput = document.getElementById("restore-file-input");

  backupBtn.addEventListener("click", exportBackup);

  restoreBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        showConfirmModal(
          "RESTORE BACKUP",
          "This will overwrite current tasks, hours, links, playlists, and theme with the contents of this file. This cannot be undone. Continue?",
          () => applyRestore(data)
        );
      } catch (err) {
        showBackupStatus("Invalid backup file.", true);
      }
      fileInput.value = "";
    };
    reader.readAsText(file);
  });
}

/* --- FULL SHIP VOICE COMMAND CONTROLLER --- */
function initFlightComputer() {
  const voiceBtn = document.getElementById("voice-btn");
  const briefingBtn = document.getElementById("briefing-btn");
  const toggleHintsBtn = document.getElementById("toggle-hints-btn");
  const hintsDrawer = document.getElementById("cmd-hints-drawer");
  const statusEl = document.getElementById("ai-status");
  const responseEl = document.getElementById("ai-response");
  const vis = document.getElementById("visualizer");
  const voiceSelect = document.getElementById("voice-select");

  let availableVoices = [];
  let isListening = false;
  let recInstance = null;

  toggleHintsBtn.addEventListener("click", () => {
    hintsDrawer.classList.toggle("open");
  });

  function populateVoices() {
    if (!('speechSynthesis' in window)) return;
    availableVoices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith("en"));
    voiceSelect.innerHTML = "";

    const savedVoiceName = localStorage.getItem(STORAGE_KEYS.SELECTED_VOICE);
    let selectedIdx = 0;

    availableVoices.forEach((v, idx) => {
      const opt = document.createElement("option");
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang})`;
      if (savedVoiceName && v.name === savedVoiceName) selectedIdx = idx;
      else if (!savedVoiceName && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Aria") || v.name.includes("Guy"))) {
        selectedIdx = idx;
      }
      voiceSelect.appendChild(opt);
    });

    if (availableVoices.length > 0) {
      voiceSelect.selectedIndex = selectedIdx;
    }
  }

  if ('speechSynthesis' in window) {
    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;
    voiceSelect.addEventListener("change", () => {
      localStorage.setItem(STORAGE_KEYS.SELECTED_VOICE, voiceSelect.value);
    });
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (recInstance && isListening) recInstance.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    const currentVoice = availableVoices.find(v => v.name === voiceSelect.value);
    if (currentVoice) utterance.voice = currentVoice;
    utterance.pitch = 1.0;
    utterance.rate = 1.05;
    vis.classList.add("active-voice");
    utterance.onend = () => vis.classList.remove("active-voice");
    window.speechSynthesis.speak(utterance);
  }

  function processFlightCommand(query) {
    const q = query.toLowerCase().trim();
    const callsign = getCallsign();
    responseEl.textContent = `${callsign}: "${query}"`;

    // 1. Status Briefing
    if (q.includes("status") || q.includes("briefing") || q.includes("report")) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" });
      const hours = localStorage.getItem(STORAGE_KEYS.STUDY_HOURS) || "0.0";
      const target = localStorage.getItem(STORAGE_KEYS.STUDY_TARGET) || "40";
      const tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]").filter(t => !t.done);
      const todayStr = getCentralDateStr();
      const overdueCount = tasks.filter(t => t.due && t.due < todayStr).length;

      const msg = `PELICAN nominal. Time is ${timeStr} Central. ${hours} of ${target} study hours logged. ${tasks.length} active objectives, ${overdueCount} overdue. Ready when you are, ${callsign}.`;
      responseEl.textContent = msg; speak(msg); return;
    }

    // 2. Core Reactor (Timer Controls)
    if (q.includes("start timer") || q.includes("engage focus") || q.includes("start focus")) {
      if (!isTimerRunning) toggleReactorTimer();
      const msg = "Focus reactor sprint engaged.";
      responseEl.textContent = msg; speak(msg); return;
    }

    if (q.includes("hold timer") || q.includes("pause timer")) {
      if (isTimerRunning) toggleReactorTimer();
      const msg = "Focus reactor paused.";
      responseEl.textContent = msg; speak(msg); return;
    }

    if (q.includes("reset timer")) {
      document.getElementById("timer-reset-btn").click();
      const msg = "Focus reactor reset.";
      responseEl.textContent = msg; speak(msg); return;
    }

    const timerMatch = q.match(/(?:set timer|focus for|timer for)\s+(\d+)\s*(?:minutes|mins)?/);
    if (timerMatch) {
      const mins = parseInt(timerMatch[1], 10);
      setReactorDuration(mins);
      const msg = `Reactor calibrated to ${mins} minutes.`;
      responseEl.textContent = msg; speak(msg); return;
    }

    // 3. Study Odometer / Work Hours
    if (q.includes("log hour") || q.includes("add hour")) {
      document.getElementById("log-hour-btn").click();
      const hours = localStorage.getItem(STORAGE_KEYS.STUDY_HOURS) || "0.0";
      const msg = `Hour logged. Total weekly load: ${hours} hours.`;
      responseEl.textContent = msg; speak(msg); return;
    }

    if (q.includes("reset week")) {
      document.getElementById("reset-week-btn").click();
      return;
    }

    // 4. Scripture
    if (q.includes("verse") || q.includes("scripture") || q.includes("bible")) {
      const vText = document.getElementById("kjv-text").textContent;
      const vRef = document.getElementById("kjv-ref").textContent;
      responseEl.textContent = `${vText} ${vRef}`;
      speak(`${vText} ${vRef}`); return;
    }

    // 5. Mission Tasks
    if (q.startsWith("add task ") || q.startsWith("new task ")) {
      const taskText = q.replace(/^(add task|new task)\s+/, "");
      logNewTask(taskText, "NORMAL");
      const msg = `Objective saved: ${taskText}`;
      responseEl.textContent = msg; speak(msg); return;
    }

    // 6. Search / Lookup (Zero API cost)
    if (q.startsWith("search for ") || q.startsWith("google ") || q.startsWith("look up ")) {
      const term = q.replace(/^(search for|google|look up)\s+/, "");
      window.open(`https://www.google.com/search?q=${encodeURIComponent(term)}`, "_blank");
      const msg = `Searching data feed for: ${term}.`;
      responseEl.textContent = msg; speak(msg); return;
    }

    // 6.5 Backup
    if (q.includes("backup") || q.includes("export data")) {
      exportBackup();
      const msg = "Data backup exported to downloads.";
      responseEl.textContent = msg; speak(msg); return;
    }

    // 7. Fallback to Gemini AI for complex CS reasoning
    queryGeminiAI(query);
  }

  async function queryGeminiAI(promptText) {
    const apiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_KEY);
    if (!apiKey) {
      const msg = `Order acknowledged, ${getCallsign()}. (Add API Key in top right for complex queries).`;
      responseEl.textContent = msg; speak("Order acknowledged."); return;
    }

    responseEl.textContent = "PELICAN neural bridge processing...";

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const callsign = getCallsign();
      const payload = {
        contents: [{
          role: "user",
          parts: [{
            text: `You are PELICAN-01, an onboard AI command computer for an online Computer Science student in Louisiana. Address the user directly as ${callsign}. Give a sharp, witty, gritty, and direct response (1-2 sentences max) answering the student's exact query. Query: ${promptText}`
          }]
        }],
        generationConfig: { maxOutputTokens: 100, temperature: 0.5 }
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = data.candidates[0].content.parts[0].text.trim();
        responseEl.textContent = text;
        speak(text);
      } else {
        throw new Error("No answer generated.");
      }
    } catch (e) {
      const msg = `Command processed.`;
      responseEl.textContent = msg; speak(msg);
    }
  }

  briefingBtn.addEventListener("click", () => {
    processFlightCommand("status briefing");
  });

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    recInstance = new SpeechRec();
    recInstance.continuous = false;
    recInstance.interimResults = false;

    recInstance.onstart = () => {
      isListening = true;
      statusEl.textContent = "LISTENING... [SPEAK COMMAND]";
      vis.classList.add("active-voice");
      voiceBtn.classList.add("hud-btn-active");
    };

    recInstance.onend = () => {
      isListening = false;
      statusEl.textContent = "STANDBY // HOLD [RIGHT CTRL] OR CLICK TALK";
      vis.classList.remove("active-voice");
      voiceBtn.classList.remove("hud-btn-active");
    };

    recInstance.onresult = (e) => {
      if (e.results && e.results[0] && e.results[0].isFinal) {
        const transcript = e.results[0][0].transcript;
        processFlightCommand(transcript);
      }
    };

    function startListening() {
      if (!isListening) {
        try { recInstance.start(); } catch(e) {}
      }
    }

    function stopListening() {
      if (isListening) {
        try { recInstance.stop(); } catch(e) {}
      }
    }

    voiceBtn.addEventListener("mousedown", startListening);
    voiceBtn.addEventListener("mouseup", stopListening);

    window.addEventListener("keydown", (e) => {
      if (e.code === "ControlRight" && !e.repeat) {
        startListening();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "ControlRight") {
        stopListening();
      }
    });
  } else {
    statusEl.textContent = "VOICE UNSUPPORTED IN THIS BROWSER // USE TEXT COMMANDS BELOW";
  }

  document.getElementById("read-verse-btn").addEventListener("click", () => {
    speak(`${document.getElementById("kjv-text").textContent} ${document.getElementById("kjv-ref").textContent}`);
  });
  document.getElementById("refresh-verse-btn").addEventListener("click", fetchNewVerse);
}

/* --- TERMINAL COMMAND CONSOLE --- */
function initTerminal() {
  const drawer = document.getElementById("terminal-drawer");
  const input = document.getElementById("terminal-input");
  const logs = document.getElementById("terminal-output");

  function log(msg) {
    const line = document.createElement("div");
    line.textContent = `> ${msg}`;
    logs.appendChild(line);
    logs.scrollTop = logs.scrollHeight;
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "~" || e.key === "`") {
      e.preventDefault();
      drawer.classList.toggle("open");
      if (drawer.classList.contains("open")) input.focus();
    }
    if (e.key === "Escape" && drawer.classList.contains("open")) {
      drawer.classList.remove("open");
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = input.value.trim();
      input.value = "";
      log(val);
      const [cmd, ...args] = val.split(" ");
      switch(cmd.toLowerCase()) {
        case "help":
          log("PELICAN Commands: status, clear, mins [N], search [query], theme [cyber|matrix|lcars|deepspace|synthwave|terminal|ember|arctic|bayou], backup, restore");
          break;
        case "status":
          log("PELICAN-01 Status: Systems nominal. Central Time synced. Reactor online.");
          break;
        case "mins":
          if (args[0] && !isNaN(parseInt(args[0], 10))) {
            setReactorDuration(parseInt(args[0], 10));
            log(`Sprint duration calibrated to ${args[0]} minutes.`);
          }
          break;
        case "search":
          if (args.length > 0) {
            const q = args.join(" ");
            window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank");
            log(`Searching Google for: ${q}`);
          }
          break;
        case "backup":
          exportBackup();
          log("Backup exported to downloads.");
          break;
        case "restore":
          document.getElementById("restore-file-input").click();
          log("Select a backup file to restore.");
          break;
        case "clear":
          logs.innerHTML = "";
          break;
        case "theme":
          if (args[0]) setTheme(args[0]);
          break;
        default:
          log(`PELICAN: Command '${cmd}' not recognized. Type 'help'.`);
      }
    }
  });
}

/* --- THEME CONTROLLER --- */
function setTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  const picker = document.getElementById("theme-select");
  if (picker) picker.value = theme;
}

function initTheming() {
  const picker = document.getElementById("theme-select");
  const saved = localStorage.getItem(STORAGE_KEYS.THEME) || "cyber";
  setTheme(saved);
  picker.addEventListener("change", (e) => setTheme(e.target.value));
}

// --- MASTER BOOTSTRAP ---
document.addEventListener("DOMContentLoaded", () => {
  initModalInfrastructure();
  initStarfield();
  initClock();
  initTheming();
  applyCallsignToUI();
  applyVisualToggles();
  initVerse();
  initReactor();
  initLinks();
  initTasks();
  initAudioDeck();
  initFlightComputer();
  initTerminal();
  initBackupRestore();
});
