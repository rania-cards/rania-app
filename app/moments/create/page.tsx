/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useState, useEffect } from "react"
import type React from "react"

import Script from "next/script"
import { apiCreateMoment } from "@/lib/rania/client"
import type { RaniaModeKey, RaniaLanguage, RaniaTone, RaniaDeliveryFormat } from "@/lib/rania/types"

declare global {
  interface Window {
    PaystackPop: {
      setup(options: {
        key: string
        email: string
        amount: number
        currency?: string
        ref?: string
        metadata?: any
        callback: (response: { reference: string }) => void
        onClose: () => void
      }): { openIframe: () => void }
    }
  }
}

const MODES: { key: RaniaModeKey; label: string; description: string; emoji: string }[] = [
  { key: "CRUSH_REVEAL", label: "Crush Reveal", description: "Say what you admire but never said.", emoji: "💕" },
  { key: "DEEP_CONFESSION", label: "Deep Confession", description: "Explain yourself honestly.", emoji: "🎭" },
  { key: "BESTIE_TRUTH_CHAIN", label: "Bestie Truth", description: "Friendship truth, no sugar.", emoji: "👯" },
  { key: "ROAST_ME_SOFTLY", label: "Roast Me", description: "Safe, honest banter.", emoji: "🔥" },
  { key: "FORGIVE_ME", label: "Forgive Me", description: "Accountable, grown-up apology.", emoji: "🤝" },
  { key: "CLOSURE", label: "Closure", description: "End a chapter with clarity.", emoji: "✨" },
]

const LANG_OPTIONS: { value: RaniaLanguage; label: string }[] = [
  { value: "en", label: "🇬🇧 English" },
  { value: "sw", label: "🇹🇿 Swahili" },
  { value: "sh", label: "🇰🇪 Sheng" },
]

const TONE_OPTIONS: { value: RaniaTone; label: string }[] = [
  { value: "soft", label: "Soft 🌸" },
  { value: "neutral", label: "Neutral 😐" },
  { value: "dark", label: "Deep 🌙" },
]

const DELIVERY_OPTIONS: { value: RaniaDeliveryFormat; label: string }[] = [
  { value: "still", label: "Still card" },
  { value: "gif", label: "GIF (coming)" },
  { value: "motion", label: "Motion (coming)" },
]

const PREMIUM_PRICE_KES = 50

export default function CreateMomentPage() {
  const [modeKey, setModeKey] = useState<RaniaModeKey>("BESTIE_TRUTH_CHAIN")
  const [language, setLanguage] = useState<RaniaLanguage>("en")
  const [tone, setTone] = useState<RaniaTone>("soft")
  const [deliveryFormat, setDeliveryFormat] = useState<RaniaDeliveryFormat>("still")
  const [premiumReveal, setPremiumReveal] = useState<boolean>(true)
  const [teaserText, setTeaserText] = useState<string>("Real talk time… reply first.")
  const [hiddenText, setHiddenText] = useState<string>("I appreciate you more than I show, even when I'm distant.")
  const [email, setEmail] = useState<string>("test@example.com")
  const [creating, setCreating] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shortCode, setShortCode] = useState<string | null>(null)
  const [momentId, setMomentId] = useState<string | null>(null)

  const baseUrl =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_BASE_URL ?? window.location.origin)
      : (process.env.NEXT_PUBLIC_BASE_URL ?? "https://raniaonline.com")

  const momentUrl = shortCode ? `${baseUrl}/m/${shortCode}` : ""
  const caption = shortCode
    ? premiumReveal
      ? `Reply to unlock what I really said: ${momentUrl}`
      : `Reply here and complete the moment: ${momentUrl}`
    : ""

  const paystackKey = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "") : ""

  const currency = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_PAYSTACK_CURRENCY ?? "KES") : "KES"

  useEffect(() => {
    setShortCode(null)
    setMomentId(null)
    setError(null)
  }, [modeKey, teaserText, hiddenText, premiumReveal, language, tone])

  async function createFreeMoment() {
    setCreating(true)
    setError(null)
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
      })
      setShortCode(res.shortCode)
      setMomentId(res.momentId)
    } catch (err: any) {
      setError(err.message ?? "Failed to create moment")
    } finally {
      setCreating(false)
    }
  }

  async function createPremiumMomentAfterPayment(reference: string) {
    setCreating(true)
    setError(null)
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
        skipPaymentCheck: true,
        identity: {},
      })
      setShortCode(res.shortCode)
      setMomentId(res.momentId)
    } catch (err: any) {
      setError(err.message ?? "Failed to create premium moment")
    } finally {
      setCreating(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!premiumReveal) {
      void createFreeMoment()
      return
    }

    if (!window.PaystackPop || !paystackKey) {
      setError("Payment library not loaded or Paystack key missing.")
      return
    }

    if (!email || !email.includes("@")) {
      setError("Enter a valid email for Paystack.")
      return
    }

    setPaying(true)
    const handler = window.PaystackPop.setup({
      key: paystackKey,
      email,
      amount: PREMIUM_PRICE_KES * 100,
      currency,
      metadata: {
        modeKey,
        type: "PREMIUM_REVEAL",
      },
      callback: (response) => {
        setPaying(false)
        if (response.reference) {
          void createPremiumMomentAfterPayment(response.reference)
        } else {
          setError("Payment completed but no reference returned.")
        }
      },
      onClose: () => {
        setPaying(false)
      },
    })
    handler.openIframe()
  }

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />

      <div className="space-y-6 sm:space-y-8 animate-slide-in-up px-4 sm:px-0">
        {/* Header */}
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Create Your Moment
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-700 dark:text-white/70 max-w-2xl">
            Choose how to be vulnerable. Write what you really feel. Let them unlock the truth. 💭
          </p>
        </div>

        {/* Main form grid */}
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr,1.2fr]">
          {/* Left: Form */}
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div className="space-y-2 sm:space-y-3">
              <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white/80">Pick Your Mode</label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {MODES.map((m) => {
                  const active = m.key === modeKey
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setModeKey(m.key)}
                      className={`group relative rounded-lg sm:rounded-2xl p-3 sm:p-4 text-left transition-all duration-300 transform ${
                        active
                          ? "glass-dark border-purple-400/50 scale-105 shadow-lg shadow-purple-500/30"
                          : "glass hover:border-slate-300 dark:hover:border-white/20 hover:scale-[1.02]"
                      }`}
                    >
                      <div className="text-xl sm:text-2xl mb-1 sm:mb-2">{m.emoji}</div>
                      <div
                        className={`font-bold text-xs sm:text-sm transition-colors ${
                          active ? "text-purple-300" : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {m.label}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-600 dark:text-white/50 leading-tight mt-1">
                        {m.description}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="glass rounded-lg sm:rounded-2xl p-3 sm:p-4 space-y-3 sm:space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Customize Your Vibe</h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { label: "Language", options: LANG_OPTIONS, state: language, setState: setLanguage },
                  { label: "Tone", options: TONE_OPTIONS, state: tone, setState: setTone },
                  { label: "Format", options: DELIVERY_OPTIONS, state: deliveryFormat, setState: setDeliveryFormat },
                ].map((group) => (
                  <div key={group.label} className="space-y-1 sm:space-y-2">
                    <label className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-white/70">
                      {group.label}
                    </label>
                    <select
                      value={group.state}
                      onChange={(e) => group.setState(e.target.value as any)}
                      className="w-full rounded-lg bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 px-2 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-medium focus:border-purple-400 focus:outline-none transition"
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
            </div>

            <div className="glass rounded-lg sm:rounded-2xl p-3 sm:p-4 space-y-3 sm:space-y-4 border-purple-400/30">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-base sm:text-lg">🔐</span>
                    <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Reply-to-Unlock</div>
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-600 dark:text-white/60">
                    They must reply to see the full message. Price:{" "}
                    <span className="font-bold text-purple-600 dark:text-purple-300">KES {PREMIUM_PRICE_KES}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPremiumReveal((v) => !v)}
                  className={`relative inline-flex h-6 sm:h-7 w-10 sm:w-12 items-center rounded-full border-2 transition-all flex-shrink-0 ${
                    premiumReveal
                      ? "border-purple-400 bg-purple-500/30"
                      : "border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block h-4 sm:h-5 w-4 sm:w-5 transform rounded-full bg-white shadow-md transition-transform ${
                      premiumReveal ? "translate-x-4 sm:translate-x-5" : "translate-x-0.5 sm:translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {premiumReveal && (
                <div className="space-y-2 sm:space-y-3 border-t border-slate-200 dark:border-white/10 pt-3">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-white/70">
                    Email for Receipt
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 px-2 py-1.5 sm:px-3 sm:py-2 text-xs focus:border-purple-400 focus:outline-none transition"
                    placeholder="you@campus.ac.ke"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-1 sm:space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white/80 flex items-center gap-1 sm:gap-2">
                  👀 Teaser (Visible)
                </label>
                <textarea
                  value={teaserText}
                  onChange={(e) => setTeaserText(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:border-purple-400 focus:outline-none transition resize-none"
                  placeholder="Real talk time… reply first."
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white/80 flex items-center gap-1 sm:gap-2">
                  🔒 Hidden Message
                  <span className="text-[10px] sm:text-xs font-normal text-slate-600 dark:text-white/50">
                    (Unlocked after reply)
                  </span>
                </label>
                <textarea
                  value={hiddenText}
                  onChange={(e) => setHiddenText(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:border-purple-400 focus:outline-none transition resize-none"
                  placeholder="I appreciate you more than I show, even when I'm distant."
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-600 dark:text-red-200 animate-glow">
                ⚠️ {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={creating || paying}
              className="w-full py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white dark:text-black font-bold text-sm sm:text-base shadow-lg shadow-purple-500/50 hover:shadow-purple-500/75 transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {premiumReveal
                ? paying
                  ? "💳 Opening Paystack…"
                  : creating
                    ? "⏳ Finalizing moment…"
                    : `💰 Pay KES ${PREMIUM_PRICE_KES} & Share`
                : creating
                  ? "⏳ Creating…"
                  : "✨ Create Free Moment"}
            </button>

            <p className="text-[10px] sm:text-xs text-slate-600 dark:text-white/50 text-center">
              ✋ No bots. No fake activity. 100% real human moments.
            </p>
          </form>

          {/* Right: Live preview */}
          <div className="space-y-3 sm:space-y-4">
            {/* Card preview */}
            <div className="glass-dark rounded-lg sm:rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 hover:border-purple-400/50 transition">
              <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                <div className="inline-flex items-center gap-1 sm:gap-2 rounded-full bg-purple-500/20 px-2 sm:px-3 py-1">
                  <span className="text-base sm:text-lg">{MODES.find((m) => m.key === modeKey)?.emoji}</span>
                  <span className="text-[10px] sm:text-xs font-bold uppercase text-purple-200">
                    {MODES.find((m) => m.key === modeKey)?.label}
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white/60">
                  {premiumReveal ? "🔐 Reply-Unlock" : "🆓 Free"}
                </span>
              </div>

              <div className="space-y-2 sm:space-y-3 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-3 sm:p-4">
                <p className="text-sm sm:text-base leading-relaxed text-slate-900 dark:text-white font-medium">
                  {teaserText || "Your teaser appears here…"}
                </p>
                <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-600 dark:text-white/40 pt-2 border-t border-slate-300 dark:border-white/10">
                  <span>RANIA · emotional thread</span>
                  <span className="rounded px-2 py-1 bg-slate-200 dark:bg-white/10">{shortCode || "soon"}</span>
                </div>
              </div>

              <p className="text-[10px] sm:text-xs text-slate-600 dark:text-white/50 italic">
                This is how it looks when shared in WhatsApp Status. Screenshot-worthy. 📸
              </p>
            </div>

            {/* WhatsApp caption section */}
            {shortCode && (
              <div className="glass-dark rounded-lg sm:rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 border-purple-400/30 bg-gradient-to-br from-purple-500/10 via-black/50 to-black/50">
                <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                  <span className="text-base sm:text-lg">💬</span>
                  <h3 className="font-bold text-purple-600 dark:text-purple-300 text-xs sm:text-sm">Copy for WhatsApp</h3>
                </div>
                <textarea
                  readOnly
                  rows={4}
                  className="w-full rounded-lg bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-white/15 px-2 sm:px-3 py-2 text-[10px] sm:text-xs text-slate-700 dark:text-white/80 font-mono resize-none"
                  value={caption}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (caption) navigator.clipboard.writeText(caption)
                  }}
                  className="w-full py-1.5 sm:py-2 rounded-lg bg-purple-500/20 border border-purple-400/50 text-purple-600 dark:text-purple-300 font-bold text-xs sm:text-sm hover:bg-purple-500/30 transition"
                >
                  📋 Copy Caption
                </button>
                <p className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-200/70">
                  Paste directly in WhatsApp Status or group chat. The link will drive your friends here. 🚀
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}