import { NextResponse } from 'next/server';
const API = process.env.DISCORD_API_URL || 'http://127.0.0.1:5032';
const TOKEN = process.env.WEBUI_AUTH_TOKEN || '';

export async function GET() {
  try {
    const res = await fetch(`${API}/api/structure/live`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Failed');
    return NextResponse.json(await res.json());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
