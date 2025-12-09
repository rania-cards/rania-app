/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
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
    Storage?: {
      get: (key: string) => Promise<any>;
      set: (key: string, value: string) => Promise<any>;
    };
  }
}

const HIDDEN_UNLOCK_PRICE_KES = 20;
const DEEP_TRUTH_PRICE_KES = 50;

type StorageResult = { value?: string };

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
  reply_text: string | null;
  reaction_text: string | null;
  sender_response_text: string | null;
  created_at: string;
  identity: any;
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

  const [replyText, setReplyText] = useState("");
  const [vibeScore, setVibeScore] = useState<number | undefined>(5);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [hasReplied, setHasReplied] = useState(false);
  const [replyId, setReplyId] = useState<string | null>(null);

  const [hiddenFullText, setHiddenFullText] = useState<string | null>(null);
  const [unlockingHidden, setUnlockingHidden] = useState(false);
  const [hasUnlockedHidden, setHasUnlockedHidden] = useState(false);

  const [reactionText, setReactionText] = useState("");
  const [submittingReaction, setSubmittingReaction] = useState(false);
  const [reactionSent, setReactionSent] = useState(false);
  const [finalReactionText, setFinalReactionText] = useState<string | null>(null);

  // Sender's response to receiver's reaction
  const [senderResponseText, setSenderResponseText] = useState<string | null>(null);

  const [deepTruth, setDeepTruth] = useState<string | null>(null);
  const [deepTruthLoading, setDeepTruthLoading] = useState(false);
  const [deepTruthError, setDeepTruthError] = useState<string | null>(null);
  const [deepTruthEmail, setDeepTruthEmail] = useState<string>("test@example.com");
  const [payingDeepTruth, setPayingDeepTruth] = useState(false);

  const [showMomentCard, setShowMomentCard] = useState(false);
  const [showDeepTruthCard, setShowDeepTruthCard] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const paystackKey =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? ""
      : "";
  const currency =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_PAYSTACK_CURRENCY ?? "KES"
      : "KES";

  // Save to persistent storage
  const saveToStorage = async (key: string, data: any) => {
    try {
      await window.Storage?.set(`receiver:${shortCode}:${key}`, JSON.stringify(data));
    } catch (err) {
      console.warn("Storage save failed:", err);
    }
  };

  // Load from persistent storage
  const loadFromStorage = async (key: string) => {
    try {
      const result = (await window.Storage?.get(
        `receiver:${shortCode}:${key}`
      )) as StorageResult | null;

      return result?.value ? JSON.parse(result.value) : null;
    } catch (err) {
      console.warn("Storage load failed:", err);
      return null;
    }
  };

  // Toast handler
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Initial load
  useEffect(() => {
    let cancel = false;

    async function load() {
      if (!shortCode) return;
      setLoading(true);
      setLoadError(null);

      try {
        const res = await apiGetMoment(shortCode);
        if (cancel) return;

        const m = res.moment as MomentData;
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
              await saveToStorage("reply", { replyId: latest.id, hasReplied: true });

              if (latest.reaction_text) {
                setFinalReactionText(latest.reaction_text);
                setReactionSent(true);
                await saveToStorage("reaction", { reactionText: latest.reaction_text, reactionSent: true });
              }

              // Check for sender's response
              if (latest.sender_response_text) {
                setSenderResponseText(latest.sender_response_text);
                await saveToStorage("senderResponse", { senderResponseText: latest.sender_response_text });
              }
            }
          } catch (err) {
            console.warn("Failed to load replies:", err);
          }
        }

        // Load from storage
        const savedReply = await loadFromStorage("reply");
        if (savedReply) {
          setReplyId(savedReply.replyId);
          setHasReplied(savedReply.hasReplied);
        }

        const savedHidden = await loadFromStorage("hidden");
        if (savedHidden) {
          setHiddenFullText(savedHidden.hiddenFullText);
          setHasUnlockedHidden(true);
        }

        const savedReaction = await loadFromStorage("reaction");
        if (savedReaction) {
          setFinalReactionText(savedReaction.reactionText);
          setReactionSent(savedReaction.reactionSent);
        }

        const savedSenderResponse = await loadFromStorage("senderResponse");
        if (savedSenderResponse) {
          setSenderResponseText(savedSenderResponse.senderResponseText);
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

  // Polling for real-time updates
  useEffect(() => {
    const poll = async () => {
      if (!shortCode || !hasReplied) return;

      try {
        const r = await fetch(`/api/rania/moments/by-code/${shortCode}/replies`, {
          method: "GET",
        });
        const json = await r.json();

        if (json.success && Array.isArray(json.replies) && json.replies.length > 0) {
          const replies = json.replies as ReplyRow[];
          const latest = replies[replies.length - 1];

          // Check for sender's response to receiver's reaction
          if (latest.sender_response_text && latest.sender_response_text !== senderResponseText) {
            setSenderResponseText(latest.sender_response_text);
            await saveToStorage("senderResponse", { senderResponseText: latest.sender_response_text });
            setToast("Sender replied! 💬");
          }
        }

        // Check for new hidden truth from sender
        const momentRes = await apiGetMoment(shortCode);
        const m = momentRes.moment as MomentData;

        if (m.hiddenPreview && !moment?.hiddenPreview) {
          setMoment(m);
          setToast("They sent a hidden truth! 🔒");
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }
    };

    pollIntervalRef.current = setInterval(poll, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [shortCode, hasReplied, senderResponseText, moment?.hiddenPreview]);

  async function handleReplySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!moment) return;

    if (!replyText.trim()) {
      setToast("Reply cannot be empty.");
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
      setHasReplied(true);
      await saveToStorage("reply", { replyId: res.replyId, hasReplied: true });
      setReplyText("");
      setToast("Reply sent. Waiting for their hidden truth…");
    } catch (err: any) {
      setToast(err.message ?? "Failed to submit reply");
    } finally {
      setSubmittingReply(false);
    }
  }

  async function handleReactionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!moment) return;

    if (!replyId) {
      alert("We could not find your reply. Refresh and try again.");
      return;
    }

    if (!reactionText.trim()) {
      alert("Reaction cannot be empty.");
      return;
    }

    setSubmittingReaction(true);

    try {
      const res = await fetch(`/api/rania/moments/${moment.id}/reaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rania-guest-id":
            typeof window !== "undefined" ? localStorage.getItem("rania_guest_id") ?? "" : "",
        },
        body: JSON.stringify({
          replyId,
          reactionText: reactionText.trim(),
          identity: {},
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to send reaction");

      setFinalReactionText(reactionText.trim());
      await saveToStorage("reaction", { reactionText: reactionText.trim(), reactionSent: true });
      setReactionText("");
      setReactionSent(true);
      setToast("Reaction sent!");
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
      setToast("Deep Truth unlocked.");
    } catch (err: any) {
      setDeepTruthError(err.message ?? "Failed to get Deep Truth");
    } finally {
      setDeepTruthLoading(false);
    }
  }

  async function handleHiddenUnlock() {
    if (!moment) return;
    if (!window.PaystackPop || !paystackKey) {
      setToast("Payment system not ready");
      return;
    }

    const priceKes = moment.hiddenUnlockPriceKes ?? HIDDEN_UNLOCK_PRICE_KES;

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
          setToast("Payment completed but no reference returned");
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
      setHasUnlockedHidden(true);
      await saveToStorage("hidden", { hiddenFullText: json.hiddenFullText, hasUnlockedHidden: true });
      setToast("Hidden truth unlocked.");
    } catch (err: any) {
      setToast(err.message ?? "Failed to unlock hidden truth");
    }
  }

  function handleShareFullText() {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://www.raniaonline.com";
    const startUrl = `${baseUrl}/moments/create`;
    const text = hiddenFullText
      ? `I just unlocked a moment: "${hiddenFullText}"\n\nCreate yours: ${startUrl}`
      : `Create a RANIA moment: ${startUrl}`;

    if (navigator.share) {
      navigator
        .share({
          title: "Unlocked RANIA moment",
          text,
        })
        .catch(() => {
          navigator.clipboard.writeText(text);
          setToast("Link copied to clipboard");
        });
    } else {
      navigator.clipboard.writeText(text);
      setToast("Copied to clipboard");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[420px]">
        <div className="text-center space-y-3">
          <div className="text-5xl animate-bounce">✨</div>
          <p className="text-pink-500/80">Loading this moment…</p>
        </div>
      </div>
    );
  }

  if (loadError || !moment) {
    return (
      <div className="glass rounded-xl sm:rounded-2xl p-6 sm:p-8 max-w-md mx-auto space-y-4 text-center">
        <div className="text-5xl">😕</div>
        <p className="text-pink-600 font-medium">Could not load this RANIA moment.</p>
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
  const phaseAwaitingHidden = hasReplied && !hasHiddenPreview && !hasFullHidden;
  const phasePreviewOnly = hasReplied && hasHiddenPreview && !hasFullHidden;
  const phaseFullHidden = hasReplied && hasFullHidden;

  const previewMasked =
    hasHiddenPreview && moment.hiddenPreview ? maskPreview(moment.hiddenPreview) : "";

  const fullHiddenText = hiddenFullText ?? "";

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />

      <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-0 py-6">
        <header className="rounded-3xl p-6 bg-gradient-to-br from-purple-700/10 via-pink-700/8 to-cyan-700/6 border border-purple-400/30 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                RANIA — Emotional Thread
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-100 leading-tight">
                {moment.teaserText}
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Someone sent you this. Reply honestly — first reply. When they write a hidden truth,
                you&apos;ll see a masked preview here.
              </p>
            </div>

            <div className="hidden sm:flex flex-col items-end gap-2">
              <button
                onClick={() => router.push("/moments/create")}
                className="px-4 py-2 rounded-full bg-slate-900/70 text-xs text-white font-semibold border border-slate-700 hover:scale-105 transition"
              >
                Create a moment
              </button>
              <div className="text-xs text-slate-400">Share a real moment — be bold.</div>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="space-y-5">
            {phaseReply && (
              <div className="rounded-2xl p-5 bg-slate-900/80 border border-slate-800 shadow-md">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-100">💬 Reply (free)</h2>
                  <div className="text-xs text-slate-400">First reply unlocks the preview flow</div>
                </div>

                <form onSubmit={handleReplySubmit} className="mt-4 space-y-4">
                  <label className="block text-xs text-slate-300 font-semibold">Your reply</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                    placeholder="Say something honest and kind…"
                  />

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400">Vibe (1–10)</label>
                      <input
                        aria-label="Vibe"
                        type="range"
                        min={1}
                        max={10}
                        value={vibeScore ?? 5}
                        onChange={(e) => setVibeScore(Number(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="w-20 text-center text-xs text-pink-300 font-semibold">
                      {vibeScore ?? 5}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={submittingReply}
                      className="flex-1 py-2 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold hover:scale-105 transition disabled:opacity-60"
                    >
                      {submittingReply ? "Sending…" : "Send Reply"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyText("");
                        setVibeScore(5);
                      }}
                      className="px-4 py-2 rounded-2xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 transition"
                    >
                      Clear
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">Replies are private — RANIA will notify them on WhatsApp.</p>
                </form>
              </div>
            )}

            {phaseAwaitingHidden && (
              <div className="rounded-2xl p-4 bg-slate-900/80 border border-slate-800 text-sm text-slate-300">
                ✅ Your reply has been saved. Waiting for them to write a hidden truth — you&apos;ll see a preview here
                once they submit it.
              </div>
            )}

            {(phasePreviewOnly || phaseFullHidden) && (
              <div className="rounded-2xl p-4 bg-slate-900/80 border border-purple-400/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[11px] uppercase font-semibold text-pink-300">Hidden truth</div>
                    <div className="text-xs text-slate-400">What they wrote for you</div>
                  </div>
                  <div className="text-xs text-slate-500">Private</div>
                </div>

                <div className="rounded-xl p-4 bg-slate-950 border border-slate-800 text-pink-50 min-h-[64px]">
                  {phaseFullHidden ? (
                    <div className="whitespace-pre-wrap text-sm">{fullHiddenText}</div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm">{previewMasked}</div>
                  )}
                </div>

                {phasePreviewOnly && moment.isHiddenLocked && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div className="text-sm text-slate-300">
                      This is a short preview. To read the full message, unlock it now.
                    </div>

                    <button
                      onClick={handleHiddenUnlock}
                      disabled={unlockingHidden || hasUnlockedHidden}
                      className="w-full py-2 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 text-white font-bold hover:scale-105 transition disabled:opacity-60"
                    >
                      {hasUnlockedHidden ? "✓ Already unlocked" : unlockingHidden ? "Opening payment…" : `🔓 Unlock full truth — KES ${moment.hiddenUnlockPriceKes ?? HIDDEN_UNLOCK_PRICE_KES}`}
                    </button>
                  </div>
                )}

                {phasePreviewOnly && !moment.isHiddenLocked && (
                  <div className="mt-3 text-sm text-slate-300">Full truth is available — refresh to load it.</div>
                )}

                {phaseFullHidden && (
                  <>
                    <form onSubmit={handleReactionSubmit} className="mt-4 space-y-3">
                      <label className="block text-sm font-semibold text-slate-200">
                        Reply to their truth
                      </label>
                      <textarea
                        value={reactionText}
                        onChange={(e) => setReactionText(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg bg-slate-950 border border-pink-400/30 px-3 py-2 text-sm text-pink-50 focus:outline-none"
                        placeholder="How does this make you feel? Reply honestly…"
                      />
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={submittingReaction || !reactionText.trim()}
                          className="flex-1 py-2 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold hover:scale-105 transition disabled:opacity-60"
                        >
                          {submittingReaction ? "Sending…" : "Send reaction"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReactionText("");
                          }}
                          className="px-4 py-2 rounded-2xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-800 transition"
                        >
                          Clear
                        </button>
                      </div>
                    </form>

                    {/* SENDER'S RESPONSE SECTION */}
                    {senderResponseText && (
                      <div className="mt-4 border-t border-purple-400/20 pt-4 space-y-3">
                        <div className="space-y-2">
                          <div className="text-[11px] uppercase font-semibold text-cyan-300">Their response to you</div>
                          <div className="rounded-lg bg-cyan-950/40 border border-cyan-400/30 p-3">
                            <p className="text-sm text-cyan-50 leading-relaxed">{senderResponseText}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 border-t border-purple-400/20 pt-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-pink-100">Shareable card</div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowMomentCard((v) => !v)}
                            className="text-xs px-3 py-1 rounded-full border border-pink-400/40 text-pink-200 hover:bg-pink-500/10 transition"
                          >
                            {showMomentCard ? "Hide" : "Preview"}
                          </button>
                        
                          <button
                            onClick={handleShareFullText}
                            className="text-xs px-3 py-1 rounded-full border border-slate-700 text-slate-200 hover:bg-slate-800 transition"
                          >
                            Resend / Share
                          </button>
                        </div>
                      </div>

                      {showMomentCard && (
                        <div className="mt-3">
                          <MomentCardCanvas
                            teaser={moment.teaserText}
                            hiddenText={fullHiddenText}
                            replyText={reactionText || "[Their reaction]"}
                            shareUrl={`${baseUrl}/m/${moment.shortCode}`}
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <div className="rounded-2xl p-4 bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-pink-100 flex items-center gap-2">
                    <span>🔬</span> Deep Breakdown
                  </div>
                  <div className="text-xs text-slate-400">Optional deeper take on this moment</div>
                </div>
                <div className="text-xs text-slate-500">KES {DEEP_TRUTH_PRICE_KES}</div>
              </div>

              {deepTruth && (
                <div className="mt-3 text-sm text-pink-50 whitespace-pre-wrap border border-pink-400/20 rounded-md p-3 bg-slate-950">
                  {deepTruth}
                </div>
              )}

              {!deepTruth && !deepTruthLoading && (
                <div className="mt-3 space-y-2">
                  <label className="block text-xs text-slate-400">Email for receipt</label>
                  <input
                    type="email"
                    value={deepTruthEmail}
                    onChange={(e) => setDeepTruthEmail}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none"
                    placeholder="you@domain.com"
                  />
                  <button
                    onClick={handleDeepTruth}
                    disabled={payingDeepTruth}
                    className="w-full py-2 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold hover:scale-105 transition disabled:opacity-60"
                  >
                    {payingDeepTruth ? "Opening payment…" : `Unlock Deep Breakdown — KES ${DEEP_TRUTH_PRICE_KES}`}
                  </button>
                </div>
              )}

              {deepTruthLoading && (
                <div className="mt-3 text-sm text-pink-100">Analyzing…</div>
              )}

              {deepTruthError && <div className="mt-3 text-sm text-red-400">{deepTruthError}</div>}

              {deepTruth && (
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-pink-100">Share deep truth</div>
                    <button
                      onClick={() => setShowDeepTruthCard((v) => !v)}
                      className="text-xs px-3 py-1 rounded-full border border-pink-400/40 text-pink-200 hover:bg-pink-500/10 transition"
                    >
                      {showDeepTruthCard ? "Hide" : "Preview"}
                    </button>
                  </div>

                  {showDeepTruthCard && (
                    <div className="mt-3">
                      <DeepTruthCardCanvas
                        teaser={moment.teaserText}
                        hiddenText={fullHiddenText}
                        deepTruth={deepTruth}
                        shareUrl={`${baseUrl}/m/${moment.shortCode}`}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tips / small help */}
            <div className="rounded-2xl p-4 bg-slate-900/80 border border-slate-800 text-sm text-slate-300">
              <div className="font-semibold text-slate-100 mb-2">Tips</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>Reply first — it keeps the conversation honest.</li>
                <li>Previews don&apos;t show the full message. Unlock to see everything.</li>
                <li>Unlocked truths are private — share consciously.</li>
              </ul>
            </div>

            {/* small footer */}
            <div className="rounded-2xl p-3 bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <div>Need help? Reach the RANIA team</div>
                <button
                  onClick={() => router.push("/help")}
                  className="text-xs px-2 py-1 rounded-full border border-slate-700 text-slate-200 hover:bg-slate-800 transition"
                >
                  Help
                </button>
              </div>
            </div>
          </aside>
        </main>

        {/* share area when full hidden is available */}
        {phaseFullHidden && (
          <div className="rounded-2xl p-4 bg-slate-900/80 border border-pink-400/20">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-pink-100">Share this unlocked moment</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShareFullText}
                  className="px-3 py-1 rounded-full bg-slate-800 text-xs text-white hover:scale-105 transition"
                >
                  Resend / Share
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`"${fullHiddenText}"`);
                    setToast("Hidden text copied");
                  }}
                  className="px-3 py-1 rounded-full border border-slate-700 text-xs text-slate-200 hover:bg-slate-800 transition"
                >
                  Copy text
                </button>
              </div>
            </div>
          </div>
        )}

        {/* small global CTA / back */}
        <div className="text-center pt-2 pb-6">
          <button
            onClick={() => router.push("/moments/create")}
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-purple-400/60 bg-slate-50/6 text-purple-100 font-bold text-xs sm:text-sm hover:bg-slate-50/12 transition"
          >
            ← Create Your Own RANIA Moment
          </button>
        </div>

        {/* toast */}
        {toast && (
          <div className="fixed right-6 bottom-6 z-50">
            <div className="rounded-xl px-4 py-2 bg-slate-900/90 text-sm text-slate-100 border border-slate-800 shadow">
              {toast}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
