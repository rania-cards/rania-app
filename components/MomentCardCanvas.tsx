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

    const width = 720;
    const height = 1280;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#020617"); // slate-950
    gradient.addColorStop(0.4, "#0f172a"); // slate-900
    gradient.addColorStop(1, "#020617");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const roundRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      if (!ctx) return;
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

    const drawWrappedText = (
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      lineHeight: number
    ) => {
      if (!ctx) return y;

      const words = text.split(" ");
      let line = "";
      let curY = y;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, x, curY);
          line = words[n] + " ";
          curY += lineHeight;
        } else {
          line = testLine;
        }
      }
      if (line) {
        ctx.fillText(line, x, curY);
      }
      return curY + lineHeight;
    };

    // Top tag
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    roundRect(32, 40, 170, 38, 19);
    ctx.fill();
    ctx.font =
      "bold 16px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#a7f3d0";
    ctx.fillText("RANIA Moment", 48, 63);

    // Main card
    const cardX = 32;
    const cardY = 100;
    const cardW = width - 64;
    const cardH = height - 220;

    ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
    roundRect(cardX, cardY, cardW, cardH, 28);
    ctx.fill();

    const innerX = cardX + 28;
    const innerW = cardW - 56;
    let curY = cardY + 60;

    // Section: Teaser
    ctx.font =
      "bold 18px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#a7f3d0";
    ctx.fillText("Teaser", innerX, curY);
    curY += 10;
    ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(innerX, curY);
    ctx.lineTo(innerX + innerW, curY);
    ctx.stroke();
    curY += 24;

    ctx.font =
      "16px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#e5e7eb";
    curY = drawWrappedText(teaser, innerX, curY, innerW, 22);
    curY += 24;

    // Section: Hidden truth
    ctx.font =
      "bold 18px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#a7f3d0";
    ctx.fillText("Hidden truth", innerX, curY);
    curY += 10;
    ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
    ctx.beginPath();
    ctx.moveTo(innerX, curY);
    ctx.lineTo(innerX + innerW, curY);
    ctx.stroke();
    curY += 24;

    ctx.font =
      "16px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#e5e7eb";
    curY = drawWrappedText(hiddenText, innerX, curY, innerW, 22);
    curY += 24;

    // Section: Their reply
    ctx.font =
      "bold 18px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#facc15"; // amber-ish
    ctx.fillText("Their reply", innerX, curY);
    curY += 10;
    ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
    ctx.beginPath();
    ctx.moveTo(innerX, curY);
    ctx.lineTo(innerX + innerW, curY);
    ctx.stroke();
    curY += 24;

    ctx.font =
      "16px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#fef9c3";
    curY = drawWrappedText(replyText, innerX, curY, innerW, 22);

    // Footer inside card
    const footerY = cardY + cardH - 50;
    ctx.font =
      "12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
    ctx.fillText("RANIA · emotional truth engine", innerX, footerY);
    ctx.fillText(shareUrl, innerX, footerY + 18);

    // Bottom tag
    ctx.font =
      "11px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
    ctx.fillText("Generated after reply unlocked the truth", 32, height - 36);
  }, [teaser, hiddenText, replyText, shareUrl]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "rania-moment-unlocked.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-white/15 bg-black/40 p-2">
        <canvas
          ref={canvasRef}
          className="w-full h-auto rounded-lg border border-white/10"
        />
      </div>
      <button
        type="button"
        onClick={handleDownload}
        className="rounded-full border border-emerald-400/60 px-3 py-1 text-[11px] text-emerald-300 hover:bg-emerald-400/10 disabled:opacity-60"
        disabled={downloading}
      >
        {downloading ? "Preparing card…" : "Download moment card (PNG)"}
      </button>
    </div>
  );
}