import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const res = await fetch('http://127.0.0.1:5032/api/structure/deploy', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.WEBUI_AUTH_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ })
    });
    if (!res.ok) throw new Error('Deploy failed');
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
