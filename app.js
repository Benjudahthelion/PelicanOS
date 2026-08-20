/* ==========================================================================
   PELICAN-01 COMMAND DECK // CLIENT-SIDE MASTER CONTROLLER v9.0
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
        alert("FOCUS SPRINT TERMINATED. Core recharge initiated.");
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
  const setBtn = document.getElementById("timer-set-btn");
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

  function promptSetMins() {
    const promptVal = prompt("Enter Focus Sprint duration in minutes:", defaultMinutes.toString());
    const parsed = parseInt(promptVal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setReactorDuration(parsed);
    }
  }

  readout.textContent = `${String(defaultMinutes).padStart(2, "0")}:00`;
  readout.addEventListener("click", promptSetMins);
  setBtn.addEventListener("click", promptSetMins);

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
    const confirmed = confirm("WARNING: Reset current weekly study load back to 0.0 HRS? Confirm new week initiation?");
    if (confirmed) {
      hours = 0.0;
      localStorage.setItem(STORAGE_KEYS.STUDY_HOURS, "0.0");
      updateOdometer();
    }
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
    links.splice(idx, 1);
    render();
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

    if (!name || !url) {
      alert("Name and URL required.");
      return;
    }

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

/* --- FULL-CONTROL YOUTUBE PLAYLIST PLAYER ENGINE --- */
let ytPlayer = null;
let isPlayerReady = false;
let isPlaying = false;
let isShuffled = false;
let customPlaylists = JSON.parse(localStorage.getItem(STORAGE_KEYS.STORED_PLAYLISTS) || "[]");

// Extract pure playlist ID from URL
function sanitizePlaylistId(input) {
  let val = input.trim();
  if (val.includes("list=")) {
    try {
      val = val.split("list=")[1].split("&")[0];
    } catch (e) {}
  }
  return val;
}

// Ensure an initial embed exists to bypass local file blank-screen bugs
function ensureInitialIframe() {
  const targetId = localStorage.getItem(STORAGE_KEYS.CURRENT_PLAYLIST_ID) || "PLLCgG2oCv5XOp_71K6Ur3yhVFJJ4F6tbD"; // Fallback to provided playlist
  const container = document.getElementById("yt-player-target");
  if (container.tagName.toLowerCase() !== "iframe") {
    const iframe = document.createElement("iframe");
    iframe.id = "yt-player-target";
    iframe.className = "playlist-iframe";
    iframe.allow = "autoplay; encrypted-media; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.src = `https://www.youtube.com/embed/videoseries?list=${targetId}&enablejsapi=1&autoplay=0`;
    container.replaceWith(iframe);
  }
}

window.onYouTubeIframeAPIReady = function() {
  ensureInitialIframe();
  
  ytPlayer = new YT.Player("yt-player-target", {
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError
    }
  });
};

function onPlayerReady() {
  isPlayerReady = true;
  document.getElementById("audio-status").textContent = "DECK READY";
  const activeId = localStorage.getItem(STORAGE_KEYS.CURRENT_PLAYLIST_ID);
  
  if (activeId && ytPlayer.cuePlaylist) {
    ytPlayer.cuePlaylist({ list: activeId, listType: "playlist" });
  }
}

function onPlayerStateChange(event) {
  const statusBadge = document.getElementById("audio-status");
  const playBtn = document.getElementById("yt-play-toggle-btn");
  const trackTitle = document.getElementById("track-title");

  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    statusBadge.textContent = "BROADCASTING";
    playBtn.textContent = "PAUSE";
    const data = ytPlayer.getVideoData();
    if (data && data.title) trackTitle.textContent = data.title;
  } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    isPlaying = false;
    statusBadge.textContent = "PAUSED";
    playBtn.textContent = "PLAY / RESUME";
  }
}

function onPlayerError() {
  document.getElementById("audio-status").textContent = "COMMS FAULT";
  document.getElementById("track-title").textContent = "PLAYLIST UNAVAILABLE OR RESTRICTED";
}

function tuneAudioPlaylist(id, label) {
  const cleanId = sanitizePlaylistId(id);
  localStorage.setItem(STORAGE_KEYS.CURRENT_PLAYLIST_ID, cleanId);
  document.getElementById("track-title").textContent = `TUNED TO: ${label.toUpperCase()}`;

  const iframe = document.getElementById("yt-player-target");
  if (iframe && iframe.tagName.toLowerCase() === "iframe") {
    iframe.src = `https://www.youtube.com/embed/videoseries?list=${cleanId}&autoplay=1&enablejsapi=1`;
  } else if (ytPlayer && isPlayerReady && ytPlayer.loadPlaylist) {
    ytPlayer.loadPlaylist({ list: cleanId, listType: "playlist" });
  }
  
  renderFrequencyCards();
}

function initAudioDeck() {
  ensureInitialIframe(); // Ensure DOM is prepped before API loads

  const playToggleBtn = document.getElementById("yt-play-toggle-btn");
  const prevBtn = document.getElementById("yt-prev-btn");
  const nextBtn = document.getElementById("yt-next-btn");
  const shuffleBtn = document.getElementById("yt-shuffle-btn");
  const muteBtn = document.getElementById("yt-mute-btn");
  const volSlider = document.getElementById("yt-vol-slider");
  const volDisplay = document.getElementById("vol-display");
  const openModalBtn = document.getElementById("open-playlist-modal-btn");

  const modal = document.getElementById("playlist-modal");
  const modalTitle = document.getElementById("pl-modal-title");
  const modalCloseBtn = document.getElementById("pl-modal-close-btn");
  const modalSaveBtn = document.getElementById("pl-modal-save-btn");
  const labelInput = document.getElementById("modal-playlist-label");
  const urlInput = document.getElementById("modal-playlist-url");
  const idxInput = document.getElementById("modal-playlist-index");

  playToggleBtn.addEventListener("click", () => {
    if (!ytPlayer || !isPlayerReady) return;
    if (isPlaying) ytPlayer.pauseVideo();
    else ytPlayer.playVideo();
  });

  nextBtn.addEventListener("click", () => {
    if (ytPlayer && isPlayerReady && ytPlayer.nextVideo) ytPlayer.nextVideo();
  });

  prevBtn.addEventListener("click", () => {
    if (ytPlayer && isPlayerReady && ytPlayer.previousVideo) ytPlayer.previousVideo();
  });

  shuffleBtn.addEventListener("click", () => {
    if (!ytPlayer || !isPlayerReady) return;
    isShuffled = !isShuffled;
    ytPlayer.setShuffle(isShuffled);
    shuffleBtn.textContent = isShuffled ? "SHUFFLE [ON]" : "SHUFFLE [OFF]";
    shuffleBtn.classList.toggle("hud-btn-active", isShuffled);
  });

  muteBtn.addEventListener("click", () => {
    if (!ytPlayer || !isPlayerReady) return;
    if (ytPlayer.isMuted()) {
      ytPlayer.unMute();
      muteBtn.innerHTML = "&#128266; MUTE";
      muteBtn.classList.remove("hud-btn-active");
    } else {
      ytPlayer.mute();
      muteBtn.innerHTML = "&#128263; UNMUTE";
      muteBtn.classList.add("hud-btn-active");
    }
  });

  volSlider.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    volDisplay.textContent = `${val}%`;
    if (ytPlayer && isPlayerReady && ytPlayer.setVolume) {
      ytPlayer.setVolume(val);
    }
  });

  window.openPlaylistEditModal = (idx) => {
    idxInput.value = idx;
    if (idx >= 0) {
      modalTitle.textContent = `CONFIG // ${customPlaylists[idx].label.toUpperCase()}`;
      labelInput.value = customPlaylists[idx].label;
      urlInput.value = customPlaylists[idx].id;
    } else {
      modalTitle.textContent = "REGISTER NEW FREQUENCY";
      labelInput.value = "";
      urlInput.value = "";
    }
    modal.classList.add("open");
    labelInput.focus();
  };

  window.deleteFrequency = (idx) => {
    if (confirm(`Remove frequency '${customPlaylists[idx].label}'?`)) {
      const deletedId = customPlaylists[idx].id;
      customPlaylists.splice(idx, 1);
      if (localStorage.getItem(STORAGE_KEYS.CURRENT_PLAYLIST_ID) === deletedId) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_PLAYLIST_ID);
        document.getElementById("track-title").textContent = "NO FREQUENCY TUNED";
      }
      renderFrequencyCards();
    }
  };

  openModalBtn.addEventListener("click", () => window.openPlaylistEditModal(-1));
  modalCloseBtn.addEventListener("click", () => modal.classList.remove("open"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); });

  modalSaveBtn.addEventListener("click", () => {
    const label = labelInput.value.trim();
    const rawUrl = urlInput.value.trim();
    const idx = parseInt(idxInput.value, 10);

    if (!label || !rawUrl) {
      alert("Both Frequency Label and YouTube Link/ID are required.");
      return;
    }

    const cleanId = sanitizePlaylistId(rawUrl);

    if (idx >= 0) {
      customPlaylists[idx] = { label, id: cleanId };
    } else {
      customPlaylists.push({ label, id: cleanId });
    }

    localStorage.setItem(STORAGE_KEYS.STORED_PLAYLISTS, JSON.stringify(customPlaylists));
    tuneAudioPlaylist(cleanId, label);
    modal.classList.remove("open");
  });

  // Inject initial default playlist into array if empty
  if (customPlaylists.length === 0) {
    customPlaylists.push({ label: "Synthwave Mix", id: "PLLCgG2oCv5XOp_71K6Ur3yhVFJJ4F6tbD" });
    localStorage.setItem(STORAGE_KEYS.STORED_PLAYLISTS, JSON.stringify(customPlaylists));
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_PLAYLIST_ID)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_PLAYLIST_ID, "PLLCgG2oCv5XOp_71K6Ur3yhVFJJ4F6tbD");
    }
  }

  renderFrequencyCards();
}

function renderFrequencyCards() {
  const cardsGrid = document.getElementById("playlist-cards-grid");
  cardsGrid.innerHTML = "";
  const activeId = localStorage.getItem(STORAGE_KEYS.CURRENT_PLAYLIST_ID);

  if (customPlaylists.length === 0) {
    cardsGrid.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); padding: 0.5rem;">NO FREQUENCIES STORED. CLICK '+ ADD FREQUENCY' TO LOCK A PLAYLIST.</div>`;
    return;
  }

  customPlaylists.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = `frequency-card ${item.id === activeId ? 'active-freq' : ''}`;

    card.innerHTML = `
      <div class="frequency-info">
        <span class="frequency-name">${item.label}</span>
        <span class="frequency-id">ID: ${item.id}</span>
      </div>
      <div class="frequency-actions">
        <button class="hud-btn-sm" onclick="tuneAudioPlaylist('${item.id}', '${item.label}')">TUNE</button>
        <button class="hud-btn-sm" onclick="openPlaylistEditModal(${idx})">EDIT</button>
        <button class="hud-btn-sm hud-btn-accent" onclick="deleteFrequency(${idx})">X</button>
      </div>
    `;
    cardsGrid.appendChild(card);
  });

  localStorage.setItem(STORAGE_KEYS.STORED_PLAYLISTS, JSON.stringify(customPlaylists));
}

/* --- HYBRID ONBOARD FLIGHT DECK + GEMINI AI ENGINE --- */
function initFlightComputer() {
  const voiceBtn = document.getElementById("voice-btn");
  const briefingBtn = document.getElementById("briefing-btn");
  const toggleHintsBtn = document.getElementById("toggle-hints-btn");
  const hintsDrawer = document.getElementById("cmd-hints-drawer");
  const statusEl = document.getElementById("ai-status");
  const responseEl = document.getElementById("ai-response");
  const vis = document.getElementById("visualizer");
  const voiceSelect = document.getElementById("voice-select");
  const apiBtn = document.getElementById("api-btn");

  let availableVoices = [];
  let isListening = false;
  let recInstance = null;

  toggleHintsBtn.addEventListener("click", () => {
    hintsDrawer.classList.toggle("open");
  });

  apiBtn.addEventListener("click", () => {
    const key = prompt("Enter Google AI Studio Gemini API Key:", localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || "");
    if (key !== null) localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, key.trim());
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

    if (recInstance && isListening) {
      recInstance.stop();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const currentVoice = availableVoices.find(v => v.name === voiceSelect.value);
    if (currentVoice) utterance.voice = currentVoice;
    utterance.pitch = 1.0;
    utterance.rate = 1.05;
    vis.classList.add("active-voice");
    utterance.onend = () => vis.classList.remove("active-voice");
    window.speechSynthesis.speak(utterance);
  }

  // Pure Voice Command Router (Local Deck Controls First)
  function processFlightCommand(query) {
    const q = query.toLowerCase().trim();
    responseEl.textContent = `Commander: "${query}"`;

    // 1. Briefing / Status
    if (q.includes("status") || q.includes("briefing") || q.includes("report")) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" });
      const hours = localStorage.getItem(STORAGE_KEYS.STUDY_HOURS) || "0.0";
      const target = localStorage.getItem(STORAGE_KEYS.STUDY_TARGET) || "40";
      const tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || "[]").filter(t => !t.done);
      
      const msg = `PELICAN nominal. Time is ${timeStr} Central. ${hours} of ${target} study hours logged. ${tasks.length} active objectives.`;
      responseEl.textContent = msg; speak(msg); return;
    }

    // 2. Audio Deck Commands
    if (q === "play" || q.includes("play music") || q.includes("start music")) {
      if (ytPlayer && isPlayerReady && ytPlayer.playVideo) {
        ytPlayer.playVideo();
        const msg = "Audio transmission engaged.";
        responseEl.textContent = msg; speak(msg);
      } else {
        const msg = "No playlist tuned. Select a frequency.";
        responseEl.textContent = msg; speak(msg);
      }
      return;
    }

    if (q === "stop" || q === "pause" || q.includes("pause music") || q.includes("stop music")) {
      if (ytPlayer && isPlayerReady && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
      const msg = "Audio playback halted.";
      responseEl.textContent = msg; speak(msg); return;
    }

    if (q.includes("next") || q.includes("skip")) {
      if (ytPlayer && isPlayerReady && ytPlayer.nextVideo) ytPlayer.nextVideo();
      const msg = "Advancing track.";
      responseEl.textContent = msg; speak(msg); return;
    }

    if (q.includes("prev") || q.includes("previous")) {
      if (ytPlayer && isPlayerReady && ytPlayer.previousVideo) ytPlayer.previousVideo();
      const msg = "Reverting track.";
      responseEl.textContent = msg; speak(msg); return;
    }

    // 3. Focus Reactor
    if (q === "focus" || q === "timer" || q.includes("engage focus") || q.includes("start timer")) {
      toggleReactorTimer();
      const msg = "Core focus sprint active.";
      responseEl.textContent = msg; speak(msg); return;
    }

    const timerMatch = q.match(/(?:set timer|focus for|timer for)\s+(\d+)\s*(?:minutes|mins)?/);
    if (timerMatch) {
      const mins = parseInt(timerMatch[1], 10);
      setReactorDuration(mins);
      const msg = `Reactor calibrated to ${mins} minutes.`;
      responseEl.textContent = msg; speak(msg); return;
    }

    // 4. Scripture
    if (q.includes("verse") || q.includes("scripture") || q.includes("bible")) {
      const vText = document.getElementById("kjv-text").textContent;
      const vRef = document.getElementById("kjv-ref").textContent;
      responseEl.textContent = `${vText} ${vRef}`;
      speak(`${vText} ${vRef}`); return;
    }

    // 5. Search / Lookup
    if (q.startsWith("search for ") || q.startsWith("google ") || q.startsWith("look up ")) {
      const term = q.replace(/^(search for|google|look up)\s+/, "");
      window.open(`https://www.google.com/search?q=${encodeURIComponent(term)}`, "_blank");
      const msg = `Searching data feed for: ${term}.`;
      responseEl.textContent = msg; speak(msg); return;
    }

    // 6. Tasks
    if (q.startsWith("add task ") || q.startsWith("new task ")) {
      const taskText = q.replace(/^(add task|new task)\s+/, "");
      logNewTask(taskText, "NORMAL");
      const msg = `Objective saved: ${taskText}`;
      responseEl.textContent = msg; speak(msg); return;
    }

    // 7. Fallback to Gemini for complex queries
    queryGeminiAI(query);
  }

  // Active Gemini AI Query Cascade (Direct 1.5-Flash link)
  async function queryGeminiAI(promptText) {
    const apiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_KEY);
    if (!apiKey) {
      const msg = `Order acknowledged. (Add API Key in top right for CS reasoning queries).`;
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

  // Speech Recognition (Push-to-Talk with Strict Final Result Filter)
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRec) {
    recInstance = new SpeechRec();
    recInstance.continuous = false;
    recInstance.interimResults = false; // Strictly prevents half-sentence overlaps

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
      // Enforce final match only to stop overlap bug
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
          log("PELICAN Commands: status, clear, play, pause, next, prev, mins [N], search [query], theme [cyber|matrix|lcars|deepspace]");
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
        case "play":
          if (ytPlayer && isPlayerReady && ytPlayer.playVideo) ytPlayer.playVideo();
          break;
        case "pause":
          if (ytPlayer && isPlayerReady && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
          break;
        case "next":
          if (ytPlayer && isPlayerReady && ytPlayer.nextVideo) ytPlayer.nextVideo();
          break;
        case "prev":
          if (ytPlayer && isPlayerReady && ytPlayer.previousVideo) ytPlayer.previousVideo();
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
  initStarfield();
  initClock();
  initTheming();
  initVerse();
  initReactor();
  initLinks();
  initTasks();
  initAudioDeck();
  initFlightComputer();
  initTerminal();
});