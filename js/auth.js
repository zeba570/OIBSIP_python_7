// ===== AUTHENTICATION MODULE =====
 
let currentUser = null;
let selectedAvatar = '🐉';
 
function switchTab(tab) {
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('loginTab').classList.toggle('active', tab === 'login');
  document.getElementById('registerTab').classList.toggle('active', tab === 'register');
  document.getElementById('authError').classList.add('hidden');
}
 
function selectAvatar(el, emoji) {
  document.querySelectorAll('.avatar-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  selectedAvatar = emoji;
}
 
function showError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.classList.remove('hidden');
}
 
function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!username || !password) return showError('Please fill in all fields.');
 
  const users = JSON.parse(localStorage.getItem('nc_users') || '[]');
  const user = users.find(u => u.username === username && u.password === btoa(password));
  if (!user) return showError('Invalid username or password.');
 
  currentUser = user;
  localStorage.setItem('nc_session', JSON.stringify(user));
  enterApp();
}
 
function register() {
  const name = document.getElementById('regName').value.trim();
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
 
  if (!name || !username || !password) return showError('Please fill in all fields.');
  if (username.length < 3) return showError('Username must be at least 3 characters.');
  if (password.length < 4) return showError('Password must be at least 4 characters.');
 
  const users = JSON.parse(localStorage.getItem('nc_users') || '[]');
  if (users.find(u => u.username === username)) return showError('Username already taken.');
 
  const newUser = {
    id: 'u_' + Date.now(),
    name,
    username,
    password: btoa(password),
    avatar: selectedAvatar,
    joinedAt: new Date().toISOString(),
    status: 'online'
  };
  users.push(newUser);
  localStorage.setItem('nc_users', JSON.stringify(users));
 
  currentUser = newUser;
  localStorage.setItem('nc_session', JSON.stringify(newUser));
  showToast('success', '🎉', 'Welcome!', `Account created for ${name}`);
  enterApp();
}
 
function logout() {
  // Mark offline
  updateUserStatus('offline');
  currentUser = null;
  localStorage.removeItem('nc_session');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
}
 
function updateUserStatus(status) {
  const users = JSON.parse(localStorage.getItem('nc_users') || '[]');
  const idx = users.findIndex(u => u.id === currentUser.id);
  if (idx > -1) {
    users[idx].status = status;
    currentUser.status = status;
    localStorage.setItem('nc_users', JSON.stringify(users));
    localStorage.setItem('nc_session', JSON.stringify(currentUser));
  }
}
 
function enterApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  updateUserStatus('online');
  initApp();
}
 
function checkSession() {
  const session = localStorage.getItem('nc_session');
  if (session) {
    currentUser = JSON.parse(session);
    // Re-validate user exists
    const users = JSON.parse(localStorage.getItem('nc_users') || '[]');
    const found = users.find(u => u.id === currentUser.id);
    if (found) {
      currentUser = found;
      enterApp();
      return true;
    }
  }
  return false;
}