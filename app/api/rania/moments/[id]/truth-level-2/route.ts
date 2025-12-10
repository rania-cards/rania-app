/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

import { TruthLevel2Payload } from "@/lib/rania/types";
import { runTruthLevel2 } from "@/lib/rania/service";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * Trigger a Truth Level 2 follow-up question.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    // Await params since it's a Promise in Next.js 15+
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Moment ID is required",
        },
        { status: 400 }
      );
    }

    const body = (await req.json()) as Omit<TruthLevel2Payload, "momentId">;

    // Validate required fields
    if (!body.replyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Reply ID is required",
        },
        { status: 400 }
      );
    }

    if (!body.followupSnippetId && !body.customFollowupText) {
      return NextResponse.json(
        {
          success: false,
          error: "Follow-up snippet or custom text is required",
        },
        { status: 400 }
      );
    }

    const payload: TruthLevel2Payload = {
      momentId: id,
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
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error running Truth Level 2:", {
      message: err?.message,
      code: err?.code,
    });

    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? "Failed to create follow-up",
      },
      { status: 400 }
    );
  }
}