import type { IncomingMessage, ServerResponse } from 'node:http';

const readBody = (req: IncomingMessage): Promise<Record<string, unknown>> =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });

const json = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') { json(res, 405, { error: 'Method not allowed' }); return; }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) { json(res, 500, { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }); return; }

  const rawUrl = process.env.VITE_SUPABASE_URL ?? '';
  const supabaseUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}.supabase.co`;

  const body = await readBody(req);
  const { email, password, full_name, role_id, role_name, phone, avatar_color } = body as Record<string, string>;

  if (!email || !password || !full_name) {
    json(res, 400, { error: 'email, password, and full_name are required' });
    return;
  }

  try {
    const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      }),
    });

    const authData = await authRes.json() as Record<string, unknown>;
    if (!authRes.ok) {
      json(res, 400, { error: (authData.message ?? authData.msg) ?? 'Failed to create auth user' });
      return;
    }

    const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation,resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: authData.id,
        email,
        full_name,
        role_id: role_id ?? null,
        role_name: role_name ?? 'Agent',
        phone: phone ?? null,
        avatar_color: avatar_color ?? '#1A5FB4',
        is_active: true,
      }),
    });

    const profileData = await profileRes.json() as unknown;
    if (!profileRes.ok) {
      json(res, 400, { error: (profileData as Record<string, unknown>).message ?? 'Failed to create profile' });
      return;
    }

    const profile = Array.isArray(profileData) ? profileData[0] : profileData;
    json(res, 200, { success: true, user: profile });
  } catch (err: unknown) {
    json(res, 500, { error: err instanceof Error ? err.message : 'Internal server error' });
  }
}
