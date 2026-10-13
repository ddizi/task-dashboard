/**
 * API & DATA SYNC CLIENT (서버 REST API & SSE 실시간 동기화 + 로컬스토리지 백업)
 */

const DEFAULT_SAMPLE_DATA = {
  tasks: [
    {
      id: "task-1",
      title: "AI 고객 상담 챗봇 파일럿 서비스 오픈",
      targetDate: "2026-10-16T10:00",
      workStartTime: "00:00",
      workEndTime: "23:59",
      order: 1
    },
    {
      id: "task-2",
      title: "글로벌 결제 PG 연동 및 보안 적합성 검증",
      targetDate: "2026-10-23T18:00",
      workStartTime: "10:00",
      workEndTime: "19:00",
      order: 2
    },
    {
      id: "task-3",
      title: "모바일 앱 3.0 대규모 UI 개편 배포",
      targetDate: "2026-10-30T09:00",
      workStartTime: "09:00",
      workEndTime: "18:00",
      order: 3
    },
    {
      id: "task-4",
      title: "차세대 클라우드 DB 무중단 마이그레이션",
      targetDate: "2026-11-06T14:00",
      workStartTime: "09:00",
      workEndTime: "18:00",
      order: 4
    },
    {
      id: "task-5",
      title: "2026 ISMS-P 정보보호 관리체계 사후 심사",
      targetDate: "2026-11-17T09:00",
      workStartTime: "10:00",
      workEndTime: "19:00",
      order: 5
    },
    {
      id: "task-6",
      title: "블랙프라이데이 & 연말 프로모션 티저 오픈",
      targetDate: "2026-11-27T10:00",
      workStartTime: "09:00",
      workEndTime: "18:00",
      order: 6
    }
  ],
  customHolidays: [
    {
      date: "2026-11-02",
      name: "회사 창립기념일 (유급휴무)"
    }
  ],
  settings: {
    workHoursPerDay: 8,
    workStartTime: "09:00",
    workEndTime: "18:00",
    lunchStartTime: "12:00",
    lunchEndTime: "13:00",
    boardTitle: "계약서버개발실",
    boardSubtitle: "CONTRACT SERVER DEV OPERATIONS BOARD",
    maxDisplayTasks: 6,
    theme: "dark"
  }
};

const API = {
  data: JSON.parse(JSON.stringify(DEFAULT_SAMPLE_DATA)),
  listeners: [],
  isOnline: true,
  eventSource: null,

  async init() {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          this.data = json.data;
          this.isOnline = true;
          this.saveToLocalCache();
          this.setupSSE();
          this.notify();
          return this.data;
        }
      }
    } catch (e) {
      console.warn('Backend server not reachable, using local fallback:', e);
      this.isOnline = false;
    }

    // Fallback to localStorage or default sample data
    const local = localStorage.getItem('task_dday_db');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
          this.data = parsed;
        } else {
          this.data = JSON.parse(JSON.stringify(DEFAULT_SAMPLE_DATA));
          this.saveToLocalCache();
        }
      } catch (err) {
        console.error('Failed to parse local storage cache:', err);
        this.data = JSON.parse(JSON.stringify(DEFAULT_SAMPLE_DATA));
      }
    } else {
      this.data = JSON.parse(JSON.stringify(DEFAULT_SAMPLE_DATA));
      this.saveToLocalCache();
    }

    this.notify();
    return this.data;
  },

  setupSSE() {
    if (typeof EventSource === 'undefined') return;
    if (this.eventSource) this.eventSource.close();

    try {
      this.eventSource = new EventSource('/api/events');
      this.eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'DATA_UPDATED' && payload.data) {
            this.data = payload.data;
            this.saveToLocalCache();
            this.notify();
          }
        } catch (err) {
          console.error('Error handling SSE message:', err);
        }
      };

      this.eventSource.onerror = () => {
        // SSE will reconnect automatically
      };
    } catch (err) {
      console.warn('Could not establish SSE connection:', err);
    }
  },

  saveToLocalCache() {
    try {
      localStorage.setItem('task_dday_db', JSON.stringify(this.data));
    } catch (e) {}
  },

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },

  notify() {
    for (const listener of this.listeners) {
      listener(this.data, this.isOnline);
    }
  },

  async addTask(task) {
    if (this.isOnline) {
      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task)
        });
        const json = await res.json();
        if (json.success) {
          await this.init();
          return json.task;
        }
      } catch (err) {
        console.error('Failed to add task on server:', err);
      }
    }

    // Local fallback
    const newTask = {
      id: 'task-' + Date.now(),
      ...task,
      order: this.data.tasks.length + 1
    };
    this.data.tasks.push(newTask);
    this.saveToLocalCache();
    this.notify();
    return newTask;
  },

  async updateTask(id, updates) {
    if (this.isOnline) {
      try {
        const res = await fetch(`/api/tasks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        const json = await res.json();
        if (json.success) {
          await this.init();
          return json.task;
        }
      } catch (err) {
        console.error('Failed to update task on server:', err);
      }
    }

    // Local fallback
    const idx = this.data.tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.tasks[idx] = { ...this.data.tasks[idx], ...updates };
      this.saveToLocalCache();
      this.notify();
      return this.data.tasks[idx];
    }
  },

  async deleteTask(id) {
    if (this.isOnline) {
      try {
        const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          await this.init();
          return true;
        }
      } catch (err) {
        console.error('Failed to delete task on server:', err);
      }
    }

    // Local fallback
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    this.data.tasks.forEach((t, i) => { t.order = i + 1; });
    this.saveToLocalCache();
    this.notify();
    return true;
  },

  async reorderTasks(taskIds) {
    if (this.isOnline) {
      try {
        const res = await fetch('/api/tasks/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskIds })
        });
        const json = await res.json();
        if (json.success) {
          await this.init();
          return true;
        }
      } catch (err) {
        console.error('Failed to reorder tasks on server:', err);
      }
    }

    // Local fallback
    const taskMap = new Map(this.data.tasks.map(t => [t.id, t]));
    const ordered = [];
    taskIds.forEach((id, idx) => {
      if (taskMap.has(id)) {
        const t = taskMap.get(id);
        t.order = idx + 1;
        ordered.push(t);
        taskMap.delete(id);
      }
    });
    taskMap.forEach(t => {
      t.order = ordered.length + 1;
      ordered.push(t);
    });
    this.data.tasks = ordered;
    this.saveToLocalCache();
    this.notify();
    return true;
  },

  async addHoliday(date, name) {
    if (this.isOnline) {
      try {
        const res = await fetch('/api/holidays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, name })
        });
        const json = await res.json();
        if (json.success) {
          await this.init();
          return true;
        }
      } catch (err) {
        console.error('Failed to add holiday on server:', err);
      }
    }

    // Local fallback
    if (!Array.isArray(this.data.customHolidays)) this.data.customHolidays = [];
    this.data.customHolidays = this.data.customHolidays.filter(h => h.date !== date);
    this.data.customHolidays.push({ date, name });
    this.data.customHolidays.sort((a, b) => a.date.localeCompare(b.date));
    this.saveToLocalCache();
    this.notify();
    return true;
  },

  async deleteHoliday(date) {
    if (this.isOnline) {
      try {
        const res = await fetch(`/api/holidays/${date}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          await this.init();
          return true;
        }
      } catch (err) {
        console.error('Failed to delete holiday on server:', err);
      }
    }

    // Local fallback
    if (Array.isArray(this.data.customHolidays)) {
      this.data.customHolidays = this.data.customHolidays.filter(h => h.date !== date);
      this.saveToLocalCache();
      this.notify();
    }
    return true;
  },

  async updateSettings(settings) {
    if (this.isOnline) {
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        });
        const json = await res.json();
        if (json.success) {
          await this.init();
          return true;
        }
      } catch (err) {
        console.error('Failed to update settings on server:', err);
      }
    }

    // Local fallback
    this.data.settings = { ...this.data.settings, ...settings };
    this.saveToLocalCache();
    this.notify();
    return true;
  },

  async resetData() {
    if (this.isOnline) {
      try {
        const res = await fetch('/api/reset', { method: 'POST' });
        const json = await res.json();
        if (json.success) {
          await this.init();
          return true;
        }
      } catch (err) {
        console.error('Failed to reset on server:', err);
      }
    }
    // Local fallback
    this.data = JSON.parse(JSON.stringify(DEFAULT_SAMPLE_DATA));
    this.saveToLocalCache();
    this.notify();
    return true;
  }
};
