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
  hiddenPreview?: string;
  isHiddenLocked?: boolean;
  hiddenUnlockPriceKes?: number;
};

type ReplyRow = {
  id: string;
  reply_text: string;
  reaction_text: string | null;
  created_at: string;
};

function maskPreview(full: string): string {
  const trimmed = full.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  const first = words[0] || "";
  return `${first} ${".".repeat(26)}`;
}

export default function MomentViewPage() {
  const params = useParams<{ shortCode: string }>();
  const router = useRouter();
  const shortCode = params.shortCode;

  const [moment, setMoment] = useState<MomentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // First reply (free)
  const [replyText, setReplyText] = useState("");
  const [vibeScore, setVibeScore] = useState<number | undefined>();
  const [submittingReply, setSubmittingReply] = useState(false);
  const [hasReplied, setHasReplied] = useState(false);
  const [replyId, setReplyId] = useState<string | null>(null);

  // Hidden truth unlock
  const [hiddenFullText, setHiddenFullText] = useState<string | null>(null);
  const [unlockingHidden, setUnlockingHidden] = useState(false);

  // Reaction
  const [reactionText, setReactionText] = useState("");
  const [finalReactionText, setFinalReactionText] = useState("");
  const [submittingReaction, setSubmittingReaction] = useState(false);
  const [reactionSent, setReactionSent] = useState(false);

  // Deep Truth
  const [deepTruth, setDeepTruth] = useState<string | null>(null);
  const [deepTruthLoading, setDeepTruthLoading] = useState(false);
  const [deepTruthError, setDeepTruthError] = useState<string | null>(null);
  const [deepTruthEmail, setDeepTruthEmail] = useState<string>("test@example.com");
  const [payingDeepTruth, setPayingDeepTruth] = useState(false);

  // Cards
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

  // Load moment + replies
  useEffect(() => {
    let cancel = false;

    async function load() {
      if (!shortCode) return;
      setLoading(true);
      setLoadError(null);
      try {
        // 1) Load moment
        const res = await apiGetMoment(shortCode);
        if (cancel) return;

        const m = res.moment as any as MomentData;
        setMoment(m);

        // Determine replied state by status
        const statusHasReply =
          m.status === "awaiting_reply" || m.status === "completed";

        // 2) If status suggests reply exists, load replies to get replyId
        if (statusHasReply) {
          try {
            const r = await fetch(
              `/api/rania/moments/by-code/${shortCode}/replies`,
              { method: "GET" },
            );
            const json = await r.json();
            if (!cancel && json.success && Array.isArray(json.replies) && json.replies.length > 0) {
              const replies = json.replies as ReplyRow[];
              // use the latest reply
              const latest = replies[replies.length - 1];
              setReplyId(latest.id);
              setHasReplied(true);
              // if reaction already exists in DB, you could set finalReactionText here
              if (latest.reaction_text) {
                setFinalReactionText(latest.reaction_text);
                setReactionSent(true);
              }
            } else if (!cancel) {
              // no replies despite status
              setHasReplied(false);
              setReplyId(null);
            }
          } catch (err) {
            console.warn("[MomentViewPage] Failed to load replies:", err);
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
      // hiddenText from res is ignored in this flow
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
      console.warn("[handleReactionSubmit] Missing replyId; reaction cannot be sent.");
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

  async function handleHiddenUnlock() {
    if (!moment) return;
    if (!window.PaystackPop || !paystackKey) {
      alert("Payment system not ready");
      return;
    }

    const priceKes = moment.hiddenUnlockPriceKes ?? 20;

    setUnlockingHidden(true);

    const handler = window.PaystackPop.setup({
      key: paystackKey,
      email: deepTruthEmail || "user@example.com",
      amount: priceKes * 100,
      currency,
      metadata: {
        type: "HIDDEN_UNLOCK",
        momentId: moment.id,
        shortCode: moment.shortCode,
      },
      callback: function (response) {
        setUnlockingHidden(false);
        if (response.reference) {
          void fetchHiddenWithReference(response.reference);
        } else {
          alert("Payment completed but no reference returned");
        }
      },
      onClose: function () {
        setUnlockingHidden(false);
      },
    });

    handler.openIframe();
  }

  async function fetchHiddenWithReference(reference: string) {
    if (!moment) return;
    try {
      const res = await fetch(
        `/api/rania/moments/${moment.id}/hidden/unlock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-rania-guest-id":
              typeof window !== "undefined"
                ? localStorage.getItem("rania_guest_id") ?? ""
                : "",
          },
          body: JSON.stringify({
            paymentReference: reference,
            skipPaymentCheck: true,
            identity: {},
          }),
        },
      );

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to unlock hidden truth");
      }

      setHiddenFullText(json.hiddenFullText);
    } catch (err: any) {
      alert(err.message ?? "Failed to unlock hidden truth");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 relative">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-bounce">✨</div>
          <p className="text-pink-500/70">Loading this moment…</p>
        </div>
      </div>
    );
  }

  if (loadError || !moment) {
    return (
      <div className="glass rounded-xl sm:rounded-2xl p-6 sm:p-8 max-w-md mx-auto space-y-4 text-center bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 relative">
        <div className="text-4xl">😕</div>
        <p className="text-pink-600 font-medium">
          Could not load this RANIA moment.
        </p>
        <button
          onClick={() => router.push("/moments/create")}
          className="w-full py-2 sm:py-3 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold hover:scale-105 transition"
        >
          Create Your Own
        </button>
      </div>
    );
  }

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.raniaonline.com";
  const startUrl = `${baseUrl}/moments/create`;

  const hasHiddenPreview = !!moment.hiddenPreview;
  const hasFullHidden = !!hiddenFullText;

  const phaseReply = !hasReplied;
  const phaseAwaitingHidden =
    hasReplied && !hasHiddenPreview && !hasFullHidden;
  const phasePreviewOnly =
    hasReplied && hasHiddenPreview && !hasFullHidden;
  const phaseFullHidden = hasReplied && hasFullHidden;

  const previewMasked =
    hasHiddenPreview && moment.hiddenPreview
      ? maskPreview(moment.hiddenPreview)
      : "";

  const fullHiddenText = hiddenFullText ?? "";
  const finalReplyForCard =
    finalReactionText || (reactionSent ? "[Reaction sent]" : "[Their reaction]");

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />

      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-0 bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 relative">
        {/* HEADER */}
        <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4 sm:space-y-6 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-cyan-500/10 border border-purple-400/40">
          <div className="space-y-2 sm:space-y-3">
            <div className="text-xs sm:text-sm font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              RANIA Emotional Thread
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-100 leading-tight">
              {moment.teaserText}
            </h2>
          </div>

          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-slate-200">
              💭 They sent you a teaser. Reply first. When they write a hidden truth, you’ll see a masked preview like{" "}
              <span className="font-mono text-pink-300">&quot;I ………………&quot;</span>. To see the full sentence, you can unlock it.
            </p>
          </div>
        </div>

        {/* PHASE 1: FIRST REPLY (FREE) */}
        {phaseReply && (
          <div className="space-y-4">
            <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4 sm:space-y-6 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-cyan-500/10 border border-purple-400/40">
              <h3 className="font-bold text-base sm:text-xl text-slate-100">
                💬 Reply free
              </h3>

              <div className="space-y-2 sm:space-y-3">
                <label className="text-xs sm:text-sm font-bold text-slate-200">
                  Type your honest reply
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl bg-slate-950 border border-slate-700 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-100 focus:border-purple-400 focus:outline-none resize-none"
                  placeholder="Reply from your heart…"
                />
              </div>

              <div className="space-y-2 sm:space-y-3">
                <label className="text-xs sm:text-sm font-bold text-slate-200">
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
                <span className="text-xs text-pink-300 font-semibold">
                  Selected: {vibeScore ?? 5}
                </span>
              </div>

              <button
                onClick={handleReplySubmit}
                disabled={submittingReply}
                className="w-full py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-xs sm:text-base shadow-lg shadow-purple-500/40 hover:shadow-purple-500/70 transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submittingReply ? "📤 Sending reply…" : "✨ Reply & Wait for Their Truth"}
              </button>

              <p className="text-[10px] sm:text-xs text-slate-300 text-center">
                After you reply, RANIA notifies them. They will log in, see your reply, and write a hidden truth for you.
              </p>
            </div>
          </div>
        )}

        {/* PHASE 2: AWAITING HIDDEN TRUTH */}
        {phaseAwaitingHidden && (
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 text-xs sm:text-sm text-slate-200">
            Your reply is saved. RANIA has notified them. Once they write a hidden truth, you’ll see a preview here.
          </div>
        )}

        {/* PHASE 3 & 4: PREVIEW / FULL HIDDEN */}
        {(phasePreviewOnly || phaseFullHidden) && (
          <div className="space-y-4 rounded-2xl border border-purple-400/60 bg-slate-950/70 p-4 sm:p-5 text-xs sm:text-sm">
            {/* HIDDEN PREVIEW OR FULL */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase text-pink-300">
                Hidden truth from them
              </div>
              <div className="text-sm whitespace-pre-wrap text-pink-50">
                {phaseFullHidden ? fullHiddenText : previewMasked}
              </div>
            </div>

            {/* Unlock CTA when preview only */}
            {phasePreviewOnly && moment.isHiddenLocked && (
              <div className="space-y-2 rounded-2xl border border-pink-400/60 bg-pink-950/80 p-3">
                <div className="text-[11px] text-pink-100/80">
                  This is just the first word. To see the full sentence/paragraph, unlock the entire message for KES{" "}
                  {moment.hiddenUnlockPriceKes ?? 20}.
                </div>
                <button
                  type="button"
                  onClick={handleHiddenUnlock}
                  disabled={unlockingHidden}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-xs hover:scale-105 transition disabled:opacity-60"
                >
                  {unlockingHidden
                    ? "🔓 Processing payment…"
                    : `🔓 Unlock full truth – KES ${moment.hiddenUnlockPriceKes ?? 20}`}
                </button>
              </div>
            )}

            {/* Reaction form only with full hidden */}
            {phaseFullHidden && (
              <form
                onSubmit={handleReactionSubmit}
                className="space-y-2 rounded-2xl border border-purple-400/60 bg-slate-950 p-3 sm:p-4 text-xs"
              >
                <div className="font-medium text-pink-50">
                  Now that you’ve seen their full truth, what do you want to say back?
                </div>
                <textarea
                  value={reactionText}
                  onChange={(e) => setReactionText(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-pink-400/60 bg-slate-950 px-2 py-2 text-xs text-pink-50 focus:border-pink-300 focus:outline-none"
                  placeholder="Type your honest reaction here…"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReaction || !reactionText.trim()}
                    className="rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 px-3 py-1.5 text-[11px] font-semibold text-white hover:scale-105 transition disabled:opacity-60"
                  >
                    {submittingReaction ? "Sending…" : "Send reaction"}
                  </button>
                </div>
              </form>
            )}

            {/* Moment static card */}
            {phaseFullHidden && (
              <div className="space-y-2 border-t border-purple-400/40 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-pink-100">
                    Conversation card (you or the sender can download)
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
                    hiddenText={fullHiddenText}
                    replyText={finalReplyForCard}
                    shareUrl={`${baseUrl}/m/${moment.shortCode}`}
                  />
                )}
                <p className="text-[10px] text-slate-300">
                  Tip: If you&apos;re the sender, you can open this page and download the card as proof of the whole moment.
                </p>
              </div>
            )}

            {/* Deep Truth */}
            <div className="rounded-2xl border border-purple-400/50 bg-slate-950 p-3 sm:p-4 space-y-3">
              <h3 className="font-bold text-pink-100 flex items-center gap-2 text-xs sm:text-sm">
                <span>🔬</span> Deep Breakdown (optional – KES {DEEP_TRUTH_PRICE_KES})
              </h3>

              {!deepTruth && !deepTruthLoading && (
                <div className="space-y-2 sm:space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] sm:text-xs font-bold text-pink-200">
                      Email for payment receipt
                    </label>
                    <input
                      type="email"
                      value={deepTruthEmail}
                      onChange={(e) => setDeepTruthEmail(e.target.value)}
                      className="w-full rounded-lg bg-slate-950 border border-pink-400/60 px-2 py-1.5 text-[11px] text-pink-50 focus:border-pink-300 focus:outline-none"
                      placeholder="you@campus.ac.ke"
                    />
                  </div>
                  <button
                    onClick={handleDeepTruth}
                    disabled={payingDeepTruth}
                    className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-xs hover:scale-105 transition disabled:opacity-60"
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
                  <div className="text-[11px] text-pink-100/80">Deep Truth analysis</div>
                  <div className="text-[11px] text-pink-50 whitespace-pre-wrap border border-pink-400/50 rounded-md p-2 bg-slate-950">
                    {deepTruth}
                  </div>
                  <div className="space-y-2 border-t border-pink-400/40 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-pink-100">
                        Deep Truth share card (Status / groups)
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
                        hiddenText={fullHiddenText || previewMasked}
                        deepTruth={deepTruth}
                        shareUrl={`${baseUrl}/m/${moment.shortCode}`}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Share text (only when full hidden is known) */}
            {phaseFullHidden && (
              <div className="rounded-2xl border border-pink-400/50 bg-slate-950/80 p-3 sm:p-4 space-y-3">
                <h3 className="font-bold text-pink-100 flex items-center gap-2 text-xs sm:text-sm">
                  <span>📲</span> Share This Moment Back
                </h3>
                <textarea
                  readOnly
                  className="w-full rounded-lg bg-slate-950 border border-pink-400/50 px-2 sm:px-3 py-2 text-[10px] sm:text-xs text-pink-50 font-mono resize-none"
                  rows={4}
                  value={`I just unlocked a real moment on RANIA:\n\n"${fullHiddenText}"\n\nCreate yours: ${startUrl}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `I just unlocked a real moment on RANIA:\n\n"${fullHiddenText}"\n\nCreate yours: ${startUrl}`,
                    );
                  }}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-xs sm:text-sm hover:scale-105 transition"
                >
                  📋 Copy to Share
                </button>
              </div>
            )}
          </div>
        )}

        {/* FOOTER CTA */}
        <div className="text-center pt-3 sm:pt-4 pb-6 sm:pb-8">
          <button
            onClick={() => router.push("/moments/create")}
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-purple-400/60 bg-slate-50/10 text-purple-100 font-bold text-xs sm:text-sm hover:bg-slate-50/20 transition"
          >
            ← Create Your Own RANIA Moment
          </button>
        </div>
      </div>
    </>
  );
}
