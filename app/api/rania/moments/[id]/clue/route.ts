/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { setClueForMoment } from "@/lib/rania/service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const clueText = (body.clueText as string) ?? "";

    const result = await setClueForMoment(id, clueText);

    return NextResponse.json(
      { success: true, ...result },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[clue] Error:", err?.message ?? err);
    return NextResponse.json(
      { success: false, error: err?.message ?? "Failed to set clue" },
      { status: 400 },
    );
  }
}