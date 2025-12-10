/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

import { DeepTruthPayload } from "@/lib/rania/types";
import { runDeepTruth } from "@/lib/rania/service";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * Run Deep Truth mode for a moment – paid and tracked.
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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid moment ID format",
        },
        { status: 400 }
      );
    }

    const body = (await req.json()) as Omit<DeepTruthPayload, "momentId">;

    const payload: DeepTruthPayload = {
      momentId: id,
      identity: {
        guestId: body.identity?.guestId ?? req.headers.get("x-rania-guest-id") ?? undefined,
        authUserId: body.identity?.authUserId ?? null,
      },
      paymentReference: body.paymentReference,
      skipPaymentCheck: body.skipPaymentCheck,
      mId: function (mId: any): unknown {
        throw new Error("Function not implemented.");
      }
    };

    const result = await runDeepTruth(payload);

    return NextResponse.json(
      {
        success: true,
        deepTruth: result.deepTruth,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error running Deep Truth:", {
      message: err?.message,
      code: err?.code,
    });

    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? "Failed to generate Deep Truth",
      },
      { status: 400 }
    );
  }
}