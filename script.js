// =====================================================
// 🧩 CONFIGURATION & GLOBAL VARIABLES
// =====================================================
const NOTE_START = 36;
const NOTE_END = 96;
const WHITE_KEY_WIDTH = 28;
const WHITE_KEY_HEIGHT = 150;
const BLACK_KEY_WIDTH = 18;
const BLACK_KEY_HEIGHT = 96;
const BLACK_OFFSETS = [1, 3, 6, 8, 10];

const keyboard = document.getElementById("keyboard");
const wordBox = document.getElementById("wordBox");

let whiteKeyNotes = [];
let whiteKeyMap = {};
let whiteCounter = 0;
let blackKeyNotes = [];
let blackCounter = 0;

let frozen = false;
let cursorPos = 0;
let currentStage = 0; // 0 = CAT DOG, 1 = AEROPLANE, 2 = main sentence
let currentWord = "";

let timerEl;
let timerInterval;
let startTime;
let timerRunning = false;

let userName = "";
let popupShown = false; // prevent repeat popup


// =====================================================
// 🎹 KEY LABELS
// =====================================================
const baseWhiteKeys = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K",
  "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V",
  "W", "X", "Y", "Z", "1", "2", "3", "4", "5", "6", "7",
  "8", "9", "0"
];

const baseBlackKeys = [
  ".", ",", ":", ";", "'", "\"", "-", "!", "?", "&",
  "␣", "", "", "", "", "", "", "", "", "", "", "", "", "",
  "⤶"
];


// =====================================================
// 🎵 CREATE WHITE KEYS
// =====================================================
function createWhiteKeys() {
  for (let note = NOTE_START; note <= NOTE_END; note++) {
    if (BLACK_OFFSETS.includes(note % 12)) continue;

    const w = document.createElement("div");
    w.className = "white-key";
    w.id = `note-${note}`;

    const label = document.createElement("div");
    label.className = "white-key-label";
    label.textContent = baseWhiteKeys[whiteCounter];

    w.appendChild(label);
    keyboard.appendChild(w);

    whiteKeyMap[note] = baseWhiteKeys[whiteCounter];
    whiteKeyNotes.push(note);
    whiteCounter++;
  }
}


// =====================================================
// 🎵 CREATE BLACK KEYS
// =====================================================
function createBlackKeys() {
  const whiteEls = whiteKeyNotes.map(n => document.getElementById(`note-${n}`));

  for (let note = NOTE_START; note <= NOTE_END; note++) {
    if (!BLACK_OFFSETS.includes(note % 12)) continue;

    let leftIndex = -1;
    for (let i = 0; i < whiteKeyNotes.length; i++) {
      if (whiteKeyNotes[i] < note) leftIndex = i;
      else break;
    }

    if (leftIndex < 0 || leftIndex + 1 >= whiteEls.length) continue;

    const leftEl = whiteEls[leftIndex];
    const rightEl = whiteEls[leftIndex + 1];
    const leftCenter = leftEl.offsetLeft + WHITE_KEY_WIDTH / 2;
    const rightCenter = rightEl.offsetLeft + WHITE_KEY_WIDTH / 2;
    const blackCenter = Math.round((leftCenter + rightCenter) / 2);
    const blackLeft = Math.round(blackCenter - BLACK_KEY_WIDTH / 2);

    const b = document.createElement("div");
    b.className = "black-key";
    b.id = `note-${note}`;
    b.style.left = blackLeft + "px";
    b.style.top = "0px";
    b.textContent = baseBlackKeys[blackCounter] || "";

    keyboard.appendChild(b);
    blackKeyNotes.push(note);
    blackCounter++;
  }
}


// =====================================================
// 💬 WORD BOX & CURSOR
// =====================================================
const cursor = document.createElement("span");
cursor.className = "cursor";

function renderWordBox(word) {
  wordBox.innerHTML = "";

  for (let c of word) {
    const span = document.createElement("span");
    span.textContent = c;
    wordBox.appendChild(span);
  }

  wordBox.appendChild(cursor);
  cursorPos = 0;
  currentWord = word;
  updateCursor();
}

function updateCursor() {
  const spans = wordBox.querySelectorAll("span:not(.cursor)");
  if (cursorPos >= spans.length) wordBox.appendChild(cursor);
  else wordBox.insertBefore(cursor, spans[cursorPos]);
}


// =====================================================
// 🪟 POPUP: ENTER PLAYER NAME
// =====================================================
function showNamePopup() {
  if (popupShown) return;
  popupShown = true;

  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";

  const box = document.createElement("div");
  box.className = "popup-box";

  const h2 = document.createElement("h2");
  h2.textContent = "You have completed the tutorial";

  const p = document.createElement("p");
  p.textContent = "Please enter your name to proceed";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Your name";

  const btn = document.createElement("button");
  btn.textContent = "OK";

  box.append(h2, p, input, btn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  input.focus();

  function closePopup() {
    userName = input.value.trim();
    overlay.remove();
    popupShown = false;
    loadStage(2);
  }

  btn.addEventListener("click", () => {
    if (input.value.trim() !== "") closePopup();
  });

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && input.value.trim() !== "") closePopup();
  });
}


// =====================================================
// 🎹 HANDLE KEY PRESS
// =====================================================
function handleKey(note) {
  const spans = wordBox.querySelectorAll("span:not(.cursor)");
  const idx = blackKeyNotes.indexOf(note);
  const symbol = idx !== -1 ? baseBlackKeys[idx] : null;

  // ----- BACKSPACE -----
  if (symbol === "⤶") {
    if (cursorPos > 0) {
      cursorPos--;
      spans[cursorPos].className = "";
      frozen = false;
      updateCursor();
    }
    return;
  }

  if (frozen || cursorPos >= spans.length) return;
  const currentChar = spans[cursorPos].textContent;

  // ----- TIMER START -----
  if (currentStage === 2 && !timerRunning) {
    startTime = Date.now();
    timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      const ms = Math.floor((elapsed % 1000) / 10);
      timerEl.textContent =
        `${minutes.toString().padStart(2, '0')}:` +
        `${seconds.toString().padStart(2, '0')}.` +
        `${ms.toString().padStart(2, '0')}`;
    }, 50);
    timerRunning = true;
  }

  flashKey(note);

  // ----- WHITE KEYS -----
  if (whiteKeyMap[note]) {
    const charTyped = whiteKeyMap[note];
    if (currentChar.toUpperCase() === charTyped.toUpperCase()) {
      spans[cursorPos].className = "correct";
      wordBox.classList.add("punch");
      setTimeout(() => wordBox.classList.remove("punch"), 200);
    } else {
      spans[cursorPos].className = "wrong";
      wordBox.classList.add("shake");
      setTimeout(() => wordBox.classList.remove("shake"), 200);
      frozen = true;
    }
    cursorPos++;
    updateCursor();
    return;
  }

  // ----- BLACK KEYS -----
  if (symbol === "␣") { // SPACE
    if (currentChar === " ") {
      spans[cursorPos].className = "correct";
    } else {
      spans[cursorPos].className = "wrong";
      frozen = true;
    }
    cursorPos++;
    updateCursor();
    return;
  }

  if (symbol) {
    if (currentChar === symbol) {
      spans[cursorPos].className = "correct";
    } else {
      spans[cursorPos].className = "wrong";
      frozen = true;
    }
    cursorPos++;
    updateCursor();
  }
}


// =====================================================
// ✨ FLASH KEY EFFECT
// =====================================================
function flashKey(note) {
  const el = document.getElementById(`note-${note}`);
  if (!el) return;
  el.classList.add("active");
  setTimeout(() => el.classList.remove("active"), 160);
}


// =====================================================
// 🖱️ CLICK EVENT SETUP
// =====================================================
function setupKeyClicks() {
  whiteKeyNotes.forEach(note => {
    document.getElementById(`note-${note}`)
      .addEventListener("click", () => handleKey(note));
  });

  blackKeyNotes.forEach(note => {
    document.getElementById(`note-${note}`)
      .addEventListener("click", () => handleKey(note));
  });
}


// =====================================================
// 🎛️ MIDI INPUT HANDLER
// =====================================================
if (navigator.requestMIDIAccess) {
  navigator.requestMIDIAccess().then(access => {
    for (const input of access.inputs.values()) {
      input.onmidimessage = msg => {
        const [cmd, note, vel] = msg.data;
        if (cmd === 144 && vel > 0) handleKey(note);
      };
    }
  });
}


// =====================================================
// 🎯 STAGES & WORDS
// =====================================================
const stages = [
  "CAT DOG",
  "AEROPLANE",
  "TYPE ME AS FAST AS YOU CAN!"
];

function loadStage(idx) {
  currentStage = idx;
  renderWordBox(stages[idx]);

  if (idx === 2) {
    if (!timerEl) {
      timerEl = document.createElement("div");
      timerEl.id = "timer";
      timerEl.textContent = "00:00.00";
      wordBox.parentNode.appendChild(timerEl);
    }
    timerEl.style.display = "block";
    timerRunning = false;
  } else if (timerEl) {
    timerEl.style.display = "none";
  }
}


// =====================================================
// ⏱️ TIME FORMATTER
// =====================================================
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}


// =====================================================
// ✅ STAGE COMPLETION CHECKER
// =====================================================
function checkStageCompletion() {
  const spans = wordBox.querySelectorAll("span:not(.cursor)");

  if (Array.from(spans).every(s => s.classList.contains("correct"))) {
    if (currentStage === 0) {
      loadStage(1);
    } else if (currentStage === 1 && !userName) {
      showNamePopup();
    } else if (currentStage === 2 && timerRunning) {
      clearInterval(timerInterval);

      const timeInSeconds = (Date.now() - startTime) / 1000;
      const name = userName || "Player";

      const leaderboardData = JSON.parse(localStorage.getItem("leaderboardData") || "[]");
      leaderboardData.push({ name, time: timeInSeconds });
      localStorage.setItem("leaderboardData", JSON.stringify(leaderboardData));

      window.location.href = "leaderboard.html";
    }
  }
}


// =====================================================
// ⏰ INTERVAL WATCHER
// =====================================================
setInterval(checkStageCompletion, 200);


// =====================================================
// 🚀 INITIALIZATION
// =====================================================
createWhiteKeys();
createBlackKeys();
setupKeyClicks();
loadStage(0);