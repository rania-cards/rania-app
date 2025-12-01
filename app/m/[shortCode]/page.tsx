/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useEffect, useState } from "react"
import type React from "react"
import Script from "next/script"

import { useParams, useRouter } from "next/navigation"
import { apiGetMoment, apiReplyToMoment, apiDeepTruth } from "@/lib/rania/client"

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

const DEEP_TRUTH_PRICE_KES = 50

type MomentData = {
  id: string
  shortCode: string
  status: string
  isPremiumReveal: boolean
  deliveryFormat: string
  teaserText: string
  hasHidden: boolean
}

export default function MomentViewPage() {
  const params = useParams<{ shortCode: string }>()
  const router = useRouter()
  const shortCode = params.shortCode

  const [moment, setMoment] = useState<MomentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [vibeScore, setVibeScore] = useState<number | undefined>()
  const [submitting, setSubmitting] = useState(false)
  const [hiddenText, setHiddenText] = useState<string | null>(null)
  const [deepTruth, setDeepTruth] = useState<string | null>(null)
  const [deepTruthLoading, setDeepTruthLoading] = useState(false)
  const [deepTruthError, setDeepTruthError] = useState<string | null>(null)
  const [deepTruthEmail, setDeepTruthEmail] = useState<string>("test@example.com")
  const [payingDeepTruth, setPayingDeepTruth] = useState(false)

  const paystackKey =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? ""
      : ""
  const currency =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_PAYSTACK_CURRENCY ?? "KES"
      : "KES"

  useEffect(() => {
    let cancel = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await apiGetMoment(shortCode)
        if (!cancel) {
          setMoment(res.moment)
        }
      } catch (err: any) {
        if (!cancel) setLoadError(err.message ?? "Failed to load moment")
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => {
      cancel = true
    }
  }, [shortCode])

  async function handleReplySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!moment) return

    if (!replyText.trim()) {
      alert("Reply cannot be empty.")
      return
    }

    setSubmitting(true)
    try {
      const res = await apiReplyToMoment(shortCode, {
        replyText: replyText.trim(),
        vibeScore: vibeScore ?? null,
        identity: {},
      })
      setHiddenText(res.hiddenText)
    } catch (err: any) {
      alert(err.message ?? "Failed to submit reply")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeepTruth() {
    if (!moment) return
    setDeepTruthError(null)

    if (!window.PaystackPop || !paystackKey) {
      setDeepTruthError("Payment library not loaded or Paystack key missing.")
      return
    }

    if (!deepTruthEmail || !deepTruthEmail.includes("@")) {
      setDeepTruthError("Enter a valid email for Paystack.")
      return
    }

    setPayingDeepTruth(true)

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
        setPayingDeepTruth(false)
        if (response.reference) {
          void fetchDeepTruthWithReference(response.reference)
        } else {
          setDeepTruthError("Payment completed but no reference returned.")
        }
      },
      onClose: function () {
        setPayingDeepTruth(false)
      },
    })

    handler.openIframe()
  }

  async function fetchDeepTruthWithReference(reference: string) {
    if (!moment) return
    setDeepTruthLoading(true)
    setDeepTruthError(null)
    try {
      const res = await apiDeepTruth(moment.id, {
        paymentReference: reference,
        skipPaymentCheck: true,
      })
      setDeepTruth(res.deepTruth)
    } catch (err: any) {
      setDeepTruthError(err.message ?? "Failed to get Deep Truth")
    } finally {
      setDeepTruthLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-bounce">✨</div>
          <p className="text-slate-600 dark:text-white/60">Loading this moment…</p>
        </div>
      </div>
    )
  }

  if (loadError || !moment) {
    return (
      <div className="glass rounded-xl sm:rounded-2xl p-6 sm:p-8 max-w-md mx-auto space-y-4 text-center">
        <div className="text-4xl">😕</div>
        <p className="text-red-600 dark:text-red-300 font-medium">Could not load this RANIA moment.</p>
        <button
          onClick={() => router.push("/moments/create")}
          className="w-full py-2 sm:py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:scale-105 transition"
        >
          Create Your Own
        </button>
      </div>
    )
  }

  const isCompleted = Boolean(hiddenText)
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000/"
  const startUrl = `${baseUrl}/moments/create`

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />

      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 animate-slide-in-up px-4 sm:px-0">
        <div className="glass-dark rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4 sm:space-y-6">
          <div className="space-y-2 sm:space-y-3">
            <div className="text-xs sm:text-sm font-bold text-purple-400 dark:text-purple-300">RANIA Emotional Thread</div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-tight">
              {moment.teaserText}
            </h2>
          </div>

          <div className="rounded-lg sm:rounded-2xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-slate-700 dark:text-white/70">
              💭 This is an emotional truth moment. Someone just shared their real feelings with you.
              <br />
              Respond honestly below to unlock what they really meant.
            </p>
          </div>
        </div>

        {/* If reply already done, show revealed truth */}
        {hiddenText && (
          <div className="space-y-4 sm:space-y-6 animate-slide-in-up">
            <div className="glass-dark rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-3 sm:space-y-4 border-purple-400/50 bg-gradient-to-br from-purple-500/20 via-black/50 to-black/50">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <span className="text-xl sm:text-2xl">🔓</span>
                <h3 className="font-black text-xl sm:text-2xl bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  Truth Unlocked
                </h3>
              </div>

              <div className="rounded-lg sm:rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-white/15 p-4 sm:p-6 space-y-2 sm:space-y-3">
                <p className="text-sm sm:text-lg leading-relaxed text-slate-900 dark:text-white whitespace-pre-wrap font-medium">
                  {hiddenText}
                </p>
              </div>

              <p className="text-[10px] sm:text-xs text-slate-600 dark:text-white/50 italic">This moment just became real. 💎</p>
            </div>

            {/* Deep truth optional analysis */}
            <div className="glass rounded-lg sm:rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <span>🔬</span> Deep Breakdown (Optional – KES {DEEP_TRUTH_PRICE_KES})
              </h3>

              {!deepTruth && !deepTruthLoading && (
                <div className="space-y-2 sm:space-y-3">
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-white/70">
                      Email for Payment Receipt
                    </label>
                    <input
                      type="email"
                      value={deepTruthEmail}
                      onChange={(e) => setDeepTruthEmail(e.target.value)}
                      className="w-full rounded-lg bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 px-2 sm:px-3 py-1.5 sm:py-2 text-xs focus:border-purple-400 focus:outline-none transition"
                      placeholder="you@campus.ac.ke"
                    />
                  </div>
                  <button
                    onClick={handleDeepTruth}
                    disabled={payingDeepTruth}
                    className="w-full py-2 sm:py-3 rounded-lg border border-purple-400/60 bg-purple-500/10 text-purple-600 dark:text-purple-300 font-bold text-xs sm:text-sm hover:bg-purple-500/20 transition disabled:opacity-60"
                  >
                    {payingDeepTruth ? "💳 Opening Paystack…" : `💰 Pay KES ${DEEP_TRUTH_PRICE_KES} & Unlock`}
                  </button>
                </div>
              )}

              {deepTruthLoading && (
                <div className="flex items-center justify-center gap-2 py-4 sm:py-6">
                  <div className="animate-spin text-2xl">✨</div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-white/60">Analyzing this moment…</p>
                </div>
              )}

              {deepTruthError && <p className="text-xs sm:text-sm text-red-600 dark:text-red-300">{deepTruthError}</p>}

              {deepTruth && (
                <div className="rounded-lg bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-white/80 whitespace-pre-wrap leading-relaxed">
                    {deepTruth}
                  </p>
                </div>
              )}
            </div>

            {/* Share back section */}
            <div className="glass-dark rounded-lg sm:rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 to-black/50">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <span>📲</span> Share This Moment Back
              </h3>
              <textarea
                readOnly
                className="w-full rounded-lg bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-white/15 px-2 sm:px-3 py-2 text-[10px] sm:text-xs text-slate-700 dark:text-white/80 font-mono resize-none"
                rows={4}
                value={`I just unlocked a real moment on RANIA:\n\n"${hiddenText}"\n\nCreate yours: ${startUrl}`}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `I just unlocked a real moment on RANIA:\n\n"${hiddenText}"\n\nCreate yours: ${startUrl}`,
                  )
                }}
                className="w-full py-2 sm:py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-600 dark:text-cyan-300 font-bold text-xs sm:text-sm hover:bg-cyan-500/30 transition"
              >
                📋 Copy to Share
              </button>
            </div>
          </div>
        )}

        {/* Reply form (only if not yet completed) */}
        {!isCompleted && (
          <div className="space-y-4">
            <div className="glass-dark rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-4 sm:space-y-6">
              <h3 className="font-bold text-base sm:text-xl text-slate-900 dark:text-white">
                {moment.isPremiumReveal ? "🔑 Reply to Unlock" : "💬 Complete This Moment"}
              </h3>

              <div className="space-y-2 sm:space-y-3">
                <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-white/70">Your Reply</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg sm:rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-purple-400 focus:outline-none transition resize-none"
                  placeholder="Type your honest reply here…"
                />
              </div>

              <div className="space-y-2 sm:space-y-3">
                <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-white/70">
                  How&apos;s the vibe? (1–10)
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={vibeScore ?? 5}
                  onChange={(e) => setVibeScore(Number(e.target.value))}
                  className="w-full h-2 bg-slate-300 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-purple-600 dark:text-purple-300 font-semibold">Selected: {vibeScore ?? 5}</span>
              </div>

              <button
                onClick={handleReplySubmit}
                disabled={submitting}
                className="w-full py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white dark:text-black font-bold text-xs sm:text-base shadow-lg shadow-purple-500/50 hover:shadow-purple-500/75 transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "📤 Sending reply…" : "✨ Reply & Unlock Truth"}
              </button>

              <p className="text-[10px] sm:text-xs text-slate-600 dark:text-white/50 text-center">
                Be real. Be kind. Be honest. This is a safe space. 🤝
              </p>
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div className="text-center pt-3 sm:pt-4 pb-6 sm:pb-8">
          <button
            onClick={() => router.push("/moments/create")}
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full glass hover:bg-slate-100 dark:hover:bg-white/10 transition font-bold text-slate-700 dark:text-white/80 text-xs sm:text-sm"
          >
            ← Create Your Own RANIA Moment
          </button>
        </div>
      </div>
    </>
  )
}