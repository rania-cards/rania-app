/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/rania/polish-text/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type PolishField = "teaser" | "hidden";

type PolishRequestBody = {
  field: PolishField;
  text: string;
  modeKey: string;
  tone: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PolishRequestBody;
    const { field, text, modeKey, tone } = body;

    const trimmed = text?.trim();
    if (!trimmed) {
      throw new Error("Text cannot be empty");
    }

    const systemPrompt = `
You are RANIA, an emotional-writing assistant for a WhatsApp-first Kenyan Gen Z app.

- Keep the text SHORT, punchy, and emotionally charged.
- Do NOT write long paragraphs. Max length ~200 characters for hidden, ~120 for teaser.
- Preserve the original meaning but improve clarity, vibe, and emotional impact.
- Use simple English with slight Kenyan/Gen Z feel when appropriate.
- NEVER be sexual or explicit. Stay safe, respectful, and emotionally honest.
- Mode: ${modeKey}
- Tone: ${tone}
- Field: ${field === "teaser" ? "Teaser (visible)" : "Hidden truth (locked)"}
`;

    const userPrompt = `
Original text:
"${trimmed}"

Rewrite this as a better ${field === "teaser" ? "teaser (what they see first)" : "hidden truth (what they unlock)"} for a RANIA moment.
Return ONLY the rewritten line, no explanations, no quotes.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    const polished =
      completion.choices[0]?.message?.content?.trim() || trimmed;

    return NextResponse.json(
      { success: true, polished },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[polish-text] Error:", err?.message ?? err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? "Failed to polish text",
      },
      { status: 400 },
    );
  }
}