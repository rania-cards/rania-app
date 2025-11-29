/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGetMoment, apiReplyToMoment, apiDeepTruth } from "@/lib/rania/client";

type MomentData = {
  id: string;
  shortCode: string;
  status: string;
  isPremiumReveal: boolean;
  deliveryFormat: string;
  teaserText: string;
  hasHidden: boolean;
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
  const [submitting, setSubmitting] = useState(false);
  const [hiddenText, setHiddenText] = useState<string | null>(null);

  const [deepTruth, setDeepTruth] = useState<string | null>(null);
  const [deepTruthLoading, setDeepTruthLoading] = useState(false);
  const [deepTruthError, setDeepTruthError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await apiGetMoment(shortCode);
        if (!cancel) {
          setMoment(res.moment);
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

    setSubmitting(true);
    try {
      const res = await apiReplyToMoment(shortCode, {
        replyText: replyText.trim(),
        vibeScore: vibeScore ?? null,
        identity: {},
      });

      setHiddenText(res.hiddenText);
    } catch (err: any) {
      alert(err.message ?? "Failed to submit reply");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeepTruth() {
    if (!moment) return;
    setDeepTruthLoading(true);
    setDeepTruthError(null);
    try {
      const res = await apiDeepTruth(moment.id, { identity: {} });
      setDeepTruth(res.deepTruth);
    } catch (err: any) {
      setDeepTruthError(err.message ?? "Failed to get deep truth");
    } finally {
      setDeepTruthLoading(false);
    }
  }

  if (loading) {
    return <p className="text-xs text-white/60">Loading moment…</p>;
  }

  if (loadError || !moment) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-red-400">Could not load this RANIA moment.</p>
        <button
          onClick={() => router.push("/moments/create")}
          className="rounded-full border border-white/20 px-3 py-1 text-[11px] hover:bg-white/10"
        >
          Start your own moment
        </button>
      </div>
    );
  }

  const isCompleted = Boolean(hiddenText);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000/";
  const startUrl = `${baseUrl}/moments/create`;

  return (
    <div className="space-y-4">
      {/* Card preview */}
      <div className="rounded-xl border border-white/15 bg-gradient-to-b from-white/5 to-black/40 p-4 space-y-3">
        <div className="text-[11px] text-white/50">RANIA Moment</div>
        <div className="text-sm font-medium leading-snug">{moment.teaserText}</div>
        <div className="text-[10px] text-white/40 border-t border-white/10 pt-1 mt-2">
          This is an emotional truth moment. Reply below.
        </div>
      </div>

      {/* If reply already done in this session, show revealed */}
      {hiddenText && (
        <div className="space-y-3 rounded-lg border border-emerald-400/40 bg-black/40 p-3 text-xs">
          <div className="text-emerald-300 font-semibold text-[11px] uppercase">
            Hidden truth unlocked
          </div>
          <div className="text-sm whitespace-pre-wrap">{hiddenText}</div>

          <div className="mt-2 border-t border-white/10 pt-2 space-y-2">
            <div className="text-[11px] text-white/60">Deep breakdown (optional)</div>
            {!deepTruth && !deepTruthLoading && (
              <button
                onClick={handleDeepTruth}
                className="rounded-full border border-emerald-400/60 px-3 py-1 text-[11px] text-emerald-300 hover:bg-emerald-400/10"
              >
                Get Deep Truth (KES 50 / covered by pass)
              </button>
            )}
            {deepTruthLoading && (
              <p className="text-[11px] text-white/60">Analyzing this moment…</p>
            )}
            {deepTruthError && <p className="text-[11px] text-red-400">{deepTruthError}</p>}
            {deepTruth && (
              <div className="text-[11px] text-white/80 whitespace-pre-wrap border border-white/15 rounded-md p-2 bg-black/40">
                {deepTruth}
              </div>
            )}
          </div>

          {/* Combined share text */}
          <div className="mt-3 border-t border-white/10 pt-2 space-y-1">
            <div className="text-[11px] text-white/60">Share this back on WhatsApp</div>
            <textarea
              readOnly
              className="w-full rounded-md border border-white/15 bg-black/40 p-2 text-[11px]"
              rows={3}
              value={`RANIA Moment unlocked:\n\nHidden truth:\n${hiddenText}\n\nReply link: ${baseUrl}/m/${moment.shortCode}\n\nStart your own: ${startUrl}`}
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  `RANIA Moment unlocked:\n\nHidden truth:\n${hiddenText}\n\nStart yours: ${startUrl}`
                );
              }}
              className="mt-1 rounded-full border border-emerald-400/60 px-3 py-1 text-[11px] text-emerald-300 hover:bg-emerald-400/10"
            >
              Copy text
            </button>
          </div>
        </div>
      )}

      {/* Reply form (only if not yet completed in this session) */}
      {!isCompleted && (
        <form onSubmit={handleReplySubmit} className="space-y-3 text-xs">
          <div className="rounded-md border border-white/12 bg-black/30 p-3 space-y-2">
            <div className="font-medium">
              {moment.isPremiumReveal
                ? "Reply to unlock what they really said."
                : "Reply to complete this moment."}
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-white/15 bg-black/40 px-2 py-2 text-xs"
              placeholder="Type your honest reply here…"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-white/60">Vibe (1–10)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={vibeScore ?? ""}
                  onChange={(e) =>
                    setVibeScore(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="w-12 rounded-md border border-white/15 bg-black/40 px-1 py-0.5 text-[11px]"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-medium hover:bg-emerald-400 disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Reply & unlock"}
              </button>
            </div>
          </div>

          <div className="text-[11px] text-white/40">
            RANIA is for honest, respectful emotional truth. No harassment, no insults.
          </div>
        </form>
      )}

      {/* CTA to start own moment */}
      <div className="pt-2 border-t border-white/10 mt-4">
        <button
          onClick={() => router.push("/moments/create")}
          className="rounded-full border border-white/20 px-3 py-1.5 text-[11px] hover:bg-white/10"
        >
          Start your own RANIA moment
        </button>
      </div>
    </div>
  );
}
