/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/rania/moments/[id]/hidden/route.ts
import { NextRequest, NextResponse } from "next/server";
import { addHiddenMessage } from "@/lib/rania/service";
import type { AddHiddenMessagePayload } from "@/lib/rania/types";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await req.json()) as Omit<AddHiddenMessagePayload, "momentId">;

    const payload: AddHiddenMessagePayload = {
      momentId: id,
      fullHiddenText: body.fullHiddenText,
      unlockPriceKes: body.unlockPriceKes ?? 20,
    };

    const result = await addHiddenMessage(payload);

    return NextResponse.json(
      { success: true, ...result },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Error adding hidden message", err?.message ?? err);
    return NextResponse.json(
      { success: false, error: err?.message ?? "Unknown error" },
      { status: 400 },
    );
  }
}
