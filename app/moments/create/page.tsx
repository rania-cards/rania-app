/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import type React from "react";
import { motion } from "framer-motion";

import { apiCreateMoment } from "@/lib/rania/client";
import type {
  RaniaModeKey,
  RaniaLanguage,
  RaniaTone,
  RaniaDeliveryFormat,
} from "@/lib/rania/types";

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
  const [modeKey, setModeKey] = useState<RaniaModeKey>("BESTIE_TRUTH_CHAIN");
  const [language, setLanguage] = useState<RaniaLanguage>("en");
  const [tone, setTone] = useState<RaniaTone>("soft");
  const [deliveryFormat, setDeliveryFormat] = useState<RaniaDeliveryFormat>("still");

  const [teaserText, setTeaserText] = useState<string>("Real talk time… reply first.");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [momentId, setMomentId] = useState<string | null>(null);


  function handleShareWhatsApp() {
    if (!caption) return;
    const url = `https://wa.me/?text=${encodeURIComponent(caption)}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  }

  const baseUrl =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_BASE_URL ?? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL ?? "https://raniaonline.com";

  const momentUrl = shortCode ? `${baseUrl}/m/${shortCode}` : "";
  const caption = shortCode
    ? `Reply here and complete the moment: ${momentUrl}`
    : "";

  useEffect(() => {
    setShortCode(shortCode);
    setMomentId(momentId);
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
        customHiddenText: undefined,
        premiumReveal: false,
        senderName: senderName.trim() || undefined,
        senderPhone: senderPhone.trim() || undefined,
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute -top-40 -left-32 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, delay: 1 }}
          className="absolute top-1/2 -right-40 w-96 h-96 bg-pink-600/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 9, repeat: Infinity, delay: 2 }}
          className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/30 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-2 sm:space-y-3"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              <span className="bg-linear-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Create Your Moment
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-200/80 max-w-2xl">
              You send a teaser. They reply . After their reply, you come back to write the hidden
              truth they&apos;ll unlock 
            </p>
          </motion.div>

          <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr,1.2fr]">
       
            <motion.form
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              onSubmit={handleSubmit}
              className="space-y-5 sm:space-y-6"
            >
              {/* Modes */}
              <div className="space-y-2 sm:space-y-3">
                <label className="text-xs sm:text-sm font-bold text-slate-100">
                  Pick Your Mode
                </label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {MODES.map((m, idx) => {
                    const active = m.key === modeKey;
                    return (
                      <motion.button
                        key={m.key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        type="button"
                        onClick={() => setModeKey(m.key)}
                        className={`group relative rounded-lg sm:rounded-2xl p-3 sm:p-4 text-left transition-all duration-300 transform ${
                          active
                            ? "glass-dark border-purple-400/50 scale-105 shadow-lg shadow-purple-500/30"
                            : "glass hover:border-slate-300/40 hover:scale-[1.02]"
                        }`}
                      >
                        <div className="text-xl sm:text-2xl mb-1 sm:mb-2">{m.emoji}</div>
                        <div
                          className={`font-bold text-xs sm:text-sm transition-colors ${
                            active ? "text-purple-300" : "text-slate-100"
                          }`}
                        >
                          {m.label}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-slate-400 leading-tight mt-1">
                          {m.description}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Sender identity */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"
              >
                <div className="space-y-1">
                  <label className="text-slate-100">Your name (for notifications)</label>
                  <input
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full rounded-lg border text-slate-50 border-slate-700 bg-slate-900/50 px-2 py-1.5 text-xs focus:border-purple-400 focus:outline-none transition backdrop-blur-sm"
                    placeholder="e.g. Abdullahi"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-100">
                    WhatsApp number (+2547…)
                  </label>
                  <input
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 text-slate-50 bg-slate-900/50 px-2 py-1.5 text-xs focus:border-purple-400 focus:outline-none transition backdrop-blur-sm"
                    placeholder="+2547XXXXXXXX"
                  />
                </div>
              </motion.div>

              {/* Language / Tone / Format */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="glass rounded-lg sm:rounded-2xl p-3 sm:p-4 space-y-3 sm:space-y-4"
              >
                <h3 className="font-bold text-slate-100 text-xs sm:text-sm">
                  Customize Your Vibe
                </h3>
                <div className="grid grid-cols-3 gap-2 sm:gap-3 text-slate-50">
                  {[
                    { label: "Language", options: LANG_OPTIONS, state: language, setState: setLanguage },
                    { label: "Tone", options: TONE_OPTIONS, state: tone, setState: setTone },
                    { label: "Format", options: DELIVERY_OPTIONS, state: deliveryFormat, setState: setDeliveryFormat },
                  ].map((group) => (
                    <div key={group.label} className="space-y-1 sm:space-y-2">
                      <label className="text-[10px] sm:text-xs font-bold text-slate-300">
                        {group.label}
                      </label>
                      <select
                        value={group.state}
                        onChange={(e) => group.setState(e.target.value as any)}
                        className="w-full rounded-lg bg-slate-950/50 border text-slate-50 border-slate-600 px-2 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-medium focus:border-purple-400 focus:outline-none transition backdrop-blur-sm"
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
              </motion.div>

              {/* Teaser */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-3 sm:space-y-4"
              >
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1 sm:gap-2">
                    👀 Teaser (Visible)
                  </label>
                  <textarea
                    value={teaserText}
                    onChange={(e) => setTeaserText(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg bg-slate-950/50 border border-slate-700 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm text-slate-100 focus:border-purple-400 focus:outline-none transition resize-none backdrop-blur-sm"
                    placeholder="Real talk time… reply first."
                  />
                </div>
              </motion.div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-400 backdrop-blur-sm"
                >
                  ⚠️ {error}
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={creating}
                className="w-full py-3 sm:py-4 rounded-lg sm:rounded-xl bg-linear-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-sm sm:text-base shadow-lg shadow-purple-500/50 hover:shadow-purple-500/75 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? "⏳ Creating…" : "✨ Create Free Moment"}
              </motion.button>

             
            </motion.form>

            {/* inset-inline-end: preview & caption */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-3 sm:space-y-4"
            >
              <div className="glass-dark rounded-lg sm:rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 border border-purple-400/40">
                <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                  <div className="inline-flex items-center gap-1 sm:gap-2 rounded-full bg-purple-500/20 px-2 sm:px-3 py-1">
                    <span className="text-base sm:text-lg">
                      {MODES.find((m) => m.key === modeKey)?.emoji}
                    </span>
                    <span className="text-[10px] sm:text-xs font-bold uppercase text-purple-200">
                      {MODES.find((m) => m.key === modeKey)?.label}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-100">
                    🆓 Sender 
                  </span>
                </div>

                <div className="space-y-2 sm:space-y-3 rounded-lg sm:rounded-xl bg-slate-900/50 border border-slate-700 p-3 sm:p-4 backdrop-blur-sm">
                  <p className="text-sm sm:text-base leading-relaxed text-slate-100 font-medium">
                    {teaserText || "Your teaser appears here…"}
                  </p>
                  <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-400 pt-2 border-t border-slate-700">
                    <span>RANIA · emotional thread</span>
                    <span className="rounded px-2 py-1 bg-slate-800">
                      {shortCode || "pending"}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] sm:text-xs text-slate-400 italic">
                  This is what they see in WhatsApp. After they reply, you&apos;ll write the hidden truth that they have to unlock.
                </p>
              </div>

              {shortCode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="glass-dark rounded-lg sm:rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 border-purple-400/30 bg-slate-950/50 backdrop-blur-xl"
                >
                  <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                    <span className="text-base sm:text-lg">💬</span>
                    <h3 className="font-bold text-purple-200 text-xs sm:text-sm">
                      Share on WhatsApp
                    </h3>
                  </div>

                  <textarea
                    readOnly
                    rows={4}
                    className="w-full rounded-lg bg-slate-900/50 border border-slate-700 px-2 sm:px-3 py-2 text-[10px] sm:text-xs text-slate-100 font-mono resize-none backdrop-blur-sm"
                    value={caption}
                  />

                  <div className="flex flex-col sm:flex-row gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      type="button"
                      onClick={() => {
                        if (caption) navigator.clipboard.writeText(caption);
                      }}
                      className="flex-1 py-1.5 sm:py-2 rounded-lg bg-purple-500/20 border border-purple-400/50 text-purple-200 font-bold text-[11px] sm:text-xs hover:bg-purple-500/30 transition"
                    >
                      📋 Copy Caption
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="flex-1 py-1.5 sm:py-2 rounded-lg bg-green-500/20 border border-green-400/60 text-green-300 font-bold text-[11px] sm:text-xs hover:bg-green-500/30 transition"
                    >
                      🟢 Share on WhatsApp
                    </motion.button>
                  </div>

                  <p className="text-[10px] sm:text-xs text-purple-200/80">
                    Tap &quot;Share on WhatsApp&quot; to post instantly, or copy the caption if you want to edit it first. 🚀
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      type="button"
                      onClick={() => window.open(`/m/${shortCode}`, "_blank")}
                      className="flex-1 rounded-full border border-slate-600 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-slate-900/50 transition"
                    >
                      View as receiver
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      type="button"
                      onClick={() => window.open(`/moments/manage/${shortCode}`, "_blank")}
                      className="flex-1 rounded-full border border-purple-500 px-3 py-1.5 text-[11px] text-purple-200 hover:bg-purple-500/20 transition"
                    >
                      Manage this moment (write hidden truth)
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}