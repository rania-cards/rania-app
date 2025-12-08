/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
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

export default function CreateMomentPage() {
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement | null>(null);

  const [modeKey, setModeKey] = useState<RaniaModeKey>("BESTIE_TRUTH_CHAIN");
  const [language, setLanguage] = useState<RaniaLanguage>("en");
  const [tone, setTone] = useState<RaniaTone>("soft");
  const [deliveryFormat, setDeliveryFormat] = useState<RaniaDeliveryFormat>("still");

  const [teaserText, setTeaserText] = useState("Real talk time… reply first.");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderEmail, setSenderEmail] = useState("");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [momentId, setMomentId] = useState<string | null>(null);

  const [polishingField, setPolishingField] = useState<"teaser" | null>(null);
  const [polishing, setPolishing] = useState(false);
  const [polishError, setPolishError] = useState<string | null>(null);

  const [freePolishCount, setFreePolishCount] = useState<number>(() => {
    try {
      const val = typeof window !== "undefined" ? window.localStorage.getItem("freePolishCount") : null;
      return val ? Number(val) : 3;
    } catch {
      return 3;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("freePolishCount", String(freePolishCount));
    } catch {}
  }, [freePolishCount]);

  const baseUrl =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_BASE_URL ?? window.location.origin
      : "https://raniaonline.com";

  const momentUrl = shortCode ? `${baseUrl}/m/${shortCode}` : "";
  const caption = shortCode ? `Reply here and complete the moment: ${momentUrl}` : "";

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
  }, [modeKey, teaserText, language, tone]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!teaserText.trim()) {
      setError("Teaser cannot be empty.");
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
        customHiddenText: "",
        premiumReveal: false,
        senderName: senderName.trim() || undefined,
        senderPhone: senderPhone.trim() || undefined,
        senderEmail: senderEmail.trim() || undefined,
        identity: {},
      });

      setShortCode(res.shortCode);
      setMomentId(res.momentId);

      // Scroll down to preview & share section
      setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } catch (err: any) {
      setError(err?.message ?? "Failed to create moment");
    } finally {
      setCreating(false);
    }
  }

  async function callPolishAPI(text: string) {
    setPolishing(true);
    setPolishError(null);
    try {
      const res = await fetch("/api/rania/polish-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: "teaser", text, modeKey, tone }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to polish text");
      setTeaserText(json.polished);
    } catch (err: any) {
      setPolishError(err?.message ?? "Failed to polish with RANIA");
    } finally {
      setPolishing(false);
      setPolishingField(null);
    }
  }

  function handlePolish() {
    setPolishError(null);
    const currentText = teaserText;
    if (!currentText.trim()) {
      setPolishError("Write something first before polishing.");
      return;
    }

    if (freePolishCount > 0) {
      setFreePolishCount((c) => Math.max(0, c - 1));
      void callPolishAPI(currentText);
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

    setPolishingField("teaser");
    const amountKES = Number(process.env.NEXT_PUBLIC_POLISH_PRICE_KES ?? 20);
    const handler = window.PaystackPop.setup({
      key: paystackKey,
      email: senderEmail,
      amount: amountKES * 100,
      currency,
      metadata: { type: "POLISH_TEXT", field: "teaser", modeKey },
      callback: () => void callPolishAPI(currentText),
      onClose: () => setPolishingField(null),
    });
    handler.openIframe();
  }

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <h1 className="text-4xl sm:text-5xl font-black mb-6 text-center bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            Create Your Emotional Moment
          </h1>

          <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr] items-start">
            {/* Left: Form */}
            <div className="space-y-6">
              {/* Modes */}
              <div>
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4">Choose Your Moment Type</h2>
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
                        <div className={`font-bold text-sm ${active ? "text-purple-100" : "text-slate-100"}`}>{m.label}</div>
                        <div className="text-xs text-slate-400 mt-1 line-clamp-1">{m.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sender Info */}
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 sm:p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Your Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <input type="text" placeholder="Name" value={senderName} onChange={(e) => setSenderName(e.target.value)} className="w-full rounded-lg bg-slate-950/60 border border-slate-700 px-4 py-3 text-sm placeholder-slate-500 focus:border-purple-400 focus:outline-none text-white" />
                  <input type="tel" placeholder="+2547..." value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} className="w-full rounded-lg bg-slate-950/60 border border-slate-700 px-4 py-3 text-sm placeholder-slate-500 focus:border-purple-400 focus:outline-none text-white" />
                  <input type="email" placeholder="Email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} className="w-full rounded-lg bg-slate-950/60 border border-slate-700 px-4 py-3 text-sm placeholder-slate-500 focus:border-purple-400 focus:outline-none text-white" />
                </div>
              </div>

              {/* Customization */}
              <div className="grid grid-cols-3 gap-4">
                {[{ label: "Language", state: language, setState: setLanguage, options: LANG_OPTIONS },
                  { label: "Tone", state: tone, setState: setTone, options: TONE_OPTIONS },
                  { label: "Format", state: deliveryFormat, setState: setDeliveryFormat, options: DELIVERY_OPTIONS }
                ].map((group) => (
                  <div key={group.label}>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{group.label}</label>
                    <select value={group.state} onChange={(e) => group.setState(e.target.value as any)} className="w-full rounded-lg bg-slate-950/60 border border-slate-700 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none text-white">
                      {group.options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Teaser */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-100">👀 Teaser</label>
                  <button type="button" onClick={handlePolish} disabled={polishing} className="text-xs px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/50 text-pink-200 hover:bg-pink-500/30 transition disabled:opacity-50">
                    {polishing ? "✨ Polishing…" : freePolishCount > 0 ? `✨ Polish (${freePolishCount} left)` : "✨ Polish"}
                  </button>
                </div>
                <textarea value={teaserText} onChange={(e) => setTeaserText(e.target.value)} rows={3} className="w-full rounded-xl bg-slate-950/60 border border-slate-700 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-400 focus:outline-none resize-none" />
              </div>

              {(polishError || error) && <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-200">⚠️ {polishError || error}</div>}

              <button onClick={handleSubmit} disabled={creating} className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold shadow-lg shadow-purple-500/40 hover:scale-105 transition-all duration-300 disabled:opacity-60">
                {creating ? "⏳ Creating…" : "✨ Create Free Moment"}
              </button>
            </div>

            {/* Right: Preview & Share */}
            <div ref={previewRef} className="space-y-6">
              {/* Preview Card */}
              <div className="bg-gradient-to-br from-slate-900/60 to-slate-950/40 border border-slate-800/60 rounded-2xl p-6 backdrop-blur-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 px-4 py-2 mb-4">
                  <span className="text-2xl">{MODES.find((m) => m.key === modeKey)?.emoji}</span>
                  <span className="text-xs font-bold uppercase text-purple-200">{MODES.find((m) => m.key === modeKey)?.label}</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">Preview</p>
                <div className="space-y-4 bg-slate-950/50 border border-slate-700/50 rounded-xl p-5">
                  <div>
                    <p className="text-xs text-slate-400 font-semibold mb-2">TEASER</p>
                    <p className="text-base leading-relaxed text-slate-100 font-medium">{teaserText}</p>
                  </div>
                  <div className="h-px bg-gradient-to-r from-slate-700 to-transparent"></div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold mb-2">HIDDEN (After reply)</p>
                    <p className="text-sm leading-relaxed text-slate-100 blur-md hover:blur-none transition-all cursor-default select-none">Hidden truth will appear in the manage page after the receiver replies.</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
                  <span>RANIA · emotional thread</span>
                  <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700">{shortCode || "pending"}</span>
                </div>
              </div>

              {/* Share & Manage */}
              {shortCode && (
                <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-400/30 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2"><span>🚀</span><h3 className="font-bold text-purple-100">Ready to share</h3></div>
                  <textarea readOnly rows={3} value={caption} className="w-full bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-100 resize-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => navigator.clipboard.writeText(caption)} className="py-3 rounded-lg bg-purple-500/30 border border-purple-400/50 text-purple-200 font-semibold text-sm hover:bg-purple-500/40 transition">📋 Copy caption</button>
                    <button onClick={() => window.open(`/m/${shortCode}`, "_blank")} className="py-3 rounded-lg bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-semibold text-sm hover:bg-cyan-500/40 transition">👀 View as receiver</button>
                  </div>
                  <button onClick={() => window.open(`/moments/manage/${shortCode}`, "_blank")} className="w-full py-3 rounded-lg border border-pink-500/60 bg-slate-950 text-pink-200 font-semibold text-sm hover:bg-pink-500/10 transition">🛠 Manage this moment</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
