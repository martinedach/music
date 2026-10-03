"use client";

import { useEffect, useState } from "react";

/**
 * Picks a warm, saturated average colour from a cover image and returns it as
 * an `hsl()` string, or null when there is no cover or it can't be read
 * (for example a host without CORS headers).
 */
export function useDominantColor(url: string | null): string | null {
  const [colour, setColour] = useState<string | null>(null);

  useEffect(() => {
    setColour(null);
    if (!url) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 24;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const g = canvas.getContext("2d", { willReadFrequently: true });
        if (!g) return;
        g.drawImage(img, 0, 0, size, size);
        const { data } = g.getImageData(0, 0, size, size);
        let r = 0, gg = 0, b = 0, w = 0;
        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i], pg = data[i + 1], pb = data[i + 2];
          const max = Math.max(pr, pg, pb), min = Math.min(pr, pg, pb);
          const sat = max === 0 ? 0 : (max - min) / max;
          const weight = 0.15 + sat; // favour the colourful pixels
          r += pr * weight;
          gg += pg * weight;
          b += pb * weight;
          w += weight;
        }
        if (!w) return;
        setColour(toHsl(r / w, gg / w, b / w));
      } catch {
        // Tainted canvas or decode failure: keep the default palette.
      }
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);

  return colour;
}

function toHsl(r: number, g: number, b: number): string {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  // Keep it usable as an accent: reasonably saturated, mid lightness.
  const sat = Math.round(Math.min(85, Math.max(35, s * 100 + 15)));
  const light = Math.round(Math.min(58, Math.max(36, l * 100)));
  return `hsl(${Math.round(h)} ${sat}% ${light}%)`;
}
