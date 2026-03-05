import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('http://127.0.0.1:5032/api/channels', {
      headers: {
        'Authorization': `Bearer ${process.env.WEBUI_AUTH_TOKEN}`,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Failed to fetch channels');
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
