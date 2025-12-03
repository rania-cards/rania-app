/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGetMoment } from "@/lib/rania/client";

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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // 1) Load moment data via existing apiGetMoment
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

        // 2) Load replies for this shortCode
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
      // update local preview state to show it's now locked
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
      alert("Hidden truth saved. The receiver will see a preview and can unlock the full message for KES 20.");
    } catch (err: any) {
      setError(err.message ?? "Failed to save hidden truth");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-10 text-center text-sm text-slate-200">
        Loading your moment…
      </div>
    );
  }

  if (error && !moment) {
    return (
      <div className="max-w-xl mx-auto py-10 text-center space-y-3">
        <p className="text-red-400 text-sm">
          {error}
        </p>
        <button
          onClick={() => router.push("/moments/create")}
          className="px-4 py-2 text-xs rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-semibold hover:scale-105 transition"
        >
          Back to create
        </button>
      </div>
    );
  }

  if (!moment) {
    return (
      <div className="max-w-xl mx-auto py-10 text-center space-y-3">
        <p className="text-red-400 text-sm">
          Moment not found.
        </p>
        <button
          onClick={() => router.push("/moments/create")}
          className="px-4 py-2 text-xs rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-semibold hover:scale-105 transition"
        >
          Back to create
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
          Manage RANIA Moment
        </h1>
        <p className="text-xs sm:text-sm text-slate-300">
          Short code: <span className="font-mono text-pink-200">{moment.shortCode}</span>
        </p>
      </div>

      {/* Teaser & replies */}
      <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
        <div>
          <div className="text-[11px] text-slate-400 uppercase">Teaser</div>
          <div className="mt-1 text-slate-50">{moment.teaserText}</div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400 uppercase">Replies received</div>
          {replies.length === 0 && (
            <p className="mt-1 text-slate-400">
              No replies yet. Once someone replies, come back here to write your hidden truth.
            </p>
          )}
          {replies.map((r) => (
            <div
              key={r.id}
              className="mt-2 border-t border-slate-800 pt-2 space-y-1"
            >
              <div className="text-slate-100">
                {r.reply_text}
              </div>
              <div className="text-[11px] text-slate-500">
                {new Date(r.created_at).toLocaleString()}
              </div>
              {r.reaction_text && (
                <div className="text-[11px] text-slate-400">
                  Their reaction (after full unlock): {r.reaction_text}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Existing hidden preview info */}
        {moment.hiddenPreview && (
          <div className="mt-3 rounded-xl bg-slate-900 border border-purple-400/40 p-3 space-y-1">
            <div className="text-[11px] text-purple-200 uppercase">
              Current hidden preview
            </div>
            <p className="text-xs text-slate-100">
              {moment.hiddenPreview}
            </p>
            {moment.isHiddenLocked && (
              <p className="text-[11px] text-slate-400 mt-1">
                Locked at KES {moment.hiddenUnlockPriceKes ?? 20}. Receiver must pay to see the full message.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Hidden truth form */}
      <form
        onSubmit={handleSaveHidden}
        className="rounded-2xl bg-slate-950/90 border border-purple-500/50 p-4 sm:p-5 space-y-3 text-xs sm:text-sm"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔒</span>
            <div>
              <div className="font-semibold text-slate-50">
                Write your full hidden truth
              </div>
              <p className="text-[11px] text-slate-400">
                They’ll only see a preview until they pay KES 20 to unlock everything.
              </p>
            </div>
          </div>
        </div>

        <textarea
          value={fullHiddenText}
          onChange={(e) => setFullHiddenText(e.target.value)}
          rows={5}
          className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 text-slate-100 focus:border-purple-400 focus:outline-none"
          placeholder="Say the real thing here…"
        />

        {error && (
          <p className="text-[11px] text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-semibold py-2 hover:scale-105 transition disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save hidden truth"}
        </button>

        <p className="text-[11px] text-slate-400">
          Tip: Keep it real, keep it short enough to read, but deep enough that they’re willing to unlock it.
        </p>
      </form>

      <div className="text-center pt-3">
        <button
          onClick={() => router.push("/moments/create")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-700 text-slate-200 text-[11px] hover:bg-slate-900 transition"
        >
          ← Back to Create
        </button>
      </div>
    </div>
  );
}
