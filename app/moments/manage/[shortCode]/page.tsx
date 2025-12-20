/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";
import Script from "next/script";
import { useParams, useRouter } from "next/navigation";
import { apiGetMoment } from "@/lib/rania/client";

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
      set: (key: string, value: string) => Promise<any>;
      get: (key: string) => Promise<{ value?: string } | any>;
    };
  }
}

type ReplyRow = {
  id: string;
  reply_text: string;
  reaction_text: string | null;
  sender_response_text?: string | null;
  created_at: string;
};

type ManageMomentData = {
  id: string;
  shortCode: string;
  teaserText: string;
  hiddenPreview?: string;
  isHiddenLocked?: boolean;
  hiddenUnlockPriceKes?: number;
  clueText?: string | null;
  guessText?: string | null;
  status?: string;
};

const POLISH_PRICE_KES = 20;
const MAX_FREE_POLISH_ATTEMPTS = 3;

export default function ManageMomentPage() {
  const params = useParams<{ shortCode: string }>();
  const router = useRouter();
  const shortCode = params.shortCode;

  const [moment, setMoment] = useState<ManageMomentData | null>(null);
  const [replies, setReplies] = useState<ReplyRow[]>([]);

  // Clue + truth
  const [clueText, setClueText] = useState("");
  const [clueSubmitted, setClueSubmitted] = useState(false);

  const [fullHiddenText, setFullHiddenText] = useState("");
  const [truthSubmitted, setTruthSubmitted] = useState(false);

  // Reaction & response
  const [receiverReaction, setReceiverReaction] = useState<string | null>(null);
  const [senderResponse, setSenderResponse] = useState("");
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Polish state
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishError, setPolishError] = useState<string | null>(null);
  const [polishEmail, setPolishEmail] = useState("");
  const [polishAttempts, setPolishAttempts] = useState(0);

  // Toast / error / loading
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const paystackKey =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? ""
      : "";
  const currency =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_PAYSTACK_CURRENCY ?? "KES"
      : "KES";

  // Storage helpers
  const saveToStorage = async (key: string, data: any) => {
    try {
      await window.Storage?.set(
        `sender:${shortCode}:${key}`,
        JSON.stringify(data),
      );
    } catch (err) {
      console.warn("Storage save failed:", err);
    }
  };

  const loadFromStorage = async (key: string) => {
    try {
      const result = await window.Storage?.get(`sender:${shortCode}:${key}`);
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
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGetMoment(shortCode);
        if (cancelled) return;

        const m = res.moment as any;
        const mappedMoment: ManageMomentData = {
          id: m.id,
          shortCode: m.shortCode,
          teaserText: m.teaserText,
          hiddenPreview: m.hiddenPreview,
          isHiddenLocked: m.isHiddenLocked,
          hiddenUnlockPriceKes: m.hiddenUnlockPriceKes,
          clueText: m.clueText ?? null,
          guessText: m.guessText ?? null,
          status: m.status,
        };
        setMoment(mappedMoment);

        // Load replies
        const r = await fetch(
          `/api/rania/moments/by-code/${shortCode}/replies`,
          { method: "GET" },
        );
        const json = await r.json();
        if (!cancelled && json.success) {
          setReplies(json.replies as ReplyRow[]);

          if (json.replies.length > 0) {
            const latest = json.replies[json.replies.length - 1];
            if (latest.reaction_text) {
              setReceiverReaction(latest.reaction_text);
              await saveToStorage("reaction", {
                reactionText: latest.reaction_text,
              });
            }
            if (latest.sender_response_text) {
              setSenderResponse(latest.sender_response_text);
              await saveToStorage("response", {
                responseText: latest.sender_response_text,
              });
            }
          }
        }

        // Load from storage
        const savedTruth = await loadFromStorage("truth");
        if (savedTruth) {
          setFullHiddenText(savedTruth.hiddenFullText);
          setTruthSubmitted(savedTruth.truthSubmitted);
        }



        const savedPolish = await loadFromStorage("polish");
if (savedPolish) {
  setPolishAttempts(savedPolish.polishAttempts);
}
        const savedReaction = await loadFromStorage("reaction");
        if (savedReaction) {
          setReceiverReaction(savedReaction.reactionText);
        }

        const savedResponse = await loadFromStorage("response");
        if (savedResponse) {
          setSenderResponse(savedResponse.responseText);
        }

        const savedClue = await loadFromStorage("clue");
        if (savedClue) {
          setClueText(savedClue.clueText);
          setClueSubmitted(savedClue.clueSubmitted);
        } else if (mappedMoment.clueText) {
          // if already in DB but not in storage
          setClueText(mappedMoment.clueText);
          setClueSubmitted(true);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? "Failed to load moment");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    

    load();
    return () => {
      cancelled = true;
    };
  }, [shortCode]);

  // Polling for real-time updates (guess + reaction + response)
  useEffect(() => {
    const poll = async () => {
      if (!shortCode) return;

      try {
        // Refresh replies
        const r = await fetch(
          `/api/rania/moments/by-code/${shortCode}/replies`,
          { method: "GET" },
        );
        const json = await r.json();
        if (json.success && Array.isArray(json.replies)) {
          const replies = json.replies as ReplyRow[];
          setReplies(replies);

          if (replies.length > 0) {
            const latest = replies[replies.length - 1];

            if (
              latest.reaction_text &&
              latest.reaction_text !== receiverReaction
            ) {
              setReceiverReaction(latest.reaction_text);
              await saveToStorage("reaction", {
                reactionText: latest.reaction_text,
              });
              setToast("Receiver reacted to your truth! 💬");
            }

            if (
              latest.sender_response_text &&
              latest.sender_response_text !== senderResponse
            ) {
              // setSenderResponse(latest.sender_response_text);
              // await saveToStorage("response", {
              //   responseText: latest.sender_response_text,
              // });
            }
          }
        }

        // Refresh moment (for clue/guess/truth status)
        const res = await apiGetMoment(shortCode);
        const m = res.moment as any;
        setMoment((prev) => ({
          ...(prev ?? {}),
          id: m.id,
          shortCode: m.shortCode,
          teaserText: m.teaserText,
          hiddenPreview: m.hiddenPreview,
          isHiddenLocked: m.isHiddenLocked,
          hiddenUnlockPriceKes: m.hiddenUnlockPriceKes,
          clueText: m.clueText ?? null,
          guessText: m.guessText ?? null,
          status: m.status,
        }));
      } catch (err) {
        console.warn("Polling error:", err);
      }
    };

    pollIntervalRef.current = setInterval(poll, 3500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [shortCode, receiverReaction, senderResponse]);

  // Polish hidden truth
  async function callPolishAPI(text: string) {
  setIsPolishing(true);
  setPolishError(null);
  try {
    const res = await fetch("/api/rania/polish-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        field: "hidden",
        text,
        modeKey: "DEEP_CONFESSION",
        tone: "soft",
      }),
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || "Failed to polish text");
    }

    setFullHiddenText(json.polished);
    setPolishAttempts((c) => c + 1);
    await saveToStorage("polish", {
      polishAttempts: polishAttempts + 1,
    });
    setToast("Text polished!");
  } catch (err: any) {
    setPolishError(err.message ?? "Failed to polish with RANIA");
  } finally {
    setIsPolishing(false);
  }
}

function handlePolish() {
  setPolishError(null);

  if (!fullHiddenText.trim()) {
    setPolishError("Write something first before polishing.");
    return;
  }

  const remainingFree = Math.max(
    0,
    MAX_FREE_POLISH_ATTEMPTS - polishAttempts,
  );

  // If they still have free polish attempts, use them directly
  if (remainingFree > 0) {
    void callPolishAPI(fullHiddenText.trim());
    return;
  }

  // If out of free attempts, require payment
  if (!window.PaystackPop || !paystackKey) {
    setPolishError("Payment library not loaded or Paystack key missing.");
    return;
  }

  if (!polishEmail || !polishEmail.includes("@")) {
    setPolishError("Enter a valid email for Paystack receipt before polishing.");
    return;
  }

  const handler = window.PaystackPop.setup({
    key: paystackKey,
    email: polishEmail,
    amount: POLISH_PRICE_KES * 100,
    currency,
    metadata: {
      type: "POLISH_TEXT",
      field: "hidden",
      momentId: moment?.id,
    },
    callback: function () {
      void callPolishAPI(fullHiddenText.trim());
    },
    onClose: function () {
      // user closed
    },
  });

  handler.openIframe();
}
  // Save final hidden truth
  async function handleSaveHidden(e: React.FormEvent) {
    e.preventDefault();
    if (!moment) return;
    if (!fullHiddenText.trim()) {
      setError("Hidden truth cannot be empty.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/rania/moments/${moment.id}/hidden`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullHiddenText: fullHiddenText.trim(),
          unlockPriceKes: 20,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to save hidden truth");
      }

      await saveToStorage("truth", {
        hiddenFullText: fullHiddenText.trim(),
        truthSubmitted: true,
      });
      setTruthSubmitted(true);

      setMoment((prev) =>
        prev
          ? {
              ...prev,
              hiddenPreview: json.hiddenPreview as string,
              isHiddenLocked: true,
              hiddenUnlockPriceKes: json.priceKes as number,
              status: "truth_ready",
            }
          : prev,
      );

      setToast("Hidden truth saved!");
    } catch (err: any) {
      setError(err.message ?? "Failed to save hidden truth");
    } finally {
      setSaving(false);
    }
  }

  // Save clue
  async function handleSaveClue(e: React.FormEvent) {
    e.preventDefault();
    if (!moment) return;
    const trimmed = clueText.trim();
    if (!trimmed) {
      setToast("Clue cannot be empty.");
      return;
    }

    try {
      const res = await fetch(`/api/rania/moments/${moment.id}/clue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clueText: trimmed }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save clue");

      setClueSubmitted(true);
      setMoment((prev) =>
        prev
          ? {
              ...prev,
              clueText: trimmed,
              status: "clue_sent",
            }
          : prev,
      );
      await saveToStorage("clue", { clueText: trimmed, clueSubmitted: true });
      setToast("Clue sent! Now wait for their guess.");
    } catch (err: any) {
      setToast(err.message ?? "Error saving clue");
    }
  }

async function handleSenderResponse(e: React.FormEvent) {
  e.preventDefault();
  if (!moment) return;

  if (!senderResponse.trim()) {
    setToast("Response cannot be empty.");
    return;
  }

  setSubmittingResponse(true);
  const responseText = senderResponse.trim(); // Capture the value
  
  try {
    if (replies.length === 0) {
      setToast("No replies found to respond to.");
      setSubmittingResponse(false);
      return;
    }

    const firstReply = replies[0];

    // Clear input IMMEDIATELY (optimistic update)
    setSenderResponse("");

    const res = await fetch(
      `/api/rania/moments/${moment.id}/sender-response`,
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
          replyId: firstReply.id,
          senderResponseText: responseText,
          identity: {},
        }),
      },
    );

    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to send response");

    // Save to storage after successful send
    await saveToStorage("response", {
      responseText: responseText,
    });
    
    setToast("Response sent!");
  } catch (err: any) {
    // If error, restore the text
    setSenderResponse(responseText);
    setToast(err.message ?? "Error sending response");
  } finally {
    setSubmittingResponse(false);
  }
}


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-bounce">✨</div>
          <p className="text-pink-300 font-medium">Loading your moment…</p>
        </div>
      </div>
    );
  }

  if (error && !moment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 max-w-md w-full text-center space-y-4">
          <div className="text-5xl">😕</div>
          <p className="text-slate-300 font-medium">{error}</p>
          <button
            onClick={() => router.push("/moments/create")}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold hover:scale-105 transition"
          >
            Back to create
          </button>
        </div>
      </div>
    );
  }

  if (!moment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 max-w-md w-full text-center space-y-4">
          <div className="text-5xl">😕</div>
          <p className="text-slate-300 font-medium">Moment not found.</p>
          <button
            onClick={() => router.push("/moments/create")}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold hover:scale-105 transition"
          >
            Back to create
          </button>
        </div>
      </div>
    );
  }

  const hasReply = replies.length > 0;
  const hasClue = !!moment.clueText || clueSubmitted;
  const hasGuess = !!moment.guessText;
  const hasTruth = truthSubmitted || !!moment.hiddenPreview;

  const remainingFreePolish = Math.max(
    0,
    MAX_FREE_POLISH_ATTEMPTS - polishAttempts,
  );

  return (
    <>
      <Script
        src="https://js.paystack.co/v1/inline.js"
        strategy="afterInteractive"
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* Glow background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="mb-8 sm:mb-12">
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight">
                Manage your
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  emotional moment
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl">
                They replied. Now send a clue, see their guess, reveal your
                full truth, and close the loop with a final response.
              </p>
            </div>
          </div>

          {/* Content grid */}
          <div className="grid gap-8 lg:gap-12 lg:grid-cols-[1.1fr,0.9fr] items-start">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* Teaser Card */}
              <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-cyan-400/30 backdrop-blur-sm">
                <h2 className="font-bold text-lg sm:text-xl text-slate-100 flex items-center gap-2">
                  <span>💬</span> Teaser You Sent
                </h2>
                <div className="rounded-xl bg-slate-950/60 border border-slate-800/60 p-5 sm:p-6">
                  <p className="text-sm sm:text-base leading-relaxed text-slate-100 font-medium">
                    {moment.teaserText}
                  </p>
                </div>
              </div>

              {/* Replies Card */}
              {replies.length > 0 && (
                <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-400/30 backdrop-blur-sm">
                  <h2 className="font-bold text-lg sm:text-xl text-slate-100 flex items-center gap-2">
                    <span>🔔</span> Receiver&apos;s Reply
                  </h2>
                  <div className="space-y-3">
                    {replies.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg bg-slate-950/60 border border-slate-800/60 p-4 space-y-2"
                      >
                        <p className="text-sm sm:text-base text-slate-100 leading-relaxed">
                          {r.reply_text}
                        </p>
                        <div className="text-xs text-slate-500">
                          {new Date(r.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STAGES: CLUE -> GUESS -> TRUTH -> RESPONSE */}
              {hasReply ? (
                <>
                  {/* Stage 1: Write clue (if none yet) */}
                  {!hasClue && (
                    <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-400/30 backdrop-blur-sm">
                      <h2 className="font-bold text-lg sm:text-xl text-slate-100 flex items-center gap-2">
                        <span>🕵️</span> Drop a clue
                      </h2>
                      <p className="text-sm text-slate-300">
                        Give them a clue about your real truth. It should hint at
                        the emotion, not spoil the whole message.
                      </p>
                      <form onSubmit={handleSaveClue} className="space-y-3">
                        <label className="block text-xs font-semibold text-slate-200">
                          Clue
                        </label>
                        <textarea
                          value={clueText}
                          onChange={(e) => setClueText(e.target.value)}
                          rows={4}
                          className="w-full rounded-xl bg-slate-950/70 border border-slate-700 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-400 focus:outline-none resize-none"
                          placeholder="Example: It’s about something I’ve felt for a long time but never said aloud…"
                        />
                        <button
                          type="submit"
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-sm hover:scale-105 transition disabled:opacity-60"
                        >
                          Send clue
                        </button>
                        <p className="text-xs text-slate-400">
                          Once you send a clue, they&apos;ll see it and get a
                          chance to guess your real truth.
                        </p>
                      </form>
                    </div>
                  )}

                  {/* Stage 2: Waiting for guess */}
                  {hasClue && !moment.guessText && !hasTruth && (
                    <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3 bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-400/30 backdrop-blur-sm">
                      <h2 className="font-bold text-lg sm:text-xl text-slate-100 flex items-center gap-2">
                        <span>⏳</span> Waiting for their guess
                      </h2>
                      <p className="text-sm text-slate-300">
                        Your clue has been sent. When they guess, you&apos;ll
                        see it here and can decide how much truth to reveal.
                      </p>
                      {moment.clueText && (
                        <div className="rounded-lg bg-slate-950/60 border border-slate-800/60 p-4">
                          <p className="text-xs text-slate-400 font-semibold mb-1">
                            Clue you sent
                          </p>
                          <p className="text-sm text-slate-100">
                            {moment.clueText}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stage 3: Guess arrived, write full truth */}
                  {hasClue &&
                    moment.guessText &&
                    !truthSubmitted && (
                      <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-6 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-400/30 backdrop-blur-sm">
                        <div>
                          <h2 className="font-bold text-lg sm:text-xl text-slate-100 flex items-center gap-2 mb-2">
                            <span>🎯</span> Their guess & your full truth
                          </h2>
                          <p className="text-sm text-slate-400 mb-3">
                            They guessed. Now reveal what you actually feel. This
                            is the truth they&apos;ll eventually unlock.
                          </p>

                          <div className="rounded-lg bg-slate-950/60 border border-slate-800/60 p-4 mb-4">
                            <p className="text-xs text-slate-400 font-semibold mb-1">
                              Their guess
                            </p>
                            <p className="text-sm text-slate-100">
                              {moment.guessText}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <label className="text-sm font-bold text-slate-100">
                              Your full truth
                            </label>
                            <button
                              type="button"
                              onClick={handlePolish}
                              disabled={isPolishing || !fullHiddenText.trim()}
                              className="text-xs px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/50 text-pink-200 hover:bg-pink-500/30 transition disabled:opacity-50"
                            >
                              {isPolishing
                                ? "✨ Polishing…"
                                : remainingFreePolish > 0
                                ? `✨ Polish (${remainingFreePolish} left)`
                                : `✨ Polish · KES ${POLISH_PRICE_KES}`}
                            </button>
                          </div>
                          <textarea
                            value={fullHiddenText}
                            onChange={(e) => setFullHiddenText(e.target.value)}
                            rows={6}
                            className="w-full rounded-xl bg-slate-950/60 border border-slate-700 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-400 focus:outline-none transition resize-none"
                            placeholder="Write the full version of your truth. This is what they pay to fully unlock."
                          />
                        </div>

                        {fullHiddenText.trim() && (
                          <div className="space-y-2 rounded-lg bg-slate-950/40 border border-slate-800/60 p-4">
                            <label className="text-xs font-bold text-slate-100 block">
                              Email for polish receipt (if using paid polish)
                            </label>
                            <input
                              type="email"
                              placeholder="you@example.com"
                              value={polishEmail}
                              onChange={(e) => setPolishEmail(e.target.value)}
                              className="w-full rounded-lg bg-slate-950/60 border border-slate-700 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-400 focus:outline-none transition"
                            />
                            <p className="text-xs text-slate-500">
                              Required only if you use the paid &quot;Polish
                              with RANIA&quot; after your free attempts.
                            </p>
                          </div>
                        )}

                        {(polishError || error) && (
                          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-200">
                            ⚠️ {polishError || error}
                          </div>
                        )}

                        <button
                          onClick={handleSaveHidden}
                          disabled={saving || !fullHiddenText.trim()}
                          className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-base shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {saving ? "💾 Saving…" : "✨ Save Hidden Truth"}
                        </button>

                        <p className="text-center text-xs text-slate-400">
                          Tip: Don&apos;t dodge. Honest truths are what make
                          RANIA powerful.
                        </p>
                      </div>
                    )}

                  {/* Stage 4: Reaction + your response (truthSubmitted) */}
                  {hasTruth && (
                    <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-6 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-400/30 backdrop-blur-sm">
                      <div>
                        <h2 className="font-bold text-lg sm:text-xl text-slate-100 flex items-center gap-2 mb-2">
                          <span>💬</span> Receiver&apos;s Reaction
                        </h2>
                        <p className="text-sm text-slate-400">
                          They reacted to your truth. Reply to their reaction
                          here.
                        </p>
                      </div>

                      {receiverReaction && (
                        <div className="rounded-lg bg-slate-950/60 border border-pink-400/30 p-4">
                          <div className="text-xs text-slate-400 font-semibold mb-2">
                            THEIR REACTION:
                          </div>
                          <p className="text-sm text-pink-50 leading-relaxed">
                            {receiverReaction}
                          </p>
                        </div>
                      )}

                      {!receiverReaction && (
                        <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 text-sm text-slate-300">
                          ⏳ Waiting for their reaction to your truth…
                        </div>
                      )}

                      {receiverReaction && (
                        <form
                          onSubmit={handleSenderResponse}
                          className="space-y-4"
                        >
                          <div>
                            <label className="text-sm font-bold text-slate-100 block mb-2">
                              Your response
                            </label>
                            <textarea
                              value={senderResponse}
                              onChange={(e) =>
                                setSenderResponse(e.target.value)
                              }
                              rows={5}
                              className="w-full rounded-xl bg-slate-950/60 border border-slate-700 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-400 focus:outline-none transition resize-none"
                              placeholder="Reply to how they reacted. Keep it real…"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={
                              submittingResponse || !senderResponse.trim()
                            }
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-base shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {submittingResponse
                              ? "Sending…"
                              : "Send Response"}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl p-4 bg-slate-900/80 border border-slate-800 text-sm text-slate-300">
                  Share your teaser link first. Once they reply, this space will
                  unlock clue and truth tools.
                </div>
              )}
            </div>

            {/* RIGHT COLUMN (Status + preview) */}
            <div className="space-y-6">
              {/* Status Card */}
              <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4 bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-slate-700/60 backdrop-blur-sm">
                <h2 className="font-bold text-lg sm:text-xl text-slate-100">
                  📊 Status
                </h2>
                <div className="space-y-3">
                  <div className="rounded-lg bg-slate-950/60 border border-slate-800/60 p-4">
                    <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
                      Link Code
                    </div>
                    <div className="font-mono text-lg text-pink-300 font-bold">
                      {moment.shortCode}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-300">
                      Timeline:
                    </div>
                    <div className="space-y-2 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-500/30 border border-green-500/50 flex items-center justify-center text-[10px] font-bold text-green-300">
                          ✓
                        </div>
                        <span>You created the moment</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold bg-green-500/30 border-green-500/50 text-green-300">
                          {hasReply ? "✓" : "○"}
                        </div>
                        <span>They replied ({replies.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold bg-green-500/30 border-green-500/50 text-green-300">
                          {hasClue ? "✓" : "○"}
                        </div>
                        <span>You sent a clue</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold bg-green-500/30 border-green-500/50 text-green-300">
                          {hasGuess ? "✓" : "○"}
                        </div>
                        <span>They guessed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                            hasTruth
                              ? "bg-green-500/30 border-green-500/50 text-green-300"
                              : "bg-yellow-500/30 border-yellow-500/50 text-yellow-300"
                          }`}
                        >
                          {hasTruth ? "✓" : "⟳"}
                        </div>
                        <span>You revealed the truth</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                            receiverReaction
                              ? "bg-green-500/30 border-green-500/50 text-green-300"
                              : "bg-slate-700/30 border-slate-700/50 text-slate-500"
                          }`}
                        >
                          {receiverReaction ? "✓" : "○"}
                        </div>
                        <span>They reacted</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                            senderResponse.trim()
                              ? "bg-green-500/30 border-green-500/50 text-green-300"
                              : "bg-slate-700/30 border-slate-700/50 text-slate-500"
                          }`}
                        >
                          {senderResponse.trim() ? "✓" : "○"}
                        </div>
                        <span>You responded</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hidden Preview */}
              {moment.hiddenPreview && (
                <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4 bg-gradient-to-br from-pink-600/20 to-purple-600/20 border border-pink-400/30 backdrop-blur-sm">
                  <h2 className="font-bold text-lg sm:text-xl text-slate-100 flex items-center gap-2">
                    <span>👀</span> Current Hidden Preview
                  </h2>
                  <div className="rounded-lg bg-slate-950/60 border border-slate-800/60 p-4">
                    <p className="text-sm text-slate-100 line-clamp-3">
                      {moment.hiddenPreview}
                    </p>
                  </div>
                  {moment.guessText && (
                    <div className="rounded-lg bg-slate-950/60 border border-slate-800/60 p-4 mt-2">
                      <p className="text-xs text-slate-400 font-semibold mb-1">
                        Their guess
                      </p>
                      <p className="text-sm text-slate-100">
                        {moment.guessText}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Pro Tips */}
              <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-400/30 backdrop-blur-sm">
                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                  <span>💡</span> Pro Tips
                </h3>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li>• Use clues that hint at the emotion, not the full story.</li>
                  <li>• Let their guess guide how vulnerable you want to be.</li>
                  <li>• Polish your truth to make it feel cinematic and screenshot-ready.</li>
                  <li>• Respond to their reaction — that’s where the real connection happens.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-6 sm:pt-8">
            <button
              onClick={() => router.push("/moments/create")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-purple-400/60 bg-slate-50/10 text-purple-200 font-bold text-sm hover:bg-slate-50/20 transition"
            >
              ← Create Another Moment
            </button>
          </div>

          {/* Toast */}
          {toast && (
            <div className="fixed right-6 bottom-6 z-50">
              <div className="rounded-xl px-4 py-2 bg-slate-900/90 text-sm text-slate-100 border border-slate-800 shadow">
                {toast}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}