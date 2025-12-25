// --- 1. SÉLECTION DOM ---
const taskInput = document.getElementById("taskInput");
const descInput = document.getElementById("descInput"); // Nouveau
const dateInput = document.getElementById("dateInput");
const priorityInput = document.getElementById("priorityInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");
const listTitle = document.querySelector(".tasks-wrapper h2");

// Stats & Filtres
const totalSpan = document.getElementById("totalCount");
const pendingSpan = document.getElementById("pendingCount");
const doneSpan = document.getElementById("doneCount");
const filterButtons = {
  all: document.getElementById("filter-all"),
  today: document.getElementById("filter-today"),
  important: document.getElementById("filter-important"),
  completed: document.getElementById("filter-completed"),
};

// Modales
const confirmModal = document.getElementById("confirmationModal");
const editModal = document.getElementById("editModal"); // Nouveau
let currentActionId = null; // ID utilisé pour supression OU édition

// --- 2. STATE ---
let tasks = JSON.parse(localStorage.getItem("proTask_db")) || [];
let currentFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
  dateInput.valueAsDate = new Date();
  updateHeaderDate();
  renderTasks();
  updateStats();
  setupFilters();
});

// --- 3. FONCTIONS PRINCIPALES ---

function addTask() {
  const text = taskInput.value.trim();
  const desc = descInput.value.trim();
  const priority = priorityInput.value;
  const date = dateInput.value;

  if (text === "") return alert("Le titre est obligatoire !");

  const newTask = {
    id: Date.now(),
    text: text,
    description: desc, // On sauvegarde la description
    priority: priority,
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

  // Reset Form
  taskInput.value = "";
  descInput.value = ""; // Reset description
  dateInput.valueAsDate = new Date();
  taskInput.focus();
}

function renderTasks() {
  taskList.innerHTML = "";
  const todayStr = new Date().toISOString().split("T")[0];

  const filteredTasks = tasks.filter((task) => {
    if (currentFilter === "all") return true;
    // LOGIQUE "À FAIRE" : Aujourd'hui + Retards
    if (currentFilter === "today") {
      return (
        task.dueDate === todayStr ||
        (task.dueDate < todayStr && !task.completed)
      );
    }
    if (currentFilter === "important") return task.priority === "high";
    if (currentFilter === "completed") return task.completed;
  });

  updateListTitle(filteredTasks.length);

  if (filteredTasks.length === 0) {
    // Empty State joli
    taskList.innerHTML = `
            <div style="text-align:center; padding: 40px; color:var(--text-grey);">
                <i class="fa-solid fa-mug-hot" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>Aucune tâche ici. Profite de ta journée !</p>
            </div>`;
    return;
  }

  filteredTasks.forEach((task) => {
    const li = document.createElement("li");
    li.setAttribute("draggable", "true");
    li.className = `task-item priority-${task.priority} ${
      task.completed ? "completed" : ""
    }`;
    li.setAttribute("data-id", task.id);

    // Calcul du retard
    const isOverdue = task.dueDate < todayStr && !task.completed;
    const dateDisplay = task.dueDate
      ? new Date(task.dueDate).toLocaleDateString("fr-FR")
      : "";
    const overdueBadge = isOverdue
      ? `<span class="badge-overdue">En retard</span>`
      : "";
    const descIcon = task.description
      ? `<i class="fa-solid fa-align-left" style="font-size: 0.7rem; margin-left:5px; opacity:0.7;"></i>`
      : "";

    li.innerHTML = `
            <div class="task-header">
                <div class="task-content" onclick="toggleDesc(${task.id})">
                    <div class="task-text">
                        ${task.text} ${descIcon}
                    </div>
                    <div class="task-meta">
                        <span><i class="fa-regular fa-calendar"></i> ${dateDisplay}</span>
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
    taskList.appendChild(li);
  });
}

// --- 4. INTERACTIONS NOUVELLES ---

// Ouvrir/Fermer la description
window.toggleDesc = function (id) {
  const descDiv = document.getElementById(`desc-${id}`);
  descDiv.classList.toggle("show");
};

// Ouvrir la modale d'édition
window.openEditModal = function (id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  currentActionId = id;
  document.getElementById("editTitle").value = task.text;
  document.getElementById("editDesc").value = task.description || "";
  document.getElementById("editDate").value = task.dueDate;
  document.getElementById("editPriority").value = task.priority;

  editModal.classList.add("active");
};

// Sauvegarder l'édition
document.getElementById("saveEditBtn").addEventListener("click", () => {
  if (currentActionId === null) return;

  const task = tasks.find((t) => t.id === currentActionId);
  if (task) {
    task.text = document.getElementById("editTitle").value;
    task.description = document.getElementById("editDesc").value;
    task.dueDate = document.getElementById("editDate").value;
    task.priority = document.getElementById("editPriority").value;

    saveData();
    renderTasks();
    updateStats();
    editModal.classList.remove("active");
    currentActionId = null;
  }
});

document.getElementById("cancelEditBtn").addEventListener("click", () => {
  editModal.classList.remove("active");
  currentActionId = null;
});

// --- 5. LOGIQUE EXISTANTE (Confettis, Delete, Drag, etc.) ---

// Delete Modal
window.confirmDelete = function (id) {
  currentActionId = id;
  confirmModal.classList.add("active");
};
document.getElementById("confirmBtn").addEventListener("click", () => {
  if (currentActionId) {
    tasks = tasks.filter((t) => t.id !== currentActionId);
    saveData();
    renderTasks();
    updateStats();
    confirmModal.classList.remove("active");
    currentActionId = null;
  }
});
document.getElementById("cancelBtn").addEventListener("click", () => {
  confirmModal.classList.remove("active");
  currentActionId = null;
});

// Toggle (Check) + Confetti
window.toggleTask = function (event, id) {
  if (event) event.stopPropagation();
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completed = !task.completed;
    if (task.completed && event) {
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;
      triggerConfetti(x, y);
    }
    saveData();
    renderTasks();
    updateStats();
  }
};
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

// Utilitaires
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

// Drag & Drop
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

// Events Initiaux
addBtn.addEventListener("click", addTask);
// Mobile Menu
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

// Dark Mode logic
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
