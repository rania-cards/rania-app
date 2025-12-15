/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * GET: Verification endpoint for Meta webhook
 *
 * Meta will call:
 *   GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
 *
 * If the verify_token matches META_WHATSAPP_VERIFY_TOKEN, you return the challenge.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token && token === verifyToken && challenge) {
    console.log("[WhatsApp Webhook] Verified successfully");
    return new Response(challenge, { status: 200 });
  }

  console.warn("[WhatsApp Webhook] Verification failed", { mode, token });
  return new Response("Forbidden", { status: 403 });
}

/**
 * POST: Receive WhatsApp events (messages, statuses, etc.)
 *
 * For now we just log the payload.
 * Later you can:
 *  - match incoming messages to conversations
 *  - trigger flows if users reply inside WhatsApp
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[WhatsApp Webhook] Incoming event:", JSON.stringify(body, null, 2));

    // Always respond 200 OK so Meta knows you received it
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("[WhatsApp Webhook] Error parsing body:", err?.message ?? err);
    return NextResponse.json(
      { success: false, error: "Bad request" },
      { status: 400 },
    );
  }
}