"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, Loader2 } from "lucide-react";
import { useFontStore } from "@/stores/font-store";
import { Button } from "@/components/ui/button";
import { fireRouteWipe } from "@/components/ui/route-wipe";

export function Topbar() {
  const router = useRouter();
  const font = useFontStore((s) => s.font);
  const isSaving = useFontStore((s) => s.isSaving);
  const setName = useFontStore((s) => s.setName);
  const setAuthor = useFontStore((s) => s.setAuthor);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!isSaving) {
      setShowSaved(true);
      const t = setTimeout(() => setShowSaved(false), 1500);
      return () => clearTimeout(t);
    }
  }, [isSaving]);

  if (!font) return null;

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-bg/80 backdrop-blur px-5">
      <Link
        href="/"
        onClick={(e) => {
          e.preventDefault();
          fireRouteWipe(() => router.push("/"));
        }}
        className="flex items-center gap-2 text-fg-muted hover:text-fg transition"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="font-serif italic text-[15px]">Glyph</span>
      </Link>
      <div className="h-5 w-px bg-border" />
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <input
          value={font.name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Untitled font"
          className="bg-transparent text-[15px] font-medium tracking-tight outline-none text-fg placeholder:text-fg-subtle max-w-[280px] truncate"
        />
        <span className="text-fg-subtle">·</span>
        <input
          value={font.author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="by you"
          className="bg-transparent text-[13px] outline-none text-fg-muted placeholder:text-fg-subtle/70 max-w-[180px] truncate"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-fg-subtle">
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving
            </>
          ) : showSaved ? (
            <>
              <Check className="h-3 w-3 text-success" />
              Saved
            </>
          ) : (
            <span className="opacity-0">·</span>
          )}
        </div>
      </div>
    </header>
  );
}
