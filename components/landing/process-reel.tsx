"use client";

import { motion } from "motion/react";
import { Pen, Ruler, Combine, Download } from "lucide-react";

const STEPS = [
  {
    n: "01",
    icon: <Pen className="h-4 w-4" />,
    title: "Capture",
    body: "Strokes, photos, or SVGs flow into the same vector format.",
    visual: <CaptureVisual />,
  },
  {
    n: "02",
    icon: <Ruler className="h-4 w-4" />,
    title: "Metrics",
    body: "Baseline, x-height, cap-height, descenders — all derived automatically.",
    visual: <MetricsVisual />,
  },
  {
    n: "03",
    icon: <Combine className="h-4 w-4" />,
    title: "Spacing & kerning",
    body: "Optical sidebearings per glyph. Common pairs adjusted by shape.",
    visual: <KernVisual />,
  },
  {
    n: "04",
    icon: <Download className="h-4 w-4" />,
    title: "Export",
    body: "Real OpenType tables packed into OTF, TTF, WOFF, WOFF2.",
    visual: <ExportVisual />,
  },
];

export function ProcessReel() {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s, i) => (
        <div
          key={s.n}
          className="group flex flex-col gap-6 bg-bg p-6 transition hover:bg-surface/40"
        >
          <div className="flex items-center justify-between">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-fg transition group-hover:bg-ink group-hover:text-bg">
              {s.icon}
            </div>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-fg-subtle">
              {s.n}
            </span>
          </div>
          <div
            className="relative h-32 w-full overflow-hidden rounded-lg border border-border bg-surface/50"
            style={{
              animationDelay: `${i * 120}ms`,
            }}
          >
            {s.visual}
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-[15px] font-medium tracking-tight text-fg">
              {s.title}
            </h3>
            <p className="text-[12.5px] leading-relaxed text-fg-muted">
              {s.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CaptureVisual() {
  return (
    <svg viewBox="0 0 200 120" className="absolute inset-0 h-full w-full">
      <motion.path
        d="M 30 80 Q 50 30, 80 60 T 130 70 T 175 50"
        fill="none"
        stroke="var(--color-ocean)"
        strokeWidth="6"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: 1.8,
          ease: [0.16, 1, 0.3, 1],
          repeat: Infinity,
          repeatType: "reverse",
          repeatDelay: 1,
        }}
      />
      <motion.circle
        cx="175"
        cy="50"
        r="4"
        fill="var(--color-amber)"
        animate={{ scale: [1, 1.4, 1] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
    </svg>
  );
}

function MetricsVisual() {
  return (
    <svg viewBox="0 0 200 120" className="absolute inset-0 h-full w-full">
      {[30, 50, 75, 95].map((y, i) => (
        <motion.line
          key={i}
          x1="20"
          x2="180"
          y1={y}
          y2={y}
          stroke={i === 3 ? "rgba(238,155,0,0.85)" : "rgba(0,18,25,0.18)"}
          strokeWidth={i === 3 ? "0.8" : "0.5"}
          strokeDasharray={i === 3 ? "0" : "2 3"}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            delay: i * 0.15,
            duration: 0.7,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      ))}
      <motion.text
        x="100"
        y="90"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontStyle="italic"
        fontSize="44"
        fill="var(--color-ocean)"
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 90 }}
        transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        Aa
      </motion.text>
      <motion.text
        x="190"
        y="32"
        textAnchor="end"
        fontFamily="ui-monospace, monospace"
        fontSize="7"
        letterSpacing="1"
        fill="hsl(220 6% 58%)"
      >
        CAP 700
      </motion.text>
      <motion.text
        x="190"
        y="78"
        textAnchor="end"
        fontFamily="ui-monospace, monospace"
        fontSize="7"
        letterSpacing="1"
        fill="var(--color-amber)"
      >
        BASE 0
      </motion.text>
    </svg>
  );
}

function KernVisual() {
  return (
    <svg viewBox="0 0 200 120" className="absolute inset-0 h-full w-full">
      <motion.text
        x="55"
        y="85"
        fontFamily="Georgia, serif"
        fontSize="56"
        fill="var(--color-ocean)"
        animate={{ x: [60, 50, 60] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      >
        AV
      </motion.text>
      <motion.line
        x1="86"
        x2="100"
        y1="95"
        y2="95"
        stroke="var(--color-amber)"
        strokeWidth="1.2"
        animate={{ x1: [88, 80, 88], x2: [102, 96, 102] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.text
        x="100"
        y="108"
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize="7"
        letterSpacing="1"
        fill="var(--color-amber)"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.6, repeat: Infinity }}
      >
        -18
      </motion.text>
    </svg>
  );
}

function ExportVisual() {
  const formats = [
    { label: "OTF", color: "#ee9b00" },
    { label: "TTF", color: "#ca6702" },
    { label: "WOFF", color: "#bb3e03" },
    { label: "WOFF2", color: "#005f73" },
  ];
  return (
    <svg viewBox="0 0 200 120" className="absolute inset-0 h-full w-full">
      {formats.map((f, i) => (
        <motion.g
          key={f.label}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: i * 0.12,
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1],
            repeat: Infinity,
            repeatType: "reverse",
            repeatDelay: 2,
          }}
        >
          <rect
            x={18 + i * 42}
            y={30}
            width="38"
            height="60"
            rx="6"
            fill={f.color}
            fillOpacity="0.14"
            stroke={f.color}
            strokeOpacity="0.55"
          />
          <text
            x={37 + i * 42}
            y={66}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize="8"
            letterSpacing="1"
            fill="var(--color-ocean)"
          >
            {f.label}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}
