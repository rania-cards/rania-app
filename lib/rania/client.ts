// lib/rania/client.ts
import {
  CreateMomentPayload,
  ReplyPayload,
  DeepTruthPayload,
  TruthLevel2Payload,
} from "./types";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

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
    };
  }>(res);
}

export async function apiReplyToMoment(shortCode: string, payload: Omit<ReplyPayload, "shortCode">) {
 const res = await fetch(`/api/rania/moments/by-code/${shortCode}/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rania-guest-id": getOrCreateGuestId(),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse<{
    success: boolean;
    replyId: string;
    hiddenText: string;
  }>(res);
}

export async function apiDeepTruth(momentId: string, payload: Omit<DeepTruthPayload, "momentId">) {
  const res = await fetch(`/api/rania/moments/${momentId}/deep-truth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rania-guest-id": getOrCreateGuestId(),
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<{
    success: boolean;
    deepTruth: string;
  }>(res);
}

export async function apiTruthLevel2(
  momentId: string,
  payload: Omit<TruthLevel2Payload, "momentId">
) {
  const res = await fetch(`/api/rania/moments/${momentId}/truth-level-2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rania-guest-id": getOrCreateGuestId(),
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<{
    success: boolean;
    followupId: string;
  }>(res);
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
