function json(value, status = 200) {
  return Response.json(value, {status, headers:{'Cache-Control':'no-store'}});
}

async function api(request, env, url) {
  const owner = request.headers.get('oai-authenticated-user-id');
  if (!owner) return json({error:'sign_in_required'}, 401);
  if (request.method === 'GET' && url.pathname === '/api/projects') {
    const {results} = await env.DB.prepare(
      'SELECT id, name, updated_at FROM projects WHERE owner_id = ? ORDER BY updated_at DESC'
    ).bind(owner).all();
    return json({projects:results});
  }
  const route = /^\/api\/projects\/([a-f\d-]{36})$/i.exec(url.pathname);
  if (!route) return json({error:'not_found'}, 404);
  const id = route[1];
  if (request.method === 'GET') {
    const project = await env.DB.prepare(
      'SELECT id, name, code, updated_at FROM projects WHERE owner_id = ? AND id = ?'
    ).bind(owner, id).first();
    return project ? json(project) : json({error:'not_found'}, 404);
  }
  if (request.method !== 'PUT') return json({error:'invalid_method'}, 405);
  if (request.headers.get('Origin') !== url.origin) return json({error:'invalid_origin'}, 403);
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 300000) return json({error:'too_large'}, 413);
    body = JSON.parse(raw);
  } catch {
    return json({error:'invalid_project'}, 400);
  }
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const code = body?.code;
  if (!name || name.length > 80 || typeof code !== 'string' || code.length > 100000) {
    return json({error:'invalid_project'}, 400);
  }
  const updated_at = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO projects (owner_id, id, name, code, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(owner_id, id) DO UPDATE SET name=excluded.name, code=excluded.code, updated_at=excluded.updated_at
  `).bind(owner,id,name,code,updated_at).run();
  return json({id,name,updated_at});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await api(request, env, url);
      } catch (error) {
        console.error('Project storage error', error);
        return json({error:'storage_unavailable'}, 500);
      }
    }
    const asset = Object.hasOwn(assets,url.pathname) ? assets[url.pathname] : null;
    if (!asset || !['HEAD','GET'].includes(request.method)) return new Response('Not found',{status:404});
    return new Response(request.method === 'HEAD' ? null : asset[0], {
      headers:{'Content-Type':asset[1] + '; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}
    });
  }
};
