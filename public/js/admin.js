/**
 * ADMIN & SETTINGS MANAGEMENT MODULE
 */

const Admin = {
  currentEditingTaskId: null,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Open Admin Modal
    const btnAdmin = document.getElementById('btn-admin');
    if (btnAdmin) {
      btnAdmin.addEventListener('click', () => this.openModal('tasks'));
    }

    // Open Quick Add Modal
    const btnQuickAdd = document.getElementById('btn-quick-add');
    if (btnQuickAdd) {
      btnQuickAdd.addEventListener('click', () => this.openTaskEditModal(null));
    }

    // Open Holidays Modal
    const btnHolidays = document.getElementById('btn-holidays');
    if (btnHolidays) {
      btnHolidays.addEventListener('click', () => this.openModal('holidays'));
    }

    // Close Modals
    document.querySelectorAll('.modal-close-trigger').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });

    // Tab switching in Admin
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Task Form submit
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => this.handleTaskFormSubmit(e));
    }

    // Holiday Form submit
    const holidayForm = document.getElementById('holiday-form');
    if (holidayForm) {
      holidayForm.addEventListener('submit', (e) => this.handleHolidaySubmit(e));
    }

    // Settings Form submit
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => this.handleSettingsSubmit(e));
    }

    // Reset Data button
    const btnReset = document.getElementById('btn-reset-data');
    if (btnReset) {
      btnReset.addEventListener('click', async () => {
        if (confirm('샘플 데이터 6개로 초기화하시겠습니까? 현재 등록된 모든 변경사항이 초기값으로 덮어씌워집니다.')) {
          await API.resetData();
          this.closeAllModals();
        }
      });
    }

    // Export Data button
    const btnExport = document.getElementById('btn-export-data');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        API.exportData();
      });
    }

    // Import Data file input
    const inputImport = document.getElementById('input-import-data');
    if (inputImport) {
      inputImport.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const parsed = JSON.parse(event.target.result);
            await API.importData(parsed);
            alert('설정 데이터가 성공적으로 복원되었습니다.');
            this.closeAllModals();
          } catch (err) {
            alert('데이터 파일 형식이 올바르지 않습니다: ' + err.message);
          }
          inputImport.value = '';
        };
        reader.readAsText(file);
      });
    }

    // Color picker options
    document.querySelectorAll('.color-option').forEach(el => {
      el.addEventListener('click', (e) => {
        document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
        e.target.classList.add('selected');
        const colorInput = document.getElementById('task-color-input');
        if (colorInput) colorInput.value = e.target.getAttribute('data-color');
      });
    });
  },

  openModal(tab = 'tasks') {
    const modal = document.getElementById('admin-modal');
    if (!modal) return;
    modal.classList.add('is-open');
    this.switchTab(tab);
    this.renderAdminTaskList();
    this.renderHolidaysList();
    this.populateSettingsForm();
  },

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('is-open'));
    this.currentEditingTaskId = null;
  },

  switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = content.getAttribute('data-tab') === tabName ? 'block' : 'none';
    });
  },

  renderAdminTaskList() {
    const listEl = document.getElementById('admin-tasks-container');
    if (!listEl) return;
    const tasks = API.data.tasks || [];

    if (tasks.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--text-subtle);">등록된 TASK가 없습니다.</div>`;
      return;
    }

    listEl.innerHTML = tasks.map((task, idx) => `
      <div class="task-admin-item">
        <div class="task-admin-item-info">
          <span class="task-order-badge">#${idx + 1}</span>
          <div>
            <div class="task-admin-item-title">
              ${this.escapeHtml(task.title)}
            </div>
            <div class="task-admin-item-sub">
              🎯 오픈일자: ${task.targetDate.replace('T', ' ')} | ⏱️ 업무시간: ${task.workStartTime || '09:00'} ~ ${task.workEndTime || '18:00'}
            </div>
          </div>
        </div>
        <div class="task-admin-actions">
          <button class="btn btn-icon-only" onclick="Admin.moveTaskOrder('${task.id}', -1)" title="순서 위로" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button class="btn btn-icon-only" onclick="Admin.moveTaskOrder('${task.id}', 1)" title="순서 아래로" ${idx === tasks.length - 1 ? 'disabled' : ''}>▼</button>
          <button class="btn btn-icon-only" onclick="Admin.openTaskEditModal('${task.id}')" title="수정">✏️</button>
          <button class="btn btn-icon-only" onclick="Admin.deleteTask('${task.id}')" title="삭제" style="color:#ef4444;">🗑️</button>
        </div>
      </div>
    `).join('');
  },

  setWorkTimePreset(start, end) {
    const s = document.getElementById('task-work-start');
    const e = document.getElementById('task-work-end');
    if (s && e) {
      s.value = start;
      e.value = end;
    }
  },

  openTaskEditModal(taskId = null) {
    this.currentEditingTaskId = taskId;
    const modal = document.getElementById('task-edit-modal');
    const titleEl = document.getElementById('task-edit-title');
    const form = document.getElementById('task-form');
    if (!modal || !form) return;

    if (taskId) {
      const task = API.data.tasks.find(t => t.id === taskId);
      if (!task) return;
      titleEl.innerText = 'TASK 수정';
      document.getElementById('task-id').value = task.id;
      document.getElementById('task-name').value = task.title;
      document.getElementById('task-target').value = task.targetDate ? task.targetDate.slice(0, 16) : '';
      document.getElementById('task-work-start').value = task.workStartTime || '09:00';
      document.getElementById('task-work-end').value = task.workEndTime || '18:00';
    } else {
      titleEl.innerText = '새 TASK 등록';
      form.reset();
      document.getElementById('task-id').value = '';
      const now = new Date();
      const defaultTarget = new Date(now.getTime() + 7 * 86400000);
      const localTarget = new Date(defaultTarget.getTime() - defaultTarget.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      
      document.getElementById('task-target').value = localTarget;
      document.getElementById('task-work-start').value = '09:00';
      document.getElementById('task-work-end').value = '18:00';
    }

    modal.classList.add('is-open');
  },

  async handleTaskFormSubmit(e) {
    e.preventDefault();
    const taskId = document.getElementById('task-id').value;
    const taskData = {
      title: document.getElementById('task-name').value.trim(),
      targetDate: document.getElementById('task-target').value,
      workStartTime: document.getElementById('task-work-start').value || '09:00',
      workEndTime: document.getElementById('task-work-end').value || '18:00'
    };

    if (!taskData.title || !taskData.targetDate) {
      alert('태스크명과 오픈 목표 일시는 필수 입력입니다.');
      return;
    }

    if (taskId) {
      await API.updateTask(taskId, taskData);
    } else {
      await API.addTask(taskData);
    }

    document.getElementById('task-edit-modal').classList.remove('is-open');
    this.renderAdminTaskList();
  },

  async deleteTask(taskId) {
    if (confirm('해당 TASK를 삭제하시겠습니까?')) {
      await API.deleteTask(taskId);
      this.renderAdminTaskList();
    }
  },

  async moveTaskOrder(taskId, direction) {
    const tasks = [...API.data.tasks];
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= tasks.length) return;

    // Swap
    const temp = tasks[idx];
    tasks[idx] = tasks[targetIdx];
    tasks[targetIdx] = temp;

    const orderedIds = tasks.map(t => t.id);
    await API.reorderTasks(orderedIds);
    this.renderAdminTaskList();
  },

  renderHolidaysList() {
    const container = document.getElementById('custom-holidays-list');
    if (!container) return;
    const holidays = API.data.customHolidays || [];

    if (holidays.length === 0) {
      container.innerHTML = `<div style="color:var(--text-subtle); padding:8px 0; font-size:0.85rem;">추가된 사용자 지정 휴일이 없습니다.</div>`;
      return;
    }

    container.innerHTML = holidays.map(h => `
      <div class="holiday-item">
        <div>
          <span style="font-family:var(--font-mono); font-weight:700; color:var(--accent-cyan); margin-right:8px;">${h.date}</span>
          <span>${this.escapeHtml(h.name)}</span>
        </div>
        <button class="btn btn-icon-only" style="padding:2px 6px; font-size:0.75rem; color:#ef4444;" onclick="Admin.deleteHoliday('${h.date}')">삭제</button>
      </div>
    `).join('');
  },

  async handleHolidaySubmit(e) {
    e.preventDefault();
    const date = document.getElementById('holiday-date').value;
    const name = document.getElementById('holiday-name').value.trim();
    if (!date || !name) {
      alert('휴일 날짜와 휴일명을 모두 입력해주세요.');
      return;
    }
    await API.addHoliday(date, name);
    document.getElementById('holiday-form').reset();
    this.renderHolidaysList();
  },

  async deleteHoliday(date) {
    if (confirm(`'${date}' 휴일을 삭제하시겠습니까?`)) {
      await API.deleteHoliday(date);
      this.renderHolidaysList();
    }
  },

  populateSettingsForm() {
    const s = API.data.settings || {};
    if (document.getElementById('set-work-hours')) {
      document.getElementById('set-work-hours').value = s.workHoursPerDay || 8;
      document.getElementById('set-start-time').value = s.workStartTime || '09:00';
      document.getElementById('set-end-time').value = s.workEndTime || '18:00';
      document.getElementById('set-lunch-start').value = s.lunchStartTime || '12:00';
      document.getElementById('set-lunch-end').value = s.lunchEndTime || '13:00';
      document.getElementById('set-board-title').value = s.boardTitle || '계약서버개발실';
    }
  },

  async handleSettingsSubmit(e) {
    e.preventDefault();
    const settings = {
      workHoursPerDay: Number(document.getElementById('set-work-hours').value) || 8,
      workStartTime: document.getElementById('set-start-time').value || '09:00',
      workEndTime: document.getElementById('set-end-time').value || '18:00',
      lunchStartTime: document.getElementById('set-lunch-start').value || '12:00',
      lunchEndTime: document.getElementById('set-lunch-end').value || '13:00',
      boardTitle: document.getElementById('set-board-title').value.trim() || '계약서버개발실'
    };
    await API.updateSettings(settings);
    alert('설정이 저장되었습니다.');
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
