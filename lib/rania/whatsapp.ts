/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/rania/whatsapp.ts
import "server-only";

/**
 * WhatsApp Cloud API client for RANIA
 *
 * Uses Meta's Cloud API to send outbound notifications to senders.
 *
 * Required env:
 * - META_WHATSAPP_PHONE_NUMBER_ID
 * - META_WHATSAPP_TOKEN
 */

const META_WHATSAPP_API_BASE = "https://graph.facebook.com/v20.0";

export type RaniaNotificationEvent =
  | "moment_replied"
  | "reaction_posted"
  | "deep_truth";

export type SenderNotificationPayload = {
  phone: string;          // raw phone as stored, e.g. "0722..." or "2547..."
  name?: string | null;   // sender name
  event: RaniaNotificationEvent;
  shortCode: string;      // e.g. "VgcAjG"
};

/**
 * Normalize phone for WhatsApp international format (no '+' sign).
 * Assumes Kenya by default.
 *
 * Examples:
 *  "+254712345678" -> "254712345678"
 *  "0712345678"    -> "254712345678"
 *  "254712345678"  -> "254712345678"
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
 * Build the text message body based on the event.
 * We use simple text messages for now.
 */
function buildMessage(p: SenderNotificationPayload): string {
  const link = `https://www.raniaonline.com/m/${p.shortCode}`;
  const name = p.name || "friend";

  switch (p.event) {
    case "moment_replied":
      return `${name}, someone just replied to your RANIA moment.\nOpen your thread here:\n${link}`;
    case "reaction_posted":
      return `${name}, they reacted to your hidden truth on RANIA.\nSee their reaction:\n${link}`;
    case "deep_truth":
      return `${name}, someone ran a Deep Breakdown on your RANIA moment.\nCheck the details here:\n${link}`;
    default:
      return `${name}, there is new activity on your RANIA moment:\n${link}`;
  }
}

/**
 * Low-level helper to send a WhatsApp text message via Meta Cloud API.
 *
 * NOTE: In production, you'll want to handle HSM templates and conversation types
 *       correctly – this uses simple text within the 24-hour session window.
 */
async function sendWhatsAppText(params: { to: string; body: string }) {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn(
      "[WhatsApp] Missing META_WHATSAPP_TOKEN or META_WHATSAPP_PHONE_NUMBER_ID. Skipping send.",
      params,
    );
    return;
  }

  const url = `${META_WHATSAPP_API_BASE}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: params.to,
    type: "text",
    text: {
      body: params.body,
    },
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
      console.warn("[WhatsApp] Non-2xx response", {
        status: res.status,
        body: json,
      });
    } else {
      console.log("[WhatsApp] Message sent OK", json);
    }
  } catch (err) {
    console.error("[WhatsApp] Network / unexpected error", err);
  }
}

/**
 * Public interface used by service.ts
 * This replaces your old AiSensy-based notifySender.
 */
export async function notifySender(p: SenderNotificationPayload) {
  if (!p.phone) {
    console.warn("[notifySender] Missing phone number", p);
    return;
  }

  const to = normalizePhone(p.phone);
  const message = buildMessage(p);

  await sendWhatsAppText({ to, body: message });
}
