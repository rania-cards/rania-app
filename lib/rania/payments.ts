// lib/rania/payments.ts
import { supabaseAdmin } from "../supabaseServer";

const PREMIUM_REVEAL_CODE = "PREMIUM_REVEAL";
const DEEP_TRUTH_CODE = "DEEP_TRUTH";
const TRUTH_L2_CODE = "TRUTH_L2";
export const HIDDEN_UNLOCK_CODE = "HIDDEN_UNLOCK";

// ...

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
export async function chargeOrUsePass(opts: {
  identityId: string;
  pricingCode: string;
  momentId?: string;
  paymentReference?: string;
  skipPayment?: boolean;
}) {
  const { identityId, pricingCode, momentId, paymentReference, skipPayment } = opts;

  const pricingOption = await ensurePricingOption(pricingCode);

  // Pass logic omitted for brevity...

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
