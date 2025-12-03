// lib/rania/whatsapp.ts
import "server-only";

const AISENSY_DIRECT_API_URL =
  "https://backend.aisensy.com/campaign/t1/api/v1/send";

export type RaniaNotificationEvent =
  | "moment_replied"
  | "reaction_posted"
  | "deep_truth";

export type SenderNotificationPayload = {
  phone: string;
  name?: string | null;
  event: RaniaNotificationEvent;
  shortCode: string;
};

function buildMessage(p: SenderNotificationPayload): string {
  const link = `https://www.raniaonline.com/m/${p.shortCode}`;
  const name = p.name || "Someone";

  switch (p.event) {
    case "moment_replied":
      return `${name}, someone just replied to your RANIA moment.\nSee it here: ${link}`;
    case "reaction_posted":
      return `${name}, they reacted to your hidden truth.\nSee it here: ${link}`;
    case "deep_truth":
      return `${name}, someone ran a Deep Breakdown on your RANIA moment.\nCheck it: ${link}`;
  }
}

async function sendWhatsApp({ phoneNumber, message }: {
  phoneNumber: string;
  message: string;
}) {
  const apiKey = process.env.AISENSY_API_KEY;
  if (!apiKey) {
    console.warn("[AiSensy] Missing API Key");
    return;
  }

  const payload = {
    to: phoneNumber,
    type: "text",
    message,
  };

  try {
    const res = await fetch(AISENSY_DIRECT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,    // CORRECT
      },
      body: JSON.stringify(payload),
    });

    let response = null;
    try {
      response = await res.json();
    } catch {}

    if (!res.ok) {
      console.warn("[AiSensy Error]", res.status, response);
    } else {
      console.log("[AiSensy Sent]", response);
    }
  } catch (err) {
    console.error("[AiSensy Network Error]", err);
  }
}

export async function notifySender(p: SenderNotificationPayload) {
  if (!p.phone) {
    console.warn("[notifySender] Missing phone number");
    return;
  }

  const message = buildMessage(p);

  await sendWhatsApp({
    phoneNumber: p.phone,
    message,
  });
}