// ========== 配置 ==========
const API_BASE = '';
let currentUser = null;
let allClassmates = [];
let allTeachers = [];

// 角色配置
const ROLE_CONFIG = {
  student: {
    tabs: [
      { id: 'photos', icon: '📷', label: '班级相册' },
      { id: 'classmates', icon: '🎓', label: '同学录' },
      { id: 'teachers', icon: '👨‍🏫', label: '老师' },
      { id: 'myMessages', icon: '💬', label: '我的留言' },
      { id: 'profile', icon: '👤', label: '我的' }
    ]
  },
  teacher: {
    tabs: [
      { id: 'photos', icon: '📷', label: '班级相册' },
      { id: 'evaluate', icon: '📝', label: '评价学生' },
      { id: 'myMessages', icon: '💬', label: '我的留言' },
      { id: 'thanks', icon: '🙏', label: '感谢' },
      { id: 'profile', icon: '👤', label: '我的' }
    ]
  },
  admin: {
    tabs: [
      { id: 'photos', icon: '📷', label: '班级相册' },
      { id: 'messages', icon: '💬', label: '所有留言' },
      { id: 'users', icon: '👥', label: '所有人物' },
      { id: 'feedbacks', icon: '📊', label: '评价/感谢' },
      { id: 'profile', icon: '👤', label: '我的' }
    ]
  }
};

// ========== 音乐播放器 ==========
let audio = null;
let lyricsData = [];
let currentLyricIndex = -1;

function initMusicPlayer() {
  audio = new Audio('/干杯.mp3');
  const lyricsElement = document.getElementById('lyricsContent');
  
  fetch('/干杯.lrc')
    .then(res => res.text())
    .then(text => parseLRC(text))
    .catch(() => { document.getElementById('lyricsContent').innerHTML = '暂无歌词'; });
  
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', () => {
    document.getElementById('duration').textContent = formatTime(audio.duration);
  });
  audio.addEventListener('play', () => {
    document.querySelector('#playBtn svg').innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    document.getElementById('musicToggle').classList.add('playing');
  });
  audio.addEventListener('pause', () => {
    document.querySelector('#playBtn svg').innerHTML = '<path d="M8 5v14l11-7z"/>';
    document.getElementById('musicToggle').classList.remove('playing');
  });
  audio.addEventListener('ended', () => {
    document.querySelector('#playBtn svg').innerHTML = '<path d="M8 5v14l11-7z"/>';
    document.getElementById('musicToggle').classList.remove('playing');
  });
}

function parseLRC(text) {
  const lines = text.split('\n');
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  lyricsData = [];
  
  lines.forEach(line => {
    const match = line.match(regex);
    if (match) {
      const time = parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3]) / 1000;
      const content = line.replace(regex, '').trim();
      if (content) lyricsData.push({ time, content });
    }
  });
  
  lyricsData.sort((a, b) => a.time - b.time);
  
  const container = document.getElementById('lyricsContent');
  if (lyricsData.length) {
    container.innerHTML = lyricsData.map((l, i) => 
      `<div class="lyric-line" data-index="${i}">${l.content}</div>`
    ).join('');
  } else {
    container.innerHTML = '暂无歌词';
  }
}

function updateProgress() {
  if (!audio) return;
  const percent = (audio.currentTime / audio.duration) * 100;
  document.getElementById('progressBar').style.width = percent + '%';
  document.getElementById('currentTime').textContent = formatTime(audio.currentTime);
  
  let newIndex = -1;
  for (let i = 0; i < lyricsData.length; i++) {
    if (audio.currentTime >= lyricsData[i].time) newIndex = i;
  }
  if (newIndex !== currentLyricIndex) {
    document.querySelectorAll('.lyric-line').forEach(l => l.classList.remove('active'));
    const active = document.querySelector(`.lyric-line[data-index="${newIndex}"]`);
    if (active) { active.classList.add('active'); active.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    currentLyricIndex = newIndex;
  }
}

function formatTime(s) {
  if (isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

function togglePlay() { 
  if (!audio) { initMusicPlayer(); }
  audio?.paused ? audio.play() : audio?.pause(); 
}

function seekTo(e) {
  if (!audio) return;
  const rect = e.currentTarget.getBoundingClientRect();
  audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
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

function togglePanel() { 
  document.getElementById('musicPanel').classList.remove('show'); 
}

// ========== 初始化 ==========
async function loadClassmatesList() {
  try {
    const res = await fetch('/classmates-list');
    const data = await res.json();
    window.allNames = data.map(d => d.name);
  } catch (e) { console.error('加载名单失败', e); }
}

async function loadClassmates() {
  try {
    const res = await fetch('/classmates');
    allClassmates = await res.json();
  } catch (e) { console.error('加载同学失败', e); }
}

async function loadTeachers() {
  try {
    const res = await fetch('/teachers');
    allTeachers = await res.json();
  } catch (e) { console.error('加载老师失败', e); }
}

function showNameList() {
  const modal = document.getElementById('nameListModal');
  const options = document.getElementById('nameListOptions');
  
  if (window.allNames && window.allNames.length > 0) {
    options.innerHTML = window.allNames.map(n => 
      `<div class="name-option" onclick="selectName('${n}')">${n}</div>`
    ).join('');
  } else {
    options.innerHTML = '<div class="empty-state">暂无数据，请刷新</div>';
  }
  
  modal.style.display = 'flex';
}

function hideNameList() {
  document.getElementById('nameListModal').style.display = 'none';
}

function selectName(name) {
  document.getElementById('nameInput').value = name;
  hideNameList();
}

async function login() {
  const name = document.getElementById('nameInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const err = document.getElementById('loginError');
  
  if (!name || !password) { err.textContent = '请输入姓名和密码'; return; }
  
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
      err.textContent = data.error;
    }
  } catch (e) { err.textContent = '网络错误'; }
}

function showMainPage() {
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('mainPage').classList.add('active');
  
  const config = ROLE_CONFIG[currentUser.role] || ROLE_CONFIG.student;
  document.getElementById('userBadge').textContent = 
    currentUser.role === 'admin' ? '👑 管理员' : (currentUser.role === 'teacher' ? '👨‍🏫 老师' : '🎓 同学');
  
  renderTabBar(config.tabs);
  switchTab(config.tabs[0].id);
  loadClassmates();
  loadTeachers();
}

function renderTabBar(tabs) {
  const bar = document.getElementById('tabBar');
  bar.innerHTML = tabs.map(t => `
    <button class="tab-item" data-tab="${t.id}">
      <span class="tab-icon">${t.icon}</span>
      <span>${t.label}</span>
    </button>
  `).join('');
  
  bar.querySelectorAll('.tab-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabId = btn.dataset.tab;
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
  
  const titles = {
    photos: '班级相册', teachers: '老师', classmates: '同学录',
    evaluate: '评价学生', thanks: '给我的感谢', messages: '所有留言',
    users: '所有人物', profile: '我的资料', myMessages: '我的留言',
    feedbacks: '评价与感谢'
  };
  document.getElementById('pageTitle').textContent = titles[tabId] || tabId;
  
  const content = document.getElementById('contentArea');
  content.innerHTML = '<div class="empty-state">加载中...</div>';
  
  setTimeout(() => {
    if (tabId === 'photos') renderPhotos();
    else if (tabId === 'teachers') renderTeachers();
    else if (tabId === 'classmates') renderClassmates();
    else if (tabId === 'myMessages') renderMyMessages();
    else if (tabId === 'evaluate') renderEvaluate();
    else if (tabId === 'thanks') renderThanks();
    else if (tabId === 'messages') renderAllMessages();
    else if (tabId === 'users') renderAllUsers();
    else if (tabId === 'feedbacks') renderAllFeedbacks();
    else if (tabId === 'profile') renderProfile();
  }, 10);
}

// ========== 我的留言（学生和老师通用） ==========
async function renderMyMessages() {
  const content = document.getElementById('contentArea');
  
  try {
    const res = await fetch(`/messages/${encodeURIComponent(currentUser.name)}`);
    const messages = await res.json();
    
    if (!messages || messages.length === 0) {
      content.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div>还没有人给你留言</div>';
      return;
    }
    
    let html = '<h4 style="margin-bottom:16px;">💭 别人对我说的话</h4>';
    messages.forEach(m => {
      html += `
        <div class="memory-card">
          <div class="memory-header">
            <span class="memory-from">${m.from_name}</span>
            <span class="memory-time">${new Date(m.created_at).toLocaleString()}</span>
          </div>
          <div class="memory-content">${m.content}</div>
        </div>
      `;
    });
    
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = '<div class="empty-state">加载失败，请重试</div>';
  }
}

// ========== 班级相册 ==========
async function renderPhotos() {
  const content = document.getElementById('contentArea');
  
  try {
    const res = await fetch('/photos');
    const photos = await res.json();
    
    let html = `
      <div class="upload-btn" onclick="openUploadModal()">
        <span>📷</span> 上传照片
      </div>
      <div class="photo-grid">
    `;
    
    if (!photos || photos.length === 0) {
      html += `
        <div class="photo-item">
          <img src="https://picsum.photos/400/400?random=1" alt="示例照片" loading="lazy" onclick="viewPhoto('https://picsum.photos/800/800?random=1', '示例照片', '系统')">
          <div class="photo-overlay">
            <div class="photo-title">示例照片</div>
            <div class="photo-uploader">系统</div>
          </div>
        </div>
      `;
    } else {
      photos.forEach(p => {
        const canDelete = currentUser.role === 'admin' || p.uploaded_by === currentUser.name;
        html += `
          <div class="photo-item">
            <img src="${p.image_url}" alt="${p.title}" loading="lazy" onclick="viewPhoto('${p.image_url}', '${p.title}', '${p.uploaded_by}')" onerror="this.src='https://picsum.photos/400/400?random='+Math.random()">
            ${canDelete ? `<button class="photo-delete-btn" onclick="event.stopPropagation();deletePhoto(${p.id})">🗑️</button>` : ''}
            <div class="photo-overlay">
              <div class="photo-title">${p.title}</div>
              <div class="photo-uploader">${p.uploaded_by}</div>
            </div>
          </div>
        `;
      });
    }
    html += '</div>';
    
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = '<div class="empty-state">加载失败，请重试</div>';
  }
}

function openUploadModal() {
  document.getElementById('modalTitle').textContent = '上传照片';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">标题</label>
      <input type="text" id="photoTitle" class="input" placeholder="给照片起个名字">
    </div>
    <div class="form-group">
      <label class="form-label">图片链接</label>
      <input type="text" id="photoUrl" class="input" placeholder="粘贴图片URL">
      <p style="font-size:13px;color:var(--gray-4);margin-top:6px;">推荐使用 <a href="https://imgbb.com/" target="_blank">ImgBB</a> 上传</p>
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="doUploadPhoto()">上传</button>
  `;
  document.getElementById('modal').classList.add('show');
}

async function doUploadPhoto() {
  const title = document.getElementById('photoTitle').value.trim();
  const url = document.getElementById('photoUrl').value.trim();
  if (!title || !url) { alert('请填写完整'); return; }
  
  try {
    await fetch('/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploaded_by: currentUser.name, title, description: '', image_url: url })
    });
    closeModal();
    renderPhotos();
  } catch (e) { alert('上传失败'); }
}

function viewPhoto(url, title, uploader) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = `
    <img src="${url}" style="width:100%;border-radius:12px;" onerror="this.src='https://picsum.photos/400/400'">
    <p style="margin-top:12px;color:var(--gray-4);font-size:14px;">上传者：${uploader}</p>
  `;
  document.getElementById('modalFooter').innerHTML = `<button class="btn btn-primary" onclick="closeModal()">关闭</button>`;
  document.getElementById('modal').classList.add('show');
}

async function deletePhoto(id) {
  if (!confirm('确定删除这张照片吗？')) return;
  
  try {
    await fetch(`/photos/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester: currentUser.name })
    });
    renderPhotos();
  } catch (e) { alert('删除失败'); }
}

// ========== 老师列表 ==========
async function renderTeachers() {
  const content = document.getElementById('contentArea');
  
  try {
    const res = await fetch('/teachers');
    const teachers = await res.json();
    
    if (!teachers || teachers.length === 0) {
      content.innerHTML = '<div class="empty-state"><div class="empty-icon">👨‍🏫</div>暂无老师信息</div>';
      return;
    }
    
    let html = `
      <div class="global-search-box">
        <input type="text" id="teacherSearch" class="input" placeholder="搜索老师..." onkeyup="filterTeacherList()">
      </div>
      <div id="teachersListContainer"></div>
    `;
    
    content.innerHTML = html;
    
    // 渲染老师卡片
    const container = document.getElementById('teachersListContainer');
    for (const t of teachers) {
      const contactRes = await fetch(`/contact/${encodeURIComponent(t.name)}`);
      const contact = await contactRes.json();
      
      const card = document.createElement('div');
      card.className = 'person-card teacher-card-item';
      card.dataset.name = t.name;
      
      const subjectMap = {
        '语文': '📖', '数学': '📐', '英语': '🌍', '物理': '⚡', '化学': '🧪',
        '政治': '🏛️', '历史': '📜', '音乐': '🎵', '体育': '⚽', '美术': '🎨'
      };
      
      card.innerHTML = `
        <div class="person-name">
          ${t.name}
          <span class="teacher-subject-tag">${subjectMap[t.subject] || '👨‍🏫'} ${t.subject || ''}</span>
        </div>
        <div class="person-contact">
          ${contact.phone ? `<div class="contact-line"><span class="emoji">📱</span> ${contact.phone}</div>` : ''}
          ${contact.wechat ? `<div class="contact-line"><span class="emoji">💬</span> ${contact.wechat}</div>` : ''}
          ${contact.email ? `<div class="contact-line"><span class="emoji">📧</span> ${contact.email}</div>` : ''}
        </div>
        <div class="person-actions">
          <button class="btn btn-secondary btn-small" onclick="openFeedbackModal('${t.name}', 'teacher', 'evaluation')">评价</button>
          <button class="btn btn-primary btn-small" onclick="openFeedbackModal('${t.name}', 'teacher', 'thanks')">感谢</button>
        </div>
      `;
      container.appendChild(card);
    }
  } catch (e) {
    content.innerHTML = '<div class="empty-state">加载失败，请重试</div>';
  }
}

function filterTeacherList() {
  const keyword = document.getElementById('teacherSearch')?.value.toLowerCase() || '';
  document.querySelectorAll('.teacher-card-item').forEach(card => {
    const name = card.dataset.name?.toLowerCase() || '';
    card.style.display = name.includes(keyword) ? 'grid' : 'none';
  });
}

// ========== 同学录 ==========
async function renderClassmates() {
  const content = document.getElementById('contentArea');
  
  let html = `
    <div class="global-search-box">
      <input type="text" id="classmateSearch" class="input" placeholder="搜索同学..." onkeyup="filterClassmateList()">
    </div>
    <div id="classmatesListContainer"></div>
  `;
  
  content.innerHTML = html;
  renderClassmatesListInContainer();
}

async function renderClassmatesListInContainer() {
  const container = document.getElementById('classmatesListContainer');
  if (!container) return;
  
  // 按拼音排序
  const otherClassmates = allClassmates
    .filter(c => c.name !== currentUser.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  
  if (otherClassmates.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无其他同学</div>';
    return;
  }
  
  container.innerHTML = '';
  
  for (const c of otherClassmates) {
    try {
      const contactRes = await fetch(`/contact/${encodeURIComponent(c.name)}`);
      const contact = await contactRes.json();
      
      const card = document.createElement('div');
      card.className = 'person-card classmate-card-item';
      card.dataset.name = c.name;
      
      card.innerHTML = `
        <div class="person-name">${c.name}</div>
        <div class="person-contact">
          ${contact.phone ? `<div class="contact-line"><span class="emoji">📱</span> ${contact.phone}</div>` : ''}
          ${contact.wechat ? `<div class="contact-line"><span class="emoji">💬</span> ${contact.wechat}</div>` : ''}
          ${contact.email ? `<div class="contact-line"><span class="emoji">📧</span> ${contact.email}</div>` : ''}
        </div>
        <div class="person-actions">
          <button class="btn btn-primary btn-small" onclick="openMessageModal('${c.name}')">留言</button>
        </div>
      `;
      container.appendChild(card);
    } catch (e) {
      const card = document.createElement('div');
      card.className = 'person-card classmate-card-item';
      card.dataset.name = c.name;
      card.innerHTML = `
        <div class="person-name">${c.name}</div>
        <div class="person-contact"></div>
        <div class="person-actions">
          <button class="btn btn-primary btn-small" onclick="openMessageModal('${c.name}')">留言</button>
        </div>
      `;
      container.appendChild(card);
    }
  }
}

function filterClassmateList() {
  const keyword = document.getElementById('classmateSearch')?.value.toLowerCase() || '';
  document.querySelectorAll('.classmate-card-item').forEach(card => {
    const name = card.dataset.name?.toLowerCase() || '';
    card.style.display = name.includes(keyword) ? 'grid' : 'none';
  });
}

function filterClassmateList() {
  const keyword = document.getElementById('classmateSearch')?.value.toLowerCase() || '';
  document.querySelectorAll('.classmate-card').forEach(card => {
    const name = card.dataset.name?.toLowerCase() || '';
    card.style.display = name.includes(keyword) ? 'flex' : 'none';
  });
}

function openMessageModal(toName) {
  document.getElementById('modalTitle').textContent = `给 ${toName} 留言`;
  document.getElementById('modalBody').innerHTML = `
    <textarea id="messageContent" class="input" rows="4" placeholder="写下你想说的话..."></textarea>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="sendMessage('${toName}')">发送</button>
  `;
  document.getElementById('modal').classList.add('show');
}

async function sendMessage(toName) {
  const content = document.getElementById('messageContent').value.trim();
  if (!content) { alert('请输入内容'); return; }
  
  try {
    await fetch('/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_name: currentUser.name, to_name: toName, content })
    });
    closeModal();
    alert('留言发送成功！');
  } catch (e) { alert('发送失败'); }
}

// ========== 评价学生（老师专用） ==========
function renderEvaluate() {
  const content = document.getElementById('contentArea');
  
  const students = allClassmates.filter(c => c.name !== currentUser.name);
  if (students.length === 0) {
    content.innerHTML = '<div class="empty-state">暂无学生</div>';
    return;
  }
  
  content.innerHTML = `
    <div class="card">
      <div class="form-group">
        <label class="form-label">选择学生</label>
        <select id="studentSelect" class="input">
          ${students.map(s => `<option value="${s.name}">${s.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">评价内容</label>
        <textarea id="evaluateContent" class="input" rows="4" placeholder="写下对学生的评价..."></textarea>
      </div>
      <button class="btn btn-primary" onclick="doEvaluate()">发表评价</button>
    </div>
  `;
}

async function doEvaluate() {
  const student = document.getElementById('studentSelect').value;
  const content = document.getElementById('evaluateContent').value.trim();
  if (!content) { alert('请输入评价内容'); return; }
  
  try {
    await fetch('/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_name: currentUser.name, from_role: 'teacher',
        to_name: student, to_role: 'student',
        content, type: 'evaluation'
      })
    });
    alert('评价成功');
    switchTab('evaluate');
  } catch (e) { alert('评价失败'); }
}

// ========== 给我的感谢（老师专用） ==========
async function renderThanks() {
  const content = document.getElementById('contentArea');
  
  try {
    const res = await fetch(`/feedback/${encodeURIComponent(currentUser.name)}?type=thanks`);
    const thanks = await res.json();
    
    if (!thanks || thanks.length === 0) {
      content.innerHTML = '<div class="empty-state"><div class="empty-icon">🙏</div>还没有收到感谢</div>';
      return;
    }
    
    content.innerHTML = thanks.map(t => `
      <div class="memory-card">
        <div class="memory-header">
          <span class="memory-from">${t.from_name}</span>
          <span class="memory-time">${new Date(t.created_at).toLocaleString()}</span>
        </div>
        <div class="memory-content">${t.content}</div>
      </div>
    `).join('');
  } catch (e) {
    content.innerHTML = '<div class="empty-state">加载失败，请重试</div>';
  }
}

// ========== 所有留言（管理员专用） ==========
async function renderAllMessages() {
  const content = document.getElementById('contentArea');
  
  try {
    const res = await fetch(`/admin/all-data?requester=${currentUser.name}`);
    const data = await res.json();
    
    let html = `
      <div style="margin-bottom:16px;">
        <button class="btn btn-primary" onclick="openMessageAsModal()">✉️ 以他人名义发留言</button>
      </div>
    `;
    
    if (!data.messages || data.messages.length === 0) {
      html += '<div class="empty-state">暂无留言</div>';
    } else {
      data.messages.forEach(m => {
        html += `
          <div class="memory-card message-card-admin">
            <button class="message-delete" onclick="deleteMessage(${m.id})">🗑️</button>
            <div class="memory-header">
              <span class="memory-from">${m.from_name} → ${m.to_name}</span>
              <span class="memory-time">${new Date(m.created_at).toLocaleString()}</span>
            </div>
            <div class="memory-content">${m.content}</div>
          </div>
        `;
      });
    }
    
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = '<div class="empty-state">加载失败，请重试</div>';
  }
}

function openMessageAsModal() {
  const allNames = [...new Set([...allClassmates.map(c => c.name), ...allTeachers.map(t => t.name)])];
  
  document.getElementById('modalTitle').textContent = '以他人名义发留言';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">发送者</label>
      <select id="msgFrom" class="input">
        ${allNames.map(n => `<option value="${n}">${n}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">接收者</label>
      <select id="msgTo" class="input">
        ${allNames.map(n => `<option value="${n}">${n}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">内容</label>
      <textarea id="msgContent" class="input" rows="4"></textarea>
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="doMessageAs()">发送</button>
  `;
  document.getElementById('modal').classList.add('show');
}

async function doMessageAs() {
  const from = document.getElementById('msgFrom').value;
  const to = document.getElementById('msgTo').value;
  const content = document.getElementById('msgContent').value.trim();
  
  if (!content) { alert('请输入内容'); return; }
  
  try {
    await fetch('/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_name: from, to_name: to, content, requester: currentUser.name })
    });
    closeModal();
    renderAllMessages();
  } catch (e) { alert('发送失败'); }
}

async function deleteMessage(id) {
  if (!confirm('确定删除这条留言吗？')) return;
  
  try {
    await fetch('/admin/delete-message', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester: currentUser.name, messageId: id })
    });
    renderAllMessages();
  } catch (e) { alert('删除失败'); }
}

// ========== 所有人物（管理员专用） ==========
async function renderAllUsers() {
  const content = document.getElementById('contentArea');
  
  try {
    const res = await fetch(`/admin/all-data?requester=${currentUser.name}`);
    const data = await res.json();
    
    let html = `
      <div style="margin-bottom:16px;">
        <button class="btn btn-primary" onclick="openAddUserModal()">➕ 添加用户</button>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${data.users.length}</div><div class="stat-label">总用户</div></div>
        <div class="stat-card"><div class="stat-value">${data.messages.length}</div><div class="stat-label">留言</div></div>
        <div class="stat-card"><div class="stat-value">${data.feedbacks.length}</div><div class="stat-label">评价/感谢</div></div>
        <div class="stat-card"><div class="stat-value">${data.photos.length}</div><div class="stat-label">照片</div></div>
      </div>
    `;
    
    data.users.forEach(u => {
      const avatar = u.avatar || '😊';
      const isEmoji = avatar.length <= 2 || !avatar.startsWith('http');
      
      html += `
        <div class="card">
          <div class="card-header">
            <div class="card-avatar">
              ${isEmoji ? avatar : `<img src="${avatar}" class="avatar-img" alt="${u.name}">`}
            </div>
            <div class="card-info">
              <div class="card-name">
                ${u.name}
                <span class="role-tag ${u.role}">${u.role === 'admin' ? '管理员' : (u.role === 'teacher' ? '老师' : '同学')}</span>
              </div>
            </div>
            <div class="admin-actions">
              <button class="btn-icon edit" onclick="openEditUserModal('${u.name}', '${u.role}', '${u.phone || ''}', '${u.email || ''}', '${u.wechat || ''}')">编辑</button>
              ${u.name !== currentUser.name ? `<button class="btn-icon delete" onclick="deleteUser('${u.name}')">删除</button>` : ''}
            </div>
          </div>
          <div class="card-detail">
            ${u.phone ? `<div class="card-detail-item"><span>📱</span> ${u.phone}</div>` : ''}
            ${u.email ? `<div class="card-detail-item"><span>📧</span> ${u.email}</div>` : ''}
            ${u.wechat ? `<div class="card-detail-item"><span>💬</span> ${u.wechat}</div>` : ''}
          </div>
        </div>
      `;
    });
    
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = '<div class="empty-state">加载失败，请重试</div>';
  }
}

// ========== 所有评价/感谢（管理员专用） ==========
async function renderAllFeedbacks() {
  const content = document.getElementById('contentArea');
  
  try {
    const res = await fetch(`/admin/all-data?requester=${currentUser.name}`);
    const data = await res.json();
    
    if (!data.feedbacks || data.feedbacks.length === 0) {
      content.innerHTML = '<div class="empty-state">暂无评价或感谢</div>';
      return;
    }
    
    let html = '<h4 style="margin-bottom:16px;">📊 所有评价与感谢</h4>';
    data.feedbacks.forEach(f => {
      html += `
        <div class="memory-card">
          <div class="memory-header">
            <span class="memory-from">${f.from_name} (${f.from_role === 'student' ? '同学' : '老师'}) → ${f.to_name} (${f.to_role === 'student' ? '同学' : '老师'})</span>
            <span class="memory-time">${new Date(f.created_at).toLocaleString()}</span>
          </div>
          <div style="margin-bottom:6px;"><span class="role-tag ${f.type}">${f.type === 'evaluation' ? '📝 评价' : '🙏 感谢'}</span></div>
          <div class="memory-content">${f.content}</div>
        </div>
      `;
    });
    
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = '<div class="empty-state">加载失败，请重试</div>';
  }
}

function openAddUserModal() {
  document.getElementById('modalTitle').textContent = '添加用户';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">姓名</label>
      <input type="text" id="newUserName" class="input">
    </div>
    <div class="form-group">
      <label class="form-label">角色</label>
      <select id="newUserRole" class="input">
        <option value="student">同学</option>
        <option value="teacher">老师</option>
        <option value="admin">管理员</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">手机号（可选）</label>
      <input type="tel" id="newUserPhone" class="input">
    </div>
    <div class="form-group">
      <label class="form-label">邮箱（可选）</label>
      <input type="email" id="newUserEmail" class="input">
    </div>
    <div class="form-group">
      <label class="form-label">微信（可选）</label>
      <input type="text" id="newUserWechat" class="input">
    </div>
    <p style="font-size:13px;color:var(--gray-4);">默认密码：111111</p>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="doAddUser()">添加</button>
  `;
  document.getElementById('modal').classList.add('show');
}

async function doAddUser() {
  const name = document.getElementById('newUserName').value.trim();
  const role = document.getElementById('newUserRole').value;
  const phone = document.getElementById('newUserPhone').value.trim();
  const email = document.getElementById('newUserEmail').value.trim();
  const wechat = document.getElementById('newUserWechat').value.trim();
  
  if (!name) { alert('请输入姓名'); return; }
  
  try {
    const res = await fetch('/admin/add-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester: currentUser.name, name, role, phone, email, wechat })
    });
    const data = await res.json();
    if (data.success) {
      closeModal();
      renderAllUsers();
      loadClassmatesList();
      loadClassmates();
    } else {
      alert(data.error);
    }
  } catch (e) { alert('添加失败'); }
}

function openEditUserModal(name, role, phone, email, wechat) {
  document.getElementById('modalTitle').textContent = `编辑 ${name}`;
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">角色</label>
      <select id="editUserRole" class="input">
        <option value="student" ${role === 'student' ? 'selected' : ''}>同学</option>
        <option value="teacher" ${role === 'teacher' ? 'selected' : ''}>老师</option>
        <option value="admin" ${role === 'admin' ? 'selected' : ''}>管理员</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">手机号</label>
      <input type="tel" id="editUserPhone" class="input" value="${phone}">
    </div>
    <div class="form-group">
      <label class="form-label">邮箱</label>
      <input type="email" id="editUserEmail" class="input" value="${email}">
    </div>
    <div class="form-group">
      <label class="form-label">微信</label>
      <input type="text" id="editUserWechat" class="input" value="${wechat}">
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="doEditUser('${name}')">保存</button>
  `;
  document.getElementById('modal').classList.add('show');
}

async function doEditUser(name) {
  const role = document.getElementById('editUserRole').value;
  const phone = document.getElementById('editUserPhone').value.trim();
  const email = document.getElementById('editUserEmail').value.trim();
  const wechat = document.getElementById('editUserWechat').value.trim();
  
  try {
    const res = await fetch('/admin/update-user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester: currentUser.name, targetName: name, role, phone, email, wechat })
    });
    const data = await res.json();
    if (data.success) {
      closeModal();
      renderAllUsers();
      loadClassmatesList();
      loadClassmates();
    } else {
      alert(data.error);
    }
  } catch (e) { alert('保存失败'); }
}

async function deleteUser(name) {
  if (!confirm(`确定删除 ${name} 吗？相关留言、评价、照片也会被删除！`)) return;
  
  try {
    const res = await fetch('/admin/delete-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester: currentUser.name, targetName: name })
    });
    const data = await res.json();
    if (data.success) {
      renderAllUsers();
      loadClassmatesList();
      loadClassmates();
    } else {
      alert(data.error);
    }
  } catch (e) { alert('删除失败'); }
}

// ========== 个人资料 ==========
function renderProfile() {
  const content = document.getElementById('contentArea');
  const avatar = currentUser.avatar || '😊';
  const isEmoji = avatar.length <= 2 || !avatar.startsWith('http');
  
  content.innerHTML = `
    <div class="card" style="text-align:center;">
      <div class="avatar-large" onclick="openAvatarModal()">
        ${isEmoji ? avatar : `<img src="${avatar}" class="avatar-img" alt="${currentUser.name}">`}
      </div>
      <div class="card-name" style="font-size:20px;margin-bottom:4px;justify-content:center;">${currentUser.name}</div>
      <div style="color:var(--gray-4);font-size:14px;margin-bottom:12px;">
        ${currentUser.role === 'admin' ? '👑 管理员' : (currentUser.role === 'teacher' ? '👨‍🏫 老师' : '🎓 同学')}
      </div>
      <button class="btn btn-outline btn-small" onclick="openAvatarModal()">更换头像</button>
    </div>
    
    <div class="card">
      <h4 style="margin-bottom:16px;">📝 联系方式</h4>
      <div class="form-group">
        <label class="form-label">手机号</label>
        <input type="tel" id="profilePhone" class="input">
      </div>
      <div class="form-group">
        <label class="form-label">邮箱</label>
        <input type="email" id="profileEmail" class="input">
      </div>
      <div class="form-group">
        <label class="form-label">微信</label>
        <input type="text" id="profileWechat" class="input">
      </div>
      <button class="btn btn-primary" onclick="updateProfile()">保存</button>
      <div id="profileResult" class="result"></div>
    </div>
    
    <div class="card">
      <h4 style="margin-bottom:16px;">🔐 修改密码</h4>
      <div class="form-group">
        <label class="form-label">原密码</label>
        <input type="password" id="oldPassword" class="input">
      </div>
      <div class="form-group">
        <label class="form-label">新密码</label>
        <input type="password" id="newPassword" class="input">
      </div>
      <div class="form-group">
        <label class="form-label">确认密码</label>
        <input type="password" id="confirmPassword" class="input">
      </div>
      <button class="btn btn-primary" onclick="changePassword()">修改密码</button>
      <div id="passwordResult" class="result"></div>
    </div>
  `;
  
  loadProfileContact();
}

async function loadProfileContact() {
  try {
    const res = await fetch(`/contact/${encodeURIComponent(currentUser.name)}`);
    const contact = await res.json();
    document.getElementById('profilePhone').value = contact.phone || '';
    document.getElementById('profileEmail').value = contact.email || '';
    document.getElementById('profileWechat').value = contact.wechat || '';
  } catch (e) {}
}

async function updateProfile() {
  const phone = document.getElementById('profilePhone').value;
  const email = document.getElementById('profileEmail').value;
  const wechat = document.getElementById('profileWechat').value;
  
  try {
    await fetch('/update-contact', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: currentUser.name, phone, email, wechat })
    });
    document.getElementById('profileResult').textContent = '✅ 保存成功';
  } catch (e) {}
}

async function changePassword() {
  const old = document.getElementById('oldPassword').value;
  const newPwd = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmPassword').value;
  const result = document.getElementById('passwordResult');
  
  if (!old || !newPwd || !confirm) { result.textContent = '请填写完整'; return; }
  if (newPwd !== confirm) { result.textContent = '两次密码不一致'; return; }
  if (newPwd.length < 6) { result.textContent = '密码至少6位'; return; }
  
  try {
    const res = await fetch('/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: currentUser.name, oldPassword: old, newPassword: newPwd })
    });
    const data = await res.json();
    if (data.success) {
      result.textContent = '✅ 密码修改成功';
      result.style.color = 'var(--success)';
      document.getElementById('oldPassword').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmPassword').value = '';
    } else {
      result.textContent = data.error;
    }
  } catch (e) {}
}

function openAvatarModal() {
  document.getElementById('modalTitle').textContent = '修改头像';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-group">
      <label class="form-label">选择表情头像</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
        ${['😊', '😎', '🥳', '🤓', '😇', '🦊', '🐼', '🐨', '🐸', '⭐', '🌟', '🔥', '🎓', '📚', '🎵'].map(e => 
          `<span style="font-size:36px;cursor:pointer;padding:8px;" onclick="selectAvatar('${e}')">${e}</span>`
        ).join('')}
      </div>
      <p style="margin-top:20px;font-size:13px;color:var(--gray-4);">或输入图片URL</p>
      <input type="text" id="avatarUrl" class="input" placeholder="粘贴图片链接">
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="saveAvatar()">保存</button>
  `;
  document.getElementById('modal').classList.add('show');
  window.selectedAvatar = null;
}

function selectAvatar(emoji) {
  window.selectedAvatar = emoji;
  document.getElementById('avatarUrl').value = '';
}

async function saveAvatar() {
  const url = document.getElementById('avatarUrl').value.trim();
  const avatar = url || window.selectedAvatar || '😊';
  
  try {
    await fetch('/update-avatar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: currentUser.name, avatar })
    });
    currentUser.avatar = avatar;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    closeModal();
    renderProfile();
  } catch (e) { alert('保存失败'); }
}

// ========== 通用弹窗 ==========
function openFeedbackModal(toName, toRole, type) {
  document.getElementById('modalTitle').textContent = type === 'evaluation' ? `评价 ${toName}` : `感谢 ${toName}`;
  document.getElementById('modalBody').innerHTML = `
    <textarea id="feedbackContent" class="input" rows="4" placeholder="写下你想说的话..."></textarea>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="doFeedback('${toName}', '${toRole}', '${type}')">发送</button>
  `;
  document.getElementById('modal').classList.add('show');
}

async function doFeedback(toName, toRole, type) {
  const content = document.getElementById('feedbackContent').value.trim();
  if (!content) { alert('请输入内容'); return; }
  
  try {
    await fetch('/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_name: currentUser.name, from_role: currentUser.role,
        to_name: toName, to_role: toRole, content, type
      })
    });
    closeModal();
    alert('发送成功');
  } catch (e) { alert('发送失败'); }
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

function logout() {
  localStorage.removeItem('currentUser');
  currentUser = null;
  document.getElementById('mainPage').classList.remove('active');
  document.getElementById('loginPage').classList.add('active');
  document.getElementById('passwordInput').value = '';
  document.getElementById('nameInput').value = '';
}

// ========== 启动 ==========
const savedUser = localStorage.getItem('currentUser');
if (savedUser) {
  currentUser = JSON.parse(savedUser);
  showMainPage();
}
loadClassmatesList();
