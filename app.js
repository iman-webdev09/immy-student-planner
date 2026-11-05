// ===== 1. THEME TOGGLE =====
const htmlElement = document.documentElement;
const themeToggleBtn = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const moonIcon = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
const sunIcon = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';

const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  htmlElement.setAttribute('data-theme', savedTheme);
  themeIcon.innerHTML = savedTheme === 'dark' ? sunIcon : moonIcon;
}
themeToggleBtn.addEventListener('click', () => {
  const newTheme = htmlElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  htmlElement.setAttribute('data-theme', newTheme);
  themeIcon.innerHTML = newTheme === 'dark' ? sunIcon : moonIcon;
  localStorage.setItem('theme', newTheme);
});

// ===== 2. DATA MANAGEMENT =====
let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
let subjects = JSON.parse(localStorage.getItem('mySubjects')) || [];
let notes = JSON.parse(localStorage.getItem('myNotes')) || [];
let studyLogs = JSON.parse(localStorage.getItem('myStudyLogs')) || [];
let selectedColor = '#3b82f6';
let editingTaskId = null;

function saveTasks() { localStorage.setItem('myTasks', JSON.stringify(tasks)); }
function saveSubjects() { localStorage.setItem('mySubjects', JSON.stringify(subjects)); }
function saveNotes() { localStorage.setItem('myNotes', JSON.stringify(notes)); }
function saveStudyLogs() { localStorage.setItem('myStudyLogs', JSON.stringify(studyLogs)); }

// ===== 3. SMART RISK CALCULATOR =====
const DEFAULT_DAILY_CAPACITY = 3;

function getDailyCapacity() {
  const saved = parseFloat(localStorage.getItem('dailyStudyCapacity'));
  return isNaN(saved) ? DEFAULT_DAILY_CAPACITY : saved;
}

function calculateRisk(dueDate, estimatedHours) {
  if (!dueDate) return 'low';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dueDate);
  deadline.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 3600 * 24;
  const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / msPerDay);

  if (daysLeft < 0) return 'high';   
  if (daysLeft === 0) return 'high'; 

  const availableHours = daysLeft * getDailyCapacity();
  const ratio = estimatedHours / availableHours;

  if (ratio > 1)   return 'high';  
  if (ratio > 0.6) return 'med';   
  return 'low';
}

// ===== 4. RENDER TASKS =====
function renderTasks() {
  const container = document.getElementById('taskContainer');
  if (!container) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const overdue = [];
  const todayTasks = [];
  const upcoming = [];

  tasks.filter(t => !t.completed).forEach(task => {
    if (!task.due || task.due === 'No date') return;
    const d = new Date(task.due);
    d.setHours(0, 0, 0, 0);

    if (d.getTime() < today.getTime())          overdue.push(task);
    else if (d.getTime() === today.getTime())   todayTasks.push(task);
    else if (d.getTime() <= nextWeek.getTime()) upcoming.push(task);
  });

  const renderSection = (title, list, emptyMsg) => {
    if (list.length === 0 && !emptyMsg) return '';
    const items = list.length === 0
      ? `<p style="text-align:center;color:var(--text-muted);padding:12px;">${emptyMsg}</p>`
      : list.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}">
          <div class="task-check" onclick="toggleTask(${task.id})"></div>
          <div class="task-info">
            <h4>${task.name}</h4>
            <div class="task-meta">
              <span class="subject-tag"><span class="subject-dot" style="background:${task.color};"></span> ${task.subject}</span>
              <span>${task.due}</span>
            </div>
          </div>
          <div class="badge ${task.risk}">${task.risk.toUpperCase()}</div>
          <div class="task-actions">
            <button class="icon-btn edit" onclick="editTask(${task.id})">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            <button class="icon-btn delete" onclick="deleteTask(${task.id})">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `).join('');
    return `<h3 style="font-size:0.8rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin:15px 0 5px;">${title}</h3>${items}`;
  };

  const html =
    renderSection('⚠ Overdue', overdue, overdue.length === 0 ? '' : null) +
    renderSection('Today', todayTasks, null) +
    renderSection('Next 7 Days', upcoming, null);

  if (overdue.length + todayTasks.length + upcoming.length === 0) {
    container.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:20px;">No tasks due in the next 7 days. Enjoy the calm! 🌿</p>`;
  } else {
    container.innerHTML = html;
  }

  updateRiskAlert();
}

function toggleTask(id) {
  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex > -1) {
    tasks[taskIndex].completed = !tasks[taskIndex].completed;
    saveTasks(); renderTasks();
  }
}

function deleteTask(id) {
  if(confirm("Kya aap waqai yeh task delete karna chahte hain?")) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks(); renderTasks();
  }
}

function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  editingTaskId = id;
  document.getElementById('taskName').value = task.name;
  document.getElementById('taskSubject').value = task.subject;
  document.getElementById('taskDue').value = task.due !== 'No date' ? task.due : '';
  document.getElementById('taskHours').value = task.hours || 1;
  document.getElementById('modalTitle').textContent = "Edit Task";
  document.getElementById('taskModal').classList.add('active');
}

function saveEditedTask() {
  const name = document.getElementById('taskName').value;
  const subject = document.getElementById('taskSubject').value;
  const due = document.getElementById('taskDue').value;
  const hours = parseInt(document.getElementById('taskHours').value) || 1;
  if (!name || !subject) return alert("Please enter name and subject");
  
  const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
  if (taskIndex > -1) {
    tasks[taskIndex].name = name;
    tasks[taskIndex].subject = subject;
    tasks[taskIndex].due = due || 'No date';
    tasks[taskIndex].hours = hours;
    tasks[taskIndex].risk = calculateRisk(due, hours); 
    saveTasks(); renderTasks();
  }
  closeModal('taskModal');
  editingTaskId = null; 
}

// ===== 5. MODALS SETUP =====
const modalsHTML = `
  <div class="modal-overlay" id="taskModal">
    <div class="modal-content">
      <h3 id="modalTitle">Add Task</h3>
      <input type="text" id="taskName" placeholder="Task Name">
      <input type="text" id="taskSubject" placeholder="Subject">
      <input type="date" id="taskDue">
      <input type="number" id="taskHours" placeholder="Estimated Hours (e.g., 3)" min="1">
      <div class="modal-buttons">
        <button class="btn-cancel" onclick="closeModal('taskModal')">Cancel</button>
        <button class="btn-save" id="saveTaskBtn" onclick="handleTaskSave()">Save</button>
      </div>
    </div>
  </div>
  <div class="modal-overlay" id="subjectModal">
    <div class="modal-content">
      <h3>Add Subject</h3>
      <input type="text" id="subjectName" placeholder="Subject Name">
      <div class="color-picker" id="colorPicker">
        ${['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'].map((c, i) => `
          <div class="color-option ${i===0?'selected':''}" style="background-color: ${c};" data-color="${c}" onclick="selectColor(this)"></div>
        `).join('')}
      </div>
      <div class="modal-buttons">
        <button class="btn-cancel" onclick="closeModal('subjectModal')">Cancel</button>
        <button class="btn-save" onclick="addNewSubject()">Save</button>
      </div>
    </div>
  </div>
`;
document.body.insertAdjacentHTML('beforeend', modalsHTML);

document.addEventListener('click', (e) => {
  if (e.target.id === 'addTaskBtn') {
    editingTaskId = null;
    document.getElementById('modalTitle').textContent = "Add Task";
    document.getElementById('taskName').value = '';
    document.getElementById('taskSubject').value = '';
    document.getElementById('taskDue').value = '';
    document.getElementById('taskHours').value = '';
    document.getElementById('taskModal').classList.add('active');
  }
  if (e.target.id === 'addSubjectBtn') document.getElementById('subjectModal').classList.add('active');
  if (e.target.id === 'saveNoteBtn') addNote();
});

function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function selectColor(el) {
  document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedColor = el.dataset.color;
}

function handleTaskSave() {
  if (editingTaskId) saveEditedTask();
  else addNewTask();
}

function addNewTask() {
  const name = document.getElementById('taskName').value;
  const subject = document.getElementById('taskSubject').value;
  const due = document.getElementById('taskDue').value;
  const hours = parseInt(document.getElementById('taskHours').value) || 1;
  if (!name || !subject) return alert("Please enter name and subject");
  
  const risk = calculateRisk(due, hours);
  const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  tasks.push({ id: Date.now(), name, subject, color: randomColor, due: due || 'No date', risk, hours, completed: false });
  saveTasks(); renderTasks(); closeModal('taskModal');
}

// ===== 6. SUBJECTS & NOTES =====
function renderSubjects() {
  const container = document.getElementById('subjectsContainer');
  if (!container) return;

  if (subjects.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px; grid-column: span 2;">No subjects yet. Add one to get started.</p>`;
    updateSubjectsStat();
    return;
  }

  container.innerHTML = subjects.map(sub => {
    const pending = tasks.filter(
      t => t.subject.toLowerCase() === sub.name.toLowerCase() && !t.completed
    ).length;
    const done = tasks.filter(
      t => t.subject.toLowerCase() === sub.name.toLowerCase() && t.completed
    ).length;
    return `
      <div class="subject-card">
        <div class="subject-color-bar" style="background: ${sub.color};"></div>
        <h3>${sub.name}</h3>
        <p>${pending} pending · ${done} done</p>
      </div>
    `;
  }).join('');

  updateSubjectsStat();
}

function addNewSubject() {
  const name = document.getElementById('subjectName').value;
  if (!name) return alert("Please enter subject name");
  subjects.push({ id: Date.now(), name, color: selectedColor });
  saveSubjects(); renderSubjects(); closeModal('subjectModal');
}

function renderNotes() {
  const container = document.getElementById('notesContainer');
  if (!container) return;
  container.innerHTML = notes.map((note, index) => `
    <div class="note-item">
      <p>${note.text}</p>
      <button class="delete-note-btn" onclick="deleteNote(${index})">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    </div>
  `).join('');
}

function addNote() {
  const input = document.getElementById('noteInput');
  const text = input.value.trim();
  if (!text) return;
  notes.push({ text: text });
  saveNotes(); renderNotes(); input.value = '';
}

function deleteNote(index) {
  notes.splice(index, 1);
  saveNotes(); renderNotes();
}

// ===== 7. STUDY LOG LOGIC =====
function renderStudyLog() {
  const container = document.getElementById('studyLogContainer');
  if (!container) return;
  container.innerHTML = studyLogs.map((log, index) => `
    <div class="log-item">
      <div>
        <h4>${log.subject}</h4>
        <p>${log.content}</p>
      </div>
      <button class="delete-note-btn" onclick="deleteStudyLog(${index})">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    </div>
  `).join('');
}

function addStudyLog() {
  const subject = document.getElementById('logSubject').value.trim();
  const content = document.getElementById('logContent').value.trim();
  if (!subject || !content) return alert("Please fill both fields!");
  
  studyLogs.push({ subject, content });
  saveStudyLogs(); renderStudyLog();
  document.getElementById('logSubject').value = '';
  document.getElementById('logContent').value = '';
}

function deleteStudyLog(index) {
  studyLogs.splice(index, 1);
  saveStudyLogs(); renderStudyLog();
}

const saveLogBtn = document.getElementById('saveLogBtn');
if (saveLogBtn) {
  saveLogBtn.addEventListener('click', addStudyLog);
}

// ===== 8. NAVIGATION =====
document.addEventListener('click', (e) => {
  const navItem = e.target.closest('.nav-item');
  if (!navItem) return;

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  navItem.classList.add('active');

  const targetPageId = navItem.getAttribute('data-page');
  
  document.getElementById('dashboard-page').style.display = 'none';
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));

  if (targetPageId === 'dashboard-page') {
    document.getElementById('dashboard-page').style.display = 'grid';
  } else if (targetPageId === 'studylog-page') {
    renderStudyLog();
    document.getElementById('studylog-page').classList.add('active');
  } else {
    document.getElementById(targetPageId).classList.add('active');
  }
});

// ===== 9. TIMER LOGIC =====
let timerInterval;
let timeCounterInterval; 
let timeLeft = 25 * 60;
let isTimerRunning = false;
let isBreakTime = false;

function updateTimerDisplay() {
  const display = document.getElementById('timerDisplay');
  if (!display) return;
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  display.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function toggleTimer() {
  const btn = document.getElementById('startTimerBtn');
  const status = document.getElementById('timerStatus');

  if (isTimerRunning) {
    clearInterval(timerInterval);
    clearInterval(timeCounterInterval);
    isTimerRunning = false;
    btn.textContent = "Resume";
    status.textContent = "Paused";
    return;
  }

  isTimerRunning = true;
  btn.textContent = "Pause";
  status.textContent = isBreakTime ? "Break Time!" : "Focusing...";

  if (!isBreakTime) {
    timeCounterInterval = setInterval(() => {
      if (isTimerRunning && !isBreakTime) {
        let currentTotal = parseInt(localStorage.getItem('totalStudyTime')) || 0;
        localStorage.setItem('totalStudyTime', currentTotal + 1);
        updateStudyTimeStat();
      } else {
        clearInterval(timeCounterInterval);
      }
    }, 1000);
  }

  timerInterval = setInterval(() => {
    if (timeLeft > 0) {
      timeLeft--;
      updateTimerDisplay();
    } else {
      clearInterval(timerInterval);
      clearInterval(timeCounterInterval);
      isTimerRunning = false;

      if (!isBreakTime) {
        alert("Focus complete! Take a 5 min break.");
        isBreakTime = true;
        timeLeft = 5 * 60;
      } else {
        alert("Break over! Back to focus.");
        isBreakTime = false;
        timeLeft = 25 * 60;
      }

      updateTimerDisplay();
      btn.textContent = "Start";
      status.textContent = "Time's Up!";
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(timerInterval);
  clearInterval(timeCounterInterval);
  isTimerRunning = false;
  isBreakTime = false;
  timeLeft = 25 * 60;
  updateTimerDisplay();
  document.getElementById('startTimerBtn').textContent = "Start";
  document.getElementById('timerStatus').textContent = "Time to focus!";
}

// ===== 10. DYNAMIC STATS & GRAPH =====
function updateSubjectsStat() {
  const totalSubjectsEl = document.getElementById('totalSubjects');
  if (totalSubjectsEl) totalSubjectsEl.textContent = subjects.length;
}

function updateStudyTimeStat() {
  const totalStudyTimeEl = document.getElementById('totalStudyTime');
  if (totalStudyTimeEl) {
    let totalSeconds = parseInt(localStorage.getItem('totalStudyTime')) || 0;
    let hours = (totalSeconds / 3600).toFixed(1);
    totalStudyTimeEl.textContent = `${hours}h`;
  }
  updateGraph();
}

function updateGraph() {
  const bars = document.querySelectorAll('.chart-container .bar');
  if (bars.length === 0) return;
  
  const today = new Date().getDay();
  let totalSeconds = parseInt(localStorage.getItem('totalStudyTime')) || 0;
  let heightPercentage = Math.min((totalSeconds / 3600) * 20, 100);
  
  bars.forEach((bar, index) => {
    let targetDayIndex = (today === 0) ? 6 : today - 1;
    if (index === targetDayIndex) {
      bar.style.height = `${Math.max(heightPercentage, 10)}%`;
      bar.classList.add('active');
    }
  });
}

function updateRiskAlert() {
  const alertCard = document.querySelector('.alert-card');
  const alertTitle = document.getElementById('alertTitle');
  const alertDesc = document.getElementById('alertDesc');

  if (!alertCard) return;

  const highRiskCount = tasks.filter(t => t.risk === 'high' && !t.completed).length;

  if (highRiskCount > 0) {
    alertCard.style.background = 'linear-gradient(135deg, #ef4444, #f43f5e)';
    alertTitle.textContent = "High Risk Detected! ⚠️";
    alertDesc.textContent = `You have ${highRiskCount} high-risk task(s). Focus on them first!`;
  } else {
    alertCard.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    alertTitle.textContent = "You're on Track! ✅";
    alertDesc.textContent = "No high-risk tasks. Keep up the good work!";
  }
}

// ===== 11. SMART AI CHATBOT LOGIC =====
const chatToggle = document.getElementById('chatToggle');
const chatWindow = document.getElementById('chatWindow');
const closeChat = document.getElementById('closeChat');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatMessages = document.getElementById('chatMessages');

if (chatToggle) {
  chatToggle.addEventListener('click', () => chatWindow.classList.toggle('active'));
  closeChat.addEventListener('click', () => chatWindow.classList.remove('active'));

  function getAIResponse(message) {
    const msg = message.toLowerCase();

    // 1. Check Tasks
    if (msg.includes("task") || msg.includes("kaam") || msg.includes("due") || msg.includes("kya karna")) {
      const pending = tasks.filter(t => !t.completed);
      const highRisk = pending.filter(t => t.risk === 'high');
      
      if (pending.length === 0) return "Aapke paas koi pending task nahi hai. You're all caught up! 🌿";
      if (highRisk.length > 0) return `Aapke paas ${pending.length} tasks hain. Sabse pehle apna HIGH RISK task "${highRisk[0].name}" (${highRisk[0].subject}) karein, kyunki uska time kam hai! ⚠️`;
      return `Aapke paas ${pending.length} pending tasks hain. Aaj ka pehla task: "${pending[0].name}" (${pending[0].subject}). Aap kar sakti hain! 💪`;
    }

    // 2. Check Timer
    if (msg.includes("timer") || msg.includes("start") || msg.includes("focus")) {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelector('[data-page="timer-page"]').classList.add('active');
      document.getElementById('dashboard-page').style.display = 'none';
      document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
      document.getElementById('timer-page').classList.add('active');
      
      if (!isTimerRunning) toggleTimer(); 
      return "Chaliye, maine Timer start kar diya hai. 25 minute focus karein, phir 5 minute break! Aap kar sakti hain! ⏱️";
    }

    // 3. Motivation
    if (msg.includes("tired") || msg.includes("thak") || msg.includes("motivate") || msg.includes("stress")) {
      const quotes = [
        "Aap bohot mehnat kar rahi hain. Bas thora sa aur! Ek chhota sa break lein aur wapis shuru karein. 💜",
        "Stress mat lein. Aap har din ek step aage barh rahi hain. Deep breath lein aur apne High Risk task par focus karein! 🧘‍♀️",
        "Mushkil waqt bas guzar jata hai. Aap is exam/assignment se bhi paar nikal jayengi. Main aapke sath hoon! 🚀"
      ];
      return quotes[Math.floor(Math.random() * quotes.length)];
    }

    // 4. Study Tips
    if (msg.includes("tip") || msg.includes("advice") || msg.includes("study")) {
      const tips = [
        "Pro tip: Padhai karte waqt phone door rakh dein. 25 minute ke Pomodoro timer se focus bohot behtar hota hai!",
        "Active recall try karein: Kitab band karein aur jo parha hai wo apne words mein likhein. Yaad rahega!",
        "Notes banate waqt colorful pens use karein. Visual cheezein dimagh mein jaldi save hoti hain.",
        "Har 45 minute baad 5 minute ka break lein. Pani piyein aur aankhein band karke relax karein."
      ];
      return tips[Math.floor(Math.random() * tips.length)];
    }

    // 5. Greetings
    if (msg.includes("hi") || msg.includes("hello") || msg.includes("hey") || msg.includes("salam")) {
      return "Hi! Main Immy hoon, aapki study buddy. Poochen 'what are my tasks' ya 'start timer'! 😊";
    }

    return "Main aapki help kar sakti hoon: 1. Tasks check karne mein ('my tasks'), 2. Timer start karne mein ('start timer'), 3. Study tips dene mein ('give me a tip'). Aap kya poochna chahti hain?";
  }

  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    const userMsg = document.createElement('div');
    userMsg.className = 'message user';
    userMsg.textContent = text;
    chatMessages.appendChild(userMsg);
    chatInput.value = '';

    const botMsg = document.createElement('div');
    botMsg.className = 'message bot';
    botMsg.textContent = "Typing...";
    chatMessages.appendChild(botMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    setTimeout(() => {
      botMsg.textContent = getAIResponse(text);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 800);
  }

  sendChatBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}

// ===== 12. INITIALIZE =====
renderTasks(); 
renderSubjects(); 
renderNotes(); 
updateTimerDisplay();
updateSubjectsStat();
updateStudyTimeStat();

const capLink = document.getElementById('capacityLink');
if (capLink) {
  capLink.textContent = `${getDailyCapacity()}h/day`;
  capLink.addEventListener('click', (e) => {
    e.preventDefault();
    const current = getDailyCapacity();
    const next = prompt("How many focused hours can you realistically study per day?", current);
    const num = parseFloat(next);
    if (!isNaN(num) && num > 0) {
      localStorage.setItem('dailyStudyCapacity', num);
      capLink.textContent = `${num}h/day`;
      tasks = tasks.map(t => ({ ...t, risk: calculateRisk(t.due, t.hours) }));
      saveTasks();
      renderTasks();
    }
  });
}