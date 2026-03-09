import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res2 = await fetch(
      `${process.env.DISCORD_API_URL || "http://127.0.0.1:5032"}/api/faction-role-remove`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WEBUI_AUTH_TOKEN}`,
        },
        body: JSON.stringify(body),
      }
    );
    if (!res2.ok) {
      const data = await res2.json().catch(() => ({ message: `HTTP ${res2.status}` }));
      return NextResponse.json({ ok: false, message: data.message || `Error ${res2.status}` }, { status: res2.status });
    }
    const data = await res2.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
