const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DEFAULT_FILE = path.join(DATA_DIR, 'defaultData.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// Ensure DB file exists
function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    if (fs.existsSync(DEFAULT_FILE)) {
      const defaultData = fs.readFileSync(DEFAULT_FILE, 'utf-8');
      fs.writeFileSync(DB_FILE, defaultData, 'utf-8');
    } else {
      fs.writeFileSync(DB_FILE, JSON.stringify({ tasks: [], customHolidays: [], settings: {} }, null, 2), 'utf-8');
    }
  }
}

function readData() {
  initDatabase();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read db.json:', err);
    return { tasks: [], customHolidays: [], settings: {} };
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    broadcastUpdate(data);
    return true;
  } catch (err) {
    console.error('Failed to write db.json:', err);
    return false;
  }
}

// Server-Sent Events (SSE) connections
const sseClients = new Set();

function broadcastUpdate(data) {
  const payload = `data: ${JSON.stringify({ type: 'DATA_UPDATED', data })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

// Request Body parser helper
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // SSE Stream
  if (pathname === '/api/events' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // REST API Routes
  if (pathname.startsWith('/api/')) {
    try {
      // GET full state
      if (pathname === '/api/data' && method === 'GET') {
        const data = readData();
        return sendJson(res, 200, { success: true, data });
      }

      // RESET to defaults
      if (pathname === '/api/reset' && method === 'POST') {
        if (fs.existsSync(DEFAULT_FILE)) {
          const defaultData = JSON.parse(fs.readFileSync(DEFAULT_FILE, 'utf-8'));
          writeData(defaultData);
          return sendJson(res, 200, { success: true, message: '초기 샘플 데이터로 복원되었습니다.', data: defaultData });
        }
        return sendJson(res, 400, { success: false, error: '기본 데이터 파일이 없습니다.' });
      }

      // ADD TASK
      if (pathname === '/api/tasks' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.title || !body.targetDate) {
          return sendJson(res, 400, { success: false, error: '태스크 제목과 오픈 일자는 필수입니다.' });
        }
        const db = readData();
        const newTask = {
          id: 'task-' + Date.now(),
          title: body.title,
          category: body.category || '일반',
          categoryColor: body.categoryColor || '#3b82f6',
          priority: body.priority || 'Normal',
          owner: body.owner || '',
          startDate: body.startDate || new Date().toISOString().slice(0, 16),
          targetDate: body.targetDate,
          memo: body.memo || '',
          status: body.status || 'in_progress',
          order: db.tasks.length + 1
        };
        db.tasks.push(newTask);
        writeData(db);
        return sendJson(res, 201, { success: true, task: newTask });
      }

      // UPDATE TASK
      const taskUpdateMatch = pathname.match(/^\/api\/tasks\/([a-zA-Z0-9_-]+)$/);
      if (taskUpdateMatch && method === 'PUT') {
        const taskId = taskUpdateMatch[1];
        const body = await parseBody(req);
        const db = readData();
        const idx = db.tasks.findIndex(t => t.id === taskId);
        if (idx === -1) {
          return sendJson(res, 404, { success: false, error: '태스크를 찾을 수 없습니다.' });
        }
        db.tasks[idx] = { ...db.tasks[idx], ...body, id: taskId };
        writeData(db);
        return sendJson(res, 200, { success: true, task: db.tasks[idx] });
      }

      // DELETE TASK
      if (taskUpdateMatch && method === 'DELETE') {
        const taskId = taskUpdateMatch[1];
        const db = readData();
        db.tasks = db.tasks.filter(t => t.id !== taskId);
        // re-index order
        db.tasks.forEach((t, i) => { t.order = i + 1; });
        writeData(db);
        return sendJson(res, 200, { success: true, message: '태스크가 삭제되었습니다.' });
      }

      // REORDER TASKS
      if (pathname === '/api/tasks/reorder' && method === 'PUT') {
        const body = await parseBody(req);
        if (!Array.isArray(body.taskIds)) {
          return sendJson(res, 400, { success: false, error: 'taskIds 배열이 필요합니다.' });
        }
        const db = readData();
        const taskMap = new Map(db.tasks.map(t => [t.id, t]));
        const ordered = [];
        body.taskIds.forEach((id, idx) => {
          if (taskMap.has(id)) {
            const task = taskMap.get(id);
            task.order = idx + 1;
            ordered.push(task);
            taskMap.delete(id);
          }
        });
        // append remaining
        taskMap.forEach(task => {
          task.order = ordered.length + 1;
          ordered.push(task);
        });
        db.tasks = ordered;
        writeData(db);
        return sendJson(res, 200, { success: true, tasks: db.tasks });
      }

      // ADD CUSTOM HOLIDAY
      if (pathname === '/api/holidays' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.date || !body.name) {
          return sendJson(res, 400, { success: false, error: '휴일 날짜와 휴일명을 입력해주세요.' });
        }
        const db = readData();
        if (!Array.isArray(db.customHolidays)) db.customHolidays = [];
        // Check duplicate
        db.customHolidays = db.customHolidays.filter(h => h.date !== body.date);
        db.customHolidays.push({ date: body.date, name: body.name });
        db.customHolidays.sort((a, b) => a.date.localeCompare(b.date));
        writeData(db);
        return sendJson(res, 201, { success: true, customHolidays: db.customHolidays });
      }

      // DELETE CUSTOM HOLIDAY
      const holidayDeleteMatch = pathname.match(/^\/api\/holidays\/([0-9]{4}-[0-9]{2}-[0-9]{2})$/);
      if (holidayDeleteMatch && method === 'DELETE') {
        const hDate = holidayDeleteMatch[1];
        const db = readData();
        if (Array.isArray(db.customHolidays)) {
          db.customHolidays = db.customHolidays.filter(h => h.date !== hDate);
          writeData(db);
        }
        return sendJson(res, 200, { success: true, customHolidays: db.customHolidays });
      }

      // UPDATE SETTINGS
      if (pathname === '/api/settings' && method === 'PUT') {
        const body = await parseBody(req);
        const db = readData();
        db.settings = { ...db.settings, ...body };
        writeData(db);
        return sendJson(res, 200, { success: true, settings: db.settings });
      }

      return sendJson(res, 404, { success: false, error: '존재하지 않는 API 엔드포인트입니다.' });
    } catch (err) {
      console.error('API Error:', err);
      return sendJson(res, 500, { success: false, error: err.message || '서버 오류' });
    }
  }

  // Static File Serving
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Security check: ensure path is within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Access Denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA if not an asset
      const ext = path.extname(pathname);
      if (!ext) {
        filePath = path.join(PUBLIC_DIR, 'index.html');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('File Not Found');
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Error loading file');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

initDatabase();

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 TASK D-Day 상황판 서버가 시작되었습니다!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`💡 웹 브라우저에서 위 주소로 접속하면 바로 사용할 수 있습니다.`);
  console.log(`====================================================`);
});
