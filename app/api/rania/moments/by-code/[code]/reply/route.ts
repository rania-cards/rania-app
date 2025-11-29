/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createReply } from "@/lib/rania/service";
import { ReplyPayload } from "@/lib/rania/types";

interface Params {
  params: Promise<{ code: string }>;
}

/**
 * Receiver posts a reply to a moment, unlocking hidden text.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    // Await params since it's a Promise in Next.js 15+
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: "Short code is required",
        },
        { status: 400 }
      );
    }

    const body = (await req.json()) as Omit<ReplyPayload, "shortCode">;

    // Validate required fields
    if (!body.replyText || body.replyText.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Reply text is required",
        },
        { status: 400 }
      );
    }

    const payload: ReplyPayload = {
      shortCode: code,
      replyText: body.replyText,
      vibeScore: body.vibeScore ?? null,
      identity: {
        guestId: body.identity?.guestId ?? req.headers.get("x-rania-guest-id") ?? undefined,
        authUserId: body.identity?.authUserId ?? null,
      },
    };

    const result = await createReply(payload);

    return NextResponse.json(
      {
        success: true,
        replyId: result.replyId,
        hiddenText: result.hiddenText,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error creating reply:", {
      message: err?.message,
      cause: err?.cause,
      stack: err?.stack,
      code: err?.code,
    });
    
    // More specific error handling
    let errorMessage = "Failed to create reply";
    
    if (err?.message?.includes("fetch")) {
      errorMessage = "Network error - could not reach service";
      console.error("Fetch error details:", err);
    } else if (err?.message?.includes("ECONNREFUSED")) {
      errorMessage = "Service unavailable - connection refused";
    } else if (err?.message?.includes("ENOTFOUND")) {
      errorMessage = "Service unavailable - DNS resolution failed";
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? err?.message : undefined,
      },
      { status: 400 }
    );
  }
}