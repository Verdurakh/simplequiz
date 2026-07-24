/* Simplequiz — everything lives in localStorage on this device. */

(function () {
  "use strict";

  var STORAGE_KEY = "simplequiz.v1";

  /**
   * @typedef {"text"|"pick"} AnswerType
   * @typedef {"right"|"wrong"|null} Mark
   * @typedef {{ id: string, label: string, type: AnswerType, answer: string, note: string, mark: Mark }} Entry
   * @typedef {{ version: number, name: string, entries: Entry[] }} State
   */

  /** @type {State} */
  var state = { version: 1, name: "", entries: [] };

  /** @type {string|null} id of the entry currently loaded into the compose card */
  var editingId = null;

  /** @type {AnswerType} format to preselect for the next new answer */
  var lastType = "text";

  /** @type {"answers"|"correct"} which face of the review sheet is showing */
  var sheetMode = "answers";

  var storageOk = true;
  var clearArmed = false;
  var clearTimer = 0;
  var toastTimer = 0;

  var el = {
    name: document.getElementById("player-name"),
    notice: document.getElementById("storage-notice"),
    rows: document.getElementById("rows"),
    empty: document.getElementById("empty"),
    slip: document.getElementById("slip"),
    compose: document.getElementById("compose"),
    composeNum: document.getElementById("compose-num"),
    composeState: document.getElementById("compose-state"),
    composeCancel: document.getElementById("compose-cancel"),
    label: document.getElementById("q-label"),
    segButtons: document.querySelectorAll(".seg__btn"),
    text: document.getElementById("a-text"),
    pick: document.getElementById("a-pick"),
    note: document.getElementById("q-note"),
    noteToggle: document.getElementById("note-toggle"),
    save: document.getElementById("save"),
    del: document.getElementById("delete"),
    reviewOpen: document.getElementById("review-open"),
    sheet: document.getElementById("sheet"),
    sheetTitle: document.getElementById("sheet-title"),
    sheetRows: document.getElementById("sheet-rows"),
    sheetClose: document.getElementById("sheet-close"),
    score: document.getElementById("score"),
    scoreRight: document.getElementById("score-right"),
    scoreTotal: document.getElementById("score-total"),
    scoreLabel: document.getElementById("score-label"),
    actCorrect: document.getElementById("act-correct"),
    actCopy: document.getElementById("act-copy"),
    actBack: document.getElementById("act-back"),
    actClear: document.getElementById("act-clear"),
    toast: document.getElementById("toast")
  };

  /* ---------- storage ---------- */

  function load() {
    var raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      storageOk = false;
      el.notice.hidden = false;
      return;
    }
    if (!raw) return;

    try {
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.entries)) return;
      state.name = typeof parsed.name === "string" ? parsed.name : "";
      state.entries = parsed.entries.filter(isEntry).map(normalise);
    } catch (err) {
      // A corrupt slip is worse than an empty one — start clean rather than half-render.
      state.entries = [];
      toast("Saved slip was unreadable, starting fresh");
    }
  }

  function isEntry(value) {
    return value && typeof value === "object" && typeof value.answer === "string";
  }

  /** @returns {Entry} */
  function normalise(value) {
    return {
      id: typeof value.id === "string" ? value.id : makeId(),
      label: typeof value.label === "string" ? value.label : "",
      type: value.type === "pick" ? "pick" : "text",
      answer: value.answer,
      note: typeof value.note === "string" ? value.note : "",
      mark: value.mark === "right" || value.mark === "wrong" ? value.mark : null
    };
  }

  function save() {
    if (!storageOk) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      storageOk = false;
      el.notice.hidden = false;
    }
  }

  var idCounter = 0;
  function makeId() {
    idCounter += 1;
    return Date.now().toString(36) + "-" + idCounter.toString(36);
  }

  /* ---------- helpers ---------- */

  function num(index) {
    return String(index + 1).padStart(2, "0");
  }

  function findIndex(id) {
    for (var i = 0; i < state.entries.length; i += 1) {
      if (state.entries[i].id === id) return i;
    }
    return -1;
  }

  function toast(message) {
    el.toast.textContent = message;
    el.toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      el.toast.hidden = true;
    }, 2200);
  }

  /* ---------- rendering the slip ---------- */

  /**
   * @param {Entry} entry
   * @param {number} index
   * @param {{ interactive: boolean, judging: boolean }} opts
   */
  function buildRow(entry, index, opts) {
    var li = document.createElement("li");
    var host = document.createElement(opts.interactive ? "button" : "div");
    host.className = "row";
    if (opts.interactive) host.type = "button";
    host.dataset.id = entry.id;
    if (entry.id === editingId) host.classList.add("is-editing");

    var numEl = document.createElement("span");
    numEl.className = "row__num";
    numEl.textContent = num(index);
    host.appendChild(numEl);

    var body = document.createElement("span");
    body.className = "row__body";

    if (entry.label) {
      var label = document.createElement("span");
      label.className = "row__label";
      label.textContent = entry.label;
      body.appendChild(label);
    }

    if (entry.type === "pick") {
      body.appendChild(buildBoxes(entry.answer));
    } else {
      var answer = document.createElement("span");
      answer.className = "row__answer";
      if (entry.answer) {
        answer.textContent = entry.answer;
      } else {
        answer.classList.add("row__answer--blank");
        answer.textContent = "No answer";
      }
      body.appendChild(answer);
    }

    if (entry.note) {
      var note = document.createElement("span");
      note.className = "row__note";
      note.textContent = entry.note;
      body.appendChild(note);
    }

    host.appendChild(body);

    if (opts.judging) {
      host.appendChild(buildJudge(entry));
    } else if (entry.mark) {
      var mark = document.createElement("span");
      mark.className = "row__mark row__mark--" + entry.mark;
      mark.textContent = entry.mark === "right" ? "✓" : "✕";
      host.appendChild(mark);
    }

    li.appendChild(host);
    return li;
  }

  function buildBoxes(chosen) {
    var wrap = document.createElement("span");
    wrap.className = "boxes";
    ["1", "X", "2"].forEach(function (option) {
      var box = document.createElement("span");
      box.className = "boxes__b" + (option === chosen ? " is-marked" : "");
      box.textContent = option;
      wrap.appendChild(box);
    });
    return wrap;
  }

  function buildJudge(entry) {
    var wrap = document.createElement("span");
    wrap.className = "judge";
    [["right", "✓"], ["wrong", "✕"]].forEach(function (pair) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "judge__btn";
      btn.dataset.mark = pair[0];
      btn.dataset.id = entry.id;
      btn.textContent = pair[1];
      btn.setAttribute("aria-pressed", entry.mark === pair[0] ? "true" : "false");
      btn.setAttribute("aria-label", (pair[0] === "right" ? "Correct" : "Wrong") + ", answer " + entry.answer);
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function renderSlip() {
    el.rows.textContent = "";
    state.entries.forEach(function (entry, index) {
      el.rows.appendChild(buildRow(entry, index, { interactive: true, judging: false }));
    });
    el.empty.hidden = state.entries.length > 0;
    el.reviewOpen.disabled = state.entries.length === 0;
  }

  /* ---------- compose card ---------- */

  function setType(type) {
    lastType = type;
    for (var i = 0; i < el.segButtons.length; i += 1) {
      var btn = el.segButtons[i];
      var on = btn.dataset.type === type;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
    el.text.hidden = type !== "text";
    el.pick.hidden = type !== "pick";
    refreshSave();
  }

  function currentPick() {
    var pressed = el.pick.querySelector('.pick[aria-pressed="true"]');
    return pressed ? pressed.dataset.pick : "";
  }

  function setPick(value) {
    var buttons = el.pick.querySelectorAll(".pick");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].setAttribute("aria-pressed", buttons[i].dataset.pick === value ? "true" : "false");
    }
    refreshSave();
  }

  function currentAnswer() {
    return lastType === "pick" ? currentPick() : el.text.value.trim();
  }

  /** A note on its own is enough to commit a row — that is how a question gets parked. */
  function refreshSave() {
    el.save.disabled = currentAnswer() === "" && el.note.value.trim() === "";
  }

  function showNote(open) {
    el.note.hidden = !open;
    el.noteToggle.hidden = open;
    el.noteToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function resetCompose() {
    editingId = null;
    el.label.value = "";
    el.text.value = "";
    el.note.value = "";
    showNote(false);
    setPick("");
    setType(lastType);
    el.composeNum.textContent = num(state.entries.length);
    el.composeState.textContent = "New answer";
    el.composeCancel.hidden = true;
    el.del.hidden = true;
    el.save.textContent = "Save & next";
    refreshSave();
  }

  function startEditing(id) {
    var index = findIndex(id);
    if (index === -1) return;
    var entry = state.entries[index];

    editingId = id;
    el.label.value = entry.label;
    el.note.value = entry.note;
    showNote(entry.note !== "");
    setType(entry.type);
    if (entry.type === "pick") {
      setPick(entry.answer);
      el.text.value = "";
    } else {
      el.text.value = entry.answer;
      setPick("");
    }

    el.composeNum.textContent = num(index);
    el.composeState.textContent = "Editing";
    el.composeCancel.hidden = false;
    el.del.hidden = false;
    el.save.textContent = "Save changes";
    refreshSave();
    renderSlip();
    el.compose.scrollIntoView({ block: "nearest" });
  }

  function commit(event) {
    event.preventDefault();
    var answer = currentAnswer();
    var note = el.note.value.trim();
    if (answer === "" && note === "") return;

    if (editingId) {
      var index = findIndex(editingId);
      if (index !== -1) {
        state.entries[index].label = el.label.value.trim();
        state.entries[index].type = lastType;
        state.entries[index].answer = answer;
        state.entries[index].note = note;
      }
      save();
      resetCompose();
      renderSlip();
      toast("Answer updated");
      return;
    }

    state.entries.push({
      id: makeId(),
      label: el.label.value.trim(),
      type: lastType,
      answer: answer,
      note: note,
      mark: null
    });
    save();
    resetCompose();
    renderSlip();

    var fresh = el.rows.lastElementChild;
    if (fresh && fresh.firstElementChild) {
      fresh.firstElementChild.classList.add("row--fresh");
    }
    el.slip.scrollTop = el.slip.scrollHeight;
    el.label.focus();
  }

  function removeEditing() {
    var index = findIndex(editingId);
    if (index === -1) return;
    state.entries.splice(index, 1);
    save();
    resetCompose();
    renderSlip();
    toast("Answer deleted");
  }

  /* ---------- review + correction ---------- */

  function openSheet(mode) {
    sheetMode = mode;
    el.sheet.hidden = false;
    el.sheetTitle.textContent = mode === "correct" ? "Correct the slip" : "Your slip";
    el.score.hidden = mode !== "correct";
    el.actCorrect.hidden = mode === "correct";
    el.actBack.hidden = mode !== "correct";
    renderSheet();
    el.sheetClose.focus();
  }

  function closeSheet() {
    el.sheet.hidden = true;
    disarmClear();
    el.reviewOpen.focus();
  }

  function renderSheet() {
    var judging = sheetMode === "correct";
    el.sheetRows.textContent = "";
    state.entries.forEach(function (entry, index) {
      el.sheetRows.appendChild(buildRow(entry, index, { interactive: false, judging: judging }));
    });
    if (judging) renderScore();
  }

  function renderScore() {
    var total = state.entries.length;
    var right = 0;
    var marked = 0;
    state.entries.forEach(function (entry) {
      if (entry.mark) marked += 1;
      if (entry.mark === "right") right += 1;
    });

    el.scoreRight.textContent = String(right);
    el.scoreTotal.textContent = String(total);
    el.scoreLabel.textContent = marked === total
      ? "Final score"
      : "Marked " + marked + " of " + total;
  }

  function judge(id, mark) {
    var index = findIndex(id);
    if (index === -1) return;
    // Tapping the mark it already has clears it, so a misfire is one tap to undo.
    state.entries[index].mark = state.entries[index].mark === mark ? null : mark;
    save();
    renderSheet();
    renderSlip();
  }

  /* ---------- copy ---------- */

  function slipAsText() {
    var lines = [];
    lines.push(state.name ? "SIMPLEQUIZ — " + state.name : "SIMPLEQUIZ");
    lines.push("");
    state.entries.forEach(function (entry, index) {
      var mark = entry.mark === "right" ? "  ✓" : entry.mark === "wrong" ? "  ✗" : "";
      lines.push(num(index) + "  " + (entry.label || "—"));
      lines.push("    " + (entry.answer || "no answer") + mark);
      if (entry.note) lines.push("    note: " + entry.note);
    });

    var marked = state.entries.filter(function (entry) { return entry.mark; }).length;
    if (marked > 0) {
      var right = state.entries.filter(function (entry) { return entry.mark === "right"; }).length;
      lines.push("");
      lines.push("Score: " + right + " / " + state.entries.length);
    }
    return lines.join("\n");
  }

  function copySlip() {
    var text = slipAsText();

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        toast("Answers copied");
      }, function () {
        legacyCopy(text);
      });
      return;
    }
    legacyCopy(text);
  }

  function legacyCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();

    var copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (err) {
      copied = false;
    }
    document.body.removeChild(area);
    toast(copied ? "Answers copied" : "Copying is blocked here — read them off the screen");
  }

  /* ---------- clearing ---------- */

  function armClear() {
    if (clearArmed) {
      clearSlip();
      return;
    }
    clearArmed = true;
    el.actClear.textContent = "Tap again to erase everything";
    clearTimer = window.setTimeout(disarmClear, 4000);
  }

  function disarmClear() {
    window.clearTimeout(clearTimer);
    clearArmed = false;
    el.actClear.textContent = "Clear the slip";
  }

  function clearSlip() {
    disarmClear();
    state.entries = [];
    save();
    resetCompose();
    renderSlip();
    closeSheet();
    toast("Slip cleared");
  }

  /* ---------- wiring ---------- */

  function init() {
    load();
    el.name.value = state.name;
    resetCompose();
    renderSlip();

    el.name.addEventListener("input", function () {
      state.name = el.name.value;
      save();
    });

    for (var i = 0; i < el.segButtons.length; i += 1) {
      el.segButtons[i].addEventListener("click", function (event) {
        setType(event.currentTarget.dataset.type === "pick" ? "pick" : "text");
      });
    }

    el.pick.addEventListener("click", function (event) {
      var btn = event.target.closest(".pick");
      if (!btn) return;
      setPick(btn.getAttribute("aria-pressed") === "true" ? "" : btn.dataset.pick);
    });

    el.text.addEventListener("input", refreshSave);
    el.note.addEventListener("input", refreshSave);

    el.noteToggle.addEventListener("click", function () {
      showNote(true);
      el.note.focus();
    });
    el.compose.addEventListener("submit", commit);
    el.composeCancel.addEventListener("click", function () {
      resetCompose();
      renderSlip();
    });
    el.del.addEventListener("click", removeEditing);

    el.rows.addEventListener("click", function (event) {
      var row = event.target.closest(".row");
      if (!row) return;
      if (row.dataset.id === editingId) {
        resetCompose();
        renderSlip();
        return;
      }
      startEditing(row.dataset.id);
    });

    el.sheetRows.addEventListener("click", function (event) {
      var btn = event.target.closest(".judge__btn");
      if (!btn) return;
      judge(btn.dataset.id, btn.dataset.mark === "right" ? "right" : "wrong");
    });

    el.reviewOpen.addEventListener("click", function () { openSheet("answers"); });
    el.sheetClose.addEventListener("click", closeSheet);
    el.actCorrect.addEventListener("click", function () { openSheet("correct"); });
    el.actBack.addEventListener("click", function () { openSheet("answers"); });
    el.actCopy.addEventListener("click", copySlip);
    el.actClear.addEventListener("click", armClear);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !el.sheet.hidden) closeSheet();
    });
  }

  init();
})();
