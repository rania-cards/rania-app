/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/rania/service.ts

import { supabaseAdmin } from "../supabaseServer";
import {
  CreateMomentPayload,
  ReplyPayload,
  DeepTruthPayload,
  TruthLevel2Payload,
  Identity,
} from "./types";
import { chargeOrUsePass } from "./payments";
import { generateDeepTruthForMoment } from "./deepTruth";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const PREMIUM_REVEAL_CODE = "PREMIUM_REVEAL";
const DEEP_TRUTH_CODE = "DEEP_TRUTH";
const TRUTH_L2_CODE = "TRUTH_L2";

/**
 * Simple short-code generator for rania_moments.short_code
 */
function generateShortCode(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let res = "";
  for (let i = 0; i < length; i++) {
    res += chars[Math.floor(Math.random() * chars.length)];
  }
  return res;
}

/**
 * Ensure we have a row in rania_identities for this browser / auth user.
 */
export async function ensureIdentity(input: {
  guestId?: string;
  authUserId?: string | null;
}): Promise<Identity> {
  const { guestId, authUserId } = input;

  // Case 1: neither provided – anonymous
  if (!guestId && !authUserId) {
    const { data, error } = await supabaseAdmin
      .from("rania_identities")
      .insert({})
      .select("id")
      .single();
    if (error) throw error;
    return { id: data.id };
  }

  // Case 2: try to find existing identity
  const orFilters = [
    guestId ? `guest_id.eq.${guestId}` : "",
    authUserId ? `auth_user_id.eq.${authUserId}` : "",
  ]
    .filter(Boolean)
    .join(",");

  const { data, error } = await supabaseAdmin
    .from("rania_identities")
    .select("id")
    .or(orFilters)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    return { id: data.id };
  }

  // Case 3: create new identity with whatever data we have
  const { data: created, error: createError } = await supabaseAdmin
    .from("rania_identities")
    .insert({
      auth_user_id: authUserId ?? null,
      guest_id: guestId ?? null,
    })
    .select("id")
    .single();

  if (createError) throw createError;
  return { id: created.id };
}

// -----------------------------------------------------------------------------
// 1) Create Moment
// -----------------------------------------------------------------------------

export async function createMoment(payload: CreateMomentPayload) {
  const identity = await ensureIdentity(payload.identity);

  // 1. Resolve mode_id
  const { data: modeRow, error: modeError } = await supabaseAdmin
    .from("rania_modes")
    .select("id, mode_key")
    .eq("mode_key", payload.modeKey)
    .maybeSingle();

  if (modeError) throw modeError;
  if (!modeRow) throw new Error("Unknown mode");

  // 2. Optional: handle premium reveal payment (we assume Paystack inline already paid)
  let premiumOptionId: string | null = null;

  if (payload.premiumReveal) {
    const { pricingOption } = await chargeOrUsePass({
      identityId: identity.id,
      pricingCode: PREMIUM_REVEAL_CODE,
      momentId: undefined,
      paymentReference: payload.paymentReference,
      skipPayment: payload.skipPaymentCheck ?? false,
    });
    premiumOptionId = pricingOption.id;
  }

  // 3. Generate unique short code
  let shortCode: string;
  for (;;) {
    shortCode = generateShortCode(6);
    const { data, error } = await supabaseAdmin
      .from("rania_moments")
      .select("id")
      .eq("short_code", shortCode)
      .maybeSingle();
    if (error) throw error;
    if (!data) break; // free code
  }

  // 4. Insert moment
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("rania_moments")
    .insert({
      short_code: shortCode,
      mode_id: modeRow.id,
      sender_identity_id: identity.id,
      delivery_format: payload.deliveryFormat,
      teaser_snippet_id: null, // we are using custom text for now
      hidden_snippet_id: null,
      custom_teaser_text: payload.customTeaserText ?? null,
      custom_hidden_text: payload.customHiddenText ?? null,
      is_premium_reveal: payload.premiumReveal,
      premium_reveal_option_id: premiumOptionId,
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .select("id, short_code")
    .single();

  if (insertError) throw insertError;

  // 5. Event log (optional)
  await supabaseAdmin.from("rania_events").insert({
    identity_id: identity.id,
    moment_id: inserted.id,
    event_type: "moment_created",
    properties: { premiumReveal: payload.premiumReveal },
  });

  return {
    id: inserted.id as string,
    shortCode: inserted.short_code as string,
  };
}

// -----------------------------------------------------------------------------
// 2) Get Moment For Receiver (by shortCode)
// -----------------------------------------------------------------------------

export async function getMomentForReceiver(shortCode: string) {
  if (!shortCode || typeof shortCode !== "string") {
    throw new Error("Invalid short code");
  }

  const { data: moment, error } = await supabaseAdmin
    .from("rania_moments")
    .select(
      `
      id,
      short_code,
      mode_id,
      status,
      is_premium_reveal,
      delivery_format,
      custom_teaser_text,
      custom_hidden_text
    `
    )
    .eq("short_code", shortCode)
    .maybeSingle();

  if (error) {
    console.error("Supabase error in getMomentForReceiver:", error);
    throw new Error("Database error");
  }

  if (!moment) {
    throw new Error("Moment not found");
  }

  const teaserText: string = (moment as any).custom_teaser_text ?? "";
  const hiddenText: string = (moment as any).custom_hidden_text ?? "";

  return {
    id: moment.id as string,
    shortCode: moment.short_code as string,
    status: moment.status as string,
    isPremiumReveal: moment.is_premium_reveal as boolean,
    deliveryFormat: moment.delivery_format as string,
    teaserText,
    hasHidden: Boolean(hiddenText),
  };
}

// -----------------------------------------------------------------------------
// 3) Create Reply + Unlock hidden
// -----------------------------------------------------------------------------

export async function createReply(payload: ReplyPayload) {
  const identity = await ensureIdentity(payload.identity);

  const { data: moment, error: momentError } = await supabaseAdmin
    .from("rania_moments")
    .select(
      `
      id,
      short_code,
      custom_hidden_text
    `
    )
    .eq("short_code", payload.shortCode)
    .maybeSingle();

  if (momentError) throw momentError;
  if (!moment) throw new Error("Moment not found");

  // Insert reply
  const { data: reply, error: replyError } = await supabaseAdmin
    .from("rania_replies")
    .insert({
      moment_id: moment.id,
      responder_identity_id: identity.id,
      reply_text: payload.replyText,
      vibe_score: payload.vibeScore ?? null,
    })
    .select("id, reply_text, created_at")
    .single();

  if (replyError) throw replyError;

  await supabaseAdmin.from("rania_events").insert({
    identity_id: identity.id,
    moment_id: moment.id,
    reply_id: reply.id,
    event_type: "reply_created",
    properties: {},
  });

  const hiddenText: string = (moment as any).custom_hidden_text ?? "";

  // Mark completed
  await supabaseAdmin
    .from("rania_moments")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", moment.id);

  return {
    replyId: reply.id as string,
    hiddenText,
  };
}

// -----------------------------------------------------------------------------
// 4) Deep Truth - with payment tracking and event logging
// -----------------------------------------------------------------------------

export async function runDeepTruth(payload: DeepTruthPayload) {
  const identity = await ensureIdentity(payload.identity);

  // 1. Charge or record Deep Truth purchase
  await chargeOrUsePass({
    identityId: identity.id,
    pricingCode: DEEP_TRUTH_CODE,
    momentId: payload.momentId,
    paymentReference: payload.paymentReference,
    skipPayment: payload.skipPaymentCheck ?? false, // must be true when called from Paystack inline
  });

  // 2. Generate Deep Truth text via OpenAI
  const deepTruthText = await generateDeepTruthForMoment(payload.momentId);

  // 3. Optional: log usage event (on top of purchase event)
  await supabaseAdmin.from("rania_events").insert({
    identity_id: identity.id,
    moment_id: payload.momentId,
    event_type: "deep_truth_purchased",
    properties: { source: "receiver_page", from_logic: "runDeepTruth" },
  });

  return { deepTruth: deepTruthText };
}

// -----------------------------------------------------------------------------
// 5) Truth Level 2 (follow-up)
// -----------------------------------------------------------------------------

export async function runTruthLevel2(payload: TruthLevel2Payload) {
  const identity = await ensureIdentity(payload.identity);

  if (!payload.followupSnippetId && !payload.customFollowupText) {
    throw new Error("Follow-up snippet or custom text is required");
  }

  const { pricingOption } = await chargeOrUsePass({
    identityId: identity.id,
    pricingCode: TRUTH_L2_CODE,
    momentId: payload.momentId,
    paymentReference: undefined,
    skipPayment: true, // v0: defer real charging until later
  });

  const { data: followup, error: followupError } = await supabaseAdmin
    .from("rania_followups")
    .insert({
      moment_id: payload.momentId,
      reply_id: payload.replyId,
      followup_snippet_id: payload.followupSnippetId ?? null,
      custom_followup_text: payload.customFollowupText ?? null,
      pricing_option_id: pricingOption.id,
      is_covered_by_pass: false,
      asked_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (followupError) throw followupError;

  return {
    followupId: followup.id as string,
  };
}