import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(
      `${process.env.DISCORD_API_URL || "http://127.0.0.1:5032"}/api/delete-message`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WEBUI_AUTH_TOKEN}`,
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) throw new Error(`Bot API error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
