/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/rania/service.ts

import { supabaseAdmin } from "../supabaseServer"

import {
  CreateMomentPayload,
  ReplyPayload,
  DeepTruthPayload,
  TruthLevel2Payload,
  Identity,
  HiddenUnlockPayload,
  AddHiddenMessagePayload,
} from "./types";
import {
  chargeOrUsePass,
  HIDDEN_UNLOCK_CODE,
} from "./payments";
import { generateDeepTruthForMoment } from "./deepTruth";
import { notifySender } from "./whatsapp";


// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const PREMIUM_REVEAL_CODE = "PREMIUM_REVEAL";
const DEEP_TRUTH_CODE = "DEEP_TRUTH";
const TRUTH_L2_CODE = "TRUTH_L2";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function buildHiddenPreview(fullText: string, maxChars = 140): string {
  const normalized = fullText.trim();
  if (!normalized) return "";

  // Try to cut at first sentence-ending punctuation.
  const sentenceEndMatch = normalized.match(/(.+?[.!?])( |$)/);
  if (sentenceEndMatch && sentenceEndMatch[1].length <= maxChars) {
    return sentenceEndMatch[1];
  }

  // Fallback: cut at maxChars and add ellipsis
  if (normalized.length <= maxChars) return normalized;
  return normalized.slice(0, maxChars) + "…";
}

/**
 * Simple short-code generator for rania_moments.short_code
 */
function generateShortCode(length = 6): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
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
// 1) Create Moment (sender is free; teaser only)
// -----------------------------------------------------------------------------

export async function createMoment(payload: CreateMomentPayload) {
  const identity = await ensureIdentity(payload.identity);

  // Resolve mode_id
  const { data: modeRow, error: modeError } = await supabaseAdmin
    .from("rania_modes")
    .select("id, mode_key")
    .eq("mode_key", payload.modeKey)
    .maybeSingle();

  if (modeError) throw modeError;
  if (!modeRow) throw new Error("Unknown mode");

  // Optional: premium reveal (not used for hidden unlock KES 20, but kept for compatibility)
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

  // Generate unique short code
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

  // Insert moment
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
      custom_hidden_text: payload.customHiddenText ?? null, // legacy, not used by new flow
      hidden_full_text: null,
      hidden_preview_text: null,
      is_hidden_locked: false,
      hidden_unlock_price_kes: null,
      is_premium_reveal: payload.premiumReveal,
      premium_reveal_option_id: premiumOptionId,
      status: "sent",
      sent_at: new Date().toISOString(),
      sender_name: payload.senderName ?? null,
      sender_phone: payload.senderPhone ?? null,
    })
    .select("id, short_code")
    .single();

  if (insertError) throw insertError;

  // Event log
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
// 2) Sender adds hidden message after reply (locks at KES 20)
// -----------------------------------------------------------------------------

export async function addHiddenMessage(payload: AddHiddenMessagePayload) {
  const { momentId, fullHiddenText, unlockPriceKes } = payload;
  const trimmed = fullHiddenText.trim();
  if (!trimmed) {
    throw new Error("Hidden message cannot be empty");
  }

  const preview = buildHiddenPreview(trimmed);

  const { data: updated, error } = await supabaseAdmin
    .from("rania_moments")
    .update({
      hidden_full_text: trimmed,
      hidden_preview_text: preview,
      is_hidden_locked: true,
      hidden_unlock_price_kes: unlockPriceKes ?? 20,
    })
    .eq("id", momentId)
    .select("id, short_code, hidden_preview_text, hidden_unlock_price_kes")
    .maybeSingle();

  if (error) throw error;
  if (!updated) throw new Error("Moment not found");

  return {
    id: updated.id as string,
    shortCode: updated.short_code as string,
    hiddenPreview: updated.hidden_preview_text as string,
    priceKes: (updated.hidden_unlock_price_kes ?? 20) as number,
  };
}

// -----------------------------------------------------------------------------
// 3) Get Moment For Receiver (by shortCode)
// -----------------------------------------------------------------------------

export async function getMomentForReceiver(shortCode: string) {
  const code = (shortCode ?? "").toString().trim();
  if (!code) throw new Error("Moment not found");

  const { data: moment, error } = await supabaseAdmin
    .from("rania_moments")
    .select(
      `
      id,
      short_code,
      status,
      is_premium_reveal,
      delivery_format,
      custom_teaser_text,
      custom_hidden_text,
      hidden_preview_text,
      is_hidden_locked,
      hidden_unlock_price_kes
    `,
    )
    .eq("short_code", code)
    .maybeSingle();

  if (error) {
    console.error("Supabase error in getMomentForReceiver:", error);
    throw new Error("Database error");
  }

  if (!moment) throw new Error("Moment not found");

  const teaserText = (moment as any).custom_teaser_text ?? "";
  const legacyHidden = (moment as any).custom_hidden_text ?? "";
  const hiddenPreview = (moment as any).hidden_preview_text ?? null;
  const isHiddenLocked = !!(moment as any).is_hidden_locked;
  const priceKes =
    (moment as any).hidden_unlock_price_kes !== null
      ? (moment as any).hidden_unlock_price_kes
      : 20;

  return {
    id: moment.id as string,
    shortCode: moment.short_code as string,
    status: moment.status as string,
    isPremiumReveal: moment.is_premium_reveal as boolean,
    deliveryFormat: moment.delivery_format as string,
    teaserText,
    hasHidden: Boolean(legacyHidden || hiddenPreview),
    hiddenPreview: hiddenPreview || legacyHidden || "",
    isHiddenLocked,
    hiddenUnlockPriceKes: priceKes as number,
  };
}

// -----------------------------------------------------------------------------
// 4) First Reply (receiver free) – triggers WhatsApp to sender
// -----------------------------------------------------------------------------

export async function createReply(payload: ReplyPayload) {
  const identity = await ensureIdentity(payload.identity);

  const { data: moment, error: momentError } = await supabaseAdmin
    .from("rania_moments")
    .select(
      `
      id,
      short_code,
      custom_hidden_text,
      sender_phone,
      sender_name
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
    properties: { type: "unlock" },
  });

  // Mark moment as awaiting hidden truth / reaction
  await supabaseAdmin
    .from("rania_moments")
    .update({ status: "awaiting_reply" })
    .eq("id", moment.id);

  // Notify sender (non-fatal)
  if ((moment as any).sender_phone) {
    await notifySender({
      phone: (moment as any).sender_phone,
      name: (moment as any).sender_name ?? null,
      event: "moment_replied",
      shortCode: moment.short_code,
    });
  }

  // UI shouldn't use this; hidden truth is added later via addHiddenMessage.
  const hiddenText: string = (moment as any).custom_hidden_text ?? "";

  return {
    replyId: reply.id as string,
    hiddenText,
  };
}
// -----------------------------------------------------------------------------

export async function unlockHiddenForIdentity(
  payload: HiddenUnlockPayload,
) {
  const identity = await ensureIdentity(payload.identity);

  // 1) Check moment and lock status
  const { data: moment, error: momentError } = await supabaseAdmin
    .from("rania_moments")
    .select(
      `
      id,
      short_code,
      hidden_full_text,
      is_hidden_locked,
      hidden_unlock_price_kes
    `,
    )
    .eq("id", payload.momentId)
    .maybeSingle();

  if (momentError) throw momentError;
  if (!moment) throw new Error("Moment not found");

  if (!(moment as any).is_hidden_locked) {
    // Already unlocked (or never locked) – just return full text
    return {
      hiddenFullText: (moment as any).hidden_full_text ?? "",
    };
  }

  // 2) See if identity already unlocked it
  const { data: existingUnlock, error: unlockError } = await supabaseAdmin
    .from("rania_hidden_unlocks")
    .select("id")
    .eq("moment_id", payload.momentId)
    .eq("identity_id", identity.id)
    .maybeSingle();

  if (unlockError) throw unlockError;

  if (!existingUnlock) {
    // 3) Charge or record payment via pricing option HIDDEN_UNLOCK
    await chargeOrUsePass({
      identityId: identity.id,
      pricingCode: HIDDEN_UNLOCK_CODE,
      momentId: payload.momentId,
      paymentReference: payload.paymentReference,
      skipPayment: payload.skipPaymentCheck ?? false,
    });

    // 4) Insert unlock record
    const { error: insertUnlockError } = await supabaseAdmin
      .from("rania_hidden_unlocks")
      .insert({
        moment_id: payload.momentId,
        identity_id: identity.id,
        provider: "PAYSTACK_INLINE",
        provider_ref: payload.paymentReference,
        amount_kes:
          (moment as any).hidden_unlock_price_kes ?? 20,
        currency: "KES",
      });

    if (insertUnlockError) throw insertUnlockError;
  }

  // 5) Return full text
  const fullText = (moment as any).hidden_full_text ?? "";

  return {
    hiddenFullText: fullText,
  };
}

// -----------------------------------------------------------------------------
// 6) Reaction to hidden truth (second reply, free)
// -----------------------------------------------------------------------------

export async function createReaction(input: {
  momentId: string;
  replyId: string;
  reactionText: string;
  identity: { guestId?: string; authUserId?: string | null };
}) {
  const identity = await ensureIdentity(input.identity);

  if (!input.reactionText.trim()) {
    throw new Error("Reaction cannot be empty");
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("rania_replies")
    .update({
      reaction_text: input.reactionText.trim(),
      has_reaction: true,
    })
    .eq("id", input.replyId)
    .eq("moment_id", input.momentId)
    .select("id")
    .single();

  if (updateError) throw updateError;
  if (!updated) throw new Error("Reply not found for this moment");

  const { data: fullMoment, error: fullMomentError } = await supabaseAdmin
    .from("rania_moments")
    .select("id, short_code, sender_phone, sender_name")
    .eq("id", input.momentId)
    .maybeSingle();

  if (fullMomentError) throw fullMomentError;

  if (fullMoment?.sender_phone) {
    await notifySender({
      phone: fullMoment.sender_phone,
      name: fullMoment.sender_name ?? null,
      event: "reaction_posted",
      shortCode: fullMoment.short_code,
    });
  }

  await supabaseAdmin
    .from("rania_moments")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.momentId);

  await supabaseAdmin.from("rania_events").insert({
    identity_id: identity.id,
    moment_id: input.momentId,
    reply_id: input.replyId,
    event_type: "reply_created",
    properties: { type: "reaction" },
  });

  return { ok: true };
}
// 7) Deep Truth - paid, with tracking & AiSensy
// -----------------------------------------------------------------------------

export async function runDeepTruth(payload: DeepTruthPayload) {
  const identity = await ensureIdentity(payload.identity);

  // 1. Charge or record Deep Truth purchase
  await chargeOrUsePass({
    identityId: identity.id,
    pricingCode: DEEP_TRUTH_CODE,
    momentId: payload.momentId,
    paymentReference: payload.paymentReference,
    skipPayment: payload.skipPaymentCheck ?? false, // true when Paystack inline already succeeded
  });

  // 2. Fetch moment so we know who to notify
  const { data: fullMoment, error: fullMomentError } = await supabaseAdmin
    .from("rania_moments")
    .select("id, short_code, sender_phone, sender_name")
    .eq("id", payload.momentId)
    .maybeSingle();

  if (fullMomentError) throw fullMomentError;

  // 3. Notify sender via AiSensy direct API (optional but powerful)
  // "Hey, someone ran a Deep Breakdown on your moment"
  if (fullMoment?.sender_phone) {
    await notifySender({
      phone: fullMoment.sender_phone,
      name: fullMoment.sender_name ?? null,
      event: "deep_truth",
      shortCode: fullMoment.short_code,
    });
   }

  // 4. Generate Deep Truth text via OpenAI
  const deepTruthText = await generateDeepTruthForMoment(payload.momentId);

  // 5. Log event
  await supabaseAdmin.from("rania_events").insert({
    identity_id: identity.id,
    moment_id: payload.momentId,
    event_type: "deep_truth_purchased",
    properties: {
      source: "receiver_page",
      from_logic: "runDeepTruth",
    },
  });

  return { deepTruth: deepTruthText };
}
// -----------------------------------------------------------------------------
// 8) Truth Level 2 (follow-up) - optional
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
    skipPayment: true, // v0: treat as covered / not enforced
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
