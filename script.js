const taskInput = document.getElementById("taskInput");
const descInput = document.getElementById("descInput");
const dateInput = document.getElementById("dateInput");
const recurrenceInput = document.getElementById("recurrenceInput");
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

const confirmModal = document.getElementById("confirmationModal");
const editModal = document.getElementById("editModal");
const editRecurrence = document.getElementById("editRecurrence");
const toggleBulkBtn = document.getElementById("toggleBulkBtn");
const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");
const selectedCountSpan = document.getElementById("selectedCount");
const mobileAddBtn = document.getElementById("mobileAddBtn");
let currentActionId = null;

let isBulkMode = false;
let selectedIds = new Set();

let tasks = JSON.parse(localStorage.getItem("proTask_db")) || [];
let currentFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
  dateInput.valueAsDate = new Date();
  updateHeaderDate();
  renderTasks();
  updateStats();
  setupFilters();
});

function addTask() {
  const text = taskInput.value.trim();
  const desc = descInput.value.trim();
  const priority = priorityInput.value;
  const date = dateInput.value;
  const recurrence = recurrenceInput.value;

  if (text === "") return alert("Le titre est obligatoire !");

  const newTask = {
    id: Date.now(),
    text: text,
    description: desc,
    priority: priority,
    dueDate: date,
    recurrence: recurrence,
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
  descInput.value = "";
  dateInput.valueAsDate = new Date();
  recurrenceInput.value = "none";
  taskInput.focus();
}

function renderTasks() {
  taskList.innerHTML = "";
  const todayStr = new Date().toISOString().split("T")[0];

  const filtered = tasks.filter((task) => {
    if (currentFilter === "all") return true;
    if (currentFilter === "today") {
      return (
        task.dueDate === todayStr ||
        (task.dueDate < todayStr && !task.completed)
      );
    }
    if (currentFilter === "important") return task.priority === "high";
    if (currentFilter === "completed") return task.completed;
  });

  const activeTasks = [];
  const completedTasks = [];

  filtered.forEach((task) => {
    if (task.completed) completedTasks.push(task);
    else activeTasks.push(task);
  });

  const createTaskElement = (task) => {
    const li = document.createElement("li");
    li.setAttribute("draggable", "true");
    li.className = `task-item priority-${task.priority} ${
      task.completed ? "completed" : ""
    } ${isBulkMode ? "bulk-mode" : ""}`;
    li.setAttribute("data-id", task.id);

    const dateDisplay = task.dueDate
      ? new Date(task.dueDate).toLocaleDateString("fr-FR")
      : "";
    const isOverdue = task.dueDate && task.dueDate < todayStr && !task.completed;
    const overdueBadge = isOverdue
      ? `<span class="badge-overdue">En retard</span>`
      : "";
    const descIcon = task.description
      ? `<i class="fa-solid fa-align-left" style="font-size: 0.7rem; margin-left:5px; opacity:0.7;"></i>`
      : "";
    const recurrenceIcon =
      task.recurrence && task.recurrence !== "none"
        ? task.recurrence === "daily"
          ? "🔁"
          : "📅"
        : "";

    const isSelected = selectedIds.has(task.id);

    li.innerHTML = `
            <input type="checkbox" class="select-checkbox" ${
              isSelected ? "checked" : ""
            } onclick="toggleSelection(event, ${task.id})">

            <div class="task-header">
                <div class="task-content" onclick="toggleDesc(${task.id})">
                    <div class="task-text">
                        ${task.text} ${descIcon}
                    </div>
                    <div class="task-meta">
                        <span><i class="fa-regular fa-calendar"></i> ${dateDisplay} ${recurrenceIcon}</span>
                        ${overdueBadge}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="check" onclick="toggleTask(event, ${
                      task.id
                    })">
                        <i class="fa-solid ${
                          task.completed ? "fa-rotate-left" : "fa-check"
                        }"></i>
                    </button>
                    <button class="edit" onclick="openEditModal(${task.id})">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="delete" onclick="confirmDelete(${task.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            <div id="desc-${task.id}" class="task-desc">
                ${
                  task.description
                    ? task.description.replace(/\n/g, "<br>")
                    : "Aucune description."
                }
            </div>
        `;
    addDragEvents(li);
    return li;
  };

  if (activeTasks.length > 0) {
    activeTasks.forEach((t) => taskList.appendChild(createTaskElement(t)));
  } else if (completedTasks.length === 0) {
    // Le retour de la tasse de café ! ☕
    taskList.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon"><i class="fa-solid fa-mug-hot"></i></div>
            <p>Aucune tâche ici. Profite de ta journée !</p>
        </div>
    `;
  }

  if (completedTasks.length > 0) {
    if (activeTasks.length > 0) {
      const separator = document.createElement("div");
      separator.className = "tasks-separator";
      if (isBulkMode) {
        const allSelected = completedTasks.every((t) => selectedIds.has(t.id));
        separator.innerHTML = `
          <input type="checkbox" class="select-checkbox" style="display:block; margin:0;" ${
            allSelected ? "checked" : ""
          } onclick="toggleAllCompleted(this.checked)">
          Terminées
        `;
      } else {
        separator.innerText = "Terminées";
      }
      taskList.appendChild(separator);
    }
    completedTasks.forEach((t) => taskList.appendChild(createTaskElement(t)));
  }

  updateListTitle(filtered.length);
}

window.toggleDesc = function (id) {
  const descDiv = document.getElementById(`desc-${id}`);
  descDiv.classList.toggle("show");
};

window.openEditModal = function (id) {
  document.querySelector("#editModal h3").innerText = "✏️ Modifier la tâche";
  document.getElementById("saveEditBtn").innerText = "Sauvegarder";

  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  currentActionId = id;
  document.getElementById("editTitle").value = task.text;
  document.getElementById("editDesc").value = task.description || "";
  document.getElementById("editDate").value = task.dueDate;
  editRecurrence.value = task.recurrence || "none";
  document.getElementById("editPriority").value = task.priority;

  editModal.classList.add("active");
};

document.getElementById("saveEditBtn").addEventListener("click", () => {
  const title = document.getElementById("editTitle").value.trim();
  if (!title) return alert("Le titre est obligatoire !");

  const desc = document.getElementById("editDesc").value;
  const date = document.getElementById("editDate").value;
  const recurrenceVal = editRecurrence.value;
  const priorityVal = document.getElementById("editPriority").value;

  if (currentActionId === "CREATE_NEW") {
    const newTask = {
      id: Date.now(),
      text: title,
      description: desc,
      priority: priorityVal,
      dueDate: date,
      recurrence: recurrenceVal,
      completed: false,
    };
    tasks.unshift(newTask);
  } else if (currentActionId !== null) {
    const task = tasks.find((t) => t.id === currentActionId);
    if (task) {
      task.text = title;
      task.description = desc;
      task.dueDate = date;
      task.recurrence = recurrenceVal;
      task.priority = priorityVal;
    }
  } else {
    return;
  }

  saveData();
  renderTasks();
  updateStats();
  editModal.classList.remove("active");
  currentActionId = null;
});

document.getElementById("cancelEditBtn").addEventListener("click", () => {
  editModal.classList.remove("active");
  currentActionId = null;
});

// --- Ajout mobile via la modale d'édition ---
if (mobileAddBtn) {
  mobileAddBtn.addEventListener("click", () => {
    document.querySelector("#editModal h3").innerText = "✨ Nouvelle tâche";
    document.getElementById("saveEditBtn").innerText = "Ajouter";

    document.getElementById("editTitle").value = "";
    document.getElementById("editDesc").value = "";
    document.getElementById("editDate").valueAsDate = new Date();
    editRecurrence.value = "none";
    document.getElementById("editPriority").value = "low";

    currentActionId = "CREATE_NEW";
    editModal.classList.add("active");

    setTimeout(() => document.getElementById("editTitle").focus(), 100);
  });
}

window.confirmDelete = function (id) {
  document.querySelector(".modal-box h3").innerText = "🗑️ Suppression";
  document.querySelector(".modal-box p").innerText =
    "Es-tu sûr de vouloir supprimer cette tâche définitivement ?";
  currentActionId = id;
  confirmModal.classList.add("active");
};
document.getElementById("confirmBtn").addEventListener("click", () => {
  if (currentActionId === "BULK_DELETE") {
    tasks = tasks.filter((t) => !selectedIds.has(t.id));
    selectedIds.clear();
    isBulkMode = false;
    toggleBulkBtn.classList.remove("active");
    bulkDeleteBtn.classList.remove("visible");
  } else if (currentActionId !== null) {
    tasks = tasks.filter((t) => t.id !== currentActionId);
  }
  saveData();
  renderTasks();
  updateStats();
  confirmModal.classList.remove("active");
  currentActionId = null;
});
document.getElementById("cancelBtn").addEventListener("click", () => {
  confirmModal.classList.remove("active");
  currentActionId = null;
});

window.toggleTask = function (event, id) {
  if (event) event.stopPropagation();
  const task = tasks.find((t) => t.id === id);

  if (task) {
    const isCompleting = !task.completed;
    task.completed = isCompleting;

    if (isCompleting) {
      if (event) {
        const x = event.clientX / window.innerWidth;
        const y = event.clientY / window.innerHeight;
        triggerConfetti(x, y);
      }

      if (task.recurrence && task.recurrence !== "none") {
        createNextRecurringTask(task);
      }
    }

    saveData();
    renderTasks();
    updateStats();
  }
};
function createNextRecurringTask(originalTask) {
  const nextDate = new Date();

  if (originalTask.recurrence === "daily") {
    nextDate.setDate(nextDate.getDate() + 1);
  } else if (originalTask.recurrence === "weekly") {
    nextDate.setDate(nextDate.getDate() + 7);
  }

  const newTask = {
    ...originalTask,
    id: Date.now(),
    dueDate: nextDate.toISOString().split("T")[0],
    completed: false,
  };

  tasks.unshift(newTask);
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
function updateListTitle(count) {
  const titles = {
    all: "Toutes les tâches",
    today: "À faire (incl. retards)",
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
  const now = new Date();
  document.getElementById("headerDate").innerText = `${now.toLocaleDateString(
    "fr-FR",
    { weekday: "long", day: "numeric", month: "long" }
  )} • ${now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
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

toggleBulkBtn.addEventListener("click", () => {
  isBulkMode = !isBulkMode;
  toggleBulkBtn.classList.toggle("active");
  selectedIds.clear();
  updateBulkUI();
  renderTasks();
});

window.toggleSelection = function (event, id) {
  if (event) event.stopPropagation();
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  updateBulkUI();
};

function updateBulkUI() {
  selectedCountSpan.innerText = selectedIds.size;
  if (selectedIds.size > 0) bulkDeleteBtn.classList.add("visible");
  else bulkDeleteBtn.classList.remove("visible");
}

window.toggleAllCompleted = function (isChecked) {
  const completedTasks = tasks.filter((t) => t.completed);
  if (isChecked) {
    completedTasks.forEach((t) => selectedIds.add(t.id));
  } else {
    completedTasks.forEach((t) => selectedIds.delete(t.id));
  }
  updateBulkUI();
  renderTasks();
};

bulkDeleteBtn.addEventListener("click", () => {
  if (selectedIds.size === 0) return;
  document.querySelector(".modal-box h3").innerText = "🗑️ Suppression multiple";
  document.querySelector(
    ".modal-box p"
  ).innerText = `Voulez-vous vraiment supprimer ces ${selectedIds.size} tâches ?`;
  currentActionId = "BULK_DELETE";
  confirmModal.classList.add("active");
});

addBtn.addEventListener("click", addTask);
const burgerBtn = document.getElementById("burgerBtn");
const sidebar = document.querySelector(".sidebar");
const mobileOverlay = document.getElementById("mobileOverlay");
function toggleMenu() {
  sidebar.classList.toggle("active");
  mobileOverlay.classList.toggle("active");
}
burgerBtn.addEventListener("click", toggleMenu);
mobileOverlay.addEventListener("click", toggleMenu);
document.querySelectorAll(".menu li").forEach((item) => {
  item.addEventListener("click", () => {
    if (window.innerWidth < 768) toggleMenu();
  });
});

// --- RACCOURCIS CLAVIER (Navigation & validation) ---
const editTitleInput = document.getElementById("editTitle");
const editDescInput = document.getElementById("editDesc");
const editDateInput = document.getElementById("editDate");
const editPriorityInput = document.getElementById("editPriority");
const saveEditBtn = document.getElementById("saveEditBtn");

if (taskInput) {
  taskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      descInput.focus();
    }
  });

  [descInput, dateInput, recurrenceInput, priorityInput].forEach((input) => {
    if (!input) return;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        addBtn.click();
      }
    });
  });
}

if (editTitleInput) {
  editTitleInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      editDescInput?.focus();
    }
  });

  [editDescInput, editDateInput, editRecurrence, editPriorityInput].forEach(
    (input) => {
      if (!input) return;
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          saveEditBtn?.click();
        }
      });
    }
  );
}

const themeBtn = document.getElementById("theme-toggle");
const body = document.body;
if (localStorage.getItem("proTask_theme") === "dark") {
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
