/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/rania/deepTruth.ts
import { supabaseAdmin } from "../supabaseServer";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default Deep Truth prompt if none is configured in database
const DEFAULT_DEEP_TRUTH_PROMPT = `You are RANIA, an emotional truth engine that helps people understand deeper connections.

Analyze the emotional exchange and provide a raw, honest insight about:
1. The core vulnerability being expressed
2. What the replies reveal about understanding
3. The deeper truth beneath the surface
4. How connection was created through honesty

Be authentic, Gen Z-friendly, and meaningful. Keep it 2-3 sentences.`;

export async function generateDeepTruthForMoment(momentId: string) {
  if (!momentId) {
    throw new Error("Moment ID is required");
  }

  // 1. Load moment, mode, snippets, replies
  const { data: moment, error: momentError } = await supabaseAdmin
    .from("rania_moments")
    .select(
      `
      id,
      mode_id,
      custom_teaser_text,
      custom_hidden_text,
      teaser_snippet:teaser_snippet_id(text),
      hidden_snippet:hidden_snippet_id(text)
    `
    )
    .eq("id", momentId)
    .maybeSingle();

  if (momentError) throw momentError;
  if (!moment) throw new Error("Moment not found");

  const { data: replies, error: repliesError } = await supabaseAdmin
    .from("rania_replies")
    .select("*")
    .eq("moment_id", momentId)
    .order("created_at", { ascending: true });

  if (repliesError) throw repliesError;

  const { data: modeRow, error: modeError } = await supabaseAdmin
    .from("rania_modes")
    .select("mode_key")
    .eq("id", moment.mode_id)
    .maybeSingle();

  if (modeError) throw modeError;
  if (!modeRow) throw new Error("Mode not found");

  // 2. Load Deep Truth prompt (or use default)
  let basePrompt = DEFAULT_DEEP_TRUTH_PROMPT;
  
  const { data: deepPrompt, error: promptError } = await supabaseAdmin
    .from("rania_deep_truth_prompts")
    .select("prompt_text")
    .eq("mode_id", moment.mode_id)
    .eq("is_active", true)
    .maybeSingle();

  if (promptError) {
    console.warn("Could not fetch Deep Truth prompt from database, using default:", promptError);
  } else if (deepPrompt?.prompt_text) {
    basePrompt = deepPrompt.prompt_text;
  } else {
    console.info("No active Deep Truth prompt found for mode, using default");
  }

  const modeKey = modeRow.mode_key;
  const teaserText =
    moment.custom_teaser_text ?? (moment.teaser_snippet as any)?.text ?? "";
  const hiddenText =
    moment.custom_hidden_text ?? (moment.hidden_snippet as any)?.text ?? "";
  const replyTexts = (replies ?? []).map((r: any) => r.reply_text);

  const system = basePrompt;
  const userContent = [
    `Mode: ${modeKey}`,
    `Sender teaser: ${teaserText}`,
    `Sender hidden: ${hiddenText}`,
    `Replies:`,
    ...replyTexts.map((t: any, i: number) => `  [${i + 1}] ${t}`),
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fixed: was "gpt-4.1-mini"
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const deepTruthText = completion.choices[0]?.message?.content ?? "";

    if (!deepTruthText) {
      throw new Error("No response from OpenAI");
    }

    return deepTruthText;
  } catch (error: any) {
    console.error("Error calling OpenAI for Deep Truth:", {
      momentId,
      message: error?.message,
      code: error?.code,
    });
    throw error;
  }
}