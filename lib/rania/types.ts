// lib/rania/types.ts

export type RaniaModeKey =
  | "CRUSH_REVEAL"
  | "DEEP_CONFESSION"
  | "BESTIE_TRUTH_CHAIN"
  | "ROAST_ME_SOFTLY"
  | "FORGIVE_ME"
  | "CLOSURE";

export type RaniaLanguage = "en" | "sw" | "sh";
export type RaniaTone = "soft" | "neutral" | "dark";

export type RaniaDeliveryFormat = "text" | "still" | "gif" | "motion";

export interface CreateMomentPayload {
  modeKey: RaniaModeKey;
  language: RaniaLanguage;
  tone: RaniaTone;
  deliveryFormat: RaniaDeliveryFormat;
  teaserSnippetId?: string;
  hiddenSnippetId?: string;
  customTeaserText?: string;
  customHiddenText?: string;
  premiumReveal: boolean;

  // NEW: Paystack integration
  paymentReference?: string;   // from Paystack callback
  skipPaymentCheck?: boolean;  // if true, backend will trust paymentReference
 senderName?: string;
  senderPhone?: string; 
  senderEmail?:string;

  identity: {
    guestId?: string;
    authUserId?: string | null;
  };
}

export interface ReplyPayload {
  shortCode: string;
  replyText: string;
  vibeScore?: number | null;
  identity: {
    guestId?: string;
    authUserId?: string | null;
  };
}

export interface DeepTruthPayload {
  mId(mId: any): unknown;
  momentId: string;
  identity: {
    guestId?: string;
    authUserId?: string | null;
  };
}

export interface TruthLevel2Payload {
  momentId: string;
  replyId: string;
  followupSnippetId?: string;
  customFollowupText?: string;
  identity: {
    guestId?: string;
    authUserId?: string | null;
  };
}

export interface Identity {
  id: string;
}

export interface DeepTruthPayload {
  momentId: string;
  identity: {
    guestId?: string;
    authUserId?: string | null;
  };

  // NEW: for paid flow
  paymentReference?: string;   // Paystack reference
  skipPaymentCheck?: boolean;  // true = trust the reference, don't re-charge
}


export interface HiddenUnlockPayload {
  momentId: string;
  identity: {
    guestId?: string;
    authUserId?: string | null;
  };
  paymentReference: string;  // Paystack reference, required
  skipPaymentCheck?: boolean; // true = we trust Paystack inline was successful
}

export interface AddHiddenMessagePayload {
  momentId: string;
  fullHiddenText: string;
  unlockPriceKes?: number; // default 20 if not provided
}

