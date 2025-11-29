// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RANIA",
  description: "WhatsApp-first emotional truth engine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#050816] text-gray-100">
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-white/10">
            <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="font-semibold tracking-tight text-lg">
                RANIA <span className="text-sm text-emerald-400">beta</span>
              </div>
              <a
                href="/moments/create"
                className="text-xs px-3 py-1 rounded-full border border-emerald-400 text-emerald-300 hover:bg-emerald-400/10 transition"
              >
                New moment
              </a>
            </div>
          </header>
          <main className="flex-1">
            <div className="max-w-xl mx-auto px-4 py-6">{children}</div>
          </main>
          <footer className="border-t border-white/5 text-[11px] text-center text-white/40 py-3">
            RANIA · WhatsApp emotional threads · Nairobi
          </footer>
        </div>
      </body>
    </html>
  );
}
