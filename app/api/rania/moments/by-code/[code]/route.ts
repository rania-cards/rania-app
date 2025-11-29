/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getMomentForReceiver } from "@/lib/rania/service";

interface Params {
  params: Promise<{ code: string }>;
}

/**
 * Load a RANIA moment by short code, for the receiver.
 */
export async function GET(req: NextRequest, { params }: Params) {
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

    const data = await getMomentForReceiver(code);

    return NextResponse.json(
      {
        success: true,
        moment: data,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(
      "Error loading moment for code",
      err?.message ?? err
    );

    // We return JSON with success=false so frontend can show a helpful message.
    // Status 200 here avoids Next.js hard 404 page.
    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? "Unknown error",
      },
      { status: 200 }
    );
  }
}