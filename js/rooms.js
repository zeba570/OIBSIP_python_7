// ===== ROOMS MODULE =====
 
let currentRoom = null;
const DEFAULT_ROOMS = [
  { id: 'r_general', name: 'general', desc: 'General chat for everyone', type: 'public', icon: '💬', members: [], createdAt: new Date().toISOString() },
  { id: 'r_random', name: 'random', desc: 'Random stuff & memes', type: 'public', icon: '🎲', members: [], createdAt: new Date().toISOString() },
  { id: 'r_tech', name: 'tech-talk', desc: 'All things technology', type: 'public', icon: '💻', members: [], createdAt: new Date().toISOString() },
  { id: 'r_gaming', name: 'gaming', desc: 'Gaming community', type: 'public', icon: '🎮', members: [], createdAt: new Date().toISOString() },
  { id: 'r_music', name: 'music-vibes', desc: 'Share your music', type: 'public', icon: '🎵', members: [], createdAt: new Date().toISOString() },
];
 
function getRooms() {
  let rooms = JSON.parse(localStorage.getItem('nc_rooms') || 'null');
  if (!rooms) {
    rooms = DEFAULT_ROOMS;
    localStorage.setItem('nc_rooms', JSON.stringify(rooms));
  }
  return rooms;
}
 
function saveRooms(rooms) {
  localStorage.setItem('nc_rooms', JSON.stringify(rooms));
}
 
function renderRoomList(filter = '') {
  const rooms = getRooms();
  const list = document.getElementById('roomList');
  list.innerHTML = '';
  const filtered = rooms.filter(r => r.name.toLowerCase().includes(filter.toLowerCase()));
 
  filtered.forEach(room => {
    const messages = getMessages(room.id);
    const lastMsg = messages[messages.length - 1];
    const unread = getUnread(room.id);
 
    const item = document.createElement('div');
    item.className = 'room-item' + (currentRoom?.id === room.id ? ' active' : '');
    item.onclick = () => openRoom(room);
 
    const timeFmt = lastMsg ? formatTime(lastMsg.timestamp) : '';
    const preview = lastMsg ? (lastMsg.type === 'image' ? '📷 Image' : lastMsg.type === 'file' ? '📎 File' : truncate(lastMsg.content, 32)) : 'No messages yet';
 
    item.innerHTML = `
      <div class="room-icon">${room.icon}</div>
      <div class="room-item-info">
        <div class="room-item-name">#${room.name}</div>
        <div class="room-item-preview">${preview}</div>
      </div>
      <div class="room-meta">
        <span class="room-time">${timeFmt}</span>
        ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
      </div>
    `;
    list.appendChild(item);
  });
}
 
function openRoom(room) {
  currentRoom = room;
  clearUnread(room.id);
 
  // Update UI
  document.getElementById('welcomeScreen').classList.add('hidden');
  document.getElementById('chatWindow').classList.remove('hidden');
  document.getElementById('chatRoomAvatar').textContent = room.icon;
  document.getElementById('chatRoomName').textContent = '#' + room.name;
  document.getElementById('chatRoomStatus').textContent = room.type === 'public' ? '🌐 Public Room' : '🔒 Private Room';
 
  renderRoomList();
  renderMessages();
  scrollToBottom();
 
  // Mobile: hide sidebar
  document.getElementById('sidebar').classList.add('hidden-mobile');
}
 
function showCreateRoom() {
  document.getElementById('createRoomModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('roomName').focus(), 100);
}
 
function hideCreateRoom() {
  document.getElementById('createRoomModal').classList.add('hidden');
  document.getElementById('roomName').value = '';
  document.getElementById('roomDesc').value = '';
}
 
function createRoom() {
  const name = document.getElementById('roomName').value.trim().toLowerCase().replace(/\s+/g, '-');
  const desc = document.getElementById('roomDesc').value.trim();
  const type = document.querySelector('input[name="roomType"]:checked').value;
 
  if (!name) return showToast('error', '❌', 'Error', 'Room name is required');
 
  const rooms = getRooms();
  if (rooms.find(r => r.name === name)) return showToast('error', '❌', 'Error', 'Room name already taken');
 
  const ICONS = ['🌟','🔮','🎯','🏆','💎','🌺','⚡','🎨','🎪','🚀'];
  const newRoom = {
    id: 'r_' + Date.now(),
    name,
    desc: desc || 'A new room',
    type,
    icon: ICONS[Math.floor(Math.random() * ICONS.length)],
    members: [currentUser.id],
    createdBy: currentUser.id,
    createdAt: new Date().toISOString()
  };
  rooms.push(newRoom);
  saveRooms(rooms);
  hideCreateRoom();
  showToast('success', '✅', 'Room Created', `#${name} is ready`);
  renderRoomList();
  openRoom(newRoom);
}
 
function filterRooms() {
  const q = document.getElementById('searchInput').value;
  renderRoomList(q);
}
 
function renderOnlineUsers() {
  const users = JSON.parse(localStorage.getItem('nc_users') || '[]');
  const list = document.getElementById('onlineList');
  list.innerHTML = '';
  users.filter(u => u.status === 'online' && u.id !== currentUser.id).forEach(u => {
    const el = document.createElement('div');
    el.className = 'online-user';
    el.innerHTML = `<div class="online-dot"></div><div class="online-avatar-sm">${u.avatar}</div><span>${u.name}</span>`;
    el.onclick = () => openDM(u);
    list.appendChild(el);
  });
}
 
function openDM(user) {
  // Create or find DM room
  const dmId = ['dm', currentUser.id, user.id].sort().join('_');
  const rooms = getRooms();
  let dmRoom = rooms.find(r => r.id === dmId);
  if (!dmRoom) {
    dmRoom = {
      id: dmId,
      name: user.name,
      desc: 'Direct message',
      type: 'dm',
      icon: user.avatar,
      members: [currentUser.id, user.id],
      createdAt: new Date().toISOString()
    };
    rooms.push(dmRoom);
    saveRooms(rooms);
  }
  openRoom(dmRoom);
}
 
function toggleRoomInfo() {
  const panel = document.getElementById('roomInfoPanel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden') && currentRoom) {
    renderRoomInfo();
  }
}
 
function renderRoomInfo() {
  const body = document.getElementById('roomInfoBody');
  const users = JSON.parse(localStorage.getItem('nc_users') || '[]');
  const msgs = getMessages(currentRoom.id);
 
  body.innerHTML = `
    <div class="panel-section">
      <div style="text-align:center; padding: 16px 0;">
        <div style="font-size:48px; margin-bottom:8px">${currentRoom.icon}</div>
        <div style="font-family:'Syne',sans-serif; font-weight:800; font-size:18px">#${currentRoom.name}</div>
        <div style="font-size:13px; color:var(--text-secondary); margin-top:4px">${currentRoom.desc}</div>
      </div>
    </div>
    <div class="panel-section">
      <div class="panel-section-title">Stats</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:var(--bg-hover);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:22px;font-weight:800;font-family:'Syne',sans-serif">${msgs.length}</div>
          <div style="font-size:11px;color:var(--text-muted)">Messages</div>
        </div>
        <div style="background:var(--bg-hover);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:22px;font-weight:800;font-family:'Syne',sans-serif">${users.length}</div>
          <div style="font-size:11px;color:var(--text-muted)">Members</div>
        </div>
      </div>
    </div>
    <div class="panel-section">
      <div class="panel-section-title">Members</div>
      ${users.slice(0, 10).map(u => `
        <div class="panel-member">
          <div class="panel-member-avatar">${u.avatar}</div>
          <div>
            <div class="panel-member-name">${u.name}</div>
            <div class="panel-member-role">${u.status === 'online' ? '🟢 Online' : '⚫ Offline'}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
 
function closeChatMobile() {
  document.getElementById('sidebar').classList.remove('hidden-mobile');
  document.getElementById('chatWindow').classList.add('hidden');
  document.getElementById('welcomeScreen').classList.remove('hidden');
}
 
// Unread tracking
function getUnread(roomId) {
  const key = `nc_unread_${currentUser?.id}_${roomId}`;
  return parseInt(localStorage.getItem(key) || '0');
}
function setUnread(roomId, count) {
  const key = `nc_unread_${currentUser?.id}_${roomId}`;
  localStorage.setItem(key, count);
}
function clearUnread(roomId) { setUnread(roomId, 0); }
function incrementUnread(roomId) {
  if (currentRoom?.id === roomId) return;
  setUnread(roomId, getUnread(roomId) + 1);
}