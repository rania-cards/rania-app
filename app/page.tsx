"use client"

import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center space-y-8 sm:space-y-12 px-4 sm:px-0">
      {/* Hero section */}
      <div className="space-y-6 max-w-3xl animate-slide-in-up">
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tighter leading-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Say what you feel,
            </span>
            <br />
            <span className="text-slate-900 dark:text-white">but never say</span>
            <br />
            <span className="text-slate-600 dark:text-white/70">out loud 💭</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-700 dark:text-white/75 leading-relaxed max-w-2xl mx-auto">
            We know vulnerability isn&apos;t easy. Admitting feelings, confessing mistakes, making amends—these moments
            matter. RANIA creates a safe space where you send your truth as a teaser, they reply first, and only then
            does your real message unlock. Both of you get a moment you&apos;ll screenshot and remember.
            <br className="hidden sm:block" />
            <span className="text-slate-600 dark:text-white/60 text-xs sm:text-sm">
              Built for Gen Z. Made in Kenya. Powered by real human honesty.
            </span>
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={() => router.push("/moments/create")}
            className="relative group w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white dark:text-black font-bold text-base shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 overflow-hidden"
          >
            <span className="relative z-10">Create Your First Moment</span>
            <div className="absolute inset-0 bg-white/15 opacity-0 group-hover:opacity-100 transition" />
          </button>
          <button
            onClick={() => router.push("/moments/create")}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-full glass font-semibold text-base hover:bg-slate-100 dark:hover:bg-white/15 transition-all duration-300"
          >
            See Examples
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 pt-8 sm:pt-12 w-full max-w-2xl">
        {[
          { label: "Vulnerable Moments", value: "2.4K+", emoji: "💙" },
          { label: "Real Connections Made", value: "8.9K+", emoji: "🤝" },
          { label: "From East Africa", value: "100%", emoji: "🌍" },
        ].map((stat, i) => (
          <div
            key={i}
            className="glass rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-2 hover:bg-slate-50 dark:hover:bg-white/12 transition border border-slate-200 dark:border-white/8"
          >
            <div className="text-2xl sm:text-3xl">{stat.emoji}</div>
            <div className="text-xl sm:text-2xl font-bold text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text">
              {stat.value}
            </div>
            <div className="text-xs sm:text-sm text-slate-600 dark:text-white/50 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-lg sm:rounded-xl px-4 sm:px-6 py-3 sm:py-4 max-w-2xl border border-slate-200 dark:border-white/8 backdrop-blur-xl">
        <p className="text-xs sm:text-sm text-slate-700 dark:text-white/70 leading-relaxed">
          <span className="block font-semibold text-slate-900 dark:text-white/90 mb-1">We get it.</span>
          Real moments are messy. That&apos;s why RANIA never generates fake replies. No bots. No manufactured activity. Just
          real humans sharing real feelings with people who matter. Built with respect. Designed for honesty.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full max-w-2xl pt-6 sm:pt-8">
        {[
          {
            title: "Teaser → Reply → Truth",
            description: "Start with a hint. They respond. Your full message unlocks. Tension builds connection.",
          },
          {
            title: "Built for Sharing",
            description: "Screenshot-friendly cards designed to go viral on WhatsApp Status and group chats.",
          },
          {
            title: "Your Language",
            description: "Say it in English, Swahili, or Sheng. RANIA understands how Gen Z talks.",
          },
          {
            title: "Safe & Respectful",
            description: "Premium mode means only trusted replies unlock your truth. No trolls. No harassment.",
          },
        ].map((feature, i) => (
          <div key={i} className="glass rounded-lg p-3 sm:p-4 border border-slate-200 dark:border-white/8 text-left">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm sm:text-base">{feature.title}</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-white/60">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}