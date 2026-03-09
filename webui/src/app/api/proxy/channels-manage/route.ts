import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;
    let endpoint = "";
    const payload = { ...body };
    delete payload.action;

    switch (action) {
      case "create-category":
        endpoint = "/api/channels/create-category";
        break;
      case "create":
        endpoint = "/api/channels/create";
        break;
      case "delete":
        endpoint = "/api/channels/delete";
        break;
      case "rename":
        endpoint = "/api/channels/rename";
        break;
      case "move":
        endpoint = "/api/channels/move";
        break;
      default:
        return NextResponse.json({ ok: false, message: "Unknown action" }, { status: 400 });
    }

    const res = await fetch(
      `${process.env.DISCORD_API_URL || "http://127.0.0.1:5032"}${endpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WEBUI_AUTH_TOKEN}`,
        },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) throw new Error(`Bot API error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
