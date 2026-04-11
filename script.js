// ========== 配置区 ==========
// 使用相对路径，API 和前端在同一个 Pages 项目下
const API_BASE = '';
// ============================

let currentUser = null;
let allClassmates = [];
let selectedToName = null;

// ========== 音乐播放器 ==========
let audio = null;
let lyricsData = [];
let lyricsElement = null;
let currentLyricIndex = -1;
let isMusicPlaying = false;

// 初始化音乐播放器
function initMusicPlayer() {
  audio = new Audio('/干杯.mp3');
  lyricsElement = document.getElementById('lyricsContent');
  
  // 加载歌词文件
  fetch('/干杯.lrc')
    .then(res => res.text())
    .then(parseLRC)
    .catch(() => {
      document.getElementById('lyricsContent').innerHTML = '暂无歌词';
    });
  
  // 监听时间更新
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', () => {
    document.getElementById('duration').textContent = formatTime(audio.duration);
  });
  audio.addEventListener('play', () => {
    document.getElementById('playBtn').textContent = '⏸️';
    document.getElementById('musicToggle').classList.add('playing');
    isMusicPlaying = true;
  });
  audio.addEventListener('pause', () => {
    document.getElementById('playBtn').textContent = '▶️';
    document.getElementById('musicToggle').classList.remove('playing');
    isMusicPlaying = false;
  });
  audio.addEventListener('ended', () => {
    document.getElementById('playBtn').textContent = '▶️';
    document.getElementById('musicToggle').classList.remove('playing');
    isMusicPlaying = false;
  });
}

// 解析 LRC 歌词
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
      
      if (text) {
        lyricsData.push({ time, text });
      }
    }
  });
  
  lyricsData.sort((a, b) => a.time - b.time);
  
  // 渲染歌词
  if (lyricsData.length > 0) {
    lyricsElement.innerHTML = lyricsData.map((lyric, index) => 
      `<div class="lyric-line" data-index="${index}">${lyric.text}</div>`
    ).join('');
  } else {
    lyricsElement.innerHTML = '暂无歌词';
  }
}

// 更新进度条和歌词
function updateProgress() {
  const percent = (audio.currentTime / audio.duration) * 100;
  document.getElementById('progressBar').style.width = percent + '%';
  document.getElementById('currentTime').textContent = formatTime(audio.currentTime);
  
  // 更新歌词高亮
  updateLyrics(audio.currentTime);
}

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
