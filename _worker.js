// ========== 配置 ==========
const API_BASE = '';
let currentUser = null;
let allClassmates = [];
let allTeachers = [];

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const ROLE_CONFIG = {
  student: {
    tabs: [
      { id: 'photos', icon: '📷', label: '相册' },
      { id: 'classmates', icon: '🎓', label: '同学录' },
      { id: 'teachers', icon: '👨‍🏫', label: '老师' },
      { id: 'signature', icon: '✍️', label: '签名墙' },
      { id: 'myMessages', icon: '💬', label: '留言' },
      { id: 'songs', icon: '🎵', label: '歌单' },
      { id: 'profile', icon: '👤', label: '我的' }
    ]
  },
  teacher: {
    tabs: [
      { id: 'photos', icon: '📷', label: '相册' },
      { id: 'evaluate', icon: '📝', label: '评价学生' },
      { id: 'myMessages', icon: '💬', label: '留言' },
      { id: 'thanks', icon: '🙏', label: '感谢' },
      { id: 'signature', icon: '✍️', label: '签名墙' },
      { id: 'songs', icon: '🎵', label: '歌单' },
      { id: 'profile', icon: '👤', label: '我的' }
    ]
  },
  admin: {
    tabs: [
      { id: 'photos', icon: '📷', label: '相册' },
      { id: 'messages', icon: '💬', label: '所有留言' },
      { id: 'users', icon: '👥', label: '所有人物' },
      { id: 'feedbacks', icon: '📊', label: '评价/感谢' },
      { id: 'signature', icon: '✍️', label: '签名墙' },
      { id: 'songs', icon: '🎵', label: '歌单' },
      { id: 'console', icon: '💻', label: '控制台' },
      { id: 'profile', icon: '👤', label: '我的' }
    ]
  }
};

// ========== 音乐播放器 ==========
let audio = null;
let lyricsData = [];
let currentLyricIndex = -1;
let currentSongName = '';

function initMusicPlayer() {
  audio = new Audio('/干杯.mp3');
  currentSongName = '干杯';
  const lyricsElement = document.getElementById('lyricsContent');
  
  fetch('/干杯.lrc')
    .then(res => { if (!res.ok) throw new Error('No lyrics'); return res.text(); })
    .then(text => parseLRC(text))
    .catch(() => { document.getElementById('lyricsContent').innerHTML = '<div style="color:var(--gray-4);padding:20px;">暂无歌词</div>'; });
  
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', () => { document.getElementById('duration').textContent = formatTime(audio.duration); });
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
    container.innerHTML = lyricsData.map((l, i) => `<div class="lyric-line" data-index="${i}">${escapeHtml(l.content)}</div>`).join('');
  } else {
    container.innerHTML = '<div style="color:var(--gray-4);padding:20px;">暂无歌词</div>';
  }
}

function updateProgress() {
  if (!audio) return;
  const percent = (audio.currentTime / audio.duration) * 100 || 0;
  document.getElementById('progressBar').style.width = percent + '%';
  document.getElementById('currentTime').textContent = formatTime(audio.currentTime);
  let newIndex = -1;
  for (let i = 0; i < lyricsData.length; i++) { if (audio.currentTime >= lyricsData[i].time) newIndex = i; }
  if (newIndex !== currentLyricIndex) {
    document.querySelectorAll('.lyric-line').forEach(l => l.classList.remove('active'));
    const active = document.querySelector(`.lyric-line[data-index="${newIndex}"]`);
    if (active) { active.classList.add('active'); active.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    currentLyricIndex = newIndex;
  }
}

function formatTime(s) { if (isNaN(s)) return '0:00'; return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`; }
function togglePlay() { if (!audio) { initMusicPlayer(); } audio?.paused ? audio.play() : audio?.pause(); }
function seekTo(e) { if (!audio) return; const rect = e.currentTarget.getBoundingClientRect(); audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration; }
function toggleMusic() { const panel = document.getElementById('musicPanel'); if (panel.classList.contains('show')) { panel.classList.remove('show'); } else { if (!audio) initMusicPlayer(); panel.classList.add('show'); } }
function togglePanel() { document.getElementById('musicPanel').classList.remove('show'); }

// ========== 初始化 ==========
async function loadClassmatesList() {
  try { const res = await fetch('/classmates-list'); const data = await res.json(); window.allNames = data.map(d => d.name); } catch (e) {}
}
async function loadClassmates() { try { const res = await fetch('/classmates'); allClassmates = await res.json(); } catch (e) {} }
async function loadTeachers() { try { const res = await fetch('/teachers'); allTeachers = await res.json(); } catch (e) {} }

function showNameList() {
  const modal = document.getElementById('nameListModal');
  const options = document.getElementById('nameListOptions');
  if (window.allNames && window.allNames.length > 0) {
    options.innerHTML = window.allNames.map(n => `<div class="name-option" onclick="selectName('${escapeHtml(n)}')">${escapeHtml(n)}</div>`).join('');
  } else { options.innerHTML = '<div class="empty-state">暂无数据，请刷新</div>'; }
  modal.style.display = 'flex';
}
function hideNameList() { document.getElementById('nameListModal').style.display = 'none'; }
function selectName(name) { document.getElementById('nameInput').value = name; hideNameList(); }

async function login() {
  const name = document.getElementById('nameInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const err = document.getElementById('loginError');
  if (!name || !password) { err.textContent = '请输入姓名和密码'; return; }
  if (name.length > 50) { err.textContent = '姓名过长'; return; }
  try {
    const res = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, password }) });
    const data = await res.json();
    if (data.success) { currentUser = data.user; localStorage.setItem('currentUser', JSON.stringify(currentUser)); showMainPage(); }
    else { err.textContent = data.error; }
  } catch (e) { err.textContent = '网络错误'; }
}

document.addEventListener('DOMContentLoaded', () => {
  const pw = document.getElementById('passwordInput'), nm = document.getElementById('nameInput');
  if (pw) pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
  if (nm) nm.addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
});

function showMainPage() {
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('mainPage').classList.add('active');
  const config = ROLE_CONFIG[currentUser.role] || ROLE_CONFIG.student;
  document.getElementById('userBadge').textContent = currentUser.role === 'admin' ? '👑 管理员' : (currentUser.role === 'teacher' ? '👨‍🏫 老师' : '🎓 同学');
  renderTabBar(config.tabs);
  switchTab(config.tabs[0].id);
  loadClassmates(); loadTeachers();
}

function renderTabBar(tabs) {
  const bar = document.getElementById('tabBar');
  bar.innerHTML = tabs.map(t => `<button class="tab-item" data-tab="${t.id}"><span class="tab-icon">${t.icon}</span><span>${t.label}</span></button>`).join('');
  bar.querySelectorAll('.tab-item').forEach(btn => { btn.addEventListener('click', () => { switchTab(btn.dataset.tab); }); });
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
  const titles = { photos: '班级相册', teachers: '老师', classmates: '同学录', evaluate: '评价学生', thanks: '给我的感谢', messages: '所有留言', users: '所有人物', profile: '我的资料', myMessages: '我的留言', feedbacks: '评价与感谢', signature: '签名墙', songs: '歌单', console: '控制台' };
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
    else if (tabId === 'signature') renderSignature();
    else if (tabId === 'songs') renderSongs();
    else if (tabId === 'console') renderConsole();
    else if (tabId === 'profile') renderProfile();
  }, 10);
}

// ========== 我的留言 ==========
async function renderMyMessages() {
  const content = document.getElementById('contentArea');
  try {
    const res = await fetch(`/messages/${encodeURIComponent(currentUser.name)}`);
    const messages = await res.json();
    if (!messages || messages.length === 0) { content.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div>还没有人给你留言</div>'; return; }
    let html = '<h4 style="margin-bottom:16px;">💭 别人对我说的话</h4>';
    messages.forEach(m => { html += `<div class="memory-card"><div class="memory-header"><span class="memory-from">${escapeHtml(m.from_name)}</span><span class="memory-time">${new Date(m.created_at).toLocaleString()}</span></div><div class="memory-content">${escapeHtml(m.content)}</div></div>`; });
    content.innerHTML = html;
  } catch (e) { content.innerHTML = '<div class="empty-state">加载失败</div>'; }
}

// ========== 班级相册 ==========
async function renderPhotos() {
  const content = document.getElementById('contentArea');
  try {
    const res = await fetch('/photos'); const photos = await res.json();
    let html = '<div class="upload-btn" onclick="openUploadModal()"><span>📷</span> 上传照片</div><div class="photo-grid">';
    if (!photos || photos.length === 0) {
      html += '<div class="photo-item"><img src="https://picsum.photos/400/400?random=1" loading="lazy" onclick="viewPhoto(\'https://picsum.photos/800/800?random=1\', \'示例照片\', \'系统\')"><div class="photo-overlay"><div class="photo-title">示例照片</div><div class="photo-uploader">系统</div></div></div>';
    } else {
      photos.forEach(p => {
        const canDelete = currentUser.role === 'admin' || p.uploaded_by === currentUser.name;
        html += `<div class="photo-item"><img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" loading="lazy" onclick="viewPhoto('${escapeHtml(p.image_url)}', '${escapeHtml(p.title)}', '${escapeHtml(p.uploaded_by)}')" onerror="this.src='https://picsum.photos/400/400?random='+Math.random()">${canDelete ? '<button class="photo-delete-btn" onclick="event.stopPropagation();deletePhoto('+p.id+')">🗑️</button>' : ''}<div class="photo-overlay"><div class="photo-title">${escapeHtml(p.title)}</div><div class="photo-uploader">${escapeHtml(p.uploaded_by)}</div></div></div>`;
      });
    }
    html += '</div>'; content.innerHTML = html;
  } catch (e) { content.innerHTML = '<div class="empty-state">加载失败</div>'; }
}

function openUploadModal() {
  document.getElementById('modalTitle').textContent = '上传照片';
  document.getElementById('modalBody').innerHTML = '<div class="form-group"><label class="form-label">标题</label><input type="text" id="photoTitle" class="input" placeholder="给照片起个名字" maxlength="100"></div><div class="form-group"><label class="form-label">图片链接</label><input type="text" id="photoUrl" class="input" placeholder="粘贴图片URL" maxlength="500"><p style="font-size:13px;color:var(--gray-4);margin-top:6px;">推荐使用 <a href="https://imgbb.com/" target="_blank">ImgBB</a> 上传</p></div>';
  document.getElementById('modalFooter').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="doUploadPhoto()">上传</button>';
  document.getElementById('modal').classList.add('show');
}
async function doUploadPhoto() {
  const title = document.getElementById('photoTitle').value.trim(), url = document.getElementById('photoUrl').value.trim();
  if (!title || !url) { alert('请填写完整'); return; }
  try { await fetch('/photos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uploaded_by: currentUser.name, title, description: '', image_url: url }) }); closeModal(); renderPhotos(); } catch (e) { alert('上传失败'); }
}
function viewPhoto(url, title, uploader) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = `<img src="${escapeHtml(url)}" style="width:100%;border-radius:12px;" onerror="this.src='https://picsum.photos/400/400'"><p style="margin-top:12px;color:var(--gray-4);font-size:14px;">上传者：${escapeHtml(uploader)}</p>`;
  document.getElementById('modalFooter').innerHTML = '<button class="btn btn-primary" onclick="closeModal()">关闭</button>';
  document.getElementById('modal').classList.add('show');
}
async function deletePhoto(id) { if (!confirm('确定删除？')) return; try { await fetch(`/photos/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requester: currentUser.name }) }); renderPhotos(); } catch (e) { alert('删除失败'); } }

// ========== 老师列表 ==========
async function renderTeachers() {
  const content = document.getElementById('contentArea');
  try {
    const res = await fetch('/teachers'); const teachers = await res.json();
    if (!teachers || teachers.length === 0) { content.innerHTML = '<div class="empty-state"><div class="empty-icon">👨‍🏫</div>暂无老师信息</div>'; return; }
    let html = '<div class="global-search-box"><input type="text" id="teacherSearch" class="input" placeholder="搜索老师..." maxlength="50" onkeyup="filterTeacherList()"></div><div id="teachersListContainer"></div>';
    content.innerHTML = html;
    const container = document.getElementById('teachersListContainer');
    const subjectMap = { '语文': '📖', '数学': '📐', '英语': '🌍', '物理': '⚡', '化学': '🧪', '政治': '🏛️', '历史': '📜', '音乐': '🎵', '体育': '⚽', '美术': '🎨' };
    for (const t of teachers) {
      const contactRes = await fetch(`/contact/${encodeURIComponent(t.name)}`); const contact = await contactRes.json();
      const card = document.createElement('div'); card.className = 'person-card teacher-card-item'; card.dataset.name = t.name;
      card.innerHTML = `<div class="person-name">${escapeHtml(t.name)}<span class="teacher-subject-tag">${subjectMap[t.subject]||'👨‍🏫'} ${escapeHtml(t.subject||'')}</span></div><div class="person-contact">${contact.phone?`<div class="contact-line"><span class="emoji">📱</span> ${escapeHtml(contact.phone)}</div>`:''}${contact.wechat?`<div class="contact-line"><span class="emoji">💬</span> ${escapeHtml(contact.wechat)}</div>`:''}${contact.email?`<div class="contact-line"><span class="emoji">📧</span> ${escapeHtml(contact.email)}</div>`:''}</div><div class="person-actions"><button class="btn btn-secondary btn-small" onclick="openFeedbackModal('${escapeHtml(t.name)}','teacher','evaluation')">评价</button><button class="btn btn-primary btn-small" onclick="openFeedbackModal('${escapeHtml(t.name)}','teacher','thanks')">感谢</button></div>`;
      container.appendChild(card);
    }
  } catch (e) { content.innerHTML = '<div class="empty-state">加载失败</div>'; }
}
function filterTeacherList() {
  const keyword = document.getElementById('teacherSearch')?.value.toLowerCase() || '';
  document.querySelectorAll('.teacher-card-item').forEach(card => { card.style.display = (card.dataset.name||'').toLowerCase().includes(keyword) ? 'grid' : 'none'; });
}

// ========== 同学录 ==========
async function renderClassmates() {
  const content = document.getElementById('contentArea');
  content.innerHTML = '<div class="global-search-box"><input type="text" id="classmateSearch" class="input" placeholder="搜索同学..." maxlength="50" onkeyup="filterClassmateList()"></div><div id="classmatesListContainer"></div>';
  renderClassmatesListInContainer();
}
async function renderClassmatesListInContainer() {
  const container = document.getElementById('classmatesListContainer'); if (!container) return;
  const otherClassmates = allClassmates.filter(c => c.name !== currentUser.name).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  if (otherClassmates.length === 0) { container.innerHTML = '<div class="empty-state">暂无其他同学</div>'; return; }
  container.innerHTML = '';
  for (const c of otherClassmates) {
    try {
      const contactRes = await fetch(`/contact/${encodeURIComponent(c.name)}`); const contact = await contactRes.json();
      const card = document.createElement('div'); card.className = 'person-card classmate-card-item'; card.dataset.name = c.name;
      card.innerHTML = `<div class="person-name">${escapeHtml(c.name)}</div><div class="person-contact">${contact.phone?`<div class="contact-line"><span class="emoji">📱</span> ${escapeHtml(contact.phone)}</div>`:''}${contact.wechat?`<div class="contact-line"><span class="emoji">💬</span> ${escapeHtml(contact.wechat)}</div>`:''}${contact.email?`<div class="contact-line"><span class="emoji">📧</span> ${escapeHtml(contact.email)}</div>`:''}</div><div class="person-actions"><button class="btn btn-primary btn-small" onclick="openMessageModal('${escapeHtml(c.name)}')">留言</button></div>`;
      container.appendChild(card);
    } catch (e) {
      const card = document.createElement('div'); card.className = 'person-card classmate-card-item'; card.dataset.name = c.name;
      card.innerHTML = `<div class="person-name">${escapeHtml(c.name)}</div><div class="person-contact"></div><div class="person-actions"><button class="btn btn-primary btn-small" onclick="openMessageModal('${escapeHtml(c.name)}')">留言</button></div>`;
      container.appendChild(card);
    }
  }
}
function filterClassmateList() {
  const keyword = document.getElementById('classmateSearch')?.value.toLowerCase() || '';
  document.querySelectorAll('.classmate-card-item').forEach(card => {
    const name = card.querySelector('.person-name')?.textContent.toLowerCase() || '';
    const contact = card.querySelector('.person-contact')?.textContent.toLowerCase() || '';
    card.style.display = (name + contact).includes(keyword) ? 'grid' : 'none';
  });
}

function openMessageModal(toName) {
  document.getElementById('modalTitle').textContent = `给 ${toName} 留言`;
  document.getElementById('modalBody').innerHTML = '<textarea id="messageContent" class="input" rows="4" placeholder="写下你想说的话..." maxlength="500"></textarea>';
  document.getElementById('modalFooter').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="sendMessage(\''+escapeHtml(toName)+'\')">发送</button>';
  document.getElementById('modal').classList.add('show');
}
async function sendMessage(toName) {
  const content = document.getElementById('messageContent').value.trim();
  if (!content) { alert('请输入内容'); return; }
  try { await fetch('/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_name: currentUser.name, to_name: toName, content }) }); closeModal(); alert('发送成功！'); } catch (e) { alert('发送失败'); }
}

// ========== 评价学生 ==========
function renderEvaluate() {
  const content = document.getElementById('contentArea');
  const students = allClassmates.filter(c => c.name !== currentUser.name);
  if (students.length === 0) { content.innerHTML = '<div class="empty-state">暂无学生</div>'; return; }
  content.innerHTML = `<div class="card"><div class="form-group"><label class="form-label">选择学生</label><select id="studentSelect" class="input">${students.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">评价内容</label><textarea id="evaluateContent" class="input" rows="4" placeholder="写下对学生的评价..." maxlength="500"></textarea></div><button class="btn btn-primary" onclick="doEvaluate()">发表评价</button></div>`;
}
async function doEvaluate() {
  const student = document.getElementById('studentSelect').value, content = document.getElementById('evaluateContent').value.trim();
  if (!content) { alert('请输入内容'); return; }
  try { await fetch('/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_name: currentUser.name, from_role: 'teacher', to_name: student, to_role: 'student', content, type: 'evaluation' }) }); alert('评价成功'); switchTab('evaluate'); } catch (e) { alert('评价失败'); }
}

// ========== 感谢 ==========
async function renderThanks() {
  const content = document.getElementById('contentArea');
  try {
    const res = await fetch(`/feedback/${encodeURIComponent(currentUser.name)}?type=thanks`); const thanks = await res.json();
    if (!thanks || thanks.length === 0) { content.innerHTML = '<div class="empty-state"><div class="empty-icon">🙏</div>还没有收到感谢</div>'; return; }
    content.innerHTML = thanks.map(t => `<div class="memory-card"><div class="memory-header"><span class="memory-from">${escapeHtml(t.from_name)}</span><span class="memory-time">${new Date(t.created_at).toLocaleString()}</span></div><div class="memory-content">${escapeHtml(t.content)}</div></div>`).join('');
  } catch (e) { content.innerHTML = '<div class="empty-state">加载失败</div>'; }
}

// ========== 所有留言（管理员） ==========
async function renderAllMessages() {
  const content = document.getElementById('contentArea');
  try {
    const res = await fetch(`/admin/all-data?requester=${encodeURIComponent(currentUser.name)}`); const data = await res.json();
    let html = '<div style="margin-bottom:16px;"><button class="btn btn-primary" onclick="openMessageAsModal()">✉️ 以他人名义发留言</button></div>';
    if (!data.messages || data.messages.length === 0) { html += '<div class="empty-state">暂无留言</div>'; }
    else { data.messages.forEach(m => { html += `<div class="memory-card message-card-admin"><button class="message-delete" onclick="deleteMessage(${m.id})">🗑️</button><div class="memory-header"><span class="memory-from">${escapeHtml(m.from_name)} → ${escapeHtml(m.to_name)}</span><span class="memory-time">${new Date(m.created_at).toLocaleString()}</span></div><div class="memory-content">${escapeHtml(m.content)}</div></div>`; }); }
    content.innerHTML = html;
  } catch (e) { content.innerHTML = '<div class="empty-state">加载失败</div>'; }
}
function openMessageAsModal() {
  const allNames = [...new Set([...allClassmates.map(c => c.name), ...allTeachers.map(t => t.name)])];
  document.getElementById('modalTitle').textContent = '以他人名义发留言';
  document.getElementById('modalBody').innerHTML = `<div class="form-group"><label class="form-label">发送者</label><select id="msgFrom" class="input">${allNames.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">接收者</label><select id="msgTo" class="input">${allNames.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">内容</label><textarea id="msgContent" class="input" rows="4" maxlength="500"></textarea></div>`;
  document.getElementById('modalFooter').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="doMessageAs()">发送</button>';
  document.getElementById('modal').classList.add('show');
}
async function doMessageAs() {
  const from = document.getElementById('msgFrom').value, to = document.getElementById('msgTo').value, content = document.getElementById('msgContent').value.trim();
  if (!content) { alert('请输入内容'); return; }
  try { await fetch('/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_name: from, to_name: to, content, requester: currentUser.name }) }); closeModal(); renderAllMessages(); } catch (e) { alert('发送失败'); }
}
async function deleteMessage(id) { if (!confirm('确定删除？')) return; try { await fetch('/admin/delete-message', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requester: currentUser.name, messageId: id }) }); renderAllMessages(); } catch (e) { alert('删除失败'); } }

// ========== 所有人物（管理员） ==========
async function renderAllUsers() {
  const content = document.getElementById('contentArea');
  try {
    const res = await fetch(`/admin/all-data?requester=${encodeURIComponent(currentUser.name)}`); const data = await res.json();
    let html = `<div style="margin-bottom:16px;"><button class="btn btn-primary" onclick="openAddUserModal()">➕ 添加用户</button></div><div class="stats-grid"><div class="stat-card"><div class="stat-value">${data.users.length}</div><div class="stat-label">总用户</div></div><div class="stat-card"><div class="stat-value">${data.messages.length}</div><div class="stat-label">留言</div></div><div class="stat-card"><div class="stat-value">${data.feedbacks.length}</div><div class="stat-label">评价/感谢</div></div><div class="stat-card"><div class="stat-value">${data.photos.length}</div><div class="stat-label">照片</div></div></div>`;
    data.users.forEach(u => {
      const avatar = u.avatar || '😊', isEmoji = avatar.length <= 2 || !avatar.startsWith('http');
      html += `<div class="card"><div class="card-header"><div class="card-avatar">${isEmoji ? avatar : `<img src="${escapeHtml(avatar)}" class="avatar-img" alt="${escapeHtml(u.name)}">`}</div><div class="card-info"><div class="card-name">${escapeHtml(u.name)}<span class="role-tag ${u.role}">${u.role==='admin'?'管理员':(u.role==='teacher'?'老师':'同学')}</span></div></div><div class="admin-actions"><button class="btn-icon edit" onclick="openEditUserModal('${escapeHtml(u.name)}','${u.role}','${escapeHtml(u.phone||'')}','${escapeHtml(u.email||'')}','${escapeHtml(u.wechat||'')}')">编辑</button>${u.name!==currentUser.name?`<button class="btn-icon delete" onclick="deleteUser('${escapeHtml(u.name)}')">删除</button>`:''}</div></div><div class="card-detail">${u.phone?`<div class="card-detail-item"><span>📱</span> ${escapeHtml(u.phone)}</div>`:''}${u.email?`<div class="card-detail-item"><span>📧</span> ${escapeHtml(u.email)}</div>`:''}${u.wechat?`<div class="card-detail-item"><span>💬</span> ${escapeHtml(u.wechat)}</div>`:''}</div></div>`;
    });
    content.innerHTML = html;
  } catch (e) { content.innerHTML = '<div class="empty-state">加载失败</div>'; }
}
function openAddUserModal() {
  document.getElementById('modalTitle').textContent = '添加用户';
  document.getElementById('modalBody').innerHTML = '<div class="form-group"><label class="form-label">姓名</label><input type="text" id="newUserName" class="input" maxlength="50"></div><div class="form-group"><label class="form-label">角色</label><select id="newUserRole" class="input"><option value="student">同学</option><option value="teacher">老师</option><option value="admin">管理员</option></select></div><div class="form-group"><label class="form-label">手机号</label><input type="tel" id="newUserPhone" class="input" maxlength="20"></div><div class="form-group"><label class="form-label">邮箱</label><input type="email" id="newUserEmail" class="input" maxlength="100"></div><div class="form-group"><label class="form-label">微信</label><input type="text" id="newUserWechat" class="input" maxlength="50"></div><p style="font-size:13px;color:var(--gray-4);">默认密码：111111</p>';
  document.getElementById('modalFooter').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="doAddUser()">添加</button>';
  document.getElementById('modal').classList.add('show');
}
async function doAddUser() {
  const name = document.getElementById('newUserName').value.trim(), role = document.getElementById('newUserRole').value;
  const phone = document.getElementById('newUserPhone').value.trim(), email = document.getElementById('newUserEmail').value.trim(), wechat = document.getElementById('newUserWechat').value.trim();
  if (!name) { alert('请输入姓名'); return; }
  try { const res = await fetch('/admin/add-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requester: currentUser.name, name, role, phone, email, wechat }) }); const data = await res.json(); if (data.success) { closeModal(); renderAllUsers(); loadClassmatesList(); loadClassmates(); } else { alert(data.error); } } catch (e) { alert('添加失败'); }
}
function openEditUserModal(name, role, phone, email, wechat) {
  document.getElementById('modalTitle').textContent = `编辑 ${name}`;
  document.getElementById('modalBody').innerHTML = `<div class="form-group"><label class="form-label">角色</label><select id="editUserRole" class="input"><option value="student" ${role==='student'?'selected':''}>同学</option><option value="teacher" ${role==='teacher'?'selected':''}>老师</option><option value="admin" ${role==='admin'?'selected':''}>管理员</option></select></div><div class="form-group"><label class="form-label">手机号</label><input type="tel" id="editUserPhone" class="input" value="${phone}" maxlength="20"></div><div class="form-group"><label class="form-label">邮箱</label><input type="email" id="editUserEmail" class="input" value="${email}" maxlength="100"></div><div class="form-group"><label class="form-label">微信</label><input type="text" id="editUserWechat" class="input" value="${wechat}" maxlength="50"></div>`;
  document.getElementById('modalFooter').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="doEditUser(\''+escapeHtml(name)+'\')">保存</button>';
  document.getElementById('modal').classList.add('show');
}
async function doEditUser(name) {
  const role = document.getElementById('editUserRole').value, phone = document.getElementById('editUserPhone').value.trim(), email = document.getElementById('editUserEmail').value.trim(), wechat = document.getElementById('editUserWechat').value.trim();
  try { const res = await fetch('/admin/update-user', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requester: currentUser.name, targetName: name, role, phone, email, wechat }) }); const data = await res.json(); if (data.success) { closeModal(); renderAllUsers(); loadClassmatesList(); loadClassmates(); } else { alert(data.error); } } catch (e) { alert('保存失败'); }
}
async function deleteUser(name) { if (!confirm(`确定删除 ${name} 吗？`)) return; try { await fetch('/admin/delete-user', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requester: currentUser.name, targetName: name }) }); renderAllUsers(); loadClassmatesList(); loadClassmates(); } catch (e) { alert('删除失败'); } }

// ========== 评价/感谢总览（管理员） ==========
async function renderAllFeedbacks() {
  const content = document.getElementById('contentArea');
  try {
    const res = await fetch(`/admin/all-data?requester=${encodeURIComponent(currentUser.name)}`); const data = await res.json();
    if (!data.feedbacks || data.feedbacks.length === 0) { content.innerHTML = '<div class="empty-state">暂无评价或感谢</div>'; return; }
    let html = '<h4 style="margin-bottom:16px;">📊 所有评价与感谢</h4>';
    data.feedbacks.forEach(f => { html += `<div class="memory-card"><div class="memory-header"><span class="memory-from">${escapeHtml(f.from_name)} → ${escapeHtml(f.to_name)}</span><span class="memory-time">${new Date(f.created_at).toLocaleString()}</span></div><span class="role-tag ${f.type}">${f.type==='evaluation'?'📝 评价':'🙏 感谢'}</span><div class="memory-content">${escapeHtml(f.content)}</div></div>`; });
    content.innerHTML = html;
  } catch (e) { content.innerHTML = '<div class="empty-state">加载失败</div>'; }
}

// ========== 控制台 ==========
function renderConsole() {
  const content = document.getElementById('contentArea');
  content.innerHTML = `<div class="card"><h4 style="margin-bottom:16px;">💻 SQL 查询控制台</h4><div class="form-group"><label class="form-label">SQL 语句（仅支持 SELECT）</label><textarea id="sqlInput" class="input" rows="4" placeholder="SELECT * FROM classmates LIMIT 5;"></textarea></div><button class="btn btn-primary" onclick="executeSQL()">执行查询</button><div id="sqlResult" style="margin-top:16px;"></div></div><div class="card"><h4 style="margin-bottom:16px;">📋 常用命令</h4><div class="cmd-list">${['SELECT * FROM classmates','SELECT * FROM messages ORDER BY created_at DESC LIMIT 20','SELECT * FROM feedbacks ORDER BY created_at DESC LIMIT 20','SELECT * FROM photos','SELECT * FROM songs','SELECT COUNT(*) as count, role FROM classmates GROUP BY role'].map(c => `<div class="cmd-item" onclick="document.getElementById('sqlInput').value='${c}'"><span>📋</span> ${c}</div>`).join('')}</div></div>`;
}
async function executeSQL() {
  const sql = document.getElementById('sqlInput').value.trim(), resultDiv = document.getElementById('sqlResult');
  if (!sql) { resultDiv.innerHTML = '<div class="error">请输入 SQL</div>'; return; }
  if (!sql.toUpperCase().startsWith('SELECT')) { resultDiv.innerHTML = '<div class="error">仅允许 SELECT</div>'; return; }
  try {
    const res = await fetch(`/admin/query?requester=${encodeURIComponent(currentUser.name)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql }) });
    const data = await res.json();
    if (data.error) { resultDiv.innerHTML = `<div class="error">${escapeHtml(data.error)}</div>`; return; }
    if (!data.results || data.results.length === 0) { resultDiv.innerHTML = '<div class="empty-state">无结果</div>'; return; }
    const cols = Object.keys(data.results[0]);
    let html = '<div style="overflow-x:auto;"><table class="result-table"><thead><tr>'+cols.map(c => `<th>${escapeHtml(c)}</th>`).join('')+'</tr></thead><tbody>';
    data.results.forEach(r => { html += '<tr>'+cols.map(c => `<td>${escapeHtml(String(r[c]??''))}</td>`).join('')+'</tr>'; });
    html += `</tbody></table></div><p style="margin-top:8px;color:var(--gray-4);">共 ${data.results.length} 条</p>`;
    resultDiv.innerHTML = html;
  } catch (e) { resultDiv.innerHTML = '<div class="error">查询失败</div>'; }
}

// ========== 签名墙（画板涂鸦） ==========
let sigCanvas, sigCtx, isDrawing = false, drawColor = '#000000', drawSize = 4, lastX = 0, lastY = 0;

async function renderSignature() {
  const content = document.getElementById('contentArea');
  content.innerHTML = `
    <div class="signature-toolbar">
      <label>颜色：</label><input type="color" id="drawColor" value="#000000" onchange="drawColor=this.value" style="width:36px;height:36px;border:none;border-radius:8px;cursor:pointer;">
      <label style="margin-left:8px;">粗细：</label><select id="drawSize" onchange="drawSize=parseInt(this.value)" style="padding:8px;border-radius:8px;border:1px solid var(--gray-2);"><option value="2">细</option><option value="4" selected>中</option><option value="8">粗</option><option value="14">特粗</option></select>
      <button class="btn btn-small btn-outline" onclick="undoSignature()" style="margin-left:auto;">↩️ 撤销</button>
      <button class="btn btn-small btn-primary" onclick="openSignatureFullscreen()">🔲 全屏</button>
      ${currentUser.role === 'admin' ? '<button class="btn btn-small btn-outline" onclick="clearSignature()" style="color:var(--danger);border-color:var(--danger);">🧹 清除</button>' : ''}
    </div>
    <div class="signature-container"><canvas id="signCanvas"></canvas></div>
    <div style="display:flex;gap:8px;margin-top:12px;"><button class="btn btn-primary" onclick="saveSignature()">💾 保存签名</button></div>
    <p style="font-size:12px;color:var(--gray-4);margin-top:8px;text-align:center;">在画板上按住鼠标或手指绘制，点击全屏可防止滑动误触</p>
    <div class="signature-fullscreen" id="sigFullscreen">
      <div class="fullscreen-toolbar">
        <label>颜色：</label><input type="color" id="fsDrawColor" value="#000000" onchange="drawColor=this.value;document.getElementById('drawColor').value=this.value" style="width:36px;height:36px;border:none;border-radius:8px;cursor:pointer;">
        <label style="margin-left:8px;">粗细：</label><select id="fsDrawSize" onchange="drawSize=parseInt(this.value);document.getElementById('drawSize').value=this.value" style="padding:8px;border-radius:8px;border:1px solid var(--gray-2);"><option value="2">细</option><option value="4" selected>中</option><option value="8">粗</option><option value="14">特粗</option></select>
        <button class="btn btn-small btn-outline" onclick="undoSignature()" style="margin-left:auto;">↩️ 撤销</button>
        <button class="btn btn-small btn-primary" onclick="saveSignature()">💾 保存</button>
        <button class="btn btn-small btn-outline" onclick="closeSignatureFullscreen()">✕ 退出全屏</button>
      </div>
      <canvas id="fsSignCanvas"></canvas>
    </div>`;
  setTimeout(initSigCanvas, 100);
}

function initSigCanvas() {
  const c = document.getElementById('signCanvas'); if (!c) return;
  sigCanvas = c; sigCtx = c.getContext('2d');
  c.width = 1200; c.height = 900;
  fetch('/signature-wall').then(r => r.json()).then(d => {
    if (d.image_data) { const img = new Image(); img.onload = () => sigCtx.drawImage(img, 0, 0, 1200, 900); img.src = d.image_data; }
    else { sigCtx.fillStyle = '#FFFFFF'; sigCtx.fillRect(0, 0, 1200, 900); }
  });
  bindCanvasEvents(c);
}

function bindCanvasEvents(canvas) {
  canvas.addEventListener('mousedown', (e) => { isDrawing = true; const rect = canvas.getBoundingClientRect(); lastX = (e.clientX - rect.left) * (canvas.width / rect.width); lastY = (e.clientY - rect.top) * (canvas.height / rect.height); });
  canvas.addEventListener('mousemove', (e) => { if (!isDrawing) return; const rect = canvas.getBoundingClientRect(); const x = (e.clientX - rect.left) * (canvas.width / rect.width); const y = (e.clientY - rect.top) * (canvas.height / rect.height); sigCtx.beginPath(); sigCtx.moveTo(lastX, lastY); sigCtx.lineTo(x, y); sigCtx.strokeStyle = drawColor; sigCtx.lineWidth = drawSize * 2; sigCtx.lineCap = 'round'; sigCtx.lineJoin = 'round'; sigCtx.stroke(); lastX = x; lastY = y; });
  canvas.addEventListener('mouseup', () => { isDrawing = false; });
  canvas.addEventListener('mouseleave', () => { isDrawing = false; });
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); const t = e.touches[0]; const rect = canvas.getBoundingClientRect(); lastX = (t.clientX - rect.left) * (canvas.width / rect.width); lastY = (t.clientY - rect.top) * (canvas.height / rect.height); isDrawing = true; });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (!isDrawing) return; const t = e.touches[0]; const rect = canvas.getBoundingClientRect(); const x = (t.clientX - rect.left) * (canvas.width / rect.width); const y = (t.clientY - rect.top) * (canvas.height / rect.height); sigCtx.beginPath(); sigCtx.moveTo(lastX, lastY); sigCtx.lineTo(x, y); sigCtx.strokeStyle = drawColor; sigCtx.lineWidth = drawSize * 2; sigCtx.lineCap = 'round'; sigCtx.lineJoin = 'round'; sigCtx.stroke(); lastX = x; lastY = y; });
  canvas.addEventListener('touchend', () => { isDrawing = false; });
}

function openSignatureFullscreen() {
  const fs = document.getElementById('sigFullscreen'); fs.classList.add('active');
  const fc = document.getElementById('fsSignCanvas');
  fc.width = window.innerWidth; fc.height = window.innerHeight - 60;
  const fctx = fc.getContext('2d');
  // 同步当前画布内容
  const imgData = sigCanvas.toDataURL();
  const img = new Image(); img.onload = () => fctx.drawImage(img, 0, 0, fc.width, fc.height); img.src = imgData;
  bindCanvasEvents(fc);
  document.body.style.overflow = 'hidden';
}
function closeSignatureFullscreen() {
  // 把全屏画布内容同步回小画布
  const fc = document.getElementById('fsSignCanvas');
  const imgData = fc.toDataURL();
  const img = new Image(); img.onload = () => { sigCtx.clearRect(0, 0, 1200, 900); sigCtx.drawImage(img, 0, 0, 1200, 900); }; img.src = imgData;
  document.getElementById('sigFullscreen').classList.remove('active');
  document.body.style.overflow = '';
}
function undoSignature() {
  fetch('/signature-wall').then(r => r.json()).then(d => {
    const targetCtx = document.getElementById('sigFullscreen').classList.contains('active') ? document.getElementById('fsSignCanvas').getContext('2d') : sigCtx;
    const targetCanvas = document.getElementById('sigFullscreen').classList.contains('active') ? document.getElementById('fsSignCanvas') : sigCanvas;
    targetCtx.fillStyle = '#FFFFFF'; targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
    if (d.image_data) { const img = new Image(); img.onload = () => targetCtx.drawImage(img, 0, 0, targetCanvas.width, targetCanvas.height); img.src = d.image_data; }
  });
}
async function clearSignature() {
  if (!confirm('确定清除整个签名墙？')) return;
  try { await fetch('/signature-wall/clear', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requester: currentUser.name }) }); sigCtx.fillStyle = '#FFFFFF'; sigCtx.fillRect(0, 0, 1200, 900); alert('签名墙已清除'); } catch (e) { alert('清除失败'); }
}
async function saveSignature() {
  // 如果全屏模式，先同步
  if (document.getElementById('sigFullscreen').classList.contains('active')) { closeSignatureFullscreen(); }
  const dataUrl = sigCanvas.toDataURL('image/jpeg', 0.9);
  try {
    // 合并旧图
    const oldRes = await fetch('/signature-wall'); const oldData = await oldRes.json();
    let finalImage = dataUrl;
    if (oldData.image_data) {
      const mc = document.createElement('canvas'); mc.width = 1200; mc.height = 900; const mctx = mc.getContext('2d');
      const oldImg = new Image(); await new Promise(r => { oldImg.onload = r; oldImg.src = oldData.image_data; });
      mctx.drawImage(oldImg, 0, 0, 1200, 900);
      const newImg = new Image(); await new Promise(r => { newImg.onload = r; newImg.src = dataUrl; });
      mctx.drawImage(newImg, 0, 0, 1200, 900);
      finalImage = mc.toDataURL('image/jpeg', 0.9);
    }
    const res = await fetch('/signature-wall', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_data: finalImage }) });
    const d = await res.json();
    if (d.success) { alert('签名保存成功！'); } else { alert(d.error || '保存失败'); }
  } catch (e) { alert('保存失败'); }
}

// ========== 歌单 ==========
async function renderSongs() {
  const content = document.getElementById('contentArea');
  try {
    const res = await fetch('/songs'); const songs = await res.json();
    let html = '<div style="margin-bottom:16px;"><button class="btn btn-primary" onclick="openAddSongModal()">🎵 添加歌曲</button></div><h4 style="margin:16px 0 12px;">🎧 歌单</h4>';
    if (!songs || songs.length === 0) { html += '<div class="empty-state"><div class="empty-icon">🎵</div>歌单为空</div>'; }
    else {
      html += '<div class="song-list">';
      songs.forEach(s => { html += `<div class="song-item${currentSongName===s.name?' playing':''}" onclick="playSong('${escapeHtml(s.filename)}','${escapeHtml(s.name)}')"><div class="song-info"><span class="song-name">🎵 ${escapeHtml(s.name)}</span><span class="song-uploader">上传者：${escapeHtml(s.uploaded_by)}</span></div><span class="song-play">▶️</span></div>`; });
      html += '</div>';
    }
    html += '<p style="font-size:12px;color:var(--gray-4);margin-top:16px;text-align:center;">歌曲通过 GitHub 上传，在歌单中点击即可播放</p>';
    content.innerHTML = html;
  } catch (e) { content.innerHTML = '<div class="empty-state">加载失败</div>'; }
}

function openAddSongModal() {
  document.getElementById('modalTitle').textContent = '添加歌曲';
  document.getElementById('modalBody').innerHTML = '<div class="form-group"><label class="form-label">歌曲名称</label><input type="text" id="songName" class="input" placeholder="例如：干杯" maxlength="100"></div><div class="form-group"><label class="form-label">文件夹名</label><input type="text" id="songFolder" class="input" placeholder="例如：ganbei（对应 songs/ganbei/）" maxlength="100"></div><p style="font-size:12px;color:var(--gray-4);">歌曲文件请通过 GitHub 上传到 songs/文件夹名/ 目录</p>';
  document.getElementById('modalFooter').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="doAddSong()">添加</button>';
  document.getElementById('modal').classList.add('show');
}
async function doAddSong() {
  const name = document.getElementById('songName').value.trim(), folder = document.getElementById('songFolder').value.trim();
  if (!name || !folder) { alert('请填写完整'); return; }
  try { await fetch('/songs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, filename: folder, uploaded_by: currentUser.name }) }); closeModal(); renderSongs(); } catch (e) { alert('添加失败'); }
}

function playSong(folder, name) {
  if (audio) { audio.pause(); }
  currentSongName = name;
  audio = new Audio(`/songs/${folder}/${name}.mp3`);
  const panel = document.getElementById('musicPanel');
  document.querySelector('.music-title').textContent = name;
  document.querySelector('.music-artist').textContent = '歌单播放';
  fetch(`/songs/${folder}/${name}.lrc`).then(r => { if (!r.ok) throw new Error('No lyrics'); return r.text(); }).then(t => parseLRC(t)).catch(() => { document.getElementById('lyricsContent').innerHTML = '<div style="color:var(--gray-4);padding:20px;">暂无歌词</div>'; });
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', () => { document.getElementById('duration').textContent = formatTime(audio.duration); });
  audio.addEventListener('play', () => { document.querySelector('#playBtn svg').innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'; document.getElementById('musicToggle').classList.add('playing'); });
  audio.addEventListener('pause', () => { document.querySelector('#playBtn svg').innerHTML = '<path d="M8 5v14l11-7z"/>'; document.getElementById('musicToggle').classList.remove('playing'); });
  audio.addEventListener('ended', () => { document.querySelector('#playBtn svg').innerHTML = '<path d="M8 5v14l11-7z"/>'; document.getElementById('musicToggle').classList.remove('playing'); });
  audio.play().catch(() => { alert('播放失败'); });
  panel.classList.add('show');
  renderSongs();
}

// ========== 个人资料（含漂流瓶） ==========
function renderProfile() {
  const content = document.getElementById('contentArea');
  const avatar = currentUser.avatar || '😊', isEmoji = avatar.length <= 2 || !avatar.startsWith('http');
  let html = `
    <div class="card" style="text-align:center;">
      <div class="avatar-large" onclick="openAvatarModal()">${isEmoji ? avatar : `<img src="${escapeHtml(avatar)}" class="avatar-img" alt="${currentUser.name}">`}</div>
      <div class="card-name" style="font-size:20px;margin-bottom:4px;justify-content:center;">${escapeHtml(currentUser.name)}</div>
      <div style="color:var(--gray-4);font-size:14px;margin-bottom:12px;">${currentUser.role==='admin'?'👑 管理员':(currentUser.role==='teacher'?'👨‍🏫 老师':'🎓 同学')}</div>
      <button class="btn btn-outline btn-small" onclick="openAvatarModal()">更换头像</button>
    </div>
    <div class="card"><h4 style="margin-bottom:16px;">💬 座右铭</h4><div class="form-group"><input type="text" id="profileMotto" class="input" placeholder="写下你的座右铭..." maxlength="100"></div><button class="btn btn-primary" onclick="updateMotto()">保存</button><div id="mottoResult" class="result"></div></div>
    <div class="card"><h4 style="margin-bottom:16px;">📝 联系方式</h4><div class="form-group"><label class="form-label">手机号</label><input type="tel" id="profilePhone" class="input" maxlength="20"></div><div class="form-group"><label class="form-label">邮箱</label><input type="email" id="profileEmail" class="input" maxlength="100"></div><div class="form-group"><label class="form-label">微信</label><input type="text" id="profileWechat" class="input" maxlength="50"></div><button class="btn btn-primary" onclick="updateProfile()">保存</button><div id="profileResult" class="result"></div></div>
    <div class="card"><h4 style="margin-bottom:16px;">🔐 修改密码</h4><div class="form-group"><label class="form-label">原密码</label><input type="password" id="oldPassword" class="input" maxlength="100"></div><div class="form-group"><label class="form-label">新密码</label><input type="password" id="newPassword" class="input" maxlength="100"></div><div class="form-group"><label class="form-label">确认密码</label><input type="password" id="confirmPassword" class="input" maxlength="100"></div><button class="btn btn-primary" onclick="changePassword()">修改密码</button><div id="passwordResult" class="result"></div></div>
    <div class="card"><h4 style="margin-bottom:16px;">🍾 漂流瓶</h4><p style="font-size:14px;color:var(--gray-5);margin-bottom:12px;">写信给未来的自己或他人，到指定时间才能打开</p><button class="btn btn-primary" onclick="openDriftBottleModal()" style="margin-bottom:12px;">✉️ 投递漂流瓶</button>
      <div style="display:flex;gap:8px;margin-bottom:12px;"><button class="btn btn-small btn-outline" onclick="loadDriftBottles('sent')" id="btnSent">我投递的</button><button class="btn btn-small btn-outline" onclick="loadDriftBottles('inbox')" id="btnInbox">我能打开的</button></div>
      <div id="driftBottleList"></div>
    </div>`;
  content.innerHTML = html;
  loadProfileContact();
  loadDriftBottles('sent');
}

async function loadProfileContact() {
  try { const res = await fetch(`/contact/${encodeURIComponent(currentUser.name)}`); const c = await res.json(); document.getElementById('profilePhone').value = c.phone||''; document.getElementById('profileEmail').value = c.email||''; document.getElementById('profileWechat').value = c.wechat||''; document.getElementById('profileMotto').value = c.motto||''; } catch (e) {}
}
async function updateMotto() { try { await fetch('/update-motto', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: currentUser.name, motto: document.getElementById('profileMotto').value.trim() }) }); document.getElementById('mottoResult').textContent = '✅ 保存成功'; document.getElementById('mottoResult').style.color = 'var(--success)'; } catch (e) {} }
async function updateProfile() { try { await fetch('/update-contact', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: currentUser.name, phone: document.getElementById('profilePhone').value, email: document.getElementById('profileEmail').value, wechat: document.getElementById('profileWechat').value }) }); document.getElementById('profileResult').textContent = '✅ 保存成功'; } catch (e) {} }
async function changePassword() {
  const old = document.getElementById('oldPassword').value, n = document.getElementById('newPassword').value, c = document.getElementById('confirmPassword').value, r = document.getElementById('passwordResult');
  if (!old||!n||!c) { r.textContent = '请填写完整'; return; }
  if (n !== c) { r.textContent = '两次密码不一致'; return; }
  try { const res = await fetch('/change-password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: currentUser.name, oldPassword: old, newPassword: n }) }); const d = await res.json(); if (d.success) { r.textContent = '✅ 修改成功'; r.style.color = 'var(--success)'; } else { r.textContent = d.error; } } catch (e) {}
}

function openAvatarModal() {
  document.getElementById('modalTitle').textContent = '修改头像';
  document.getElementById('modalBody').innerHTML = `<div class="form-group"><label class="form-label">选择表情头像</label><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">${['😊','😎','🥳','🤓','😇','🦊','🐼','🐨','🐸','⭐','🌟','🔥','🎓','📚','🎵'].map(e => `<span style="font-size:36px;cursor:pointer;padding:8px;" onclick="selectAvatar('${e}')">${e}</span>`).join('')}</div><p style="margin-top:20px;">或输入图片URL</p><input type="text" id="avatarUrl" class="input" placeholder="粘贴图片链接" maxlength="500"></div>`;
  document.getElementById('modalFooter').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveAvatar()">保存</button>';
  document.getElementById('modal').classList.add('show'); window.selectedAvatar = null;
}
function selectAvatar(emoji) { window.selectedAvatar = emoji; document.getElementById('avatarUrl').value = ''; }
async function saveAvatar() {
  const avatar = document.getElementById('avatarUrl').value.trim() || window.selectedAvatar || '😊';
  try { await fetch('/update-avatar', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: currentUser.name, avatar }) }); currentUser.avatar = avatar; localStorage.setItem('currentUser', JSON.stringify(currentUser)); closeModal(); renderProfile(); } catch (e) { alert('保存失败'); }
}

// ========== 漂流瓶 ==========
function openDriftBottleModal() {
  const allNames = [...new Set([...allClassmates.map(c => c.name), ...allTeachers.map(t => t.name)])];
  document.getElementById('modalTitle').textContent = '投递漂流瓶';
  document.getElementById('modalBody').innerHTML = `<div class="form-group"><label class="form-label">收信人</label><select id="bottleTo" class="input"><option value="${escapeHtml(currentUser.name)}">给自己</option>${allNames.filter(n => n !== currentUser.name).map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">打开时间</label><input type="datetime-local" id="bottleTime" class="input"></div><div class="form-group"><label class="form-label">内容</label><textarea id="bottleContent" class="input" rows="4" placeholder="写下你想说的话..." maxlength="1000"></textarea></div>`;
  document.getElementById('modalFooter').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="doSendDriftBottle()">投递</button>';
  document.getElementById('modal').classList.add('show');
  // 设置默认时间为明天
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('bottleTime').value = tomorrow.toISOString().slice(0, 16);
}
async function doSendDriftBottle() {
  const to = document.getElementById('bottleTo').value, time = document.getElementById('bottleTime').value, content = document.getElementById('bottleContent').value.trim();
  if (!time || !content) { alert('请填写完整'); return; }
  try { await fetch('/drift-bottles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_name: currentUser.name, to_name: to, content, open_time: time }) }); closeModal(); alert('漂流瓶已投递！'); loadDriftBottles('sent'); } catch (e) { alert('投递失败'); }
}
async function loadDriftBottles(type) {
  document.getElementById('btnSent').classList.toggle('active', type === 'sent');
  document.getElementById('btnInbox').classList.toggle('active', type === 'inbox');
  const list = document.getElementById('driftBottleList');
  try {
    const res = await fetch(`/drift-bottles/${type}?name=${encodeURIComponent(currentUser.name)}`);
    const bottles = await res.json();
    if (!bottles || bottles.length === 0) { list.innerHTML = '<div class="empty-state">暂无漂流瓶</div>'; return; }
    list.innerHTML = bottles.map(b => {
      const canOpen = type === 'inbox' || new Date(b.open_time) <= new Date();
      const isLocked = !canOpen && type === 'sent';
      return `<div class="drift-bottle${isLocked?' locked':''}"><div class="bottle-icon">${canOpen ? '📬' : '🔒'}</div><div class="bottle-from">${escapeHtml(b.from_name)} → ${escapeHtml(b.to_name)}</div><div class="bottle-time">打开时间：${new Date(b.open_time).toLocaleString()}</div>${canOpen ? `<div class="bottle-content">${escapeHtml(b.content)}</div>` : '<div class="bottle-lock">🔒</div>'}</div>`;
    }).join('');
  } catch (e) { list.innerHTML = '<div class="empty-state">加载失败</div>'; }
}

// ========== 通用 ==========
function openFeedbackModal(toName, toRole, type) {
  document.getElementById('modalTitle').textContent = type === 'evaluation' ? `评价 ${toName}` : `感谢 ${toName}`;
  document.getElementById('modalBody').innerHTML = '<textarea id="feedbackContent" class="input" rows="4" placeholder="写下你想说的话..." maxlength="500"></textarea>';
  document.getElementById('modalFooter').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="doFeedback(\''+escapeHtml(toName)+'\',\''+toRole+'\',\''+type+'\')">发送</button>';
  document.getElementById('modal').classList.add('show');
}
async function doFeedback(toName, toRole, type) {
  const content = document.getElementById('feedbackContent').value.trim(); if (!content) { alert('请输入内容'); return; }
  try { await fetch('/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_name: currentUser.name, from_role: currentUser.role, to_name: toName, to_role: toRole, content, type }) }); closeModal(); alert('发送成功'); } catch (e) { alert('发送失败'); }
}
function closeModal() { document.getElementById('modal').classList.remove('show'); }
function logout() { localStorage.removeItem('currentUser'); currentUser = null; document.getElementById('mainPage').classList.remove('active'); document.getElementById('loginPage').classList.add('active'); document.getElementById('passwordInput').value = ''; document.getElementById('nameInput').value = ''; }

// ========== 启动 ==========
const savedUser = localStorage.getItem('currentUser');
if (savedUser) { currentUser = JSON.parse(savedUser); showMainPage(); }
loadClassmatesList();
