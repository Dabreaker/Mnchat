const express = require('express');
const multer = require('multer');
const { put, list, get } = require('@vercel/blob');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Auth ─────────────────────────────────────────────────────────────────────
const USERS = {
  'Mahim': '3078323',
  'Nur': 'nurhafiza'
};

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (USERS[username] && USERS[username] === password) {
    res.json({ ok: true, username });
  } else {
    res.status(401).json({ ok: false, error: 'Invalid credentials' });
  }
});

// ─── Messages ─────────────────────────────────────────────────────────────────
// We store all messages in a single blob JSON to minimize list calls
const MSGS_KEY = 'chat/messages.json';

async function readMessages() {
  try {
    const blobs = await list({ prefix: MSGS_KEY });
    if (!blobs.blobs.length) return [];
    const res = await fetch(blobs.blobs[0].url);
    return await res.json();
  } catch {
    return [];
  }
}

async function writeMessages(msgs) {
  await put(MSGS_KEY, JSON.stringify(msgs), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false
  });
}

app.get('/api/messages', async (req, res) => {
  try {
    const since = parseInt(req.query.since || '0');
    const msgs = await readMessages();
    const filtered = since ? msgs.filter(m => m.ts > since) : msgs;
    res.json(filtered);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { username, text, type, fileUrl, fileName, fileSize } = req.body;
    if (!USERS[username]) return res.status(403).json({ error: 'Unauthorized' });
    const msgs = await readMessages();
    const msg = {
      id: Date.now() + Math.random().toString(36).slice(2),
      ts: Date.now(),
      username,
      type: type || 'text',
      text: text || '',
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileSize: fileSize || null
    };
    msgs.push(msg);
    // Keep last 500 messages
    if (msgs.length > 500) msgs.splice(0, msgs.length - 500);
    await writeMessages(msgs);
    res.json(msg);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── File Upload ───────────────────────────────────────────────────────────────
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { username } = req.body;
    if (!USERS[username]) return res.status(403).json({ error: 'Unauthorized' });
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file' });

    const ext = path.extname(file.originalname);
    const key = `chat/files/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const blob = await put(key, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
      addRandomSuffix: false
    });

    res.json({ url: blob.url, name: file.originalname, size: file.size, mime: file.mimetype });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── SSE for real-time ────────────────────────────────────────────────────────
const clients = new Set();

app.get('/api/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const client = { res, lastSeen: Date.now() };
  clients.add(client);

  const heartbeat = setInterval(() => {
    res.write(':ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(client);
  });
});

// Poll and broadcast new messages every 2s (single poller, not per-client)
let lastBroadcastTs = Date.now();
setInterval(async () => {
  if (clients.size === 0) return;
  try {
    const msgs = await readMessages();
    const newMsgs = msgs.filter(m => m.ts > lastBroadcastTs);
    if (newMsgs.length) {
      lastBroadcastTs = newMsgs[newMsgs.length - 1].ts;
      const data = `data: ${JSON.stringify(newMsgs)}\n\n`;
      for (const client of clients) {
        try { client.res.write(data); } catch {}
      }
    }
  } catch {}
}, 2000);

// ─── Notifications push (VAPID keys not needed for basic push notification trigger)
// We use Web Notifications API client-side only

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 4758;
app.listen(PORT, () => console.log(`🚀 Chat running on http://localhost:${PORT}`));
