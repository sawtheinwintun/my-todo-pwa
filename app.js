/* =========================================================
   1) CONFIG
   ========================================================= */
const STORAGE_KEY = 'todo-pwa-v1';
const STATUS_KEYS = ['new', 'pending', 'complete', 'cancel'];

const STATUS = {
  new: {
    label: 'New',
    hex: '#3b82f6',
    chip: 'bg-blue-50 text-blue-700 border-blue-200',
    active: 'bg-blue-600 text-white border-blue-600'
  },
  pending: {
    label: 'Pending',
    hex: '#f59e0b',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    active: 'bg-amber-500 text-white border-amber-500'
  },
  complete: {
    label: 'Complete',
    hex: '#10b981',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    active: 'bg-emerald-600 text-white border-emerald-600'
  },
  cancel: {
    label: 'Cancel',
    hex: '#f43f5e',
    chip: 'bg-rose-50 text-rose-700 border-rose-200',
    active: 'bg-rose-600 text-white border-rose-600'
  }
};

const MY_MONTHS = ['ဇန်','ဖေ','မတ်','ဧပြီ','မေ','ဇွန်','ဇူ','ဩ','စက်','အောက်','နို','ဒီ'];

/* =========================================================
   2) DOM
   ========================================================= */
const taskForm     = document.getElementById('taskForm');
const taskInput    = document.getElementById('taskInput');
const statusSelect = document.getElementById('statusSelect');
const taskList     = document.getElementById('taskList');
const filterBar    = document.getElementById('filterBar');
const statsGrid    = document.getElementById('statsGrid');
const monthPicker  = document.getElementById('monthPicker');
const monthSummary = document.getElementById('monthSummary');
const todayLabel   = document.getElementById('todayLabel');

/* =========================================================
   3) STATE
   ========================================================= */
let tasks  = loadTasks();
let filter = 'all';
let charts = { donut: null, trend: null };

/* =========================================================
   4) HELPERS
   ========================================================= */
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.warn('localStorage ဖတ်လို့မရပါ', e);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.warn('localStorage သိမ်းလို့မရပါ', e);
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function curMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
         `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function monthLabel(mk) {
  const [, m] = mk.split('-').map(Number);
  return MY_MONTHS[m - 1] || mk;
}

function lastNMonths(mk, n) {
  const [y, m] = mk.split('-').map(Number);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
  }
  return out;
}

function countByStatus(list) {
  const c = { new: 0, pending: 0, complete: 0, cancel: 0 };
  list.forEach(t => { if (c[t.status] !== undefined) c[t.status]++; });
  return c;
}

/* =========================================================
   5) RENDER : STATS
   ========================================================= */
function renderStats() {
  const mk = monthPicker.value || curMonthKey();
  const monthTasks = tasks.filter(t => (t.createdAt || '').slice(0, 7) === mk);
  const counts = countByStatus(monthTasks);
  const total  = monthTasks.length;

  monthSummary.textContent = `စုစုပေါင်း ${total} ခု`;

  statsGrid.innerHTML = STATUS_KEYS.map(k => `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full" style="background:${STATUS[k].hex}"></span>
        <span class="text-xs font-medium text-slate-500">${STATUS[k].label}</span>
      </div>
      <p class="mt-2 text-2xl font-bold text-slate-900">${counts[k]}</p>
    </div>
  `).join('');
}

/* =========================================================
   6) RENDER : FILTER BAR
   ========================================================= */
function renderFilters() {
  const counts = { all: tasks.length };
  STATUS_KEYS.forEach(k => counts[k] = tasks.filter(t => t.status === k).length);

  const items = [
    { key: 'all', label: 'အားလုံး' },
    ...STATUS_KEYS.map(k => ({ key: k, label: STATUS[k].label }))
  ];

  filterBar.innerHTML = items.map(f => {
    const active = filter === f.key;
    return `<button data-filter="${f.key}"
      class="whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition
      ${active
        ? 'bg-slate-900 text-white border-slate-900'
        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}">
      ${f.label}
      <span class="opacity-60">${counts[f.key]}</span>
    </button>`;
  }).join('');
}

/* =========================================================
   7) RENDER : TASK LIST
   ========================================================= */
function renderList() {
  const items = tasks
    .filter(t => filter === 'all' || t.status === filter)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  if (!items.length) {
    taskList.innerHTML = `
      <li class="text-center py-14 text-slate-400">
        <p class="text-4xl mb-2">🗒️</p>
        <p class="text-sm">ဒီနေရာမှာ task မရှိသေးပါ</p>
      </li>`;
    return;
  }

  taskList.innerHTML = items.map(t => {
    const s = STATUS[t.status] || STATUS.new;
    const done = t.status === 'complete';

    const statusBtns = STATUS_KEYS.map(k => {
      const on = t.status === k;
      const c = STATUS[k];
      return `<button data-act="status" data-status="${k}" data-id="${t.id}"
        class="rounded-lg border px-3 py-1.5 text-xs font-medium transition
        ${on ? c.active : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}">
        ${c.label}
      </button>`;
    }).join('');

    return `
    <li class="fade-in bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div class="flex items-start gap-3">
        <div class="flex-1 min-w-0">
          <p class="font-medium break-words ${done ? 'line-through text-slate-400' : 'text-slate-900'}">
            ${esc(t.title)}
          </p>
          <div class="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span class="inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${s.chip}">
              ${s.label}
            </span>
            <span>${fmtDateTime(t.createdAt)}</span>
          </div>
        </div>
        <button data-act="delete" data-id="${t.id}" aria-label="ဖျက်မယ်"
          class="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 12a1 1 0 001 1h6a1 1 0 001-1l1-12"/>
          </svg>
        </button>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">${statusBtns}</div>
    </li>`;
  }).join('');
}

/* =========================================================
   8) RENDER : CHARTS
   ========================================================= */
function renderCharts() {
  const mk = monthPicker.value || curMonthKey();

  /* ---- Donut : ဒီလ အခြေအနေ ---- */
  const monthTasks = tasks.filter(t => (t.createdAt || '').slice(0, 7) === mk);
  const counts = STATUS_KEYS.map(k => monthTasks.filter(t => t.status === k).length);

  if (charts.donut) charts.donut.destroy();
  charts.donut = new Chart(document.getElementById('donutChart'), {
    type: 'doughnut',
    data: {
      labels: STATUS_KEYS.map(k => STATUS[k].label),
      datasets: [{
        data: counts,
        backgroundColor: STATUS_KEYS.map(k => STATUS[k].hex),
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { size: 12 }
          }
        },
        tooltip: {
          callbacks: { label: c => ` ${c.label}: ${c.parsed} ခု` }
        }
      }
    }
  });

  /* ---- Stacked Bar : ၆ လအတွင်း လမ်းကြောင်း ---- */
  const months = lastNMonths(mk, 6);

  const datasets = STATUS_KEYS.map(k => ({
    label: STATUS[k].label,
    data: months.map(m =>
      tasks.filter(t => (t.createdAt || '').slice(0, 7) === m && t.status === k).length
    ),
    backgroundColor: STATUS[k].hex,
    borderRadius: 4,
    maxBarThickness: 26
  }));

  if (charts.trend) charts.trend.destroy();
  charts.trend = new Chart(document.getElementById('trendChart'), {
    type: 'bar',
    data: { labels: months.map(monthLabel), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { font: { size: 11 } }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: { precision: 0, font: { size: 11 } },
          grid: { color: '#f1f5f9' }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { size: 12 }
          }
        }
      }
    }
  });
}

/* =========================================================
   9) MASTER RENDER
   ========================================================= */
function renderAll() {
  renderStats();
  renderFilters();
  renderList();
  renderCharts();
}

/* =========================================================
   10) ACTIONS
   ========================================================= */
function addTask(title, status) {
  const now = new Date().toISOString();
  tasks.push({
    id: uid(),
    title,
    status: STATUS[status] ? status : 'new',
    createdAt: now,
    updatedAt: now
  });
  saveTasks();
  renderAll();
}

function setStatus(id, status) {
  const t = tasks.find(x => x.id === id);
  if (!t || !STATUS[status]) return;
  t.status = status;
  t.updatedAt = new Date().toISOString();
  if (status === 'complete') t.completedAt = t.updatedAt;
  saveTasks();
  renderAll();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderAll();
}

/* =========================================================
   11) EVENTS
   ========================================================= */
taskForm.addEventListener('submit', e => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;
  addTask(title, statusSelect.value);
  taskInput.value = '';
  statusSelect.value = 'new';
  taskInput.focus();
});

taskList.addEventListener('click', e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const { act, id, status } = btn.dataset;

  if (act === 'delete') deleteTask(id);
  else if (act === 'status') setStatus(id, status);
});

filterBar.addEventListener('click', e => {
  const btn = e.target.closest('button[data-filter]');
  if (!btn) return;
  filter = btn.dataset.filter;
  renderFilters();
  renderList();
});

monthPicker.addEventListener('change', () => {
  renderStats();
  renderCharts();
});

/* =========================================================
   12) PWA : ICON + MANIFEST + SERVICE WORKER
   ========================================================= */
function makeIcon(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, '#6366f1');
  g.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // ✓ အမှတ်အသား
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.09;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(size * 0.28, size * 0.52);
  ctx.lineTo(size * 0.44, size * 0.68);
  ctx.lineTo(size * 0.73, size * 0.34);
  ctx.stroke();

  return c.toDataURL('image/png');
}

(function setupPWA() {
  const icon192 = makeIcon(192);
  const icon512 = makeIcon(512);

  // apple-touch-icon
  const appleIcon = document.getElementById('appleIcon');
  if (appleIcon) appleIcon.href = makeIcon(180);

  // manifest ကို runtime မှာ ဆောက်
  const manifest = {
    name: 'ငါ့ To-Do List',
    short_name: 'ToDo',
    description: 'To-Do list with status tracking & monthly charts',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f1f5f9',
    theme_color: '#4f46e5',
    icons: [
      { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };

  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  const link = document.getElementById('manifestLink');
  if (link) link.href = URL.createObjectURL(blob);

  // Service Worker (sw.js ဖိုင်ရှိမှ register ဖြစ်မယ်)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(() => console.log('✅ Service Worker registered'))
        .catch(err => console.warn('ℹ️ SW register မဖြစ်ပါ (sw.js မရှိရင် ပုံမှန်အတိုင်း run ပါမယ်):', err.message));
    });
  }
})();

/* =========================================================
   13) INIT
   ========================================================= */
(function init() {
  // month picker ကို ဒီလကို default ထား
  monthPicker.value = curMonthKey();

  // ဒီနေ့ရက်စွဲ
  const d = new Date();
  todayLabel.textContent = `${d.getFullYear()} ${MY_MONTHS[d.getMonth()]} ${d.getDate()} ရက်`;

  renderAll();

  // Tab ပြန်ဝင်လာရင် refresh
  window.addEventListener('focus', renderAll);
})();