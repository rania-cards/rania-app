/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createReaction } from "@/lib/rania/service";

interface Params {
  id: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    // Await the params promise
    const { id } = await params;
   
    const body = await req.json();
    const result = await createReaction({
      momentId: id,
      replyId: body.replyId,
      reactionText: body.reactionText,
      identity: {
        guestId: body.identity?.guestId ?? req.headers.get("x-rania-guest-id") ?? undefined,
        authUserId: body.identity?.authUserId ?? null,
      },
    });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (err: any) {
    console.error("Error creating reaction", err?.message ?? err);
    return NextResponse.json(
      { success: false, error: err?.message ?? "Unknown error" },
      { status: 400 }
    );
  }
}