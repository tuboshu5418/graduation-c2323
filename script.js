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
  fetch('/干杯.lrc').then(r => { if (!r.ok) throw new Error('No lyrics'); return r.text(); }).then(t => parseLRC(t)).catch(() => { document.getElementById('lyricsContent').innerHTML = '<div style="color:var(--gray-4);padding:20px;">暂无歌词</div>'; });
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', () => { document.getElementById('duration').textContent = formatTime(audio.duration); });
  audio.addEventListener('play', () => { document.querySelector('#playBtn svg').innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'; document.getElementById('musicToggle').classList.add('playing'); });
  audio.addEventListener('pause', () => { document.querySelector('#playBtn svg').innerHTML = '<path d="M8 5v14l11-7z"/>'; document.getElementById('musicToggle').classList.remove('playing'); });
  audio.addEventListener('ended', () => { document.querySelector('#playBtn svg').innerHTML = '<path d="M8 5v14l11-7z"/>'; document.getElementById('musicToggle').classList.remove('playing'); });
}

function parseLRC(text) {
  const lines = text.split('\n'); const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/; lyricsData = [];
  lines.forEach(line => { const m = line.match(regex); if (m) { const t = parseInt(m[1])*60+parseInt(m[2])+parseInt(m[3])/1000; const c = line.replace(regex, '').trim(); if (c) lyricsData.push({ time: t, content: c }); } });
  lyricsData.sort((a, b) => a.time - b.time);
  const ct = document.getElementById('lyricsContent');
  ct.innerHTML = lyricsData.length ? lyricsData.map((l, i) => `<div class="lyric-line" data-index="${i}">${escapeHtml(l.content)}</div>`).join('') : '<div style="color:var(--gray-4);padding:20px;">暂无歌词</div>';
}

function updateProgress() {
  if (!audio) return;
  const p = (audio.currentTime / audio.duration) * 100 || 0;
  document.getElementById('progressBar').style.width = p + '%';
  document.getElementById('currentTime').textContent = formatTime(audio.currentTime);
  let ni = -1; for (let i = 0; i < lyricsData.length; i++) { if (audio.currentTime >= lyricsData[i].time) ni = i; }
  if (ni !== currentLyricIndex) { document.querySelectorAll('.lyric-line').forEach(l => l.classList.remove('active')); const a = document.querySelector(`.lyric-line[data-index="${ni}"]`); if (a) { a.classList.add('active'); a.scrollIntoView({ block: 'center', behavior: 'smooth' }); } currentLyricIndex = ni; }
}

function formatTime(s) { if (isNaN(s)) return '0:00'; return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`; }
function togglePlay() { if (!audio) initMusicPlayer(); audio?.paused ? audio.play() : audio?.pause(); }
function seekTo(e) { if (!audio) return; const r = e.currentTarget.getBoundingClientRect(); audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration; }
function toggleMusic() { const p = document.getElementById('musicPanel'); if (p.classList.contains('show')) p.classList.remove('show'); else { if (!audio) initMusicPlayer(); p.classList.add('show'); } }
function togglePanel() { document.getElementById('musicPanel').classList.remove('show'); }

// ========== 初始化 ==========
async function loadClassmatesList() { try { const r = await fetch('/classmates-list'); window.allNames = (await r.json()).map(d => d.name); } catch (e) {} }
async function loadClassmates() { try { allClassmates = await (await fetch('/classmates')).json(); } catch (e) {} }
async function loadTeachers() { try { allTeachers = await (await fetch('/teachers')).json(); } catch (e) {} }

function showNameList() {
  const m = document.getElementById('nameListModal'), o = document.getElementById('nameListOptions');
  o.innerHTML = (window.allNames && window.allNames.length) ? window.allNames.map(n => `<div class="name-option" onclick="selectName('${escapeHtml(n)}')">${escapeHtml(n)}</div>`).join('') : '<div class="empty-state">暂无数据</div>';
  m.style.display = 'flex';
}
function hideNameList() { document.getElementById('nameListModal').style.display = 'none'; }
function selectName(n) { document.getElementById('nameInput').value = n; hideNameList(); }

async function login() {
  const name = document.getElementById('nameInput').value.trim(), pw = document.getElementById('passwordInput').value, err = document.getElementById('loginError');
  if (!name || !pw) { err.textContent = '请输入姓名和密码'; return; }
  try {
    const r = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, password: pw }) });
    const d = await r.json();
    if (d.success) { currentUser = d.user; localStorage.setItem('currentUser', JSON.stringify(currentUser)); showMainPage(); } else { err.textContent = d.error; }
  } catch (e) { err.textContent = '网络错误'; }
}

document.addEventListener('DOMContentLoaded', () => {
  const pw = document.getElementById('passwordInput'), nm = document.getElementById('nameInput');
  if (pw) pw.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  if (nm) nm.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
});

function showMainPage() {
  document.getElementById('loginPage').classList.remove('active'); document.getElementById('mainPage').classList.add('active');
  const cfg = ROLE_CONFIG[currentUser.role] || ROLE_CONFIG.student;
  document.getElementById('userBadge').textContent = currentUser.role === 'admin' ? '👑 管理员' : (currentUser.role === 'teacher' ? '👨‍🏫 老师' : '🎓 同学');
  renderTabBar(cfg.tabs); switchTab(cfg.tabs[0].id); loadClassmates(); loadTeachers();
}

function renderTabBar(tabs) {
  const bar = document.getElementById('tabBar');
  bar.innerHTML = tabs.map(t => `<button class="tab-item" data-tab="${t.id}"><span class="tab-icon">${t.icon}</span><span>${t.label}</span></button>`).join('');
  bar.querySelectorAll('.tab-item').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
  const titles = { photos: '班级相册', teachers: '老师', classmates: '同学录', evaluate: '评价学生', thanks: '感谢', messages: '所有留言', users: '所有人物', profile: '我的', myMessages: '我的留言', feedbacks: '评价/感谢', signature: '签名墙', songs: '歌单', console: '控制台' };
  document.getElementById('pageTitle').textContent = titles[tabId] || tabId;
  document.getElementById('contentArea').innerHTML = '<div class="empty-state">加载中...</div>';
  setTimeout(() => {
    const fn = { photos: renderPhotos, teachers: renderTeachers, classmates: renderClassmates, myMessages: renderMyMessages, evaluate: renderEvaluate, thanks: renderThanks, messages: renderAllMessages, users: renderAllUsers, feedbacks: renderAllFeedbacks, signature: renderSignature, songs: renderSongs, console: renderConsole, profile: renderProfile };
    if (fn[tabId]) fn[tabId]();
  }, 10);
}

// ========== 我的留言 ==========
async function renderMyMessages() {
  const c = document.getElementById('contentArea');
  try {
    const msgs = await (await fetch(`/messages/${encodeURIComponent(currentUser.name)}`)).json();
    if (!msgs || !msgs.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div>还没有人给你留言</div>'; return; }
    c.innerHTML = '<h4 style="margin-bottom:16px;">💭 别人对我说的话</h4>' + msgs.map(m => `<div class="memory-card"><div class="memory-header"><span class="memory-from">${escapeHtml(m.from_name)}</span><span class="memory-time">${new Date(m.created_at).toLocaleString()}</span></div><div class="memory-content">${escapeHtml(m.content)}</div></div>`).join('');
  } catch (e) { c.innerHTML = '<div class="empty-state">加载失败</div>'; }
}

// ========== 相册 ==========
async function renderPhotos() {
  const c = document.getElementById('contentArea');
  try {
    const photos = await (await fetch('/photos')).json();
    let h = '<div class="upload-btn" onclick="openUploadModal()"><span>📷</span> 上传照片</div><div class="photo-grid">';
    if (!photos || !photos.length) {
      h += '<div class="photo-item"><img src="https://picsum.photos/400/400?random=1" loading="lazy" onclick="viewPhoto(\'https://picsum.photos/800/800?random=1\',\'示例\',\'系统\')"><div class="photo-overlay"><div class="photo-title">示例</div><div class="photo-uploader">系统</div></div></div>';
    } else {
      photos.forEach(p => {
        const del = currentUser.role === 'admin' || p.uploaded_by === currentUser.name;
        h += `<div class="photo-item"><img src="${escapeHtml(p.image_url)}" loading="lazy" onclick="viewPhoto('${escapeHtml(p.image_url)}','${escapeHtml(p.title)}','${escapeHtml(p.uploaded_by)}')" onerror="this.src='https://picsum.photos/400/400?random='+Math.random()">${del?`<button class="photo-delete-btn" onclick="event.stopPropagation();deletePhoto(${p.id})">🗑️</button>`:''}<div class="photo-overlay"><div class="photo-title">${escapeHtml(p.title)}</div><div class="photo-uploader">${escapeHtml(p.uploaded_by)}</div></div></div>`;
      });
    }
    c.innerHTML = h + '</div>';
  } catch (e) { c.innerHTML = '<div class="empty-state">加载失败</div>'; }
}

function openUploadModal() {
  document.getElementById('modalTitle').textContent = '上传照片';
  document.getElementById('modalBody').innerHTML = '<div class="form-group"><label class="form-label">标题</label><input type="text" id="photoTitle" class="input" maxlength="100"></div><div class="form-group"><label class="form-label">图片链接</label><input type="text" id="photoUrl" class="input" maxlength="500"><p style="font-size:13px;color:var(--gray-4);margin-top:6px;">推荐 <a href="https://imgbb.com/" target="_blank">ImgBB</a></p></div>';
  document.getElementById('modalFooter').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="doUploadPhoto()">上传</button>';
  document.getElementById('modal').classList.add('show');
}
async function doUploadPhoto() {
  const t = document.getElementById('photoTitle').value.trim(), u = document.getElementById('photoUrl').value.trim();
  if (!t || !u) { alert('请填写完整'); return; }
  try { await fetch('/photos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uploaded_by: currentUser.name, title: t, description: '', image_url: u }) }); closeModal(); renderPhotos(); } catch (e) { alert('上传失败'); }
}
function viewPhoto(url, title, uploader) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = `<img src="${escapeHtml(url)}" style="width:100%;border-radius:12px;" onerror="this.src='https://picsum.photos/400/400'"><p style="margin-top:12px;color:var(--gray-4);">上传者：${escapeHtml(uploader)}</p>`;
  document.getElementById('modalFooter').innerHTML = '<button class="btn btn-primary" onclick="closeModal()">关闭</button>';
  document.getElementById('modal').classList.add('show');
}
async function deletePhoto(id) { if (!confirm('确定删除？')) return; try { await fetch(`/photos/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requester: currentUser.name }) }); renderPhotos(); } catch (e) { alert('删除失败'); } }

// ========== 老师 ==========
async function renderTeachers() {
  const c = document.getElementById('contentArea');
  try {
    const teachers = await (await fetch('/teachers')).json();
    if (!teachers || !teachers.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">👨‍🏫</div>暂无老师</div>'; return; }
    let h = '<div class="global-search-box"><input type="text" id="teacherSearch" class="input" placeholder="搜索老师..." maxlength="50" onkeyup="filterTeacherList()"></div><div id="teachersListContainer"></div>';
    c.innerHTML = h;
    const ct = document.getElementById('teachersListContainer');
    const sm = { '语文':'📖','数学':'📐','英语':'🌍','物理':'⚡','化学':'🧪','政治':'🏛️','历史':'📜','音乐':'🎵','体育':'⚽','美术':'🎨' };
    for (const t of teachers) {
      const contact = await (await fetch(`/contact/${encodeURIComponent(t.name)}`)).json();
      const card = document.createElement('div'); card.className = 'person-card teacher-card-item'; card.dataset.name = t.name;
      card.innerHTML = `<div class="person-name">${escapeHtml(t.name)}<span class="teacher-subject-tag">${sm[t.subject]||'👨‍🏫'} ${escapeHtml(t.subject||'')}</span></div><div class="person-contact">${contact.phone?`<div class="contact-line"><span class="emoji">📱</span> ${escapeHtml(contact.phone)}</div>`:''}${contact.wechat?`<div class="contact-line"><span class="emoji">💬</span> ${escapeHtml(contact.wechat)}</div>`:''}${contact.email?`<div class="contact-line"><span class="emoji">📧</span> ${escapeHtml(contact.email)}</div>`:''}</div><div class="person-actions"><button class="btn btn-secondary btn-small" onclick="openFeedbackModal('${escapeHtml(t.name)}','teacher','evaluation')">评价</button><button class="btn btn-primary btn-small" onclick="openFeedbackModal('${escapeHtml(t.name)}','teacher','thanks')">感谢</button></div>`;
      ct.appendChild(card);
    }
  } catch (e) { c.innerHTML = '<div class="empty-state">加载失败</div>'; }
}
function filterTeacherList() {
  const kw = document.getElementById('teacherSearch')?.value.toLowerCase() || '';
  document.querySelectorAll('.teacher-card-item').forEach(c => { c.style.display = (c.dataset.name||'').toLowerCase().includes(kw) ? 'grid' : 'none'; });
}

// ========== 同学录 ==========
async function renderClassmates() {
  document.getElementById('contentArea').innerHTML = '<div class="global-search-box"><input type="text" id="classmateSearch" class="input" placeholder="搜索同学..." maxlength="50" onkeyup="filterClassmateList()"></div><div id="classmatesListContainer"></div>';
  renderClassmatesListInContainer();
}
async function renderClassmatesListInContainer() {
  const ct = document.getElementById('classmatesListContainer'); if (!ct) return;
  const others = allClassmates.filter(c => c.name !== currentUser.name).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  if (!others.length) { ct.innerHTML = '<div class="empty-state">暂无其他同学</div>'; return; }
  ct.innerHTML = '';
  for (const c of others) {
    try {
      const contact = await (await fetch(`/contact/${encodeURIComponent(c.name)}`)).json();
      const card = document.createElement('div'); card.className = 'person-card classmate-card-item'; card.dataset.name = c.name;
      card.innerHTML = `<div class="person-name">${escapeHtml(c.name)}</div><div class="person-contact">${contact.phone?`<div class="contact-line"><span class="emoji">📱</span> ${escapeHtml(contact.phone)}</div>`:''}${contact.wechat?`<div class="contact-line"><span class="emoji">💬</span> ${escapeHtml(contact.wechat)}</div>`:''}${contact.email?`<div class="contact-line"><span class="emoji">📧</span> ${escapeHtml(contact.email)}</div>`:''}</div><div class="person-actions"><button class="btn btn-primary btn-small" onclick="openMessageModal('${escapeHtml(c.name)}')">留言</button></div>`;
      ct.appendChild(card);
    } catch (e) {
      const card = document.createElement('div'); card.className = 'person-card classmate-card-item'; card.dataset.name = c.name;
      card.innerHTML = `<div class="person-name">${escapeHtml(c.name)}</div><div class="person-contact"></div><div class="person-actions"><button class="btn btn-primary btn-small" onclick="openMessageModal('${escapeHtml(c.name)}')">留言</button></div>`;
      ct.appendChild(card);
    }
  }
}
function filterClassmateList() {
  const kw = document.getElementById('classmateSearch')?.value.toLowerCase() || '';
  document.querySelectorAll('.classmate-card-item').forEach(c => {
    const n = c.querySelector('.person-name')?.textContent.toLowerCase() || '';
    const ct = c.querySelector('.person-contact')?.textContent.toLowerCase() || '';
    c.style.display = (n + ct).includes(kw) ? 'grid' : 'none';
  });
}

function openMessageModal(toName) {
  document.getElementById('modalTitle').textContent = `给 ${toName} 留言`;
  document.getElementById('modalBody').innerHTML = '<textarea id="messageContent" class="input" rows="4" maxlength="500"></textarea>';
  document.getElementById('modalFooter').innerHTML = `<button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="sendMessage('${escapeHtml(toName)}')">发送</button>`;
  document.getElementById('modal').classList.add('show');
}
async function sendMessage(toName) {
  const ct = document.getElementById('messageContent').value.trim(); if (!ct) { alert('请输入内容'); return; }
  try { await fetch('/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_name: currentUser.name, to_name: toName, content: ct }) }); closeModal(); alert('发送成功！'); } catch (e) { alert('发送失败'); }
}

// ========== 评价学生 ==========
function renderEvaluate() {
  const c = document.getElementById('contentArea');
  const st = allClassmates.filter(s => s.name !== currentUser.name);
  if (!st.length) { c.innerHTML = '<div class="empty-state">暂无学生</div>'; return; }
  c.innerHTML = `<div class="card"><div class="form-group"><label class="form-label">选择学生</label><select id="studentSelect" class="input">${st.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">评价</label><textarea id="evaluateContent" class="input" rows="4" maxlength="500"></textarea></div><button class="btn btn-primary" onclick="doEvaluate()">发表</button></div>`;
}
async function doEvaluate() {
  const s = document.getElementById('studentSelect').value, ct = document.getElementById('evaluateContent').value.trim();
  if (!ct) { alert('请输入内容'); return; }
  try { await fetch('/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_name: currentUser.name, from_role: 'teacher', to_name: s, to_role: 'student', content: ct, type: 'evaluation' }) }); alert('评价成功'); switchTab('evaluate'); } catch (e) { alert('评价失败'); }
}

// ========== 感谢 ==========
async function renderThanks() {
  const c = document.getElementById('contentArea');
  try {
    const thanks = await (await fetch(`/feedback/${encodeURIComponent(currentUser.name)}?type=thanks`)).json();
    if (!thanks || !thanks.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">🙏</div>还没有收到感谢</div>'; return; }
    c.innerHTML = thanks.map(t => `<div class="memory-card"><div class="memory-header"><span class="memory-from">${escapeHtml(t.from_name)}</span><span class="memory-time">${new Date(t.created_at).toLocaleString()}</span></div><div class="memory-content">${escapeHtml(t.content)}</div></div>`).join('');
  } catch (e) { c.innerHTML = '<div class="empty-state">加载失败</div>'; }
}

// ========== 管理员：所有留言 ==========
async function renderAllMessages() {
  const c = document.getElementById('contentArea');
  try {
    const data = await (await fetch(`/admin/all-data?requester=${encodeURIComponent(currentUser.name)}`)).json();
    let h = '<div style="margin-bottom:16px;"><button class="btn btn-primary" onclick="openMessageAsModal()">✉️ 以他人名义发留言</button></div>';
    if (!data.messages || !data.messages.length) h += '<div class="empty-state">暂无留言</div>';
    else data.messages.forEach(m => { h += `<div class="memory-card message-card-admin"><button class="message-delete" onclick="deleteMessage(${m.id})">🗑️</button><div class="memory-header"><span class="memory-from">${escapeHtml(m.from_name)} → ${escapeHtml(m.to_name)}</span><span class="memory-time">${new Date(m.created_at).toLocaleString()}</span></div><div class="memory-content">${escapeHtml(m.content)}</div></div>`; });
    c.innerHTML = h;
  } catch (e) { c.innerHTML = '<div class="empty-state">加载失败</div>'; }
}
function openMessageAsModal() {
  const names = [...new Set([...allClassmates.map(c => c.name), ...allTeachers.map(t => t.name)])];
  document.getElementById('modalTitle').textContent = '以他人名义发留言';
  document.getElementById('modalBody').innerHTML = `<div class="form-group"><label class="form-label">发送者</label><select id="msgFrom" class="input">${names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">接收者</label><select id="msgTo" class="input">${names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">内容</label><textarea id="msgContent" class="input" rows="4" maxlength="500"></textarea></div>`;
  document.getElementById('modalFooter').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="doMessageAs()">发送</button>';
  document.getElementById('modal').classList.add('show');
}
async function doMessageAs() {
  const from = document.getElementById('msgFrom').value, to = document.getElementById('msgTo').value, ct = document.getElementById('msgContent').value.trim();
  if (!ct) { alert('请输入内容'); return; }
  try { await fetch('/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_name: from, to_name: to, content: ct, requester: currentUser.name }) }); closeModal(); renderAllMessages(); } catch (e) { alert('发送失败'); }
}
async function deleteMessage(id) { if (!confirm('确定删除？')) return; try { await fetch('/admin/delete-message', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requester: currentUser.name, messageId: id }) }); renderAllMessages(); } catch (e) { alert('删除失败'); } }

// ========== 管理员：所有人物 ==========
async function renderAllUsers() {
  const c = document.getElementById('contentArea');
  try {
    const data = await (await fetch(`/admin/all-data?requester=${encodeURIComponent(currentUser.name)}`)).json();
    let h = `<div style="margin-bottom:16px;"><button class="btn btn-primary" onclick="openAddUserModal()">➕ 添加用户</button></div><div class="stats-grid"><div class="stat-card"><div class="stat-value">${data.users.length}</div><div class="stat-label">总用户</div></div><div class="stat-card"><div class="stat-value">${data.messages.length}</div><div class="stat-label">留言</div></div><div class="stat-card"><div class="stat-value">${data.feedbacks.length}</div><div class="stat-label">评价/感谢</div></div><div class="stat-card"><div class="stat-value">${data.photos.length}</div><div class="stat-label">照片</div></div></div>`;
    data.users.forEach(u => {
      const av = u.avatar || '😊', em = av.length <= 2 || !av.startsWith('http');
      h += `<div class="card"><div class="card-header"><div class="card-avatar">${em ? av : `<img src="${escapeHtml(av)}" class="avatar-img">`}</div><div class="card-info"><div class="card-name">${escapeHtml(u.name)}<span class="role-tag ${u.role}">${u.role==='admin'?'管理员':(u.role==='teacher'?'老师':'同学')}</span></div></div><div class="admin-actions"><button class="btn-icon edit" onclick="openEditUserModal('${escapeHtml(u.name)}','${u.role}','${escapeHtml(u.phone||'')}','${escapeHtml(u.email||'')}','${escapeHtml(u.wechat||'')}')">编辑</button>${u.name!==currentUser.name?`<button class="btn-icon delete" onclick="deleteUser('${escapeHtml(u.name)}')">删除</button>`:''}</div></div><div class="card-detail">${u.phone?`<div class="card-detail-item"><span>📱</span> ${escapeHtml(u.phone)}</div>`:''}${u.email?`<div class="card-detail-item"><span>📧</span> ${escapeHtml(u.email)}</div>`:''}${u.wechat?`<div class="card-detail-item"><span>💬</span> ${escapeHtml(u.wechat)}</div>`:''}</div></div>`;
    });
    c.innerHTML = h;
  } catch (e) { c.innerHTML = '<div class="empty-state">加载失败</div>'; }
}
function openAddUserModal() {
  document.getElementById('modalTitle').textContent = '添加用户';
  document.getElementById('modalBody').innerHTML = '<div class="form-group"><label class="form-label">姓名</label><input type="text" id="newUserName" class="input" maxlength="50"></div><div class="form-group"><label class="form-label">角色</label><select id="newUserRole" class="input"><option value="student">同学</option><option value="teacher">老师</option><option value="admin">管理员</option></select></div><div class="form-group"><label class="form-label">手机号</label><input type="tel" id="newUserPhone" class="input" maxlength="20"></div><div class="form-group"><label class="form-label">邮箱</label><input type="email" id="newUserEmail" class="input" maxlength="100"></div><div class="form-group"><label class="form-label">微信</label><input type="text" id="newUserWechat" class="input" maxlength="50"></div><p style="font-size:13px;color:var(--gray-4);">默认密码：111111</p>';
  document.getElementById('modalFooter').innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="doAddUser()">添加</button>';
  document.getElementById('modal').classList.add('show');
}
async function doAddUser() {
  const n = document.getElementById('newUserName').value.trim(), r = document.getElementById('newUserRole').value;
  const ph = document.getElementById('newUserPhone').value.trim(), em = document.getElementById('newUserEmail').value.trim(), wx = document.getElementById('newUserWechat').value.trim();
  if (!n) { alert('请输入姓名'); return; }
  try { const res = await (await fetch('/admin/add-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requester: currentUser.name, name: n, role: r, phone: ph, email: em, wechat: wx }) })).json(); if (res.success) { closeModal(); renderAllUsers(); loadClassmatesList(); loadClassmates(); } else alert(res.error); } catch (e) { alert('添加失败'); }
}
function openEditUserModal(n, r, ph, em, wx) {
  document.getElementById('modalTitle').textContent = `编辑 ${n}`;
  document.getElementById('modalBody').innerHTML = `<div class="form-group"><label class="form-label">角色</label><select id="editUserRole" class="input"><option value="student" ${r==='student'?'selected':''}>同学</option><option value="teacher" ${r==='teacher'?'selected':''}>老师</option><option value="admin" ${r==='admin'?'selected':''}>管理员</option></select></div><div class="form-group"><label class="form-label">手机号</label><input type="tel" id="editUserPhone" class="input" value="${ph}" maxlength="20"></div><div class="form-group"><label class="form-label">邮箱</label><input type="email" id="editUserEmail" class="input" value="${em}" maxlength="100"></div><div class="form-group"><label class="form-label">微信</label><input type="text" id="editUserWechat" class="input" value="${wx}" maxlength="50"></div>`;
  document.getElementById('modalFooter').innerHTML = `<button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="doEditUser('${escapeHtml(n)}')">保存</button>`;
  document.getElementById('modal').classList.add('show');
}
async function doEditUser(n) {
  const r = document.getElementById('editUserRole').value, ph = document.getElementById('editUserPhone').value.trim(), em = document.getElementById('editUserEmail').value.trim(), wx = document.getElementById('editUserWechat').value.trim();
  try { const res = await (await fetch('/admin/update-user', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requester: currentUser.name, targetName: n, role: r, phone: ph, email: em, wechat: wx }) })).json(); if (res.success) { closeModal(); renderAllUsers(); loadClass
