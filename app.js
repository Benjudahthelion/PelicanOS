/* ==========================================================================
   PELICAN-01 COMMAND DECK // CLIENT-SIDE MASTER CONTROLLER v13.0 (CLEAN)
   ========================================================================== */

const STORAGE_KEYS = {
  GEMINI_KEY: "pelican_gemini_api_key",
  THEME: "pelican_theme",
  TASKS: "pelican_tasks",
  LINKS: "pelican_links",
  STUDY_HOURS: "pelican_study_hours",
  STUDY_TARGET: "pelican_study_target",
  DAILY_VERSE: "pelican_daily_verse",
  FOCUS_DEFAULT_MINS: "pelican_focus_default_mins",
  SELECTED_VOICE: "pelican_selected_voice"
};

// --- DEFAULT SYSTEM STATE ---
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
}

/* --- STARFIELD ANIMATION CANVAS --- */
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    stars.forEach(s => {
      ctx.fillRect(s.x, s.y, s.size, s.size);
      s.y += s.speed;
      if (s.y > canvas.height) s.y = 0;
    });
    requestAnimationFrame(render);
  }

  window.addEventListener("resize", resize);
  resize();
  render();
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
        let hours = parseFloat(localStorage.getItem(STORAGE_KEYS.STUDY_HOURS) || "0.0");
        hours += parseFloat((defaultMinutes / 60).toFixed(2));
        localStorage.setItem(STORAGE_KEYS.STUDY_HOURS, hours.toString());
        
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
    updateOdometer();
  });

  targetToggleBtn.addEventListener("click", () => {
    target = target === 40 ? 60 : 40;
    localStorage.setItem(STORAGE_KEYS.STUDY_TARGET, target.toString());
    updateOdometer();
  });

  resetWeekBtn.addEventListener("click", () => {
    showConfirmModal("RESET WEEK LOAD", "Confirm resetting weekly study log back to 0.0 HRS?", () => {
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
}

/* --- NAV COMPUTER (2-COLUMN COMPACT BENTO GRID) --- */
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
function logNewTask(text, priority = "NORMAL") {
  let tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");
  tasks.push({ text: text.trim(), priority, done: false });
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById("task-list");
  const countEl = document.getElementById("task-count");
  let tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]");

  list.innerHTML = "";
  tasks.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = `task-item ${t.priority} ${t.done ? "done" : ""}`;
    li.innerHTML = `
      <span>[${t.priority}] ${t.text}</span>
      <div>
        <button class="hud-btn-sm" onclick="toggleTask(${i})">${t.done ? 'UNDO' : 'DONE'}</button>
        <button class="hud-btn-sm" onclick="removeTask(${i})">X</button>
      </div>
    `;
    list.appendChild(li);
  });
  const active = tasks.filter(t => !t.done).length;
  countEl.textContent = `${active} ACTIVE`;
}

function initTasks() {
  const input = document.getElementById("task-input");
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

  addBtn.addEventListener("click", () => {
    if (input.value.trim()) {
      logNewTask(input.value.trim(), prio.value);
      input.value = "";
    }
  });

  renderTasks();
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
    responseEl.textContent = `Commander: "${query}"`;

    // 1. Status Briefing
    if (q.includes("status") || q.includes("briefing") || q.includes("report")) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" });
      const hours = localStorage.getItem(STORAGE_KEYS.STUDY_HOURS) || "0.0";
      const target = localStorage.getItem(STORAGE_KEYS.STUDY_TARGET) || "40";
      const tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]").filter(t => !t.done);
      
      const msg = `PELICAN nominal. Time is ${timeStr} Central. ${hours} of ${target} study hours logged. ${tasks.length} active objectives.`;
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

    // 7. Fallback to Gemini AI for complex CS reasoning
    queryGeminiAI(query);
  }

  async function queryGeminiAI(promptText) {
    const apiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_KEY);
    if (!apiKey) {
      const msg = `Order acknowledged. (Add API Key in top right for complex queries).`;
      responseEl.textContent = msg; speak("Order acknowledged."); return;
    }

    responseEl.textContent = "PELICAN neural bridge processing...";

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{
          role: "user",
          parts: [{
            text: `You are PELICAN-01, an onboard AI command computer for an online Computer Science student in Louisiana. Address the user directly as Commander. Give a sharp, witty, gritty, and direct response (1-2 sentences max) answering the student's exact query. Query: ${promptText}`
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
          log("PELICAN Commands: status, clear, mins [N], search [query], theme [cyber|matrix|lcars|deepspace]");
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
  document.getElementById("theme-select").value = theme;
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
  initVerse();
  initReactor();
  initLinks();
  initTasks();
  initFlightComputer();
  initTerminal();
});
