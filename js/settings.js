// ===== SETTINGS MODULE =====
 
function toggleSettings() {
  document.getElementById('settingsModal').classList.toggle('hidden');
}
 
function setTheme(theme, btn) {
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('nc_theme', theme);
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
 
function setAccent(color1, color2, dot) {
  document.documentElement.style.setProperty('--accent1', color1);
  document.documentElement.style.setProperty('--accent2', color2);
  localStorage.setItem('nc_accent', JSON.stringify({ color1, color2 }));
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
  dot.classList.add('active');
}
 
function loadSettings() {
  const theme = localStorage.getItem('nc_theme') || 'dark';
  if (theme !== 'dark') {
    document.body.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-btn').forEach(b => {
      if (b.textContent.toLowerCase() === theme) b.classList.add('active');
      else b.classList.remove('active');
    });
  }
 
  const accent = localStorage.getItem('nc_accent');
  if (accent) {
    const { color1, color2 } = JSON.parse(accent);
    document.documentElement.style.setProperty('--accent1', color1);
    document.documentElement.style.setProperty('--accent2', color2);
  }
}
 
// Video call demo
function demoCall() {
  if (!currentRoom) return;
  const overlay = document.getElementById('callOverlay');
  document.getElementById('callName').textContent = '#' + currentRoom.name;
  overlay.classList.remove('hidden');
  showToast('info', '📹', 'Video Call', 'Demo mode — WebRTC coming soon!');
}
 
function endCall() {
  document.getElementById('callOverlay').classList.add('hidden');
}