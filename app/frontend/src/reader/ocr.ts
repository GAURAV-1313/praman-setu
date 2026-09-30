/**
 * Round 8c — in-browser OCR (tesseract.js) and QR decoding (jsQR). Everything is served from this app's own
 * origin: worker (/tesseract/worker.min.js), WASM core (/tesseract/*.wasm.js) and language data
 * (/tessdata/{eng,hin}.traineddata). No CDN, no upload — the image never leaves the machine.
 */
import { createWorker, type Worker } from "tesseract.js";
import jsQR from "jsqr";
import type { OcrWord } from "./extract";

export interface OcrProgress { status: string; progress: number }
let workerP: Promise<Worker> | null = null;
let listener: ((p: OcrProgress) => void) | null = null;
export let engineReadyMs: number | null = null;

export function getWorker(onProgress?: (p: OcrProgress) => void): Promise<Worker> {
  if (onProgress) listener = onProgress;
  if (!workerP) {
    const t0 = performance.now();
    const origin = window.location.origin;
    // English first: research (and our tests) found Hindi-first garbles the digits in certificate numbers and dates
    workerP = createWorker(["eng", "hin"], 1, {
      workerPath: `${origin}/tesseract/worker.min.js`,
      corePath: `${origin}/tesseract`,
      langPath: `${origin}/tessdata`,
      gzip: false,
      logger: (m: { status: string; progress: number }) => listener?.({ status: m.status, progress: m.progress }),
    }).then((w) => {
      engineReadyMs = Math.round(performance.now() - t0);
      return w;
    });
    workerP.catch(() => {
      workerP = null;
    });
  }
  return workerP;
}

export interface OcrResult { text: string; confidence: number; words: OcrWord[]; ms: number }

export async function ocr(img: HTMLImageElement | HTMLCanvasElement, onProgress?: (p: OcrProgress) => void): Promise<OcrResult> {
  const w = await getWorker(onProgress);
  if (onProgress) listener = onProgress;
  const t0 = performance.now();
  const r = await w.recognize(img, {}, { text: true, blocks: true });
  const words: OcrWord[] = [];
  for (const b of r.data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) for (const wd of l.words) words.push({ text: wd.text, confidence: wd.confidence });
  return { text: r.data.text, confidence: r.data.confidence, words, ms: Math.round(performance.now() - t0) };
}

/** Decode a QR code anywhere on the page image (downscaled to ≤ 1600 px for speed). */
export function decodeQr(img: HTMLImageElement): string | null {
  const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h);
  const q = jsQR(d.data, w, h, { inversionAttempts: "attemptBoth" });
  return q?.data ?? null;
}

/** 64-bit perceptual hash (pHash, as in Python's imagehash): 32×32 greyscale → 2-D DCT → top-left 8×8 low
 *  frequencies → 1 bit per "above the median". A rescan or tilted phone photo of the same paper stays within a few
 *  bits (synthetic aff.png vs aff_noisy.jpg: 4). Only this 16-hex-digit string is ever sent — never the image. */
export function phash(img: HTMLImageElement): string {
  const N = 32, S = 8; // draw at 256×256, then average 8×8 blocks → 32×32
  const c = document.createElement("canvas");
  c.width = N * S;
  c.height = N * S;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, N * S, N * S);
  const d = ctx.getImageData(0, 0, N * S, N * S).data;
  const a: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
  for (let y = 0; y < N * S; y++)
    for (let x = 0; x < N * S; x++) {
      const i = (y * N * S + x) * 4;
      a[Math.floor(y / S)][Math.floor(x / S)] += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / (S * S);
    }
  // separable DCT-II, keeping the first 8 coefficients per axis
  const cos = Array.from({ length: 8 }, (_, k) => Array.from({ length: N }, (_, n) => Math.cos((Math.PI * (2 * n + 1) * k) / (2 * N))));
  const rows = a.map((r) => cos.map((ck) => r.reduce((s, v, n) => s + v * ck[n], 0))); // N × 8
  const dct: number[] = [];
  for (let ky = 0; ky < 8; ky++) for (let kx = 0; kx < 8; kx++) dct.push(rows.reduce((s, r, n) => s + r[kx] * cos[ky][n], 0));
  const med = [...dct].sort((x, y) => x - y);
  const m = (med[31] + med[32]) / 2;
  let hex = "";
  for (let b = 0; b < 64; b += 4) hex += ((dct[b] > m ? 8 : 0) | (dct[b + 1] > m ? 4 : 0) | (dct[b + 2] > m ? 2 : 0) | (dct[b + 3] > m ? 1 : 0)).toString(16);
  return hex;
}
