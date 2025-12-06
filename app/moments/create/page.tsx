/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import type React from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

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

const MODES: { key: RaniaModeKey; label: string; description: string; emoji: string }[] = [
  { key: "CRUSH_REVEAL", label: "Crush Reveal", description: "Say what you admire but never said.", emoji: "💕" },
  { key: "DEEP_CONFESSION", label: "Deep Confession", description: "Explain yourself honestly.", emoji: "🎭" },
  { key: "BESTIE_TRUTH_CHAIN", label: "Bestie Truth", description: "Friendship truth, no sugar.", emoji: "👯" },
  { key: "ROAST_ME_SOFTLY", label: "Roast Me", description: "Safe, honest banter.", emoji: "🔥" },
  { key: "FORGIVE_ME", label: "Forgive Me", description: "Accountable, grown-up apology.", emoji: "🤝" },
  { key: "CLOSURE", label: "Closure", description: "End a chapter with clarity.", emoji: "✨" },
];

const LANG_OPTIONS: { value: RaniaLanguage; label: string }[] = [
  { value: "en", label: "🇬🇧 English" },
  { value: "sw", label: "🇹🇿 Swahili" },
  { value: "sh", label: "🇰🇪 Sheng" },
];

const TONE_OPTIONS: { value: RaniaTone; label: string }[] = [
  { value: "soft", label: "Soft 🌸" },
  { value: "neutral", label: "Neutral 😐" },
  { value: "dark", label: "Deep 🌙" },
];

const DELIVERY_OPTIONS: { value: RaniaDeliveryFormat; label: string }[] = [
  { value: "still", label: "Still card" },
  { value: "gif", label: "GIF (coming)" },
  { value: "motion", label: "Motion (coming)" },
];

const POLISH_PRICE_KES = 20;

export default function CreateMomentPage() {
  const router = useRouter();

  const [modeKey, setModeKey] = useState<RaniaModeKey>("BESTIE_TRUTH_CHAIN");
  const [language, setLanguage] = useState<RaniaLanguage>("en");
  const [tone, setTone] = useState<RaniaTone>("soft");
  const [deliveryFormat, setDeliveryFormat] = useState<RaniaDeliveryFormat>("still");

  const [teaserText, setTeaserText] = useState<string>("Real talk time… reply first.");
  const [hiddenText, setHiddenText] = useState<string>(
    "I appreciate you more than I show, even when I'm distant.",
  );

  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderEmail, setSenderEmail] = useState("");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [momentId, setMomentId] = useState<string | null>(null);

  const [polishingField, setPolishingField] = useState<"teaser" | "hidden" | null>(null);
  const [polishing, setPolishing] = useState(false);
  const [polishError, setPolishError] = useState<string | null>(null);

  const baseUrl =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_BASE_URL ?? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL ?? "https://raniaonline.com";

  const momentUrl = shortCode ? `${baseUrl}/m/${shortCode}` : "";
  const caption = shortCode
    ? `Reply here and complete the moment: ${momentUrl}`
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
    setShortCode(null);
    setMomentId(null);
    setError(null);
  }, [modeKey, teaserText, hiddenText, language, tone]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!teaserText.trim()) {
      setError("Teaser cannot be empty.");
      return;
    }
    if (!hiddenText.trim()) {
      setError("Hidden message cannot be empty.");
      return;
    }

    setCreating(true);
    try {
      const res = await apiCreateMoment({
        modeKey,
        language,
        tone,
        deliveryFormat,
        teaserSnippetId: undefined,
        hiddenSnippetId: undefined,
        customTeaserText: teaserText.trim(),
        customHiddenText: hiddenText.trim(),
        premiumReveal: false,
        senderName: senderName.trim() || undefined,
        senderPhone: senderPhone.trim() || undefined,
        senderEmail: senderEmail.trim() || undefined,
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

  async function callPolishAPI(field: "teaser" | "hidden", text: string) {
    setPolishing(true);
    setPolishError(null);
    try {
      const res = await fetch("/api/rania/polish-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          text,
          modeKey,
          tone,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to polish text");
      }

      if (field === "teaser") {
        setTeaserText(json.polished);
      } else {
        setHiddenText(json.polished);
      }
    } catch (err: any) {
      setPolishError(err.message ?? "Failed to polish with RANIA");
    } finally {
      setPolishing(false);
      setPolishingField(null);
    }
  }

  function handlePolish(field: "teaser" | "hidden") {
    setPolishError(null);

    const currentText = field === "teaser" ? teaserText : hiddenText;
    if (!currentText.trim()) {
      setPolishError("Write something first before polishing.");
      return;
    }

    if (!window.PaystackPop || !paystackKey) {
      setPolishError("Payment library not loaded or Paystack key missing.");
      return;
    }

    if (!senderEmail || !senderEmail.includes("@")) {
      setPolishError("Enter a valid email for Paystack receipt before polishing.");
      return;
    }

    setPolishingField(field);

    const handler = window.PaystackPop.setup({
      key: paystackKey,
      email: senderEmail,
      amount: POLISH_PRICE_KES * 100,
      currency,
      metadata: {
        type: "POLISH_TEXT",
        field,
        modeKey,
      },
      callback: function () {
        void callPolishAPI(field, currentText);
      },
      onClose: function () {
        setPolishingField(null);
      },
    });

    handler.openIframe();
  }

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* Animated background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Header */}
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => router.push("/")}>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-500 via-pink-500 to-cyan-400 flex items-center justify-center text-sm font-black shadow-lg">
                R
              </div>
              <span className="text-xl sm:text-2xl font-bold tracking-tight">RANIA</span>
            </div>
            <div className="space-y-3 max-w-2xl">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight">
                Create your<br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  emotional moment
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-300">
                Write what you really feel — or tap{" "}
                <span className="font-semibold text-pink-300">Polish with RANIA</span>{" "}
                to let AI sharpen your teaser or hidden truth for{" "}
                <span className="font-bold">KES {POLISH_PRICE_KES}</span>.
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:gap-12 lg:grid-cols-[1.1fr,0.9fr] items-start">
            {/* Left: Form */}
            <div>
              <div className="space-y-6">
                {/* Mode Selection */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4">
                      Choose your moment type
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {MODES.map((m) => {
                        const active = m.key === modeKey;
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => setModeKey(m.key)}
                            className={`group relative rounded-xl p-3 sm:p-4 text-left transition-all duration-300 ${
                              active
                                ? "bg-gradient-to-br from-purple-600/40 to-pink-600/30 border border-purple-400/60 shadow-lg shadow-purple-500/20 scale-105"
                                : "bg-slate-900/50 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/70 hover:scale-102"
                            }`}
                          >
                            <div className="text-2xl sm:text-3xl mb-2">{m.emoji}</div>
                            <div className={`font-bold text-sm ${active ? "text-purple-100" : "text-slate-100"}`}>
                              {m.label}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 line-clamp-1">{m.description}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Sender Info */}
                <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 sm:p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Your details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-100 text-sm">Your name</label>
                      <input
                        type="text"
                        placeholder="e.g. Abdullahi"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        className="w-full rounded-lg bg-slate-950/60 border border-slate-700 px-4 py-3 text-sm placeholder-slate-500 focus:border-purple-400 focus:outline-none transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-100 text-sm">WhatsApp (+254...)</label>
                      <input
                        type="tel"
                        placeholder="+2547XXXXXXXX"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        className="w-full rounded-lg bg-slate-950/60 border border-slate-700 px-4 py-3 text-sm placeholder-slate-500 focus:border-purple-400 focus:outline-none transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-100 text-sm">Email (for receipts/polish)</label>
                      <input
                        type="email"
                        placeholder="you@campus.ac.ke"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        className="w-full rounded-lg bg-slate-950/60 border border-slate-700 px-4 py-3 text-sm placeholder-slate-500 focus:border-purple-400 focus:outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Customization */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Language", options: LANG_OPTIONS, state: language, setState: setLanguage },
                    { label: "Tone", options: TONE_OPTIONS, state: tone, setState: setTone },
                    { label: "Format", options: DELIVERY_OPTIONS, state: deliveryFormat, setState: setDeliveryFormat },
                  ].map((group) => (
                    <div key={group.label}>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        {group.label}
                      </label>
                      <select
                        value={group.state}
                        onChange={(e) => group.setState(e.target.value as any)}
                        className="w-full rounded-lg bg-slate-950/60 border border-slate-700 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none transition"
                      >
                        {group.options.map((opt: any) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Text Areas */}
                <div className="space-y-4">
                  {/* Teaser */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-bold text-slate-100">👀 Teaser (Visible)</label>
                      <button
                        type="button"
                        onClick={() => handlePolish("teaser")}
                        disabled={polishing && polishingField === "teaser"}
                        className="text-xs px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/50 text-pink-200 hover:bg-pink-500/30 transition disabled:opacity-50"
                      >
                        {polishing && polishingField === "teaser" ? "✨ Polishing…" : `✨ Polish · KES ${POLISH_PRICE_KES}`}
                      </button>
                    </div>
                    <textarea
                      value={teaserText}
                      onChange={(e) => setTeaserText(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl bg-slate-950/60 border border-slate-700 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-400 focus:outline-none transition resize-none"
                      placeholder="Real talk time… reply first."
                    />
                    <p className="text-xs text-slate-500 mt-2">First impression on the link</p>
                  </div>

                  {/* Hidden */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-bold text-slate-100">🔒 Hidden Truth</label>
                      <button
                        type="button"
                        onClick={() => handlePolish("hidden")}
                        disabled={polishing && polishingField === "hidden"}
                        className="text-xs px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/50 text-pink-200 hover:bg-pink-500/30 transition disabled:opacity-50"
                      >
                        {polishing && polishingField === "hidden" ? "✨ Polishing…" : `✨ Polish · KES ${POLISH_PRICE_KES}`}
                      </button>
                    </div>
                    <textarea
                      value={hiddenText}
                      onChange={(e) => setHiddenText(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl bg-slate-950/60 border border-slate-700 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-400 focus:outline-none transition resize-none"
                      placeholder="Say what you really mean. This is the confession / truth they will see after reply."
                    />
                    <p className="text-xs text-slate-500 mt-2">(They unlock this with their reply)</p>
                  </div>
                </div>

                {/* Error Messages */}
                {(polishError || error) && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-200">
                    ⚠️ {polishError || error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={creating}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-base shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {creating ? "⏳ Creating…" : "✨ Create Free Moment"}
                </button>

                <p className="text-center text-sm text-slate-400">
                  Writing is free. Polishing each section with RANIA costs KES {POLISH_PRICE_KES}.
                </p>
              </div>
            </div>

            {/* Right: Preview & Actions */}
            <div className="space-y-6">
              {/* Preview Card */}
              <div className="bg-gradient-to-br from-slate-900/60 to-slate-950/40 border border-slate-800/60 rounded-2xl p-6 backdrop-blur-sm">
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 px-4 py-2 mb-4">
                    <span className="text-2xl">{MODES.find((m) => m.key === modeKey)?.emoji}</span>
                    <span className="text-xs font-bold uppercase text-purple-200">{MODES.find((m) => m.key === modeKey)?.label}</span>
                  </div>
                  <p className="text-xs text-slate-400">Preview</p>
                </div>

                <div className="space-y-4 bg-slate-950/50 border border-slate-700/50 rounded-xl p-5">
                  <div>
                    <p className="text-xs text-slate-400 font-semibold mb-2">TEASER</p>
                    <p className="text-base leading-relaxed text-slate-100 font-medium">
                      {teaserText || "Your teaser appears here…"}
                    </p>
                  </div>
                  <div className="h-px bg-gradient-to-r from-slate-700 to-transparent"></div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold mb-2">HIDDEN (After reply)</p>
                    <p className="text-sm leading-relaxed text-slate-100 blur-md hover:blur-none transition-all cursor-default select-none">
                      {hiddenText || "Your hidden message appears here…"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
                  <span>RANIA · emotional thread</span>
                  <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700">
                    {shortCode || "pending"}
                  </span>
                </div>
              </div>

              {/* Actions - After creation */}
              {shortCode && (
                <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-400/30 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🚀</span>
                    <h3 className="font-bold text-purple-100">Ready to share</h3>
                  </div>

                  <div className="bg-slate-950/60 rounded-lg p-4 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-2 font-semibold">WhatsApp Caption</p>
                    <textarea
                      readOnly
                      rows={3}
                      value={caption}
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-100 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(caption)}
                      className="py-3 rounded-lg bg-purple-500/30 border border-purple-400/50 text-purple-200 font-semibold text-sm hover:bg-purple-500/40 transition"
                    >
                      📋 Copy caption
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(`/m/${shortCode}`, "_blank")}
                      className="py-3 rounded-lg bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-semibold text-sm hover:bg-cyan-500/40 transition"
                    >
                      👀 View as receiver
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.open(`/moments/manage/${shortCode}`, "_blank")}
                    className="w-full py-3 rounded-lg border border-pink-500/60 bg-slate-950 text-pink-200 font-semibold text-sm hover:bg-pink-500/10 transition"
                  >
                    🛠 Manage this moment
                  </button>

                  <p className="text-xs text-slate-400">
                    Paste the caption into WhatsApp Status or DMs, then use &quot;Manage this moment&quot; to see replies and adjust hidden truth later if needed.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}