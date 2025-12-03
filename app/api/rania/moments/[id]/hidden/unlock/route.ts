/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { unlockHiddenForIdentity } from "@/lib/rania/service";
import { HiddenUnlockPayload } from "@/lib/rania/types";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await req.json()) as Omit<HiddenUnlockPayload, "momentId">;

    if (!body.paymentReference || !body.paymentReference.trim()) {
      throw new Error("Missing payment reference");
    }

    const payload: HiddenUnlockPayload = {
      momentId: id,
      identity: {
        guestId: body.identity?.guestId ?? req.headers.get("x-rania-guest-id") ?? undefined,
        authUserId: body.identity?.authUserId ?? null,
      },
      paymentReference: body.paymentReference.trim(),
      skipPaymentCheck: body.skipPaymentCheck ?? false,
    };

    const result = await unlockHiddenForIdentity(payload);

    return NextResponse.json(
      { success: true, hiddenFullText: result.hiddenFullText },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Error unlocking hidden text", err?.message ?? err);
    return NextResponse.json(
      { success: false, error: err?.message ?? "Unknown error" },
      { status: 400 },
    );
  }
}
