/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
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
  }
}

type ReplyRow = {
  id: string;
  reply_text: string;
  reaction_text: string | null;
  created_at: string;
};

type ManageMomentData = {
  id: string;
  shortCode: string;
  teaserText: string;
  hiddenPreview?: string;
  isHiddenLocked?: boolean;
  hiddenUnlockPriceKes?: number;
};

const POLISH_PRICE_KES = 20;

export default function ManageMomentPage() {
  const params = useParams<{ shortCode: string }>();
  const router = useRouter();
  const shortCode = params.shortCode;

  const [moment, setMoment] = useState<ManageMomentData | null>(null);
  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [fullHiddenText, setFullHiddenText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Polish state
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishError, setPolishError] = useState<string | null>(null);
  const [polishEmail, setPolishEmail] = useState("");

  const paystackKey =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? ""
      : "";
  const currency =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_PAYSTACK_CURRENCY ?? "KES"
      : "KES";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGetMoment(shortCode);
        if (cancelled) return;

        const m = res.moment as any;
        setMoment({
          id: m.id,
          shortCode: m.shortCode,
          teaserText: m.teaserText,
          hiddenPreview: m.hiddenPreview,
          isHiddenLocked: m.isHiddenLocked,
          hiddenUnlockPriceKes: m.hiddenUnlockPriceKes,
        });

        const r = await fetch(`/api/rania/moments/by-code/${shortCode}/replies`, {
          method: "GET",
        });
        const json = await r.json();
        if (!cancelled && json.success) {
          setReplies(json.replies as ReplyRow[]);
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
        // User closed payment modal
      },
    });

    handler.openIframe();
  }

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

      setFullHiddenText("");
      setPolishEmail("");

      setMoment((prev) =>
        prev
          ? {
              ...prev,
              hiddenPreview: json.hiddenPreview as string,
              isHiddenLocked: true,
              hiddenUnlockPriceKes: json.priceKes as number,
            }
          : prev,
      );
     
    } catch (err: any) {
      setError(err.message ?? "Failed to save hidden truth");
    } finally {
      setSaving(false);
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

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* Animated background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="mb-8 sm:mb-12">
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight">
                Manage your<br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  emotional moment
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl">
                They replied. Now share your real truth and reveal the full message they sent.
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:gap-12 lg:grid-cols-[1.1fr,0.9fr] items-start">
            {/* Left: Form */}
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
                    <span>🔔</span> Replies Received
                  </h2>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {replies.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg bg-slate-950/60 border border-slate-800/60 p-4 space-y-2"
                      >
                        <p className="text-sm sm:text-base text-slate-100 leading-relaxed">
                          {r.reply_text}
                        </p>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{new Date(r.created_at).toLocaleString()}</span>
                          {r.reaction_text && (
                            <span className="text-pink-300 italic">
                              Reaction: {r.reaction_text.substring(0, 50)}...
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hidden Truth Form */}
              <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-6 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-400/30 backdrop-blur-sm">
                <div>
                  <h2 className="font-bold text-lg sm:text-xl text-slate-100 flex items-center gap-2 mb-2">
                    <span>🔒</span> Your Full Truth
                  </h2>
                  <p className="text-sm text-slate-400">
                    Write what you really meant. They&apos;ll see a preview and can unlock for KES 20.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-bold text-slate-100">What&apos;s the real truth?</label>
                    <button
                      type="button"
                      onClick={handlePolish}
                      disabled={isPolishing || !fullHiddenText.trim()}
                      className="text-xs px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/50 text-pink-200 hover:bg-pink-500/30 transition disabled:opacity-50"
                    >
                      {isPolishing ? "✨ Polishing…" : `✨ Polish · KES ${POLISH_PRICE_KES}`}
                    </button>
                  </div>
                  <textarea
                    value={fullHiddenText}
                    onChange={(e) => setFullHiddenText(e.target.value)}
                    rows={6}
                    className="w-full rounded-xl bg-slate-950/60 border border-slate-700 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-400 focus:outline-none transition resize-none"
                    placeholder="Say what you really mean. The version only they deserve to see."
                  />
                </div>

                {/* Polish Email (for Paystack) */}
                {fullHiddenText.trim() && (
                  <div className="space-y-2 rounded-lg bg-slate-950/40 border border-slate-800/60 p-4">
                    <label className="text-xs font-bold text-slate-100 block">
                      Email for polish receipt (if using)
                    </label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={polishEmail}
                      onChange={(e) => setPolishEmail(e.target.value)}
                      className="w-full rounded-lg bg-slate-950/60 border border-slate-700 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-400 focus:outline-none transition"
                    />
                    <p className="text-xs text-slate-500">
                      Required only if you use &quot;Polish with AI&quot; feature.
                    </p>
                  </div>
                )}

                {/* Error Messages */}
                {(polishError || error) && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-200">
                    ⚠️ {polishError || error}
                  </div>
                )}

                {/* Save Button */}
                <button
                  onClick={handleSaveHidden}
                  disabled={saving || !fullHiddenText.trim()}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-base shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? "💾 Saving…" : "✨ Save Hidden Truth"}
                </button>

                <p className="text-center text-xs text-slate-400">
                  Tip: Write raw, then polish it. Make them feel like it was worth unlocking.
                </p>
              </div>
            </div>

            {/* Right: Preview & Status */}
            <div className="space-y-6">
              {/* Current Status */}
              <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4 bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-slate-700/60 backdrop-blur-sm">
                <h2 className="font-bold text-lg sm:text-xl text-slate-100">📊 Status</h2>
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
                    <div className="text-xs font-semibold text-slate-300">Timeline:</div>
                    <div className="space-y-2 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-500/30 border border-green-500/50 flex items-center justify-center text-[10px] font-bold text-green-300">✓</div>
                        <span>You created the moment</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-500/30 border border-green-500/50 flex items-center justify-center text-[10px] font-bold text-green-300">✓</div>
                        <span>They replied ({replies.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold ${fullHiddenText.trim() ? 'bg-yellow-500/30 border-yellow-500/50 text-yellow-300' : 'bg-slate-700/30 border-slate-700/50 text-slate-500'}`}>
                          {fullHiddenText.trim() ? '⟳' : '○'}
                        </div>
                        <span>You reveal the truth (now)</span>
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
                
                </div>
              )}

              {/* Info Box */}
              <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-400/30 backdrop-blur-sm">
                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                  <span>💡</span> Pro Tips
                </h3>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li>• Write your raw truth first</li>
                  <li>• Use &quot;Polish with AI&quot; to make it profound</li>
                  <li>• They&apos;ll see a teaser + pay KES 20 to unlock</li>
                  <li>• You can edit the hidden truth anytime</li>
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
        </div>
      </div>
    </>
  );
}