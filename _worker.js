export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    
    async function sha256(m) {
      const buf = new TextEncoder().encode(m);
      const hash = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // GitHub 上传辅助函数
    async function uploadToGitHub(filePath, content, message) {
      const apiUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${filePath}`;
      let sha = null;
      try { const cr = await fetch(apiUrl, { headers: { 'Authorization': `token ${env.GITHUB_TOKEN}`, 'User-Agent': 'GraduationApp' } }); if (cr.ok) { const cd = await cr.json(); sha = cd.sha; } } catch (e) {}
      const body = { message, content, branch: 'main' };
      if (sha) body.sha = sha;
      const gr = await fetch(apiUrl, { method: 'PUT', headers: { 'Authorization': `token ${env.GITHUB_TOKEN}`, 'User-Agent': 'GraduationApp', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return { ok: gr.ok, data: await gr.json() };
    }

    async function getGitHubFile(filePath) {
      const apiUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${filePath}`;
      const r = await fetch(apiUrl, { headers: { 'Authorization': `token ${env.GITHUB_TOKEN}`, 'User-Agent': 'GraduationApp' } });
      if (!r.ok) return null;
      const d = await r.json();
      return { content: d.content, sha: d.sha, encoding: d.encoding };
    }
    
    // ========== 登录 ==========
    if (path === '/login' && request.method === 'POST') {
      const { name, password } = await request.json();
      const hash = await sha256(password);
      const user = await env.DB.prepare('SELECT id, name, role, avatar FROM classmates WHERE name = ? AND password_hash = ?').bind(name, hash).first();
      if (user) return Response.json({ success: true, user: { id: user.id, name: user.name, role: user.role, avatar: user.avatar || '' } }, { headers: corsHeaders });
      return Response.json({ success: false, error: '姓名或密码错误' }, { status: 401, headers: corsHeaders });
    }
    
    // ========== 修改密码 ==========
    if (path === '/change-password' && request.method === 'PUT') {
      const { name, oldPassword, newPassword } = await request.json();
      const oh = await sha256(oldPassword);
      const u = await env.DB.prepare('SELECT id FROM classmates WHERE name = ? AND password_hash = ?').bind(name, oh).first();
      if (!u) return Response.json({ success: false, error: '原密码错误' }, { status: 401, headers: corsHeaders });
      await env.DB.prepare('UPDATE classmates SET password_hash = ? WHERE name = ?').bind(await sha256(newPassword), name).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // ========== 上传文件到 GitHub（通用） ==========
    if (path === '/upload-file' && request.method === 'POST') {
      const fd = await request.formData();
      const file = fd.get('file');
      const folder = fd.get('folder');
      const subfolder = fd.get('subfolder') || '';
      if (!file || !folder) return Response.json({ error: '缺少参数' }, { status: 400, headers: corsHeaders });
      if (file.size > 20*1024*1024) return Response.json({ error: '文件过大(20MB)' }, { status: 400, headers: corsHeaders });
      const ab = await file.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
      const fname = file.name || 'file';
      const fp = subfolder ? `${folder}/${subfolder}/${fname}` : `${folder}/${fname}`;
      const r = await uploadToGitHub(fp, b64, `上传: ${fp}`);
      if (r.ok) return Response.json({ success: true, path: fp }, { headers: corsHeaders });
      return Response.json({ error: r.data.message || '上传失败' }, { status: 400, headers: corsHeaders });
    }

    // ========== 获取 GitHub 文件内容 ==========
    if (path === '/get-file' && request.method === 'POST') {
      const { filePath } = await request.json();
      const f = await getGitHubFile(filePath);
      if (!f) return Response.json({ error: '文件不存在' }, { status: 404, headers: corsHeaders });
      return Response.json({ content: f.content, sha: f.sha, encoding: f.encoding || 'base64' }, { headers: corsHeaders });
    }

    // ========== 管理员：修改仓库文件 ==========
    if (path === '/admin/edit-file' && request.method === 'PUT') {
      const { requester, filePath, content, sha } = await request.json();
      const admin = await env.DB.prepare("SELECT role FROM classmates WHERE name = ? AND role = 'admin'").bind(requester).first();
      if (!admin) return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
      const r = await uploadToGitHub(filePath, btoa(content), `编辑: ${filePath}`);
      if (r.ok) return Response.json({ success: true }, { headers: corsHeaders });
      return Response.json({ error: r.data.message }, { status: 400, headers: corsHeaders });
    }

    // ========== 管理员：获取仓库文件列表 ==========
    if (path === '/admin/list-files' && request.method === 'GET') {
      const requester = new URL(request.url).searchParams.get('requester');
      const admin = await env.DB.prepare("SELECT role FROM classmates WHERE name = ? AND role = 'admin'").bind(requester).first();
      if (!admin) return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
      const apiUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/git/trees/main?recursive=1`;
      const r = await fetch(apiUrl, { headers: { 'Authorization': `token ${env.GITHUB_TOKEN}`, 'User-Agent': 'GraduationApp' } });
      const d = await r.json();
      return Response.json({ files: d.tree || [] }, { headers: corsHeaders });
    }
    
    // ========== 更新头像URL ==========
    if (path === '/update-avatar' && request.method === 'PUT') {
      const { name, avatar } = await request.json();
      await env.DB.prepare('UPDATE classmates SET avatar = ? WHERE name = ?').bind(avatar, name).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // ========== 座右铭 ==========
    if (path === '/update-motto' && request.method === 'PUT') {
      const { name, motto } = await request.json();
      await env.DB.prepare('UPDATE classmates SET motto = ?, updated_at = datetime("now") WHERE name = ?').bind(motto, name).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // ========== 列表接口 ==========
    if (path === '/classmates-list' && request.method === 'GET') {
      const r = await env.DB.prepare("SELECT name FROM classmates WHERE role IN ('student','admin') ORDER BY name").all();
      return Response.json(r.results, { headers: corsHeaders });
    }
    if (path === '/classmates' && request.method === 'GET') {
      const r = await env.DB.prepare("SELECT id, name, avatar FROM classmates WHERE role = 'student' ORDER BY name").all();
      return Response.json(r.results, { headers: corsHeaders });
    }
    if (path === '/teachers' && request.method === 'GET') {
      const r = await env.DB.prepare("SELECT id, name, role, avatar, subject FROM classmates WHERE role = 'teacher' ORDER BY CASE subject WHEN '语文' THEN 1 WHEN '数学' THEN 2 WHEN '英语' THEN 3 WHEN '物理' THEN 4 WHEN '化学' THEN 5 WHEN '政治' THEN 6 WHEN '历史' THEN 7 WHEN '音乐' THEN 8 WHEN '体育' THEN 9 WHEN '美术' THEN 10 ELSE 99 END, name").all();
      return Response.json(r.results, { headers: corsHeaders });
    }
    
    // ========== 获取联系方式 ==========
    if (path.startsWith('/contact/') && request.method === 'GET') {
      const name = decodeURIComponent(path.replace('/contact/', ''));
      const r = await env.DB.prepare('SELECT phone, email, wechat, motto, role, avatar, subject FROM classmates WHERE name = ?').bind(name).first();
      return Response.json(r || {}, { headers: corsHeaders });
    }
    if (path === '/update-contact' && request.method === 'PUT') {
      const { name, phone, email, wechat } = await request.json();
      await env.DB.prepare('UPDATE classmates SET phone = ?, email = ?, wechat = ?, updated_at = datetime("now") WHERE name = ?').bind(phone, email, wechat, name).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // ========== 管理员增删改 ==========
    if (path === '/admin/update-user' && request.method === 'PUT') {
      const { requester, targetName, phone, email, wechat, role } = await request.json();
      const a = await env.DB.prepare("SELECT role FROM classmates WHERE name = ? AND role = 'admin'").bind(requester).first();
      if (!a) return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
      await env.DB.prepare('UPDATE classmates SET phone=?, email=?, wechat=?, role=?, updated_at=datetime("now") WHERE name=?').bind(phone, email, wechat, role, targetName).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    if (path === '/admin/add-user' && request.method === 'POST') {
      const { requester, name, role, phone, email, wechat } = await request.json();
      const a = await env.DB.prepare("SELECT role FROM classmates WHERE name = ? AND role = 'admin'").bind(requester).first();
      if (!a) return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
      const dh = 'bcb15f821479b4d5772bd0ca866c00ad5f926e3580720659cc80d39c9d09802a';
      await env.DB.prepare('INSERT INTO classmates (name, password_hash, role, phone, email, wechat) VALUES (?,?,?,?,?,?)').bind(name, dh, role, phone, email, wechat).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    if (path === '/admin/delete-user' && request.method === 'DELETE') {
      const { requester, targetName } = await request.json();
      const a = await env.DB.prepare("SELECT role FROM classmates WHERE name = ? AND role = 'admin'").bind(requester).first();
      if (!a) return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
      if (requester === targetName) return Response.json({ error: '不能删除自己' }, { status: 400, headers: corsHeaders });
      await env.DB.prepare('DELETE FROM classmates WHERE name = ?').bind(targetName).run();
      await env.DB.prepare('DELETE FROM messages WHERE from_name = ? OR to_name = ?').bind(targetName, targetName).run();
      await env.DB.prepare('DELETE FROM feedbacks WHERE from_name = ? OR to_name = ?').bind(targetName, targetName).run();
      await env.DB.prepare('DELETE FROM photos WHERE uploaded_by = ?').bind(targetName).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // ========== 留言 ==========
    if (path.startsWith('/messages/') && request.method === 'GET') {
      const tn = decodeURIComponent(path.replace('/messages/', ''));
      const r = await env.DB.prepare('SELECT id, from_name, content, created_at FROM messages WHERE to_name = ? ORDER BY created_at DESC').bind(tn).all();
      return Response.json(r.results, { headers: corsHeaders });
    }
    // 获取某人发出的留言
    if (path.startsWith('/messages-from/') && request.method === 'GET') {
      const fn = decodeURIComponent(path.replace('/messages-from/', ''));
      const r = await env.DB.prepare('SELECT id, to_name, content, created_at FROM messages WHERE from_name = ? ORDER BY created_at DESC').bind(fn).all();
      return Response.json(r.results, { headers: corsHeaders });
    }
    if (path === '/messages' && request.method === 'POST') {
      const { from_name, to_name, content, requester } = await request.json();
      if (requester && requester !== from_name) {
        const a = await env.DB.prepare("SELECT role FROM classmates WHERE name = ? AND role = 'admin'").bind(requester).first();
        if (!a) return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
      }
      await env.DB.prepare('INSERT INTO messages (from_name, to_name, content, created_at) VALUES (?,?,?,datetime("now"))').bind(from_name, to_name, content).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    if (path === '/admin/delete-message' && request.method === 'DELETE') {
      const { requester, messageId } = await request.json();
      const a = await env.DB.prepare("SELECT role FROM classmates WHERE name = ? AND role = 'admin'").bind(requester).first();
      if (!a) return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
      await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(messageId).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // ========== 评价/感谢 ==========
    if (path === '/feedback' && request.method === 'POST') {
      const { from_name, from_role, to_name, to_role, content, type } = await request.json();
      await env.DB.prepare('INSERT INTO feedbacks (from_name, from_role, to_name, to_role, content, type, created_at) VALUES (?,?,?,?,?,?,datetime("now"))').bind(from_name, from_role, to_name, to_role, content, type).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    if (path.startsWith('/feedback/') && request.method === 'GET') {
      const tn = decodeURIComponent(path.replace('/feedback/', ''));
      const tp = new URL(request.url).searchParams.get('type') || 'all';
      let q = 'SELECT id, from_name, from_role, content, type, created_at FROM feedbacks WHERE to_name = ?';
      let p = [tn];
      if (tp !== 'all') { q += ' AND type = ?'; p.push(tp); }
      q += ' ORDER BY created_at DESC';
      return Response.json((await env.DB.prepare(q).bind(...p).all()).results, { headers: corsHeaders });
    }
    
    // ========== 管理员数据 ==========
    if (path === '/admin/all-data' && request.method === 'GET') {
      const req = new URL(request.url).searchParams.get('requester');
      const a = await env.DB.prepare("SELECT role FROM classmates WHERE name = ? AND role = 'admin'").bind(req).first();
      if (!a) return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
      const users = await env.DB.prepare('SELECT id, name, role, phone, email, wechat, avatar, subject, motto, updated_at FROM classmates ORDER BY name').all();
      const messages = await env.DB.prepare('SELECT id, from_name, to_name, content, created_at FROM messages ORDER BY created_at DESC').all();
      const feedbacks = await env.DB.prepare('SELECT id, from_name, from_role, to_name, to_role, content, type, created_at FROM feedbacks ORDER BY created_at DESC').all();
      const photos = await env.DB.prepare('SELECT id, uploaded_by, title, description, image_url, created_at FROM photos ORDER BY created_at DESC').all();
      return Response.json({ users: users.results, messages: messages.results, feedbacks: feedbacks.results, photos: photos.results }, { headers: corsHeaders });
    }
    
    // ========== SQL 控制台 ==========
    if (path === '/admin/query' && request.method === 'POST') {
      const req = new URL(request.url).searchParams.get('requester');
      const { sql } = await request.json();
      const a = await env.DB.prepare("SELECT role FROM classmates WHERE name = ? AND role = 'admin'").bind(req).first();
      if (!a) return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
      if (!sql || !sql.toUpperCase().trim().startsWith('SELECT')) return Response.json({ error: '仅允许 SELECT' }, { status: 400, headers: corsHeaders });
      const us = sql.toUpperCase();
      if (us.includes('DROP')||us.includes('DELETE')||us.includes('INSERT')||us.includes('UPDATE')||us.includes('ALTER')||us.includes('CREATE')) return Response.json({ error: '仅允许 SELECT' }, { status: 400, headers: corsHeaders });
      try { return Response.json({ results: (await env.DB.prepare(sql).all()).results }, { headers: corsHeaders }); }
      catch (e) { return Response.json({ error: e.message }, { status: 400, headers: corsHeaders }); }
    }
    
    // ========== 照片 ==========
    if (path === '/photos' && request.method === 'POST') {
      const { uploaded_by, title, description, image_url } = await request.json();
      await env.DB.prepare('INSERT INTO photos (uploaded_by, title, description, image_url, created_at) VALUES (?,?,?,?,datetime("now"))').bind(uploaded_by, title, description, image_url).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    if (path === '/photos' && request.method === 'GET') {
      return Response.json((await env.DB.prepare('SELECT id, uploaded_by, title, description, image_url, created_at FROM photos ORDER BY created_at DESC').all()).results, { headers: corsHeaders });
    }
    if (path.startsWith('/photos/') && request.method === 'DELETE') {
      const pid = path.replace('/photos/', '');
      const { requester } = await request.json();
      const photo = await env.DB.prepare('SELECT uploaded_by FROM photos WHERE id = ?').bind(pid).first();
      if (!photo) return Response.json({ error: '不存在' }, { status: 404, headers: corsHeaders });
      const u = await env.DB.prepare("SELECT role FROM classmates WHERE name = ?").bind(requester).first();
      if (photo.uploaded_by !== requester && u?.role !== 'admin') return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
      await env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(pid).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // ========== 签名墙 ==========
    if (path === '/signature-wall' && request.method === 'POST') {
      const { image_data } = await request.json();
      if (image_data.length > 3000000) return Response.json({ error: '图片太大' }, { status: 400, headers: corsHeaders });
      await env.DB.prepare('INSERT OR REPLACE INTO signature_wall (id, image_data, updated_at) VALUES (1, ?, datetime("now"))').bind(image_data).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    if (path === '/signature-wall' && request.method === 'GET') {
      const r = await env.DB.prepare('SELECT image_data, updated_at FROM signature_wall WHERE id = 1').first();
      return Response.json(r ? { image_data: r.image_data, updated_at: r.updated_at } : { image_data: null }, { headers: corsHeaders });
    }
    if (path === '/signature-wall/clear' && request.method === 'DELETE') {
      const { requester } = await request.json();
      const a = await env.DB.prepare("SELECT role FROM classmates WHERE name = ? AND role = 'admin'").bind(requester).first();
      if (!a) return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
      await env.DB.prepare('DELETE FROM signature_wall WHERE id = 1').run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // ========== 歌单 ==========
    if (path === '/songs' && request.method === 'GET') {
      return Response.json((await env.DB.prepare('SELECT id, name, filename, uploaded_by, created_at FROM songs ORDER BY created_at DESC').all()).results, { headers: corsHeaders });
    }
    if (path === '/songs' && request.method === 'POST') {
      const { name, filename, uploaded_by } = await request.json();
      if (!name || !filename) return Response.json({ error: '缺少参数' }, { status: 400, headers: corsHeaders });
      await env.DB.prepare('INSERT INTO songs (name, filename, uploaded_by, created_at) VALUES (?,?,?,datetime("now"))').bind(name, filename, uploaded_by).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    if (path === '/songs/upload' && request.method === 'POST') {
      const fd = await request.formData();
      const file = fd.get('file'), sn = fd.get('song_name'), ft = fd.get('file_type');
      if (!file || !sn) return Response.json({ error: '缺少参数' }, { status: 400, headers: corsHeaders });
      if (!/^[a-zA-Z0-9_\-\u4e00-\u9fa5]+$/.test(sn)) return Response.json({ error: '非法字符' }, { status: 400, headers: corsHeaders });
      if (file.size > 20*1024*1024) return Response.json({ error: '文件过大' }, { status: 400, headers: corsHeaders });
      const ab = await file.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
      const fn = file.name || `${sn}.${ft}`;
      const fp = `songs/${sn}/${fn}`;
      const r = await uploadToGitHub(fp, b64, `上传歌曲: ${sn}`);
      if (r.ok) return Response.json({ success: true, path: fp }, { headers: corsHeaders });
      return Response.json({ error: r.data.message }, { status: 400, headers: corsHeaders });
    }
    
    // ========== 漂流瓶 ==========
    if (path === '/drift-bottles' && request.method === 'POST') {
      const { from_name, to_name, content, open_time } = await request.json();
      if (!from_name||!to_name||!content||!open_time) return Response.json({ error: '缺少参数' }, { status: 400, headers: corsHeaders });
      if (content.length > 1000) return Response.json({ error: '内容过长' }, { status: 400, headers: corsHeaders });
      await env.DB.prepare('INSERT INTO drift_bottles (from_name, to_name, content, open_time, created_at) VALUES (?,?,?,?,datetime("now"))').bind(from_name, to_name, content, open_time).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    if (path === '/drift-bottles/sent' && request.method === 'GET') {
      const name = new URL(request.url).searchParams.get('name');
      if (!name) return Response.json({ error: '缺少姓名' }, { status: 400, headers: corsHeaders });
      return Response.json((await env.DB.prepare('SELECT id, from_name, to_name, content, open_time, is_opened, created_at FROM drift_bottles WHERE from_name = ? ORDER BY created_at DESC').bind(name).all()).results, { headers: corsHeaders });
    }
    if (path === '/drift-bottles/inbox' && request.method === 'GET') {
      const name = new URL(request.url).searchParams.get('name');
      if (!name) return Response.json({ error: '缺少姓名' }, { status: 400, headers: corsHeaders });
      return Response.json((await env.DB.prepare("SELECT id, from_name, to_name, content, open_time, is_opened, created_at FROM drift_bottles WHERE to_name = ? AND open_time <= datetime('now') ORDER BY created_at DESC").bind(name).all()).results, { headers: corsHeaders });
    }
    
    return env.ASSETS.fetch(request);
  }
};
