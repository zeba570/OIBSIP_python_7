// ===== NOTIFICATIONS MODULE =====
 
let notificationsEnabled = true;
let soundEnabled = true;
 
// Request browser notification permission
async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}
 
function showBrowserNotification(title, body, icon) {
  if (!notificationsEnabled) return;
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: icon || '⚡' });
    } catch(e) {}
  }
}
 
function toggleNotifications(el) {
  notificationsEnabled = el.checked;
  if (notificationsEnabled) {
    requestNotificationPermission();
    showToast('success', '🔔', 'Notifications On', 'You will receive message alerts');
  } else {
    showToast('info', '🔕', 'Notifications Off', 'Alerts are muted');
  }
}
 
// ===== TOAST NOTIFICATIONS =====
function showToast(type, icon, title, body, duration = 3500) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div>
      <div class="toast-title">${title}</div>
      <div class="toast-body">${body}</div>
    </div>
  `;
  container.appendChild(toast);
 
  // Auto remove
  const timer = setTimeout(() => removeToast(toast), duration);
  toast.onclick = () => { clearTimeout(timer); removeToast(toast); };
}
 
function removeToast(toast) {
  toast.classList.add('exiting');
  setTimeout(() => toast.remove(), 300);
}
 
// ===== SOUND =====
function playSound() {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch(e) {}
}
 
// Listen for sound toggle in settings
document.addEventListener('change', (e) => {
  if (e.target.id === 'soundToggle') soundEnabled = e.target.checked;
});