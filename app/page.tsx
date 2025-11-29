// app/page.tsx
export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        RANIA · Emotional Truth Engine
      </h1>
      <p className="text-sm text-white/70">
        Send emotional moments that force a reply, unlock deeper truth, and turn into
        shareable mini-stories on WhatsApp. No fluff. No fake activity.
      </p>
      <a
        href="/moments/create"
        className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-emerald-500 text-sm font-medium hover:bg-emerald-400 transition shadow-md shadow-emerald-500/30"
      >
        Start a new moment
      </a>
      <p className="text-xs text-white/40">
        Design for Kenyan & East African Gen Z. Focused on honesty, not gossip.
      </p>
    </div>
  );
}
