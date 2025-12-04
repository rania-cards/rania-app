/* eslint-disable react/jsx-no-duplicate-props */
"use client"
import { motion, Variants } from 'framer-motion';
import { ChevronDown, Zap, MessageSquare, Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';

const fadeUp = (delay = 0): Variants => ({
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.6, ease: 'easeOut' },
  },
});

const scaleIn = (delay = 0): Variants => ({
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { delay, duration: 0.6, ease: 'easeOut' },
  },
});

const slideInLeft = (delay = 0): Variants => ({
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { delay, duration: 0.6, ease: 'easeOut' },
  },
});

const slideInRight = (delay = 0): Variants => ({
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { delay, duration: 0.6, ease: 'easeOut' },
  },
});

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const floatingAnimation = {
  y: [0, -20, 0],
  transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
};

export default function HomePage() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 text-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {/* Gradient orbs */}
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
        
        {/* Grid background */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml?svgns=http://www.w3.org/2000/svg&width=50&height=50&viewBox=0 0 50 50')] opacity-5" />
      </div>

      {/* HERO SECTION */}
      <section className="w-full relative py-20 sm:py-32">
        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center"
          >
            {/* Left Content */}
            <motion.div variants={slideInLeft(0)} className="space-y-8">
              {/* Badge */}
              <motion.div
                variants={fadeUp(0.1)}
                className="inline-flex items-center gap-2 rounded-full border border-green-400/50 bg-green-500/10 px-4 py-2 text-xs sm:text-sm text-green-200 backdrop-blur-sm"
              >
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="h-2 w-2 rounded-full bg-green-400"
                />
                Now live · RANIA
              </motion.div>

              {/* Main Heading */}
              <motion.div variants={fadeUp(0.2)} className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-tight">
                  <span className="block">Say the truth</span>
                  <motion.span
                    className="block bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent"
                    animate={{ backgroundPosition: ['0%', '100%'] }}
                    transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
                  >
                    without saying it first
                  </motion.span>
                  <span className="block text-3xl mt-2">💭</span>
                </h1>
              </motion.div>

              {/* Description */}
              <motion.p
                variants={fadeUp(0.3)}
                className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed"
              >
                RANIA is a WhatsApp-first emotional game. You send a teaser  → they reply  → you drop the full hidden truth. They see the preview and can unlock the full message for{' '}
                <span className="font-bold text-pink-300">KES 20</span>.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                variants={fadeUp(0.4)}
                className="flex flex-col sm:flex-row gap-4 pt-4"
              >
                <Link
                  href="/moments/create"
                  className="px-6 sm:px-8 py-3 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-sm sm:text-base shadow-lg hover:shadow-xl transition"
                >
                  
                   Start your free moment
                  
                 
                </Link>
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => scrollTo('how-it-works')}
                  className="px-6 sm:px-8 py-3 rounded-full border border-white/20 bg-white/5 text-sm font-semibold hover:bg-white/10 transition flex items-center justify-center gap-2"
                >
                  See how it works <ChevronDown size={16} />
                </motion.button>
              </motion.div>

              {/* Features */}
              <motion.div
                variants={fadeUp(0.5)}
                className="flex flex-col gap-3 pt-4"
              >
                {[
                  
                  '📲 Built for WhatsApp & Gen Z',
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="text-xs sm:text-sm text-slate-300 flex items-center gap-2"
                  >
                    <span className="w-1 h-1 rounded-full bg-cyan-400" />
                    {feature}
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right Visual - Step Cards */}
            <motion.div variants={slideInRight(0.2)} className="relative h-96 sm:h-full">
              <div className="relative w-full h-full">
                {[
                  { step: 1, title: 'Teaser ', text: '"There\'s something I\'ve wanted to tell you…"', color: 'from-purple-500/20 to-purple-600/20', border: 'border-purple-400/40', delay: 0 },
                  { step: 2, title: '💬 Their reply ', text: '"Okay, now I\'m curious. What is it?"', color: 'from-pink-500/20 to-pink-600/20', border: 'border-pink-400/40', delay: 0.1 },
                  { step: 3, title: '🔒 Hidden truth ', text: '"I miss you more than I let you see…"', color: 'from-cyan-500/20 to-cyan-600/20', border: 'border-cyan-400/40', delay: 0.2 },
                ].map((card, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 40, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3 + card.delay, duration: 0.6 }}
                   
                    style={{ animationDelay: `${i * 0.2}s` }}
                    className={`absolute w-full sm:w-80 p-5 rounded-2xl border ${card.border} bg-gradient-to-br ${card.color} backdrop-blur-xl shadow-2xl`}
                    
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-300">{card.title}</span>
                      <span className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-[10px] font-bold">Step {card.step}</span>
                    </div>
                    <p className="text-sm font-semibold text-white mb-2">{card.text}</p>
                    <p className="text-xs text-slate-300">
                      {i === 0 && 'They see this in WhatsApp and reply for free.'}
                      {i === 1 && 'You get a WhatsApp notification with their reply.'}
                      {i === 2 && 'They tap "Unlock full truth " to read everything.'}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="w-full py-24 border-t border-white/5">
        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
            className="space-y-12"
          >
            {/* Section Header */}
            <motion.div variants={fadeUp(0)} className="text-center space-y-4">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
                How <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">RANIA</span> actually works
              </h2>
              <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto">
                It&apos;s not a greeting card. It&apos;s an emotional game. 5 clear steps from teaser to truth.
              </p>
            </motion.div>

            {/* Steps Grid */}
            <motion.div
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
            >
              {[
                { num: '1', title: 'Sender drops a teaser ', desc: 'Write a short teaser that hints at your real feelings. No payment. Just tension.' },
                { num: '2', title: 'Receiver replies ', desc: 'They open the link from WhatsApp and reply honestly. Still free.' },
                { num: '3', title: 'You write the hidden truth', desc: 'After their reply, see what they said and write the full hidden message.' },
                { num: '4', title: 'They see preview & unlock ', desc: 'They see half your truth as a preview. Tap "Unlock full truth".' },
                { num: '5', title: 'Reaction + Deep Truth', desc: 'After reading, they react. Optional: AI Deep Breakdown. Screenshot-perfect cards.' },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  variants={scaleIn(i * 0.1)}
                  className="group relative p-5 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm hover:border-purple-400/50 hover:bg-purple-500/10 transition-all duration-300"
                >
                  {/* Connection line */}
                  {i < 4 && (
                    <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-0.5 bg-gradient-to-r from-purple-400 to-transparent" />
                  )}
                  
                  <div className="text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-3">
                    {step.num}
                  </div>
                  <h3 className="font-bold text-slate-50 text-sm mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-400">{step.desc}</p>
                  
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-5 blur-xl transition-opacity duration-300" />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* EXAMPLES SECTION */}
      <section id="examples" className="w-full py-24 border-t border-white/5">
        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer}
            className="space-y-12"
          >
            <motion.div variants={fadeUp(0)} className="text-center space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black">
                Example flows Gen Z will actually use
              </h2>
            </motion.div>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  tag: 'Crush Reveal',
                  teaser: '"I laugh a little too hard at your jokes…"',
                  reply: '"😂 Okay now I\'m suspicious. What are you saying?"',
                  preview: '"Let\'s just say you\'re more special to me than you think…"',
                  full: '"I\'ve had a crush on you for months but didn\'t want to ruin our vibe. I genuinely like you."',
                },
                {
                  tag: 'Bestie Truth',
                  teaser: '"There\'s something about our friendship I\'ve never said…"',
                  reply: '"👀 Say it. I\'m listening."',
                  preview: '"Sometimes I feel like I care more than I show…"',
                  full: '"You\'ve held me down in ways I never acknowledged. I\'m scared of losing our friendship because I act too chill."',
                },
              ].map((ex, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp(i * 0.1)}
                  className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm space-y-4 group hover:border-pink-400/50 hover:bg-pink-500/5 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <motion.span
                      className="h-2 w-2 rounded-full bg-pink-400"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-xs font-bold text-pink-300 uppercase tracking-wider">{ex.tag}</span>
                  </div>

                  {[
                    { label: 'Teaser', value: ex.teaser },
                    { label: 'Their Reply ', value: ex.reply },
                    { label: 'Hidden preview ', value: ex.preview },
                    { label: 'Full truth ', value: ex.full },
                  ].map((item, j) => (
                    <motion.div
                      key={j}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ delay: j * 0.1 }}
                      className="space-y-1"
                    >
                      <p className="text-xs font-semibold text-slate-300">{item.label}</p>
                      <p className="text-sm text-slate-300 italic">{item.value}</p>
                    </motion.div>
                  ))}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* WHY RANIA SECTION */}
     

      {/* FINAL CTA SECTION */}
      <section className="w-full py-24 border-t border-white/5">
        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp(0)}
            className="relative rounded-3xl overflow-hidden"
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 opacity-80" />
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 opacity-20 blur-2xl"
            />

            {/* Content */}
            <div className="relative p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2 sm:space-y-3">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950">
                  Ready to drop your first truth?
                </h2>
                <p className="text-sm text-slate-900/80 max-w-md">
                  Sender . First reply . unlock truth.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3.5 rounded-full bg-slate-950 text-white font-bold text-sm hover:bg-slate-800 transition whitespace-nowrap"
              >
                Start RANIA now →
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full border-t border-white/10 py-8 text-center text-xs sm:text-sm text-slate-400">
        <p>© {new Date().getFullYear()} RANIA · Built for truth, not greetings.</p>
      </footer>
    </div>
  );
}