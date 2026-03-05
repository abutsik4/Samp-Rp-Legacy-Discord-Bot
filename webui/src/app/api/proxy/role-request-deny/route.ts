import { NextResponse } from 'next/server';

const API = process.env.DISCORD_API_URL || 'http://127.0.0.1:5032';
const TOKEN = process.env.WEBUI_AUTH_TOKEN || '';

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    const res = await fetch(`${API}/api/role-requests/${id}/deny`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
