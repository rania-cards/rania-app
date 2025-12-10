/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { submitGuessForMoment } from "@/lib/rania/service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await context.params;
    const body = await req.json();

    const guessText = (body.guessText as string) ?? "";
    const identity = (body.identity as { guestId?: string; authUserId?: string | null }) ?? {
      guestId: undefined,
      authUserId: null,
    };
    const guestId =
      (typeof req.headers.get("x-rania-guest-id") === "string" &&
        req.headers.get("x-rania-guest-id")) ||
      identity.guestId;

    const result = await submitGuessForMoment(code, guessText, {
      guestId: guestId || undefined,
      authUserId: identity.authUserId ?? null,
    });

    return NextResponse.json(
      { success: true, ...result },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[guess] Error:", err?.message ?? err);
    return NextResponse.json(
      { success: false, error: err?.message ?? "Failed to submit guess" },
      { status: 400 },
    );
  }
}