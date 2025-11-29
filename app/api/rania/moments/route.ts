/* eslint-disable @typescript-eslint/no-explicit-any */
 import { NextRequest, NextResponse } from "next/server";
import { createMoment } from "@/lib/rania/service";
import { CreateMomentPayload } from "@/lib/rania/types";

/**
 * Create a new RANIA moment.
 * Body: CreateMomentPayload
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateMomentPayload;

    const payload: CreateMomentPayload = {
      ...body,
      identity: {
        guestId: body.identity?.guestId ?? req.headers.get("x-rania-guest-id") ?? undefined,
        authUserId: body.identity?.authUserId ?? null,
      },
    };

    const result = await createMoment(payload);

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ?? "https://raniaonline.com";

    return NextResponse.json(
      {
        success: true,
        momentId: result.id,
        shortCode: result.shortCode,
        url: `${baseUrl}/m/${result.shortCode}`,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error creating moment", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? "Unknown error",
      },
      { status: 400 }
    );
  }
}
