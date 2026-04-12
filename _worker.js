export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    async function sha256(message) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // 登录
    if (path === '/login' && request.method === 'POST') {
      const { name, password } = await request.json();
      const passwordHash = await sha256(password);
      
      const result = await env.DB.prepare(
        'SELECT id, name, role, avatar FROM classmates WHERE name = ? AND password_hash = ?'
      ).bind(name, passwordHash).first();
      
      if (result) {
        return Response.json({ 
          success: true, 
          user: { id: result.id, name: result.name, role: result.role, avatar: result.avatar || '' }
        }, { headers: corsHeaders });
      }
      return Response.json({ success: false, error: '姓名或密码错误' }, { status: 401, headers: corsHeaders });
    }
    
    // 修改密码
    if (path === '/change-password' && request.method === 'PUT') {
      const { name, oldPassword, newPassword } = await request.json();
      const oldHash = await sha256(oldPassword);
      
      const user = await env.DB.prepare(
        'SELECT id FROM classmates WHERE name = ? AND password_hash = ?'
      ).bind(name, oldHash).first();
      
      if (!user) {
        return Response.json({ success: false, error: '原密码错误' }, { status: 401, headers: corsHeaders });
      }
      
      const newHash = await sha256(newPassword);
      await env.DB.prepare(
        'UPDATE classmates SET password_hash = ? WHERE name = ?'
      ).bind(newHash, name).run();
      
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // 更新头像
    if (path === '/update-avatar' && request.method === 'PUT') {
      const { name, avatar } = await request.json();
      await env.DB.prepare(
        'UPDATE classmates SET avatar = ? WHERE name = ?'
      ).bind(avatar, name).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // 获取同学列表（用于下拉框）
    if (path === '/classmates-list' && request.method === 'GET') {
      const result = await env.DB.prepare(
        'SELECT name FROM classmates ORDER BY name'
      ).all();
      return Response.json(result.results, { headers: corsHeaders });
    }
    
    // 获取同学（学生+admin）
    if (path === '/classmates' && request.method === 'GET') {
      const result = await env.DB.prepare(
        "SELECT id, name, avatar FROM classmates WHERE role IN ('student', 'admin') ORDER BY name"
      ).all();
      return Response.json(result.results, { headers: corsHeaders });
    }
    
    // 获取老师
    if (path === '/teachers' && request.method === 'GET') {
      const result = await env.DB.prepare(
        "SELECT id, name, role, avatar, subject FROM classmates WHERE role = 'teacher' ORDER BY name"
      ).all();
      return Response.json(result.results, { headers: corsHeaders });
    }
    
    // 获取联系方式
    if (path.startsWith('/contact/') && request.method === 'GET') {
      const name = decodeURIComponent(path.replace('/contact/', ''));
      const result = await env.DB.prepare(
        'SELECT phone, email, wechat, role, avatar, subject FROM classmates WHERE name = ?'
      ).bind(name).first();
      return Response.json(result || {}, { headers: corsHeaders });
    }
    
    // 更新联系方式
    if (path === '/update-contact' && request.method === 'PUT') {
      const { name, phone, email, wechat } = await request.json();
      await env.DB.prepare(
        'UPDATE classmates SET phone = ?, email = ?, wechat = ?, updated_at = datetime("now") WHERE name = ?'
      ).bind(phone, email, wechat, name).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // 管理员更新任意用户信息
    if (path === '/admin/update-user' && request.method === 'PUT') {
      const { requester, targetName, phone, email, wechat, role } = await request.json();
      
      const admin = await env.DB.prepare(
        "SELECT role FROM classmates WHERE name = ? AND role = 'admin'"
      ).bind(requester).first();
      if (!admin) {
        return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
      }
      
      await env.DB.prepare(
        'UPDATE classmates SET phone = ?, email = ?, wechat = ?, role = ?, updated_at = datetime("now") WHERE name = ?'
      ).bind(phone, email, wechat, role, targetName).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // 管理员添加用户
    if (path === '/admin/add-user' && request.method === 'POST') {
      const { requester, name, role, phone, email, wechat } = await request.json();
      
      const admin = await env.DB.prepare(
        "SELECT role FROM classmates WHERE name = ? AND role = 'admin'"
      ).bind(requester).first();
      if (!admin) {
        return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
      }
      
      const defaultHash = 'bcb15f821479b4d5772bd0ca866c00ad5f926e3580720659cc80d39c9d09802a';
      await env.DB.prepare(
        'INSERT INTO classmates (name, password_hash, role, phone, email, wechat) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(name, defaultHash, role, phone, email, wechat).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // 管理员删除用户
    if (path === '/admin/delete-user' && request.method === 'DELETE') {
      const { requester, targetName } = await request.json();
      
      const admin = await env.DB.prepare(
        "SELECT role FROM classmates WHERE name = ? AND role = 'admin'"
      ).bind(requester).first();
      if (!admin) {
        return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
      }
      
      if (requester === targetName) {
        return Response.json({ error: '不能删除自己' }, { status: 400, headers: corsHeaders });
      }
      
      await env.DB.prepare('DELETE FROM classmates WHERE name = ?').bind(targetName).run();
      await env.DB.prepare('DELETE FROM messages WHERE from_name = ? OR to_name = ?').bind(targetName, targetName).run();
      await env.DB.prepare('DELETE FROM feedbacks WHERE from_name = ? OR to_name = ?').bind(targetName, targetName).run();
      await env.DB.prepare('DELETE FROM photos WHERE uploaded_by = ?').bind(targetName).run();
      
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // 获取留言
    if (path.startsWith('/messages/') && request.method === 'GET') {
      const toName = decodeURIComponent(path.replace('/messages/', ''));
      const result = await env.DB.prepare(
        'SELECT id, from_name, content, created_at FROM messages WHERE to_name = ? ORDER BY created_at DESC'
      ).bind(toName).all();
      return Response.json(result.results, { headers: corsHeaders });
    }
    
    // 发表留言
    if (path === '/messages' && request.method === 'POST') {
      const { from_name, to_name, content, requester } = await request.json();
      
      if (requester && requester !== from_name) {
        const admin = await env.DB.prepare(
          "SELECT role FROM classmates WHERE name = ? AND role = 'admin'"
        ).bind(requester).first();
        if (!admin) {
          return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
        }
      }
      
      await env.DB.prepare(
        'INSERT INTO messages (from_name, to_name, content, created_at) VALUES (?, ?, ?, datetime("now"))'
      ).bind(from_name, to_name, content).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // 删除留言（管理员）
    if (path === '/admin/delete-message' && request.method === 'DELETE') {
      const { requester, messageId } = await request.json();
      
      const admin = await env.DB.prepare(
        "SELECT role FROM classmates WHERE name = ? AND role = 'admin'"
      ).bind(requester).first();
      if (!admin) {
        return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
      }
      
      await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(messageId).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // 发表评价/感谢
    if (path === '/feedback' && request.method === 'POST') {
      const { from_name, from_role, to_name, to_role, content, type } = await request.json();
      await env.DB.prepare(
        'INSERT INTO feedbacks (from_name, from_role, to_name, to_role, content, type, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))'
      ).bind(from_name, from_role, to_name, to_role, content, type).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // 获取评价/感谢
    if (path.startsWith('/feedback/') && request.method === 'GET') {
      const toName = decodeURIComponent(path.replace('/feedback/', ''));
      const urlParams = new URL(request.url).searchParams;
      const type = urlParams.get('type') || 'all';
      
      let query = 'SELECT id, from_name, from_role, content, type, created_at FROM feedbacks WHERE to_name = ?';
      let params = [toName];
      
      if (type !== 'all') {
        query += ' AND type = ?';
        params.push(type);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const result = await env.DB.prepare(query).bind(...params).all();
      return Response.json(result.results, { headers: corsHeaders });
    }
    
    // 获取所有数据（管理员）
    if (path === '/admin/all-data' && request.method === 'GET') {
      const urlParams = new URL(request.url).searchParams;
      const requester = urlParams.get('requester');
      
      const user = await env.DB.prepare(
        "SELECT role FROM classmates WHERE name = ? AND role = 'admin'"
      ).bind(requester).first();
      
      if (!user) {
        return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
      }
      
      const users = await env.DB.prepare(
        'SELECT id, name, role, phone, email, wechat, avatar, subject, updated_at FROM classmates ORDER BY name'
      ).all();
      
      const messages = await env.DB.prepare(
        'SELECT id, from_name, to_name, content, created_at FROM messages ORDER BY created_at DESC'
      ).all();
      
      const feedbacks = await env.DB.prepare(
        'SELECT id, from_name, from_role, to_name, to_role, content, type, created_at FROM feedbacks ORDER BY created_at DESC'
      ).all();
      
      const photos = await env.DB.prepare(
        'SELECT id, uploaded_by, title, description, image_url, created_at FROM photos ORDER BY created_at DESC'
      ).all();
      
      return Response.json({
        users: users.results,
        messages: messages.results,
        feedbacks: feedbacks.results,
        photos: photos.results
      }, { headers: corsHeaders });
    }
    
    // 上传照片
    if (path === '/photos' && request.method === 'POST') {
      const { uploaded_by, title, description, image_url } = await request.json();
      await env.DB.prepare(
        'INSERT INTO photos (uploaded_by, title, description, image_url, created_at) VALUES (?, ?, ?, ?, datetime("now"))'
      ).bind(uploaded_by, title, description, image_url).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // 获取照片
    if (path === '/photos' && request.method === 'GET') {
      const result = await env.DB.prepare(
        'SELECT id, uploaded_by, title, description, image_url, created_at FROM photos ORDER BY created_at DESC'
      ).all();
      return Response.json(result.results, { headers: corsHeaders });
    }
    
    // 删除照片
    if (path.startsWith('/photos/') && request.method === 'DELETE') {
      const photoId = path.replace('/photos/', '');
      const { requester } = await request.json();
      
      const photo = await env.DB.prepare(
        'SELECT uploaded_by FROM photos WHERE id = ?'
      ).bind(photoId).first();
      
      if (!photo) {
        return Response.json({ error: '照片不存在' }, { status: 404, headers: corsHeaders });
      }
      
      const user = await env.DB.prepare(
        "SELECT role FROM classmates WHERE name = ?"
      ).bind(requester).first();
      
      if (photo.uploaded_by !== requester && user?.role !== 'admin') {
        return Response.json({ error: '权限不足' }, { status: 403, headers: corsHeaders });
      }
      
      await env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(photoId).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    return env.ASSETS.fetch(request);
  }
};
