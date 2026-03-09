import { NextRequest, NextResponse } from "next/server";

const DISCORD_API_URL = process.env.DISCORD_API_URL || "http://localhost:5032";
const WEBUI_AUTH_TOKEN = process.env.WEBUI_AUTH_TOKEN || "change_me";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const resp = await fetch(`${DISCORD_API_URL}/api/removal-panel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WEBUI_AUTH_TOKEN}`,
      },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
