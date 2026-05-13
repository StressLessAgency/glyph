import sharp from "sharp";
import { statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = join(__dirname, "..", "public");

const SRC = join(PUB, "hero-stained.jpg");
const targets = [
  { out: "hero-stained.avif", format: "avif", quality: 55, effort: 6 },
  { out: "hero-stained.webp", format: "webp", quality: 78, effort: 6 },
  { out: "hero-stained.opt.jpg", format: "jpeg", quality: 78, mozjpeg: true },
];

const srcSize = statSync(SRC).size;
console.log(`Source: ${(srcSize / 1024 / 1024).toFixed(2)} MB`);

// Resize to max width 2400 (was probably larger) for retina screens at most.
const pipeline = sharp(SRC).resize({ width: 2400, withoutEnlargement: true });

for (const t of targets) {
  let out = pipeline.clone();
  if (t.format === "avif") out = out.avif({ quality: t.quality, effort: t.effort });
  else if (t.format === "webp") out = out.webp({ quality: t.quality, effort: t.effort });
  else out = out.jpeg({ quality: t.quality, mozjpeg: t.mozjpeg });
  await out.toFile(join(PUB, t.out));
  const size = statSync(join(PUB, t.out)).size;
  const pct = ((1 - size / srcSize) * 100).toFixed(1);
  console.log(
    `${t.out.padEnd(28)} ${(size / 1024).toFixed(1).padStart(8)} KB  (-${pct}%)`
  );
}
