/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/rania/moments/[id]/sender-response/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { ensureIdentity } from "@/lib/rania/service"; // you already have this

type Body = {
  replyId: string;
  senderResponseText: string;
  identity?: {
    guestId?: string;
    authUserId?: string | null;
  };
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: momentId } = await context.params;
    const body = (await req.json()) as Body;

    if (!body.replyId || !body.senderResponseText?.trim()) {
      throw new Error("Missing replyId or senderResponseText");
    }

    const identity = await ensureIdentity(body.identity ?? {});

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("rania_replies")
      .update({
        sender_response_text: body.senderResponseText.trim(),
      })
      .eq("id", body.replyId)
      .eq("moment_id", momentId)
      .select("id")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updated) throw new Error("Reply not found for this moment");

    await supabaseAdmin.from("rania_events").insert({
      identity_id: identity.id,
      moment_id: momentId,
      reply_id: body.replyId,
      event_type: "reply_created",
      properties: { type: "sender_response" },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("[sender-response] Error:", err?.message ?? err);
    return NextResponse.json(
      { success: false, error: err?.message ?? "Unknown error" },
      { status: 400 },
    );
  }
}

// SELECT must now include sender_response_text
