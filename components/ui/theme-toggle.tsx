"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/use-theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle, mounted } = useTheme();
  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      className={`relative inline-flex h-9 w-[68px] items-center rounded-full border border-border-strong bg-surface px-1 transition-colors hover:border-ink/50 ${className}`}
    >
      <span className="sr-only">Toggle theme</span>
      <span
        aria-hidden
        className="absolute top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink text-bg shadow-soft transition-transform duration-300 ease-out"
        style={{ transform: `translateY(-50%) translateX(${isDark ? 32 : 0}px)` }}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </span>
      <span
        aria-hidden
        className="ml-1 inline-flex h-7 w-7 items-center justify-center text-fg-subtle"
      >
        <Sun className="h-3.5 w-3.5" />
      </span>
      <span
        aria-hidden
        className="ml-auto inline-flex h-7 w-7 items-center justify-center text-fg-subtle"
      >
        <Moon className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
