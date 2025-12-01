/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useEffect, useState } from "react"
import type React from "react"

import { useParams, useRouter } from "next/navigation"
import { apiGetMoment, apiReplyToMoment, apiDeepTruth } from "@/lib/rania/client"

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
    setDeepTruthLoading(true)
    setDeepTruthError(null)
    try {
      const res = await apiDeepTruth(moment.id, { identity: {} })
      setDeepTruth(res.deepTruth)
    } catch (err: any) {
      setDeepTruthError(err.message ?? "Failed to get deep truth")
    } finally {
      setDeepTruthLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-bounce">✨</div>
          <p className="text-white/60">Loading this moment…</p>
        </div>
      </div>
    )
  }

  if (loadError || !moment) {
    return (
      <div className="glass rounded-2xl p-8 max-w-md mx-auto space-y-4 text-center">
        <div className="text-4xl">😕</div>
        <p className="text-red-300 font-medium">Could not load this RANIA moment.</p>
        <button
          onClick={() => router.push("/moments/create")}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-black font-bold hover:scale-105 transition"
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
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-in-up">
      <div className="glass-dark rounded-3xl p-8 space-y-6">
        <div className="space-y-3">
          <div className="text-sm font-bold text-purple-300">RANIA Emotional Thread</div>
          <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">{moment.teaserText}</h2>
        </div>

        <div className="rounded-2xl bg-black/50 border border-white/10 p-6">
          <p className="text-sm text-white/70">
            💭 This is an emotional truth moment. Someone just shared their real feelings with you.
            <br />
            Respond honestly below to unlock what they really meant.
          </p>
        </div>
      </div>

      {/* If reply already done, show revealed truth */}
      {hiddenText && (
        <div className="space-y-6 animate-slide-in-up">
          <div className="glass-dark rounded-3xl p-8 space-y-4 border-purple-400/50 bg-gradient-to-br from-purple-500/20 via-black/50 to-black/50">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🔓</span>
              <h3 className="font-black text-2xl bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                Truth Unlocked
              </h3>
            </div>

            <div className="rounded-2xl bg-black/60 border border-white/15 p-6 space-y-3">
              <p className="text-lg leading-relaxed text-white whitespace-pre-wrap font-medium">{hiddenText}</p>
            </div>

            <p className="text-xs text-white/50 italic">This moment just became real. 💎</p>
          </div>

          {/* Deep truth optional analysis */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <span>🔬</span> Deep Breakdown (Optional)
            </h3>
            {!deepTruth && !deepTruthLoading && (
              <button
                onClick={handleDeepTruth}
                className="w-full py-3 rounded-lg border border-purple-400/60 bg-purple-500/10 text-purple-300 font-bold hover:bg-purple-500/20 transition"
              >
                Unlock Deep Truth (KES 50)
              </button>
            )}
            {deepTruthLoading && (
              <div className="flex items-center justify-center gap-2 py-6">
                <div className="animate-spin text-2xl">✨</div>
                <p className="text-white/60">Analyzing this moment…</p>
              </div>
            )}
            {deepTruthError && <p className="text-sm text-red-300">{deepTruthError}</p>}
            {deepTruth && (
              <div className="rounded-lg bg-black/40 border border-white/15 p-4">
                <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{deepTruth}</p>
              </div>
            )}
          </div>

          {/* Share back section */}
          <div className="glass-dark rounded-2xl p-6 space-y-4 border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 to-black/50">
            <h3 className="font-bold text-white flex items-center gap-2">
              <span>📲</span> Share This Moment Back
            </h3>
            <textarea
              readOnly
              className="w-full rounded-lg bg-black/60 border border-white/15 px-3 py-2 text-xs text-white/80 font-mono resize-none"
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
              className="w-full py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-bold hover:bg-cyan-500/30 transition"
            >
              📋 Copy to Share
            </button>
          </div>
        </div>
      )}

      {/* Reply form (only if not yet completed) */}
      {!isCompleted && (
        <form onSubmit={handleReplySubmit} className="space-y-4">
          <div className="glass-dark rounded-3xl p-8 space-y-6">
            <h3 className="font-bold text-xl text-white">
              {moment.isPremiumReveal ? "🔑 Reply to Unlock" : "💬 Complete This Moment"}
            </h3>

            <div className="space-y-3">
              <label className="text-sm font-bold text-white/70">Your Reply</label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                className="w-full rounded-xl bg-black/40 border border-white/15 px-4 py-3 text-sm text-white focus:border-purple-400 focus:outline-none transition resize-none"
                placeholder="Type your honest reply here…"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-white/70">How&apos;s the vibe? (1–10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={vibeScore ?? ""}
                onChange={(e) => setVibeScore(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-lg bg-black/40 border border-white/15 px-4 py-2 text-sm focus:border-purple-400 focus:outline-none transition"
                placeholder="7"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-black font-bold text-base shadow-lg shadow-purple-500/50 hover:shadow-purple-500/75 transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "📤 Sending reply…" : "✨ Reply & Unlock Truth"}
            </button>

            <p className="text-xs text-white/50 text-center">Be real. Be kind. Be honest. This is a safe space. 🤝</p>
          </div>
        </form>
      )}

      {/* Footer CTA */}
      <div className="text-center pt-4 pb-8">
        <button
          onClick={() => router.push("/moments/create")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass hover:bg-white/10 transition font-bold text-white/80"
        >
          ← Create Your Own RANIA Moment
        </button>
      </div>
    </div>
  )
}
