// lib/rania/payments.ts
import { supabaseAdmin } from "../supabaseServer";

const PREMIUM_REVEAL_CODE = "PREMIUM_REVEAL";
const DEEP_TRUTH_CODE = "DEEP_TRUTH";
const TRUTH_L2_CODE = "TRUTH_L2";
const PASS_24H_CODE = "PASS_24H";
const PASS_7D_CODE = "PASS_7D";

export async function getActivePass(identityId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("rania_passes")
    .select("*")
    .eq("identity_id", identityId)
    .gte("valid_to", now);

  if (error) throw error;
  if (!data || data.length === 0) return null;

  return data[0];
}

export async function ensurePricingOption(code: string) {
  const { data, error } = await supabaseAdmin
    .from("rania_pricing_options")
    .select("*")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Pricing option not found for code: ${code}`);
  return data;
}

/**
 * For v0 we assume client used Paystack inline and only call this AFTER the payment
 * callback (with a valid reference). No direct call to Paystack here.
 */
export async function chargeOrUsePass(opts: {
  identityId: string;
  pricingCode: string;
  momentId?: string;
  paymentReference?: string;
  skipPayment?: boolean;
}) {
  const { identityId, pricingCode, momentId, paymentReference, skipPayment } = opts;

  const pricingOption = await ensurePricingOption(pricingCode);

  // If pricing option is a pass, this function shouldn't be used; use a dedicated pass activator.
  if (pricingOption.pricing_type === "pass") {
    throw new Error("Use dedicated pass activation for pass-type pricing options.");
  }

  // Check if active pass covers it
  const activePass = await getActivePass(identityId);
  if (activePass) {
    await supabaseAdmin.from("rania_events").insert({
      identity_id: identityId,
      moment_id: momentId ?? null,
      event_type:
        pricingCode === PREMIUM_REVEAL_CODE
          ? "premium_reveal_purchased"
          : pricingCode === DEEP_TRUTH_CODE
          ? "deep_truth_purchased"
          : "truth_l2_purchased",
      properties: { covered_by_pass: true, pricing_code: pricingCode },
    });

    return { coveredByPass: true, pricingOption };
  }

  // v0: we TRUST Paystack inline callback on the frontend
  if (!skipPayment) {
    throw new Error("Payment must be handled via Paystack inline before calling chargeOrUsePass.");
  }

  const { error: purchaseError } = await supabaseAdmin.from("rania_purchases").insert({
    identity_id: identityId,
    moment_id: momentId ?? null,
    pricing_option_id: pricingOption.id,
    provider: "PAYSTACK_INLINE",
    provider_ref: paymentReference ?? null,
    amount_kes: pricingOption.price_kes,
    currency: "KES",
    status: "success",
    raw_payload: {},
  });

  if (purchaseError) throw purchaseError;

  await supabaseAdmin.from("rania_events").insert({
    identity_id: identityId,
    moment_id: momentId ?? null,
    event_type:
      pricingCode === PREMIUM_REVEAL_CODE
        ? "premium_reveal_purchased"
        : pricingCode === DEEP_TRUTH_CODE
        ? "deep_truth_purchased"
        : "truth_l2_purchased",
    properties: {
      covered_by_pass: false,
      pricing_code: pricingCode,
      payment_reference: paymentReference ?? null,
    },
  });

  return { coveredByPass: false, pricingOption };
}
