import { NextResponse } from 'next/server';

const API = process.env.DISCORD_API_URL || 'http://127.0.0.1:5032';
const TOKEN = process.env.WEBUI_AUTH_TOKEN || '';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const url = status ? `${API}/api/role-requests?status=${status}` : `${API}/api/role-requests`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Failed to fetch');
    return NextResponse.json(await res.json());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
