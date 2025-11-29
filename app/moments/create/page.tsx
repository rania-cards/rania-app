/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { apiCreateMoment } from "@/lib/rania/client";
import type {
  RaniaModeKey,
  RaniaLanguage,
  RaniaTone,
  RaniaDeliveryFormat,
} from "@/lib/rania/types";

declare global {
  interface Window {
    PaystackPop: {
      setup(options: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref?: string;
        metadata?: any;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }): { openIframe: () => void };
    };
  }
}

const MODES: { key: RaniaModeKey; label: string; description: string }[] = [
  { key: "CRUSH_REVEAL", label: "Crush Reveal", description: "Say what you admire but never said." },
  { key: "DEEP_CONFESSION", label: "Deep Confession", description: "Explain yourself honestly." },
  { key: "BESTIE_TRUTH_CHAIN", label: "Bestie Truth Chain", description: "Friendship truth, no sugar." },
  { key: "ROAST_ME_SOFTLY", label: "Roast Me Softly", description: "Safe, honest banter." },
  { key: "FORGIVE_ME", label: "Forgive Me Mode", description: "Accountable, grown-up apology." },
  { key: "CLOSURE", label: "Closure Mode", description: "End a chapter with clarity." },
];

const LANG_OPTIONS: { value: RaniaLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "sw", label: "Swahili" },
  { value: "sh", label: "Sheng" },
];

const TONE_OPTIONS: { value: RaniaTone; label: string }[] = [
  { value: "soft", label: "Soft" },
  { value: "neutral", label: "Neutral" },
  { value: "dark", label: "Deep" },
];

const DELIVERY_OPTIONS: { value: RaniaDeliveryFormat; label: string }[] = [
  { value: "still", label: "Still card" },
  { value: "gif", label: "Looping GIF (later)" },
  { value: "motion", label: "Motion (later)" },
];

const PREMIUM_PRICE_KES = 50;

export default function CreateMomentPage() {
  const [modeKey, setModeKey] = useState<RaniaModeKey>("BESTIE_TRUTH_CHAIN");
  const [language, setLanguage] = useState<RaniaLanguage>("en");
  const [tone, setTone] = useState<RaniaTone>("soft");
  const [deliveryFormat, setDeliveryFormat] = useState<RaniaDeliveryFormat>("still");
  const [premiumReveal, setPremiumReveal] = useState<boolean>(true);

  const [teaserText, setTeaserText] = useState<string>("Real talk time… reply first.");
  const [hiddenText, setHiddenText] = useState<string>(
    "I appreciate you more than I show, even when I’m distant."
  );

  const [email, setEmail] = useState<string>("test@example.com");

  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [momentId, setMomentId] = useState<string | null>(null);

  const baseUrl =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_BASE_URL ?? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL ?? "https://raniaonline.com";

  const momentUrl = shortCode ? `${baseUrl}/m/${shortCode}` : "";

  const caption = shortCode
    ? premiumReveal
      ? `Reply to unlock what I really said: ${momentUrl}`
      : `Reply here and complete the moment: ${momentUrl}`
    : "";

  const paystackKey =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? ""
      : "";

  const currency =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_PAYSTACK_CURRENCY ?? "KES"
      : "KES";

  useEffect(() => {
    // Reset result when user changes core inputs
    setShortCode(null);
    setMomentId(null);
    setError(null);
  }, [modeKey, teaserText, hiddenText, premiumReveal, language, tone]);

  async function createFreeMoment() {
    setCreating(true);
    setError(null);
    try {
      const res = await apiCreateMoment({
        modeKey,
        language,
        tone,
        deliveryFormat,
        teaserSnippetId: undefined,
        hiddenSnippetId: undefined,
        customTeaserText: teaserText.trim() || undefined,
        customHiddenText: hiddenText.trim() || undefined,
        premiumReveal: false,
        identity: {},
      });

      setShortCode(res.shortCode);
      setMomentId(res.momentId);
    } catch (err: any) {
      setError(err.message ?? "Failed to create moment");
    } finally {
      setCreating(false);
    }
  }

  async function createPremiumMomentAfterPayment(reference: string) {
    setCreating(true);
    setError(null);
    try {
      const res = await apiCreateMoment({
        modeKey,
        language,
        tone,
        deliveryFormat,
        teaserSnippetId: undefined,
        hiddenSnippetId: undefined,
        customTeaserText: teaserText.trim() || undefined,
        customHiddenText: hiddenText.trim() || undefined,
        premiumReveal: true,
        paymentReference: reference,
        skipPaymentCheck: true, // we already took money via Paystack inline
        identity: {},
      });

      setShortCode(res.shortCode);
      setMomentId(res.momentId);
    } catch (err: any) {
      setError(err.message ?? "Failed to create premium moment");
    } finally {
      setCreating(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!premiumReveal) {
      void createFreeMoment();
      return;
    }

    // Premium flow → Paystack inline
    if (!window.PaystackPop || !paystackKey) {
      setError("Payment library not loaded or Paystack key missing.");
      return;
    }

    if (!email || !email.includes("@")) {
      setError("Enter a valid email for Paystack.");
      return;
    }

    setPaying(true);

    const handler = window.PaystackPop.setup({
      key: paystackKey,
      email,
      amount: PREMIUM_PRICE_KES * 100, // Paystack expects amount in "cents"
      currency,
      metadata: {
        modeKey,
        type: "PREMIUM_REVEAL",
      },
      callback: function (response) {
        setPaying(false);
        if (response.reference) {
          void createPremiumMomentAfterPayment(response.reference);
        } else {
          setError("Payment completed but no reference returned.");
        }
      },
      onClose: function () {
        setPaying(false);
      },
    });

    handler.openIframe();
  }

  return (
    <>
      {/* Paystack Inline Script */}
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />

      <div className="relative">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-emerald-900/20 via-black to-black" />
        <div className="pointer-events-none absolute -top-32 right-[-100px] h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-[-80px] h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="mb-6 flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Create a RANIA moment</h1>
          <p className="text-sm text-white/70">
            Turn honest feelings into a playable WhatsApp moment. They reply, the truth unlocks,
            and you both get a screenshot-worthy story.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
          {/* Left: Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-white/10 bg-black/40 p-4 shadow-xl shadow-black/40 backdrop-blur"
          >
            {/* Mode selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70">Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {MODES.map((m) => {
                  const active = m.key === modeKey;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setModeKey(m.key)}
                      className={`group flex flex-col rounded-xl border px-3 py-2 text-left text-xs transition-transform ${
                        active
                          ? "border-emerald-400 bg-emerald-500/10 shadow-md shadow-emerald-500/30 scale-[1.02]"
                          : "border-white/10 bg-white/5 hover:border-emerald-300/60 hover:bg-emerald-500/5 hover:scale-[1.01]"
                      }`}
                    >
                      <span
                        className={`text-[11px] uppercase tracking-wide ${
                          active ? "text-emerald-300" : "text-emerald-200/70"
                        }`}
                      >
                        {m.label}
                      </span>
                      <span className="mt-1 text-[11px] text-white/65">{m.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-white/70">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as RaniaLanguage)}
                  className="w-full rounded-lg border border-white/15 bg-black/50 px-2 py-1.5 text-xs focus:border-emerald-400 focus:outline-none"
                >
                  {LANG_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-white/70">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as RaniaTone)}
                  className="w-full rounded-lg border border-white/15 bg-black/50 px-2 py-1.5 text-xs focus:border-emerald-400 focus:outline-none"
                >
                  {TONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-white/70">Format</label>
                <select
                  value={deliveryFormat}
                  onChange={(e) => setDeliveryFormat(e.target.value as RaniaDeliveryFormat)}
                  className="w-full rounded-lg border border-white/15 bg-black/50 px-2 py-1.5 text-xs focus:border-emerald-400 focus:outline-none"
                >
                  {DELIVERY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Premium toggle + email */}
            <div className="flex flex-col gap-3 rounded-xl border border-white/12 bg-gradient-to-r from-white/5 via-black/60 to-emerald-900/20 p-3 text-xs">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-white">Reply-to-unlock</div>
                  <div className="text-[11px] text-white/65">
                    They must reply to see the full message. Price:{" "}
                    <span className="font-semibold text-emerald-300">
                      KES {PREMIUM_PRICE_KES}
                    </span>
                    .
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPremiumReveal((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border border-black/60 transition ${
                    premiumReveal ? "bg-emerald-400" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-black shadow transition ${
                      premiumReveal ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              {premiumReveal && (
                <div className="grid grid-cols-[1.4fr,1fr] gap-3 items-center">
                  <div className="space-y-1">
                    <div className="text-[11px] text-white/65">Email for Paystack receipt</div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-black/50 px-2 py-1.5 text-[11px] focus:border-emerald-400 focus:outline-none"
                      placeholder="you@campus.ac.ke"
                    />
                  </div>
                  <div className="text-[11px] text-white/45">
                    Uses Paystack test/live keys in your environment.
                  </div>
                </div>
              )}
            </div>

            {/* Text inputs */}
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-white/75">Teaser (visible)</label>
                <textarea
                  value={teaserText}
                  onChange={(e) => setTeaserText(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-white/15 bg-black/50 px-2 py-2 text-xs focus:border-emerald-400 focus:outline-none"
                  placeholder="Real talk time… reply first."
                />
              </div>
              <div className="space-y-1">
                <label className="text-white/75">
                  Hidden message{" "}
                  <span className="text-white/40">(revealed only after reply)</span>
                </label>
                <textarea
                  value={hiddenText}
                  onChange={(e) => setHiddenText(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-white/15 bg-black/50 px-2 py-2 text-xs focus:border-emerald-400 focus:outline-none"
                  placeholder="I appreciate you more than I show, even when I’m distant."
                />
              </div>
            </div>

            {error && (
              <p className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={creating || paying}
              className="relative w-full overflow-hidden rounded-full bg-emerald-500 py-2 text-sm font-medium text-black shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              <span className="relative z-10">
                {premiumReveal
                  ? paying
                    ? "Opening Paystack…"
                    : creating
                    ? "Finalizing moment…"
                    : `Pay KES ${PREMIUM_PRICE_KES} & create premium moment`
                  : creating
                  ? "Creating free moment…"
                  : "Create free moment"}
              </span>
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-300/40 via-white/20 to-emerald-400/40 opacity-0 transition group-hover:opacity-100" />
            </button>

            <p className="text-[11px] text-white/45">
              RANIA never generates fake activity. Every reply is real, every moment is between real
              people.
            </p>
          </form>

          {/* Right: Live preview & sharing */}
          <div className="space-y-4">
            {/* Card preview */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 via-black/70 to-black p-4 shadow-lg shadow-black/50">
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-semibold uppercase tracking-wide text-emerald-200">
                  {MODES.find((m) => m.key === modeKey)?.label ?? "RANIA Moment"}
                </span>
                <span className="text-white/50">
                  {premiumReveal ? "Reply-to-unlock" : "Free mode"}
                </span>
              </div>
              <div className="rounded-xl border border-white/15 bg-black/70 px-3 py-4 shadow-inner shadow-black/60">
                <p className="text-sm leading-snug text-white">{teaserText}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-white/40">
                  <span>RANIA · emotional thread</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5">
                    rania.co/xyz
                  </span>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-white/50">
                This is roughly how it appears when someone taps your link from WhatsApp Status or a
                group chat.
              </p>
            </div>

            {/* WhatsApp caption */}
            {shortCode && (
              <div className="space-y-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/5 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-300">WhatsApp caption</span>
                  <span className="text-[11px] text-emerald-200/70">
                    Share to Status or a group
                  </span>
                </div>
                <textarea
                  readOnly
                  rows={3}
                  className="w-full rounded-md border border-emerald-400/40 bg-black/60 p-2 text-[11px] text-emerald-50"
                  value={caption}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (caption) navigator.clipboard.writeText(caption);
                  }}
                  className="mt-1 inline-flex items-center rounded-full border border-emerald-400/70 px-3 py-1 text-[11px] text-emerald-200 hover:bg-emerald-400/10"
                >
                  Copy caption
                </button>
                <p className="text-[10px] text-emerald-200/70">
                  Paste this directly as your WhatsApp Status description or in a group chat.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
