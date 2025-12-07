"use client";

import { useEffect, useRef, useState } from "react";

type MomentCardCanvasProps = {
  teaser: string;
  hiddenText: string;
  replyText: string;
  shareUrl: string;
};

export function MomentCardCanvas({
  teaser,
  hiddenText,
  replyText,
  shareUrl,
}: MomentCardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = 1080;
    const height = 1440;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // -------------------------
    // MODERN GRADIENT BACKGROUND
    // -------------------------
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#0f172a"); // slate-950
    bg.addColorStop(0.35, "#4c1d95"); // purple-950
    bg.addColorStop(0.65, "#1e1b4b"); // indigo-950
    bg.addColorStop(1, "#0f172a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Add subtle animated grain/noise effect
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    for (let i = 0; i < 300; i++) {
      ctx.fillRect(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 2,
        Math.random() * 2
      );
    }

    // Rounded rectangle helper
    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    // Text wrapping helper
    const drawWrappedText = (
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      lineHeight: number,
      fontColor: string
    ) => {
      const words = text.split(" ");
      let line = "";
      let curY = y;
      ctx.fillStyle = fontColor;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, x, curY);
          line = words[n] + " ";
          curY += lineHeight;
        } else {
          line = testLine;
        }
      }

      ctx.fillText(line, x, curY);
      return curY + lineHeight;
    };

    // -------------------------
    // TOP HEADER
    // -------------------------
    const headerGradient = ctx.createLinearGradient(0, 0, width, 200);
    headerGradient.addColorStop(0, "rgba(168, 85, 247, 0.1)");
    headerGradient.addColorStop(0.5, "rgba(6, 182, 212, 0.05)");
    headerGradient.addColorStop(1, "rgba(168, 85, 247, 0.05)");
    ctx.fillStyle = headerGradient;
    roundRect(0, 0, width, 240, 0);
    ctx.fill();

    // RANIA Logo/Badge
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(60, 50, 280, 60, 20);
    ctx.fill();

    // Gradient text for RANIA
    ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    const logoGradient = ctx.createLinearGradient(60, 50, 340, 50);
    logoGradient.addColorStop(0, "#a855f7");
    logoGradient.addColorStop(0.5, "#06b6d4");
    logoGradient.addColorStop(1, "#a855f7");
    ctx.fillStyle = logoGradient;
    ctx.fillText("✨ RANIA", 80, 100);

    // Header text
    ctx.font = "28px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText("Emotional Truth Moment", 60, 160);

    // -------------------------
    // MAIN CARD CONTAINER
    // -------------------------
    const cardX = 50;
    const cardY = 260;
    const cardW = width - 100;
    const cardH = height - 400;

    // Card background with glass effect
    ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
    roundRect(cardX, cardY, cardW, cardH, 32);
    ctx.fill();

    // Card border gradient
    const borderGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGradient.addColorStop(0, "rgba(168, 85, 247, 0.4)");
    borderGradient.addColorStop(0.5, "rgba(6, 182, 212, 0.2)");
    borderGradient.addColorStop(1, "rgba(168, 85, 247, 0.3)");
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 2;
    roundRect(cardX, cardY, cardW, cardH, 32);
    ctx.stroke();

    const innerX = cardX + 50;
    const innerW = cardW - 100;
    let curY = cardY + 60;

    // -------------------------
    // SECTION HELPER
    // -------------------------
    const drawSection = (title: string, content: string, emoji: string, isHighlight = false) => {
      // Section title with emoji
      ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      const sectionGradient = ctx.createLinearGradient(innerX, curY - 20, innerX + innerW, curY - 20);
      sectionGradient.addColorStop(0, "#a855f7");
      sectionGradient.addColorStop(0.5, "#06b6d4");
      sectionGradient.addColorStop(1, "#a855f7");
      ctx.fillStyle = sectionGradient;
      ctx.fillText(`${emoji} ${title}`, innerX, curY);
      curY += 40;

      // Divider line
      const lineGradient = ctx.createLinearGradient(innerX, curY, innerX + innerW, curY);
      lineGradient.addColorStop(0, "rgba(168, 85, 247, 0.3)");
      lineGradient.addColorStop(0.5, "rgba(6, 182, 212, 0.3)");
      lineGradient.addColorStop(1, "rgba(168, 85, 247, 0)");
      ctx.strokeStyle = lineGradient;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(innerX, curY);
      ctx.lineTo(innerX + innerW, curY);
      ctx.stroke();
      curY += 28;

      // Content
      ctx.font = "22px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      const contentColor = isHighlight ? "#06b6d4" : "rgba(255,255,255,0.95)";
      curY = drawWrappedText(content, innerX, curY, innerW, 34, contentColor);
      curY += 50;

      return curY;
    };

    // Draw sections
    curY = drawSection("Teaser", teaser, "💬");
    curY = drawSection("Hidden Truth", hiddenText, "🔒");
    curY = drawSection("Their Reply", replyText, "💭", true);

    // -------------------------
    // FOOTER SECTION
    // -------------------------
    const footerY = cardY + cardH - 80;
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText("rania.online • authentic emotional connections", innerX, footerY);

    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(shareUrl, innerX, footerY + 28);

    // -------------------------
    // BOTTOM WATERMARK
    // -------------------------
    ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    const watermarkGradient = ctx.createLinearGradient(0, height - 60, width, height - 60);
    watermarkGradient.addColorStop(0, "#a855f7");
    watermarkGradient.addColorStop(0.5, "#06b6d4");
    watermarkGradient.addColorStop(1, "#a855f7");
    ctx.fillStyle = watermarkGradient;
    ctx.textAlign = "center";
    ctx.fillText("✨ Generated with RANIA", width / 2, height - 30);
    ctx.textAlign = "left";
  }, [teaser, hiddenText, replyText, shareUrl]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setDownloading(true);

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `rania-moment-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-purple-400/30 bg-slate-950/40 p-3 backdrop-blur-sm">
        <canvas
          ref={canvasRef}
          className="w-full h-auto rounded-xl border border-purple-400/20"
        />
      </div>

      <button
        type="button"
        onClick={handleDownload}
        className="w-full rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-3 text-sm font-bold text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-60"
        disabled={downloading}
      >
        {downloading ? "✨ Preparing card…" : "📥 Download Moment Card"}
      </button>
    </div>
  );
}