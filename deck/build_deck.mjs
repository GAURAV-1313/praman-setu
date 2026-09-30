import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

const SRC = process.argv[2];      // deck_export dir (project/, blobs/)
const OUT = process.argv[3];      // repo deck/ dir
const deck = JSON.parse(fs.readFileSync(`${SRC}/project/deck.json`, "utf8"));
const fontLinks = Object.values(deck.faces).map((f) => `<link rel="stylesheet" href="${f.href}">`).join("\n");
const BASE = `*{margin:0;padding:0;box-sizing:border-box}h1,h2,h3,p{font-weight:inherit}b{font-weight:700}table{border-collapse:collapse;width:100%}td,th{padding:0.35em 0.6em;border-bottom:1px solid #d8d0c0;vertical-align:top;text-align:left}th{font-weight:600}section{position:relative;width:1920px;height:1080px;overflow:hidden}`;

fs.mkdirSync(`${OUT}/slides`, { recursive: true });
fs.mkdirSync(`${OUT}/images`, { recursive: true });
fs.mkdirSync(`${OUT}/png`, { recursive: true });
for (const f of fs.readdirSync(`${SRC}/blobs`)) fs.copyFileSync(`${SRC}/blobs/${f}`, `${OUT}/images/${f}`);

const slides = deck.order.map((id) => {
  const html = fs.readFileSync(`${SRC}/project/slides/${id}.html`, "utf8").replace(/\/_blob\/([0-9a-f]{32})/g, "../images/$1.png");
  fs.writeFileSync(`${OUT}/slides/${id}.html`, html);
  return { id, html };
});
const deckOut = { ...deck, attachments: undefined };
fs.writeFileSync(`${OUT}/deck.json`, JSON.stringify(deckOut, null, 2));

// index.html: every slide scaled to the window, speaker notes under each
const body = slides.map(({ id, html }, i) => {
  const note = (html.match(/<aside>([\s\S]*?)<\/aside>/) || [, ""])[1];
  const clean = html.replace(/<aside>[\s\S]*?<\/aside>/, "").replace(/\.\.\/images\//g, "images/");
  return `<div class="frame" id="s${i + 1}"><div class="stage">${clean}</div></div>${note ? `<p class="note"><b>${i + 1} · ${id}</b> — ${note}</p>` : ""}`;
}).join("\n");
fs.writeFileSync(`${OUT}/index.html`, `<!doctype html><html lang="hi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Praman Setu deck</title>${fontLinks}
<style>${BASE} body{background:#2b2b2b;padding:24px 16px;font-family:Mukta,Arial,sans-serif} .frame{width:min(1280px,100%);aspect-ratio:16/9;margin:0 auto 8px;position:relative;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.4)} .stage{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0} .note{width:min(1280px,100%);margin:0 auto 40px;color:#ddd;font-size:15px;line-height:1.5}</style></head>
<body>${body}<script>function fit(){document.querySelectorAll('.frame').forEach(f=>{f.firstElementChild.style.transform='scale('+f.clientWidth/1920+')'})}addEventListener('resize',fit);fit();</script></body></html>`);

// PNG per slide + one PDF
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
const all = [];
for (const [i, { id, html }] of slides.entries()) {
  const clean = html.replace(/<aside>[\s\S]*?<\/aside>/, "").replace(/\.\.\/images\/([0-9a-f]{32}\.png)/g, (m, f) => "file://" + path.resolve(`${OUT}/images/${f}`));
  const doc = `<!doctype html><html><head><meta charset="utf-8">${fontLinks}<style>${BASE} body{width:1920px;height:1080px}</style></head><body>${clean}</body></html>`;
  const tmp = path.resolve(`${OUT}/.tmp_${id}.html`);
  fs.writeFileSync(tmp, doc);
  await page.goto("file://" + tmp, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/png/${String(i + 1).padStart(2, "0")}_${id}.png` });
  fs.unlinkSync(tmp);
  all.push(clean);
}
const pdfDoc = `<!doctype html><html><head><meta charset="utf-8">${fontLinks}<style>${BASE} @page{size:1920px 1080px;margin:0} section{page-break-after:always}</style></head><body>${all.join("\n")}</body></html>`;
const tmp = path.resolve(`${OUT}/.tmp_pdf.html`);
fs.writeFileSync(tmp, pdfDoc);
await page.goto("file://" + tmp, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);
await page.pdf({ path: `${OUT}/Praman_Setu_deck.pdf`, width: "1920px", height: "1080px", printBackground: true });
fs.unlinkSync(tmp);
await b.close();
console.log("slides", slides.length);
