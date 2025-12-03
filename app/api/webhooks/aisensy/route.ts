/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    const {
      event,
      data: {
        from,
        to,
        message,
        messageId,
        timestamp,
        type,
      },
    } = payload;

    if (event === "message:in") {
      console.log("[AiSensy webhook] Incoming message from:", from);
      console.log("Message:", message, "type:", type, "timestamp:", timestamp);

      // In future: parse "from" and message to map to a specific sender/moment
      // and respond automatically if you want.
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("[AiSensy webhook] Error:", err?.message ?? err);
    return NextResponse.json(
      { success: false, error: err?.message ?? "Unknown error" },
      { status: 400 },
    );
  }
}