/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import type React from "react";
import Script from "next/script";
import { useParams, useRouter } from "next/navigation";

import { DeepTruthCardCanvas } from "@/components/DeepTruthCardCanvas";
import { MomentCardCanvas } from "@/components/MomentCardCanvas";
import { apiGetMoment, apiReplyToMoment, apiDeepTruth } from "@/lib/rania/client";

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

const DEEP_TRUTH_PRICE_KES = 50;

type MomentData = {
  id: string;
  shortCode: string;
  status: string;
  isPremiumReveal: boolean;
  deliveryFormat: string;
  teaserText: string;
  hasHidden: boolean;
};

export default function MomentViewPage() {
  const params = useParams<{ shortCode: string }>();
  const router = useRouter();
  const shortCode = params.shortCode;

  const [moment, setMoment] = useState<MomentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [replyText, setReplyText] = useState("");
  const [vibeScore, setVibeScore] = useState<number | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [hiddenText, setHiddenText] = useState<string | null>(null);

  const [replyId, setReplyId] = useState<string | null>(null);
  const [reactionText, setReactionText] = useState("");

  const [deepTruth, setDeepTruth] = useState<string | null>(null);
  const [deepTruthLoading, setDeepTruthLoading] = useState(false);
  const [deepTruthError, setDeepTruthError] = useState<string | null>(null);
  const [deepTruthEmail, setDeepTruthEmail] = useState<string>("test@example.com");
  const [payingDeepTruth, setPayingDeepTruth] = useState(false);

  const [showMomentCard, setShowMomentCard] = useState(false);
  const [showDeepTruthCard, setShowDeepTruthCard] = useState(false);

  const paystackKey =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? ""
      : "";
  const currency =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_PAYSTACK_CURRENCY ?? "KES"
      : "KES";

  useEffect(() => {
    let cancel = false;
    async function load() {
      if (!shortCode) return;
      setLoading(true);
      setLoadError(null);
      try {
        const res = await apiGetMoment(shortCode);
        if (!cancel) {
          setMoment(res.moment);
        }
      } catch (err: any) {
        if (!cancel) setLoadError(err.message ?? "Failed to load moment");
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => {
      cancel = true;
    };
  }, [shortCode]);

  async function handleReplySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!moment) return;

    if (!replyText.trim()) {
      alert("Reply cannot be empty.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiReplyToMoment(shortCode, {
        replyText: replyText.trim(),
        vibeScore: vibeScore ?? null,
        identity: {},
      });
      setHiddenText(res.hiddenText);
      setReplyId(res.replyId);
      // CLEAR the reply from the input after sending
      setReplyText("");
      // you can also reset vibeScore if you want
      // setVibeScore(undefined);
    } catch (err: any) {
      alert(err.message ?? "Failed to submit reply");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReactionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!moment || !replyId) return;
    if (!reactionText.trim()) {
      alert("Reaction cannot be empty.");
      return;
    }

    try {
      const res = await fetch(`/api/rania/moments/${moment.id}/reaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rania-guest-id": typeof window !== "undefined"
            ? localStorage.getItem("rania_guest_id") ?? ""
            : "",
        },
        body: JSON.stringify({
          replyId,
          reactionText: reactionText.trim(),
          identity: {},
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to send reaction");
      }

      // CLEAR the reaction once sent
      setReactionText("");
      // Moment is now fully "completed" on backend
    } catch (err: any) {
      alert(err.message ?? "Error sending reaction");
    }
  }

  async function handleDeepTruth() {
    if (!moment) return;
    setDeepTruthError(null);

    if (!window.PaystackPop || !paystackKey) {
      setDeepTruthError("Payment library not loaded or Paystack key missing.");
      return;
    }

    if (!deepTruthEmail || !deepTruthEmail.includes("@")) {
      setDeepTruthError("Enter a valid email for Paystack.");
      return;
    }

    setPayingDeepTruth(true);

    const handler = window.PaystackPop.setup({
      key: paystackKey,
      email: deepTruthEmail,
      amount: DEEP_TRUTH_PRICE_KES * 100,
      currency,
      metadata: {
        type: "DEEP_TRUTH",
        momentId: moment.id,
        shortCode: moment.shortCode,
      },
      callback: function (response) {
        setPayingDeepTruth(false);
        if (response.reference) {
          void fetchDeepTruthWithReference(response.reference);
        } else {
          setDeepTruthError("Payment completed but no reference returned.");
        }
      },
      onClose: function () {
        setPayingDeepTruth(false);
      },
    });

    handler.openIframe();
  }

  async function fetchDeepTruthWithReference(reference: string) {
    if (!moment) return;
    setDeepTruthLoading(true);
    setDeepTruthError(null);
    try {
      const res = await apiDeepTruth(moment.id, {
        paymentReference: reference,
        skipPaymentCheck: true,
      });
      setDeepTruth(res.deepTruth);
      // deep truth text is now available for static card
    } catch (err: any) {
      setDeepTruthError(err.message ?? "Failed to get Deep Truth");
    } finally {
      setDeepTruthLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-bounce">✨</div>
          <p className="text-pink-500/70">Loading this moment…</p>
        </div>
      </div>
    );
  }

  if (loadError || !moment) {
    return (
      <div className="glass rounded-xl sm:rounded-2xl p-6 sm:p-8 max-w-md mx-auto space-y-4 text-center">
        <div className="text-4xl">😕</div>
        <p className="text-pink-600 font-medium">
          Could not load this RANIA moment.
        </p>
        <button
          onClick={() => router.push("/moments/create")}
          className="w-full py-2 sm:py-3 rounded-lg bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white font-bold hover:scale-105 transition"
        >
          Create Your Own
        </button>
      </div>
    );
  }

  const isCompleted = Boolean(hiddenText);
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.raniaonline.com";
  const startUrl = `${baseUrl}/moments/create`;

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />

      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-0">
        {/* HEADER / TEASER */}
        <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4 sm:space-y-6 bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-fuchsia-500/10 border border-pink-500/40">
          <div className="space-y-2 sm:space-y-3">
            <div className="text-xs sm:text-sm font-bold text-pink-400">
              RANIA Emotional Thread
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-tight">
              {moment.teaserText}
            </h2>
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-pink-950/40 border border-pink-200/60 dark:border-pink-500/40 p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-slate-800 dark:text-pink-50/90">
              💭 This is an emotional truth moment. Someone just shared their real
              feelings with you. Reply honestly to unlock what they really meant.
            </p>
          </div>
        </div>

        {/* UNLOCKED TRUTH + REACTION + CARDS */}
        {hiddenText && moment && (
          <div className="space-y-4 rounded-2xl border border-pink-400/60 bg-pink-950/40 p-4 sm:p-5 text-xs sm:text-sm">
            {/* Hidden truth */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase text-pink-300">
                Hidden truth unlocked
              </div>
              <div className="text-sm whitespace-pre-wrap text-pink-50">
                {hiddenText}
              </div>
            </div>

            {/* Reaction form */}
            {replyId && (
              <form
                onSubmit={handleReactionSubmit}
                className="space-y-2 rounded-2xl border border-pink-400/60 bg-pink-950/70 p-3 sm:p-4 text-xs"
              >
                <div className="font-medium text-pink-50">
                  Now that you’ve seen this, what do you want to say back?
                </div>
                <textarea
                  value={reactionText}
                  onChange={(e) => setReactionText(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-pink-400/60 bg-pink-950/80 px-2 py-2 text-xs text-pink-50 focus:border-pink-300 focus:outline-none"
                  placeholder="Type your honest reaction here…"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:scale-105 transition disabled:opacity-60"
                    disabled={!reactionText.trim()}
                  >
                    Send reaction
                  </button>
                </div>
              </form>
            )}

            {/* Moment static card (toggle open/close) */}
            <div className="space-y-2 border-t border-pink-400/40 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-pink-100">
                  Shareable card (moment + reaction)
                </span>
                <button
                  type="button"
                  onClick={() => setShowMomentCard((v) => !v)}
                  className="text-[11px] px-2 py-1 rounded-full border border-pink-400/70 text-pink-200 hover:bg-pink-500/20 transition"
                >
                  {showMomentCard ? "Hide card" : "Show card"}
                </button>
              </div>

              {showMomentCard && (
                <MomentCardCanvas
                  teaser={moment.teaserText}
                  hiddenText={hiddenText}
                  replyText={reactionText || "[Their reaction]"}
                  shareUrl={`${baseUrl}/m/${moment.shortCode}`}
                />
              )}
            </div>

            {/* Deep Truth block */}
            <div className="rounded-2xl border border-pink-400/50 bg-pink-950/60 p-3 sm:p-4 space-y-3">
              <h3 className="font-bold text-pink-100 flex items-center gap-2 text-xs sm:text-sm">
                <span>🔬</span> Deep Breakdown (Optional – KES {DEEP_TRUTH_PRICE_KES})
              </h3>

              {!deepTruth && !deepTruthLoading && (
                <div className="space-y-2 sm:space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] sm:text-xs font-bold text-pink-200">
                      Email for Payment Receipt
                    </label>
                    <input
                      type="email"
                      value={deepTruthEmail}
                      onChange={(e) => setDeepTruthEmail(e.target.value)}
                      className="w-full rounded-lg bg-pink-950/80 border border-pink-400/60 px-2 py-1.5 text-[11px] text-pink-50 focus:border-pink-300 focus:outline-none"
                      placeholder="you@campus.ac.ke"
                    />
                  </div>
                  <button
                    onClick={handleDeepTruth}
                    disabled={payingDeepTruth}
                    className="w-full py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white font-bold text-xs sm:text-sm hover:scale-105 transition disabled:opacity-60"
                  >
                    {payingDeepTruth
                      ? "💳 Opening Paystack…"
                      : `💰 Pay KES ${DEEP_TRUTH_PRICE_KES} & Unlock`}
                  </button>
                </div>
              )}

              {deepTruthLoading && (
                <div className="flex items-center justify-center gap-2 py-3">
                  <div className="animate-spin text-2xl">✨</div>
                  <p className="text-[11px] sm:text-xs text-pink-100/80">
                    Analyzing this moment…
                  </p>
                </div>
              )}

              {deepTruthError && (
                <p className="text-xs sm:text-sm text-red-400">{deepTruthError}</p>
              )}

              {deepTruth && moment && (
                <div className="space-y-3">
                  <div className="text-[11px] text-pink-100/80">
                    Deep Truth analysis
                  </div>

                  {/* full text, not cramped */}
                  <div className="text-[11px] text-pink-50 whitespace-pre-wrap border border-pink-400/50 rounded-md p-2 bg-pink-950/80">
                    {deepTruth}
                  </div>

                  {/* Deep Truth static card (toggle) */}
                  <div className="space-y-2 border-t border-pink-400/40 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-pink-100">
                        Deep Truth share card (for WhatsApp Status / groups)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowDeepTruthCard((v) => !v)}
                        className="text-[11px] px-2 py-1 rounded-full border border-pink-400/70 text-pink-200 hover:bg-pink-500/20 transition"
                      >
                        {showDeepTruthCard ? "Hide card" : "Show card"}
                      </button>
                    </div>

                    {showDeepTruthCard && (
                      <DeepTruthCardCanvas
                        teaser={moment.teaserText}
                        hiddenText={hiddenText ?? ""}
                        deepTruth={deepTruth}
                        shareUrl={`${baseUrl}/m/${moment.shortCode}`}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Copy text (wide text, not slider) */}
            <div className="rounded-2xl border border-pink-400/50 bg-pink-950/50 p-3 sm:p-4 space-y-3">
              <h3 className="font-bold text-pink-100 flex items-center gap-2 text-xs sm:text-sm">
                <span>📲</span> Share This Moment Back
              </h3>
              <textarea
                readOnly
                className="w-full rounded-lg bg-pink-950/80 border border-pink-400/50 px-2 sm:px-3 py-2 text-[10px] sm:text-xs text-pink-50 font-mono resize-none"
                rows={4}
                value={`I just unlocked a real moment on RANIA:\n\n"${hiddenText}"\n\nCreate yours: ${startUrl}`}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `I just unlocked a real moment on RANIA:\n\n"${hiddenText}"\n\nCreate yours: ${startUrl}`
                  );
                }}
                className="w-full py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white font-bold text-xs sm:text-sm hover:scale-105 transition"
              >
                📋 Copy to Share
              </button>
            </div>
          </div>
        )}

        {/* Reply form (only if not unlocked yet) */}
        {!isCompleted && (
          <div className="space-y-4">
            <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4 sm:space-y-6 bg-gradient-to-br from-pink-500/10 via-rose-500/10 to-fuchsia-500/10 border border-pink-500/40">
              <h3 className="font-bold text-base sm:text-xl text-slate-900 dark:text-white">
                {moment.isPremiumReveal
                  ? "🔑 Reply to Unlock"
                  : "💬 Complete This Moment"}
              </h3>

              <div className="space-y-2 sm:space-y-3">
                <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-white/80">
                  Your Reply
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl bg-white/80 dark:bg-pink-950/40 border border-pink-300/70 dark:border-pink-500/60 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 dark:text-pink-50 focus:border-pink-500 focus:outline-none resize-none"
                  placeholder="Type your honest reply here…"
                />
              </div>

              <div className="space-y-2 sm:space-y-3">
                <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-white/80">
                  How&apos;s the vibe? (1–10)
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={vibeScore ?? 5}
                  onChange={(e) => setVibeScore(Number(e.target.value))}
                  className="w-full h-2 bg-pink-200 dark:bg-pink-900 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-pink-700 dark:text-pink-200 font-semibold">
                  Selected: {vibeScore ?? 5}
                </span>
              </div>

              <button
                onClick={handleReplySubmit}
                disabled={submitting}
                className="w-full py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 text-white font-bold text-xs sm:text-base shadow-lg shadow-pink-500/40 hover:shadow-pink-500/70 transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "📤 Sending reply…" : "✨ Reply & Unlock Truth"}
              </button>

              <p className="text-[10px] sm:text-xs text-slate-600 dark:text-pink-100/70 text-center">
                Be real. Be kind. Be honest. This is a safe space. 🤝
              </p>
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div className="text-center pt-3 sm:pt-4 pb-6 sm:pb-8">
          <button
            onClick={() => router.push("/moments/create")}
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-pink-400/60 bg-pink-50/60 dark:bg-pink-950/50 text-pink-700 dark:text-pink-100 font-bold text-xs sm:text-sm hover:bg-pink-100/80 dark:hover:bg-pink-900/70 transition"
          >
            ← Create Your Own RANIA Moment
          </button>
        </div>
      </div>
    </>
  );
}
