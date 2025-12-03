/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/rania/moments/by-code/[code]/replies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

type RouteParams = {
  code?: string;
  shortCode?: string;
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<RouteParams> },
) {
  try {
    const params = await context.params;
    const shortCode = (params.code ?? params.shortCode ?? "").toString().trim();

    if (!shortCode) {
      throw new Error("Missing short code");
    }

    // 1) Find moment by short_code
    const { data: moment, error: momentError } = await supabaseAdmin
      .from("rania_moments")
      .select("id")
      .eq("short_code", shortCode)
      .maybeSingle();

    if (momentError) throw momentError;
    if (!moment) throw new Error("Moment not found");

    // 2) Fetch replies for this moment
    const { data: replies, error: repliesError } = await supabaseAdmin
      .from("rania_replies")
      .select("id, reply_text, reaction_text, created_at")
      .eq("moment_id", moment.id)
      .order("created_at", { ascending: true });

    if (repliesError) throw repliesError;

    return NextResponse.json(
      {
        success: true,
        replies: replies ?? [],
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Error loading replies for moment", err?.message ?? err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? "Unknown error",
        replies: [],
      },
      { status: 200 },
    );
  }
}
