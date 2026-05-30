// ===== MESSAGES MODULE =====
 
let replyTo = null;
let typingTimer = null;
const REACTIONS_MAP = ['❤️','👍','😂','😮','😢','🔥','👏','🎉'];
 
function getMessages(roomId) {
  return JSON.parse(localStorage.getItem(`nc_msgs_${roomId}`) || '[]');
}
 
function saveMessages(roomId, msgs) {
  localStorage.setItem(`nc_msgs_${roomId}`, JSON.stringify(msgs));
}
 
function sendMessage() {
  const ta = document.getElementById('messageInput');
  const content = ta.value.trim();
  if (!content || !currentRoom) return;
 
  const msg = {
    id: 'm_' + Date.now() + Math.random().toString(36).substr(2,4),
    roomId: currentRoom.id,
    userId: currentUser.id,
    username: currentUser.name,
    userAvatar: currentUser.avatar,
    content,
    type: 'text',
    timestamp: new Date().toISOString(),
    replyTo: replyTo ? { id: replyTo.id, content: replyTo.content, username: replyTo.username } : null,
    reactions: {},
    edited: false,
    status: 'sent'
  };
 
  const msgs = getMessages(currentRoom.id);
  msgs.push(msg);
  saveMessages(currentRoom.id, msgs);
 
  ta.value = '';
  ta.style.height = 'auto';
  cancelReply();
 
  // Simulate delivered → read
  setTimeout(() => updateMsgStatus(msg.id, 'delivered'), 800);
  setTimeout(() => updateMsgStatus(msg.id, 'read'), 2000);
 
  renderMessages();
  scrollToBottom();
  playSound();
 
  // Simulate reply from bot in general room
  if (currentRoom.id === 'r_general' && Math.random() < 0.3) {
    setTimeout(() => simulateBotReply(content), 1500 + Math.random() * 2000);
  }
}
 
function updateMsgStatus(msgId, status) {
  if (!currentRoom) return;
  const msgs = getMessages(currentRoom.id);
  const idx = msgs.findIndex(m => m.id === msgId);
  if (idx > -1) {
    msgs[idx].status = status;
    saveMessages(currentRoom.id, msgs);
    renderMessages();
  }
}
 
function simulateBotReply(trigger) {
  const bots = [
    { name: 'Luna', avatar: '🌙', id: 'bot_luna' },
    { name: 'Spark', avatar: '⚡', id: 'bot_spark' },
    { name: 'Nova', avatar: '🌟', id: 'bot_nova' }
  ];
  const bot = bots[Math.floor(Math.random() * bots.length)];
  const replies = [
    "That's interesting! 🤔", "I totally agree with that!", "Haha nice one 😂",
    "Great point!", "Can you elaborate on that?", "Same here! 💯",
    "This is getting good 🔥", "Love the energy here!", "Makes sense to me!",
    "Wow, didn't think of it that way 😮", "Let's gooo! 🚀"
  ];
 
  // Show typing
  showTyping(bot.name);
  setTimeout(() => {
    hideTyping();
    const msg = {
      id: 'm_' + Date.now(),
      roomId: currentRoom.id,
      userId: bot.id,
      username: bot.name,
      userAvatar: bot.avatar,
      content: replies[Math.floor(Math.random() * replies.length)],
      type: 'text',
      timestamp: new Date().toISOString(),
      replyTo: null,
      reactions: {},
      edited: false,
      status: 'read'
    };
    const msgs = getMessages(currentRoom.id);
    msgs.push(msg);
    saveMessages(currentRoom.id, msgs);
    renderMessages();
    scrollToBottom();
    showToast('info', bot.avatar, bot.name, truncate(msg.content, 40));
    incrementUnread(currentRoom.id);
    renderRoomList();
  }, 1500);
}
 
function renderMessages() {
  if (!currentRoom) return;
  const msgs = getMessages(currentRoom.id);
  const list = document.getElementById('messagesList');
  const wasAtBottom = isAtBottom();
 
  // Apply search filter
  const searchQ = document.getElementById('msgSearchInput')?.value?.trim().toLowerCase() || '';
  const filtered = searchQ ? msgs.filter(m => m.content?.toLowerCase().includes(searchQ)) : msgs;
 
  list.innerHTML = '';
 
  // Group by date
  let lastDate = null;
  filtered.forEach(msg => {
    const msgDate = new Date(msg.timestamp).toDateString();
    if (msgDate !== lastDate) {
      lastDate = msgDate;
      const divider = document.createElement('div');
      divider.className = 'msg-date-divider';
      divider.textContent = formatDate(msg.timestamp);
      list.appendChild(divider);
    }
    list.appendChild(createMsgElement(msg));
  });
 
  if (wasAtBottom) scrollToBottom();
}
 
function createMsgElement(msg) {
  const isOwn = msg.userId === currentUser.id;
  const wrapper = document.createElement('div');
  wrapper.className = 'msg-wrapper' + (isOwn ? ' own' : '');
  wrapper.id = 'msg_' + msg.id;
 
  const statusIcon = isOwn ? (msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓') : '';
  const statusColor = msg.status === 'read' ? 'var(--accent1)' : 'var(--text-muted)';
 
  // Build reactions HTML
  const reactionsHTML = Object.entries(msg.reactions || {}).map(([emoji, users]) => {
    const mine = users.includes(currentUser.id);
    return `<div class="reaction ${mine ? 'mine' : ''}" onclick="toggleReaction('${msg.id}','${emoji}')">
      ${emoji} <span class="reaction-count">${users.length}</span>
    </div>`;
  }).join('');
 
  // Reply reference
  const replyHTML = msg.replyTo ? `
    <div class="msg-reply-ref" onclick="scrollToMsg('${msg.replyTo.id}')">
      ↩ <strong>${msg.replyTo.username}</strong>: ${truncate(msg.replyTo.content, 50)}
    </div>` : '';
 
  // Content based on type
  let contentHTML = '';
  if (msg.type === 'image') {
    contentHTML = `<img src="${msg.content}" class="msg-image" alt="Image" onclick="openImageFull('${msg.content}')"/>`;
  } else if (msg.type === 'file') {
    contentHTML = `<div class="msg-file-attach">
      <i class="fa fa-file"></i>
      <div class="msg-file-info">
        <div class="msg-file-name">${msg.fileName || 'File'}</div>
        <div class="msg-file-size">${msg.fileSize || ''}</div>
      </div>
      <i class="fa fa-download" style="color:var(--accent1)"></i>
    </div>`;
  } else {
    contentHTML = linkify(escapeHtml(msg.content));
  }
 
  wrapper.innerHTML = `
    ${!isOwn ? `<div class="msg-avatar">${msg.userAvatar}</div>` : ''}
    <div class="msg-content">
      ${!isOwn ? `<div class="msg-meta"><span class="msg-username">${msg.username}</span><span>${formatTime(msg.timestamp)}</span></div>` : ''}
      ${replyHTML}
      <div class="msg-bubble" ondblclick="quickReact('${msg.id}','❤️')">
        <div class="msg-action-bar">
          ${REACTIONS_MAP.map(e => `<button onclick="toggleReaction('${msg.id}','${e}')" title="${e}">${e}</button>`).join('')}
          <button onclick="replyToMsg('${msg.id}')" title="Reply">↩</button>
          ${isOwn ? `<button onclick="deleteMsg('${msg.id}')" title="Delete">🗑</button>` : ''}
        </div>
        ${contentHTML}
        ${msg.edited ? `<span style="font-size:10px;color:rgba(255,255,255,0.5)"> (edited)</span>` : ''}
      </div>
      ${reactionsHTML ? `<div class="msg-reactions">${reactionsHTML}</div>` : ''}
      ${isOwn ? `<div class="msg-status" style="color:${statusColor}">${statusIcon}</div>` : ''}
    </div>
    ${isOwn ? `<div class="msg-avatar">${msg.userAvatar}</div>` : ''}
  `;
 
  return wrapper;
}
 
function toggleReaction(msgId, emoji) {
  const msgs = getMessages(currentRoom.id);
  const idx = msgs.findIndex(m => m.id === msgId);
  if (idx === -1) return;
 
  if (!msgs[idx].reactions) msgs[idx].reactions = {};
  if (!msgs[idx].reactions[emoji]) msgs[idx].reactions[emoji] = [];
 
  const users = msgs[idx].reactions[emoji];
  const uIdx = users.indexOf(currentUser.id);
  if (uIdx > -1) {
    users.splice(uIdx, 1);
    if (users.length === 0) delete msgs[idx].reactions[emoji];
  } else {
    users.push(currentUser.id);
  }
  saveMessages(currentRoom.id, msgs);
  renderMessages();
}
 
function quickReact(msgId, emoji) {
  toggleReaction(msgId, emoji);
}
 
function replyToMsg(msgId) {
  const msgs = getMessages(currentRoom.id);
  const msg = msgs.find(m => m.id === msgId);
  if (!msg) return;
  replyTo = msg;
  document.getElementById('replyPreview').classList.remove('hidden');
  document.getElementById('replyText').textContent = `${msg.username}: ${truncate(msg.content, 50)}`;
  document.getElementById('messageInput').focus();
}
 
function cancelReply() {
  replyTo = null;
  document.getElementById('replyPreview').classList.add('hidden');
}
 
function deleteMsg(msgId) {
  const msgs = getMessages(currentRoom.id);
  const idx = msgs.findIndex(m => m.id === msgId);
  if (idx > -1 && msgs[idx].userId === currentUser.id) {
    msgs.splice(idx, 1);
    saveMessages(currentRoom.id, msgs);
    renderMessages();
  }
}
 
function scrollToMsg(msgId) {
  const el = document.getElementById('msg_' + msgId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.querySelector('.msg-bubble')?.classList.add('highlight');
    setTimeout(() => el.querySelector('.msg-bubble')?.classList.remove('highlight'), 1000);
  }
}
 
function handleFileAttach(event) {
  const files = event.target.files;
  if (!files.length || !currentRoom) return;
  Array.from(files).forEach(file => {
    const msg = {
      id: 'm_' + Date.now() + Math.random().toString(36).substr(2,4),
      roomId: currentRoom.id,
      userId: currentUser.id,
      username: currentUser.name,
      userAvatar: currentUser.avatar,
      content: file.name,
      type: 'file',
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      timestamp: new Date().toISOString(),
      replyTo: null,
      reactions: {},
      status: 'sent'
    };
    const msgs = getMessages(currentRoom.id);
    msgs.push(msg);
    saveMessages(currentRoom.id, msgs);
  });
  renderMessages();
  scrollToBottom();
  event.target.value = '';
  showToast('success', '📎', 'File Sent', `${files.length} file(s) attached`);
}
 
function handleImageAttach(event) {
  const file = event.target.files[0];
  if (!file || !currentRoom) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const msg = {
      id: 'm_' + Date.now(),
      roomId: currentRoom.id,
      userId: currentUser.id,
      username: currentUser.name,
      userAvatar: currentUser.avatar,
      content: e.target.result,
      type: 'image',
      timestamp: new Date().toISOString(),
      replyTo: null,
      reactions: {},
      status: 'sent'
    };
    const msgs = getMessages(currentRoom.id);
    msgs.push(msg);
    saveMessages(currentRoom.id, msgs);
    renderMessages();
    scrollToBottom();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}
 
function openImageFull(src) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'max-width:90vw;max-height:90vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.8);';
  overlay.appendChild(img);
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
}
 
// Typing indicator
let isTyping = false;
function showTyping(username) {
  document.getElementById('typingIndicator').classList.remove('hidden');
  document.getElementById('typingText').textContent = `${username} is typing...`;
}
function hideTyping() {
  document.getElementById('typingIndicator').classList.add('hidden');
}
 
function handleTyping() {
  const ta = document.getElementById('messageInput');
  // Auto-resize
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
 
  if (!isTyping) {
    isTyping = true;
    // Could broadcast via WebSocket in real app
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => { isTyping = false; }, 2000);
}
 
function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}
 
// Message search
function toggleMsgSearch() {
  const bar = document.getElementById('msgSearchBar');
  bar.classList.toggle('hidden');
  if (!bar.classList.contains('hidden')) {
    document.getElementById('msgSearchInput').focus();
  }
}
function closeMsgSearch() {
  document.getElementById('msgSearchBar').classList.add('hidden');
  document.getElementById('msgSearchInput').value = '';
  renderMessages();
}
function searchMessages() { renderMessages(); }
 
// Helpers
function scrollToBottom() {
  const c = document.getElementById('messagesContainer');
  if (c) c.scrollTop = c.scrollHeight;
}
function isAtBottom() {
  const c = document.getElementById('messagesContainer');
  return c ? c.scrollHeight - c.scrollTop - c.clientHeight < 80 : true;
}
function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '…' : str;
}
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function linkify(str) {
  return str.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--accent1)">$1</a>');
}
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1048576).toFixed(1) + ' MB';
}
function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
}
function formatDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday:'long', month:'long', day:'numeric' });
}