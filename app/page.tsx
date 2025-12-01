// Full updated landing page including Examples, How It Works, Footer, Previews, Sharper Hero

"use client"

import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen w-full flex flex-col items-center text-center px-4 sm:px-0">
      {/* HERO */}
      <section className="pt-20 pb-16 max-w-3xl animate-slide-in-up space-y-6">
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">Say the truth</span>
          <br />
          <span className="text-slate-900 dark:text-white">without saying it</span>
          <br />
          <span className="text-slate-600 dark:text-white/60">first 💭</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-700 dark:text-white/75 leading-relaxed max-w-2xl mx-auto">
          RANIA is the East African truth-dropper. You send a teaser → they reply → your real message unlocks. Real
          emotions, perfect tension, built for screenshots.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
          <button
            onClick={() => router.push("/moments/create")}
            className="px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-base shadow-lg hover:scale-105 transition-all duration-300"
          >
            Start Your Moment
          </button>
          <button
            onClick={() => document.getElementById("examples-section")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-4 rounded-full glass font-semibold text-base hover:bg-slate-100 dark:hover:bg-white/15 transition-all duration-300"
          >
            See Examples
          </button>
        </div>
      </section>

      {/* PREVIEWS */}
     {/* PREVIEWS */}
<section className="w-full max-w-3xl pb-16 space-y-6">
  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Preview</h2>

  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {[
      { src: "/teaser.png", alt: "Teaser" },
      { src: "/reply.png", alt: "Their Reply" },
      { src: "/truth.png", alt: "Your Truth" },
    ].map((img, i) => (
      <div
        key={i}
        className="glass p-4 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col items-center"
      >
        <img
          src={img.src}
          alt={img.alt}
          className="rounded-lg shadow-md w-full h-auto"
        />
      </div>
    ))}
  </div>
</section>


      {/* HOW IT WORKS */}
      <section className="w-full max-w-3xl pb-16 space-y-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            {
              step: "1",
              title: "Drop a Teaser",
              desc: "Say a hint of your truth—just enough to pull them in.",
            },
            {
              step: "2",
              title: "They Reply",
              desc: "Their reaction unlocks the next step. Tension builds.",
            },
            {
              step: "3",
              title: "Truth Reveals",
              desc: "Your full message unlocks—raw, honest, real.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="glass p-4 rounded-xl border border-slate-200 dark:border-white/10"
            >
              <div className="text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                {f.step}
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base mt-2">{f.title}</h3>
              <p className="text-sm text-slate-600 dark:text-white/60">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EXAMPLES */}
      <section id="examples-section" className="w-full max-w-3xl pb-16 space-y-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Examples</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              teaser: "I need to tell you something but…",
              reply: "What happened?",
              truth: "I actually miss you more than I expected.",
            },
            {
              teaser: "I’ve been thinking about what you said…",
              reply: "Tell me?",
              truth: "You were right. I should’ve apologized earlier.",
            },
          ].map((ex, i) => (
            <div key={i} className="glass p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-2">
              <div className="text-left text-sm">
                <p className="font-semibold text-slate-900 dark:text-white">Teaser:</p>
                <p className="text-slate-600 dark:text-white/60">{ex.teaser}</p>
              </div>
              <div className="text-left text-sm">
                <p className="font-semibold text-slate-900 dark:text-white">Their Reply:</p>
                <p className="text-slate-600 dark:text-white/60">{ex.reply}</p>
              </div>
              <div className="text-left text-sm">
                <p className="font-semibold text-slate-900 dark:text-white">Truth Reveal:</p>
                <p className="text-slate-600 dark:text-white/60">{ex.truth}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full border-t border-slate-200 dark:border-white/10 py-10 mt-10 text-center text-sm text-slate-600 dark:text-white/50">
       
        <p className="mt-4">© {new Date().getFullYear()} RANIA </p>
      </footer>
    </div> 
  )
}