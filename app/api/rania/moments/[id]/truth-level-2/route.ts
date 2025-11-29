/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { runTruthLevel2 } from "@/lib/rania/service";
import { TruthLevel2Payload } from "@/lib/rania/types";

interface Params {
  params: { id: string };
}

/**
 * Trigger a Truth Level 2 follow-up question.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const body = (await req.json()) as Omit<TruthLevel2Payload, "momentId">;

    const payload: TruthLevel2Payload = {
      momentId: params.id,
      replyId: body.replyId,
      followupSnippetId: body.followupSnippetId,
      customFollowupText: body.customFollowupText,
      identity: {
        guestId: body.identity?.guestId ?? req.headers.get("x-rania-guest-id") ?? undefined,
        authUserId: body.identity?.authUserId ?? null,
      },
    };

    const result = await runTruthLevel2(payload);

    return NextResponse.json(
      {
        success: true,
        followupId: result.followupId,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error running Truth Level 2 for moment", params.id, err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? "Unknown error",
      },
      { status: 400 }
    );
  }
}
