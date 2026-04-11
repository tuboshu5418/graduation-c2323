// ========== 配置区 ==========
const API_BASE = '';
// ============================

let currentUser = null;
let allClassmates = [];
let allTeachers = [];
let currentFeedbackFilter = 'all';
let selectedToName = null;

// ========== 音乐播放器 ==========
let audio = null;
let lyricsData = [];
let lyricsElement = null;
let currentLyricIndex = -1;

function initMusicPlayer() {
  audio = new Audio('/干杯.mp3');
  lyricsElement = document.getElementById('lyricsContent');
  
  fetch('/干杯.lrc')
    .then(res => res.text())
    .then(parseLRC)
    .catch(() => {
      document.getElementById('lyricsContent').innerHTML = '暂无歌词';
    });
  
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', () => {
    document.getElementById('duration').textContent = formatTime(audio.duration);
  });
  audio.addEventListener('play', () => {
    document.getElementById('playBtn').textContent = '⏸️';
    document.getElementById('musicToggle').classList.add('playing');
  });
  audio.addEventListener('pause', () => {
    document.getElementById('playBtn').textContent = '▶️';
    document.getElementById('musicToggle').classList.remove('playing');
  });
  audio.addEventListener('ended', () => {
    document.getElementById('playBtn').textContent = '▶️';
    document.getElementById('musicToggle').classList.remove('playing');
  });
}

function parseLRC(lrcText) {
  const lines = lrcText.split('\n');
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  lyricsData = [];
  
  lines.forEach(line => {
    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = parseInt(match[3].length === 2 ? match[3] * 10 : match[3]);
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeRegex, '').trim();
      if (text) lyricsData.push({ time, text });
    }
  });
  
  lyricsData.sort((a, b) => a.time - b.time);
  
  if (lyricsData.length > 0) {
    lyricsElement.innerHTML = lyricsData.map((lyric, index) => 
      `<div class="lyric-line" data-index="${index}">${lyric.text}</div>`
    ).join('');
  } else {
    lyricsElement.innerHTML = '暂无歌词';
  }
}

function updateProgress() {
  const percent = (audio.currentTime / audio.duration) * 100;
  document.getElementById('progressBar').style.width = percent + '%';
  document.getElementById('currentTime').textContent = formatTime(audio.currentTime);
  updateLyrics(audio.currentTime);
}

function updateLyrics(currentTime) {
  if (!lyricsData.length) return;
  let newIndex = -1;
  for (let i = 0; i < lyricsData.length; i++) {
    if (currentTime >= lyricsData[i].time) newIndex = i;
    else break;
  }
  if (newIndex !== currentLyricIndex) {
    const prevActive = document.querySelector('.lyric-line.active');
    if (prevActive) prevActive.classList.remove('active');
    if (newIndex >= 0) {
      const lines = document.querySelectorAll('.lyric-line');
      if (lines[newIndex]) {
        lines[newIndex].classList.add('active');
        lines[newIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    currentLyricIndex = newIndex;
  }
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function togglePlay() { audio.paused ? audio.play() : audio.pause(); }
function seekTo(event) {
  const container = event.currentTarget;
  const rect = container.getBoundingClientRect();
  audio.currentTime = ((event.clientX - rect.left) / rect.width) * audio.duration;
}
function toggleMusic() {
  const panel = document.getElementById('musicPanel');
  if (panel.classList.contains('show')) {
    panel.classList.remove('show');
  } else {
    if (!audio) initMusicPlayer();
    panel.classList.add('show');
  }
}
function togglePanel() { document.getElementById('musicPanel').classList.remove('show'); }

// ========== 核心功能 ==========

async function loadClassmates() {
  try {
    const res = await fetch('/classmates');
    allClassmates = await res.json();
    const select = document.getElementById('nameSelect');
    select.innerHTML = '<option value="">选择你的名字</option>';
    allClassmates.forEach(c => {
      const option = document.createElement('option');
      option.value = c.name;
      option.textContent = c.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('加载同学失败:', error);
  }
}

async function login() {
  const name = document.getElementById('nameSelect').value;
  const password = document.getElementById('passwordInput').value;
  const errorDiv = document.getElementById('loginError');
  
  if (!name || !password) {
    errorDiv.textContent = '请选择姓名并输入密码';
    return;
  }
  
  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      showMainPage();
    } else {
      errorDiv.textContent = data.error;
    }
  } catch (error) {
    errorDiv.textContent = '网络错误';
  }
}

function showMainPage() {
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('mainPage').classList.add('active');
  document.getElementById('welcomeName').textContent = currentUser.name;
  
  if (currentUser.role === 'admin' || currentUser.role === 'teacher') {
    document.getElementById('adminTab').style.display = 'block';
  }
  
  loadMyContact();
  loadMyMessages();
  loadMyFeedback();
  renderClassmatesList();
}

function logout() {
  localStorage.removeItem('currentUser');
  currentUser = null;
  document.getElementById('mainPage').classList.remove('active');
  document.getElementById('loginPage').classList.add('active');
  document.getElementById('passwordInput').value = '';
  document.getElementById('adminTab').style.display = 'none';
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  
  const tabMap = {
    'classmates': 0, 'teachers': 1, 'photos': 2, 'myMessages': 3, 'myFeedback': 4, 'profile': 5, 'admin': 6
  };
  const tabs = document.querySelectorAll('.tab');
  if (tabMap[tabName] !== undefined && tabs[tabMap[tabName]]) {
    tabs[tabMap[tabName]].classList.add('active');
  }
  
  document.getElementById(tabName + 'Tab').classList.add('active');
  
  if (tabName === 'teachers') loadTeachers();
  if (tabName === 'photos') loadPhotos();
  if (tabName === 'myMessages') loadMyMessages();
  if (tabName === 'myFeedback') loadMyFeedback();
  if (tabName === 'classmates') renderClassmatesList();
  if (tabName === 'admin' && (currentUser.role === 'admin' || currentUser.role === 'teacher')) loadAdminData();
}

async function renderClassmatesList() {
  const list = document.getElementById('classmatesList');
  list.innerHTML = '';
  
  for (const c of allClassmates) {
    try {
      const contactRes = await fetch(`/contact/${encodeURIComponent(c.name)}`);
      const contact = await contactRes.json();
      
      const card = document.createElement('div');
      card.className = 'classmate-card';
      card.dataset.name = c.name;
      
      let contactHtml = '';
      if (contact.phone) contactHtml += `📱 ${contact.phone} `;
      if (contact.email) contactHtml += `📧 ${contact.email} `;
      if (contact.wechat) contactHtml += `💬 ${contact.wechat}`;
      
      card.innerHTML = `
        <div class="classmate-info">
          <h4>${c.name}</h4>
          ${contactHtml ? `<div class="contact">${contactHtml}</div>` : ''}
        </div>
        <button class="btn btn-small btn-primary" onclick="openMessageModal('${c.name}')">留言</button>
      `;
      list.appendChild(card);
    } catch (error) {}
  }
}

function filterClassmates() {
  const keyword = document.getElementById('searchInput').value.toLowerCase();
  document.querySelectorAll('.classmate-card').forEach(card => {
    const name = card.dataset.name?.toLowerCase() || '';
    card.style.display = name.includes(keyword) ? 'flex' : 'none';
  });
}

async function loadTeachers() {
  try {
    const res = await fetch('/teachers');
    const teachers = await res.json();
    allTeachers = teachers;
    
    const list = document.getElementById('teachersList');
    list.innerHTML = '';
    
    for (const t of teachers) {
      const contactRes = await fetch(`/contact/${encodeURIComponent(t.name)}`);
      const contact = await contactRes.json();
      
      let contactHtml = '';
      if (contact.phone) contactHtml += `📱 ${contact.phone} `;
      if (contact.email) contactHtml += `📧 ${contact.email} `;
      
      const card = document.createElement('div');
      card.className = 'classmate-card';
      card.innerHTML = `
        <div class="classmate-info">
          <h4>${t.name} ${t.role === 'admin' ? '👑' : '👨‍🏫'}</h4>
          ${contactHtml ? `<div class="contact">${contactHtml}</div>` : ''}
        </div>
        <div class="action-buttons">
          <button class="btn btn-small btn-primary" onclick="openFeedbackModal('${t.name}', 'teacher', 'evaluation')">评价</button>
          <button class="btn btn-small btn-outline" onclick="openFeedbackModal('${t.name}', 'teacher', 'thanks')">感谢</button>
        </div>
      `;
      list.appendChild(card);
    }
  } catch (error) {}
}

async function loadMyMessages() {
  try {
    const res = await fetch(`/messages/${encodeURIComponent(currentUser.name)}`);
    const messages = await res.json();
    const list = document.getElementById('messagesList');
    
    if (messages.length === 0) {
      list.innerHTML = '<div class="empty-state">还没有人给你留言呢 💭</div>';
      return;
    }
    
    list.innerHTML = messages.map(m => `
      <div class="message-card">
        <div class="message-from">${m.from_name}</div>
        <div class="message-content">${m.content}</div>
        <div class="message-time">${new Date(m.created_at).toLocaleString()}</div>
      </div>
    `).join('');
  } catch (error) {}
}

async function loadMyFeedback() {
  try {
    const res = await fetch(`/feedback/${encodeURIComponent(currentUser.name)}`);
    const feedbacks = await res.json();
    window.allFeedback = feedbacks;
    renderFeedback(feedbacks);
  } catch (error) {}
}

function renderFeedback(feedbacks) {
  const list = document.getElementById('feedbackList');
  const filtered = currentFeedbackFilter === 'all' 
    ? feedbacks 
    : feedbacks.filter(f => f.type === currentFeedbackFilter);
  
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">暂无评价或感谢</div>';
    return;
  }
  
  list.innerHTML = filtered.map(f => `
    <div class="feedback-card">
      <span class="feedback-badge ${f.type}">${f.type === 'evaluation' ? '📝 评价' : '🙏 感谢'}</span>
      <div class="feedback-from">${f.from_name} (${f.from_role === 'student' ? '同学' : '老师'})</div>
      <div class="feedback-content">${f.content}</div>
      <div class="feedback-time">${new Date(f.created_at).toLocaleString()}</div>
    </div>
  `).join('');
}

function filterFeedback(type) {
  currentFeedbackFilter = type;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  renderFeedback(window.allFeedback || []);
}

async function loadMyContact() {
  try {
    const res = await fetch(`/contact/${encodeURIComponent(currentUser.name)}`);
    const contact = await res.json();
    document.getElementById('phoneInput').value = contact.phone || '';
    document.getElementById('emailInput').value = contact.email || '';
    document.getElementById('wechatInput').value = contact.wechat || '';
  } catch (error) {}
}

async function updateContact() {
  const phone = document.getElementById('phoneInput').value;
  const email = document.getElementById('emailInput').value;
  const wechat = document.getElementById('wechatInput').value;
  
  try {
    await fetch('/update-contact', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: currentUser.name, phone, email, wechat })
    });
    document.getElementById('saveResult').textContent = '✅ 保存成功！';
    document.getElementById('saveResult').style.color = '#38a169';
    setTimeout(() => document.getElementById('saveResult').textContent = '', 2000);
  } catch (error) {}
}

async function changePassword() {
  const oldPassword = document.getElementById('oldPasswordInput').value;
  const newPassword = document.getElementById('newPasswordInput').value;
  const confirmPassword = document.getElementById('confirmPasswordInput').value;
  const resultDiv = document.getElementById('passwordResult');
  
  if (!oldPassword || !newPassword || !confirmPassword) {
    resultDiv.textContent = '请填写完整信息';
    return;
  }
  if (newPassword !== confirmPassword) {
    resultDiv.textContent = '两次输入的新密码不一致';
    return;
  }
  if (newPassword.length < 6) {
    resultDiv.textContent = '密码长度至少6位';
    return;
  }
  
  try {
    const res = await fetch('/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: currentUser.name, oldPassword, newPassword })
    });
    const data = await res.json();
    if (data.success) {
      resultDiv.textContent = '✅ 密码修改成功！';
      resultDiv.style.color = '#38a169';
      document.getElementById('oldPasswordInput').value = '';
      document.getElementById('newPasswordInput').value = '';
      document.getElementById('confirmPasswordInput').value = '';
    } else {
      resultDiv.textContent = data.error;
      resultDiv.style.color = '#e53e3e';
    }
  } catch (error) {}
}

function openMessageModal(toName) {
  selectedToName = toName;
  document.getElementById('messageToName').textContent = toName;
  document.getElementById('messageModal').classList.add('show');
}

function closeMessageModal() {
  document.getElementById('messageModal').classList.remove('show');
  document.getElementById('messageContent').value = '';
}

async function sendMessage() {
  const content = document.getElementById('messageContent').value.trim();
  if (!content) return;
  
  try {
    await fetch('/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_name: currentUser.name, to_name: selectedToName, content })
    });
    closeMessageModal();
    alert('留言发送成功！');
  } catch (error) {}
}

function openFeedbackModal(toName, toRole, type) {
  document.getElementById('feedbackToName').value = toName;
  document.getElementById('feedbackToRole').value = toRole;
  document.getElementById('feedbackType').value = type;
  document.getElementById('feedbackTitle').textContent = 
    type === 'evaluation' ? `评价 ${toName} 老师` : `感谢 ${toName} 老师`;
  document.getElementById('feedbackModal').classList.add('show');
}

function closeFeedbackModal() {
  document.getElementById('feedbackModal').classList.remove('show');
  document.getElementById('feedbackContent').value = '';
}

async function sendFeedback() {
  const toName = document.getElementById('feedbackToName').value;
  const toRole = document.getElementById('feedbackToRole').value;
  const type = document.getElementById('feedbackType').value;
  const content = document.getElementById('feedbackContent').value.trim();
  
  if (!content) return;
  
  try {
    await fetch('/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_name: currentUser.name,
        from_role: currentUser.role,
        to_name: toName,
        to_role: toRole,
        content,
        type
      })
    });
    closeFeedbackModal();
    alert('发送成功！');
  } catch (error) {}
}

function openUploadPhotoModal() {
  document.getElementById('uploadPhotoModal').classList.add('show');
}

function closeUploadPhotoModal() {
  document.getElementById('uploadPhotoModal').classList.remove('show');
  document.getElementById('photoTitle').value = '';
  document.getElementById('photoDescription').value = '';
  document.getElementById('photoUrl').value = '';
}

async function uploadPhoto() {
  const title = document.getElementById('photoTitle').value.trim();
  const description = document.getElementById('photoDescription').value.trim();
  const image_url = document.getElementById('photoUrl').value.trim();
  
  if (!title || !image_url) {
    alert('请填写标题和图片链接');
    return;
  }
  
  try {
    await fetch('/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploaded_by: currentUser.name, title, description, image_url })
    });
    closeUploadPhotoModal();
    loadPhotos();
  } catch (error) {}
}

async function loadPhotos() {
  try {
    const res = await fetch('/photos');
    const photos = await res.json();
    const list = document.getElementById('photosList');
    
    if (photos.length === 0) {
      list.innerHTML = '<div class="empty-state">暂无照片，快来上传第一张吧！</div>';
      return;
    }
    
    list.innerHTML = photos.map(p => `
      <div class="photo-card">
        <img src="${p.image_url}" alt="${p.title}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'120\'%3E%3Crect width=\'200\' height=\'120\' fill=\'%23ddd\'/%3E%3Ctext x=\'100\' y=\'60\' text-anchor=\'middle\' fill=\'%23999\'%3E图片加载失败%3C/text%3E%3C/svg%3E'">
        <div class="photo-info">
          <div class="photo-title">${p.title} ${currentUser.role === 'admin' || p.uploaded_by === currentUser.name ? `<span class="photo-delete" onclick="deletePhoto(${p.id})">🗑️</span>` : ''}</div>
          <div class="photo-uploader">by ${p.uploaded_by}</div>
        </div>
      </div>
    `).join('');
  } catch (error) {}
}

async function deletePhoto(id) {
  if (!confirm('确定删除这张照片吗？')) return;
  
  try {
    await fetch(`/photos/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester: currentUser.name })
    });
    loadPhotos();
  } catch (error) {}
}

async function loadAdminData() {
  try {
    const res = await fetch(`/admin/all-data?requester=${currentUser.name}`);
    const data = await res.json();
    
    document.getElementById('adminStats').innerHTML = `
      <div class="stat-card"><div class="stat-number">${data.users.length}</div><div class="stat-label">总用户</div></div>
      <div class="stat-card"><div class="stat-number">${data.messages.length}</div><div class="stat-label">留言</div></div>
      <div class="stat-card"><div class="stat-number">${data.feedbacks.length}</div><div class="stat-label">评价/感谢</div></div>
      <div class="stat-card"><div class="stat-number">${data.photos.length}</div><div class="stat-label">照片</div></div>
    `;
    
    const usersList = document.getElementById('adminUsersList');
    usersList.innerHTML = data.users.map(u => `
      <div class="classmate-card">
        <div class="classmate-info">
          <h4>${u.name} ${u.role === 'admin' ? '👑' : u.role === 'teacher' ? '👨‍🏫' : '🎓'}</h4>
          <div class="contact">📱 ${u.phone || '未填写'} | 📧 ${u.email || '未填写'}</div>
        </div>
      </div>
    `).join('');
  } catch (error) {}
}

// 初始化
const savedUser = localStorage.getItem('currentUser');
if (savedUser) {
  currentUser = JSON.parse(savedUser);
  showMainPage();
}
loadClassmates();}

// 更新歌词高亮
function updateLyrics(currentTime) {
  if (!lyricsData.length) return;
  
  // 找到当前时间对应的歌词
  let newIndex = -1;
  for (let i = 0; i < lyricsData.length; i++) {
    if (currentTime >= lyricsData[i].time) {
      newIndex = i;
    } else {
      break;
    }
  }
  
  if (newIndex !== currentLyricIndex) {
    // 移除之前的高亮
    const prevActive = document.querySelector('.lyric-line.active');
    if (prevActive) prevActive.classList.remove('active');
    
    // 添加新的高亮
    if (newIndex >= 0) {
      const lines = document.querySelectorAll('.lyric-line');
      if (lines[newIndex]) {
        lines[newIndex].classList.add('active');
        // 滚动到可视区域
        lines[newIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    
    currentLyricIndex = newIndex;
  }
}

// 格式化时间
function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 切换播放/暂停
function togglePlay() {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
}

// 进度条点击跳转
function seekTo(event) {
  const container = event.currentTarget;
  const rect = container.getBoundingClientRect();
  const percent = (event.clientX - rect.left) / rect.width;
  audio.currentTime = percent * audio.duration;
}

// 切换音乐播放器开关
function toggleMusic() {
  const panel = document.getElementById('musicPanel');
  if (panel.classList.contains('show')) {
    panel.classList.remove('show');
  } else {
    // 首次点击时初始化音频
    if (!audio) {
      initMusicPlayer();
    }
    panel.classList.add('show');
  }
}

// 切换面板（关闭按钮）
function togglePanel() {
  document.getElementById('musicPanel').classList.remove('show');
}

// ========== 原有功能 ==========

// 初始化：加载同学列表到下拉框
async function loadClassmates() {
  const res = await fetch(`${API_BASE}/classmates`);
  allClassmates = await res.json();
  
  const select = document.getElementById('nameSelect');
  select.innerHTML = '<option value="">选择你的名字</option>';
  allClassmates.forEach(c => {
    const option = document.createElement('option');
    option.value = c.name;
    option.textContent = c.name;
    select.appendChild(option);
  });
}

// 登录
async function login() {
  const name = document.getElementById('nameSelect').value;
  const password = document.getElementById('passwordInput').value;
  const errorDiv = document.getElementById('loginError');
  
  if (!name || !password) {
    errorDiv.textContent = '请选择姓名并输入密码';
    return;
  }
  
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password })
  });
  
  const data = await res.json();
  if (data.success) {
    currentUser = data.user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showMainPage();
  } else {
    errorDiv.textContent = data.error;
  }
}

// 显示主页
function showMainPage() {
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('mainPage').classList.add('active');
  document.getElementById('welcomeName').textContent = currentUser.name;
  
  loadMyContact();
  loadMyMessages();
  renderClassmatesList();
}

// 退出
function logout() {
  localStorage.removeItem('currentUser');
  currentUser = null;
  document.getElementById('mainPage').classList.remove('active');
  document.getElementById('loginPage').classList.add('active');
  document.getElementById('passwordInput').value = '';
}

// 切换标签页
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  
  event.target.classList.add('active');
  document.getElementById(tabName + 'Tab').classList.add('active');
  
  if (tabName === 'myMessages') loadMyMessages();
  if (tabName === 'classmates') renderClassmatesList();
}

// 渲染同学列表
async function renderClassmatesList() {
  const list = document.getElementById('classmatesList');
  list.innerHTML = '';
  
  for (const c of allClassmates) {
    const contactRes = await fetch(`${API_BASE}/contact/${encodeURIComponent(c.name)}`);
    const contact = await contactRes.json();
    
    const card = document.createElement('div');
    card.className = 'classmate-card';
    card.dataset.name = c.name;
    
    let contactHtml = '';
    if (contact.phone) contactHtml += `📱 ${contact.phone} `;
    if (contact.email) contactHtml += `📧 ${contact.email} `;
    if (contact.wechat) contactHtml += `💬 ${contact.wechat}`;
    
    card.innerHTML = `
      <div class="classmate-info">
        <h4>${c.name}</h4>
        ${contactHtml ? `<div class="contact">${contactHtml}</div>` : ''}
      </div>
      <button class="btn btn-small btn-primary" onclick="openMessageModal('${c.name}')">留言</button>
    `;
    list.appendChild(card);
  }
}

// 搜索过滤
function filterClassmates() {
  const keyword = document.getElementById('searchInput').value.toLowerCase();
  document.querySelectorAll('.classmate-card').forEach(card => {
    const name = card.dataset.name.toLowerCase();
    card.style.display = name.includes(keyword) ? 'flex' : 'none';
  });
}

// 加载给我的留言
async function loadMyMessages() {
  const res = await fetch(`${API_BASE}/messages/${encodeURIComponent(currentUser.name)}`);
  const messages = await res.json();
  
  const list = document.getElementById('messagesList');
  if (messages.length === 0) {
    list.innerHTML = '<div class="empty-state">还没有人给你留言呢 💭</div>';
    return;
  }
  
  list.innerHTML = messages.map(m => `
    <div class="message-card">
      <div class="message-from">${m.from_name}</div>
      <div class="message-content">${m.content}</div>
      <div class="message-time">${new Date(m.created_at).toLocaleString()}</div>
    </div>
  `).join('');
}

// 加载我的联系方式
async function loadMyContact() {
  const res = await fetch(`${API_BASE}/contact/${encodeURIComponent(currentUser.name)}`);
  const contact = await res.json();
  document.getElementById('phoneInput').value = contact.phone || '';
  document.getElementById('emailInput').value = contact.email || '';
  document.getElementById('wechatInput').value = contact.wechat || '';
}

// 更新联系方式
async function updateContact() {
  const phone = document.getElementById('phoneInput').value;
  const email = document.getElementById('emailInput').value;
  const wechat = document.getElementById('wechatInput').value;
  
  await fetch(`${API_BASE}/update-contact`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: currentUser.name, phone, email, wechat })
  });
  
  const result = document.getElementById('saveResult');
  result.textContent = '✅ 保存成功！';
  result.style.color = '#38a169';
  setTimeout(() => result.textContent = '', 2000);
}

// 修改密码
async function changePassword() {
  const oldPassword = document.getElementById('oldPasswordInput').value;
  const newPassword = document.getElementById('newPasswordInput').value;
  const confirmPassword = document.getElementById('confirmPasswordInput').value;
  const resultDiv = document.getElementById('passwordResult');
  
  if (!oldPassword || !newPassword || !confirmPassword) {
    resultDiv.textContent = '请填写完整信息';
    resultDiv.style.color = '#e53e3e';
    return;
  }
  
  if (newPassword !== confirmPassword) {
    resultDiv.textContent = '两次输入的新密码不一致';
    resultDiv.style.color = '#e53e3e';
    return;
  }
  
  if (newPassword.length < 6) {
    resultDiv.textContent = '密码长度至少6位';
    resultDiv.style.color = '#e53e3e';
    return;
  }
  
  const res = await fetch(`${API_BASE}/change-password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      name: currentUser.name, 
      oldPassword, 
      newPassword 
    })
  });
  
  const data = await res.json();
  if (data.success) {
    resultDiv.textContent = '✅ 密码修改成功！';
    resultDiv.style.color = '#38a169';
    document.getElementById('oldPasswordInput').value = '';
    document.getElementById('newPasswordInput').value = '';
    document.getElementById('confirmPasswordInput').value = '';
  } else {
    resultDiv.textContent = data.error;
    resultDiv.style.color = '#e53e3e';
  }
}

// 打开留言弹窗
function openMessageModal(toName) {
  selectedToName = toName;
  document.getElementById('messageToName').textContent = toName;
  document.getElementById('messageModal').classList.add('show');
}

// 关闭弹窗
function closeModal() {
  document.getElementById('messageModal').classList.remove('show');
  document.getElementById('messageContent').value = '';
}

// 发送留言
async function sendMessage() {
  const content = document.getElementById('messageContent').value.trim();
  if (!content) return;
  
  await fetch(`${API_BASE}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from_name: currentUser.name,
      to_name: selectedToName,
      content
    })
  });
  
  closeModal();
  alert('留言发送成功！');
}

// 检查是否已登录
const savedUser = localStorage.getItem('currentUser');
if (savedUser) {
  currentUser = JSON.parse(savedUser);
  showMainPage();
}

loadClassmates();
