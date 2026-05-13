"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  Pen,
  Camera,
  FileType2,
  Sparkles,
  Wand2,
  Layers,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/ui/magnetic";
import { Reveal } from "@/components/ui/reveal";
import { createFontProject } from "@/stores/font-store";
import { listFonts, saveFont } from "@/lib/db";
import type { FontProject } from "@/lib/font-types";
import { InkScribble } from "./ink-scribble";
import { ProcessReel } from "./process-reel";
import { StainedGlassHero } from "./stained-glass-hero";
import { fireRouteWipe } from "@/components/ui/route-wipe";

export function LandingHero() {
  const router = useRouter();
  const [fonts, setFonts] = useState<FontProject[]>([]);
  const [creating, setCreating] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    listFonts().then((fs) =>
      setFonts(fs.sort((a, b) => b.updatedAt - a.updatedAt))
    );
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const startNew = async () => {
    if (creating) return;
    setCreating(true);
    const f = createFontProject("Untitled font");
    await saveFont(f);
    fireRouteWipe(() => router.push(`/editor/${f.id}`));
  };

  return (
    <div className="relative w-full overflow-x-hidden bg-bg noise">
      <div aria-hidden className="pointer-events-none fixed inset-0 sunset opacity-90" />
      <StainedGlassHero />

      <header
        className={`sticky top-0 z-30 flex h-16 items-center justify-between px-6 sm:px-8 transition-all duration-300 ${
          scrolled
            ? "bg-bg/85 backdrop-blur-md border-b border-border"
            : "border-b border-transparent"
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-bg">
            <Pen className="h-3.5 w-3.5" />
          </span>
          <span className="font-serif italic text-[19px] tracking-tight">
            Glyph
          </span>
          <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
            v0.1
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <a href="#how">How</a>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href="#stack">Stack</a>
          </Button>
          <Magnetic strength={0.3}>
            <Button variant="accent" size="sm" onClick={startNew} disabled={creating}>
              Start a font
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Magnetic>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1180px] px-6 sm:px-8 pt-10 sm:pt-16">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex justify-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-fg-muted backdrop-blur">
            <Sparkles className="h-3 w-3 text-accent" />
            Designer-first font studio
          </div>
        </motion.div>

        {/* Kinetic headline */}
        <div className="mb-8 text-center">
          <h1 className="text-balance text-[44px] leading-[1.02] tracking-tight text-fg sm:text-[64px] md:text-[78px]">
            <KineticLine
              parts={[
                { text: "Draw" },
                { text: " your own" },
              ]}
              delay={0}
            />
            <br />
            <KineticLine
              parts={[
                { text: "typeface", italic: true },
                { text: " in" },
                { text: " an afternoon.", muted: true },
              ]}
              delay={0.18}
            />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-7 max-w-xl text-pretty text-[16px] sm:text-[17px] leading-relaxed text-fg-muted"
          >
            Sketch each letter, photograph your handwriting, or drop in SVGs.
            Glyph auto-handles baseline, spacing, and kerning — then exports a
            real OTF, TTF, or WOFF in one click.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Magnetic strength={0.4}>
              <Button
                size="lg"
                variant="accent"
                onClick={startNew}
                disabled={creating}
              >
                Start a new font
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Magnetic>
            <Magnetic strength={0.25}>
              <Button size="lg" variant="outline" asChild>
                <a href="#how">See how it works</a>
              </Button>
            </Magnetic>
          </motion.div>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
            No account · no upload · everything stays on your device
          </p>
        </div>

        {/* Interactive canvas */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-10 sm:mt-16"
        >
          <InkScribble />
          <div className="mt-3 flex items-center justify-between gap-4 font-mono text-[10.5px] uppercase tracking-[0.18em] text-fg-subtle">
            <span>Try it — your scribbles use the same engine as the editor</span>
            <span className="hidden sm:inline">perfect-freehand · opentype.js</span>
          </div>
        </motion.div>

        {/* Continued fonts */}
        {fonts.length > 0 && (
          <section className="mt-28">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
                Continue working
              </h2>
              <span className="font-mono text-[11px] text-fg-subtle">
                {fonts.length} saved
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {fonts.slice(0, 6).map((f) => (
                <Link
                  key={f.id}
                  href={`/editor/${f.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    fireRouteWipe(() => router.push(`/editor/${f.id}`));
                  }}
                  className="group flex items-center justify-between rounded-xl border border-border bg-bg p-4 transition hover:border-ink/40 hover:shadow-lift"
                >
                  <div className="flex flex-col">
                    <span className="text-[15px] font-medium text-fg">
                      {f.name || "Untitled"}
                    </span>
                    <span className="font-mono text-[11px] text-fg-subtle">
                      {countDrawn(f)} glyphs · {fmtAge(f.updatedAt)}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-fg" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* How it works */}
        <Reveal as="section" className="mt-32 sm:mt-44">
          <section id="how">
            <SectionHead
              eyebrow="The flow"
              title="Three ways to feed a glyph."
              kicker="Pick whichever matches your tools. Mix all three inside one font."
            />
            <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
              <FeatureCard
                icon={<Pen className="h-4 w-4" />}
                title="Draw on canvas"
                body="Pressure-sensitive strokes with grid-paper guidelines for baseline, x-height, cap-height. Works with Wacom, iPad, mouse."
                tag="01"
                accent="var(--color-amber)"
              />
              <FeatureCard
                icon={<Camera className="h-4 w-4" />}
                title="Photograph handwriting"
                body="Print the template, write the alphabet, snap a photo of each letter. Otsu threshold + contour trace turn it into vectors."
                tag="02"
                accent="var(--color-rust)"
              />
              <FeatureCard
                icon={<FileType2 className="h-4 w-4" />}
                title="Drop in SVGs"
                body="Already vectoring in Figma or Illustrator? Drag an SVG into any glyph cell — it's normalized into your font's baseline automatically."
                tag="03"
                accent="var(--color-deep-teal)"
              />
            </div>
          </section>
        </Reveal>

        {/* Process reel */}
        <Reveal as="section" className="mt-32 sm:mt-44">
          <SectionHead
            eyebrow="What Glyph handles"
            title="The boring parts, automated."
            kicker="Type designers spend weeks on metrics, spacing, kerning, and packaging. Glyph collapses each step into a single pass."
          />
          <div className="mt-12">
            <ProcessReel />
          </div>
        </Reveal>

        {/* Numbers */}
        <Reveal as="section" className="mt-32 sm:mt-44">
          <SectionHead eyebrow="In the box" title="Everything for a real Latin font." />
          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
            <Stat n="52" sub="A–Z · a–z" label="latin letters" color="var(--color-amber)" />
            <Stat n="10" sub="0–9" label="digits" color="var(--color-rust)" />
            <Stat n="21" sub=". , ! ? & @ …" label="punctuation" color="var(--color-fire)" />
            <Stat n="auto" sub="kerning · spacing" label="metrics" color="var(--color-deep-teal)" />
          </div>
        </Reveal>

        {/* Stack */}
        <div id="stack" />
        <Reveal as="section" className="mt-32 sm:mt-44">
          <SectionHead
            eyebrow="Under the hood"
            title="Honest engineering."
            kicker="No magic. Real font tables, real OpenType output. All in the browser."
          />
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StackRow
              icon={<Pen className="h-4 w-4" />}
              title="perfect-freehand"
              body="Pressure-aware stroke geometry tuned for handwriting."
            />
            <StackRow
              icon={<Layers className="h-4 w-4" />}
              title="opentype.js"
              body="Native SFNT assembler — emits real OTF tables (cmap, glyf, hmtx, kern)."
            />
            <StackRow
              icon={<Wand2 className="h-4 w-4" />}
              title="auto-metrics"
              body="Median-based baseline / x-height / cap-height detection across drawn glyphs."
            />
            <StackRow
              icon={<Download className="h-4 w-4" />}
              title="OTF · TTF · WOFF · WOFF2"
              body="One-click export. Install on macOS, ship on web."
            />
          </div>
        </Reveal>

        {/* Closing CTA */}
        <Reveal as="section" className="mt-32 sm:mt-44 mb-24">
          <div className="text-center">
            <h2 className="font-serif italic text-4xl sm:text-5xl tracking-tight text-fg">
              Your handwriting,
              <br />
              <span style={{ color: "var(--color-rust)" }}>made permanent.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-fg-muted">
              One afternoon. One font. Your name on the byline.
            </p>
            <div className="mt-8 inline-flex flex-col gap-2 sm:flex-row">
              <Magnetic strength={0.4}>
                <Button
                  size="lg"
                  variant="accent"
                  onClick={startNew}
                  disabled={creating}
                >
                  Start a new font
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Magnetic>
            </div>
          </div>
        </Reveal>
      </main>

      <footer className="relative z-10 border-t border-border bg-bg/60 px-6 sm:px-8 py-7">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between text-fg-subtle">
          <div className="flex items-center gap-3">
            <Pen className="h-3.5 w-3.5" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em]">
              Glyph · all work stays on your device
            </span>
          </div>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em]">
            built with Type · Sweat · Ink
          </span>
        </div>
      </footer>
    </div>
  );
}

function KineticLine({
  parts,
  delay = 0,
}: {
  parts: { text: string; italic?: boolean; muted?: boolean }[];
  delay?: number;
}) {
  const all = parts
    .map((p, pi) =>
      p.text.split("").map((c, ci) => ({
        c,
        italic: !!p.italic,
        muted: !!p.muted,
        key: `${pi}-${ci}`,
      }))
    )
    .flat();

  return (
    <span className="inline-block">
      {all.map((g, i) => (
        <motion.span
          key={g.key}
          initial={{ y: "0.55em", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: delay + i * 0.018,
            duration: 0.55,
            ease: [0.16, 1, 0.3, 1],
          }}
          className={`inline-block whitespace-pre ${g.italic ? "font-serif italic" : ""} ${g.muted ? "text-fg-muted" : ""}`}
        >
          {g.c === " " ? " " : g.c}
        </motion.span>
      ))}
    </span>
  );
}

function SectionHead({
  eyebrow,
  title,
  kicker,
}: {
  eyebrow: string;
  title: string;
  kicker?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
        {eyebrow}
      </span>
      <h2 className="max-w-2xl text-balance text-[34px] sm:text-[42px] leading-[1.05] tracking-tight text-fg">
        {title}
      </h2>
      {kicker && (
        <p className="max-w-xl text-pretty text-[15.5px] leading-relaxed text-fg-muted">
          {kicker}
        </p>
      )}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  tag,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tag: string;
  accent: string;
}) {
  return (
    <div
      className="group relative flex flex-col gap-5 overflow-hidden bg-bg p-7 transition hover:bg-surface/30"
      style={{ ["--card-accent" as string]: accent }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-50"
        style={{ background: accent }}
      />
      <div className="flex items-center justify-between">
        <div
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-fg transition-colors duration-300 group-hover:text-bg"
          style={{ background: undefined }}
        >
          <span
            className="absolute inset-0 -z-10"
            aria-hidden
            style={{ background: "transparent" }}
          />
          {icon}
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-fg-subtle">
          {tag}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        <h3 className="text-[17px] font-medium tracking-tight text-fg">
          {title}
        </h3>
        <p className="text-[13.5px] leading-relaxed text-fg-muted">{body}</p>
      </div>
      <div
        aria-hidden
        className="absolute bottom-0 left-0 h-[3px] w-0 transition-all duration-500 ease-out group-hover:w-full"
        style={{ background: accent }}
      />
    </div>
  );
}

function Stat({
  n,
  sub,
  label,
  color = "var(--color-fg)",
}: {
  n: string;
  sub?: string;
  label: string;
  color?: string;
}) {
  return (
    <div className="group relative flex flex-col items-center gap-1 bg-bg px-4 py-9 transition-colors hover:bg-surface/40">
      <span
        className="font-serif italic text-4xl leading-none transition-colors duration-300"
        style={{ color }}
      >
        {n}
      </span>
      {sub && (
        <span className="font-mono text-[10px] text-fg-subtle mt-1">{sub}</span>
      )}
      <span className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-fg-muted">
        {label}
      </span>
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[2px] w-0 transition-all duration-500 ease-out group-hover:w-full"
        style={{ background: color, left: "50%", transform: "translateX(-50%)" }}
      />
    </div>
  );
}

function StackRow({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-border bg-bg p-5">
      <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-fg">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[14.5px] font-medium tracking-tight text-fg">
          {title}
        </span>
        <span className="text-[13px] leading-relaxed text-fg-muted">{body}</span>
      </div>
    </div>
  );
}

function countDrawn(f: FontProject) {
  return Object.values(f.glyphs).filter((g) => g.source !== "empty").length;
}

function fmtAge(ts: number) {
  const d = Date.now() - ts;
  const min = Math.round(d / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const days = Math.round(hr / 24);
  return `${days} d ago`;
}
