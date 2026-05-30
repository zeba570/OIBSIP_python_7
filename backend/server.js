// ===== NEONCHAT BACKEND SERVER =====
// Node.js + Express + Socket.IO + JWT Authentication
// Run: npm install && node server.js
 
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
 
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
 
// ========== CONFIG ==========
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'neonchat-secret-key-change-in-production';
const UPLOAD_DIR = path.join(__dirname, 'uploads');
 
// Ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
 
// ========== IN-MEMORY STORE (replace with DB in production) ==========
const db = {
  users: new Map(),
  rooms: new Map([
    ['r_general', { id: 'r_general', name: 'general', desc: 'General chat', type: 'public', icon: '💬', members: [], createdAt: new Date() }],
    ['r_random',  { id: 'r_random',  name: 'random',  desc: 'Random stuff', type: 'public', icon: '🎲', members: [], createdAt: new Date() }],
    ['r_tech',    { id: 'r_tech',    name: 'tech-talk',desc: 'Technology',  type: 'public', icon: '💻', members: [], createdAt: new Date() }],
  ]),
  messages: new Map(), // roomId → messages[]
  sessions: new Map(), // userId → socketId
};
 
// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../')));
app.use('/uploads', express.static(UPLOAD_DIR));
 
// File upload config
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    cb(null, Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|zip|mp4|mp3/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('File type not allowed'), ok);
  }
});
 
// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
 
// ========== REST API ROUTES ==========
 
// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, password, avatar } = req.body;
    if (!name || !username || !password) return res.status(400).json({ error: 'All fields required' });
    if (username.length < 3) return res.status(400).json({ error: 'Username too short' });
    if (password.length < 4) return res.status(400).json({ error: 'Password too short' });
 
    if ([...db.users.values()].find(u => u.username === username)) {
      return res.status(409).json({ error: 'Username taken' });
    }
 
    const hash = await bcrypt.hash(password, 10);
    const user = {
      id: 'u_' + Date.now(),
      name, username,
      password: hash,
      avatar: avatar || '🐉',
      status: 'online',
      joinedAt: new Date().toISOString()
    };
    db.users.set(user.id, user);
 
    const { password: _, ...safeUser } = user;
    const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: safeUser, token });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});
 
// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = [...db.users.values()].find(u => u.username === username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
 
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
 
    user.status = 'online';
    const { password: _, ...safeUser } = user;
    const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: safeUser, token });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});
 
// Get all rooms
app.get('/api/rooms', authMiddleware, (req, res) => {
  res.json([...db.rooms.values()]);
});
 
// Create room
app.post('/api/rooms', authMiddleware, (req, res) => {
  const { name, desc, type, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  if ([...db.rooms.values()].find(r => r.name === name)) {
    return res.status(409).json({ error: 'Room name taken' });
  }
  const room = {
    id: 'r_' + Date.now(),
    name: name.toLowerCase().replace(/\s+/g, '-'),
    desc: desc || '',
    type: type || 'public',
    icon: icon || '💬',
    members: [req.user.id],
    createdBy: req.user.id,
    createdAt: new Date().toISOString()
  };
  db.rooms.set(room.id, room);
  io.emit('room:created', room);
  res.json(room);
});
 
// Get messages for a room
app.get('/api/rooms/:roomId/messages', authMiddleware, (req, res) => {
  const { roomId } = req.params;
  const { limit = 50, before } = req.query;
  let msgs = db.messages.get(roomId) || [];
  if (before) {
    const idx = msgs.findIndex(m => m.id === before);
    if (idx > 0) msgs = msgs.slice(Math.max(0, idx - limit), idx);
    else msgs = [];
  } else {
    msgs = msgs.slice(-parseInt(limit));
  }
  res.json(msgs);
});
 
// Upload file
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
    size: req.file.size,
    type: req.file.mimetype
  });
});
 
// Get online users
app.get('/api/users/online', authMiddleware, (req, res) => {
  const online = [...db.users.values()]
    .filter(u => u.status === 'online')
    .map(({ password, ...u }) => u);
  res.json(online);
});
 
// ========== SOCKET.IO REAL-TIME ==========
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});
 
io.on('connection', (socket) => {
  const userId = socket.user.id;
  console.log(`✅ User connected: ${socket.user.username} (${socket.id})`);
 
  // Track session
  db.sessions.set(userId, socket.id);
  const user = db.users.get(userId);
  if (user) { user.status = 'online'; }
 
  // Broadcast online status
  socket.broadcast.emit('user:online', { userId, username: socket.user.username });
  io.emit('users:online', [...db.sessions.keys()]);
 
  // ---- JOIN ROOM ----
  socket.on('room:join', (roomId) => {
    socket.join(roomId);
    const room = db.rooms.get(roomId);
    if (room && !room.members.includes(userId)) room.members.push(userId);
    socket.to(roomId).emit('room:user_joined', { userId, username: socket.user.username, roomId });
  });
 
  // ---- LEAVE ROOM ----
  socket.on('room:leave', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('room:user_left', { userId, username: socket.user.username, roomId });
  });
 
  // ---- SEND MESSAGE ----
  socket.on('message:send', (data, ack) => {
    const { roomId, content, type, replyTo, fileUrl, fileName, fileSize } = data;
    if (!roomId || (!content && type === 'text')) return;
 
    const msg = {
      id: 'm_' + Date.now() + Math.random().toString(36).substr(2, 4),
      roomId,
      userId,
      username: socket.user.username,
      userAvatar: user?.avatar || '🐉',
      content: content || fileUrl || '',
      type: type || 'text',
      fileName, fileSize,
      timestamp: new Date().toISOString(),
      replyTo: replyTo || null,
      reactions: {},
      edited: false,
      status: 'sent'
    };
 
    // Store message
    if (!db.messages.has(roomId)) db.messages.set(roomId, []);
    db.messages.get(roomId).push(msg);
 
    // Broadcast to room
    io.to(roomId).emit('message:new', msg);
    if (ack) ack({ success: true, message: msg });
  });
 
  // ---- EDIT MESSAGE ----
  socket.on('message:edit', ({ roomId, messageId, content }) => {
    const msgs = db.messages.get(roomId) || [];
    const msg = msgs.find(m => m.id === messageId && m.userId === userId);
    if (msg) {
      msg.content = content;
      msg.edited = true;
      msg.editedAt = new Date().toISOString();
      io.to(roomId).emit('message:edited', { messageId, content, editedAt: msg.editedAt });
    }
  });
 
  // ---- DELETE MESSAGE ----
  socket.on('message:delete', ({ roomId, messageId }) => {
    const msgs = db.messages.get(roomId) || [];
    const idx = msgs.findIndex(m => m.id === messageId && m.userId === userId);
    if (idx > -1) {
      msgs.splice(idx, 1);
      io.to(roomId).emit('message:deleted', { messageId, roomId });
    }
  });
 
  // ---- REACT TO MESSAGE ----
  socket.on('message:react', ({ roomId, messageId, emoji }) => {
    const msgs = db.messages.get(roomId) || [];
    const msg = msgs.find(m => m.id === messageId);
    if (!msg) return;
    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
    const idx = msg.reactions[emoji].indexOf(userId);
    if (idx > -1) msg.reactions[emoji].splice(idx, 1);
    else msg.reactions[emoji].push(userId);
    if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    io.to(roomId).emit('message:reaction_update', { messageId, reactions: msg.reactions });
  });
 
  // ---- TYPING ----
  socket.on('typing:start', ({ roomId }) => {
    socket.to(roomId).emit('typing:start', { userId, username: socket.user.username, roomId });
  });
  socket.on('typing:stop', ({ roomId }) => {
    socket.to(roomId).emit('typing:stop', { userId, roomId });
  });
 
  // ---- READ RECEIPTS ----
  socket.on('message:read', ({ roomId, messageId }) => {
    socket.to(roomId).emit('message:read', { messageId, userId, readAt: new Date().toISOString() });
  });
 
  // ---- DIRECT MESSAGE ----
  socket.on('dm:send', ({ toUserId, content, type }) => {
    const toSocketId = db.sessions.get(toUserId);
    const msg = {
      id: 'm_' + Date.now(),
      fromUserId: userId,
      fromUsername: socket.user.username,
      toUserId,
      content,
      type: type || 'text',
      timestamp: new Date().toISOString()
    };
    if (toSocketId) io.to(toSocketId).emit('dm:received', msg);
    socket.emit('dm:sent', msg);
  });
 
  // ---- DISCONNECT ----
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.user.username}`);
    db.sessions.delete(userId);
    if (user) user.status = 'offline';
    socket.broadcast.emit('user:offline', { userId });
    io.emit('users:online', [...db.sessions.keys()]);
  });
});
 
// ========== START SERVER ==========
server.listen(PORT, () => {
  console.log(`\n⚡ NeonChat server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready for real-time connections`);
  console.log(`🗂  File uploads → ${UPLOAD_DIR}\n`);
});
 
module.exports = { app, server, io };