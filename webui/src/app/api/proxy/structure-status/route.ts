import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('http://127.0.0.1:5032/api/structure/status', {
        headers: {
            'Authorization': `Bearer ${process.env.WEBUI_AUTH_TOKEN}`,
            'Cache-Control': 'no-cache'
        }
    });
    if (!res.ok) throw new Error('Failed to fetch status');
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ active: false, currentTask: "Failed to connect to Bot API", error: String(error) }, { status: 500 });
  }
}
