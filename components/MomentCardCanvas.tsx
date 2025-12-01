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

    // -------------------------
    // RANIA BACKGROUND GRADIENT
    // -------------------------
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "#0f0a1f");
    bg.addColorStop(0.25, "#3b0a65");
    bg.addColorStop(0.55, "#b90073");
    bg.addColorStop(0.85, "#00c3ff");
    bg.addColorStop(1, "#0f0a1f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

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
      lineHeight: number
    ) => {
      const words = text.split(" ");
      let line = "";
      let curY = y;

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
    // TOP TAG
    // -------------------------
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(32, 40, 190, 40, 18);
    ctx.fill();

    const tagG = ctx.createLinearGradient(32, 0, 200, 0);
    tagG.addColorStop(0, "#a855f7");
    tagG.addColorStop(0.5, "#ec4899");
    tagG.addColorStop(1, "#22d3ee");

    ctx.font = "bold 18px system-ui";
    ctx.fillStyle = tagG;
    ctx.fillText("RANIA Moment", 48, 67);

    // -------------------------
    // CARD (Glass)
    // -------------------------
    const cardX = 32;
    const cardY = 100;
    const cardW = width - 64;
    const cardH = height - 220;

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(cardX, cardY, cardW, cardH, 26);
    ctx.fill();

    const innerX = cardX + 28;
    const innerW = cardW - 56;

    let curY = cardY + 60;

    // Helper for gradient section titles
    const setTitleGradient = () => {
      const g = ctx.createLinearGradient(innerX, 0, innerX + innerW, 0);
      g.addColorStop(0, "#a855f7");
      g.addColorStop(0.4, "#ec4899");
      g.addColorStop(1, "#22d3ee");
      ctx.fillStyle = g;
    };

    // -------------------------
    // TEASER

    ctx.font = "bold 22px system-ui";
    setTitleGradient();
    ctx.fillText("Teaser", innerX, curY);

    curY += 34;
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(innerX, curY);
    ctx.lineTo(innerX + innerW, curY);
    ctx.stroke();
    curY += 28;

    ctx.font = "18px system-ui";
    ctx.fillStyle = "white";
    curY = drawWrappedText(teaser, innerX, curY, innerW, 26);

    curY += 40;

    // -------------------------
    // HIDDEN TRUTH
    // -------------------------
    ctx.font = "bold 22px system-ui";
    setTitleGradient();
    ctx.fillText("Hidden Truth", innerX, curY);

    curY += 34;
    ctx.beginPath();
    ctx.moveTo(innerX, curY);
    ctx.lineTo(innerX + innerW, curY);
    ctx.stroke();
    curY += 28;

    ctx.font = "18px system-ui";
    ctx.fillStyle = "white";
    curY = drawWrappedText(hiddenText, innerX, curY, innerW, 26);

    curY += 40;

    // -------------------------
    // THEIR REPLY
    // -------------------------
    ctx.font = "bold 22px system-ui";
    setTitleGradient();
    ctx.fillText("Their Reply", innerX, curY);

    curY += 34;
    ctx.beginPath();
    ctx.moveTo(innerX, curY);
    ctx.lineTo(innerX + innerW, curY);
    ctx.stroke();
    curY += 28;

    ctx.font = "18px system-ui";
    ctx.fillStyle = "#e0f7ff";
    curY = drawWrappedText(replyText, innerX, curY, innerW, 26);

    // -------------------------
    // FOOTER INSIDE CARD
    // -------------------------
    const footerY = cardY + cardH - 50;
    ctx.font = "12px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("RANIA · emotional truth engine", innerX, footerY);
    ctx.fillText(shareUrl, innerX, footerY + 18);

    // -------------------------
    // BOTTOM FOOTER
    // -------------------------
    ctx.font = "11px system-ui";
    setTitleGradient();
    ctx.fillText("Generated with RANIA Deep Truth", 32, height - 34);
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
        className="rounded-full border border-pink-400/60 px-3 py-1 text-[11px] text-pink-300 hover:bg-pink-400/10 disabled:opacity-60"
        disabled={downloading}
      >
        {downloading ? "Preparing card…" : "Download moment card (PNG)"}
      </button>
    </div>
  );
}
