// ===== MAIN APP INITIALIZATION =====
 
function initApp() {
  // Render current user info
  const info = document.getElementById('currentUserInfo');
  info.innerHTML = `
    <div class="user-avatar" id="userAvatarEl">${currentUser.avatar}</div>
    <div>
      <div class="user-name">${currentUser.name}</div>
      <div class="user-status">● Online</div>
    </div>
  `;
 
  // Load settings
  loadSettings();
 
  // Render rooms and users
  renderRoomList();
  renderOnlineUsers();
 
  // Request notification permission
  requestNotificationPermission();
 
  // Poll for updates (simulates real-time in demo)
  setInterval(() => {
    renderRoomList();
    renderOnlineUsers();
    if (currentRoom) renderMessages();
  }, 3000);
 
  // Open general room by default
  const rooms = getRooms();
  const general = rooms.find(r => r.id === 'r_general');
  if (general) {
    setTimeout(() => openRoom(general), 100);
  }
 
  // Seed some demo messages if general is empty
  seedDemoMessages();
}
 
function seedDemoMessages() {
  const msgs = getMessages('r_general');
  if (msgs.length > 0) return;
 
  const demoMsgs = [
    { username: 'Luna', avatar: '🌙', id: 'bot_luna', content: 'Hey everyone! Welcome to NeonChat ⚡' },
    { username: 'Spark', avatar: '⚡', id: 'bot_spark', content: 'This is awesome! Love the design 🔥' },
    { username: 'Nova', avatar: '🌟', id: 'bot_nova', content: 'Double-click any message to react with ❤️' },
    { username: 'Luna', avatar: '🌙', id: 'bot_luna', content: 'You can also attach images and files!' },
    { username: 'Spark', avatar: '⚡', id: 'bot_spark', content: 'Try the emoji picker on the left 😄👋' },
  ];
 
  const savedMsgs = [];
  demoMsgs.forEach((m, i) => {
    savedMsgs.push({
      id: 'm_demo_' + i,
      roomId: 'r_general',
      userId: m.id,
      username: m.username,
      userAvatar: m.avatar,
      content: m.content,
      type: 'text',
      timestamp: new Date(Date.now() - (demoMsgs.length - i) * 120000).toISOString(),
      replyTo: null,
      reactions: i === 0 ? { '❤️': ['bot_spark', 'bot_nova'] } : {},
      edited: false,
      status: 'read'
    });
  });
  saveMessages('r_general', savedMsgs);
}
 
// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
});
 
// Close emoji picker on message send
document.getElementById('messageInput')?.addEventListener('focus', () => {
  // keep emoji picker open if user is selecting
});
 
// Init
window.addEventListener('load', () => {
  if (!checkSession()) {
    // Show auth screen (already visible by default)
  }
});
 
// Handle visibility change — update status
document.addEventListener('visibilitychange', () => {
  if (currentUser) {
    updateUserStatus(document.hidden ? 'away' : 'online');
  }
});
 
// Prevent losing data on refresh
window.addEventListener('beforeunload', () => {
  if (currentUser) updateUserStatus('offline');
});