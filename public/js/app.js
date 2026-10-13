/**
 * MAIN DASHBOARD & REAL-TIME MONITORING APPLICATION
 */

const App = {
  activeTimer: null,
  tasksGridEl: null,
  clockEl: null,
  workdayBadgeEl: null,

  async init() {
    this.tasksGridEl = document.getElementById('tasks-grid');
    this.clockEl = document.getElementById('live-clock');
    this.workdayBadgeEl = document.getElementById('today-work-badge');

    // Initialize API & Admin
    await API.init();
    Admin.init();

    // Subscribe to data changes
    API.subscribe((data, isOnline) => {
      this.updateHeaderMeta();
      this.renderBoard();
      this.updateOnlineBadge(isOnline);
    });

    // Setup Theme
    this.initTheme();

    // Setup Fullscreen
    this.initFullscreen();

    // Start 1-second live clock & countdown loop
    this.startTicker();

    // Initial render
    this.updateHeaderMeta();
    this.renderBoard();
  },

  updateOnlineBadge(isOnline) {
    const el = document.getElementById('live-indicator');
    if (!el) return;
    if (isOnline) {
      el.innerHTML = `<span class="live-dot"></span><span>LIVE SYNC</span>`;
    } else {
      el.innerHTML = `<span class="live-dot" style="background:#eab308; box-shadow:0 0 8px #eab308;"></span><span style="color:#eab308;">LOCAL MODE</span>`;
    }
  },

  initTheme() {
    const savedTheme = localStorage.getItem('board_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) {
      themeBtn.innerText = savedTheme === 'dark' ? '☀️ 라이트' : '🌙 다크';
      themeBtn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('board_theme', next);
        themeBtn.innerText = next === 'dark' ? '☀️ 라이트' : '🌙 다크';
      });
    }
  },

  initFullscreen() {
    const fsBtn = document.getElementById('btn-fullscreen');
    if (!fsBtn) return;
    fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn('Fullscreen error:', err);
        });
        document.body.classList.add('fullscreen-mode');
        fsBtn.innerText = '🔲 창 모드';
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
        document.body.classList.remove('fullscreen-mode');
        fsBtn.innerText = '🖥️ 상황판 모드';
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        document.body.classList.remove('fullscreen-mode');
        fsBtn.innerText = '🖥️ 상황판 모드';
      }
    });
  },

  animFrameId: null,

  startTicker() {
    if (this.activeTimer) clearInterval(this.activeTimer);
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    // Live Clock loop (1s)
    this.updateClock();
    this.activeTimer = setInterval(() => {
      this.updateClock();
    }, 1000);

    // Millisecond high-frequency animation loop via requestAnimationFrame
    const frameLoop = () => {
      this.updateCountdowns();
      this.animFrameId = requestAnimationFrame(frameLoop);
    };
    this.animFrameId = requestAnimationFrame(frameLoop);
  },

  updateClock() {
    const now = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dayName = days[now.getDay()];
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    if (this.clockEl) {
      this.clockEl.innerText = `${y}.${m}.${d} (${dayName}) ${hh}:${mm}:${ss}`;
    }

    if (this.workdayBadgeEl) {
      const isWork = CalendarEngine.isWorkingDay(now, API.data.customHolidays);
      if (isWork) {
        this.workdayBadgeEl.className = 'today-work-badge badge-workday';
        this.workdayBadgeEl.innerText = '영업일 (워킹데이)';
      } else {
        const h = CalendarEngine.isHoliday(now, API.data.customHolidays);
        this.workdayBadgeEl.className = 'today-work-badge badge-holiday';
        this.workdayBadgeEl.innerText = h.isHoliday ? `휴일 (${h.name})` : '주말 휴무';
      }
    }
  },

  updateHeaderMeta() {
    const titleEl = document.getElementById('board-title');
    if (titleEl && API.data.settings?.boardTitle) {
      titleEl.innerText = API.data.settings.boardTitle;
    }
  },

  renderBoard() {
    if (!this.tasksGridEl) return;
    const tasks = API.data.tasks || [];
    const maxSlots = API.data.settings?.maxDisplayTasks || 6;
    const now = new Date();
    const customHolidays = API.data.customHolidays || [];
    const settings = API.data.settings || { workHoursPerDay: 8 };

    // Slice up to maxSlots (default 6)
    const displayTasks = tasks.slice(0, maxSlots);

    let html = '';

    displayTasks.forEach((task, idx) => {
      const targetDate = new Date(task.targetDate);

      // 1. 워킹데이 D-Day 계산
      const workDayResult = CalendarEngine.calculateWorkingDays(now, targetDate, customHolidays);

      // 2. 실시간 잔여 업무시간 계산 (TASK별 업무시간 반영)
      const workHoursResult = CalendarEngine.calculateWorkHours(now, targetDate, task, customHolidays);

      // 카드 스타일 및 배지
      let cardStatusClass = '';
      let ddayColorClass = 'dday-normal';

      if (workDayResult.status === 'urgent') {
        cardStatusClass = 'is-urgent';
        ddayColorClass = 'dday-urgent';
      } else if (workDayResult.status === 'warning') {
        cardStatusClass = 'is-warning';
        ddayColorClass = 'dday-warning';
      } else if (workDayResult.status === 'overdue') {
        cardStatusClass = 'is-overdue';
        ddayColorClass = 'dday-overdue';
      } else if (workDayResult.status === 'today') {
        cardStatusClass = 'is-urgent';
        ddayColorClass = 'dday-today';
      }

      // 날짜 포맷
      const targetYear = targetDate.getFullYear();
      const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
      const targetDay = String(targetDate.getDate()).padStart(2, '0');
      const targetDayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][targetDate.getDay()];
      const targetTime = `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`;

      html += `
        <div class="task-card ${cardStatusClass}" data-task-id="${task.id}">
          <!-- Card Header -->
          <div class="card-header">
            <span class="slot-tag">TASK 0${idx + 1}</span>
            <div class="card-header-actions">
              <button class="card-action-btn" onclick="Admin.openTaskEditModal('${task.id}')" title="수정">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
            </div>
          </div>

          <!-- Card Body: Title & Open Date -->
          <div class="card-body">
            <h2 class="task-title" title="${this.escapeHtml(task.title)}">
              ${this.escapeHtml(task.title)}
            </h2>
            <div class="target-date-row">
              <span>🎯 오픈일자:</span>
              <span class="target-date-val">${targetYear}.${targetMonth}.${targetDay} (${targetDayOfWeek}) ${targetTime}</span>
            </div>
          </div>

          <!-- Prominent Hero D-Day (직관적인 D-DAY) -->
          <div class="dday-hero-section">
            <div class="dday-value ${ddayColorClass}">${workDayResult.dDayText}</div>
          </div>

          <!-- 하단 실시간 잔여시간 (단일 노출 & 라벨 없음) -->
          <div class="workhours-panel ${workHoursResult.isInWorkHours ? 'is-ticking' : 'is-idle'}">
            <div class="workhours-single">
              <span class="workhours-icon">⏳</span>
              <span class="workhours-countdown-val" data-countdown-task="${task.id}">${workHoursResult.formattedHtml}</span>
            </div>
          </div>
        </div>
      `;
    });

    // 만약 6개보다 적다면 빈 슬롯 (+ 등록 카드) 렌더링
    const emptySlots = maxSlots - displayTasks.length;
    for (let i = 0; i < emptySlots; i++) {
      const slotNum = displayTasks.length + i + 1;
      html += `
        <div class="empty-slot-card" onclick="Admin.openTaskEditModal(null)">
          <div class="empty-icon">+</div>
          <div style="font-weight:700; font-size:1rem;">SLOT #${slotNum} TASK 등록</div>
          <div style="font-size:0.78rem;">새로운 목표 태스크를 추가하세요</div>
        </div>
      `;
    }

    this.tasksGridEl.innerHTML = html;
  },

  // 실시간 카운트다운 텍스트 밀리초 애니메이션 업데이트
  updateCountdowns() {
    const countdownEls = document.querySelectorAll('[data-countdown-task]');
    if (countdownEls.length === 0) return;

    const now = new Date();
    const tasks = API.data.tasks || [];
    const customHolidays = API.data.customHolidays || [];

    countdownEls.forEach(el => {
      const taskId = el.getAttribute('data-countdown-task');
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const targetDate = new Date(task.targetDate);
      const hoursResult = CalendarEngine.calculateWorkHours(now, targetDate, task, customHolidays);
      el.innerHTML = hoursResult.formattedHtml;

      const panel = el.closest('.workhours-panel');
      if (panel) {
        panel.classList.toggle('is-ticking', hoursResult.isInWorkHours);
        panel.classList.toggle('is-idle', !hoursResult.isInWorkHours);
      }
    });
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
