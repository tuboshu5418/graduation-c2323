export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
    
    // 登录接口
    if (path === '/login' && request.method === 'POST') {
      const { name, password } = await request.json();
      const passwordHash = await sha256(password);
      
      const result = await env.DB.prepare(
        'SELECT id, name FROM classmates WHERE name = ? AND password_hash = ?'
      ).bind(name, passwordHash).first();
      
      if (result) {
        return Response.json({ success: true, user: { id: result.id, name: result.name } }, { headers: corsHeaders });
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
    
    // 获取所有同学列表
    if (path === '/classmates' && request.method === 'GET') {
      const result = await env.DB.prepare('SELECT id, name FROM classmates ORDER BY name').all();
      return Response.json(result.results, { headers: corsHeaders });
    }
    
    // 获取某个同学的联系方式
    if (path.startsWith('/contact/') && request.method === 'GET') {
      const name = decodeURIComponent(path.replace('/contact/', ''));
      const result = await env.DB.prepare(
        'SELECT phone, email, wechat FROM classmates WHERE name = ?'
      ).bind(name).first();
      return Response.json(result || {}, { headers: corsHeaders });
    }
    
    // 更新自己的联系方式
    if (path === '/update-contact' && request.method === 'PUT') {
      const { name, phone, email, wechat } = await request.json();
      await env.DB.prepare(
        'UPDATE classmates SET phone = ?, email = ?, wechat = ?, updated_at = datetime("now") WHERE name = ?'
      ).bind(phone, email, wechat, name).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // 获取给某人的留言
    if (path.startsWith('/messages/') && request.method === 'GET') {
      const toName = decodeURIComponent(path.replace('/messages/', ''));
      const result = await env.DB.prepare(
        'SELECT from_name, content, created_at FROM messages WHERE to_name = ? ORDER BY created_at DESC'
      ).bind(toName).all();
      return Response.json(result.results, { headers: corsHeaders });
    }
    
    // 发表留言
    if (path === '/messages' && request.method === 'POST') {
      const { from_name, to_name, content } = await request.json();
      await env.DB.prepare(
        'INSERT INTO messages (from_name, to_name, content, created_at) VALUES (?, ?, ?, datetime("now"))'
      ).bind(from_name, to_name, content).run();
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // 其他请求返回静态文件
    return env.ASSETS.fetch(request);
  }
};