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

const MODES: { key: string; label: string; emoji: string }[] = [
  { key: "CRUSH_REVEAL", label: "Crush Reveal", emoji: "💕" },
  { key: "DEEP_CONFESSION", label: "Deep Confession", emoji: "🎭" },
  { key: "BESTIE_TRUTH_CHAIN", label: "Bestie Truth", emoji: "👯" },
  { key: "ROAST_ME_SOFTLY", label: "Roast Me", emoji: "🔥" },
  { key: "FORGIVE_ME", label: "Forgive Me", emoji: "🤝" },
  { key: "CLOSURE", label: "Closure", emoji: "✨" },
];

type MomentData = {
  id: string;
  shortCode: string;
  status: string;
  isPremiumReveal: boolean;
  deliveryFormat: string;
  teaserText: string;
  hasHidden: boolean;
  modeKey?: string;
};

type ReplyRow = {
  id: string;
  reply_text: string;
  reaction_text: string | null;
  created_at: string;
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
  const [submittingReply, setSubmittingReply] = useState(false);
  const [hasReplied, setHasReplied] = useState(false);
  const [replyId, setReplyId] = useState<string | null>(null);

  const [hiddenFullText, setHiddenFullText] = useState<string | null>(null);

  const [reactionText, setReactionText] = useState("");
  const [finalReactionText, setFinalReactionText] = useState("");
  const [submittingReaction, setSubmittingReaction] = useState(false);
  const [reactionSent, setReactionSent] = useState(false);

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

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.raniaonline.com";
  const startUrl = `${baseUrl}/moments/create`;

  const selectedMode = MODES.find((m) => m.key === moment?.modeKey) || MODES[0];

  useEffect(() => {
    let cancel = false;

    async function load() {
      if (!shortCode) return;
      setLoading(true);
      setLoadError(null);
      try {
        const res = await apiGetMoment(shortCode);
        if (cancel) return;

        const m = res.moment as any as MomentData;
        setMoment(m);

        const statusHasReply = m.status === "awaiting_reply" || m.status === "completed";

        if (statusHasReply) {
          try {
            const r = await fetch(`/api/rania/moments/by-code/${shortCode}/replies`, {
              method: "GET",
            });
            const json = await r.json();
            if (!cancel && json.success && Array.isArray(json.replies) && json.replies.length > 0) {
              const replies = json.replies as ReplyRow[];
              const latest = replies[replies.length - 1];
              setReplyId(latest.id);
              setHasReplied(true);
              if (latest.reaction_text) {
                setFinalReactionText(latest.reaction_text);
                setReactionSent(true);
              }
            }
          } catch (err) {
            console.warn("[receiver] Failed to load replies:", err);
          }
        } else {
          setHasReplied(false);
          setReplyId(null);
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

    setSubmittingReply(true);
    try {
      const res = await apiReplyToMoment(shortCode, {
        replyText: replyText.trim(),
        vibeScore: vibeScore ?? null,
        identity: {},
      });
      setReplyId(res.replyId);
      setReplyText("");
      setHasReplied(true);
      setHiddenFullText(res.hiddenText);
    } catch (err: any) {
      alert(err.message ?? "Failed to submit reply");
    } finally {
      setSubmittingReply(false);
    }
  }

  async function handleReactionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!moment) return;
    if (!replyId) {
      alert("We could not link your reaction to the conversation. Please refresh and try again.");
      return;
    }
    if (!reactionText.trim()) {
      alert("Reaction cannot be empty.");
      return;
    }

    setSubmittingReaction(true);
    try {
      const textToSave = reactionText.trim();

      const res = await fetch(`/api/rania/moments/${moment.id}/reaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rania-guest-id":
            typeof window !== "undefined"
              ? localStorage.getItem("rania_guest_id") ?? ""
              : "",
        },
        body: JSON.stringify({
          replyId,
          reactionText: textToSave,
          identity: {},
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to send reaction");
      }

      setFinalReactionText(textToSave);
      setReactionText("");
      setReactionSent(true);
    } catch (err: any) {
      alert(err.message ?? "Error sending reaction");
    } finally {
      setSubmittingReaction(false);
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
    } catch (err: any) {
      setDeepTruthError(err.message ?? "Failed to get Deep Truth");
    } finally {
      setDeepTruthLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-bounce">✨</div>
          <p className="text-pink-300 font-medium">Loading this moment…</p>
        </div>
      </div>
    );
  }

  if (loadError || !moment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 max-w-md w-full text-center space-y-4">
          <div className="text-5xl">😕</div>
          <p className="text-slate-300 font-medium">Could not load this RANIA moment.</p>
          <button
            onClick={() => router.push("/moments/create")}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold hover:scale-105 transition"
          >
            Create Your Own
          </button>
        </div>
      </div>
    );
  }

  const phaseReply = !hasReplied;
  const phaseAfterReply = hasReplied;
  const finalReplyForCard =
    finalReactionText || (reactionSent ? "[Reaction sent]" : "[Their reaction]");

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* Animated background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-8">
          {/* HEADER */}
          <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4 sm:space-y-6 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-400/30 backdrop-blur-sm">
            <div className="space-y-2 sm:space-y-3">
              <div className="text-xs sm:text-sm font-bold text-purple-300 uppercase tracking-wider mb-3">
                ✨ RANIA Emotional Thread
              </div>

              {/* Mode Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 px-4 py-2 mb-4 w-fit">
                <span className="text-xl">{selectedMode.emoji}</span>
                <span className="text-xs font-bold uppercase text-purple-200">{selectedMode.label}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-100 leading-tight">
                {moment.teaserText}
              </h1>
            </div>

            <div className="rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800/60 p-4 sm:p-5 backdrop-blur-sm">
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                💭 <span className="font-semibold">They sent you a teaser.</span> Reply first (free). After you reply, RANIA reveals their full hidden truth. Then you can react.
              </p>
            </div>
          </div>

          {/* PHASE 1: reply */}
          {phaseReply && (
            <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-6 sm:space-y-8 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-400/30 backdrop-blur-sm">
              <div>
                <h2 className="font-bold text-xl sm:text-2xl text-slate-100 flex items-center gap-2 mb-2">
                  <span>💬</span> Your Reply
                </h2>
                <p className="text-sm text-slate-400">Free • Takes less than a minute</p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-100 block">
                  Type your honest reply
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl bg-slate-950/60 border border-slate-700 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-400 focus:outline-none transition resize-none"
                  placeholder="Reply from your heart…"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-slate-100 flex items-center justify-between mb-3">
                    <span>How&apos;s the vibe? (1–10)</span>
                    <span className="text-lg font-black text-pink-300">{vibeScore ?? 5}</span>
                  </label>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={vibeScore ?? 5}
                  onChange={(e) => setVibeScore(Number(e.target.value))}
                  className="w-full h-3 bg-gradient-to-r from-pink-600 to-cyan-500 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>

              <button
                onClick={handleReplySubmit}
                disabled={submittingReply}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-base shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submittingReply ? "📤 Sending your reply…" : "✨ Reply & See Their Truth"}
              </button>

              <p className="text-center text-sm text-slate-400">
                After you reply, their hidden truth will be revealed.
              </p>
            </div>
          )}

          {/* PHASE 2: after reply -> show hidden + reaction + cards */}
          {phaseAfterReply && (
            <div className="space-y-6">
              {/* Hidden truth */}
              {hiddenFullText && (
                <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-400/30 backdrop-blur-sm">
                  <h2 className="font-bold text-lg sm:text-2xl text-slate-100 flex items-center gap-2">
                    <span>🔓</span> Their Hidden Truth
                  </h2>
                  <div className="rounded-xl bg-slate-950/60 border border-slate-800/60 p-5 sm:p-6">
                    <p className="text-sm sm:text-base leading-relaxed text-slate-100 font-medium whitespace-pre-wrap">
                      {hiddenFullText}
                    </p>
                  </div>
                </div>
              )}

              {/* Reaction form */}
              {hiddenFullText && (
                <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-5 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-400/30 backdrop-blur-sm">
                  <h2 className="font-bold text-lg sm:text-2xl text-slate-100 flex items-center gap-2">
                    <span>💭</span> Your Reaction
                  </h2>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-200">
                      Now that you&apos;ve seen their full truth, what do you want to say back?
                    </label>
                    <textarea
                      value={reactionText}
                      onChange={(e) => setReactionText(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl bg-slate-950/60 border border-slate-700 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-400 focus:outline-none transition resize-none"
                      placeholder="Your honest reaction…"
                    />
                  </div>
                  <button
                    onClick={handleReactionSubmit}
                    disabled={submittingReaction || !reactionText.trim()}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-base hover:scale-105 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submittingReaction ? "Sending…" : "Send Your Reaction"}
                  </button>
                </div>
              )}

              {/* Moment static card */}
              {hiddenFullText && (
                <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-5 bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-slate-700/60 backdrop-blur-sm">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-100">
                        💾 Conversation Card
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMomentCard((v) => !v)}
                        className="text-xs px-3 py-1 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition"
                      >
                        {showMomentCard ? "Hide card" : "Show card"}
                      </button>
                    </div>
                    {showMomentCard && (
                      <MomentCardCanvas
                        teaser={moment.teaserText}
                        hiddenText={hiddenFullText}
                        replyText={finalReplyForCard}
                        shareUrl={`${baseUrl}/m/${moment.shortCode}`}
                      />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 italic">
                    Tip: If you&apos;re the sender, open this same link after the conversation and download the card to keep the memory.
                  </p>
                </div>
              )}

              {/* Deep Truth */}
              <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-5 bg-gradient-to-br from-orange-600/20 to-pink-600/20 border border-orange-400/30 backdrop-blur-sm">
                <h2 className="font-bold text-lg sm:text-2xl text-slate-100 flex items-center gap-2">
                  <span>🔬</span> Deep Breakdown
                </h2>
                <p className="text-sm text-slate-300">
                  Optional AI analysis • KES {DEEP_TRUTH_PRICE_KES}
                </p>

                {!deepTruth && !deepTruthLoading && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-100 block mb-2">
                        Email for payment receipt
                      </label>
                      <input
                        type="email"
                        value={deepTruthEmail}
                        onChange={(e) => setDeepTruthEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-lg bg-slate-950/60 border border-slate-700 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-400 focus:outline-none transition"
                      />
                    </div>
                    <button
                      onClick={handleDeepTruth}
                      disabled={payingDeepTruth}
                      className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-base hover:scale-105 transition-all duration-300 disabled:opacity-60"
                    >
                      {payingDeepTruth ? "💳 Opening payment…" : `💰 Pay KES ${DEEP_TRUTH_PRICE_KES} & Unlock`}
                    </button>
                  </div>
                )}

                {deepTruthLoading && (
                  <div className="flex items-center justify-center gap-3 py-6">
                    <div className="animate-spin text-3xl">✨</div>
                    <p className="text-slate-300">Analyzing this moment…</p>
                  </div>
                )}

                {deepTruthError && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-200">
                    ⚠️ {deepTruthError}
                  </div>
                )}

                {deepTruth && moment && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-slate-950/60 border border-slate-800/60 p-5">
                      <p className="text-sm leading-relaxed text-slate-100 whitespace-pre-wrap">
                        {deepTruth}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-100">
                          📱 Deep Truth Share Card
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowDeepTruthCard((v) => !v)}
                          className="text-xs px-3 py-1 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition"
                        >
                          {showDeepTruthCard ? "Hide card" : "Show card"}
                        </button>
                      </div>
                      {showDeepTruthCard && (
                        <DeepTruthCardCanvas
                          teaser={moment.teaserText}
                          hiddenText={hiddenFullText ?? ""}
                          deepTruth={deepTruth}
                          shareUrl={`${baseUrl}/m/${moment.shortCode}`}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Share text */}
              {hiddenFullText && (
                <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-5 bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-slate-700/60 backdrop-blur-sm">
                  <h2 className="font-bold text-lg sm:text-2xl text-slate-100 flex items-center gap-2">
                    <span>📲</span> Share This Moment
                  </h2>
                  <textarea
                    readOnly
                    value={`I just unlocked a real moment on RANIA:\n\n"${hiddenFullText}"\n\nCreate yours: ${startUrl}`}
                    rows={4}
                    className="w-full rounded-lg bg-slate-950/60 border border-slate-700 px-4 py-3 text-xs sm:text-sm font-mono text-slate-300 resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `I just unlocked a real moment on RANIA:\n\n"${hiddenFullText}"\n\nCreate yours: ${startUrl}`,
                      );
                    }}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-base hover:scale-105 transition-all duration-300"
                  >
                    📋 Copy to Share
                  </button>
                </div>
              )}
            </div>
          )}

          {/* FOOTER CTA */}
          <div className="text-center py-6 sm:py-8">
            <button
              onClick={() => router.push("/moments/create")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-purple-400/60 bg-slate-50/10 text-purple-200 font-bold text-sm hover:bg-slate-50/20 transition"
            >
              ← Create Your Own RANIA Moment
            </button>
          </div>
        </div>
      </div>
    </>
  );
}