/* eslint-disable react/jsx-no-duplicate-props */
"use client"
import { motion, Variants } from 'framer-motion';
import { ChevronDown, Sparkles, Heart, Lock, MessageCircle } from 'lucide-react';
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

export default function HomePage() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 text-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
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
                Now live · Authentic connections
              </motion.div>

              {/* Main Heading */}
              <motion.div variants={fadeUp(0.2)} className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-tight">
                  <span className="block">Share your deepest</span>
                  <motion.span
                    className="block bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent"
                    animate={{ backgroundPosition: ['0%', '100%'] }}
                    transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
                  >
                    emotional truths
                  </motion.span>
                  <span className="block text-3xl mt-2">💭</span>
                </h1>
              </motion.div>

              {/* Description */}
              <motion.p
                variants={fadeUp(0.3)}
                className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed"
              >
                RANIA is an emotional messaging platform designed for Gen Z. Create meaningful conversations by sending a teaser, receiving authentic replies, and revealing your hidden truth. Perfect for crushes, best friends, and deep confessions.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                variants={fadeUp(0.4)}
                className="flex flex-col sm:flex-row gap-4 pt-4"
              >
                <Link
                  href="/moments/create"
                  className="px-6 sm:px-8 py-3 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 text-white font-bold text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  Create Your First Moment
                </Link>
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => scrollTo('how-it-works')}
                  className="px-6 sm:px-8 py-3 rounded-full border border-white/20 bg-white/5 text-sm font-semibold hover:bg-white/10 transition flex items-center justify-center gap-2"
                >
                  How It Works <ChevronDown size={16} />
                </motion.button>
              </motion.div>

              {/* Features */}
              <motion.div
                variants={fadeUp(0.5)}
                className="flex flex-col gap-3 pt-4"
              >
                {[
                  '✨ Free to create & share moments',
                  '💬 WhatsApp-native experience',
                  '🔒 Encrypted hidden messages',
                  '📱 Perfect for Gen Z emotions',
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
            <motion.div variants={slideInRight(0.2)} className="relative h-96 sm:h-full min-h-96">
              <div className="relative w-full h-full">
                {[
                  {
                    step: 1,
                    emoji: '💬',
                    title: 'Send Teaser',
                    text: '"There\'s something I\'ve been wanting to tell you..."',
                    color: 'from-purple-500/20 to-purple-600/20',
                    border: 'border-purple-400/40',
                    delay: 0,
                  },
                  {
                    step: 2,
                    emoji: '💭',
                    title: 'They Reply',
                    text: '"Okay, now I\'m curious. What is it?"',
                    color: 'from-pink-500/20 to-pink-600/20',
                    border: 'border-pink-400/40',
                    delay: 0.1,
                  },
                  {
                    step: 3,
                    emoji: '🔓',
                    title: 'Reveal Truth',
                    text: '"I care about you more than I show..."',
                    color: 'from-cyan-500/20 to-cyan-600/20',
                    border: 'border-cyan-400/40',
                    delay: 0.2,
                  },
                ].map((card, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 40, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3 + card.delay, duration: 0.6 }}
                    className={`absolute w-full sm:w-80 p-5 rounded-2xl border ${card.border} bg-gradient-to-br ${card.color} backdrop-blur-xl shadow-2xl hover:shadow-3xl transition-all duration-300`}
                    style={{
                      top: `${i * 120}px`,
                      right: `${i * 20}px`,
                      zIndex: i,
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg">{card.emoji}</span>
                      <span className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-[10px] font-bold">
                        Step {card.step}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-200 text-xs mb-1">{card.title}</p>
                    <p className="text-sm font-medium text-white mb-2">{card.text}</p>
                    <p className="text-xs text-slate-300">
                      {i === 0 && 'Free to send. They get notified immediately.'}
                      {i === 1 && 'Genuine replies unlock your hidden message.'}
                      {i === 2 && 'Your truth. Their choice to unlock.'}
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
                How <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">RANIA</span> Works
              </h2>
              <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto">
                Five simple steps to share authentic emotions and build deeper connections through honest conversations.
              </p>
            </motion.div>

            {/* Steps Grid */}
            <motion.div
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
            >
              {[
                {
                  num: '1',
                  icon: <MessageCircle size={24} />,
                  title: 'Create Your Teaser',
                  desc: 'Write a captivating message that hints at your feelings without revealing everything.',
                },
                {
                  num: '2',
                  icon: <Heart size={24} />,
                  title: 'They Reply Honestly',
                  desc: 'Share your link on WhatsApp. They respond authentically and unlock your full message.',
                },
                {
                  num: '3',
                  icon: <Lock size={24} />,
                  title: 'Reveal Your Truth',
                  desc: 'After seeing their reply, write and share your complete hidden message with them.',
                },
                {
                  num: '4',
                  icon: <Sparkles size={24} />,
                  title: 'They React & Connect',
                  desc: 'They see the full truth, react with honesty, and deepens your emotional connection.',
                },
                {
                  num: '5',
                  icon: <MessageCircle size={24} />,
                  title: 'Keep the Memory',
                  desc: 'Download beautiful shareable cards to remember and celebrate these authentic moments.',
                },
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

                  <div className="text-purple-400 mb-3">{step.icon}</div>
                  <div className="text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-2">
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

      {/* FEATURES SECTION */}
      <section className="w-full py-24 border-t border-white/5">
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
                Real Moments, Real Emotions
              </h2>
              <p className="text-slate-300 text-sm sm:text-base">
                RANIA empowers authentic emotional expression and meaningful connections
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {[
                {
                  tag: '💕 Crush Reveal',
                  teaser: '"I laugh a little too hard at your jokes..."',
                  hidden: '"I\'ve had a crush on you for months. You mean more to me than you know."',
                  desc: 'Perfect for those moments when you need to confess romantic feelings honestly.',
                },
                {
                  tag: '👯 Bestie Truth',
                  teaser: '"There\'s something about our friendship I\'ve never said..."',
                  hidden: '"You\'ve held me down in ways I never acknowledged. I\'m truly grateful for you."',
                  desc: 'Strengthen friendships by sharing authentic appreciation and vulnerability.',
                },
                {
                  tag: '🎭 Deep Confession',
                  teaser: '"I need to be honest about something..."',
                  hidden: '"I\'ve been struggling but never wanted to burden you with it."',
                  desc: 'Share personal struggles and build deeper emotional understanding.',
                },
                {
                  tag: '🤝 Forgive Me',
                  teaser: '"I owe you a real apology..."',
                  hidden: '"I was wrong. I\'m sorry and want to make things right between us."',
                  desc: 'Take accountability and heal relationships through genuine communication.',
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
                    <span className="text-xs font-bold text-pink-300 uppercase tracking-wider">
                      {ex.tag}
                    </span>
                  </div>

                  <div className="space-y-2 border-l-2 border-pink-400/30 pl-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-300">Teaser</p>
                      <p className="text-sm text-slate-300 italic">{ex.teaser}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-300">Hidden Truth</p>
                      <p className="text-sm text-slate-300 italic">{ex.hidden}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 pt-2">{ex.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

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
                  Ready to share your truth?
                </h2>
                <p className="text-sm text-slate-900/80 max-w-md">
                  Create your first emotional moment. Free. Authentic. Real.
                </p>
              </div>

              <Link
                href="/moments/create"
                className="px-8 py-3.5 rounded-full bg-slate-950 text-white font-bold text-sm hover:bg-slate-800 transition whitespace-nowrap hover:scale-105 duration-300"
              >
                Start Now →
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full border-t border-white/10 py-8 text-center text-xs sm:text-sm text-slate-400">
        <p>© {new Date().getFullYear()} RANIA · Share truth, build connections.</p>
      </footer>
    </div>
  );
}