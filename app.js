const OPEN_MINUTES = 7 * 60 + 30;
const CLOSE_MINUTES = 18 * 60;
const SLOT_MINUTES = 15;
const AXIS_LABEL_MINUTES = 30;
const SLOT_HEIGHT = 28;

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
  durationInput: document.getElementById("task-duration"),
  resetBtn: document.getElementById("reset-btn"),
  timeline: document.getElementById("timeline"),
};

function pad2(num) {
  return String(num).padStart(2, "0");
}

function toMinutes(timeText) {
  const [h, m] = timeText.split(":").map(Number);
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
  return clamp(snapped, OPEN_MINUTES, CLOSE_MINUTES);
}

function normalizeDuration(durationMinutes) {
  const safe = Math.max(SLOT_MINUTES, Number(durationMinutes) || SLOT_MINUTES);
  return Math.round(safe / SLOT_MINUTES) * SLOT_MINUTES;
}

function timeToY(minutes) {
  return ((minutes - OPEN_MINUTES) / SLOT_MINUTES) * SLOT_HEIGHT;
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

function generateSlots() {
  const slots = [];
  for (let minute = OPEN_MINUTES; minute <= CLOSE_MINUTES; minute += SLOT_MINUTES) {
    slots.push(minute);
  }
  return slots;
}

function renderTimeline() {
  const slots = generateSlots();
  elements.timeline.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "slot-container";

  slots.forEach((minute) => {
    const row = document.createElement("div");
    row.className = "slot";

    const label = document.createElement("div");
    label.className = "time-label";
    if (minute % AXIS_LABEL_MINUTES === 0) {
      label.classList.add("major");
      label.textContent = fromMinutes(minute);
    } else {
      label.classList.add("blank");
      label.textContent = "";
    }

    const lane = document.createElement("div");
    lane.className = "lane";

    row.appendChild(label);
    row.appendChild(lane);
    grid.appendChild(row);
  });

  const taskLayer = document.createElement("div");
  taskLayer.className = "task-layer";
  taskLayer.style.height = `${slots.length * SLOT_HEIGHT}px`;

  state.tasks.forEach((task) => {
    const item = document.createElement("article");
    item.className = "task-item";
    item.style.top = `${timeToY(task.startMinutes)}px`;
    item.style.height = `${Math.max((task.duration / SLOT_MINUTES) * SLOT_HEIGHT - 4, SLOT_HEIGHT - 4)}px`;
    item.dataset.id = task.id;
    item.innerHTML = `<strong>${task.title}</strong><span>${fromMinutes(task.startMinutes)} (${task.duration}分)</span>`;
    item.addEventListener("click", (event) => {
      event.stopPropagation();
      loadTaskForEdit(task.id);
    });
    taskLayer.appendChild(item);
  });

  elements.timeline.appendChild(grid);
  elements.timeline.appendChild(taskLayer);
}

function loadTaskForEdit(taskId) {
  const task = state.tasks.find((entry) => entry.id === taskId);
  if (!task) {
    return;
  }
  state.editingTaskId = taskId;
  elements.titleInput.value = task.title;
  elements.startInput.value = fromMinutes(task.startMinutes);
  elements.durationInput.value = String(task.duration);
}

function clearForm() {
  state.editingTaskId = null;
  elements.taskForm.reset();
  elements.startInput.value = "07:30";
  elements.durationInput.value = "30";
}

function startInputFromTimeline(minute) {
  const normalized = normalizeStartMinutes(minute);
  state.editingTaskId = null;
  elements.startInput.value = fromMinutes(normalized);
  elements.titleInput.focus();
  elements.titleInput.select();
}

function onTimelineClick(event) {
  const timelineRect = elements.timeline.getBoundingClientRect();
  const clickY = event.clientY - timelineRect.top + elements.timeline.scrollTop;
  const rawMinutes = OPEN_MINUTES + Math.round(clickY / SLOT_HEIGHT) * SLOT_MINUTES;
  startInputFromTimeline(rawMinutes);
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
  const normalizedStart = normalizeStartMinutes(rawStart);
  const normalizedDuration = normalizeDuration(elements.durationInput.value);

  elements.startInput.value = fromMinutes(normalizedStart);
  elements.durationInput.value = String(normalizedDuration);

  upsertTask({
    title: elements.titleInput.value.trim(),
    startMinutes: normalizedStart,
    duration: normalizedDuration,
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
  const normalized = normalizeStartMinutes(toMinutes(elements.startInput.value));
  elements.startInput.value = fromMinutes(normalized);
}

function onDurationInputChange() {
  const normalized = normalizeDuration(elements.durationInput.value);
  elements.durationInput.value = String(normalized);
}

function init() {
  renderDateHeader();
  renderTimeline();
  clearForm();

  elements.taskForm.addEventListener("submit", submitTask);
  elements.dateInput.addEventListener("change", onDateChange);
  elements.startInput.addEventListener("change", onStartInputChange);
  elements.durationInput.addEventListener("change", onDurationInputChange);
  elements.resetBtn.addEventListener("click", clearForm);
  elements.timeline.addEventListener("click", onTimelineClick);
}

init();
