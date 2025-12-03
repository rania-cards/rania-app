// lib/rania/client.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CreateMomentPayload,
  ReplyPayload,
  DeepTruthPayload,
  TruthLevel2Payload,
} from "./types";

async function handleResponse<T>(res: Response): Promise<T> {
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok || (json && json.success === false)) {
    const message =
      (json && json.error) || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return json as T;
}

// Simple guest ID helper
function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "server";
  const key = "rania_guest_id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

// -----------------------------------------------------------------------------
// 1) Create moment (sender free, teaser only)
// -----------------------------------------------------------------------------

export async function apiCreateMoment(payload: CreateMomentPayload) {
  const res = await fetch("/api/rania/moments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rania-guest-id": getOrCreateGuestId(),
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<{
    success: boolean;
    momentId: string;
    shortCode: string;
    url: string;
  }>(res);
}

// -----------------------------------------------------------------------------
// 2) Load moment for receiver by shortCode
// -----------------------------------------------------------------------------

export async function apiGetMoment(shortCode: string) {
  const res = await fetch(`/api/rania/moments/by-code/${shortCode}`, {
    method: "GET",
    headers: {
      "x-rania-guest-id": getOrCreateGuestId(),
    },
    cache: "no-store",
  });

  return handleResponse<{
    success: boolean;
    moment: {
      id: string;
      shortCode: string;
      status: string;
      isPremiumReveal: boolean;
      deliveryFormat: string;
      teaserText: string;
      hasHidden: boolean;
      hiddenPreview?: string;
      isHiddenLocked?: boolean;
      hiddenUnlockPriceKes?: number;
    };
  }>(res);
}

// -----------------------------------------------------------------------------
// 3) First reply (unlock step 1, free)
// -----------------------------------------------------------------------------

export async function apiReplyToMoment(
  shortCode: string,
  payload: Omit<ReplyPayload, "shortCode">,
) {
  const res = await fetch(
    `/api/rania/moments/by-code/${shortCode}/reply`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rania-guest-id": getOrCreateGuestId(),
      },
      body: JSON.stringify(payload),
    },
  );

  return handleResponse<{
    success: boolean;
    replyId: string;
    hiddenText: string;
  }>(res);
}

// -----------------------------------------------------------------------------
// 4) Deep Truth
// -----------------------------------------------------------------------------

export async function apiDeepTruth(
  momentId: string,
  options?: {
    paymentReference?: string;
    skipPaymentCheck?: boolean;
  },
) {
  const res = await fetch(
    `/api/rania/moments/${momentId}/deep-truth`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rania-guest-id": getOrCreateGuestId(),
      },
      body: JSON.stringify({
        identity: {},
        paymentReference: options?.paymentReference,
        skipPaymentCheck: options?.skipPaymentCheck ?? false,
      }),
    },
  );

  return handleResponse<{
    success: boolean;
    deepTruth: string;
  }>(res);
}

// -----------------------------------------------------------------------------
// 5) Truth Level 2 (optional)
// -----------------------------------------------------------------------------

export async function apiTruthLevel2(
  momentId: string,
  payload: Omit<TruthLevel2Payload, "momentId">,
) {
  const res = await fetch(
    `/api/rania/moments/${momentId}/truth-level-2`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rania-guest-id": getOrCreateGuestId(),
      },
      body: JSON.stringify(payload),
    },
  );

  return handleResponse<{
    success: boolean;
    followupId: string;
  }>(res);
}

// -----------------------------------------------------------------------------
// 6) Hidden unlock helper (optional, if you want a client wrapper)
// -----------------------------------------------------------------------------

export async function apiUnlockHidden(
  momentId: string,
  options: { paymentReference: string; skipPaymentCheck?: boolean },
) {
  const res = await fetch(
    `/api/rania/moments/${momentId}/hidden/unlock`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rania-guest-id": getOrCreateGuestId(),
      },
      body: JSON.stringify({
        identity: {},
        paymentReference: options.paymentReference,
        skipPaymentCheck: options.skipPaymentCheck ?? false,
      }),
    },
  );

  return handleResponse<{
    success: boolean;
    hiddenFullText: string;
  }>(res);
}
