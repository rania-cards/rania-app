/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/rania/whatsapp.ts
import "server-only";

/**
 * WhatsApp Cloud API client for RANIA
 *
 * Uses Meta's Cloud API with approved templates for outbound notifications.
 *
 * Required env:
 * - META_WHATSAPP_PHONE_NUMBER_ID
 * - META_WHATSAPP_TOKEN
 * - META_WHATSAPP_TEMPLATE_NAME (your approved template name)
 */

const META_WHATSAPP_API_BASE = "https://graph.facebook.com/v21.0";

export type RaniaNotificationEvent =
  | "moment_replied"
  | "reaction_posted"
  | "deep_truth";

export type SenderNotificationPayload = {
  phone: string;
  name?: string | null;
  event: RaniaNotificationEvent;
  shortCode: string;
  replierName?: string;      // NEW: who replied/reacted
  messagePreview?: string;   // NEW: preview of reply/reaction
};

/**
 * Normalize phone for WhatsApp international format (no '+' sign).
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
 * Build template parameters based on event type.
 * 
 * Template structure (your approved template):
 * {{1}} replied to your message on RANIA.
 * "{{2}}"
 * View conversation: {{3}}
 */
function buildTemplateParams(p: SenderNotificationPayload): Array<{type: string; text: string}> {
  const link = `https://www.raniaonline.com/moments/manage/${p.shortCode}`;
  const replierName = p.replierName || p.name || "Someone";
  
  let actionText = "";
  switch (p.event) {
    case "moment_replied":
      actionText = p.messagePreview || "replied to your moment";
      break;
    case "reaction_posted":
      actionText = p.messagePreview || "reacted to your hidden truth";
      break;
    case "deep_truth":
      actionText = "ran a Deep Breakdown on your moment";
      break;
    default:
      actionText = "interacted with your moment";
  }

  // Must match your template's {{1}}, {{2}}, {{3}} order
  return [
    { type: "text", text: replierName },           // {{1}}
    { type: "text", text: actionText },            // {{2}}
    { type: "text", text: link }                   // {{3}}
  ];
}

/**
 * Send WhatsApp notification using approved template.
 */
async function sendWhatsAppTemplate(params: { 
  to: string; 
  templateParams: Array<{type: string; text: string}> 
}) {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.META_WHATSAPP_TEMPLATE_NAME;

  if (!token || !phoneNumberId || !templateName) {
    console.warn(
      "[WhatsApp] Missing required env vars. Need META_WHATSAPP_TOKEN, META_WHATSAPP_PHONE_NUMBER_ID, and META_WHATSAPP_TEMPLATE_NAME",
      { to: params.to }
    );
    return;
  }

  const url = `${META_WHATSAPP_API_BASE}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: params.to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: "en" // or "en_US" - match your template language code
      },
      components: [
        {
          type: "body",
          parameters: params.templateParams
        }
      ]
    }
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // ignore parse errors
    }

    if (!res.ok) {
      console.error("[WhatsApp] Failed to send template message", {
        status: res.status,
        statusText: res.statusText,
        body: json,
        payload: payload
      });
    } else {
      console.log("[WhatsApp] Template message sent successfully", {
        messageId: json?.messages?.[0]?.id,
        to: params.to
      });
    }
  } catch (err) {
    console.error("[WhatsApp] Network error sending template", err);
  }
}

/**
 * Public interface used by service.ts
 */
export async function notifySender(p: SenderNotificationPayload) {
  if (!p.phone) {
    console.warn("[notifySender] Missing phone number", p);
    return;
  }

  const to = normalizePhone(p.phone);
  const templateParams = buildTemplateParams(p);

  await sendWhatsAppTemplate({ to, templateParams });
}


