/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/rania/whatsapp.ts
import "server-only";

/**
 * AiSensy Campaign API endpoint
 * This matches your curl:
 *   https://backend.aisensy.com/campaign/t1/api/v2
 */
const AISENSY_CAMPAIGN_API_URL =
  "https://backend.aisensy.com/campaign/t1/api/v2";

export type RaniaNotificationEvent =
  | "moment_replied"
  | "reaction_posted"
  | "deep_truth";

export type SenderNotificationPayload = {
  phone: string;          // raw phone as stored, e.g. "0722..." or "2547..."
  name?: string | null;   // sender name
  event: RaniaNotificationEvent;
  shortCode: string;      // moment shortCode, e.g. "VgcAjG"
};

/**
 * Normalize phone to AiSensy format.
 * Assumes Kenya by default:
 *  - "+2547XXXXXXX" -> "2547XXXXXXX"
 *  - "07XXXXXXX"    -> "2547XXXXXXX"
 *  - "2547XXXXXXX"  -> "2547XXXXXXX"
 */
function normalizePhone(raw: string): string {
  if (!raw) return raw;
  const trimmed = raw.replace(/\s+/g, "");
  if (trimmed.startsWith("+")) return trimmed.slice(1);
  if (trimmed.startsWith("0")) {
    return "254" + trimmed.slice(1);
  }
  return trimmed;
}

/**
 * Build template params for your AiSensy template.
 *
 * IMPORTANT:
 * - You must configure the "Notification" campaign in AiSensy with a template
 *   that expects two parameters (e.g. $Name and $Link), in this order.
 */
function buildTemplateParams(p: SenderNotificationPayload): string[] {
  const name = p.name || "friend";
  const link = `https://www.raniaonline.com/m/${p.shortCode}`;

  // Template example:
  // "Hey $Name, someone just interacted with your RANIA moment. Tap: $Link"
  // -> templateParams = [name, link]
  return [name, link];
}

/**
 * Send WhatsApp notification to sender using AiSensy Campaign API.
 * - Never throws; all errors are logged.
 */
export async function notifySender(p: SenderNotificationPayload) {
  const apiKey = process.env.AISENSY_API_KEY;
  const campaignName =
    process.env.AISENSY_CAMPAIGN_NAME ?? "Notification";

  if (!apiKey || !campaignName) {
    console.warn(
      "[AiSensy] AISENSY_API_KEY or AISENSY_CAMPAIGN_NAME missing. Skipping notification.",
      { payload: p },
    );
    return;
  }

  if (!p.phone) {
    console.warn("[notifySender] Missing phone number", p);
    return;
  }

  const destination = normalizePhone(p.phone);
  const userName = p.name || "RANIA user";
  const templateParams = buildTemplateParams(p);

  const body = {
    apiKey,
    campaignName,
    destination,
    userName,
    templateParams,
    source: "rania-app",
    media: {},
    buttons: [],
    carouselCards: [],
    location: {},
    attributes: {
      event: p.event,
      short_code: p.shortCode,
    },
    // If your template uses $FirstName or similar, you can keep fallback values here.
    paramsFallbackValue: {
      FirstName: userName,
    },
  };

  try {
    const res = await fetch(AISENSY_CAMPAIGN_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // ignore parse error; sometimes APIs return plain text
    }

    if (!res.ok) {
      console.warn("[AiSensy Campaign API] Non-2xx response", {
        status: res.status,
        body: json,
      });
    } else {
      console.log("[AiSensy Campaign API] Notification sent", json);
    }
  } catch (err) {
    console.error("[AiSensy Campaign API] Network / unexpected error", err);
  }
}