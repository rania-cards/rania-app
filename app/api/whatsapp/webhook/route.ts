import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // safe default on Vercel

const VERIFY_TOKEN = process.env.META_WHATSAPP_VERIFY_TOKEN;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    // IMPORTANT: return plain text challenge
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  console.log("WHATSAPP_WEBHOOK_EVENT:", JSON.stringify(body, null, 2));
  return NextResponse.json({ received: true }, { status: 200 });
}