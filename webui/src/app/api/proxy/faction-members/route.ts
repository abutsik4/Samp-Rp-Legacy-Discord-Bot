import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const factionTag = req.nextUrl.searchParams.get("factionTag") || "";
    const res2 = await fetch(
      `${process.env.DISCORD_API_URL || "http://127.0.0.1:5032"}/api/faction-members?factionTag=${encodeURIComponent(factionTag)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WEBUI_AUTH_TOKEN}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );
    if (!res2.ok) throw new Error(`Bot API error: ${res2.status}`);
    const data = await res2.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
