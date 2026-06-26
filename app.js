const OPEN_MINUTES = 7 * 60 + 30;
const CLOSE_MINUTES = 18 * 60;
const SLOT_MINUTES = 15;
const TIMELINE_SLOT_MINUTES = 30;
const TIMELINE_ROW_HEIGHT = 36;

const state = {
  selectedDate: new Date(),
  tasks: [],
  editingTaskId: null,
};

const elements = {
  openedDate: document.getElementById("opened-date"),
  dateInput: document.getElementById("date-input"),
  taskForm: document.getElementById("task-form"),
  titleInput: document.getElementById("task-title"),
  startInput: document.getElementById("task-start"),
  endInput: document.getElementById("task-end"),
  resetBtn: document.getElementById("reset-btn"),
  timeline: document.getElementById("timeline"),
};

function pad2(num) {
  return String(num).padStart(2, "0");
}

function toMinutes(timeText) {
  if (typeof timeText !== "string") {
    return null;
  }
  const trimmed = timeText.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  return h * 60 + m;
}

function fromMinutes(total) {
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function snapToNearestSlot(minutes) {
  const snapped = Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES;
  return snapped;
}

function normalizeStartMinutes(minutes) {
  const snapped = snapToNearestSlot(minutes);
  return clamp(snapped, OPEN_MINUTES, CLOSE_MINUTES - SLOT_MINUTES);
}

function normalizeEndMinutes(minutes, startMinutes) {
  const snapped = snapToNearestSlot(minutes);
  const minEnd = clamp(startMinutes + SLOT_MINUTES, OPEN_MINUTES + SLOT_MINUTES, CLOSE_MINUTES);
  const clamped = clamp(snapped, OPEN_MINUTES, CLOSE_MINUTES);
  return clamp(clamped, minEnd, CLOSE_MINUTES);
}

function dateToInputValue(dateObj) {
  const year = dateObj.getFullYear();
  const month = pad2(dateObj.getMonth() + 1);
  const day = pad2(dateObj.getDate());
  return `${year}-${month}-${day}`;
}

function renderDateHeader() {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  elements.openedDate.textContent = formatter.format(state.selectedDate);
  elements.dateInput.value = dateToInputValue(state.selectedDate);
}

function renderTimeOptions() {
  if (!elements.startInput) {
    return;
  }
  elements.startInput.innerHTML = "";
  if (elements.endInput) {
    elements.endInput.innerHTML = "";
  }

  for (let minute = OPEN_MINUTES; minute <= CLOSE_MINUTES; minute += SLOT_MINUTES) {
    const label = fromMinutes(minute);

    const startOption = document.createElement("option");
    startOption.value = label;
    startOption.textContent = label;
    elements.startInput.appendChild(startOption);

    if (elements.endInput) {
      const endOption = document.createElement("option");
      endOption.value = label;
      endOption.textContent = label;
      elements.endInput.appendChild(endOption);
    }
  }
}

function generateSlots() {
  const slots = [];
  for (let minute = OPEN_MINUTES; minute <= CLOSE_MINUTES; minute += TIMELINE_SLOT_MINUTES) {
    slots.push(minute);
  }
  return slots;
}

function computeTaskLayout(tasks) {
  const sorted = [...tasks].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }
    return a.endMinutes - b.endMinutes;
  });

  const active = [];
  const map = new Map();

  sorted.forEach((task) => {
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].endMinutes <= task.startMinutes) {
        active.splice(i, 1);
      }
    }

    const usedColumns = new Set(active.map((entry) => entry.column));
    let column = 0;
    while (usedColumns.has(column)) {
      column += 1;
    }

    const entry = {
      id: task.id,
      endMinutes: task.endMinutes,
      column,
    };
    active.push(entry);

    if (!map.has(task.id)) {
      map.set(task.id, { column, maxColumns: 1 });
    }

    const concurrent = active.length;
    active.forEach((item) => {
      const current = map.get(item.id) ?? { column: item.column, maxColumns: 1 };
      current.maxColumns = Math.max(current.maxColumns, concurrent);
      map.set(item.id, current);
    });
  });

  return map;
}

function renderTimeline() {
  const slots = generateSlots();
  const taskLayout = computeTaskLayout(state.tasks);
  elements.timeline.innerHTML = "";

  const list = document.createElement("div");
  list.className = "timeline-list";

  const splitIndex = Math.ceil(slots.length / 2);
  const columns = [slots.slice(0, splitIndex), slots.slice(splitIndex)];

  columns.forEach((columnSlots) => {
    const column = document.createElement("section");
    column.className = "timeline-column";

    columnSlots.forEach((minute) => {
      const row = document.createElement("div");
      row.className = "slot";
      row.dataset.minute = String(minute);

      const label = document.createElement("div");
      label.className = "time-label";
      label.classList.add("major");
      label.textContent = fromMinutes(minute);

      const lane = document.createElement("div");
      lane.className = "lane";
      lane.dataset.minute = String(minute);

      const tasksStartingAtMinute = state.tasks.filter((task) => {
        if (minute + TIMELINE_SLOT_MINUTES > CLOSE_MINUTES) {
          return task.startMinutes >= minute && task.startMinutes <= CLOSE_MINUTES;
        }
        return task.startMinutes >= minute && task.startMinutes < minute + TIMELINE_SLOT_MINUTES;
      });
      tasksStartingAtMinute.forEach((task, index) => {
        const duration = Math.max(task.endMinutes - task.startMinutes, SLOT_MINUTES);
        const rowSpan = Math.max(1, Math.ceil(duration / TIMELINE_SLOT_MINUTES));
        const layout = taskLayout.get(task.id) ?? { column: index, maxColumns: 1 };

        const item = document.createElement("button");
        item.type = "button";
        item.className = "task-chip";
        item.dataset.id = task.id;
        item.style.height = `${rowSpan * TIMELINE_ROW_HEIGHT - 2}px`;
        item.style.setProperty("--col-index", String(layout.column));
        item.style.setProperty("--col-count", String(layout.maxColumns));
        item.innerHTML = `<strong>${task.title}</strong><span>${fromMinutes(task.startMinutes)} - ${fromMinutes(task.endMinutes)}</span>`;
        item.addEventListener("click", (event) => {
          event.stopPropagation();
          loadTaskForEdit(task.id);
        });
        lane.appendChild(item);
      });

      row.appendChild(label);
      row.appendChild(lane);
      column.appendChild(row);
    });

    list.appendChild(column);
  });

  elements.timeline.appendChild(list);
}

function loadTaskForEdit(taskId) {
  const task = state.tasks.find((entry) => entry.id === taskId);
  if (!task) {
    return;
  }
  state.editingTaskId = taskId;
  elements.titleInput.value = task.title;
  elements.startInput.value = fromMinutes(task.startMinutes);
  elements.endInput.value = fromMinutes(task.endMinutes);
}

function clearForm() {
  state.editingTaskId = null;
  elements.taskForm.reset();
  elements.startInput.value = "07:30";
  elements.endInput.value = "08:00";
}

function startInputFromTimeline(minute) {
  const normalized = normalizeStartMinutes(minute);
  state.editingTaskId = null;
  elements.startInput.value = fromMinutes(normalized);
  const currentEnd = toMinutes(elements.endInput.value);
  if (currentEnd === null || currentEnd <= normalized) {
    elements.endInput.value = fromMinutes(normalizeEndMinutes(normalized + 30, normalized));
  }
  elements.titleInput.focus();
  elements.titleInput.select();
}

function onTimelineClick(event) {
  const clickable = event.target.closest("[data-minute]");
  if (!clickable) {
    return;
  }
  const minute = Number(clickable.dataset.minute);
  if (Number.isNaN(minute)) {
    return;
  }

  let clickedMinute = minute;
  const lane = clickable.classList.contains("lane") ? clickable : clickable.closest(".lane");
  if (lane) {
    const rect = lane.getBoundingClientRect();
    const relativeY = event.clientY - rect.top;
    if (relativeY >= rect.height / 2) {
      clickedMinute += SLOT_MINUTES;
    }
  }

  startInputFromTimeline(clickedMinute);
}

function upsertTask(taskPayload) {
  if (state.editingTaskId) {
    state.tasks = state.tasks.map((task) => {
      if (task.id !== state.editingTaskId) {
        return task;
      }
      return { ...taskPayload, id: task.id };
    });
    state.editingTaskId = null;
  } else {
    state.tasks.push({ ...taskPayload, id: crypto.randomUUID() });
  }
}

function submitTask(event) {
  event.preventDefault();

  if (!elements.titleInput.value.trim()) {
    elements.titleInput.focus();
    return;
  }

  const rawStart = toMinutes(elements.startInput.value);
  if (rawStart === null) {
    elements.startInput.focus();
    return;
  }
  const rawEnd = toMinutes(elements.endInput.value);
  if (rawEnd === null) {
    elements.endInput.focus();
    return;
  }

  const normalizedStart = normalizeStartMinutes(rawStart);
  const normalizedEnd = normalizeEndMinutes(rawEnd, normalizedStart);

  elements.startInput.value = fromMinutes(normalizedStart);
  elements.endInput.value = fromMinutes(normalizedEnd);

  upsertTask({
    title: elements.titleInput.value.trim(),
    startMinutes: normalizedStart,
    endMinutes: normalizedEnd,
  });

  state.tasks.sort((a, b) => a.startMinutes - b.startMinutes);
  renderTimeline();
  clearForm();
}

function onDateChange(event) {
  const selected = event.target.valueAsDate;
  if (!selected) {
    return;
  }
  state.selectedDate = selected;
  renderDateHeader();
}

function onStartInputChange() {
  if (!elements.startInput.value) {
    return;
  }
  const minutes = toMinutes(elements.startInput.value);
  if (minutes === null) {
    return;
  }
  const normalized = normalizeStartMinutes(minutes);
  elements.startInput.value = fromMinutes(normalized);

  const currentEnd = toMinutes(elements.endInput.value);
  if (currentEnd === null || currentEnd <= normalized) {
    elements.endInput.value = fromMinutes(normalizeEndMinutes(normalized + 30, normalized));
  }
}

function onEndInputChange() {
  if (!elements.endInput.value) {
    return;
  }
  const endMinutes = toMinutes(elements.endInput.value);
  if (endMinutes === null) {
    return;
  }
  const startMinutes = toMinutes(elements.startInput.value);
  const normalizedStart = normalizeStartMinutes(startMinutes ?? OPEN_MINUTES);
  const normalizedEnd = normalizeEndMinutes(endMinutes, normalizedStart);
  elements.endInput.value = fromMinutes(normalizedEnd);
}

function init() {
  renderTimeOptions();
  renderDateHeader();
  renderTimeline();
  clearForm();

  elements.taskForm.addEventListener("submit", submitTask);
  elements.dateInput.addEventListener("change", onDateChange);
  elements.startInput.addEventListener("change", onStartInputChange);
  elements.endInput.addEventListener("change", onEndInputChange);
  elements.resetBtn.addEventListener("click", clearForm);
  elements.timeline.addEventListener("click", onTimelineClick);
}

init();
