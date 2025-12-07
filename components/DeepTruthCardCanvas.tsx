"use client";

import { useEffect, useRef, useState } from "react";

type DeepTruthCardCanvasProps = {
  teaser: string;
  hiddenText: string;
  deepTruth: string;
  shareUrl: string;
};

export function DeepTruthCardCanvas({
  teaser,
  hiddenText,
  deepTruth,
  shareUrl,
}: DeepTruthCardCanvasProps) {
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
    // PREMIUM GRADIENT BACKGROUND
    // -------------------------
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#0f172a"); // slate-950
    bg.addColorStop(0.2, "#5b21b6"); // violet-900
    bg.addColorStop(0.5, "#1e1b4b"); // indigo-950
    bg.addColorStop(0.8, "#0c4a6e"); // sky-950
    bg.addColorStop(1, "#0f172a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Subtle texture
    ctx.fillStyle = "rgba(255,255,255,0.015)";
    for (let i = 0; i < 400; i++) {
      ctx.fillRect(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 2.5,
        Math.random() * 2.5
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
    // HEADER WITH GLOW
    // -------------------------
    const headerGradient = ctx.createLinearGradient(0, 0, width, 260);
    headerGradient.addColorStop(0, "rgba(168, 85, 247, 0.15)");
    headerGradient.addColorStop(0.5, "rgba(6, 182, 212, 0.08)");
    headerGradient.addColorStop(1, "rgba(34, 197, 94, 0.05)");
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, width, 260);

    // Premium Badge
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(60, 50, 320, 70, 24);
    ctx.fill();

    ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    const badgeGradient = ctx.createLinearGradient(60, 50, 380, 50);
    badgeGradient.addColorStop(0, "#a855f7");
    badgeGradient.addColorStop(0.5, "#06b6d4");
    badgeGradient.addColorStop(1, "#22c55e");
    ctx.fillStyle = badgeGradient;
    ctx.fillText("🔬 DEEP TRUTH", 80, 110);

    // Subtitle
    ctx.font = "18px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("AI Emotional Breakdown", 60, 160);

    // -------------------------
    // MAIN CARD
    // -------------------------
    const cardX = 50;
    const cardY = 280;
    const cardW = width - 100;
    const cardH = height - 420;

    // Card background
    ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
    roundRect(cardX, cardY, cardW, cardH, 36);
    ctx.fill();

    // Premium border with multiple colors
    const borderGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGradient.addColorStop(0, "rgba(168, 85, 247, 0.5)");
    borderGradient.addColorStop(0.33, "rgba(6, 182, 212, 0.3)");
    borderGradient.addColorStop(0.66, "rgba(34, 197, 94, 0.2)");
    borderGradient.addColorStop(1, "rgba(168, 85, 247, 0.4)");
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 2.5;
    roundRect(cardX, cardY, cardW, cardH, 36);
    ctx.stroke();

    const innerX = cardX + 50;
    const innerW = cardW - 100;
    let curY = cardY + 50;

    // -------------------------
    // SECTION RENDERER
    // -------------------------
    const drawSection = (title: string, content: string, emoji: string, isBold = false) => {
      // Title
      ctx.font = `bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      const titleGradient = ctx.createLinearGradient(innerX, curY - 20, innerX + innerW, curY - 20);
      titleGradient.addColorStop(0, "#a855f7");
      titleGradient.addColorStop(0.5, "#06b6d4");
      titleGradient.addColorStop(1, "#22c55e");
      ctx.fillStyle = titleGradient;
      ctx.fillText(`${emoji} ${title}`, innerX, curY);
      curY += 38;

      // Gradient line
      const lineGradient = ctx.createLinearGradient(innerX, curY, innerX + innerW, curY);
      lineGradient.addColorStop(0, "rgba(168, 85, 247, 0.4)");
      lineGradient.addColorStop(0.5, "rgba(6, 182, 212, 0.35)");
      lineGradient.addColorStop(1, "rgba(34, 197, 94, 0)");
      ctx.strokeStyle = lineGradient;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(innerX, curY);
      ctx.lineTo(innerX + innerW, curY);
      ctx.stroke();
      curY += 28;

      // Content
      ctx.font = isBold ? "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" : "22px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      const color = isBold ? "#22c55e" : "rgba(255,255,255,0.95)";
      curY = drawWrappedText(content, innerX, curY, innerW, 34, color);
      curY += 45;

      return curY;
    };

    // Draw all sections
    curY = drawSection("Teaser", teaser, "💬");
    curY = drawSection("Hidden Truth", hiddenText, "🔒");
    curY = drawSection("Deep Breakdown", deepTruth, "🔬", true);

    // -------------------------
    // FOOTER
    // -------------------------
    const footerY = cardY + cardH - 90;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText("rania.online • emotional intelligence engine", innerX, footerY);

    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(shareUrl, innerX, footerY + 26);

    // -------------------------
    // PREMIUM WATERMARK
    // -------------------------
    ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    const watermarkGradient = ctx.createLinearGradient(0, height - 60, width, height - 60);
    watermarkGradient.addColorStop(0, "#a855f7");
    watermarkGradient.addColorStop(0.33, "#06b6d4");
    watermarkGradient.addColorStop(0.66, "#22c55e");
    watermarkGradient.addColorStop(1, "#a855f7");
    ctx.fillStyle = watermarkGradient;
    ctx.textAlign = "center";
    ctx.fillText("✨ RANIA Deep Truth Analysis", width / 2, height - 25);
    ctx.textAlign = "left";
  }, [teaser, hiddenText, deepTruth, shareUrl]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setDownloading(true);

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `rania-deep-truth-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-400/30 bg-slate-950/40 p-3 backdrop-blur-sm">
        <canvas
          ref={canvasRef}
          className="w-full h-auto rounded-xl border border-emerald-400/20"
        />
      </div>

      <button
        type="button"
        onClick={handleDownload}
        className="w-full rounded-full bg-gradient-to-r from-purple-600 via-cyan-500 to-emerald-500 px-4 py-3 text-sm font-bold text-white hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-60"
        disabled={downloading}
      >
        {downloading ? "✨ Preparing card…" : "📥 Download Deep Truth Card"}
      </button>
    </div>
  );
}