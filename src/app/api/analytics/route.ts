import { NextResponse } from "next/server";
import { sendServerEvent } from "@/lib/analytics/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, properties, userId } = body || {};
    if (!event) return NextResponse.json({ error: "event required" }, { status: 400 });

    await sendServerEvent(event, properties || {}, userId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "error" }, { status: 500 });
  }
}

