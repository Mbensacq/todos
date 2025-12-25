const taskInput = document.getElementById("taskInput");
const dateInput = document.getElementById("dateInput");
const priorityInput = document.getElementById("priorityInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");
const listTitle = document.querySelector(".tasks-wrapper h2");

const totalSpan = document.getElementById("totalCount");
const pendingSpan = document.getElementById("pendingCount");
const doneSpan = document.getElementById("doneCount");
const filterButtons = {
  all: document.getElementById("filter-all"),
  today: document.getElementById("filter-today"),
  important: document.getElementById("filter-important"),
  completed: document.getElementById("filter-completed"),
};

const modal = document.getElementById("confirmationModal");
const confirmBtn = document.getElementById("confirmBtn");
const cancelBtn = document.getElementById("cancelBtn");
let taskToDeleteId = null;

let tasks = JSON.parse(localStorage.getItem("proTask_db")) || [];
let currentFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
  dateInput.valueAsDate = new Date();
  renderTasks();
  updateStats();
  setupFilters();
});

function addTask() {
  const text = taskInput.value.trim();
  const priority = priorityInput.value;
  const date = dateInput.value;

  if (text === "") return alert("Ajoute du texte !");

  const newTask = {
    id: Date.now(),
    text: text,
    priority,
    dueDate: date,
    completed: false,
  };

  tasks.unshift(newTask);
  saveData();

  if (currentFilter !== "all") filterButtons["all"].click();
  else {
    renderTasks();
    updateStats();
  }

  taskInput.value = "";
  dateInput.valueAsDate = new Date();

  taskInput.focus();
}

function renderTasks() {
  taskList.innerHTML = "";
  const todayStr = getTodayKey();

  const filteredTasks = tasks.filter((task) => {
    if (currentFilter === "all") return true;
    if (currentFilter === "today") return isDueToday(task, todayStr);
    if (currentFilter === "important") return task.priority === "high";
    if (currentFilter === "completed") return task.completed;
  });

  updateListTitle(filteredTasks.length);

  if (filteredTasks.length === 0) {
    taskList.innerHTML = `<p style="text-align:center; color:var(--text-grey); margin-top:20px;">Aucune tâche ici.</p>`;
    return;
  }

  filteredTasks.forEach((task) => {
    const li = document.createElement("li");
    li.setAttribute("draggable", "true");
    li.className = `task-item priority-${task.priority} ${
      task.completed ? "completed" : ""
    }`;
    li.setAttribute("data-id", task.id);

    const dateDisplay = task.dueDate
      ? new Date(task.dueDate).toLocaleDateString("fr-FR")
      : "Aucune date";

    li.innerHTML = `
            <div class="task-content">
                <div class="task-text">
                    ${task.text}
                    <div style="font-size: 0.75rem; color: var(--text-grey); margin-top: 4px;">
                        <i class="fa-regular fa-calendar"></i> ${dateDisplay}
                    </div>
                </div>
            </div>
            <div class="task-actions">
                <button class="check" onclick="toggleTask(event, ${task.id})">
                    <i class="fa-solid ${
                      task.completed ? "fa-rotate-left" : "fa-check"
                    }"></i>
                </button>
                <button class="delete" onclick="deleteTask(${task.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
    addDragEvents(li);
    taskList.appendChild(li);
  });
}

function triggerConfetti(x, y) {
  confetti({
    particleCount: 25,
    spread: 40,
    startVelocity: 20,
    gravity: 1.5,
    ticks: 100,
    origin: { x: x, y: y },
    colors: ["#10b981", "#4f46e5"],
    shapes: ["circle"],
  });
}

window.toggleTask = function (event, id) {
  if (event) event.stopPropagation();
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completed = !task.completed;
    if (task.completed && event) {
      const xNormalized = event.clientX / window.innerWidth;
      const yNormalized = event.clientY / window.innerHeight;
      triggerConfetti(xNormalized, yNormalized);
    }
    saveData();
    renderTasks();
    updateStats();
  }
};

function saveData() {
  localStorage.setItem("proTask_db", JSON.stringify(tasks));
}
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  totalSpan.innerText = total;
  doneSpan.innerText = completed;
  pendingSpan.innerText = total - completed;
}
function getTodayKey() {
  return new Date().toLocaleDateString("fr-CA");
}
function isDueToday(task, todayStr) {
  if (task.dueDate) return task.dueDate === todayStr;
  return isTimestampToday(task.id, todayStr);
}
function isTimestampToday(timestamp, todayStr) {
  return new Date(timestamp).toLocaleDateString("fr-CA") === todayStr;
}
function updateListTitle(count) {
  const titles = {
    all: "Toutes les tâches",
    today: "À faire aujourd'hui",
    important: "Urgent",
    completed: "Terminées",
  };
  listTitle.innerText = `${titles[currentFilter]} (${count})`;
}
function setupFilters() {
  for (const [key, btn] of Object.entries(filterButtons)) {
    btn.addEventListener("click", () => {
      document.querySelector(".menu li.active").classList.remove("active");
      btn.classList.add("active");
      currentFilter = key;
      renderTasks();
    });
  }
}
function updateHeaderDate() {
  const dateElement = document.getElementById("headerDate");
  const now = new Date();
  const dateString = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeString = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  dateElement.innerText = `${dateString} • ${timeString}`;
}

updateHeaderDate();
setInterval(updateHeaderDate, 1000);
function addDragEvents(li) {
  li.addEventListener("dragstart", () => li.classList.add("dragging"));
  li.addEventListener("dragend", () => {
    li.classList.remove("dragging");
    updateOrder();
  });
}
taskList.addEventListener("dragover", (e) => {
  e.preventDefault();
  const afterElement = getDragAfterElement(taskList, e.clientY);
  const draggable = document.querySelector(".dragging");
  if (afterElement == null) taskList.appendChild(draggable);
  else taskList.insertBefore(draggable, afterElement);
});
function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll(".task-item:not(.dragging)"),
  ];
  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      return offset < 0 && offset > closest.offset
        ? { offset: offset, element: child }
        : closest;
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}
function updateOrder() {
  if (currentFilter !== "all") return;
  const newOrderIds = [...taskList.querySelectorAll(".task-item")].map((li) =>
    parseInt(li.getAttribute("data-id"))
  );
  tasks = newOrderIds.map((id) => tasks.find((t) => t.id === id));
  saveData();
}
window.deleteTask = function (id) {
  taskToDeleteId = id;
  modal.classList.add("active");
};

cancelBtn.addEventListener("click", () => {
  modal.classList.remove("active");
  taskToDeleteId = null;
});

confirmBtn.addEventListener("click", () => {
  if (taskToDeleteId !== null) {
    tasks = tasks.filter((t) => t.id !== taskToDeleteId);
    saveData();
    renderTasks();
    updateStats();
    modal.classList.remove("active");
    taskToDeleteId = null;
  }
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.remove("active");
    taskToDeleteId = null;
  }
});
addBtn.addEventListener("click", addTask);
taskInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addTask();
});

const themeBtn = document.getElementById("theme-toggle");
const body = document.body;
const currentTheme = localStorage.getItem("proTask_theme");
if (currentTheme === "dark") {
  body.setAttribute("data-theme", "dark");
  themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i> Mode Clair';
}
themeBtn.addEventListener("click", () => {
  if (body.getAttribute("data-theme") === "dark") {
    body.removeAttribute("data-theme");
    localStorage.setItem("proTask_theme", "light");
    themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i> Mode Sombre';
  } else {
    body.setAttribute("data-theme", "dark");
    localStorage.setItem("proTask_theme", "dark");
    themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i> Mode Clair';
  }
});
