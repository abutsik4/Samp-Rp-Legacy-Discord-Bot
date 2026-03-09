import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const channelId = req.nextUrl.searchParams.get("channelId") || "";
    const limit = req.nextUrl.searchParams.get("limit") || "50";
    const res = await fetch(
      `${process.env.DISCORD_API_URL || "http://127.0.0.1:5032"}/api/bot-messages?channelId=${channelId}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WEBUI_AUTH_TOKEN}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );
    if (!res.ok) throw new Error(`Bot API error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
